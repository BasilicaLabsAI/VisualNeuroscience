/* The Region Atlas picture on the home page, one for each theme, from the
   live page.

     cd app && node scripts/shoot-home-atlas.js

   Serves nothing itself: the site must be up on http://127.0.0.1:8412, as
   for shoot-store.js. Writes site/assets/home/atlas.jpg (dark) and
   atlas-light.jpg (light): the four viewports with the same regions lit and,
   as store/APP-STORE.md records for every picture of the map, the crosshair
   4 mm left of the midline, so the sagittal view shows the medial wall of
   the cortex rather than the fissure. Each is taken at twice the size and
   halved in the page, which keeps the slices sharp at 900 pixels wide. */
const path = require('path'), fs = require('fs'), { execSync } = require('child_process');
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));

const SEL = 'P:Precentral|P:Thalamus|P:Hippocampus|P:Calcarine|P:Frontal_Mid|P:Temporal_Sup';
const WIDTH = 900;
const HOME = path.join(__dirname, '..', '..', 'site', 'assets', 'home');
const SHOTS = [['dark', 'atlas.jpg'], ['light', 'atlas-light.jpg']];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  for (const [theme, file] of SHOTS){
    /* 1236 wide puts the four-view grid at about 900 */
    const ctx = await browser.newContext({ viewport: { width: 1236, height: 1300 }, deviceScaleFactor: 2 });
    await ctx.addInitScript((t) => { try { localStorage.setItem('vn-news', JSON.stringify({ done: true })); localStorage.setItem('mn-theme', t); } catch (e) {} }, theme);
    const page = await ctx.newPage();
    const problems = [];
    page.on('pageerror', e => problems.push('pageerror: ' + e.message));
    page.on('response', r => { if (r.status() >= 400) problems.push('HTTP ' + r.status() + ' ' + r.url()); });
    await page.goto('http://127.0.0.1:8412/regions.html#sel=' + encodeURIComponent(SEL), { waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('status').classList.contains('hidden'), null, { timeout: 300000 });
    await page.waitForTimeout(2500);
    /* Centre planes reports the middle of the volume; the shot keeps its
       height and depth and moves 4 mm into the left hemisphere */
    await page.evaluate(() => { window.__mid = null; MN_SEL.onLocation(l => { if (l && l.mm) window.__mid = l.mm.slice(); }); document.querySelector('[data-centre]').click(); });
    await page.waitForFunction(() => window.__mid, null, { timeout: 30000 });
    await page.evaluate(() => MN_SEL.centreMm([-4, window.__mid[1], window.__mid[2]]));
    await page.waitForTimeout(2500);
    const views = page.locator('.views');
    await views.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const png = await views.screenshot({ timeout: 180000 });
    const jpg = await page.evaluate(async ({ src, width }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = width; c.height = Math.round(img.naturalHeight * width / img.naturalWidth);
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, c.width, c.height);
      return { url: c.toDataURL('image/jpeg', 0.86), w: c.width, h: c.height };
    }, { src: 'data:image/png;base64,' + png.toString('base64'), width: WIDTH });
    fs.writeFileSync(path.join(HOME, file), Buffer.from(jpg.url.split(',')[1], 'base64'));
    console.log(file, jpg.w + 'x' + jpg.h, 'problems', JSON.stringify(problems));
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(1); });
