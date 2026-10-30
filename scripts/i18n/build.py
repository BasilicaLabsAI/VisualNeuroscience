#!/usr/bin/env python3
"""The Chinese pages (v12.70, at the owner's word).

    python3 scripts/i18n/build.py             write the twins, the strings file, the sitemap; report what is missing
    python3 scripts/i18n/build.py --check     exit 1 when anything written would change, or a twin's page has English
                                              left that the catalog does not cover
    python3 scripts/i18n/build.py --missing   print, page by page, the English still without Chinese, as JSON ready
                                              to be translated into i18n/zh-hans.json

Every page in TWINS is written again beside itself as <name>.zh-hans.html, its words taken from the catalog,
i18n/zh-hans.json, which maps English to Chinese. A unit is the inner HTML of an element that holds text of its
own, a heading, a paragraph, a list item, a button's label, with its whitespace folded and its inline markup kept,
so a sentence is translated whole; the attributes people read (alt, title, aria-label, placeholder) and the page's
description and sharing text are units too. A unit the catalog lacks stays English and is reported; one whose
Chinese is its English (a name) is kept as it is. Links to pages that have a twin lead to the twin, the page says
lang="zh-Hans", and assets/i18n-zh.css sets the Chinese faces.

Every public English page gets the block that loads assets/i18n.js first in its head, with the languages it exists
in and, where it has a twin, the hreflang links search engines read; the twin gets the same block and the strings
file, assets/i18n/zh-hans.js, the catalog's plain strings, which assets/i18n.js uses to put into Chinese the English
that page scripts write as they run. site/sitemap.xml lists every public page with its twin. Edit the English
pages as before; run this after, and the twins follow."""
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site"
CATALOG = ROOT / "i18n" / "zh-hans.json"
STRINGS = SITE / "assets" / "i18n" / "zh-hans.js"
ORIGIN = "https://visualneuroscience.ai"
LANG, TAG = "zh-hans", "zh-Hans"

# the pages with a Chinese twin, added as each is translated
TWINS = ["index", "mcp", "about", "studies", "posters"]
# public pages that are never indexed or carry no header (the Vision Pro console's, the unlisted landing page, the
# sharing card's source, the old address's redirect)
NOT_PUBLIC = {"get", "share", "receptors", "connect", "vision", "vision-about", "vision-brodmann", "vision-model",
              "vision-plane", "vision-planes", "vision-regions"}
NOT_IN_SITEMAP = NOT_PUBLIC | {"poster-neurotransmitters", "poster-receptors", "account", "delete-account"}

SKIP = {"script", "style", "svg", "math", "code", "pre", "textarea", "noscript", "template", "kbd", "samp"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
READ_ATTRS = ("alt", "title", "aria-label", "placeholder")
META_TEXT = {("name", "description"), ("property", "og:title"), ("property", "og:description"),
             ("property", "og:image:alt"), ("name", "twitter:title"), ("name", "twitter:description")}

BLOCK_START, BLOCK_END = "<!-- i18n: written by scripts/i18n/build.py -->", "<!-- /i18n -->"


def fold(s):
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


class Node:
    __slots__ = ("tag", "attrs", "start", "open_end", "close_start", "children", "text", "skip", "parent")

    def __init__(self, tag, attrs, start, open_end, parent):
        self.tag, self.attrs, self.start, self.open_end = tag, dict(attrs), start, open_end
        self.close_start, self.children, self.text, self.parent = None, [], False, parent
        self.skip = tag in SKIP or self.attrs.get("translate") == "no" or "notranslate" in (self.attrs.get("class") or "").split() \
            or bool(parent and parent.skip)


class Tree(HTMLParser):
    """The page as elements with their places in the source, so a unit's inner HTML can be swapped in place and
    everything else left byte for byte."""

    def __init__(self, src):
        super().__init__(convert_charrefs=True)
        self.src = src
        self.lines = [0]
        for m in re.finditer("\n", src):
            self.lines.append(m.end())
        self.root = Node("#root", [], 0, 0, None)
        self.stack = [self.root]
        self.tags = []  # every start tag outside script and style: (node or None, start, end, tag, attrs)
        self.feed(src)
        self.close()

    def at(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        start = self.at()
        text = self.get_starttag_text()
        end = start + len(text)
        parent = self.stack[-1]
        if tag in VOID:
            self.tags.append((parent, start, end, tag, attrs, True))
            return
        node = Node(tag, attrs, start, end, parent)
        parent.children.append(node)
        self.tags.append((node, start, end, tag, attrs, False))
        self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        start = self.at()
        end = start + len(self.get_starttag_text())
        self.tags.append((self.stack[-1], start, end, tag, attrs, True))

    def handle_endtag(self, tag):
        start = self.at()
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                for n in self.stack[i:]:
                    n.close_start = start if n is self.stack[i] else (n.close_start or start)
                del self.stack[i:]
                return

    def handle_data(self, data):
        if data.strip() and len(self.stack) > 1:
            self.stack[-1].text = True


def units(tree):
    """The elements whose inner HTML is one unit: the outermost that hold text of their own."""
    out = []

    def visit(n):
        if n.skip:
            return
        if n.text and n.close_start is not None and n.tag not in ("html", "head", "body"):
            out.append(n)
            return
        for c in n.children:
            visit(c)

    visit(tree.root)
    return out


def inside(node, unit_nodes):
    p = node
    while p is not None:
        if p in unit_nodes:
            return True
        p = p.parent
    return False


def tag_edits(tree, unit_nodes, catalog, twins, missing):
    """The start tags outside the units, each with its readable attributes in Chinese and, for a link to a page with
    a twin, the twin as its address."""
    out = []
    for node, start, end, tag, attrs, void in tree.tags:
        holder = node if void else node.parent  # the element the tag stands in
        if (node is not None and node.skip) or inside(holder, unit_nodes):
            continue
        text = tree.src[start:end]
        new, a = text, dict(attrs)
        names = [k for k in READ_ATTRS if a.get(k) and re.search(r"[A-Za-z]", a[k])]
        if tag == "meta" and a.get("content") and any((kind, a.get(kind)) in META_TEXT for kind in ("name", "property")):
            names.append("content")
        for name in names:
            key = fold(a[name])
            zh = catalog.get(key)
            if zh is None:
                missing.append(key)
            else:
                new = set_attr(new, name, zh)
        if tag in ("a", "area"):
            new = relink(new, twins)
        if new != text:
            out.append((start, end, new))
    return out


def page_link(value, twins):
    m = re.match(r"^(?:\./)?([a-z0-9-]+)\.html((?:[?#].*)?)$", value or "")
    if m and m.group(1) in twins:
        return f"{m.group(1)}.{LANG}.html{m.group(2)}"
    if value in ("./", "/") and "index" in twins:
        return f"index.{LANG}.html"
    return None


def relink(fragment, twins):
    """Every <a href> in a piece of HTML that leads to a page with a twin, led to the twin."""
    def swap(m):
        new = page_link(html.unescape(m.group(3)), twins)
        return m.group(0) if new is None else f"{m.group(1)}{m.group(2)}{new}{m.group(2)}"
    return re.sub(r'(<a\b[^>]*?\shref=)(["\'])(.*?)\2', swap, fragment, flags=re.S)


def set_attr(tag_text, name, value):
    esc = html.escape(value, quote=True)
    pat = re.compile(r'(\s' + re.escape(name) + r'\s*=\s*)(["\'])(.*?)\2', re.S)
    if pat.search(tag_text):
        return pat.sub(lambda m: f'{m.group(1)}"{esc}"', tag_text, count=1)
    return tag_text


def canonical(base, lang):
    if lang == "en":
        return f"{ORIGIN}/" if base == "index" else f"{ORIGIN}/{base}"
    return f"{ORIGIN}/{base}.{lang}"


def block(base, langs, twin=False):
    lines = [BLOCK_START, f'<meta name="vn-langs" content="{" ".join(langs)}">', '<script src="assets/i18n.js"></script>']
    if twin:
        lines.append(f'<script src="assets/i18n/{LANG}.js"></script>')
    if len(langs) > 1:
        lines.append(f'<link rel="alternate" hreflang="en" href="{canonical(base, "en")}">')
        lines.append(f'<link rel="alternate" hreflang="{TAG}" href="{canonical(base, LANG)}">')
        lines.append(f'<link rel="alternate" hreflang="x-default" href="{canonical(base, "en")}">')
    lines.append(BLOCK_END)
    return "\n".join(lines)


def with_block(src, base, langs):
    """The English page with its i18n block, placed straight after the viewport line or replaced where it stands."""
    new = block(base, langs)
    if BLOCK_START in src:
        return re.sub(re.escape(BLOCK_START) + r".*?" + re.escape(BLOCK_END), lambda m: new, src, count=1, flags=re.S)
    m = re.search(r'<meta name="viewport"[^>]*>\n', src)
    if not m:
        m = re.search(r"<head>\n", src)
    return src[:m.end()] + new + "\n" + src[m.end():]


def twin_of(src, base, catalog, twins, missing):
    tree = Tree(src)
    found = units(tree)
    unit_nodes = set(found)
    edits = []
    for n in found:
        inner = src[n.open_end:n.close_start]
        key = fold(inner)
        if not key or not re.search(r"[A-Za-z]", key):
            continue
        zh = catalog.get(key)
        if zh is None:
            missing.append(key)
            continue
        lead = re.match(r"\s*", inner).group(0)
        tail = re.search(r"\s*$", inner).group(0)
        edits.append((n.open_end, n.close_start, lead + relink(zh, twins) + tail))
    edits.extend(tag_edits(tree, unit_nodes, catalog, twins, missing))
    out = src
    for start, end, text in sorted(edits, key=lambda e: e[0], reverse=True):
        out = out[:start] + text + out[end:]
    out = re.sub(r'<html lang="en"', f'<html lang="{TAG}"', out, count=1)
    out = re.sub(re.escape(BLOCK_START) + r".*?" + re.escape(BLOCK_END), lambda m: block(base, ["en", LANG], twin=True),
                 out, count=1, flags=re.S)
    out = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + canonical(base, LANG) + m.group(2), out, count=1)
    if 'property="og:locale"' not in out:
        out = re.sub(r'(<meta property="og:type"[^>]*>)', r'\1\n<meta property="og:locale" content="zh_CN">', out, count=1)
    out = out.replace("</head>", f'<link rel="stylesheet" href="assets/i18n-{LANG}.css">\n</head>', 1)
    return out


def sitemap(pages):
    rows = ['<?xml version="1.0" encoding="UTF-8"?>',
            '<!-- written by scripts/i18n/build.py: every public page, and its Chinese twin where it has one -->',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for base in pages:
        langs = ["en", LANG] if base in TWINS else ["en"]
        for lang in langs:
            rows.append("  <url>")
            rows.append(f"    <loc>{canonical(base, lang)}</loc>")
            if len(langs) > 1:
                rows.append(f'    <xhtml:link rel="alternate" hreflang="en" href="{canonical(base, "en")}"/>')
                rows.append(f'    <xhtml:link rel="alternate" hreflang="{TAG}" href="{canonical(base, LANG)}"/>')
                rows.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{canonical(base, "en")}"/>')
            rows.append("  </url>")
    rows.append("</urlset>")
    return "\n".join(rows) + "\n"


def strings_file(catalog):
    plain = {k: v for k, v in catalog.items() if "<" not in k and "<" not in v and k != v}
    body = json.dumps(plain, ensure_ascii=False, indent=0, sort_keys=True).replace("\n", "")
    return ("/* written by scripts/i18n/build.py from i18n/zh-hans.json: the catalog's plain strings, which assets/i18n.js "
            "puts in place of the English page scripts write as they run, and the pages with a Chinese twin */\n"
            f"window.VN_I18N && VN_I18N.use(\"{LANG}\", {body}, {json.dumps(TWINS)});\n")


def main(argv):
    check, list_missing = "--check" in argv, "--missing" in argv
    catalog = {fold(k): v for k, v in json.loads(CATALOG.read_text(encoding="utf-8")).items()}
    english = sorted(p.stem for p in SITE.glob("*.html") if "." not in p.stem and p.stem not in NOT_PUBLIC)
    writes, report, wanted = {}, {}, {}
    for base in english:
        path = SITE / f"{base}.html"
        src = path.read_text(encoding="utf-8")
        langs = ["en", LANG] if base in TWINS else ["en"]
        src2 = with_block(src, base, langs)
        if src2 != src:
            writes[path] = src2
        if base in TWINS:
            missing = []
            writes[SITE / f"{base}.{LANG}.html"] = twin_of(src2, base, catalog, TWINS, missing)
            seen = []
            for k in missing:
                if k not in seen:
                    seen.append(k)
            report[base] = seen
            if seen:
                wanted[f"{base}.html"] = {k: "" for k in seen}
    writes[STRINGS] = strings_file(catalog)
    writes[SITE / "sitemap.xml"] = sitemap([b for b in ["index"] + [e for e in english if e != "index"] if b not in NOT_IN_SITEMAP])

    if list_missing:
        print(json.dumps(wanted, ensure_ascii=False, indent=1))
        return 0
    stale = [p for p, text in writes.items() if not p.exists() or p.read_text(encoding="utf-8") != text]
    if check:
        for p in stale:
            print(f"stale: {p.relative_to(ROOT)}")
        for base, keys in report.items():
            for k in keys:
                print(f"{base}: no Chinese for {k[:100]!r}")
        return 1 if stale or any(report.values()) else 0
    for p in stale:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(writes[p], encoding="utf-8")
        print(f"wrote {p.relative_to(ROOT)}")
    for base, keys in report.items():
        print(f"{base}.{LANG}.html: {len(keys)} unit(s) still English" + (": " + "; ".join(k[:60] for k in keys[:6]) if keys else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
