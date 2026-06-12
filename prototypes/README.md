# Home page generator (PIL-12 visual overhaul)

`public/index.html` is generated from `build.js`, not hand-edited. The generator keeps a
single source of truth for the 33 archive sections (number, title, photo count, slug) and
their thematic grouping, so the navigation can never drift from the real folders.

## Regenerate

```bash
node build.js          # writes the prototype mockups (proposal-a/b/c.html)
node build.js --prod   # also (re)writes ../public/index.html  ← the live home page
```

The live home page uses the "Proposal C / Hybrid" design that was approved on PIL-12:
dark frosted-glass theme (Proposal A) + chapter-grouped sidebar and collection cards
(Proposal B), with the rehost / not-the-original-author notice pinned at the top.

## Screenshots

`shoot.js` / `shoot-c.js` / `shoot-prod.js` render PNGs into `shots/` using Playwright's
chromium. These outputs and the `proposal-*.html` mockups are git-ignored (derived).

## Adding or renaming a section

Edit the `SECTIONS` array (and `GROUPS` if the chapter changes) in `build.js`, then run
`node build.js --prod`. The slug (4th field) must match the folder name under `public/`.
