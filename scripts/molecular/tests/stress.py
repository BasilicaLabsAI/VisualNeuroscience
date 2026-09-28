import sys, json
from playwright.sync_api import sync_playwright
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, '..', '..', '..', 'site')
THREE = open(os.path.join(SITE, 'vendor', 'three', 'three.min.js')).read()
PAGE = 'file://' + os.path.abspath(os.path.join(SITE, 'assets', 'molecular', 'receptors.html'))
def run(w, h, dark=False, mobile=False, rm=False, steps=(), out='x'):
    logs = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=os.environ.get('CHROME', '/opt/pw-browsers/chromium'), args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = b.new_context(viewport={'width': w, 'height': h}, color_scheme='dark' if dark else 'light', device_scale_factor=1, is_mobile=mobile, has_touch=mobile, reduced_motion='reduce' if rm else 'no-preference')
        pg = ctx.new_page()
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        pg.route('**/three.min.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=THREE))
        pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
        pg.goto(PAGE); pg.wait_for_timeout(3000)
        for st in steps:
            k = st[0]
            try:
                if k == 'shot': pg.screenshot(path=f'work/shots/{out}_{st[1]}.png')
                elif k == 'click': pg.evaluate('(s) => { const e = document.querySelector(s); if (!e) throw new Error("no " + s); e.click(); }', st[1])
                elif k == 'wait': pg.wait_for_timeout(st[1])
                elif k == 'js': print('JS:', pg.evaluate(st[1]))
                elif k == 'move': pg.mouse.move(st[1], st[2])
                elif k == 'tap': pg.touchscreen.tap(st[1], st[2])
                elif k == 'key': pg.keyboard.press(st[1])
                elif k == 'focus': pg.focus(st[1])
                elif k == 'resize': pg.set_viewport_size({'width': st[1], 'height': st[2]})
                elif k == 'wheel': pg.mouse.wheel(st[1], st[2])
                elif k == 'drag':
                    pg.mouse.move(st[1], st[2]); pg.mouse.down(); pg.mouse.move(st[3], st[4], steps=5); pg.mouse.up()
                elif k == 'slider':
                    pg.evaluate('(v)=>{const m=document.querySelector("#morph");m.value=v;m.dispatchEvent(new Event("input"))}', st[1])
            except Exception as e:
                logs.append(f'STEP FAILED {st}: {str(e)[:120]}')
        b.close()
    return logs
if __name__ == '__main__':
    import os; os.makedirs('work/shots', exist_ok=True)
    cfg = json.loads(sys.argv[1]); logs = run(**cfg)
    print('\n'.join(logs[:60]) or 'no errors/warnings')
