/* A store screenshot with the sell above it: a statement in Flux, the
   site's brand face, on the molecular viewer's light backdrop, and the
   capture beneath, its status bar covered.

     node app/scripts/store-sell.js <capture.png> <out.png> "<statement>" [family] [bar]

   family  ipad-13-land (2752×2064, the default), ipad-13 (2064×2752) or
           iphone-6.9 (1320×2868): the App Store's sizes, as the sets in
           app/store/screenshots/ have them. Sideways the capture takes nine
           tenths of the width and the statement the band left above it;
           upright the band is set first, fifteen hundredths of the height,
           and the capture is fitted to the height beneath it
   bar     the height of the device's status bar in the capture, in the
           capture's own pixels: 57 for an iPad's at 2420 wide, 162 for an
           iPhone's at 1206 wide (the defaults by family). It is painted
           over rather than cut off, so the capture keeps its shape, in the
           capture's own ground: a flat ground is painted flat, and a
           patterned one (the home page's dot grid) is carried on upward by
           the pattern's period, read down the capture's left margin, so the
           grid runs on under the cover

   The statement's lines are balanced, and a "|" in it forces a break: the
   lines it marks are set a little smaller when that keeps each on one line,
   and a statement too long for the band is set smaller until it fits.
   The ground is the viewer's light backdrop (its two colours in
   scripts/molecular/viewer/base.css): the pale blue of the extracellular
   side running smoothly down into the pale lilac of the cytoplasm, the
   viewer's sharp horizon left out at the owner's word.
   Runs here with Playwright from the global modules (NODE_PATH) and the
   site's own fonts, inlined. */
const path = require('path'), fs = require('fs'), { execSync } = require('child_process');
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const [capture, out, statement, family = 'ipad-13-land', barArg] = process.argv.slice(2);
if (!capture || !out || !statement){ console.error('usage: node app/scripts/store-sell.js <capture.png> <out.png> "<statement>" [family] [bar]'); process.exit(1); }
const SIZES = { 'ipad-13-land': [2752, 2064], 'ipad-13': [2064, 2752], 'iphone-6.9': [1320, 2868] };
const [W, H] = SIZES[family] || SIZES['ipad-13-land'];
const bar = Number(barArg) || (family === 'iphone-6.9' ? 162 : 57);
const FONTS = path.join(__dirname, '..', '..', 'site', 'fonts');
const font = (file) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(FONTS, file)).toString('base64');
const png = 'data:image/png;base64,' + fs.readFileSync(capture).toString('base64');
const size = execSync(`identify -format "%w %h" "${capture}"`).toString().trim().split(' ').map(Number);
const landscape = W > H;
/* the capture's place in the frame, and the room the statement has above it */
let side, capW, capH, band, bottom;
if (landscape){
  side = Math.round(W * 0.05);
  capW = W - 2 * side; capH = Math.round(capW * size[1] / size[0]);
  bottom = Math.round(H * 0.02);
  band = H - capH - bottom;
} else {
  band = Math.round(H * 0.15); bottom = Math.round(H * 0.03);
  capH = H - band - bottom; capW = Math.round(capH * size[0] / size[1]);
  side = Math.round((W - capW) / 2);
}
const fontPx = landscape ? Math.round(W / 29) : Math.round(W / 15);
const textW = landscape ? Math.round(capW * 0.92) : Math.round(W * 0.88);
const lines = statement.split('|').map(s => s.trim()).filter(Boolean);
/* the viewer's light backdrop: the extracellular side's pale blue at the top running
   down into the cytoplasm's pale lilac (--c-extra and --c-cyto in base.css) */
const TOP = '#DCE9EC', BOT = '#ECE5EF', INK = '#111111';
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{ font-family:'Flux'; font-weight:400; src:url(${font('Flux-Regular.woff2')}) format('woff2'); }
@font-face{ font-family:'Afacad Flux'; font-weight:500; src:url(${font('afacad-flux-latin-500-normal.woff2')}) format('woff2'); }
@font-face{ font-family:'Newsreader'; font-style:italic; font-weight:400; src:url(${font('newsreader-latin-400-italic.woff2')}) format('woff2'); }
*{ margin:0; padding:0; box-sizing:border-box; }
html, body{ width:${W}px; height:${H}px; background:${TOP}; overflow:hidden; }
body{ background:linear-gradient(180deg, ${TOP} 0%, ${BOT} 100%); }
.sell{ position:absolute; left:0; right:0; top:0; height:${band}px; display:flex; align-items:center; justify-content:center; text-align:center; }
.sell h1{ font-family:'Flux', 'Afacad Flux', sans-serif; font-weight:400; font-size:${fontPx}px; line-height:1.12; letter-spacing:.005em; color:${INK}; max-width:${textW}px; text-wrap:balance; }
.cap{ position:absolute; left:${side}px; top:${band}px; width:${capW}px; height:${capH}px; border:2px solid rgba(17,17,17,.28); overflow:hidden; }
.cap canvas{ display:block; width:${capW}px; height:${capH}px; }
#src{ position:absolute; left:-99999px; top:0; }
</style>
<div class="sell"><h1>${lines.map(l => '<span class="ln">' + l.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>').join('<br>')}</h1></div>
<div class="cap"><canvas id="cap"></canvas></div><img id="src" src="${png}" alt="">`;

/* Runs in the page: draws the capture on the canvas and covers its status
   bar in the capture's own ground. Returns a line on what it did. */
function cover(bar){
  const img = document.getElementById('src'), c = document.getElementById('cap');
  const w = img.naturalWidth, h = img.naturalHeight;
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, w, h).data;
  const at = (x, y) => { const i = (y * w + x) * 4; return [px[i], px[i + 1], px[i + 2]]; };
  const near = (a, b, tol) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol;
  /* the ground: the commonest colour in the rows just under the status bar */
  const count = new Map();
  for (let y = bar; y < Math.min(h, bar + 4); y++) for (let x = 0; x < w; x++){ const k = at(x, y).join(','); count.set(k, (count.get(k) || 0) + 1); }
  const ground = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
  const hex = '#' + ground.map(v => v.toString(16).padStart(2, '0')).join('');
  /* a pattern's period: equally spaced short runs of other colours down the left margin */
  let period = 0;
  const runs = [];
  let start = -1;
  for (let y = bar; y < h - 300; y++){
    let marked = false;
    for (let x = 0; x < Math.min(40, w) && !marked; x++) if (!near(at(x, y), ground, 12)) marked = true;
    if (marked && start < 0) start = y;
    if (!marked && start >= 0){ runs.push([start, y - start]); start = -1; }
  }
  if (runs.length >= 3 && runs.every(r => r[1] <= 8 && Math.abs(r[1] - runs[0][1]) <= 1)){
    const gaps = runs.slice(1).map((r, i) => r[0] - runs[i][0]);
    const p = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    if (p >= 8 && gaps.every(g => Math.abs(g - p) <= 1)) period = p;
  }
  /* the strip one period deep under the bar must hold nothing but the ground and the pattern's sparse marks */
  if (period){
    const dotRows = new Set();
    for (const [s, n] of runs) for (let y = s; y < s + n; y++) dotRows.add(y);
    for (let y = bar; y < bar + period && period; y++){
      let other = 0;
      for (let x = 0; x < w; x++) if (!near(at(x, y), ground, 12)) other++;
      if (other > (dotRows.has(y) ? w * 0.25 : 0)) period = 0;
    }
  }
  if (period){
    for (let y = bar - 1; y >= 0; y--){
      const src = bar + (((y - bar) % period) + period) % period;
      ctx.drawImage(c, 0, src, w, 1, 0, y, w, 1);
    }
    return 'bar covered ' + bar + 'px by the ground ' + hex + ' and its pattern, period ' + period + 'px';
  }
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, w, bar);
  return 'bar covered ' + bar + 'px in ' + hex;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => document.getElementById('src').decode());
  const covered = await page.evaluate(cover, bar);
  /* the lines a "|" marks stand one to a line at a smaller size when the floor allows it, and a
     statement too tall for the band is set smaller still rather than running into the capture */
  await page.evaluate(({ room, floor, forced }) => {
    const h = document.querySelector('.sell h1');
    const base = parseFloat(getComputedStyle(h).fontSize);
    const wraps = () => [...h.querySelectorAll('.ln')].some(s => s.getClientRects().length > 1);
    let px = base;
    if (forced){
      while (wraps() && px > floor){ px -= 2; h.style.fontSize = px + 'px'; }
      if (wraps()){ px = base; h.style.fontSize = ''; }
    }
    while (h.getBoundingClientRect().height > room && px > 36){ px -= 2; h.style.fontSize = px + 'px'; }
  }, { room: band - 56, floor: Math.round(fontPx * 0.78), forced: lines.length > 1 });
  await page.waitForTimeout(300);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out });
  await browser.close();
  console.log(path.basename(out), W + 'x' + H, 'band', band, 'capture', capW + 'x' + capH + ',', covered);
})().catch((e) => { console.error(e); process.exit(1); });
