"""Build the Digital Textbook from OpenStax's source.

usage: python3 build.py /path/to/osbooks-neuroscience      (needs Pillow)

The book is OpenStax's Introduction to Behavioral Neuroscience, published
under CC BY-NC-SA 4.0 as CNXML with its images, at
github.com/openstax/osbooks-neuroscience. This turns that source into the
site's own pages:

  site/textbook.html                 the whole book on one page: every
                                     chapter a fold that opens to its
                                     sections, every section a fold that
                                     opens to its text; preface and appendix
                                     folds of their own
  site/assets/textbook/img/*.webp    every image the text uses, recompressed
  site/assets/home/textbook.jpg      the card on the home page, from the cover

The pages keep the book's words, figures, notes, tables, key terms,
summaries and references. The videos are embedded, each creating its
player only when its fold is opened; the interactive exercises live on
OpenStax's own platform and are not in the source, so they are linked. The
page carries the attribution the licence asks for. The layout, styles and scripts are the site's (assets/textbook.css
and assets/textbook.js).
"""
import html, json, os, re, sys
import xml.etree.ElementTree as ET
from PIL import Image

SRC = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else None
if not SRC or not os.path.isdir(os.path.join(SRC, "modules")):
    raise SystemExit("usage: python3 build.py /path/to/osbooks-neuroscience   (a clone of github.com/openstax/osbooks-neuroscience)")
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(HERE, "..", "..", "site"))
IMG_DIR = os.path.join(SITE, "assets", "textbook", "img")
os.makedirs(IMG_DIR, exist_ok=True)

NS = {"c": "http://cnx.rice.edu/cnxml", "md": "http://cnx.rice.edu/mdml", "m": "http://www.w3.org/1998/Math/MathML", "col": "http://cnx.rice.edu/collxml"}
C = "{http://cnx.rice.edu/cnxml}"; M = "{http://www.w3.org/1998/Math/MathML}"

BOOK = "Introduction to Behavioral Neuroscience"
OS_URL = "https://openstax.org/books/introduction-behavioral-neuroscience/pages/1-introduction"
OS_BOOK = "https://openstax.org/details/books/introduction-behavioral-neuroscience"
MAX_W = 1400

def tag(e):
    return e.tag.split("}")[-1]

def esc(s):
    return html.escape(s or "", quote=False)

def slug(s, n=48):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    if len(s) > n: s = s[:n].rsplit("-", 1)[0]
    return s.rstrip("-")

# ── the collection: chapters and their modules ─────────────────────────────
col = ET.parse(os.path.join(SRC, "collections", "introduction-behavioral-neuroscience.collection.xml")).getroot()
content = col.find("col:content", NS)
chapters = []         # (number, title, [module ids])
loose = []            # top-level modules: preface, appendix
n = 0
for child in content:
    if tag(child) == "module":
        loose.append(child.get("document"))
    elif tag(child) == "subcollection":
        n += 1
        title = child.find("md:title", NS).text
        mods = [m.get("document") for m in child.find("col:content", NS) if tag(m) == "module"]
        chapters.append((n, title, mods))

def load(mod):
    root = ET.parse(os.path.join(SRC, "modules", mod, "index.cnxml")).getroot()
    return root

MODS = {}
for _, _, mods in chapters:
    for m in mods: MODS[m] = load(m)
for m in loose: MODS[m] = load(m)

def mod_title(mod):
    t = MODS[mod].find("c:title", NS)
    return (t.text or "").strip() if t is not None else mod

# where every module lives, and what every id inside it is called
PAGE = {}            # mod -> (file, chapter number or None, section label)
for num, title, mods in chapters:
    fname = f"{num:02d}-{slug(title.split(':')[0], 44)}.html"
    k = 0
    for m in mods:
        cls = MODS[m].get("class") or ""
        if cls == "introduction":
            label = "Introduction"
        else:
            k += 1; label = f"{num}.{k}"
        PAGE[m] = (fname, num, label)
for m in loose:
    cls = MODS[m].get("class") or ""
    PAGE[m] = (f"{cls or slug(mod_title(m))}.html", None, "")

TITLES = {}          # (mod, id) -> title text, for cross-references
for m, root in MODS.items():
    for e in root.iter():
        i = e.get("id")
        if not i: continue
        t = e.find("c:title", NS)
        if t is not None and t.text:
            TITLES[(m, i)] = "".join(t.itertext()).strip()

# ── images ─────────────────────────────────────────────────────────────────
SIZES = {}
def image(src):
    """Recompress one of the book's images to WebP, once, and return its
    path from a chapter page plus its size."""
    name = os.path.basename(src)
    stem = os.path.splitext(name)[0]
    out = os.path.join(IMG_DIR, stem + ".webp")
    if stem not in SIZES:
        path = os.path.join(SRC, "media", name)
        im = Image.open(path)
        w, h = im.size
        if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(path):
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGBA" if "A" in im.mode or im.mode == "P" else "RGB")
            if w > MAX_W:
                im = im.resize((MAX_W, round(h * MAX_W / w)), Image.LANCZOS)
            im.save(out, "WEBP", quality=78, method=4)
        sw, sh = (MAX_W, round(h * MAX_W / w)) if w > MAX_W else (w, h)
        SIZES[stem] = (sw, sh)
    return "assets/textbook/img/" + stem + ".webp", SIZES[stem]

# ── CNXML to HTML ──────────────────────────────────────────────────────────
NOTE_KIND = {"inthe-lab": "In the lab", "meet-author": "Meet the author", "across-species": "Across species",
             "in-thewild": "In the wild", "boxed-feature": "Feature"}

class Ctx:
    def __init__(self, mod):
        self.mod = mod
        self.practice = False        # the module has interactive exercises on OpenStax
        self.videos = []

def aid(ctx, i):
    return f"{ctx.mod}-{i}" if i else ""

def link_href(ctx, e):
    doc, tid, url = e.get("document"), e.get("target-id"), e.get("url")
    if url:
        return url, True
    m = doc or ctx.mod
    if m not in PAGE:
        return None, False
    return (f"#{m}-{tid}" if tid else f"#{m}"), False

def link_text(ctx, e):
    t = "".join(e.itertext()).strip()
    if t: return None
    doc, tid = e.get("document"), e.get("target-id")
    m = doc or ctx.mod
    if tid and (m, tid) in TITLES: return TITLES[(m, tid)]
    if doc and doc in MODS: return mod_title(doc)
    if tid: return "this figure"
    return "here"

def mathml(e):
    out = [f"<{tag(e)}" + "".join(f' {k.split("}")[-1]}="{esc(v)}"' for k, v in e.attrib.items()) + ">"]
    if e.text: out.append(esc(e.text))
    for ch in e:
        out.append(mathml(ch))
        if ch.tail: out.append(esc(ch.tail))
    out.append(f"</{tag(e)}>")
    return "".join(out)

def inner(ctx, e, depth):
    out = [esc(e.text)] if e.text else []
    for ch in e:
        out.append(render(ctx, ch, depth))
        if ch.tail: out.append(esc(ch.tail))
    return "".join(out)

def render(ctx, e, depth=1):
    if e.tag.startswith(M):
        return mathml(e)
    t = tag(e)
    if t in ("metadata", "title"):
        return ""
    if t in ("document", "content"):
        return inner(ctx, e, depth)
    if t == "section":
        cls = e.get("class") or ""
        title = e.find("c:title", NS)
        ttext = "".join(title.itertext()).strip() if title is not None else ""
        body = inner(ctx, e, depth + 1)
        i = aid(ctx, e.get("id"))
        if cls == "learning-objectives":
            return f'<div class="tb-lo" id="{i}"><span class="ck">Learning objectives</span>{body}</div>'
        if cls == "section-summary":
            return f'<section class="tb-summary" id="{i}"><h3>Summary</h3>{body}</section>'
        if cls == "key-terms":
            return f'<section class="tb-terms" id="{i}"><h3>Key terms</h3>{body}</section>'
        if cls == "references":
            return f'<details class="tb-refs" id="{i}"><summary>References</summary><div class="tb-refs-body">{body}</div></details>'
        if cls in ("multiple-choice", "fillin-blank"):
            ctx.practice = True
            return ""
        h = f"h{min(depth + 2, 5)}"
        return f'<section id="{i}">' + (f"<{h}>{esc(ttext)}</{h}>" if ttext else "") + body + "</section>"
    if t == "para":
        media = e.find("c:media", NS)
        if media is not None and media.find("c:iframe", NS) is not None and not "".join(e.itertext()).strip():
            return render(ctx, media, depth)
        return f'<p id="{aid(ctx, e.get("id"))}">{inner(ctx, e, depth)}</p>'
    if t == "figure":
        cls = e.get("class") or ""
        title = e.find("c:title", NS); cap = e.find("c:caption", NS)
        ttext = "".join(title.itertext()).strip() if title is not None else ""
        parts = "".join(render(ctx, ch, depth) for ch in e if tag(ch) in ("media", "figure", "para", "list"))
        caption = ""
        if ttext or (cap is not None and "".join(cap.itertext()).strip()):
            caption = "<figcaption>" + (f"<b>{esc(ttext)}</b> " if ttext else "") + (inner(ctx, cap, depth) if cap is not None else "") + "</figcaption>"
        return f'<figure class="tb-fig{" tb-splash" if cls == "splash" else ""}" id="{aid(ctx, e.get("id"))}">{parts}{caption}</figure>'
    if t == "media":
        alt = e.get("alt") or ""
        img = e.find("c:image", NS)
        if img is not None:
            src, (w, h) = image(img.get("src"))
            return f'<img src="{src}" alt="{esc(alt)}" width="{w}" height="{h}" loading="lazy" decoding="async">'
        fr = e.find("c:iframe", NS)
        if fr is not None:
            url = fr.get("src")
            ctx.videos.append(url)
            what = ("the section summary video" if "Summary" in url else "the author introduce this chapter" if "Author" in url else "the video")
            return (f'<details class="tb-video"><summary>Watch {esc(what)}</summary>'
                    f'<div class="tb-video-box"><iframe data-src="{esc(url)}" title="Video from OpenStax" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'
                    f'<p class="tb-video-note">Streamed from OpenStax; <a href="{esc(url)}" target="_blank" rel="noopener">open it there</a> if it does not play.</p></details>')
        return ""
    if t == "image":
        return ""
    if t == "note":
        cls = e.get("class") or "boxed-feature"
        title = e.find("c:title", NS)
        ttext = "".join(title.itertext()).strip() if title is not None else ""
        kind = NOTE_KIND.get(cls, "Note")
        return (f'<aside class="tb-note tb-note-{esc(cls)}" id="{aid(ctx, e.get("id"))}"><span class="ck">{esc(kind)}</span>' +
                (f"<h4>{esc(ttext)}</h4>" if ttext else "") + inner(ctx, e, depth) + "</aside>")
    if t == "list":
        items = [ch for ch in e if tag(ch) == "item"]
        if e.get("display") == "inline":
            return '<span class="tb-inline">' + ", ".join(f"<span>{inner(ctx, it, depth)}</span>" for it in items) + "</span>"
        ordered = e.get("list-type") == "enumerated" or e.get("number-style") is not None
        title = e.find("c:title", NS)
        head = f'<p class="tb-list-title">{esc("".join(title.itertext()))}</p>' if title is not None else ""
        lis = "".join(f"<li>{inner(ctx, it, depth)}</li>" for it in items)
        return head + (f'<ol id="{aid(ctx, e.get("id"))}">{lis}</ol>' if ordered else f'<ul id="{aid(ctx, e.get("id"))}">{lis}</ul>')
    if t == "item":
        return inner(ctx, e, depth)
    if t == "term":
        return f'<b class="tb-term">{inner(ctx, e, depth)}</b>'
    if t == "emphasis":
        eff = e.get("effect") or "bold"
        tg = {"bold": "strong", "italics": "em", "underline": "u", "smallcaps": "span"}.get(eff, "strong")
        return f"<{tg}>{inner(ctx, e, depth)}</{tg}>"
    if t == "link":
        if e.get("class") == "os-embed":
            ctx.practice = True
            return ""
        href, ext = link_href(ctx, e)
        text = link_text(ctx, e)
        body = esc(text) if text is not None else inner(ctx, e, depth)
        if not href: return body
        rel = ' target="_blank" rel="noopener"' if ext else ""
        return f'<a href="{esc(href)}"{rel}>{body}</a>'
    if t == "sup": return f"<sup>{inner(ctx, e, depth)}</sup>"
    if t == "sub": return f"<sub>{inner(ctx, e, depth)}</sub>"
    if t == "newline": return "<br>"
    if t == "quote": return f'<blockquote id="{aid(ctx, e.get("id"))}">{inner(ctx, e, depth)}</blockquote>'
    if t == "exercise":
        return "".join(render(ctx, ch, depth) for ch in e)
    if t == "problem" or t == "solution":
        return f'<div class="tb-{t}">{inner(ctx, e, depth)}</div>'
    if t == "table":
        return table(ctx, e, depth)
    if t == "footnote":
        return f' <span class="tb-footnote">({inner(ctx, e, depth)})</span>'
    if t in ("iframe",):
        return ""
    return inner(ctx, e, depth)

def table(ctx, e, depth):
    tg = e.find("c:tgroup", NS)
    if tg is None: return ""
    cols = [c.get("colname") for c in tg.findall("c:colspec", NS)]
    def rows(part, cell):
        out = []
        for r in part.findall("c:row", NS):
            cells = []
            for en in r.findall("c:entry", NS):
                attrs = ""
                a, b = en.get("namest"), en.get("nameend")
                if a in cols and b in cols and cols.index(b) > cols.index(a):
                    attrs += f' colspan="{cols.index(b) - cols.index(a) + 1}"'
                if en.get("morerows"):
                    attrs += f' rowspan="{int(en.get("morerows")) + 1}"'
                cells.append(f"<{cell}{attrs}>{inner(ctx, en, depth)}</{cell}>")
            out.append("<tr>" + "".join(cells) + "</tr>")
        return "".join(out)
    thead = tg.find("c:thead", NS); tbody = tg.find("c:tbody", NS)
    title = e.find("c:title", NS); cap = e.find("c:caption", NS)
    ct = "".join(title.itertext()).strip() if title is not None else ""
    cc = inner(ctx, cap, depth).strip() if cap is not None else ""
    caption = f"<caption>{('<b>' + esc(ct) + '</b> ') if ct else ''}{cc}</caption>" if (ct or cc) else ""
    summary = f' aria-label="{esc(e.get("summary"))}"' if e.get("summary") else ""
    return (f'<div class="tb-table"><table id="{aid(ctx, e.get("id"))}"{summary}>{caption}' +
            (f"<thead>{rows(thead, 'th')}</thead>" if thead is not None else "") +
            (f"<tbody>{rows(tbody, 'td')}</tbody>" if tbody is not None else "") + "</table></div>")

# ── citations: the "(Surname, 2009)" in the text, tied to the entry it cites ──
SURNAME = r"[A-Z][\w'’\-]+(?: [A-Z][\w'’\-]+)?"
REF_AUTHORS = re.compile(r"^(.*?)\s*\((\d{4}[a-z]?)[^)]*\)")
# a surname's second word, if any, is a word, not a pair of initials
REF_SURNAMES = re.compile(r"([A-Z][\w'’\-]+(?: [A-Z][a-z'’\-]+)?)\s*,?\s+(?:[A-Z]{1,3}\.?\s?-?)+")
CITE = re.compile(r"(?<![\w>])(" + SURNAME + r")(\s+et al\.|\s+(?:&amp;|and)\s+(" + SURNAME + r"))?,?\s+\(?(\d{4}[a-z]?)\)?(?![\w<])")
URL = re.compile(r"(https?://[^\s<>\)\]]+?)([.,;)\]]*)(?=\s|$|<)")

def text_segments(html_):
    """Alternate (is_tag, text) pieces, so a substitution can leave markup alone."""
    return re.split(r"(<[^>]+>)", html_)

def linkify(html_):
    out = []
    for seg in text_segments(html_):
        if seg.startswith("<"): out.append(seg); continue
        out.append(URL.sub(lambda m: f'<a href="{m.group(1)}" target="_blank" rel="noopener">{m.group(1)}</a>{m.group(2)}', seg))
    return "".join(out)

def ref_index(refs_html, mod):
    """Number the entries of a references list and index them by first
    author and year. Returns the list with ids on its entries."""
    idx = {}
    n = 0
    def number(m):
        nonlocal n
        n += 1
        rid = f"{mod}-ref-{n}"
        text = re.sub(r"<[^>]+>", "", m.group(2))
        am = REF_AUTHORS.match(text)
        if am:
            authors, year = am.group(1), am.group(2)
            names = REF_SURNAMES.findall(authors)
            if not names: names = [authors.strip(" .,")]
            entry = (rid, len(names), names[1].lower() if len(names) > 1 else "")
            idx.setdefault((names[0].lower(), year), []).append(entry)
            for nm in names[1:]:
                idx.setdefault(("~" + nm.lower(), year), []).append(entry)
        return f'<p id="{rid}"{m.group(1)}>{m.group(2)}</p>'
    refs_html = re.sub(r'<p( id="[^"]*")?>(.*?)</p>', number, refs_html, flags=re.S)
    return refs_html, idx

def cite_wrap(html_, chain):
    """Wrap each citation that an index in the chain can place. A name whose
    year matches nothing falls back to the one entry of that name, if there
    is exactly one, since the book itself sometimes cites the wrong year."""
    if not any(chain): return html_
    def find(s1, year):
        for idx in chain:
            c = idx.get((s1.lower(), year))
            if c: return c
        for idx in chain:
            c = [v for (n, y), vs in idx.items() if n == s1.lower() for v in vs]
            if len(c) == 1: return c
        for idx in chain:
            c = idx.get(("~" + s1.lower(), year))
            if c: return c
        return None
    def pick(m):
        s1, etal, s2, year = m.group(1), m.group(2), m.group(3), m.group(4)
        cands = find(s1, year)
        if not cands: return m.group(0)
        if etal and "et al" in etal: best = [c for c in cands if c[1] >= 3] or cands
        elif s2: best = [c for c in cands if c[2] == s2.lower()] or cands
        else: best = [c for c in cands if c[1] == 1] or cands
        label, tail = m.group(0), ""
        if label.endswith(")") and "(" not in label:      # the bracket belongs to the sentence, not the citation
            label, tail = label[:-1], ")"
        return f'<button type="button" class="tb-cite" data-ref="{best[0][0]}" aria-expanded="false">{label}</button>{tail}'
    out = []
    for seg in text_segments(html_):
        if seg.startswith("<"): out.append(seg); continue
        out.append(CITE.sub(pick, seg))
    return "".join(out)

RENDERED = {}     # mod -> (before the references, the references, after them, the index)
def render_module(mod):
    ctx = Ctx(mod)
    root = MODS[mod]
    body = render(ctx, root.find("c:content", NS), 1)
    m = re.search(r'<details class="tb-refs".*?</details>', body, re.S)
    if m:
        refs, idx = ref_index(m.group(0), mod)
        RENDERED[mod] = (body[:m.start()], linkify(refs), body[m.end():], idx, ctx)
    else:
        RENDERED[mod] = (body, "", "", {}, ctx)

def merged(idxs):
    out = {}
    for idx in idxs:
        for k, v in idx.items(): out.setdefault(k, []).extend(v)
    return out

for _m in MODS: render_module(_m)
BOOK_IDX = merged(r[3] for r in RENDERED.values())
CHAPTER_IDX = {}
for _num, _title, _mods in chapters:
    ci = merged(RENDERED[m][3] for m in _mods)
    for m in _mods: CHAPTER_IDX[m] = ci

def module_html(mod):
    before, refs, after, idx, ctx = RENDERED[mod]
    chain = [idx, CHAPTER_IDX.get(mod, {}), BOOK_IDX]
    body = cite_wrap(before, chain) + refs + cite_wrap(after, chain)
    if ctx.practice:
        body += (f'<p class="tb-practice"><span class="ck">Practice</span> The multiple-choice and fill-in-the-blank questions for this section are '
                 f'interactive and live on OpenStax, so they are not carried here: <a href="{OS_BOOK}" target="_blank" rel="noopener">open the book on openstax.org</a>.</p>')
    return body

# ── the pages ──────────────────────────────────────────────────────────────
def nav(rel):
    return f'''<header class="masthead site-wrap">
  <a class="brand" href="{rel}index.html"><img class="mark" src="{rel}assets/logo.svg" alt="" width="72" height="72" decoding="async">VisualNeuroscience.AI</a>
  <nav class="nav-row" aria-label="Site">
    <a href="{rel}regions.html">Region Atlas</a>
    <a href="{rel}tracts.html">Tractography</a>
    <a href="{rel}network-atlas.html">Network Atlas</a>
    <a href="{rel}microanatomy.html">Microanatomy</a>
    <a href="{rel}studies.html">Visualizing Studies</a>
    <a href="{rel}practice.html">Practice</a>
    <a href="{rel}textbook.html" aria-current="page">Digital Textbook</a>
    <a href="{rel}about.html">About</a>
    <span class="nav-tools"><button class="theme-toggle" id="themeBtn" type="button" aria-pressed="false"><span class="th-dot"></span><span id="themeLbl">Dark</span></button></span>
  </nav>
</header>'''

ATTRIB = (f'<p class="tb-attrib">Adapted from <a href="{OS_BOOK}" target="_blank" rel="noopener">{BOOK}</a> by OpenStax, '
          f'licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>. '
          f'Access for free at <a href="{OS_URL}" target="_blank" rel="noopener">openstax.org</a>. '
          f'Changes: set in this site’s own pages and type, the images recompressed, the videos embedded in folds, the interactive exercises linked rather than carried. '
          f'This adaptation is offered under the same licence.</p>')

def page(title, desc, body, rel, extra_head=""):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{esc(title)} — Digital Textbook — VisualNeuroscience.AI</title>
<meta name="description" content="{esc(desc)}">
<link rel="icon" href="{rel}assets/logo.svg" type="image/svg+xml">
<link rel="alternate icon" href="{rel}assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="{rel}assets/apple-touch-icon.png">
<link rel="manifest" href="{rel}manifest.webmanifest">
<meta name="theme-color" content="#111111">
<link rel="stylesheet" href="{rel}assets/viewer.css">
<link rel="stylesheet" href="{rel}fonts/fonts.css">
<link rel="stylesheet" href="{rel}assets/textbook.css">
<meta name="color-scheme" content="dark light">
<script>(function(){{var t="dark";try{{if(localStorage.getItem("mn-theme")==="light")t="light";}}catch(e){{}}
if(t==="dark")document.documentElement.setAttribute("data-theme","dark");}})();</script>
{extra_head}
</head>
<body>
{nav(rel)}
<main class="site-wrap tb">
{body}
{ATTRIB}
</main>
<script>
const themeBtn = document.getElementById("themeBtn");
const themeLbl = document.getElementById("themeLbl");
if (document.documentElement.getAttribute("data-theme") === "dark"){{ themeLbl.textContent = "Light"; themeBtn.setAttribute("aria-pressed", "true"); }}
themeBtn.addEventListener("click", () => {{
  const root = document.documentElement;
  const dark = root.getAttribute("data-theme") === "dark";
  if (dark){{ root.removeAttribute("data-theme"); themeLbl.textContent = "Dark"; }}
  else {{ root.setAttribute("data-theme", "dark"); themeLbl.textContent = "Light"; }}
  themeBtn.setAttribute("aria-pressed", String(!dark));
  try{{ localStorage.setItem("mn-theme", dark ? "light" : "dark"); }}catch(e){{}}
}});
</script>
<script src="{rel}assets/native.js"></script>
<script src="{rel}assets/navbar.js"></script>
<script src="{rel}assets/newsletter.js" defer></script>
<script src="{rel}assets/textbook.js"></script>
<script src="{rel}assets/firebase-config.js"></script>
<script type="module" src="{rel}assets/auth-ui.js"></script>
</body>
</html>
'''

def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s)

def first_para(mod, n=220):
    root = MODS[mod]
    for p in root.iter(C + "para"):
        t = " ".join("".join(p.itertext()).split())
        if len(t) > 80 and not t.startswith("By the end of this section"):
            return (t[:n].rsplit(" ", 1)[0] + "…") if len(t) > n else t
    return ""

manifest = []
folds = []

def section_fold(m, is_intro):
    _, _, label = PAGE[m]
    mt = mod_title(m)
    return (f'<details class="tb-sec{" tb-intro" if is_intro else ""}" id="{m}"{" open" if is_intro else ""}>'
            f'<summary><span class="tb-num">{"" if is_intro else esc(label)}</span><span class="tb-sec-title">{esc("Introduction" if is_intro else mt)}</span></summary>'
            f'<div class="tb-body">{module_html(m)}</div></details>')

for num, title, mods in chapters:
    secs = [dict(id=m, label=PAGE[m][2], title=mod_title(m)) for m in mods]
    blurb = first_para(mods[1] if len(mods) > 1 else mods[0])
    inner_ = "".join(section_fold(m, PAGE[m][2] == "Introduction") for m in mods)
    folds.append(f'<details class="tb-ch" id="ch{num}"><summary><span class="tb-chn">{num}</span><span class="tb-cht">{esc(title)}</span>'
                 f'<span class="tb-chc">{len(mods) - 1} sections</span></summary>'
                 f'<div class="tb-ch-body"><p class="tb-blurb">{esc(blurb)}</p>{inner_}</div></details>')
    manifest.append(dict(num=num, title=title, sections=secs))

def loose_fold(m):
    mt = mod_title(m)
    return (f'<details class="tb-ch tb-loose" id="{m}"><summary><span class="tb-chn"></span><span class="tb-cht">{esc(mt)}</span><span class="tb-chc"></span></summary>'
            f'<div class="tb-ch-body"><div class="tb-body">{module_html(m)}</div></div></details>')
pre = [m for m in loose if (MODS[m].get("class") or "") == "preface"]
post = [m for m in loose if m not in pre]

# the home-page card, from the cover
cover = os.path.join(SRC, "cover", "introduction-behavioral-neuroscience-cover.jpg")
if os.path.exists(cover):
    card = Image.new("RGB", (1100, 508), (17, 17, 17))
    cv = Image.open(cover).convert("RGB")
    ch = 468; cw = round(cv.width * ch / cv.height)
    cv = cv.resize((cw, ch), Image.LANCZOS)
    card.paste(cv, ((1100 - cw) // 2, 20))
    card.save(os.path.join(SITE, "assets", "home", "textbook.jpg"), "JPEG", quality=84, optimize=True)

# the page
contents = [f'<div class="title-strip"><h1 class="name">{BOOK}</h1><span class="anno">an OpenStax textbook, {len(chapters)} chapters</span></div>',
            f'<p class="lede">The whole of OpenStax\u2019s <em>{BOOK}</em> on this one page: {len(chapters)} chapters, {sum(len(c["sections"]) - 1 for c in manifest)} sections, {len(SIZES)} figures, from the cells of the nervous system to attention and executive function. '
            f'Every chapter folds open to its sections and every section to its text, so read one section or the whole book without leaving the page. The book is free and openly licensed, and so is this copy.</p>',
            '<div class="tb-tools"><span class="tb-spacer"></span><button type="button" class="tb-btn" data-expand="all">Expand all</button><button type="button" class="tb-btn" data-expand="none">Collapse all</button></div>',
            '<div class="tb-toc">' + "".join(loose_fold(m) for m in pre) + "".join(folds) + "".join(loose_fold(m) for m in post) + "</div>"]
with open(os.path.join(SITE, "textbook.html"), "w", encoding="utf-8") as fh:
    fh.write(page(BOOK, f"OpenStax's {BOOK}, all {len(chapters)} chapters on one page, every chapter and section expandable.", "\n".join(contents), ""))
with open(os.path.join(SITE, "assets", "textbook", "contents.json"), "w", encoding="utf-8") as fh:
    json.dump(dict(book=BOOK, chapters=manifest), fh, ensure_ascii=False, indent=1)

total = sum(os.path.getsize(os.path.join(IMG_DIR, f)) for f in os.listdir(IMG_DIR))
print(f"wrote textbook.html ({os.path.getsize(os.path.join(SITE, 'textbook.html')) // 1024} KB) with {len(chapters)} chapters, {len(SIZES)} images ({total // 1048576} MB as WebP)")
