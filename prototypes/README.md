# Site design tooling (PIL-12 visual overhaul)

The site uses a dark frosted-glass design: a chapter-grouped home page, plus a shared
theme applied to every inner page. Two small generators keep it consistent and
reproducible, so no page is hand-styled.

## Home page: `build.js`

`public/index.html` is generated from `build.js`, not hand-edited. The generator keeps a
single source of truth for the 33 archive sections (number, title, photo count, slug) and
their thematic grouping, so the navigation can never drift from the real folders.

```bash
node build.js          # writes prototypes/proposal-c.html (local preview)
node build.js --prod   # also (re)writes ../public/index.html (the live home page)
```

### Adding or renaming a section

Edit the `SECTIONS` array (and `GROUPS` if the chapter changes) in `build.js`, then run
`node build.js --prod`. The slug (4th field) must match the folder name under `public/`.

## Inner pages: `skin-pages.js`

`skin-pages.js` wraps each inner page's existing body content in the shared chrome
(`public/assets/site.css`). It is design-only: it preserves every page's `<title>`, SEO
block, body text, image `src`s, and links verbatim. It is idempotent (pages already
carrying `<body class="tt">` are skipped), so to re-apply updated chrome, restore the
originals first (`git checkout main -- public`) and then run it.

```bash
node skin-pages.js
```

## Screenshots

`shoot-c.js` / `shoot-prod.js` / `shoot-inner.js` render PNGs into `shots/` using
Playwright's chromium. Those outputs and the generated `proposal-c.html` preview are
git-ignored (derived).
