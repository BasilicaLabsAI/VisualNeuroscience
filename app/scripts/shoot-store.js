/* The store screenshots, every family, from the live pages.

     cd app && node scripts/shoot-store.js <outdir> [family,...] [page,...]

   Serves nothing itself: the site must be up on http://127.0.0.1:8412
   (python3 -m http.server 8412 --bind 127.0.0.1 --directory site). Uses the
   global Playwright install and the bundled Chromium, drawing WebGL with
   SwiftShader, so the atlas pages take a minute or so each.

   Families are the shapes the two stores ask for. Apple takes the 6.9" and
   6.5" iPhone and the 13" iPad sets; Google Play takes a phone set and 7"
   and 10" tablet sets, and its rule is that no side may be more than twice
   the other, which is why the phone frame is 9:18 rather than a real
   phone's 9:20. Every shot is dark theme, with the newsletter box already
   dismissed and, for the map, the crosshair 4 mm left of the midline as
   store/APP-STORE.md records. */
const path = require('path'), { execSync } = require('child_process');
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));

const FAMS = {
  'iphone-6.9':      { w: 440,  h: 956,  dpr: 3, kind: 'phone'  },   // 1320 x 2868
  'iphone-6.5':      { w: 428,  h: 926,  dpr: 3, kind: 'phone'  },   // 1284 x 2778
  'ipad-13':         { w: 1032, h: 1376, dpr: 2, kind: 'tablet' },   // 2064 x 2752
  'ipad-13-land':    { w: 1376, h: 1032, dpr: 2, kind: 'land'   },   // 2752 x 2064
  'android-phone':   { w: 360,  h: 720,  dpr: 3, kind: 'phone'  },   // 1080 x 2160
  'android-7':       { w: 600,  h: 960,  dpr: 2, kind: 'phone'  },   // 1200 x 1920, one column like a phone
  'android-10':      { w: 800,  h: 1280, dpr: 2, kind: 'tablet' },   // 1600 x 2560
  'android-10-land': { w: 1280, h: 800,  dpr: 2, kind: 'land'   },   // 2560 x 1600
};
const PAGES = ['home', 'atlas', 'brodmann', 'tracts', 'network', 'microanatomy', 'molecular', 'practice', 'textbook'];
const NUM = { home: '01', atlas: '02', brodmann: '03', tracts: '04', network: '05', microanatomy: '06', molecular: '07', practice: '08', textbook: '09' };

const [OUT, FAMARG, PAGEARG] = [process.argv[2], process.argv[3], process.argv[4]];
if (!OUT){ console.error('usage: node scripts/shoot-store.js <outdir> [family,...] [page,...]'); process.exit(1); }
const families = FAMARG && FAMARG !== 'all' ? FAMARG.split(',') : Object.keys(FAMS);
const pages = PAGEARG ? PAGEARG.split(',') : PAGES;

/* where each page is scrolled to before the shot: a selector and the gap
   above it, a number of pixels, or 'bottom' */
function framing(kind, page){
  const F = {
    phone:  { home: ['.dateline', 8], atlas: ['#viewsGrid', 8], brodmann: ['#baMapSec', 8], tracts: ['.views', 8], network: 'bottom',
              microanatomy: ['section.plate', 8], molecular: ['.frame', 8], practice: ['.qhead', 8], textbook: ['#ch1', 8] },
    tablet: { home: 0, atlas: ['#viewsGrid', 8], brodmann: ['#baMapSec', 8], tracts: ['.views', 8], network: ['.ring-stage', 6],
              microanatomy: ['section.plate', 8], molecular: ['.frame', 8], practice: ['.qhead', 8], textbook: ['#ch1', 8] },
    land:   { home: ['.m-atlas', 68], atlas: ['#viewsGrid', 10], brodmann: ['#baMapSec', 10], tracts: ['.views', 10], network: ['.ring-stage', 10],
              microanatomy: ['section.plate', 10], molecular: ['.frame', 10], practice: ['.qhead', 10], textbook: ['#ch1', 10] },
  };
  return F[kind][page];
}
async function frame(page, rule){
  await page.evaluate((rule) => {
    if (rule === 'bottom'){ window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); return; }
    if (typeof rule === 'number'){ window.scrollTo({ top: rule, behavior: 'instant' }); return; }
    const el = document.querySelector(rule[0]);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - rule[1], behavior: 'instant' });
  }, rule);
  await page.waitForTimeout(900);
}
const settled = (page) => page.evaluate(() => document.fonts.ready.then(() => true));

/* per page: the address, what to wait for, and anything to set up */
const SHOTS = {
  home: { url: 'index.html',
    ready: (p) => p.waitForFunction(() => { const i = document.querySelector('img[src*="home/atlas"]'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 60000 }),
    after: (p) => p.waitForFunction(() => [...document.images].filter(i => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).every(i => i.complete), null, { timeout: 60000 }) },
  atlas: { url: 'regions.html#sel=' + encodeURIComponent('P:Hippocampus|P:Amygdala|P:Thalamus'),
    ready: (p) => p.waitForFunction(() => document.getElementById('status').classList.contains('hidden'), null, { timeout: 300000 }) },
  brodmann: { url: 'regions.html#sel=' + encodeURIComponent('B:17|B:4|B:44'),
    ready: (p) => p.waitForFunction(() => document.getElementById('status').classList.contains('hidden'), null, { timeout: 300000 }) },
  tracts: { url: 'tracts.html',
    /* the revolve is switched off before the shot: a software renderer cannot both spin the tractogram and hand over a frame */
    ready: (p) => p.waitForFunction(() => document.getElementById('stageMsg').classList.contains('hidden'), null, { timeout: 300000 })
      .then(() => p.waitForTimeout(2500))
      .then(() => p.evaluate(() => { const b = document.getElementById('spinBtn'); if (b && b.getAttribute('aria-pressed') === 'true') b.click(); }))
      .then(() => p.waitForTimeout(1500)) },
  network: { url: 'network-atlas.html',
    ready: (p) => p.waitForFunction(() => /parcellation/.test((document.getElementById('scan-note') || {}).textContent || ''), null, { timeout: 300000 }).then(() => p.waitForTimeout(1500)) },
  microanatomy: { url: 'microanatomy.html',
    ready: (p) => p.waitForFunction(() => { const s = document.getElementById('plate'); return s && s.children.length > 3; }, null, { timeout: 120000 }).then(() => p.waitForTimeout(1200)) },
  molecular: { url: 'molecular.html',
    ready: (p) => p.waitForTimeout(9000) },
  practice: { url: 'practice.html',
    ready: (p) => p.waitForTimeout(2500) },
  textbook: { url: 'textbook.html',
    ready: (p) => p.evaluate(() => { const ch = document.getElementById('ch1'); if (ch){ ch.open = true; const s = ch.querySelector('details.tb-sec'); if (s) s.open = true; } }).then(() => p.waitForTimeout(1200)) },
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  for (const fam of families){
    const F = FAMS[fam]; if (!F){ console.error('unknown family', fam); continue; }
    const problems = [];
    const ctx = await browser.newContext({ viewport: { width: F.w, height: F.h }, deviceScaleFactor: F.dpr, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => { try { localStorage.setItem('vn-news', JSON.stringify({ done: true })); localStorage.setItem('mn-theme', 'dark'); } catch (e) {} });
    for (const name of pages){
      const S = SHOTS[name]; if (!S){ console.error('unknown page', name); continue; }
      const t0 = Date.now();
      const page = await ctx.newPage();
      page.on('pageerror', e => problems.push(name + ' pageerror: ' + e.message));
      page.on('response', r => { if (r.status() >= 400) problems.push(name + ' HTTP ' + r.status() + ' ' + r.url()); });
      try {
        await page.goto('http://127.0.0.1:8412/' + S.url, { waitUntil: 'load' });
        await S.ready(page);
        await settled(page);
        await frame(page, framing(F.kind, name));
        if (S.after) await S.after(page);
        await page.screenshot({ path: path.join(OUT, `${fam}-${NUM[name]}-${name}.png`), timeout: 180000 });
        console.log(fam, name, 'ok', Math.round((Date.now() - t0) / 1000) + 's');
      } catch (e){ problems.push(name + ' failed: ' + e.message); console.log(fam, name, 'FAILED', e.message); }
      await page.close();
    }
    await ctx.close();
    console.log(fam, 'problems', JSON.stringify(problems));
  }
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(1); });
