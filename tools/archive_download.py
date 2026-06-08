#!/usr/bin/env python3
"""
archive_download.py — Recover www.thetexastowers.com from the Internet Archive.

The original site (a memorial to the Cold War "Texas Towers" offshore radar
platforms, by Mark Farmer / SpartaSoftware) went offline after ~2012 and the
domain became a parking/SEO-spam page. This script reconstructs the *content
era* (2007-2012) of the site from the Wayback Machine as a clean, static,
deploy-ready tree under ../public/.

What it does:
  1. Enumerates every archived capture for the domain via the CDX API.
  2. Filters out post-2012 squatter junk (parking *.php, SEO-spam robots.txt
     trees, FrontPage _vti_bin hit-counters, redirector js, 404 "sentence" URLs).
  3. Groups captures by file and picks the best one (correct mimetype + largest
     body, preferring the content era), then downloads the RAW original bytes
     via the Wayback `id_` modifier (no injected toolbar).
  4. Validates bytes — image magic numbers, and rejection of the ~494-byte
     <frameset> "redirect to spartasoftware.com" stubs that were saved under
     real .jpg/.html names by the bad 2011-12 / 2016-17 crawls. Falls back to
     the next-best capture on failure.
  5. Strips injected cruft from HTML (GoDaddy parking script, Google AdSense,
     dead FrontPage hit-counter <img>) while leaving the relative links — and
     therefore site navigation — completely untouched.
  6. Writes the site to ../public/ and emits ../manifest.json (provenance) and
     ../MISSING-IMAGES.md (every image that can't be recovered + the pages that
     reference it, so originals can be sourced later).

Standard library only. Run:  python3 tools/archive_download.py
"""

import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

DOMAIN = "thetexastowers.com"

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                 # repo root (~/Development/TheTexasTowers)
PUBLIC = os.path.join(ROOT, "public")
MANIFEST_PATH = os.path.join(ROOT, "manifest.json")
MISSING_PATH = os.path.join(ROOT, "MISSING-IMAGES.md")

CDX_URL = (
    "https://web.archive.org/cdx/search/cdx"
    "?url={domain}&matchType=domain&output=json"
    "&fl=original,timestamp,statuscode,mimetype,length"
)
# `id_` returns the raw original bytes exactly as archived (no Wayback toolbar).
WAYBACK_RAW = "https://web.archive.org/web/{ts}id_/{url}"

UA = "Mozilla/5.0 (compatible; TheTexasTowers-archival-recovery/1.0)"

# Content era — captures from this window are preferred over later squatter-era ones.
ERA_LO, ERA_HI = 2007, 2012  # inclusive years

# Squatter / non-content paths to drop outright.
JUNK_PATH_RE = re.compile(
    r"(^_vti_bin/)"        # FrontPage hit-counter endpoint (fpcount.exe)
    r"|(\.php$)"           # parking php (chatrpad/page/tg)
    r"|(^px\.js)"          # squatter js beacon
    r"|(robots\.txt$)"     # robots + the spam XXXXZ/.../robots.txt trees
    r"|(^rg-erdr)",        # squatter redirector
    re.IGNORECASE,
)

IMG_EXT = (".jpg", ".jpeg", ".gif", ".png")
KEEP_EXT = IMG_EXT + (".html", ".htm", ".wav", ".doc")

IMG_MAGIC = {
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".gif": (b"GIF87a", b"GIF89a"),
}


# --------------------------------------------------------------------------- #
# HTTP                                                                          #
# --------------------------------------------------------------------------- #
def http_get(url, retries=4, timeout=60):
    """GET raw bytes. Retries on rate-limit / transient errors; raises otherwise."""
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(2 ** attempt)
                continue
            raise
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last = e
            time.sleep(2 ** attempt)
    raise last


# --------------------------------------------------------------------------- #
# URL -> local path normalization                                              #
# --------------------------------------------------------------------------- #
def normalize_path(original):
    """
    Map an archived absolute URL to a site-relative path, or return None if the
    capture should be ignored (has a query string -> parking/dynamic variant).
    `www.` and the bare host collapse to one tree; `/` -> index.html.
    """
    parsed = urllib.parse.urlsplit(original)
    if parsed.query:
        return None  # every genuine page on this site has a clean path
    path = urllib.parse.unquote(parsed.path)
    if not path or path == "/":
        return "index.html"
    path = path.lstrip("/")
    if path.endswith("/"):
        path += "index.html"
    return path


def expected_kind(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in IMG_EXT:
        return "image"
    if ext in (".html", ".htm"):
        return "html"
    if ext == ".wav":
        return "audio"
    if ext == ".doc":
        return "doc"
    return "other"


def preferred_mime(kind, mimetype):
    m = (mimetype or "").lower()
    if kind == "image":
        return m.startswith("image/")
    if kind == "html":
        return m.startswith("text/html") or "xhtml" in m
    if kind == "audio":
        return "audio" in m or "wav" in m
    if kind == "doc":
        return "msword" in m or "officedocument" in m or m == "application/octet-stream"
    return True


# --------------------------------------------------------------------------- #
# Byte validation                                                              #
# --------------------------------------------------------------------------- #
def looks_like_stub(body):
    """The squatter <frameset> redirect-to-spartasoftware stub (saved under real
    file names by bad crawls). Real content pages use tables, never framesets."""
    head = body[:1000].lower()
    return b"<frameset" in head and b"spartasoftware" in head


def valid_bytes(path, kind, body):
    if not body:
        return False
    if kind == "image":
        ext = os.path.splitext(path)[1].lower()
        return any(body.startswith(sig) for sig in IMG_MAGIC.get(ext, ()))
    if kind == "html":
        return not looks_like_stub(body) and len(body) > 200
    if kind == "audio":
        return body[:4] == b"RIFF" and b"WAVE" in body[:16]
    if kind == "doc":
        return body[:4] == b"\xd0\xcf\x11\xe0" or len(body) > 256
    return len(body) > 0


# --------------------------------------------------------------------------- #
# HTML cleanup (clean-for-deploy)                                              #
# --------------------------------------------------------------------------- #
def clean_html(body):
    """Strip injected GoDaddy parking / Google AdSense / dead hit-counter cruft.
    Operates via latin-1 (a lossless byte<->char bijection) so non-ASCII bytes
    round-trip unchanged; only ASCII script/comment patterns are touched."""
    if body[:3] == b"\xef\xbb\xbf":          # drop UTF-8 BOM
        body = body[3:]
    text = body.decode("latin-1")

    # 1) Everything after the first </html> is GoDaddy injection (malformed
    #    trailing tags, <!-- adsok -->, the alphagodaddy parking <script>).
    m = re.search(r"</html\s*>", text, re.IGNORECASE)
    if m:
        text = text[: m.end()]

    # 2) Google AdSense: inline config block + the show_ads.js loader.
    text = re.sub(
        r"<script[^>]*>\s*<!--\s*google_ad_.*?</script>", "", text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    text = re.sub(
        r"<script[^>]*googlesyndication[^>]*>.*?</script>", "", text,
        flags=re.IGNORECASE | re.DOTALL,
    )

    # 3) FrontPage hit counter: the whole webbot span (incl. its <img>), plus
    #    any stray fpcount.exe <img>.
    text = re.sub(
        r"<!--\s*webbot bot=\"HitCounter\".*?endspan\s*-->", "", text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    text = re.sub(r"<img[^>]*fpcount\.exe[^>]*>", "", text, flags=re.IGNORECASE)

    # 4) Any residual alphagodaddy script (defensive; usually already cut above).
    text = re.sub(
        r"<script[^>]*alphagodaddy[^>]*>.*?</script>", "", text,
        flags=re.IGNORECASE | re.DOTALL,
    )

    return text.encode("latin-1")


# --------------------------------------------------------------------------- #
# Missing-image cross reference                                                #
# --------------------------------------------------------------------------- #
REF_RE = re.compile(r"""(?:src|href)\s*=\s*["']([^"']+)["']""", re.IGNORECASE)


def referenced_local(html_text, page_path, exts):
    """Yield site-relative paths (matching one of `exts`) referenced by a page,
    resolved against the page's directory. Skips external/absolute URLs and
    _vti_bin counters."""
    page_dir = os.path.dirname(page_path)
    for raw in REF_RE.findall(html_text):
        ref = raw.strip()
        low = ref.lower()
        if low.startswith(("http://", "https://", "//", "mailto:", "data:", "javascript:", "#")):
            continue
        ref = html.unescape(ref).split("#")[0].split("?")[0]
        ref = urllib.parse.unquote(ref)
        if not ref or os.path.splitext(ref)[1].lower() not in exts:
            continue
        if "_vti_bin" in ref:
            continue
        resolved = os.path.normpath(os.path.join(page_dir, ref)).replace(os.sep, "/")
        if resolved.startswith(".."):
            continue
        yield resolved


# --------------------------------------------------------------------------- #
# Main                                                                          #
# --------------------------------------------------------------------------- #
def main():
    print(f"[1/5] Fetching capture index from CDX for {DOMAIN} ...")
    raw = http_get(CDX_URL.format(domain=DOMAIN))
    rows = json.loads(raw.decode("utf-8"))
    header, rows = rows[0], rows[1:]
    idx = {name: i for i, name in enumerate(header)}
    print(f"      {len(rows)} raw captures returned.")

    # Group keep-able 200 captures by normalized local path.
    candidates = defaultdict(list)
    skipped_junk = 0
    for r in rows:
        original = r[idx["original"]]
        if r[idx["statuscode"]] != "200":
            continue
        path = normalize_path(original)
        if path is None or JUNK_PATH_RE.search(path):
            skipped_junk += 1
            continue
        if os.path.splitext(path)[1].lower() not in KEEP_EXT:
            skipped_junk += 1
            continue
        try:
            length = int(r[idx["length"]])
        except (ValueError, KeyError):
            length = 0
        candidates[path].append({
            "original": original,
            "ts": r[idx["timestamp"]],
            "mimetype": r[idx["mimetype"]],
            "length": length,
        })

    print(f"[2/5] {len(candidates)} unique content files "
          f"(dropped {skipped_junk} junk/dynamic captures).")

    manifest = []
    saved_paths = set()
    image_unrecoverable = []   # image files with no valid capture at all
    other_failures = []        # non-image files we failed to recover

    files = sorted(candidates)
    print(f"[3/5] Downloading & validating {len(files)} files ...")
    for n, path in enumerate(files, 1):
        kind = expected_kind(path)
        caps = candidates[path]

        pool = [c for c in caps if preferred_mime(kind, c["mimetype"])]
        if not pool:
            if kind == "image":
                # No image/* capture exists -> only stubs were archived. Hopeless.
                image_unrecoverable.append(path)
                continue
            pool = list(caps)  # for html/audio/doc, fall back to any capture

        # in-era first, then largest body, then most recent.
        def sort_key(c):
            year = int(c["ts"][:4])
            in_era = ERA_LO <= year <= ERA_HI
            return (0 if in_era else 1, -c["length"], -int(c["ts"]))
        pool.sort(key=sort_key)

        saved = False
        for c in pool:
            url = WAYBACK_RAW.format(ts=c["ts"], url=c["original"])
            try:
                body = http_get(url)
            except Exception as e:                     # noqa: BLE001
                continue
            if not valid_bytes(path, kind, body):
                continue
            if kind == "html":
                body = clean_html(body)
            dest = os.path.join(PUBLIC, *path.split("/"))
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "wb") as fh:
                fh.write(body)
            manifest.append({
                "path": path,
                "kind": kind,
                "original": c["original"],
                "wayback_timestamp": c["ts"],
                "mimetype": c["mimetype"],
                "bytes": len(body),
            })
            saved_paths.add(path)
            saved = True
            break
        time.sleep(0.4)  # be polite to web.archive.org

        if not saved and kind != "image":
            other_failures.append(path)
        status = "ok " if saved else ("MISS" if kind == "image" else "FAIL")
        print(f"      [{n:>3}/{len(files)}] {status}  {path}")

    # ---- cross-reference missing images & pages against the saved HTML ------- #
    print("[4/5] Cross-referencing missing images and pages in saved pages ...")
    img_to_pages = defaultdict(set)
    link_to_pages = defaultdict(set)
    for entry in manifest:
        if entry["kind"] != "html":
            continue
        dest = os.path.join(PUBLIC, *entry["path"].split("/"))
        with open(dest, "rb") as fh:
            page_text = fh.read().decode("latin-1")
        for img in referenced_local(page_text, entry["path"], IMG_EXT):
            img_to_pages[img].add(entry["path"])
        for tgt in referenced_local(page_text, entry["path"], (".html", ".htm")):
            link_to_pages[tgt].add(entry["path"])

    missing_images = sorted(img for img in img_to_pages if img not in saved_paths)
    # Also fold in image paths that were archived only as stubs but unreferenced.
    for img in image_unrecoverable:
        if img not in img_to_pages and img not in saved_paths:
            missing_images.append(img)
    missing_images = sorted(set(missing_images))

    # Pages that exist only as the dead spartasoftware redirect stub.
    missing_pages = sorted(set(other_failures))

    # ---- write reports ------------------------------------------------------- #
    print("[5/5] Writing manifest.json and MISSING-IMAGES.md ...")
    manifest.sort(key=lambda e: e["path"])
    with open(MANIFEST_PATH, "w") as fh:
        json.dump(
            {"domain": DOMAIN, "files": manifest,
             "missing_images": missing_images, "missing_pages": missing_pages},
            fh, indent=2,
        )

    saved_html = sum(1 for e in manifest if e["kind"] == "html")
    saved_img = sum(1 for e in manifest if e["kind"] == "image")
    saved_other = len(manifest) - saved_html - saved_img

    with open(MISSING_PATH, "w") as fh:
        fh.write("# Missing images\n\n")
        fh.write(
            "These image files are referenced by the recovered pages but could "
            "**not** be recovered from the Internet Archive — only HTML redirect "
            "stubs (pointing at the long-dead `spartasoftware.com` host) were ever "
            "captured, or the file was never archived at all. The `<img>` tags are "
            "left in place, so these show as broken images until originals are "
            "sourced (e.g. from the site author).\n\n"
        )
        fh.write(f"**{len(missing_images)} images missing.**\n\n")
        for img in missing_images:
            pages = sorted(img_to_pages.get(img, []))
            fh.write(f"- `{img}`")
            if pages:
                fh.write(" — referenced by: " + ", ".join(f"`{p}`" for p in pages))
            fh.write("\n")

        if missing_pages:
            fh.write("\n## Unrecoverable pages\n\n")
            fh.write(
                f"**{len(missing_pages)} pages** were only ever captured as the "
                "`spartasoftware.com` redirect stub, so they could not be recovered. "
                "Links to them from recovered pages are left in place and will be broken.\n\n"
            )
            for pg in missing_pages:
                refs = sorted(link_to_pages.get(pg, []))
                fh.write(f"- `{pg}`")
                if refs:
                    fh.write(" — linked from: " + ", ".join(f"`{r}`" for r in refs))
                fh.write("\n")

    print("\n=== SUMMARY ===")
    print(f"  HTML pages saved : {saved_html}")
    print(f"  Images saved     : {saved_img}")
    print(f"  Other saved      : {saved_other}  (.wav / .doc)")
    print(f"  Missing images   : {len(missing_images)}")
    print(f"  Missing pages    : {len(missing_pages)}"
          + (f"  ({', '.join(missing_pages)})" if missing_pages else ""))
    print(f"  Manifest         : {MANIFEST_PATH}")
    print(f"  Missing report   : {MISSING_PATH}")


if __name__ == "__main__":
    sys.exit(main())
