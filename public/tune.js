/* Eyes Up — "Make a Tune": standard notation on a treble stave, shared by
   the student device, the projector and the teacher's screens.

   A tune is { sig: "4/4"|"3/4"|"2/4", bars: 1|2|4, events: [...] } where each
   event is { s, d, p, a }:
     s  start slot (quavers from the beginning)      d  length in quavers (1 quaver … 8 semibreve)
     p  pitch step from middle C (0 = C4 … 12 = A5), or null for a rest
     a  accidental: -1 flat, 0 none, 1 sharp
   Older tunes were a plain array of crotchets; normalize() upgrades them. */

(function () {
  const STEP_NAMES = ["C", "D", "E", "F", "G", "A", "B"];
  const SEMIS = [0, 2, 4, 5, 7, 9, 11];
  const TOP_STEP = 12; // A5
  const BPM = 96;
  const QUAVER = 60 / BPM / 2;

  // Note values, in quavers. Dots and flags come from the value, not stored separately.
  const VALUES = [
    { key: "semibreve", d: 8, label: "semibreve", hollow: true, stem: false },
    { key: "dminim", d: 6, label: "dotted minim", hollow: true, stem: true, dot: true },
    { key: "minim", d: 4, label: "minim", hollow: true, stem: true },
    { key: "dcrotchet", d: 3, label: "dotted crotchet", hollow: false, stem: true, dot: true },
    { key: "crotchet", d: 2, label: "crotchet", hollow: false, stem: true },
    { key: "quaver", d: 1, label: "quaver", hollow: false, stem: true, flag: true },
  ];
  const valueFor = (d) => VALUES.find((v) => v.d === d) || VALUES[4];
  const LEVELS = {
    simple: { values: [4, 2], rests: [4, 2], accidentals: false },            // minim + crotchet
    standard: { values: [8, 4, 2, 1], rests: [8, 4, 2, 1], accidentals: false },
    full: { values: [8, 6, 4, 3, 2, 1], rests: [8, 4, 2, 1], accidentals: true },
  };
  const beatsPerBar = (sig) => parseInt(String(sig || "4/4").split("/")[0], 10) || 4;
  const slotsPerBar = (sig) => beatsPerBar(sig) * 2;
  const totalSlots = (t) => slotsPerBar(t.sig) * (t.bars || 2);

  function normalize(payload) {
    if (!payload) return { sig: "4/4", bars: 2, events: [] };
    if (Array.isArray(payload.notes)) {
      // old format: one crotchet per beat
      const notes = payload.notes;
      return { sig: "4/4", bars: Math.max(1, Math.ceil(notes.length / 4)), events: notes.map((n, i) => (n == null ? null : { s: i * 2, d: 2, p: n, a: 0 })).filter(Boolean) };
    }
    return { sig: payload.sig || "4/4", bars: payload.bars || 2, events: (payload.events || []).slice().sort((x, y) => x.s - y.s) };
  }

  const pitchName = (p, a) => `${STEP_NAMES[p % 7]}${a === 1 ? "♯" : a === -1 ? "♭" : ""}${p >= 7 ? "′" : ""}`;
  const letters = (tune) => normalize(tune).events.map((e) => (e.p == null ? "–" : pitchName(e.p, e.a))).join(" ");
  const freqOf = (p, a) => 261.63 * Math.pow(2, (SEMIS[p % 7] + 12 * Math.floor(p / 7) + (a || 0)) / 12);

  /* ---------- sound ---------- */
  let ctx = null;
  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }
  ["pointerdown", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, () => audio(), { passive: true }));

  function tone(freq, when, dur) {
    const ac = audio();
    if (!ac || !freq) return;
    const t = when ?? ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.45, t + 0.015);
    gain.gain.setValueAtTime(0.45, t + Math.max(0.02, dur * 0.55));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.97);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur);
  }
  const ping = (p, a = 0) => tone(freqOf(p, a), undefined, 0.5);

  let playing = null;
  function stop() {
    if (!playing) return;
    playing.timers.forEach(clearTimeout);
    const done = playing.onDone;
    playing = null;
    done && done();
  }
  // Plays a tune; onBeat(eventIndex) fires as each event starts (-1 at the end).
  function play(tuneLike, { onBeat, onDone } = {}) {
    stop();
    const tune = normalize(tuneLike);
    const ac = audio();
    const start = ac ? ac.currentTime + 0.05 : 0;
    const timers = [];
    tune.events.forEach((e, k) => {
      if (ac && e.p != null) tone(freqOf(e.p, e.a), start + e.s * QUAVER, e.d * QUAVER);
      timers.push(setTimeout(() => onBeat && onBeat(k), 50 + e.s * QUAVER * 1000));
    });
    const total = totalSlots(tune) * QUAVER * 1000;
    timers.push(setTimeout(() => { playing = null; onBeat && onBeat(-1); onDone && onDone(); }, 50 + total + 150));
    playing = { timers, onDone };
    return total;
  }

  /* ---------- the score ---------- */
  const SP = 8; // half a stave space: one pitch step
  const LINE = SP * 2;
  const yOf = (p, base) => base - (p - 2) * SP; // bottom line is E4 (step 2)
  const stepAt = (y, base) => Math.max(0, Math.min(TOP_STEP, Math.round((base - y) / SP + 2)));

  // A quaver flag: a filled curl off the end of the stem (mirrored for down-stems).
  function flagPath(sx, sy, up) {
    // Outer curve bows out from the stem tip, inner curve comes back closer to the stem: a filled crescent.
    const k = up ? 1 : -1;
    return `<path d="M${sx} ${sy} C ${sx + 1} ${sy + 11 * k}, ${sx + 13} ${sy + 13 * k}, ${sx + 10} ${sy + 30 * k} C ${sx + 11} ${sy + 19 * k}, ${sx + 5} ${sy + 15 * k}, ${sx} ${sy + 10 * k} Z" fill="currentColor"/>`;
  }
  function restGlyph(d, x, base) {
    const mid = base - 2 * LINE; // middle line (B4)
    if (d >= 8) return `<rect x="${x - 7}" y="${mid - LINE}" width="14" height="${SP - 1}" rx="1" fill="currentColor"/>`; // hangs below the 4th line
    if (d >= 4) return `<rect x="${x - 7}" y="${mid - SP + 1}" width="14" height="${SP - 1}" rx="1" fill="currentColor"/>`; // sits on the middle line
    if (d >= 2) return `<path d="M${x - 3} ${mid - 14} l6 7 l-5 6 l6 8 c-5 -3 -8 0 -5 6 c-4 -3 -5 -8 -1 -11 l-5 -7 z" fill="currentColor"/>`; // crotchet rest
    return `<path d="M${x + 4} ${mid - 8} l-5 16 M${x + 4} ${mid - 8} c-3 4 -7 4 -9 1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="${x - 5}" cy="${mid - 7}" r="2.4" fill="currentColor"/>`; // quaver rest
  }

  // SVG of the score. opts: {editor, active (event index), ghost:{s,d,p,a,ok}, compact}
  function scoreSvg(tuneLike, opts = {}) {
    const tune = normalize(tuneLike);
    const spb = slotsPerBar(tune.sig), slots = totalSlots(tune);
    const col = opts.compact ? 16 : 24;
    const left = 76, right = 18;
    const w = left + slots * col + right;
    const base = 96, top = base - 4 * LINE;
    const xOf = (s) => left + s * col + col / 2;
    const out = [];
    for (let k = 0; k < 5; k++) out.push(`<line x1="${left - 60}" y1="${base - k * LINE}" x2="${w - right + 4}" y2="${base - k * LINE}" stroke="currentColor" stroke-width="1.3"/>`);
    out.push(`<text x="${left - 62}" y="${base + 10}" font-size="62" font-family="'Noto Music','Bravura Text','Apple Symbols',serif" fill="currentColor">𝄞</text>`);
    const [num, den] = String(tune.sig).split("/");
    out.push(`<text x="${left - 18}" y="${base - LINE * 2 - 2}" font-size="22" font-weight="800" text-anchor="middle" fill="currentColor" font-family="serif">${num}</text><text x="${left - 18}" y="${base - 1}" font-size="22" font-weight="800" text-anchor="middle" fill="currentColor" font-family="serif">${den}</text>`);
    for (let b = 1; b < tune.bars; b++) out.push(`<line x1="${left + b * spb * col}" y1="${top}" x2="${left + b * spb * col}" y2="${base}" stroke="currentColor" stroke-width="1.3"/>`);
    out.push(`<line x1="${w - right}" y1="${top}" x2="${w - right}" y2="${base}" stroke="currentColor" stroke-width="1.3"/><line x1="${w - right + 4}" y1="${top}" x2="${w - right + 4}" y2="${base}" stroke="currentColor" stroke-width="3.5"/>`);
    if (opts.editor) {
      for (let s = 0; s < slots; s++) {
        if (s % 2 === 0 && s % spb !== 0) out.push(`<line x1="${left + s * col}" y1="${base + 6}" x2="${left + s * col}" y2="${base + 10}" stroke="currentColor" stroke-width="1" opacity="0.35"/>`);
        out.push(`<rect class="score-slot" data-slot="${s}" x="${left + s * col}" y="${top - 5 * SP}" width="${col}" height="${base - top + 10 * SP}" fill="transparent"/>`);
      }
    }
    const drawEvent = (e, i, ghost) => {
      const x = xOf(e.s);
      const active = opts.active === i;
      const colr = ghost ? (ghost.ok ? "#1d3f78" : "#c92a2a") : active ? "#1d6fd8" : "currentColor";
      let g = `<g class="score-ev ${active ? "active" : ""}" data-ev="${i}" opacity="${ghost ? 0.55 : 1}" style="color:${colr}">`;
      if (active && !ghost) g += `<rect x="${x - col / 2 - 2}" y="${top - 4 * SP}" width="${Math.max(col, e.d * col) + 2}" height="${base - top + 8 * SP}" rx="5" fill="#1d6fd8" opacity="0.1"/>`;
      if (e.p == null) { out.push(g + restGlyph(e.d, x, base) + "</g>"); return; }
      const v = valueFor(e.d);
      const y = yOf(e.p, base);
      if (e.p <= 0) g += `<line x1="${x - 12}" y1="${base + LINE}" x2="${x + 12}" y2="${base + LINE}" stroke="currentColor" stroke-width="1.4"/>`; // middle C ledger line
      if (e.p >= 12) g += `<line x1="${x - 12}" y1="${top - LINE}" x2="${x + 12}" y2="${top - LINE}" stroke="currentColor" stroke-width="1.4"/>`; // A5 ledger line
      if (e.a) g += `<text x="${x - 11}" y="${y + 5}" text-anchor="end" font-size="16" font-weight="700" fill="currentColor">${e.a === 1 ? "♯" : "♭"}</text>`;
      const up = e.p < 6; // below the middle line → stem up
      if (v.stem) {
        const sx = up ? x + 7.5 : x - 7.5, sy1 = up ? y - 2 : y + 2, sy2 = up ? y - 50 : y + 50;
        g += `<line x1="${sx}" y1="${sy1}" x2="${sx}" y2="${sy2}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
        if (v.flag) g += flagPath(sx, sy2, up);
      }
      g += `<ellipse cx="${x}" cy="${y}" rx="8.2" ry="5.6" fill="${v.hollow ? "none" : "currentColor"}" stroke="currentColor" stroke-width="${v.hollow ? 2.4 : 1}" transform="rotate(-22 ${x} ${y})"/>`;
      if (v.dot) g += `<circle cx="${x + 13}" cy="${e.p % 2 === 0 ? y - SP / 2 : y}" r="2.2" fill="currentColor"/>`;
      out.push(g + "</g>");
    };
    tune.events.forEach((e, i) => drawEvent(e, i, null));
    if (opts.ghost) drawEvent(opts.ghost, -1, opts.ghost);
    return `<svg class="score" viewBox="0 -14 ${w} ${base + 4 * SP + 26}" width="100%" style="max-width:${w * 1.6}px;display:block" data-left="${left}" data-col="${col}" data-base="${base}" aria-label="music score">${out.join("")}</svg>`;
  }

  // A palette picture of one note value or rest.
  function valueGlyph(d, rest) {
    const x = 22;
    if (rest) return `<svg viewBox="0 0 44 56" width="34" height="44">${restGlyph(d, x, 60)}</svg>`;
    const v = valueFor(d), y = 34;
    let g = "";
    if (v.stem) g += `<line x1="${x + 7.5}" y1="${y - 2}" x2="${x + 7.5}" y2="${y - 30}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
    if (v.flag) g += flagPath(x + 7.5, y - 30, true);
    g += `<ellipse cx="${x}" cy="${y}" rx="8.2" ry="5.6" fill="${v.hollow ? "none" : "currentColor"}" stroke="currentColor" stroke-width="${v.hollow ? 2.4 : 1}" transform="rotate(-22 ${x} ${y})"/>`;
    if (v.dot) g += `<circle cx="${x + 13}" cy="${y - 2}" r="2.2" fill="currentColor"/>`;
    return `<svg viewBox="0 0 44 44" width="34" height="34">${g}</svg>`;
  }

  // Where a point on the rendered score lands: {slot, step, onStave}.
  function hitTest(svg, clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    const left = +svg.dataset.left, col = +svg.dataset.col, base = +svg.dataset.base;
    return { slot: Math.floor((p.x - left) / col), step: stepAt(p.y, base), onStave: p.y > base - 4 * LINE - 6 * SP && p.y < base + 6 * SP };
  }

  // Can `ev` go into the tune? It must fit inside one bar and not overlap anything.
  function fits(tune, ev) {
    const spb = slotsPerBar(tune.sig), slots = totalSlots(tune);
    if (ev.s < 0 || ev.s + ev.d > slots) return false;
    if (Math.floor(ev.s / spb) !== Math.floor((ev.s + ev.d - 1) / spb)) return false;
    return !tune.events.some((e) => ev.s < e.s + e.d && e.s < ev.s + ev.d);
  }

  window.TUNE = { VALUES, LEVELS, BPM, valueFor, slotsPerBar, totalSlots, normalize, letters, pitchName, play, stop, ping, scoreSvg, valueGlyph, hitTest, fits, unlock: audio, TOP_STEP };
})();
