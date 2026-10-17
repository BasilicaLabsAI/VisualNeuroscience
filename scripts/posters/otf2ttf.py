"""Flux to TrueType outlines, for the posters' PDF only: Chromium writes fonts
with PostScript (CFF) outlines into a PDF as Type 3, which some print-shop
checks flag. Same glyphs, quadratic curves within a tenth of a unit."""
from fontTools.ttLib import TTFont, newTable
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
import sys

def otf_to_ttf(src, dst, max_err=0.1):
    f = TTFont(src)
    gs = f.getGlyphSet()
    glyf = newTable("glyf"); glyf.glyphOrder = f.getGlyphOrder(); glyf.glyphs = {}
    for name in f.getGlyphOrder():
        pen = TTGlyphPen(gs)
        gs[name].draw(Cu2QuPen(pen, max_err, reverse_direction=True))
        glyf[name] = pen.glyph()
    f["glyf"] = glyf
    f["loca"] = newTable("loca")
    f["maxp"] = newTable("maxp"); maxp = f["maxp"]
    maxp.tableVersion = 0x00010000
    for attr in ("maxZones", "maxTwilightPoints", "maxStorage", "maxFunctionDefs", "maxInstructionDefs",
                 "maxStackElements", "maxSizeOfInstructions", "maxComponentElements"):
        setattr(maxp, attr, 0)
    maxp.maxZones = 1
    maxp.maxComponentDepth = 0
    f["head"].indexToLocFormat = 0
    f["head"].glyphDataFormat = 0
    post = f["post"]; post.formatType = 2.0; post.extraNames = []; post.mapping = {}
    post.glyphOrder = f.getGlyphOrder()
    del f["CFF "]
    if "VORG" in f: del f["VORG"]
    f.sfntVersion = "\x00\x01\x00\x00"
    f.flavor = None
    f.save(dst)

if __name__ == "__main__":
    otf_to_ttf(sys.argv[1], sys.argv[2])
