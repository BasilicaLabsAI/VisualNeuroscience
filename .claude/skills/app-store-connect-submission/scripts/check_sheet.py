#!/usr/bin/env python3
"""Check an App Store Connect submission sheet before anything is pasted.

    python3 check_sheet.py <sheet.md> [--online]

A field in the sheet is a level-3 heading followed by one fenced block:

    ### Description (4000)
    ```text
    ...
    ```

The number in brackets is the field's limit in characters; a heading
without one has no count. The sheet's "Kind:" line begins with one of the
three kinds of submission, first submission, new platform or update, and
decides which fields must be there.

The script counts every field against its limit (the keywords in bytes as
well, the stricter reading), checks the keywords against the store's
rules, looks in the public text for words the store refuses (other
platforms, "beta", unfinished markers), checks that every URL is https
and, with --online, that each one answers. Text in [[double brackets]]
inside a field's block is typed by hand into App Store Connect (a password,
a phone number) and is listed as such; anywhere else in the sheet it is a
question still open for the person, and the sheet is not ready until it is
answered. HTML comments and `inline code` are not read for either. Exit
status 0 only when the sheet is ready to submit; warnings alone do not stop
it.
"""
import re
import sys
import urllib.error
import urllib.request

HEADING = re.compile(r'^###\s+(?P<name>.+?)(?:\s*\((?P<limit>\d[\d,]*)\))?\s*$')
FENCE = re.compile(r'^\s*(```|~~~)')
KIND_LINE = re.compile(r'^Kind:\s*(?P<value>.*?)\s*$', re.I)
VERSION_SECTION = re.compile(r'^Version\s+(?P<version>\S+)', re.I)
INLINE_CODE = re.compile(r'`[^`\n]*`')

KINDS = ('first submission', 'new platform', 'update')
# Fields every sheet must hold, by kind. A new platform's version page asks
# for no name and no privacy policy: those belong to the app record, which
# the platform already live set. Optional fields may stand empty.
VERSION_PAGE = ['description', 'keywords', 'support url', 'copyright', 'version', 'notes']
REQUIRED = {
    'first submission': ['name', 'privacy policy url'] + VERSION_PAGE,
    'new platform': VERSION_PAGE,
    'update': ['name', 'privacy policy url'] + VERSION_PAGE + ["what's new"],
}
OPTIONAL = ('subtitle', 'promotional text', 'marketing url', 'user privacy choices url',
            'secondary category', 'license agreement', 'attachment')
# Fields the public reads on the product page, where the store's metadata
# rules apply.
PUBLIC = ('name', 'subtitle', 'promotional text', 'description', 'keywords', "what's new")
# Words a store listing may not carry (2.3.10, 2.1) and words that waste keyword room.
# Apple's own devices are fine to name; other companies' platforms and stores are not.
PLATFORM = re.compile(r'\b(android|google play|play store|windows phone|windows store|samsung galaxy store|huawei appgallery)\b', re.I)
UNFINISHED = re.compile(r'\b(TODO|TBD|FIXME|XXX|lorem ipsum)\b', re.I)
UNFINISHED_PROSE = re.compile(r'\b(TODO|TBD|FIXME)\b')
BETA = re.compile(r'\b(beta|test version|pre-release|prerelease)\b', re.I)
WASTED_KEYWORDS = {'app', 'apps', 'free', 'iphone', 'ipad', 'ios', 'mac', 'best', 'new'}
PLACEHOLDER = re.compile(r'\[\[(.+?)\]\]', re.S)


def visible(line, state):
    """The line without the parts inside HTML comments; state carries a
    comment left open from the line before."""
    out, i = [], 0
    while i <= len(line):
        if state['comment']:
            j = line.find('-->', i)
            if j < 0:
                return ''.join(out)
            state['comment'], i = False, j + 3
        else:
            j = line.find('<!--', i)
            if j < 0:
                out.append(line[i:])
                break
            out.append(line[i:j])
            state['comment'], i = True, j + 4
    return ''.join(out)


def parse(text):
    """The fields in the order they stand, as (section, name, limit, body),
    and the sheet's prose, everything outside the fields' blocks, as
    (section, line)."""
    fields, prose = [], []
    section, pending, body, inside = '', None, [], False
    state = {'comment': False}
    for raw in text.splitlines():
        if inside:
            if FENCE.match(raw):
                if pending:
                    fields.append((section, pending[0], pending[1], '\n'.join(body)))
                else:  # a block under no field heading is read as prose
                    prose.extend((section, b) for b in body)
                pending, body, inside = None, [], False
            else:
                body.append(raw)
            continue
        line = visible(raw, state)
        if not line.strip():
            continue
        if line.startswith('## '):
            section, pending = line[3:].strip(), None
            prose.append((section, line))
            continue
        m = HEADING.match(line)
        if m:
            limit = int(m.group('limit').replace(',', '')) if m.group('limit') else None
            pending = (m.group('name').strip(), limit)
            continue
        if FENCE.match(line):
            inside, body = True, []
            continue
        prose.append((section, line))
    return fields, prose


def key(name):
    return name.lower().replace('’', "'")


def is_field(name, *wanted):
    k = key(name)
    return any(k == w or k.startswith(w) for w in wanted)


def words(text):
    return {w.lower() for w in re.findall(r"[A-Za-z0-9]+", text)}


def check_url(url):
    req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0 (submission check)'})
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            return r.status, None
    except urllib.error.HTTPError as e:
        if e.code in (403, 405):  # some hosts refuse HEAD; ask again with GET
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (submission check)'})
                with urllib.request.urlopen(req, timeout=12) as r:
                    return r.status, None
            except urllib.error.HTTPError as e2:
                return e2.code, None
            except Exception as e2:  # noqa: BLE001
                return None, str(e2)
        return e.code, None
    except Exception as e:  # noqa: BLE001
        return None, str(e)


def read_kind(prose):
    """The kind the sheet's Kind line begins with, and the line's text."""
    for _, line in prose:
        m = KIND_LINE.match(line)
        if m:
            value = m.group('value')
            for k in KINDS:
                if re.match(re.escape(k) + r'(?![a-z])', value.lower()):
                    return k, value
            return None, value
    return None, None


def main(argv):
    args = [a for a in argv[1:] if not a.startswith('--')]
    online = '--online' in argv
    if len(args) != 1:
        print(__doc__.strip().splitlines()[2].strip())
        return 2
    text = open(args[0], encoding='utf-8').read().replace('\r\n', '\n')
    fields, prose = parse(text)
    fails, warns, todo, questions = [], [], [], []

    if not fields:
        print('No fields found: each needs a "### Name (limit)" heading and one fenced block under it.')
        return 1

    kind, kind_text = read_kind(prose)
    if kind is None:
        said = f' (it says "{kind_text}")' if kind_text else ''
        fails.append(f'The "Kind:" line must begin with one of: {", ".join(KINDS)}{said}. '
                     'The required fields were checked as for a first submission.')
    rules = kind or 'first submission'
    print(f'Kind: {kind or "not given"}\n')

    # the counts
    width = max(len(n) for _, n, _, _ in fields) + 2
    print(f"{'Field':<{width}}{'Count':>7}{'Limit':>7}")
    for section, name, limit, body in fields:
        n = len(body)
        mark = ''
        if limit is not None:
            mark = 'ok' if n <= limit else 'OVER'
            if n > limit:
                fails.append(f'{name}: {n} characters, over the limit of {limit} by {n - limit}.')
        elif not body.strip():
            mark = 'empty'
        print(f"{name:<{width}}{n:>7}{(limit if limit is not None else ''):>7}  {mark}")

    names = [key(n) for _, n, _, _ in fields]
    for want in REQUIRED[rules]:
        if not any(k == want or k.startswith(want) for k in names):
            fails.append(f'No "{want}" field in the sheet.')
    if rules != 'update' and any(k.startswith("what's new") for k in names):
        warns.append("What's New is not shown on a platform's first version; App Store Connect will not ask for it.")
    for _, name, _, body in fields:
        if not body.strip() and not is_field(name, *OPTIONAL):
            fails.append(f'{name} is empty.')

    # the version field against the version section's heading
    sections = {m.group('version') for s, _ in prose for m in [VERSION_SECTION.match(s)] if m}
    for _, name, _, body in fields:
        if key(name) == 'version' and sections and body.strip() not in sections:
            fails.append(f'The Version field says {body.strip()} but the section is headed Version {", ".join(sorted(sections))}.')

    # name and subtitle
    title_words = set()
    for _, name, _, body in fields:
        if is_field(name, 'name', 'subtitle'):
            title_words |= words(body)
    subs = [b for _, n, _, b in fields if is_field(n, 'subtitle')]
    nms = [b for _, n, _, b in fields if key(n) == 'name']
    if subs and nms:
        shared = (words(subs[0]) & words(nms[0])) - {'the', 'a', 'and', 'of'}
        if shared:
            warns.append(f'The subtitle repeats the name\'s word(s) {", ".join(sorted(shared))}; both are indexed already.')

    # keywords
    for _, name, _, body in fields:
        if not is_field(name, 'keywords'):
            continue
        b = len(body.encode('utf-8'))
        if b > 100:
            fails.append(f'Keywords are {b} bytes; the store allows 100.')
        items = body.split(',')
        if any(i != i.strip() for i in items):
            warns.append('Keywords have spaces around commas; each space costs a character.')
        clean = [i.strip() for i in items]
        if any(not i for i in clean):
            fails.append('Keywords have an empty entry (two commas together, or a comma at an end).')
        seen, dup = set(), set()
        for i in clean:
            if i.lower() in seen:
                dup.add(i)
            seen.add(i.lower())
        if dup:
            warns.append(f'Keywords repeat {", ".join(sorted(dup))}.')
        again = sorted({i for i in clean if i and words(i) & title_words})
        if again:
            warns.append(f'Keywords already in the name or subtitle (indexed there already): {", ".join(again)}.')
        wasted = sorted({i for i in clean if i.lower() in WASTED_KEYWORDS})
        if wasted:
            warns.append(f'Keywords that waste room or the store ignores: {", ".join(wasted)}.')

    # public text
    for _, name, _, body in fields:
        if not is_field(name, *PUBLIC):
            continue
        for m in PLATFORM.finditer(body):
            warns.append(f'{name} names another platform or store ("{m.group(0)}"); guideline 2.3.10 forbids it.')
        for m in BETA.finditer(body):
            warns.append(f'{name} says "{m.group(0)}"; the store wants finished apps (2.1).')

    # in the fields: what is typed by hand, and what was never finished
    for _, name, _, body in fields:
        for m in UNFINISHED.finditer(body):
            fails.append(f'{name} still says "{m.group(0)}".')
        for m in PLACEHOLDER.finditer(body):
            todo.append(f'{name}: {m.group(1)}')

    # in the prose: questions still open for the person
    for section, line in prose:
        line = INLINE_CODE.sub('', line)
        where = f'{section}: ' if section else 'At the top: '
        for m in PLACEHOLDER.finditer(line):
            questions.append(f'{where}{m.group(1)}')
        for m in UNFINISHED_PROSE.finditer(line):
            questions.append(f'{where}the sheet still says "{m.group(0)}": {line.strip()}')

    # URLs
    for _, name, _, body in fields:
        if not key(name).endswith('url') or not body.strip():
            continue
        url = body.strip()
        if not re.match(r'^https://[^\s/]+\.[^\s]+', url):
            fails.append(f'{name} is not an https address: {url}')
            continue
        if online:
            status, err = check_url(url)
            if status and status < 400:
                print(f'{name}: {url} answers {status}')
            elif status:
                fails.append(f'{name}: {url} answers {status}.')
            else:
                warns.append(f'{name}: {url} could not be reached from here ({err}); open it by hand.')

    if warns:
        print('\nWarnings:')
        for w in warns:
            print(f'- {w}')
    if todo:
        print('\nTo type by hand in App Store Connect:')
        for t in todo:
            print(f'- {t}')
    if questions:
        print('\nOpen questions for the person:')
        for q in questions:
            print(f'- {q}')
    if fails:
        print('\nMust change before submitting:')
        for f in fails:
            print(f'- {f}')
        print(f'\nNot ready: {len(fails)} to change, {len(questions)} question(s) open, {len(warns)} warning(s).')
        return 1
    if questions:
        print(f'\nNot ready: the fields pass, and {len(questions)} question(s) are open for the person; '
              f'{len(warns)} warning(s) to read.')
        return 1
    print(f'\nReady: every field within its limit, nothing open; {len(warns)} warning(s) to read.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
