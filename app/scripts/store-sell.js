/* A store screenshot with the sell above it: a statement in the brand face
   on the paper black, and the capture beneath, its status bar covered.

     node app/scripts/store-sell.js <capture.png> <out.png> "<statement>" [family] [bar]

   family  ipad-13-land (2752×2064, the default), ipad-13 (2064×2752) or
           iphone-6.9 (1320×2868): the App Store's sizes, as the sets in
           app/store/screenshots/ have them
   bar     the height of the device's status bar in the capture, in the
           capture's own pixels (default 57, an iPad's at 2420 wide), which
           is painted over in the paper black rather than cut off, so the
           capture keeps its shape

   The statement breaks over up to two lines; a "|" in it forces the break.
   Runs here with Playwright from the global modules (NODE_PATH) and the
   site's own fonts, inlined. */
const path = require('path'), fs = require('fs'), { execSync } = require('child_process');
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
const [capture, out, statement, family = 'ipad-13-land', barArg] = process.argv.slice(2);
if (!capture || !out || !statement){ console.error('usage: node app/scripts/store-sell.js <capture.png> <out.png> "<statement>" [family] [bar]'); process.exit(1); }
const SIZES = { 'ipad-13-land': [2752, 2064], 'ipad-13': [2064, 2752], 'iphone-6.9': [1320, 2868] };
const [W, H] = SIZES[family] || SIZES['ipad-13-land'];
const bar = Number(barArg) || 57;
const FONTS = path.join(__dirname, '..', '..', 'site', 'fonts');
const font = (file) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(FONTS, file)).toString('base64');
const png = 'data:image/png;base64,' + fs.readFileSync(capture).toString('base64');
const size = execSync(`identify -format "%w %h" "${capture}"`).toString().trim().split(' ').map(Number);
const landscape = W > H;
/* the capture's width in the frame, and the room the statement has above it */
const side = Math.round(W * 0.05);
const capW = W - 2 * side, capH = Math.round(capW * size[1] / size[0]);
const bottom = landscape ? Math.round(H * 0.02) : Math.round(H * 0.04);
const band = H - capH - bottom;
const fontPx = landscape ? Math.round(W / 29) : Math.round(W / 15);
const lines = statement.split('|').map(s => s.trim()).filter(Boolean);
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{ font-family:'Afacad Flux'; font-weight:500; src:url(${font('afacad-flux-latin-500-normal.woff2')}) format('woff2'); }
@font-face{ font-family:'Newsreader'; font-style:italic; font-weight:400; src:url(${font('newsreader-latin-400-italic.woff2')}) format('woff2'); }
*{ margin:0; padding:0; box-sizing:border-box; }
html, body{ width:${W}px; height:${H}px; background:#111111; overflow:hidden; }
.sell{ position:absolute; left:${side}px; right:${side}px; top:0; height:${band}px; display:flex; align-items:center; justify-content:center; text-align:center; }
.sell h1{ font-family:'Afacad Flux', sans-serif; font-weight:500; font-size:${fontPx}px; line-height:1.12; letter-spacing:.005em; color:#FFFFFF; max-width:${Math.round(capW * 0.92)}px; }
.cap{ position:absolute; left:${side}px; top:${band}px; width:${capW}px; height:${capH}px; border:2px solid rgba(255,255,255,.38); overflow:hidden; }
.cap img{ display:block; width:${capW}px; height:${capH}px; }
.cap .bar{ position:absolute; left:0; right:0; top:0; height:${Math.ceil(bar * capW / size[0])}px; background:#111111; }
</style>
<div class="sell"><h1>${lines.map(l => l.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br>')}</h1></div>
<div class="cap"><img src="${png}" alt=""><div class="bar"></div></div>`;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out });
  await browser.close();
  console.log(path.basename(out), W + 'x' + H, 'band', band, 'capture', capW + 'x' + capH, 'bar covered', Math.ceil(bar * capW / size[0]) + 'px');
})().catch((e) => { console.error(e); process.exit(1); });
