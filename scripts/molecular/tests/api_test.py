from playwright.sync_api import sync_playwright
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, '..', '..', '..', 'site')
THREE = open(os.path.join(SITE, 'vendor', 'three', 'three.min.js')).read()
HTML = open(os.path.join(SITE, 'assets', 'molecular', 'receptors.html'), encoding='utf-8').read()
HOST = '''<!doctype html><html><body style="margin:0"><iframe id="f" src="/viewer.html?receptor=5-HT2A&tab=drugs" style="width:1000px;height:700px;border:0"></iframe>
<script>window.msgs=[];window.addEventListener('message',e=>{if(e.data&&e.data.type==='receptor-viewer')window.msgs.push(e.data)});</script></body></html>'''
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME', '/opt/pw-browsers/chromium'), args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 800}); pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.route('**/three.min.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=THREE))
    pg.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
    pg.route('http://host.test/index.html', lambda r: r.fulfill(status=200, content_type='text/html', body=HOST))
    pg.route('http://host.test/viewer.html**', lambda r: r.fulfill(status=200, content_type='text/html; charset=utf-8', body=HTML))
    pg.goto('http://host.test/index.html'); pg.wait_for_timeout(5000)
    print('initial messages:', pg.evaluate('JSON.stringify(window.msgs)'))
    pg.evaluate('document.querySelector("#f").contentWindow.postMessage({type:"receptor-viewer", receptor:"5-HT4", tab:"compare"}, "*")'); pg.wait_for_timeout(2000)
    print('after postMessage:', pg.evaluate('JSON.stringify(window.msgs[window.msgs.length-1])'))
    pg.evaluate('document.querySelector("#f").contentDocument.documentElement.setAttribute("data-theme","dark")'); pg.wait_for_timeout(800)
    pg.screenshot(path='work/shots/api_iframe.png')
    b.close()
print('\n'.join(logs) or 'no errors/warnings')
