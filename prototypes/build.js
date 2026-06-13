// Generates the home page for The Texas Towers visual overhaul (PIL-12).
// Why a generator: it keeps one source of truth for the 33 archive sections and
// their grouping, so the navigation can never drift from the real folders.
// Run `node build.js --prod` to (re)write ../public/index.html.
const fs = require('fs');
const path = require('path');

// Real sections, transcribed from public/index.html (number, title, picCount, slug).
const SECTIONS = [
  ['00','The Cold War',12,'00-TheColdWar'],
  ['01','4604th Support Group Insignia',1,'01-4604thSupportGroup(TexasTowers)Insignia'],
  ['02','The Conception & Approval, 1952-1953',0,'02-TheConceptionAndApproval,1952-1953'],
  ['03','Groundwork for Implementation, 1953-1955',0,'03-TheGroundworkForImplementation,1953-1955'],
  ['04','The Locations',2,'04-TheLocations'],
  ['05','The Radar Warning Zones',2,'05-TheRadarWarningZones'],
  ['06','The Construction',26,'06-TheConstruction'],
  ['07','The AKL-17',86,'07-TheAKL-17'],
  ['08','The Communications Difficulties',0,'08-TheCommunicationsDifficulties'],
  ['09','The End Is Near For TT4',0,'09-TheEndIsNearForTT4'],
  ['10','The Final Fix: More Nails',6,'10-TheFinalFix-AKAMoreNails'],
  ['11','Hurricane Donna',1,'11-HurricaneDonna'],
  ['12','The Last Nor\'easter',0,"12-TheLastNor'easter"],
  ['13','The End Of TT4',1,'13-TheEndOfTT4'],
  ['14','The Recovery',30,'14-TheRecovery'],
  ['15','The Inquiry',8,'15-TheInquiry'],
  ['16','The Close Of A Chapter',0,'16-TheCloseOfAChapterInHistory'],
  ['17','The Miracle',3,'17-TheMiracle'],
  ['18','The Memorial Plaque',0,'18-TheMemorialPlaque'],
  ['19','Tower Mates That Have Passed On',0,'19-OtherTowerMatesThatHavePassedOn'],
  ['20','Men & Family Members',31,'20-MenAndFamilyMembersOfTheTexasTowers'],
  ['21','From The Men Of The Texas Towers',166,'21-FromTheMenOfTheTexasTowers'],
  ['22','Texas Tower #4 Yearbook',10,'22-TheTexasTower4Yearbook'],
  ['23','Wreckage & Chuck Zimmaro',24,'23-TheWreckageOfTexasTower4'],
  ['24','Entertainment Onboard',0,'24-EntertainmentOnboard'],
  ['25','History Channel: "The Doomed Tower"',0,'25-TheHistoryChannelTheDoomedTower'],
  ['26','Association & Honors',4,'26-TheTexasTowersAssociationAndHonors'],
  ['27','Credits & Footnotes',0,'27-TheCreditsAndFootnotes'],
  ['28','Disclosures & Notes',0,'28-TheOtherDisclosuresAndNotes'],
  ['29','Other Links',0,'29-OtherLinks'],
  ['30','New Additions',0,'30-NewAdditions'],
  ['31','Texas Tower #4 Welcome Book',17,'31-TexasTower4-WelcomeBook'],
  ['32','TT Movies',18,'32-Movies'],
];

// Thematic grouping for the sidebar and collection cards.
const GROUPS = [
  ['The History & The Concept', ['00','01','02','03','04','05'], '#4a6fa5'],
  ['Construction & Operations', ['06','07','08','10','24'], '#3f7d6e'],
  ['The Disaster', ['09','11','12','13'], '#9c5b4b'],
  ['Recovery & The Inquiry', ['14','15','23','16'], '#6a5a8c'],
  ['Memorial & The Men', ['17','18','19','20','21','26'], '#a07b3e'],
  ['Documents, Media & Notes', ['22','25','31','32','30','27','28','29'], '#4a6fa5'],
];

const byNum = Object.fromEntries(SECTIONS.map(s => [s[0], s]));
const IMG = '../public/images';

// ---------- Home page: HYBRID of dark Atlantic frost + chapter layout ----------
// Austin's pick: dark color scheme & frost of A, physical layout of B, combined.
// Rehost / "not the original author" disclaimer kept front-and-center at the top.
// opts.img = image base path, opts.link = section-link prefix, opts.title = page <title>,
// opts.footerNote = trailing footer note. Lets us emit the prototype AND the production
// public/index.html from one source with correct relative paths in each context.
function proposalC(opts) {
  const img = opts.img, link = opts.link;
  const navGroups = GROUPS.map(([name, nums, color]) => `
        <div class="navgroup">
          <div class="navgroup-h">${name}</div>
          ${nums.map(n => { const s = byNum[n]; return `<a href="${link}${encodeURI(s[3])}/index.html"><span>${s[0]}</span>${s[1]}${s[2]?`<em>${s[2]}</em>`:''}</a>`; }).join('')}
        </div>`).join('');

  const cards = GROUPS.map(([name, nums, color]) => `
      <article class="card" style="--c:${color}">
        <h3>${name}</h3>
        <ul>${nums.map(n => { const s = byNum[n]; return `<li><a href="${link}${encodeURI(s[3])}/index.html"><span class="n">${s[0]}</span><span class="t">${s[1]}</span>${s[2]?`<span class="c">${s[2]}</span>`:'<span class="c muted">-</span>'}</a></li>`; }).join('')}</ul>
      </article>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${opts.title}</title>
<meta name="description" content="An archive of the Texas Towers, the Cold War offshore radar platforms built off the U.S. northeast coast from 1955 to 1963, and of Texas Tower No. 4, lost at sea on January 15, 1961, with 28 men aboard. Photographs, names, and documents.">
<meta property="og:title" content="The Texas Towers">
<meta property="og:description" content="A photographic and documentary archive of the Cold War Texas Towers radar platforms and the loss of Texas Tower No. 4.">
<meta property="og:type" content="website">
<meta property="og:image" content="${img}/TexasTower4_small1.jpg">
<meta name="twitter:card" content="summary_large_image">
<style>
:root{--cyan:#63d2e8;--amber:#e8b75f;--glass:rgba(255,255,255,.07);--glass2:rgba(255,255,255,.05);--stroke:rgba(255,255,255,.14);--ink:#e9eef5;--mut:#9fb3c8;}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);line-height:1.56;
  background:#04080f;-webkit-font-smoothing:antialiased}
.bg{position:fixed;inset:0;z-index:-2;
  background:
   radial-gradient(120% 80% at 78% -10%, rgba(99,210,232,.16), transparent 55%),
   radial-gradient(90% 70% at 5% 110%, rgba(40,80,140,.32), transparent 60%),
   linear-gradient(180deg,#061224 0%,#040a14 55%,#020509 100%);}
.bg::after{content:"";position:absolute;inset:0;
  background-image:linear-gradient(rgba(120,180,220,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(120,180,220,.05) 1px,transparent 1px);
  background-size:46px 46px;mask-image:radial-gradient(circle at 50% 25%,#000,transparent 75%);}
.bgphoto{position:fixed;inset:0;z-index:-1;background:url('${img}/TexasTower4_small1.jpg') center 26% / cover no-repeat;
  filter:blur(36px) saturate(.7) brightness(.5);opacity:.45;transform:scale(1.15)}
/* glass top bar */
.topbar{position:sticky;top:0;z-index:20;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%);
  background:rgba(8,16,28,.55);border-bottom:1px solid var(--stroke)}
.topin{display:flex;align-items:center;gap:18px;height:64px;max-width:1240px;margin:0 auto;padding:0 24px}
.brand{display:flex;align-items:center;gap:12px;font-weight:700;letter-spacing:.13em;font-size:14px}
.brand img{width:34px;height:34px;border-radius:50%;border:1px solid var(--stroke)}
.layout{max-width:1240px;margin:0 auto;padding:24px 24px 60px;display:grid;grid-template-columns:268px 1fr;gap:24px;align-items:start}
/* frosted sidebar (layout from B, dark glass from A) */
aside{position:sticky;top:88px;backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);
  background:var(--glass);border:1px solid var(--stroke);border-radius:20px;padding:18px;box-shadow:0 24px 50px rgba(0,0,0,.45)}
.aside-h{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--mut);margin:4px 6px 12px}
.navgroup{margin-bottom:14px}
.navgroup-h{font-size:12.5px;font-weight:700;color:var(--cyan);padding:6px;border-left:3px solid var(--cyan);margin-bottom:2px}
.navgroup a{display:flex;align-items:center;gap:8px;padding:5px 8px 5px 14px;font-size:12.5px;color:var(--mut);text-decoration:none;border-radius:8px}
.navgroup a span{font-size:10.5px;color:#7e93a8;min-width:18px}
.navgroup a em{margin-left:auto;font-style:normal;font-size:10.5px;color:#062235;background:var(--cyan);border-radius:999px;padding:1px 7px;font-weight:700;opacity:.9}
.navgroup a:hover{background:rgba(99,210,232,.1);color:#fff}
main{min-width:0}
/* disclaimer: front and center, top of content */
.disclaimer{display:flex;align-items:center;gap:14px;backdrop-filter:blur(16px);
  background:rgba(232,183,95,.1);border:1px solid rgba(232,183,95,.35);border-radius:16px;padding:14px 20px;margin-bottom:18px}
.disclaimer .badge{flex:0 0 auto;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#062235;
  background:var(--amber);border-radius:8px;padding:5px 10px}
.disclaimer p{font-size:13px;color:#f0dcb4}
.disclaimer a{color:var(--cyan)}
/* hero */
.hero{backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);
  background:var(--glass);border:1px solid var(--stroke);border-radius:24px;padding:30px;margin-bottom:22px;
  display:grid;grid-template-columns:1.4fr .8fr;gap:28px;align-items:center;box-shadow:0 30px 60px rgba(0,0,0,.45)}
.eyebrow{color:var(--cyan);letter-spacing:.28em;font-size:11.5px;font-weight:700;text-transform:uppercase}
.hero h1{font-size:48px;line-height:1.03;font-weight:800;letter-spacing:-.02em;margin:12px 0 10px}
.hero p{color:#c3d2e2;font-size:16px;max-width:32em}
.tag{display:inline-flex;align-items:center;gap:10px;margin-top:18px;background:rgba(232,183,95,.09);
  border:1px solid rgba(232,183,95,.3);color:var(--amber);border-radius:12px;padding:10px 16px;font-size:14px}
.frame{backdrop-filter:blur(8px);background:rgba(255,255,255,.06);border:1px solid var(--stroke);border-radius:16px;
  padding:12px;box-shadow:0 20px 40px rgba(0,0,0,.5)}
.frame img{width:100%;border-radius:10px;display:block;filter:contrast(1.05)}
.frame .cap{font-size:12px;color:var(--mut);padding:10px 2px 2px}
.banner{display:flex;align-items:baseline;justify-content:space-between;margin:0 0 16px;padding:0 4px}
.banner h2{font-size:22px;font-weight:700}.banner span{font-size:12.5px;color:var(--mut)}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{backdrop-filter:blur(16px) saturate(140%);-webkit-backdrop-filter:blur(16px) saturate(140%);
  background:var(--glass);border:1px solid var(--stroke);border-radius:18px;padding:18px 20px;
  transition:transform .18s,border-color .18s;box-shadow:0 16px 34px rgba(0,0,0,.35)}
.card:hover{transform:translateY(-3px);border-color:rgba(99,210,232,.4)}
.card h3{font-size:15px;color:var(--cyan);margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--stroke)}
.card ul{list-style:none}
.card li a{display:flex;align-items:center;gap:10px;padding:6px;border-radius:8px;text-decoration:none;color:var(--ink)}
.card li a:hover{background:rgba(99,210,232,.08)}
.card .n{font-size:11px;color:#7e93a8;min-width:18px}
.card .t{font-size:13.5px;flex:1}
.card .c{font-size:11px;color:#062235;background:var(--cyan);border-radius:999px;padding:1px 8px;font-weight:700;opacity:.9}
.card .c.muted{background:transparent;color:#5e748a}
.contribute{margin-top:20px;backdrop-filter:blur(18px);background:rgba(232,183,95,.06);border:1px solid rgba(232,183,95,.22);
  border-radius:18px;padding:24px 26px;display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center}
.contribute img{width:84px;height:84px;border-radius:50%;border:1px solid var(--stroke)}
.contribute h3{color:var(--amber);font-size:18px;margin-bottom:6px}.contribute p{font-size:14px;color:#c8d6e4}
.contribute a{color:var(--cyan)}
footer{max-width:1240px;margin:0 auto;padding:0 24px 50px;color:#8ca0b4;font-size:12.5px}
footer a{color:var(--cyan)}
@media(max-width:980px){.layout{grid-template-columns:1fr}aside{position:static}.hero{grid-template-columns:1fr}.cards{grid-template-columns:1fr}}
</style></head>
<body>
<div class="bg"></div><div class="bgphoto"></div>
<header class="topbar"><div class="topin">
  <div class="brand"><img src="${img}/lIfering.jpg" alt="Life ring emblem">THE TEXAS TOWERS</div>
</div></header>

<div class="layout">
  <aside>
    <div class="aside-h">Browse the archive</div>
    ${navGroups}
  </aside>

  <main>
    <div class="disclaimer">
      <span class="badge">Please note</span>
      <p>This is a <b>rehost</b> of the original thetexastowers.com (offline since 2011), recovered from the <a href="https://archive.org/">Internet Archive</a>. <b>I am not the original author.</b> Most images were not archived and are lost to time. &nbsp;<a href="https://github.com/austinpilz/TheTexasTowers">GitHub Repo</a></p>
    </div>

    <section class="hero">
      <div>
        <div class="eyebrow">Cold War Early-Warning Radar, 1955-1963</div>
        <h1>The Texas Towers</h1>
        <p>Offshore radar platforms built off the U.S. northeast coast to watch for a Soviet air attack. This archive gathers the photographs, names, and documents of the men who served, and of Texas Tower No. 4, which was lost to the sea.</p>
        <div class="tag">28 men lost. Texas Tower No. 4. January 15, 1961.</div>
      </div>
      <div class="frame">
        <img src="${img}/TexasTower4_small1.jpg" alt="Texas Tower No. 4 on its three caisson legs in the open Atlantic">
        <div class="cap">Texas Tower No. 4, original archive photograph</div>
      </div>
    </section>

    <div class="banner"><h2>The Collection</h2><span>33 sections, organized by chapter</span></div>
    <div class="cards">${cards}</div>

    <section class="contribute">
      <img src="${img}/lIfering.jpg" alt="Life ring emblem">
      <div>
        <h3>Have photographs or a correction?</h3>
        <p>This archive preserves Mark Farmer's original site. Photographs, film, and documents from Texas Towers 2, 3 &amp; 4 are welcome, scanned at the highest setting, with originals returned insured. <a href="#">Get in touch</a></p>
      </div>
    </section>
  </main>
</div>

<footer>A rehost of the original thetexastowers.com, offline since 2011, recovered from the <a href="https://archive.org/">Internet Archive</a>. Not the original author. &nbsp;·&nbsp; <a href="https://github.com/austinpilz/TheTexasTowers">GitHub Repo</a>${opts.footerNote || ''}</footer>
</body></html>`;
}

// Prototype (lives in prototypes/, links back into ../public/) for local preview.
fs.writeFileSync(path.join(__dirname, 'proposal-c.html'), proposalC({
  img: '../public/images', link: '../public/',
  title: 'The Texas Towers (preview)',
  footerNote: '',
}));

// Production index (lives at public/index.html, links are relative to public/)
if (process.argv.includes('--prod')) {
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'index.html'), proposalC({
    img: 'images', link: '',
    title: 'The Texas Towers',
    footerNote: '',
  }));
  console.log('Wrote public/index.html (production)');
}
console.log('Wrote proposal-c.html (preview)');
