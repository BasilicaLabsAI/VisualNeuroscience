import sys, json
from playwright.sync_api import sync_playwright
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, '..', '..', '..', 'site')
THREE = open(os.path.join(SITE, 'vendor', 'three', 'three.min.js')).read()
PAGE = 'file://' + os.path.abspath(os.path.join(SITE, 'assets', 'molecular', 'receptors.html'))
def session(w, h, dark=False, mobile=False, steps=(), out='t', rm=False):
    logs = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=os.environ.get('CHROME', '/opt/pw-browsers/chromium'),
                              args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = b.new_context(viewport={'width': w, 'height': h}, color_scheme='dark' if dark else 'light',
                            device_scale_factor=1, is_mobile=mobile, has_touch=mobile, reduced_motion='reduce' if rm else 'no-preference')
        pg = ctx.new_page()
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        pg.route('**/three.min.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=THREE))
        pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
        pg.goto(PAGE); pg.wait_for_timeout(4500)
        n = 0
        for st in steps:
            kind = st[0]
            if kind == 'shot': pg.screenshot(path=f'work/shots/{out}_{st[1]}.png'); n += 1
            elif kind == 'click': pg.click(st[1])
            elif kind == 'wait': pg.wait_for_timeout(st[1])
            elif kind == 'js': print('JS:', pg.evaluate(st[1]))
            elif kind == 'move': pg.mouse.move(st[1], st[2])
            elif kind == 'tap': pg.touchscreen.tap(st[1], st[2])
        b.close()
    return logs
if __name__ == '__main__':
    import os; os.makedirs('work/shots', exist_ok=True)
    cfg = json.loads(sys.argv[1])
    logs = session(**cfg)
    print('\n'.join(logs[:40]) or 'no console output')
