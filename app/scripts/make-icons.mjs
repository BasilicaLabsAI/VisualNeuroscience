/* Draw every icon and splash the three targets ask for, from the app mark.

     cd app && npm run icons

   The app mark is site/assets/app-mark.svg, the brain wired with circuit
   traces and nodes, traced from the owner's drawing by
   scripts/appmark/trace.py. It carries no ground of its own and is filled
   with currentColor, so this script chooses both: the site's ink on a white
   tile for every app icon (since v11.85), and white on the paper black of
   the splash screens.

   Apple rejects an icon with an alpha channel outright, and Android masks
   the foreground layer into whatever shape the launcher wants, so the opaque
   tiles carry their ground themselves, and the maskable and adaptive
   foregrounds keep the brain inside the middle 66% of the canvas, where a
   circle, a squircle or a rounded square all leave it whole.

   The Android launcher sets and the splash drawables are cut here too, at
   the sizes capacitor-assets would cut them, so the repository builds the
   same app whether or not `npx capacitor-assets generate` is run again.
*/
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const ROOT  = resolve(import.meta.dirname, '..', '..');   // the repo
const MARK  = readFileSync(`${ROOT}/site/assets/app-mark.svg`, 'utf8');
const INK   = '#111111';   // the site's ink, the brain on the tiles
const WHITE = '#FFFFFF';   // the tiles' ground
const PAPER = '#111111';   // the splash screens' ground
const TILE  = 0.76;        // the brain's width as a share of an opaque tile
const SAFE  = 0.60;        // inside the 66% safe zone of a masked layer
const LAYER = 0.72;        // of an adaptive foreground, which the launcher insets itself
const SPLASH = 0.22;       // of the splash's longer side, as the ring had

/* { file, w, h, frac, ground (null for alpha), ink, round } */
const jobs = [];
const tile = (file, px, frac, ground, ink = INK, round = false) => jobs.push({ file, w: px, h: px, frac, ground, ink, round });

// the web app, installed to a home screen, and Safari's home-screen icon
tile('site/assets/icons/icon-192.png',          192,  TILE, WHITE);
tile('site/assets/icons/icon-512.png',          512,  TILE, WHITE);
tile('site/assets/icons/icon-maskable-512.png', 512,  SAFE, WHITE);
tile('site/assets/icons/icon-mono.png',         512,  0.86, null);     // alpha, the ink alone
tile('site/assets/apple-touch-icon.png',        180,  TILE, WHITE);
// iOS, the Mac and the store: one opaque 1024, in the catalog and in resources
tile('app/resources/ios-icon-1024.png',                                      1024, TILE, WHITE);
tile('app/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024, TILE, WHITE);
tile('app/resources/icon.png',                                               1024, TILE, WHITE);
tile('app/resources/icon-only.png',                                          1024, TILE, WHITE);
tile('app/resources/icon-foreground.png',                                    1024, SAFE, null);
tile('app/resources/icon-background.png',                                    1024, 0,    WHITE);
tile('app/store/play/icon-512.png',                                           512, TILE, WHITE);
// Android adaptive sources: transparent foreground, flat ground, and the legacy square
tile('app/resources/android-foreground-432.png', 432, SAFE, null);
tile('app/resources/android-background-432.png', 432, 0,    WHITE);
tile('app/resources/android-legacy-512.png',     512, TILE, WHITE);
// the Android launcher sets, density by density
for (const [d, px, layer] of [['ldpi', 36, 81], ['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216], ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432]]){
  const res = `app/android/app/src/main/res/mipmap-${d}`;
  tile(`${res}/ic_launcher.png`,            px,    TILE,  WHITE);
  tile(`${res}/ic_launcher_round.png`,      px,    SAFE,  WHITE, INK, true);
  tile(`${res}/ic_launcher_foreground.png`, px,    LAYER, null);
  tile(`${res}/ic_launcher_background.png`, layer, 0,     WHITE);
}
// the splash screens: the brain in white on the paper black, 22% of the longer side
const splash = (file, w, h) => jobs.push({ file, w, h, frac: SPLASH * Math.max(w, h) / w, ground: PAPER, ink: WHITE, round: false });
splash('app/resources/splash.png',      2732, 2732);
splash('app/resources/splash-dark.png', 2732, 2732);
for (const scale of ['1x', '2x', '3x']){
  splash(`app/ios/App/App/Assets.xcassets/Splash.imageset/Default@${scale}~universal~anyany.png`,      2732, 2732);
  splash(`app/ios/App/App/Assets.xcassets/Splash.imageset/Default@${scale}~universal~anyany-dark.png`, 2732, 2732);
}
const ANDROID_SPLASH = { ldpi: [320, 240], mdpi: [480, 320], hdpi: [800, 480], xhdpi: [1280, 720], xxhdpi: [1600, 960], xxxhdpi: [1920, 1280] };
for (const [d, [long, short]] of Object.entries(ANDROID_SPLASH)){
  for (const night of ['', '-night']){
    splash(`app/android/app/src/main/res/drawable-land${night}-${d}/splash.png`, long, short);
    splash(`app/android/app/src/main/res/drawable-port${night}-${d}/splash.png`, short, long);
  }
}
splash('app/android/app/src/main/res/drawable/splash.png',       320, 480);
splash('app/android/app/src/main/res/drawable-night/splash.png', 320, 240);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 64, height: 64 }, deviceScaleFactor: 1 });
for (const j of jobs){
  await p.setViewportSize({ width: j.w, height: j.h });
  const mw = Math.round(j.w * j.frac);
  const alpha = j.ground === null;
  const mark = j.frac > 0 ? `<div class="m">${MARK}</div>` : '';
  const body = j.round ? `<div class="disc">${mark}</div>` : mark;
  await p.setContent(`<style>
      *{margin:0;padding:0;box-sizing:border-box}
      html,body{width:${j.w}px;height:${j.h}px;overflow:hidden;background:${alpha || j.round ? 'transparent' : j.ground}}
      body{display:flex;align-items:center;justify-content:center}
      .disc{width:100%;height:100%;border-radius:50%;background:${j.ground};display:flex;align-items:center;justify-content:center}
      .m{width:${mw}px;height:${mw}px;color:${j.ink};display:flex;align-items:center;justify-content:center}
      .m svg{width:100%;height:100%;display:block}
    </style>${body}`);
  await p.waitForTimeout(40);
  const out = `${ROOT}/${j.file}`;
  mkdirSync(dirname(out), { recursive: true });
  await p.screenshot({ path: out, omitBackground: alpha || j.round });
  console.log(`${j.file.padEnd(78)} ${j.w}x${j.h}  mark ${(j.frac * 100).toFixed(0)}%  ${alpha ? 'alpha' : j.round ? 'round' : 'opaque'}`);
}
await b.close();
