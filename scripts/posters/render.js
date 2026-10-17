// node render.js <in.html> <out-basename>  ->  <out>.pdf (A1, vector) and <out>.png (preview)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [inp, out] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  // A1 at 96 css px per inch: 594 mm x 841 mm
  const W = Math.round(594 / 25.4 * 96), H = Math.round(841 / 25.4 * 96);
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.resolve(inp), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  const report = await p.evaluate(() => {
    const poster = document.querySelector('.poster');
    const over = poster.scrollHeight > poster.clientHeight + 1 || poster.scrollWidth > poster.clientWidth + 1;
    const fonts = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.style + ' ' + f.weight);
    const clipped = [...document.querySelectorAll(".tile, .chain, .colophon, .col, .fam")].filter(e => e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1).map(e => e.id || e.className);
    const foot = document.querySelector(".colophon").getBoundingClientRect();
    const paths = document.querySelector('.paths') && document.querySelector('.paths').getBoundingClientRect();
    return { over, clipped, fonts: [...new Set(fonts)].length, footTop: foot.top, pathsBottom: paths ? paths.bottom : null, height: poster.clientHeight };
  });
  console.log(JSON.stringify(report));
  await p.pdf({ path: out + '.pdf', width: '594mm', height: '841mm', printBackground: true, preferCSSPageSize: true });
  await p.screenshot({ path: out + '.png' });
  await b.close();
})();
