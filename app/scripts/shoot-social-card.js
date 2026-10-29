/* The sharing card (v12.64, at the owner's word): the tractogram of the iOS store image under the title Visual
   Neuroscience and the store's heading line, Human Brain Anatomy: Interactive 3D Brain Atlas.

     cd app && node scripts/shoot-social-card.js [card]

   Serves nothing itself: the site must be up on http://127.0.0.1:8412, as for the other picture scripts, and
   ImageMagick's convert must be on the path. First the tractogram is rendered as the store image has it (the state
   remake-store-images.js stands the page in, TRACT_STATE: the brain nearly solid, its left side's near half cut away,
   the streamlines whole in the space, the same turn and zoom), the page's bars, sliders and handles hidden, cut to
   the picture's own edges and written to site/assets/social/tractogram.jpg; then site/share.html, which lays the card
   out, is shot at twice its size and brought down to 1200 by 630, site/assets/social-card.jpg, the og:image every
   page names. "card" alone shoots the card from the tractogram already written. */
const path = require('path'), fs = require('fs'), { execSync } = require('child_process');
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));

const SITE = 'http://127.0.0.1:8412/';
const ROOT = path.join(__dirname, '..', '..', 'site');
const TRACT = path.join(ROOT, 'assets', 'social', 'tractogram.jpg');
const CARD = path.join(ROOT, 'assets', 'social-card.jpg');
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vn-card-'));
const sh = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
const onlyCard = process.argv.includes('card');

/* the store image's state, as remake-store-images.js holds it */
const TRACT_STATE = JSON.stringify({ v: 5, brain: { on: true, trans: 25 }, tract: true, sliceTract: false, offsetOn: true, radius: 0.3, past: 2.5,
  cuts: { on: true, cuts: { ax: 0, cor: 0, sag: -0.5 } }, view: { az: 140, el: 15, zoom: 1.4 } });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.VN_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const problems = [];

  if (!onlyCard){
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
    await ctx.addInitScript(() => { try { localStorage.setItem('vn-news', JSON.stringify({ done: true })); localStorage.setItem('mn-theme', 'dark'); localStorage.setItem('vn-tracts-drawer', 'shut'); } catch (e) {} });
    const page = await ctx.newPage();
    page.on('pageerror', e => problems.push('tracts: ' + e.message));
    await page.goto(SITE + 'tracts.html', { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => { const nv = window.MN_TRACTS && MN_TRACTS.nv(); return !!(nv && nv.meshes && nv.meshes[0] && nv.meshes[0].pts && nv.meshes[0].pts.length); }, null, { timeout: 400000 });
    await page.evaluate(() => MN_TRACTS.brain());
    const ok = await page.evaluate(s => MN_TRACTS.restore(s), TRACT_STATE);
    if (!ok) throw new Error('the Tractography page has no MN_TRACTS.restore');
    /* nothing of the page but the picture: the bars, the sliders, the handles and the notices go */
    await page.addStyleTag({ content: '.slice-edge, .drawer-tab, .panelbar, .masthead, .vn-best, .vn-news, .tk-pick, #stageMsg{ visibility:hidden !important; }' });
    await page.waitForTimeout(12000);   /* the cut's rebuild, slow in software, comes to rest */
    const raw = path.join(TMP, 'tract.png');
    await page.locator('.view[data-box="Ren"] .mri-stage').screenshot({ path: raw });
    /* cut to the picture's edges on the stage's black, with a little of that black kept round it */
    sh(`convert "${raw}" -bordercolor "#111111" -border 4 -fuzz 4% -trim +repage -bordercolor "#111111" -border 90 -quality 92 "${TRACT}"`);
    console.log('tractogram.jpg', sh(`identify -format "%wx%h" "${TRACT}"`));
    await ctx.close();
  }

  const ctx = await browser.newContext({ viewport: { width: 1320, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push('share: ' + e.message));
  await page.goto(SITE + 'share.html', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  const big = path.join(TMP, 'card.png');
  await page.locator('#card').screenshot({ path: big });
  sh(`convert "${big}" -filter Lanczos -resize 1200x630! -quality 90 "${CARD}"`);
  console.log('social-card.jpg', sh(`identify -format "%wx%h" "${CARD}"`), 'problems', JSON.stringify(problems));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
