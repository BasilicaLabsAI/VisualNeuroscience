/* The App Store images, remade from the live pages.

     cd app && node scripts/remake-store-images.js [shot ...]

   Each image in app/store/sell is a capture of the app under a statement
   (store-sell.js): ten shots, each the iPad's at 2752×2064 and, from the
   same render, the iPhone Duo's inner display at 2853×2007, which is
   almost the iPad capture's shape, and the iPhone's at two sizes from the
   one render, 1206×2622 (the medium display App Store Connect requires
   since October 2026) and 1320×2868 (the 6.9-inch, optional). The captures came from the owner's
   devices, an 11-inch iPad sideways and an iPhone 16 Pro, on 23 October
   2026; since v12.10 they are remade here whenever the pages change, so
   the images keep up without a device: each page is rendered as the app
   shows it, at the web view those captures had, in the same state as the
   capture (the same regions, the same window open), and joined to the
   app's own chrome cut from the captures and kept in app/store/chrome,
   the bar with the back button and the island above on the iPad, the bar
   with the page's title above and the tab bar below on the iPhone. The
   Atlases tab in light mode is the app's own screen, so that image keeps
   its capture whole and only the atlas box's picture, the home page's
   light twin, is set in afresh. The statements are the owner's.

   No capture has the About tab lit on a pushed page, so the AI Connector
   shots (the MCP server's page) stand under strips made from the others:
   the iPad's bar is the Atlases one with the island of the owner's capture
   of the About tab laid inside the capsule's outline; the iPhone's tab bar
   is the Practice one with every item unlit and Practice's pill, read off
   the lettering-free pixels, moved 207 px right under About, whose name is
   thickened by the thirteen per cent a lit tab's name gains; and the
   iPhone's bar is the Molecular one titled MCP Server in Inter SemiBold,
   sized and tracked so that Molecular set the same way covers the
   original. The one line a phone shows at the top since v12.14 (Best
   experienced on iPad) is left out, as shoot-store.js leaves it out.

   Serves nothing itself: the site must be up on http://127.0.0.1:8412
   (python3 -m http.server 8412 --bind 127.0.0.1 --directory site), or
   VN_SITE names another address. Uses the global Playwright install and
   the bundled Chromium, drawing WebGL with SwiftShader, so the atlas pages
   take a minute or two each; the whole set takes half an hour or so. The
   shots are named ipad-01 to ipad-10 and iphone-01 to iphone-10, as the
   captures were numbered; name some to remake only those.

   The page is marked as the shell marks it (data-shell, data-shell-pad on
   the iPad, data-native, a Capacitor stub so native.js takes it for the
   app), so it draws no web header and lays itself out as inside the app;
   the device's safe areas are not reproduced, which only stands the bar a
   little closer to the tab bar than the app does. The web view's rows in
   each capture were measured once: the iPad's page starts 172 pixels
   down, the iPhone's runs from 348 to 2373, where the tab bar's glass
   begins. */
const path = require('path'), fs = require('fs'), os = require('os'), { execSync, execFileSync } = require('child_process');
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const ROOT = path.join(__dirname, '..', '..');
const CHROME = path.join(ROOT, 'app', 'store', 'chrome');
const SELL = path.join(ROOT, 'app', 'store', 'sell');
const SITE = (process.env.VN_SITE || 'http://127.0.0.1:8412/').replace(/\/?$/, '/');
const only = process.argv.slice(2);

/* the two devices: the web view in CSS pixels, its scale, and where its
   rows sit in the capture */
const DEV = {
  ipad:   { w: 1210, h: 748, dpr: 2, pad: true,  top: 172, capture: [2420, 1668], families: ['ipad-13-land', 'iphone-duo-land'] },
  iphone: { w: 402,  h: 675, dpr: 3, pad: false, top: 348, bottom: 2373, capture: [1206, 2622], families: ['iphone-6.3', 'iphone-6.9'] },
};

/* the regions of the atlas captures, in the order the owner added them,
   which is what gives each its colour: the amygdala first on the iPad,
   the thalamus first on the iPhone, the middle frontal gyrus (the AAL's
   Frontal_Mid) last and pink on both */
const enc = encodeURIComponent;
const SEL_PAD = 'P:Amygdala|P:Thalamus|P:Frontal_Mid';
const SEL_PH  = 'P:Thalamus|P:Amygdala|P:Frontal_Mid';

/* when a page is ready to be shot */
const atlasReady = p => p.waitForFunction(() => document.getElementById('status').classList.contains('hidden'), null, { timeout: 400000 }).then(() => p.waitForTimeout(2500));
const cellsReady = p => p.waitForFunction(() => { const s = document.getElementById('plate'); return s && s.children.length > 3; }, null, { timeout: 120000 }).then(() => p.waitForTimeout(1500));
const hxReady = p => p.waitForFunction(() => !!document.querySelector('.view[data-box="render"] .slice-btn'), null, { timeout: 400000 }).then(() => p.waitForTimeout(2500));
const molReady = p => p.waitForFunction(() => { const f = document.getElementById('viewer'); try { return !!(f && f.contentWindow && f.contentWindow.receptorViewer); } catch (e) { return false; } }, null, { timeout: 180000 }).then(() => p.waitForTimeout(6000));
const pageReady = p => p.waitForTimeout(2500);

/* what each capture had open */
const click = (sel, ms) => async p => { await p.click(sel); await p.waitForTimeout(ms || 1500); };
const chartD2 = async p => {
  await p.click('.panelbar [data-pop="popRx"][data-tab="chart"]'); await p.waitForTimeout(1200);
  await p.evaluate(() => { const d = document.getElementById('structure-dropdown'); if (d && d.value !== 'D2'){ d.value = 'D2'; d.dispatchEvent(new Event('change', { bubbles: true })); } });
  await p.waitForTimeout(2500);
};
/* a window raised from the bar, waited for until its sheet has come to rest:
   at three times the scale, with the 3D drawn in software, the half-second
   slide can take far longer than it does on a device */
const openPop = id => async p => {
  await p.click(`.panelbar [data-pop="${id}"]`);
  await p.waitForFunction(i => { const el = document.getElementById(i); return !!el && !el.hidden && el.classList.contains('in') && getComputedStyle(el).transform === 'none'; }, id, { timeout: 60000 });
  await p.waitForTimeout(800);
};
const figsD2 = async p => { await chartD2(p); await p.click('.panelbar [data-pop="popRx"][data-tab="figs"]'); await p.waitForTimeout(2000); };
/* the practice page deals at random: it is dealt again until the capture's question comes up */
const question = text => async p => {
  const ok = await p.evaluate(t => { const qi = QUESTIONS.findIndex(q => q.q.indexOf(t) === 0); if (qi < 0) return 'no such question'; for (let i = 0; i < 4000 && currentQ !== qi; i++) newQuestion(); return currentQ === qi; }, text);
  if (ok !== true) throw new Error('question not dealt: ' + ok);
  await p.waitForTimeout(800);
};
/* the probe readout follows a tap: after the crosshair is moved by
   MN_SEL.centreMm the axial view is tapped on the crosshair itself, found
   as the whitest column and row of a shot of the view decoded in a page of
   its own, so the viewer raises its location change and the bar names the
   region under the crosshair, as the owner's own tap did */
const probeTap = async (p, ctx, dpr) => {
  const rect = await p.evaluate(() => { const c = document.querySelector('.view[data-box="axial"] canvas'); const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  const buf = await p.screenshot({ clip: rect, timeout: 240000 });
  const helper = await ctx.newPage();
  await helper.setContent('<canvas id="c"></canvas>');
  const pos = await helper.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.getElementById('c'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const col = new Float64Array(c.width), row = new Float64Array(c.height);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++){ const i = (y * c.width + x) * 4; if (d[i] > 250 && d[i + 1] > 250 && d[i + 2] > 250){ col[x]++; row[y]++; } }
    let bx = 0, by = 0; for (let x = 0; x < c.width; x++) if (col[x] > col[bx]) bx = x; for (let y = 0; y < c.height; y++) if (row[y] > row[by]) by = y;
    return { x: bx, y: by };
  }, buf.toString('base64'));
  await helper.close();
  await p.mouse.click(rect.x + pos.x / dpr, rect.y + pos.y / dpr);
  await p.waitForTimeout(1500);
};
const caudate = async (p, ctx) => {
  await p.evaluate(() => { const o = document.getElementById('opacity'); o.value = '0'; o.dispatchEvent(new Event('input', { bubbles: true })); MN_SEL.centreMm([-16, 14, 15]); });
  await p.waitForTimeout(3000);
  await probeTap(p, ctx, 2);
};

/* the twenty: the page and its state, the chrome strips, the image (after
   the size's name) and its statement */
const SHOTS = [
  { name: 'ipad-01', dev: 'ipad', theme: 'dark', url: 'regions.html#sel=' + enc(SEL_PAD), ready: atlasReady, setup: caudate,
    top: 'ipad-top-dark-atlases', out: '02-atlas.png', statement: 'Human Brain Anatomy: Interactive 3D Brain Atlas' },
  { name: 'ipad-02', dev: 'ipad', theme: 'dark', url: 'regions.html#sel=' + enc(SEL_PAD), ready: atlasReady, setup: openPop('popNotes'),
    top: 'ipad-top-dark-atlases', out: '02-atlas-what-they-do.png', statement: 'Brain region functions explained' },
  { name: 'ipad-03', dev: 'ipad', theme: 'dark', url: 'regions.html#sel=' + enc(SEL_PAD), ready: atlasReady, setup: chartD2,
    top: 'ipad-top-dark-atlases', out: '02-atlas-receptor-graph.png', statement: 'Receptor Density Data by Brain Region' },
  { name: 'ipad-04', dev: 'ipad', theme: 'dark', url: 'regions.html#sel=' + enc(SEL_PAD), ready: atlasReady, setup: figsD2,
    top: 'ipad-top-dark-atlases', out: '02-atlas-receptor.png', statement: 'Neurotransmitter & Receptor Profiles:|Structure, Binding and Signalling' },
  { name: 'ipad-05', dev: 'ipad', theme: 'dark', url: 'microanatomy.html', ready: cellsReady,
    top: 'ipad-top-dark-atlases', out: '06-microanatomy.png', statement: 'Micro-anatomy: Simple Interactive Brain Cell Atlases' },
  { name: 'ipad-06', dev: 'ipad', theme: 'dark', url: 'molecular.html?rx=D2&tab=binding&panel=shown&picker=shown&level=simple&stop=0', ready: molReady,
    top: 'ipad-top-dark-atlases', out: '07-molecular.png', statement: 'Molecular anatomy: Dynamic receptor atlas|with Neurotransmitter & Drug interactions' },
  { name: 'ipad-07', dev: 'ipad', theme: 'dark', url: 'hallucinations.html', ready: hxReady, setup: click('.panelbar [data-pop="popCircuit"]', 1800),
    top: 'ipad-top-dark-library', out: '10-hallucinations.png', statement: 'Built-in study visualisation on the live atlas' },
  { name: 'ipad-08', dev: 'ipad', theme: 'dark', url: 'practice.html', ready: pageReady, setup: question('The primary motor cortex is located in the:'),
    top: 'ipad-top-dark-practice', out: '08-practice.png', statement: 'Revision question testing' },
  { name: 'ipad-09', dev: 'ipad', theme: 'light', url: 'regions.html', ready: atlasReady,
    top: 'ipad-top-light-atlases', out: '02-atlas-light.png', statement: 'Light mode' },
  /* the first two on the iPhone are the owner's own captures from the
     TestFlight build, 25 October 2026, taken whole: the atlas's four views
     with the three regions lit, and the What they do window over them; the
     one line a phone shows at the top, Best experienced on iPad, is painted
     out in the page's black (cover: x, y, width, height in the capture) */
  { name: 'iphone-01', dev: 'iphone', capture: 'iphone-capture-atlas', cover: [[440, 360, 326, 28]],
    out: '02-atlas.png', statement: 'Human Brain Anatomy:|Interactive 3D Brain Atlas' },
  { name: 'iphone-02', dev: 'iphone', capture: 'iphone-capture-what-they-do', cover: [[440, 360, 326, 28]],
    out: '02-atlas-what-they-do.png', statement: 'Brain region functions explained' },
  { name: 'iphone-03', dev: 'iphone', theme: 'dark', url: 'regions.html#sel=' + enc(SEL_PH), ready: atlasReady, setup: chartD2,
    top: 'iphone-top-dark-3d-region-atlas', bottom: 'iphone-bottom-dark-atlases', out: '02-atlas-receptor-graph.png', statement: 'Receptor Density|Data by Brain Region' },
  { name: 'iphone-04', dev: 'iphone', theme: 'dark', url: 'regions.html#sel=' + enc(SEL_PH), ready: atlasReady, setup: figsD2,
    top: 'iphone-top-dark-3d-region-atlas', bottom: 'iphone-bottom-dark-atlases', out: '02-atlas-receptor.png', statement: 'Neurotransmitter & Receptor Profiles:|Structure, Binding and Signalling' },
  { name: 'iphone-05', dev: 'iphone', theme: 'dark', url: 'microanatomy.html', ready: cellsReady, store: { 'vn-cells-drawer': 'shut' },
    top: 'iphone-top-dark-microanatomy', bottom: 'iphone-bottom-dark-atlases', out: '06-microanatomy.png', statement: 'Micro-anatomy:|Simple Interactive Brain Cell Atlases' },
  { name: 'iphone-06', dev: 'iphone', theme: 'dark', url: 'molecular.html?rx=D2', ready: molReady,
    top: 'iphone-top-dark-molecular', bottom: 'iphone-bottom-dark-atlases', out: '07-molecular.png', statement: 'Molecular anatomy:|Dynamic receptor atlas with|Neurotransmitter & Drug interactions' },
  { name: 'iphone-07', dev: 'iphone', theme: 'dark', url: 'hallucinations.html', ready: hxReady,
    setup: async p => { await p.click('.panelbar [data-view="render"]'); await p.waitForTimeout(2500); await p.click('.panelbar [data-pop="popCircuit"]'); await p.waitForTimeout(1800); },
    top: 'iphone-top-dark-hallucinations', bottom: 'iphone-bottom-dark-library', out: '10-hallucinations.png', statement: 'Built-in study visualisation|on the live atlas' },
  { name: 'iphone-08', dev: 'iphone', theme: 'dark', url: 'practice.html', ready: pageReady, setup: question('A central ethical advantage of iPSCs'),
    top: 'iphone-top-dark-practice', bottom: 'iphone-bottom-dark-practice', out: '08-practice.png', statement: 'Revision question testing' },
  /* the MCP server's page as the About tab opens it */
  { name: 'ipad-10', dev: 'ipad', theme: 'dark', url: 'mcp.html', ready: pageReady,
    top: 'ipad-top-dark-about', out: '11-mcp.png', statement: 'AI Connector:|Connect to your AI Provider with the MCP Server' },
  /* the page at its top, title and all; a text page runs on under the tab
     bar, so its last lines fade into the ground (fade, in CSS px) as iOS
     fades a scroll view's content at a floating bar, rather than being cut
     through a heading */
  { name: 'iphone-10', dev: 'iphone', theme: 'dark', url: 'mcp.html', ready: pageReady, fade: 30,
    top: 'iphone-top-dark-mcp-server', bottom: 'iphone-bottom-dark-about', out: '11-mcp.png', statement: 'AI Connector:|Connect to your AI Provider|with the MCP Server' },
  /* the Atlases tab in light mode: the app's own screen, kept whole, with the
     atlas box's picture (the home page's light twin) set in afresh where the
     old one stood, rows 668 to 1944 and columns 96 to 1109, the box's words
     beneath moved down by whatever the new picture is taller */
  { name: 'iphone-09', dev: 'iphone', native: 'iphone-light-atlases-tab', twin: 'site/assets/home/atlas-light.jpg', box: { x: 96, y: 668, w: 1014, h: 1277 },
    out: '01-home-light.png', statement: 'Light mode' },
];

/* the page as the shell shows it */
const shell = (o) => {
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: {} };
  const mark = () => {
    const r = document.documentElement; if (!r) return false;
    r.setAttribute('data-shell', 'tabs'); r.setAttribute('data-native', ''); if (o.pad) r.setAttribute('data-shell-pad', '');
    const st = document.createElement('style'); st.textContent = '.vn-best{display:none !important}'; r.appendChild(st);
    return true;
  };
  if (!mark()) new MutationObserver((rs, w) => { if (mark()) w.disconnect(); }).observe(document, { childList: true });
  try { localStorage.setItem('mn-theme', o.theme); localStorage.setItem('vn-news', JSON.stringify({ done: true })); for (const k in (o.store || {})) localStorage.setItem(k, o.store[k]); } catch (e) {}
};
const dataUrl = f => 'data:image/' + (/\.jpe?g$/i.test(f) ? 'jpeg' : 'png') + ';base64,' + fs.readFileSync(f).toString('base64');
const px = n => n + 'px';

/* the render between the chrome strips, at the capture's size */
async function join(browser, shot, renderPath, outPath){
  const d = DEV[shot.dev], [W, H] = d.capture;
  const layers = [];
  if (shot.capture){
    layers.push(`<img src="${dataUrl(path.join(CHROME, shot.capture + '.png'))}" style="left:0;top:0">`);
    for (const [x, y, w, h] of shot.cover || []) layers.push(`<div style="position:absolute;left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:#111111"></div>`);
  } else if (shot.native){
    /* the screen whole; the twin at the old picture's width, its height
       following; the words beneath, up to the tab bar, moved down by the
       difference, in a window that shows just them */
    const cap = dataUrl(path.join(CHROME, shot.native + '.png')), b = shot.box, tabTop = DEV.iphone.bottom;
    layers.push(`<img src="${cap}" style="left:0;top:0">`);
    layers.push(`<div id="below" style="position:absolute;left:0;top:${px(b.y + b.h)};width:${px(W)};height:${px(tabTop - (b.y + b.h))};overflow:hidden"><img src="${cap}" style="left:0;top:${px(-(b.y + b.h))}"></div>`);
    layers.push(`<img id="twin" src="${dataUrl(path.join(ROOT, shot.twin))}" style="left:${px(b.x)};top:${px(b.y)};width:${px(b.w)};height:auto">`);
  } else {
    layers.push(`<img src="${dataUrl(path.join(CHROME, shot.top + '.png'))}" style="left:0;top:0">`);
    layers.push(`<img src="${dataUrl(renderPath)}" style="left:0;top:${px(d.top)}">`);
    if (shot.fade) layers.push(`<div style="position:absolute;left:0;top:${px(d.bottom - shot.fade * d.dpr)};width:${px(W)};height:${px(shot.fade * d.dpr)};background:linear-gradient(rgba(17,17,17,0),#111111 60%)"></div>`);
    if (shot.bottom) layers.push(`<img src="${dataUrl(path.join(CHROME, shot.bottom + '.png'))}" style="left:0;top:${px(d.bottom)}">`);
  }
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><style>html,body{margin:0;background:#000;overflow:hidden}img{position:absolute;display:block}</style>' + layers.join(''));
  await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
  if (shot.native) await page.evaluate((b) => {
    const twin = document.getElementById('twin'), below = document.getElementById('below');
    const delta = Math.round(twin.getBoundingClientRect().height) - b.h;
    below.style.top = (b.y + b.h + delta) + 'px'; below.style.height = (parseFloat(below.style.height) - delta) + 'px';
  }, shot.box);
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: W, height: H } });
  await page.close();
}

(async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'vn-store-'));
  const browser = await chromium.launch({ executablePath: process.env.VN_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  let failed = 0;
  for (const s of SHOTS){
    if (only.length && !only.includes(s.name)) continue;
    const t0 = Date.now();
    try {
      const render = path.join(work, s.name + '.png');
      if (!s.native && !s.capture){
        const d = DEV[s.dev], problems = [];
        const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true });
        await ctx.addInitScript(shell, { pad: d.pad, theme: s.theme, store: s.store || {} });
        const page = await ctx.newPage();
        page.on('pageerror', e => problems.push('pageerror: ' + e.message));
        page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(SITE)) problems.push('HTTP ' + r.status() + ' ' + r.url()); });
        await page.goto(SITE + s.url, { waitUntil: 'load' });
        await s.ready(page);
        await page.evaluate(() => document.fonts.ready.then(() => true));
        if (s.setup) await s.setup(page, ctx);
        await page.screenshot({ path: render, timeout: 240000 });
        await ctx.close();
        if (problems.length) console.log('  ' + s.name + ' problems ' + JSON.stringify(problems));
      }
      const composite = path.join(work, 'capture-' + s.name + '.png');
      await join(browser, s, render, composite);
      for (const family of (s.native ? DEV.iphone : DEV[s.dev]).families){
        const name = family + '-' + s.out;
        const said = execFileSync('node', [path.join(__dirname, 'store-sell.js'), composite, path.join(SELL, name), s.statement, family]).toString().trim();
        console.log(s.name, '→', name, Math.round((Date.now() - t0) / 1000) + 's', '·', said.split('\n').pop());
      }
    } catch (e){ failed++; console.log(s.name, 'FAILED', String(e.message || e).split('\n')[0]); }
  }
  await browser.close();
  fs.rmSync(work, { recursive: true, force: true });
  console.log(failed ? failed + ' FAILED' : 'ALL DONE');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(1); });
