/* Draw every icon the three targets ask for, from the one mark.

     cd app && npm run icons

   The web mark has no background: it is the ring alone, so it sits on the
   light page and the dark one alike. An app icon cannot be that. Apple
   rejects an icon with an alpha channel outright, and Android masks the
   foreground layer into whatever shape the launcher wants, so both need the
   ring on a ground. That ground is the site's own paper black, and the tile
   the platform draws around it is why this reads as a tile rather than as
   the black coin the web mark used to be.

   Android adaptive icons keep their content inside the middle 66% of the
   canvas — the launcher may crop to a circle, a squircle or a rounded
   square — so the foreground layer is drawn small inside a transparent
   square, and the ground is a separate colour layer.
*/
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const ROOT   = resolve(import.meta.dirname, '..', '..');   // the repo
const MARK   = readFileSync(`${ROOT}/site/assets/logo.svg`, 'utf8');
const GROUND = '#111111';                    // the site's paper black

/* [ file, px, ring as a fraction of the canvas, opaque? ] */
const JOBS = [
  // the web app, installed to a home screen
  ['site/assets/icons/icon-192.png',              192, 0.86, true ],
  ['site/assets/icons/icon-512.png',              512, 0.86, true ],
  ['site/assets/icons/icon-maskable-512.png',     512, 0.62, true ],  // safe zone
  ['site/assets/icons/icon-mono.png',             512, 0.86, false],  // alpha, for the page
  // iOS: one 1024 source, opaque, no alpha anywhere
  ['app/resources/ios-icon-1024.png',            1024, 0.84, true ],
  // Android adaptive: transparent foreground, flat colour background
  ['app/resources/android-foreground-432.png',    432, 0.62, false],
  ['app/resources/android-background-432.png',    432, 0.00, true ],
  // the legacy square launcher icon, for older Android
  ['app/resources/android-legacy-512.png',        512, 0.84, true ],
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [rel, px, frac, opaque] of JOBS){
  const p = await b.newPage({ viewport:{ width:px, height:px }, deviceScaleFactor:1 });
  const ring = frac > 0
    ? `<div class="m">${MARK}</div>`
    : '';
  await p.setContent(`<style>
      *{margin:0;padding:0;box-sizing:border-box}
      html,body{width:${px}px;height:${px}px;overflow:hidden;
                background:${opaque ? GROUND : 'transparent'}}
      body{display:flex;align-items:center;justify-content:center}
      .m{width:${Math.round(px*frac)}px;height:${Math.round(px*frac)}px}
      .m svg{width:100%;height:100%;display:block}
    </style>${ring}`);
  await p.waitForTimeout(120);
  const out = `${ROOT}/${rel}`;
  mkdirSync(dirname(out), { recursive:true });
  await p.screenshot({ path: out, omitBackground: !opaque });
  await p.close();
  console.log(`${rel.padEnd(44)} ${px}x${px}  ring ${(frac*100).toFixed(0)}%  ${opaque ? 'opaque' : 'alpha'}`);
}
await b.close();
