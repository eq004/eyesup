#!/usr/bin/env node
// Generates the Letter Formation cards (public/trace/{lower,upper}/{arrows,dots}/<letter>.svg)
// from NSW Foundation Style stroke definitions: unjoined letters with a slight forward slope,
// short letters between the dotted middle line and the baseline, tall letters to the top line,
// tails to the descender space; each stroke starts where the style says, in the order it says.
// Run: node tools/make-trace-cards.js
const fs = require("fs");
const path = require("path");

// Grid: top line y=2, dotted middle y=50, baseline y=100, descender space to y=148. Card viewBox is square.
const TOP = 2, MID = 50, BASE = 100, DESC = 148;
const SLOPE_DEG = 6; // NSW Foundation Style: a slight forward slope

// Stroke pieces. Angles are degrees clockwise from 3 o'clock on screen (0 right, 90 down, 180 left, 270 up);
// an arc from a0 to a1 travels in the direction of the sign of (a1 - a0): decreasing = anticlockwise on screen.
const L = (x1, y1, x2, y2) => ({ k: "L", x1, y1, x2, y2 });
const A = (cx, cy, rx, ry, a0, a1) => ({ k: "A", cx, cy, rx, ry, a0, a1 });
const DOT = (x, y) => ({ k: "DOT", x, y });

// Round lowercase letters share one bowl: centre (26,75), radius 24 — it touches the middle line and the baseline.
const LOWER = {
  a: [[A(26, 75, 24, 24, 330, 0), L(50, 75, 50, 51), L(50, 51, 50, 100)]],
  b: [[L(8, 2, 8, 100), L(8, 100, 8, 51), A(32, 75, 24, 24, 270, 540)]],
  c: [[A(26, 75, 24, 24, 330, 30)]],
  d: [[A(26, 75, 24, 24, 330, 0), L(50, 75, 50, 2), L(50, 2, 50, 100)]],
  e: [[L(3, 75, 49, 75), A(26, 75, 24, 24, 0, -330)]],
  f: [[A(28, 16, 14, 14, 350, 180), L(14, 16, 14, 100)], [L(2, 50, 30, 50)]],
  g: [[A(26, 75, 24, 24, 330, 0), L(50, 75, 50, 51), L(50, 51, 50, 130), A(32, 130, 18, 18, 0, 150)]],
  h: [[L(8, 2, 8, 100), L(8, 100, 8, 62), A(32, 74, 24, 24, 180, 360), L(56, 74, 56, 100)]],
  i: [[L(26, 51, 26, 100)], [DOT(26, 30)]],
  j: [[L(30, 51, 30, 130), A(14, 130, 16, 16, 0, 150)], [DOT(30, 30)]],
  k: [[L(8, 2, 8, 100)], [L(42, 52, 10, 80), L(10, 80, 44, 100)]],
  l: [[L(26, 2, 26, 100)]],
  m: [[L(6, 51, 6, 100), L(6, 100, 6, 66), A(23, 68, 17, 17, 180, 360), L(40, 68, 40, 100), L(40, 100, 40, 66), A(57, 68, 17, 17, 180, 360), L(74, 68, 74, 100)]],
  n: [[L(8, 51, 8, 100), L(8, 100, 8, 66), A(32, 74, 24, 24, 180, 360), L(56, 74, 56, 100)]],
  o: [[A(26, 75, 24, 24, 330, -30)]],
  p: [[L(8, 51, 8, 148), L(8, 148, 8, 51), A(32, 75, 24, 24, 180, 540)]],
  q: [[A(26, 75, 24, 24, 330, 0), L(50, 75, 50, 51), L(50, 51, 50, 148), L(50, 148, 59, 141)]],
  r: [[L(8, 51, 8, 100), L(8, 100, 8, 64), A(28, 74, 20, 20, 180, 290)]],
  s: [[A(27, 61, 11, 11, 330, 135), L(19.2, 68.8, 33.5, 79.5), A(25, 88, 12, 12, 315, 510)]],
  t: [[L(24, 20, 24, 100)], [L(10, 50, 38, 50)]],
  u: [[L(8, 51, 8, 78), A(32, 78, 24, 24, 180, 0), L(56, 78, 56, 51), L(56, 51, 56, 100)]],
  v: [[L(4, 51, 28, 100), L(28, 100, 52, 51)]],
  w: [[L(2, 51, 20, 100), L(20, 100, 38, 51), L(38, 51, 56, 100), L(56, 100, 74, 51)]],
  x: [[L(6, 51, 50, 100)], [L(50, 51, 6, 100)]],
  y: [[L(8, 51, 8, 78), A(32, 78, 24, 24, 180, 0), L(56, 78, 56, 51), L(56, 51, 56, 130), A(38, 130, 18, 18, 0, 150)]],
  z: [[L(4, 51, 50, 51), L(50, 51, 4, 100), L(4, 100, 50, 100)]],
};
const UPPER = {
  A: [[L(32, 2, 4, 100)], [L(32, 2, 60, 100)], [L(14, 66, 50, 66)]],
  B: [[L(8, 2, 8, 100)], [L(8, 2, 32, 2), A(32, 26, 24, 24, 270, 450), L(32, 50, 8, 50), L(8, 50, 32, 50), A(32, 75, 25, 25, 270, 450), L(32, 100, 8, 100)]],
  C: [[A(34, 51, 30, 49, 330, 30)]],
  D: [[L(8, 2, 8, 100)], [L(8, 2, 28, 2), A(28, 51, 32, 49, 270, 450), L(28, 100, 8, 100)]],
  E: [[L(8, 2, 8, 100)], [L(8, 2, 52, 2)], [L(8, 51, 44, 51)], [L(8, 100, 52, 100)]],
  F: [[L(8, 2, 8, 100)], [L(8, 2, 52, 2)], [L(8, 51, 42, 51)]],
  G: [[A(34, 51, 30, 49, 330, 0), L(64, 51, 40, 51)]],
  H: [[L(8, 2, 8, 100)], [L(56, 2, 56, 100)], [L(8, 51, 56, 51)]],
  I: [[L(30, 2, 30, 100)]],
  J: [[L(44, 2, 44, 80), A(28, 80, 16, 18, 0, 160)]],
  K: [[L(8, 2, 8, 100)], [L(52, 2, 10, 56), L(10, 56, 54, 100)]],
  L: [[L(8, 2, 8, 100), L(8, 100, 52, 100)]],
  M: [[L(6, 2, 6, 100)], [L(6, 2, 34, 100), L(34, 100, 62, 2), L(62, 2, 62, 100)]],
  N: [[L(8, 2, 8, 100)], [L(8, 2, 56, 100), L(56, 100, 56, 2)]],
  O: [[A(34, 51, 30, 49, 330, -30)]],
  P: [[L(8, 2, 8, 100)], [L(8, 2, 32, 2), A(32, 28, 24, 26, 270, 450), L(32, 54, 8, 54)]],
  Q: [[A(34, 51, 30, 49, 330, -30)], [L(42, 74, 64, 100)]],
  R: [[L(8, 2, 8, 100)], [L(8, 2, 32, 2), A(32, 28, 24, 26, 270, 450), L(32, 54, 8, 54), L(14, 54, 58, 100)]],
  S: [[A(32, 26, 22, 24, 340, 140), L(15.1, 41.4, 47, 55.6), A(30, 74, 24, 26, 315, 510)]],
  T: [[L(32, 2, 32, 100)], [L(6, 2, 58, 2)]],
  U: [[L(8, 2, 8, 70), A(32, 70, 24, 30, 180, 0), L(56, 70, 56, 2)]],
  V: [[L(4, 2, 32, 100), L(32, 100, 60, 2)]],
  W: [[L(2, 2, 20, 100), L(20, 100, 38, 2), L(38, 2, 56, 100), L(56, 100, 74, 2)]],
  X: [[L(6, 2, 58, 100)], [L(58, 2, 6, 100)]],
  Y: [[L(6, 2, 32, 52), L(32, 52, 58, 2)], [L(32, 52, 32, 100)]],
  Z: [[L(6, 2, 58, 2), L(58, 2, 6, 100), L(6, 100, 58, 100)]],
};

const rad = (d) => (d * Math.PI) / 180;
// Sample a piece into points spaced about `step` apart.
function sample(p, step) {
  if (p.k === "DOT") return [{ x: p.x, y: p.y, dot: true }];
  if (p.k === "L") {
    const len = Math.hypot(p.x2 - p.x1, p.y2 - p.y1), n = Math.max(1, Math.round(len / step));
    return Array.from({ length: n + 1 }, (_, i) => ({ x: p.x1 + ((p.x2 - p.x1) * i) / n, y: p.y1 + ((p.y2 - p.y1) * i) / n }));
  }
  const sweep = p.a1 - p.a0, r = (p.rx + p.ry) / 2, len = Math.abs(rad(sweep)) * r, n = Math.max(2, Math.round(len / step));
  return Array.from({ length: n + 1 }, (_, i) => { const a = rad(p.a0 + (sweep * i) / n); return { x: p.cx + p.rx * Math.cos(a), y: p.cy + p.ry * Math.sin(a) }; });
}
function strokePoints(stroke, step) {
  const pts = [];
  for (const piece of stroke) for (const q of sample(piece, step)) { const last = pts[pts.length - 1]; if (!last || Math.hypot(q.x - last.x, q.y - last.y) > 0.3 || q.dot) pts.push(q); }
  return pts;
}
// Dots along every stroke; a dot that lands on an earlier dot (a retrace, a join) is not drawn twice.
function dotsFor(strokes, step) {
  const dots = [];
  for (const s of strokes) for (const q of strokePoints(s, step)) if (!dots.some((d) => Math.hypot(d.x - q.x, d.y - q.y) < step * 0.55)) dots.push(q);
  return dots;
}
const f1 = (n) => (Math.round(n * 10) / 10).toString();
function card(letter, strokes, withGuide) {
  const step = 7.2, R = 3.1;
  const skew = Math.tan(rad(SLOPE_DEG)) * BASE; // keep the baseline where it is while the letter leans forward
  const dots = dotsFor(strokes, step).map((d) => `<circle cx="${f1(d.x)}" cy="${f1(d.y)}" r="${d.dot ? R * 1.35 : R}" fill="#9CAAB8"/>`).join("");
  const lines = `<g stroke-linecap="round"><line x1="-28" y1="${TOP}" x2="128" y2="${TOP}" stroke="#AAB7CC" stroke-width="1.1"/><line x1="-28" y1="${MID}" x2="128" y2="${MID}" stroke="#C9D3E3" stroke-width="1.1" stroke-dasharray="3 4"/><line x1="-28" y1="${BASE}" x2="128" y2="${BASE}" stroke="#AAB7CC" stroke-width="1.3"/></g>`;
  let guide = "";
  if (withGuide) {
    const parts = [];
    strokes.forEach((s, i) => {
      const pts = strokePoints(s, 2);
      const p0 = pts[0];
      if (pts.length > 4) {
        // direction of travel from the start, an arrow a little way along, the number just behind the start
        const p1 = pts[Math.min(pts.length - 1, 5)], dx = p1.x - p0.x, dy = p1.y - p0.y, m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m;
        const ax = p0.x + ux * 9, ay = p0.y + uy * 9, bx = p0.x + ux * 24, by = p0.y + uy * 24;
        const hx = bx + ux * 4.5, hy = by + uy * 4.5, wx = -uy * 3.2, wy = ux * 3.2;
        parts.push(`<line x1="${f1(ax)}" y1="${f1(ay)}" x2="${f1(bx)}" y2="${f1(by)}" stroke="#087E95" stroke-width="1.6" stroke-linecap="round"/><path d="M${f1(hx)} ${f1(hy)} L${f1(bx + wx)} ${f1(by + wy)} L${f1(bx - wx)} ${f1(by - wy)} Z" fill="#087E95"/>`);
        const nx = p0.x - ux * 13, ny = p0.y - uy * 13;
        parts.push(`<circle cx="${f1(nx)}" cy="${f1(ny)}" r="6.2" fill="#fff" stroke="#087E95" stroke-width="1.2"/><text x="${f1(nx)}" y="${f1(ny + 2.9)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8.4" font-weight="700" fill="#087E95">${i + 1}</text>`);
        parts.push(`<circle cx="${f1(p0.x)}" cy="${f1(p0.y)}" r="4" fill="#087E95" stroke="#fff" stroke-width="1"/>`);
      } else {
        // a dot (the i and j): just its number beside it
        parts.push(`<circle cx="${f1(p0.x + 13)}" cy="${f1(p0.y)}" r="6.2" fill="#fff" stroke="#087E95" stroke-width="1.2"/><text x="${f1(p0.x + 13)}" y="${f1(p0.y + 2.9)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8.4" font-weight="700" fill="#087E95">${i + 1}</text>`);
      }
    });
    guide = parts.join("");
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -10 160 160" width="1600" height="1600" role="img" aria-label="${letter} NSW Foundation Style tracing card">
<rect x="-30" y="-10" width="160" height="160" fill="#fff"/>
${lines}
<g transform="translate(${f1(skew)} 0) skewX(-${SLOPE_DEG})">${dots}${guide}</g>
</svg>
`;
}
const root = path.join(__dirname, "..", "public", "trace");
let n = 0;
for (const [kase, set] of [["lower", LOWER], ["upper", UPPER]]) {
  for (const [letter, strokes] of Object.entries(set)) {
    for (const kind of ["arrows", "dots"]) {
      const dir = path.join(root, kase, kind);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${letter}.svg`), card(letter, strokes, kind === "arrows"));
      n++;
    }
  }
}
console.log(`wrote ${n} cards to ${root}`);
