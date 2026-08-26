/* The launch screen: the mark alone on the paper black, drawn into the
   2732-square both platforms crop their own aspect out of. Small on
   purpose — the crop is aggressive on a tall phone, and anything near the
   edge of this square is the first thing to go. */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
const ROOT = resolve(import.meta.dirname, '..', '..');
const MARK = readFileSync(`${ROOT}/site/assets/logo.svg`, 'utf8');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [name, bg] of [['splash.png', '#111111'], ['splash-dark.png', '#111111']]){
  const p = await b.newPage({ viewport:{width:2732,height:2732}, deviceScaleFactor:1 });
  await p.setContent(`<style>*{margin:0;padding:0}html,body{width:2732px;height:2732px;
    background:${bg};display:flex;align-items:center;justify-content:center}
    .m{width:620px;height:620px}.m svg{width:100%;height:100%;display:block}</style>
    <div class="m">${MARK}</div>`);
  await p.waitForTimeout(150);
  mkdirSync(`${ROOT}/app/resources`, {recursive:true});
  await p.screenshot({ path:`${ROOT}/app/resources/${name}` });
  await p.close();
  console.log(name, '2732x2732');
}
await b.close();
