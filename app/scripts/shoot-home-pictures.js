/* The home page's pictures for the light theme, from the live pages.

     cd app && node scripts/shoot-home-pictures.js [name ...]

   Serves nothing itself: the site must be up on http://127.0.0.1:8412, as
   for shoot-store.js and shoot-home-atlas.js, and ImageMagick's convert
   must be on the path. Every box on the home page and in the app's tabs
   shows a render on black; in the light theme each has a twin drawn on the
   paper, which this writes, at the dark picture's size, so the pair swap
   with the theme (index.html, Shell.swift). The two that are page captures
   rather than renders, the practice page and the Hallucinations study, are
   retaken in both themes so the pair match; the textbook's cover is set on
   white from the dark picture itself; the Region Atlas has its own script.
   Names narrow the run: brodmann, network, cells, molecular, tracts,
   studies, practice, textbook. */
const path = require('path'), fs = require('fs'), { execSync } = require('child_process');
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));

const SITE = 'http://127.0.0.1:8412/';
const HOME = path.join(__dirname, '..', '..', 'site', 'assets', 'home');
const STUDIES = path.join(__dirname, '..', '..', 'site', 'assets', 'studies');
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vn-shots-'));
const only = process.argv.slice(2);
const want = (n) => !only.length || only.includes(n);
const sh = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
const tmp = (n) => path.join(TMP, n);
const size = (f) => sh(`identify -format "%w %h" "${f}"`).split(' ').map(Number);
const LOBE = { frontal: '#5A61D8', parietal: '#4AE8C3', temporal: '#FF704E', occipital: '#DAD358', cingulate: '#E250A9' };

async function open(browser, theme, url, viewport, init){
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  await ctx.addInitScript((t) => { try { localStorage.setItem('vn-news', JSON.stringify({ done: true })); localStorage.setItem('mn-theme', t); localStorage.setItem('mn-rx-picker', 'hidden'); } catch (e) {} }, theme);
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  await page.goto(SITE + url, { waitUntil: 'load', timeout: 180000 });
  await page.addStyleTag({ content: '#status.hidden, .vn-news{display:none!important}' });
  return { ctx, page, problems };
}
/* a live render redraws every frame, which an element screenshot takes for
   an element still moving and waits on; a page screenshot clipped to the
   element's box does not */
async function shotOf(page, selector, file){
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const box = await el.boundingBox(), vp = page.viewportSize();
  const x = Math.max(0, Math.round(box.x)), y = Math.max(0, Math.round(box.y));
  const w = Math.min(Math.round(box.width), vp.width - x), h = Math.min(Math.round(box.height), vp.height - y);
  /* a software renderer composites a big canvas slowly: the shot is given minutes, not seconds */
  await page.screenshot({ path: file, clip: { x, y, width: w, height: h }, timeout: 300000 });
}
function done(file, problems){ const [w, h] = size(file); console.log(path.basename(file), w + 'x' + h, 'problems', JSON.stringify(problems)); }

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });

  /* the Brodmann map, every area filled in its lobe's colour, ink lines on paper */
  if (want('brodmann')){
    const { ctx, page, problems } = await open(browser, 'light', 'brodmann.html', { width: 1440, height: 900 });
    await page.waitForSelector('#cartLateral svg .ba-tile');
    await page.evaluate((LOBE) => {
      document.querySelectorAll('.ba-tile[data-ba]:not(.mute)').forEach(g => {
        const a = MN_BRODMANN.BY_BA[+g.dataset.ba]; if (!a) return;
        g.classList.add('on'); g.style.setProperty('--sel', LOBE[a.lobe] || '#5A61D8');
      });
      const s = document.createElement('style'); s.textContent = '.cart figcaption{display:none!important}'; document.head.appendChild(s);
    }, LOBE);
    await page.waitForTimeout(400);
    await page.locator('#cartLateral svg').screenshot({ path: tmp('ba-lat.png') });
    await page.locator('#cartMedial svg').screenshot({ path: tmp('ba-med.png') });
    const out = path.join(HOME, 'brodmann-light.jpg');
    sh(`convert \\( "${tmp('ba-lat.png')}" -resize 850x \\) \\( -size 60x10 xc:white \\) \\( "${tmp('ba-med.png')}" -resize 850x \\) -background white -gravity center +append -extent 1804x818 -resize 902x409! -quality 88 "${out}"`);
    done(out, problems); await ctx.close();
  }

  /* the Network Atlas: the ring and the brain, the scan on white in the light theme */
  if (want('network')){
    const { ctx, page, problems } = await open(browser, 'light', 'network-atlas.html', { width: 1440, height: 1100 });
    await page.waitForFunction(() => document.getElementById('status').classList.contains('hidden'), null, { timeout: 400000 });
    await page.waitForTimeout(3000);
    /* the ring stands in a sheet the bar's Network button raises (v11.94): up for its shot, down for the render's */
    await page.evaluate(() => document.querySelector('.panelbar [data-pop="popRing"]').click()); await page.waitForTimeout(900);
    await shotOf(page, '#ring', tmp('ring.png'));
    await page.evaluate(() => document.querySelector('.panelbar [data-pop="popRing"]').click()); await page.waitForTimeout(700);
    await shotOf(page, '.view[data-box="render"] .mri-stage', tmp('net-ren.png'));
    const out = path.join(HOME, 'network-light.jpg');
    sh(`convert \\( "${tmp('ring.png')}" -resize 818x818^ -gravity center -extent 818x818 \\) \\( "${tmp('net-ren.png')}" -shave 3x3 -resize 986x818^ -gravity center -extent 986x818 \\) -background white +append -resize 902x409! -quality 88 "${out}"`);
    done(out, problems); await ctx.close();
  }

  /* the neuron, close on the cell body as the dark picture is */
  if (want('cells')){
    const { ctx, page, problems } = await open(browser, 'light', 'microanatomy.html', { width: 2600, height: 1800 });
    await page.waitForSelector('#plate [data-vis="soma"]');
    await page.waitForTimeout(600);
    const box = await page.evaluate(() => {
      const svg = document.getElementById('plate').getBoundingClientRect(), s = document.querySelector('#plate [data-vis="soma"]').getBoundingClientRect();
      return { sx: s.left - svg.left, sy: s.top - svg.top, sw: s.width, sh: s.height, w: svg.width, h: svg.height };
    });
    await page.locator('#plate').screenshot({ path: tmp('plate.png') });
    const k = 2, W = Math.round(box.sw * k / 0.17), H = Math.round(W * 409 / 902);
    const cx = (box.sx + box.sw / 2) * k, cy = (box.sy + box.sh / 2) * k;
    const x = Math.max(0, Math.round(cx - W * 0.54)), y = Math.max(0, Math.round(cy - H * 0.5));
    const out = path.join(HOME, 'cells-light.jpg');
    sh(`convert "${tmp('plate.png')}" -crop ${W}x${H}+${x}+${y} +repage -background white -gravity center -extent ${W}x${H} -resize 902x409! -quality 88 "${out}"`);
    done(out, problems); await ctx.close();
  }

  /* the molecular viewer on its own, its panel and picker folded so the
     receptor stands centred on the light gradient, close in */
  if (want('molecular')){
    const { ctx, page, problems } = await open(browser, 'light', 'assets/molecular/receptors.html?panel=hidden&picker=hidden', { width: 1440, height: 900 });
    await page.waitForSelector('#bar', { timeout: 120000 });
    await page.waitForTimeout(12000);
    await page.screenshot({ path: tmp('mol.png') });
    const [w, h] = size(tmp('mol.png'));
    /* a little above centre, so the binding site's label at the foot stays out of the frame */
    const W = Math.round(w * 0.5), H = Math.round(W * 409 / 902), x = Math.round((w - W) / 2), y = Math.round((h - H) / 2 - H * 0.08);
    const out = path.join(HOME, 'molecular-light.jpg');
    sh(`convert "${tmp('mol.png')}" -crop ${W}x${H}+${x}+${y} +repage -resize 902x409! -quality 88 "${out}"`);
    done(out, problems); await ctx.close();
  }

  /* the tractogram in both themes, the page's ground following the theme
     since v11.96; the page's door holds it still at the home angle and
     pulls the zoom back from the page's own 1.4 to 1.2, the whole brain in
     the frame, which is sized to the picture's proportion so nothing is cut */
  if (want('tracts')){
    for (const [theme, file] of [['dark', 'tracts.jpg'], ['light', 'tracts-light.jpg']]){
      const { ctx, page, problems } = await open(browser, theme, 'tracts.html', { width: 1240, height: 930 });
      await page.waitForFunction(() => document.getElementById('stageMsg').classList.contains('hidden'), null, { timeout: 500000 });
      await page.evaluate(() => { MN_TRACTS.still(); MN_TRACTS.zoom(1.2); MN_TRACTS.home(); });
      await page.waitForTimeout(2500);
      await shotOf(page, '.view[data-box="Ren"] .mri-stage', tmp('tracts.png'));
      const out = path.join(HOME, file);
      sh(`convert "${tmp('tracts.png')}" -resize 1200x700^ -gravity center -extent 1200x700 -quality 88 "${out}"`);
      done(out, problems); await ctx.close();
    }
  }

  /* the Hallucinations study, the 3D view and the axial view side by side, in both themes */
  if (want('studies')){
    for (const [theme, file] of [['dark', 'hallucinations.png'], ['light', 'hallucinations-light.png']]){
      const { ctx, page, problems } = await open(browser, theme, 'hallucinations.html', { width: 1440, height: 1000 });
      /* the page says Loading in its scan note while the volumes come, then names the scan again */
      await page.waitForFunction(() => /Loading/.test(document.getElementById('scan-note').textContent), null, { timeout: 15000 }).catch(() => {});
      await page.waitForFunction(() => !/Loading/.test(document.getElementById('scan-note').textContent), null, { timeout: 400000 });
      await page.waitForTimeout(3000);
      await shotOf(page, '.view[data-box="render"]', tmp('hx-ren.png'));
      await shotOf(page, '.view[data-box="axial"]', tmp('hx-ax.png'));
      const [w] = size(tmp('hx-ren.png')), H = Math.round(w / 1.1);
      const out = path.join(STUDIES, file);
      sh(`convert \\( "${tmp('hx-ren.png')}" -gravity North -crop ${w}x${H}+0+0 +repage \\) \\( -size 8x10 xc:${theme === 'dark' ? 'black' : 'white'} \\) \\( "${tmp('hx-ax.png')}" -gravity North -crop ${w}x${H}+0+0 +repage \\) -background ${theme === 'dark' ? 'black' : 'white'} +append -resize 902x409! "${out}"`);
      done(out, problems); await ctx.close();
    }
  }

  /* the practice page from its own head down, in both themes */
  if (want('practice')){
    for (const [theme, file] of [['dark', 'practice.jpg'], ['light', 'practice-light.jpg']]){
      const { ctx, page, problems } = await open(browser, theme, 'practice.html', { width: 1100, height: 1000 });
      await page.waitForSelector('#qcard .qtext, #qcard .q, #qcard h2, #qcard p', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const top = await page.evaluate(() => Math.round(document.querySelector('.qhead').getBoundingClientRect().top + window.scrollY));
      await page.screenshot({ path: tmp('practice.png'), clip: { x: 0, y: top, width: 1100, height: 500 } });
      const out = path.join(HOME, file);
      sh(`convert "${tmp('practice.png')}" -resize 1100x500! -quality 88 "${out}"`);
      done(out, problems); await ctx.close();
    }
  }

  /* the book's cover on white, cut from the dark picture */
  if (want('textbook')){
    const out = path.join(HOME, 'textbook-light.jpg');
    sh(`convert "${path.join(HOME, 'textbook.jpg')}" -crop 358x464+372+22 +repage -background white -gravity center -extent 1100x508 -quality 90 "${out}"`);
    done(out, []);
  }

  await browser.close();
  console.log('ALL DONE');
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(1); });
