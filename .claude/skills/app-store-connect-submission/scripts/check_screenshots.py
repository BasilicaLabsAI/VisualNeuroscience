#!/usr/bin/env python3
"""Which App Store screenshot slot each image fits, before any upload.

    python3 check_screenshots.py <folder or image> [...]
    python3 check_screenshots.py --sizes

Reads the pixel size of every PNG and JPEG given (folders are read
recursively), says which display's slot takes that size, and flags what
App Store Connect will refuse or may refuse: a size no slot in the table
takes ("File dimensions are invalid"), a PNG with transparency, more than
ten images for one slot. --sizes prints the table.

The table is Apple's screenshot specifications as known in October 2026.
Apple adds displays with new devices and changes which slots are required;
the version page's own slot list wins over this table. A size the table
does not know may belong to a display added since: check it on the page
with one image before making the rest.
"""
import os
import struct
import sys

# (slot, sizes taken either way up, sizes taken only as written). The older
# displays' sizes without the status bar exist one way up only.
SLOTS = [
    ('iPhone 6.9-inch', [(1320, 2868), (1290, 2796), (1260, 2736)], []),
    ('iPhone 6.5-inch', [(1284, 2778), (1242, 2688)], []),
    ('iPhone 6.3-inch', [(1206, 2622), (1179, 2556)], []),
    ('iPhone 6.1-inch', [(1170, 2532), (1125, 2436), (1080, 2340)], []),
    ('iPhone 5.5-inch', [(1242, 2208)], []),
    ('iPhone 4.7-inch', [(750, 1334)], []),
    ('iPhone 4-inch', [(640, 1136)], [(640, 1096), (1136, 600)]),
    ('iPhone 3.5-inch', [(640, 960)], [(640, 920), (960, 600)]),
    ('iPad 13-inch', [(2064, 2752), (2048, 2732)], []),
    ('iPad 12.9-inch (2nd generation)', [(2048, 2732)], []),
    ('iPad 11-inch', [(1668, 2420), (1668, 2388), (1640, 2360), (1488, 2266)], []),
    ('iPad 10.5-inch', [(1668, 2224)], []),
    ('iPad 9.7-inch', [(1536, 2048), (768, 1024)], [(1536, 2008), (768, 1004), (2048, 1496), (1024, 748)]),
    ('Mac', [], [(2880, 1800), (2560, 1600), (1440, 900), (1280, 800)]),
    ('Apple TV', [], [(3840, 2160), (1920, 1080)]),
    ('Apple Vision Pro', [], [(3840, 2160)]),
    ('Apple Watch Ultra 3', [], [(422, 514)]),
    ('Apple Watch Ultra and Ultra 2', [], [(410, 502)]),
    ('Apple Watch Series 10 and 11', [], [(416, 496)]),
    ('Apple Watch Series 7 to 9', [], [(396, 484)]),
    ('Apple Watch Series 4 to 6 and SE', [], [(368, 448)]),
    ('Apple Watch Series 3', [], [(312, 390)]),
]
IMAGES = ('.png', '.jpg', '.jpeg')


def table():
    sizes = {}
    for slot, both, only in SLOTS:
        for w, h in both:
            sizes.setdefault((w, h), []).append(slot)
            sizes.setdefault((h, w), []).append(slot)
        for w, h in only:
            sizes.setdefault((w, h), []).append(slot)
    return sizes


def png_info(f):
    head = f.read(33)
    if head[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    w, h = struct.unpack('>II', head[16:24])
    colour = head[25]
    alpha = colour in (4, 6)
    # a tRNS chunk gives transparency to a palette or a plain RGB image
    f.seek(8)
    while True:
        chunk = f.read(8)
        if len(chunk) < 8:
            break
        length, kind = struct.unpack('>I4s', chunk)
        if kind == b'tRNS':
            alpha = True
        if kind in (b'IDAT', b'IEND'):
            break
        f.seek(length + 4, 1)
    return w, h, alpha


def jpeg_info(f):
    if f.read(2) != b'\xff\xd8':
        return None
    while True:
        b = f.read(1)
        while b and b != b'\xff':
            b = f.read(1)
        while b == b'\xff':
            b = f.read(1)
        if not b:
            return None
        marker = b[0]
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            continue
        size = struct.unpack('>H', f.read(2))[0]
        if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
            h, w = struct.unpack('>xHH', f.read(5))
            return w, h, False
        f.seek(size - 2, 1)


def info(path):
    with open(path, 'rb') as f:
        if path.lower().endswith('.png'):
            return png_info(f)
        return jpeg_info(f)


def files(args):
    for a in args:
        if os.path.isdir(a):
            for root, _, names in os.walk(a):
                for n in sorted(names):
                    if n.lower().endswith(IMAGES):
                        yield os.path.join(root, n)
        elif a.lower().endswith(IMAGES):
            yield a


def main(argv):
    args = [a for a in argv[1:] if not a.startswith('--')]
    if '--sizes' in argv:
        for slot, both, only in SLOTS:
            sizes = [f'{w}×{h} either way up' for w, h in both] + [f'{w}×{h}' for w, h in only]
            print(f"{slot:<34}{', '.join(sizes)}")
        return 0
    if not args:
        print(__doc__.strip().splitlines()[2].strip())
        return 2
    sizes = table()
    paths = sorted(set(files(args)))
    if not paths:
        print('No PNG or JPEG images found.')
        return 1
    by_slot, unknown, alpha, unread = {}, [], [], []
    width = max(len(os.path.relpath(p)) for p in paths) + 2
    for p in paths:
        try:
            got = info(p)
        except (OSError, struct.error):
            got = None
        name = os.path.relpath(p)
        if not got:
            unread.append(name)
            continue
        w, h, transparent = got
        slots = sizes.get((w, h), [])
        way = 'landscape' if w > h else 'portrait'
        print(f"{name:<{width}}{w}×{h} {way:<10} {' or '.join(slots) or 'no slot in the table'}")
        for s in slots:
            by_slot.setdefault(s, []).append(name)
        if not slots:
            unknown.append(f'{name} ({w}×{h})')
        if transparent:
            alpha.append(name)

    print('\nBy slot:')
    for slot, names in by_slot.items():
        over = '  (only ten go in one slot)' if len(names) > 10 else ''
        print(f'- {slot}: {len(names)}{over}')
    problems = 0
    if unknown:
        problems += len(unknown)
        print('\nA size no slot in the table takes (check it on the page with one image; '
              'a display added since the table is not in it):')
        for u in unknown:
            print(f'- {u}')
    if alpha:
        problems += len(alpha)
        print('\nTransparency (App Store Connect can refuse it; flatten onto the background, '
              'e.g. sips -s format jpeg or magick in.png -alpha off out.png):')
        for a in alpha:
            print(f'- {a}')
    if unread:
        problems += len(unread)
        print('\nNot readable as a PNG or JPEG:')
        for u in unread:
            print(f'- {u}')
    print(f'\n{len(paths)} image(s), {problems} to look at.')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
