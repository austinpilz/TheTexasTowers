// Re-skin all inner pages with the shared frosted-glass theme (PIL-12).
// DESIGN ONLY: preserves every page's <title>, SEO block, and body content
// verbatim. It drops the legacy <style>/<bgsound>/body background, the redundant
// "The Texas Towers.Com" nav heading (the new top bar replaces that chrome), and
// dark inline text colors (so preserved text is legible on the dark theme).
// Idempotent: pages already carrying <body class="tt"> are skipped.
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');

function listHtml(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listHtml(full));
    else if (e.isFile() && e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function skin(file) {
  const rel = path.relative(PUBLIC, file);          // e.g. 02-…/index.html
  if (rel === 'index.html') return 'home (skip)';   // home page handled separately
  const src = fs.readFileSync(file, 'utf8');
  if (/<body[^>]*class=["'][^"']*\btt\b/i.test(src)) return 'already skinned (skip)';

  // depth = how many "../" to reach public/ root from this page's folder
  const depth = rel.split(path.sep).length - 1;
  const up = depth === 0 ? './' : '../'.repeat(depth);

  const title = (src.match(/<title>([\s\S]*?)<\/title>/i) || [, 'The Texas Towers'])[1].trim();
  const seo = (src.match(/<!--\s*seo:start\s*-->[\s\S]*?<!--\s*seo:end\s*-->/i) || [''])[0];
  const bodyMatch = src.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) throw new Error('no <body> in ' + rel);
  let body = bodyMatch[1];

  // Drop the legacy site-title nav heading (chrome); tolerant of whitespace/&nbsp;.
  body = body.replace(/<h1[^>]*>\s*(?:&nbsp;|\s)*<a\s+href="[^"]*index\.html">\s*The Texas Towers\.Com\s*<\/a>\s*<\/h1>/i, '');

  // Strip dark inline text colors so preserved content is readable on dark glass.
  body = body
    .replace(/color\s*:\s*(?:#000000|#000|black)\b\s*;?/gi, '')
    .replace(/(<font\b[^>]*?)\s+color\s*=\s*(["']?)(?:#000000|black)\2/gi, '$1');

  const head = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    seo,
    `<link rel="stylesheet" href="${up}assets/site.css">`,
    '</head>',
  ].filter(Boolean).join('\n');

  const out = `${head}
<body class="tt">
<div class="tt-bg"></div><div class="tt-bgphoto"></div>
<header class="tt-topbar"><div class="tt-topin">
  <a class="tt-brand" href="${up}index.html"><img src="${up}images/lIfering.jpg" alt="Life ring emblem">THE TEXAS TOWERS</a>
  <a class="tt-back" href="${up}index.html">Back to the archive</a>
</div></header>
<main class="tt-main">
  <article class="tt-article">
${body.trim()}
  </article>
</main>
<footer class="tt-footer">
  <a href="${up}index.html">The Texas Towers home</a>
  <span>A rehost recovered from the Internet Archive. Not the original author.</span>
</footer>
</body>
</html>
`;
  fs.writeFileSync(file, out);
  return 'skinned (depth ' + depth + ')';
}

const files = listHtml(PUBLIC);
let skinned = 0, skipped = 0;
for (const f of files) {
  const r = skin(f);
  if (r.startsWith('skinned')) skinned++; else skipped++;
  console.log(path.relative(PUBLIC, f).padEnd(56), r);
}
console.log(`\nDone: ${skinned} skinned, ${skipped} skipped, ${files.length} total`);
