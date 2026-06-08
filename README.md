# The Texas Towers — archival reconstruction

A static reconstruction of **www.thetexastowers.com**, a memorial site documenting
the U.S. Air Force "Texas Towers" — offshore radar platforms built in the Atlantic
during the Cold War, and especially Texas Tower #4, which collapsed into the sea on
January 15, 1961, killing all 28 men aboard.

The original site was created by Mark Farmer (SpartaSoftware) and went offline after
~2012 when the domain lapsed. This repository rebuilds the site's **content era
(2007–2012)** from the Internet Archive's Wayback Machine. It is plain static HTML
with relative links (originally authored in Microsoft FrontPage / Expression Web) —
**no build step required.**

## Layout

```
public/                     ← the deployable static site (this is what gets served)
tools/archive_download.py   ← the script that rebuilt the site from the Wayback Machine
manifest.json               ← provenance: every recovered file → its source Wayback capture
MISSING-IMAGES.md           ← images & pages the Archive never captured (see below)
```

## What was recovered — and what wasn't

**Recovered from the Wayback Machine:**
- **45 HTML pages** — the homepage and all 34 chapters (`00-TheColdWar` … `33-NewsPaperClips`) plus the sub-pages under chapter 21.
- **62 images**, the page background audio (`oceansgull-LowVol.wav`), and one document (`TOWER PERSONNEL.doc`).

**Permanent gaps in the Archive** (fully listed in [`MISSING-IMAGES.md`](MISSING-IMAGES.md)):
- **~1,094 images.** The original site was extremely image-heavy — it linked roughly
  1,150 photographs (each as a thumbnail **and** a full-size copy) — but the Wayback
  Machine only ever captured **62** of them as real image files. The rest were saved
  only as dead `spartasoftware.com` redirect stubs, or were never crawled at all. The
  hardest-hit galleries are ch. 21 *"From the Men of the Texas Towers"* and ch. 07
  *"The AKL-17."* The original `<img>` tags are left in place, so missing photos appear
  as broken-image icons rather than being silently dropped.
- **2 pages** (`21-…/FredBock/E-Mail-01.html` and `E-Mail-02.html`) — only the redirect
  stub was ever archived.

**Cleaned for deployment** (original content and navigation untouched): the injected
GoDaddy domain-parking script, Google AdSense blocks, and the dead FrontPage
hit-counter images were stripped from the HTML.

## Preview locally

```sh
python3 -m http.server 8000 --directory public
# then open http://localhost:8000/
```

## Rebuild from the Archive

```sh
python3 tools/archive_download.py
```

Re-downloads every recoverable file from the Wayback Machine and regenerates `public/`,
`manifest.json`, and `MISSING-IMAGES.md`. Standard-library Python 3 only — no dependencies.

## Deploy

**Push to GitHub** (from this directory):

```sh
gh repo create thetexastowers --public --source . --remote origin --push
```

(or create the repo in the GitHub UI and `git push`).

**Cloudflare Pages** — connect the GitHub repo, then set:

| Setting                 | Value          |
| ----------------------- | -------------- |
| Framework preset        | **None**       |
| Build command           | *(leave empty)*|
| Build output directory  | **`public`**   |

No environment variables and no build step are needed — Cloudflare serves the contents
of `public/` directly.

## Source & credit

Original site © Mark Farmer / SpartaSoftware. Reconstructed from Internet Archive
Wayback Machine captures (2007–2012); the homepage baseline is the 2011-08-06 snapshot.
See [`manifest.json`](manifest.json) for the exact capture timestamp behind every file.
