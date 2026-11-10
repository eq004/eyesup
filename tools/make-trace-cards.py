#!/usr/bin/env python3
"""Builds the Letter Formation cards (public/trace/{lower,upper}/{arrows,dots}/<letter>.png) from the
NSW Foundation Style tracing alphabet in tools/nsw-alphabet (104 transparent PNGs, 1600 x 1600, one
shared scale and baseline; see READ_ME.txt there). Each card is a white square with three writing lines
(top line, dotted middle line, baseline) and the letter placed so that capitals and ascenders touch the
top line, small letters sit between the middle line and the baseline, and tails drop into the space
below. "arrows" cards use the pack's instruction images (numbered starts and direction arrows); the
cue sentence printed at the foot of those images is left off, because it is unreadable at card size.
Run: python3 tools/make-trace-cards.py   (needs Pillow)
"""
import os, sys, glob
if os.environ.get("PIL_DIR"): sys.path.append(os.environ["PIL_DIR"])  # for `python3 -I` runs, where user site-packages are off
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "nsw-alphabet")
OUT = os.path.join(HERE, "..", "public", "trace")
SIZE = 1000  # card pixels

# Where the letters sit in every source image (measured across the pack).
SRC_TOP, SRC_MID, SRC_BASE = 173, 484, 827
# Where the writing lines sit on the card, as a fraction of its height. Tails reach ~0.99.
TOP, BASE = 0.08, 0.68
SCALE = (BASE - TOP) * SIZE / (SRC_BASE - SRC_TOP)
MID = TOP + (SRC_MID - SRC_TOP) * SCALE / SIZE
LINE_TOP, LINE_MID, LINE_BASE = (0xAA, 0xB7, 0xCC), (0xC9, 0xD3, 0xE3), (0xAA, 0xB7, 0xCC)

def card(src_path, out_path):
    src = Image.open(src_path).convert("RGBA")
    # Drop the cue sentence (everything below the descender space) before scaling.
    src = src.crop((0, 0, 1600, 1200))
    w, h = int(round(1600 * SCALE)), int(round(1200 * SCALE))
    letter = src.resize((w, h), Image.LANCZOS)
    im = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255))
    d = ImageDraw.Draw(im)
    lw = max(2, SIZE // 500)
    x0, x1 = int(SIZE * 0.06), int(SIZE * 0.94)
    d.line([(x0, TOP * SIZE), (x1, TOP * SIZE)], fill=LINE_TOP, width=lw)
    d.line([(x0, BASE * SIZE), (x1, BASE * SIZE)], fill=LINE_BASE, width=lw + 1)
    dash, gap, x = SIZE // 45, SIZE // 55, x0
    while x < x1:
        d.line([(x, MID * SIZE), (min(x + dash, x1), MID * SIZE)], fill=LINE_MID, width=lw)
        x += dash + gap
    # Letters are centred in the source at x = 800: put that at the card's centre, top line to top line.
    ox = int(round(SIZE / 2 - 800 * SCALE))
    oy = int(round(TOP * SIZE - SRC_TOP * SCALE))
    im.alpha_composite(letter, (ox, oy))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    im.convert("RGB").save(out_path, "PNG", optimize=True)

n = 0
for case, folder in (("lower", "lowercase"), ("upper", "uppercase")):
    for guide, sub in (("arrows", "instructions"), ("dots", "dots_only")):
        for src in sorted(glob.glob(os.path.join(SRC, folder, sub, "*.png"))):
            letter = os.path.basename(src)[0]
            card(src, os.path.join(OUT, case, guide, f"{letter}.png"))
            n += 1
print(f"{n} cards → {os.path.relpath(OUT)}  (lines at {TOP:.2f} / {MID:.3f} / {BASE:.2f} of the card)")
