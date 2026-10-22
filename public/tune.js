/* Eyes Up — "Make a Tune": standard notation on a treble stave, shared by
   the student device, the projector and the teacher's screens.

   A tune is { sig, bars, level, unit: 16, events: [...] } where each event is
   { s, d, p, a }:
     s  start, in semiquavers from the beginning     d  length in semiquavers (1 … 16 = semibreve)
     p  pitch step from middle C (0 = C4; -2 = A3 … 14 = C6), or null for a rest
     a  accidental: -1 flat, 0 none, 1 sharp
   Older tunes (quaver units, or a plain array of crotchets) are upgraded by normalize(). */

(function () {
  const STEP_NAMES = ["C", "D", "E", "F", "G", "A", "B"];
  const SEMIS = [0, 2, 4, 5, 7, 9, 11];
  const BPM = 96;
  const UNIT = 60 / BPM / 4; // one semiquaver, in seconds
  const mod = (n, m) => ((n % m) + m) % m;

  // Note values in semiquavers.
  const VALUES = [
    { d: 16, label: "semibreve", hollow: true, stem: false },
    { d: 12, label: "dotted minim", hollow: true, stem: true, dot: true },
    { d: 8, label: "minim", hollow: true, stem: true },
    { d: 6, label: "dotted crotchet", hollow: false, stem: true, dot: true },
    { d: 4, label: "crotchet", hollow: false, stem: true },
    { d: 3, label: "dotted quaver", hollow: false, stem: true, dot: true, flags: 1 },
    { d: 2, label: "quaver", hollow: false, stem: true, flags: 1 },
    { d: 1, label: "semiquaver", hollow: false, stem: true, flags: 2 },
  ];
  const valueFor = (d) => VALUES.find((v) => v.d === d) || VALUES[4];

  // What each level puts in the student's hands.
  const LEVELS = {
    beginner: { title: "Beginner", values: [8, 4], rests: [4], accidentals: false, range: [0, 7], letters: true, sigs: ["4/4"], bars: [1, 2] },
    standard: { title: "Standard", values: [16, 12, 8, 4, 2], rests: [16, 8, 4, 2], accidentals: true, range: [0, 12], letters: false, sigs: ["4/4", "3/4", "2/4"], bars: [1, 2, 4] },
    advanced: { title: "Advanced", values: [16, 12, 8, 6, 4, 3, 2, 1], rests: [16, 8, 4, 2, 1], accidentals: true, range: [-2, 14], letters: false, sigs: ["4/4", "3/4", "2/4", "6/8"], bars: [1, 2, 4] },
  };
  const levelOf = (name) => LEVELS[name] || LEVELS.standard; // older "simple"/"full" count as standard

  const sigParts = (sig) => String(sig || "4/4").split("/").map((n) => parseInt(n, 10) || 4);
  const slotsPerBar = (sig) => { const [n, d] = sigParts(sig); return (n * 16) / d; };
  const beatLen = (sig) => (sigParts(sig)[1] === 8 ? 6 : 4); // beaming group: dotted crotchet in x/8, else a crotchet
  const totalSlots = (t) => slotsPerBar(t.sig) * (t.bars || 2);

  function normalize(payload) {
    if (!payload) return { sig: "4/4", bars: 2, level: "standard", unit: 16, events: [] };
    if (Array.isArray(payload.notes)) {
      const notes = payload.notes; // very first format: one crotchet per beat
      return { sig: "4/4", bars: Math.max(1, Math.ceil(notes.length / 4)), level: "beginner", unit: 16, events: notes.map((n, i) => (n == null ? null : { s: i * 4, d: 4, p: n, a: 0 })).filter(Boolean) };
    }
    const k = payload.unit === 16 ? 1 : 2; // quaver-unit tunes → semiquavers
    return { sig: payload.sig || "4/4", bars: payload.bars || 2, level: payload.level || "standard", inst: INSTRUMENTS[payload.inst] ? payload.inst : "piano", unit: 16, events: (payload.events || []).map((e) => ({ s: e.s * k, d: e.d * k, p: e.p, a: e.a || 0 })).sort((x, y) => x.s - y.s) };
  }

  const pitchName = (p, a) => `${STEP_NAMES[mod(p, 7)]}${a === 1 ? "♯" : a === -1 ? "♭" : ""}${p >= 7 ? "′" : p < 0 ? "," : ""}`;
  const letters = (tune) => normalize(tune).events.map((e) => (e.p == null ? "–" : pitchName(e.p, e.a))).join(" ");
  const freqOf = (p, a) => 261.63 * Math.pow(2, (SEMIS[mod(p, 7)] + 12 * Math.floor(p / 7) + (a || 0)) / 12);

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

  /* Four small synth voices. Piano is the default; the others are there for colour. */
  const INSTRUMENTS = { piano: "🎹 Piano", bells: "🔔 Bells", flute: "🪈 Flute", guitar: "🎸 Guitar" };
  let instrument = "piano";
  const setInstrument = (n) => { if (INSTRUMENTS[n]) instrument = n; return instrument; };

  // One partial: an oscillator with its own gain, routed into `dest`, running from t for `len` seconds.
  function partial(ac, dest, type, freq, t, len, peak, { attack = 0.005, decayTo = 0.0001, decayAt = len, detune = 0 } = {}) {
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = type; osc.frequency.value = freq; osc.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, decayTo), t + decayAt);
    if (decayAt < len) g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(g).connect(dest);
    osc.start(t); osc.stop(t + len + 0.05);
    return osc;
  }

  function tone(freq, when, dur, inst = instrument) {
    const ac = audio();
    if (!ac || !freq) return;
    const t = when ?? ac.currentTime;
    const out = ac.createGain();
    out.gain.value = 0.9;
    out.connect(ac.destination);
    if (inst === "bells") {
      const len = Math.max(dur, 1.2);
      [[1, 0.5], [2.0, 0.25], [3.01, 0.18], [4.2, 0.1], [5.4, 0.05]].forEach(([r, g], i) => partial(ac, out, "sine", freq * r, t, len, g * 0.6, { attack: 0.003, decayTo: 0.001, decayAt: len * (1 - i * 0.12) }));
    } else if (inst === "flute") {
      const len = dur;
      const vib = ac.createOscillator(), vg = ac.createGain();
      vib.frequency.value = 5.2; vg.gain.value = 3.5; vib.connect(vg); vib.start(t); vib.stop(t + len + 0.05);
      [[1, 0.45], [2, 0.08], [3, 0.03]].forEach(([r, g]) => {
        const o = partial(ac, out, "sine", freq * r, t, len, g, { attack: 0.06, decayTo: g * 0.85, decayAt: Math.max(0.1, len * 0.85) });
        vg.connect(o.detune);
      });
    } else if (inst === "guitar") {
      const len = Math.min(Math.max(dur, 0.35), 1.6);
      const filt = ac.createBiquadFilter();
      filt.type = "lowpass"; filt.Q.value = 1;
      filt.frequency.setValueAtTime(freq * 7, t);
      filt.frequency.exponentialRampToValueAtTime(freq * 1.6, t + len * 0.7);
      filt.connect(out);
      partial(ac, filt, "sawtooth", freq, t, len, 0.32, { attack: 0.003, decayTo: 0.002, decayAt: len });
      partial(ac, filt, "triangle", freq * 2, t, len, 0.08, { attack: 0.003, decayTo: 0.001, decayAt: len * 0.6 });
    } else {
      // piano: bright strike, quick settle, held softly until the note ends
      const len = Math.max(dur, 0.25);
      const settle = Math.min(0.35, len * 0.5);
      [[1, 0.5, 0], [2, 0.26, 2], [3, 0.12, -2], [4, 0.06, 0], [6, 0.02, 0]].forEach(([r, g, dt]) =>
        partial(ac, out, "sine", freq * r, t, len, g, { attack: 0.004, decayTo: g * (r === 1 ? 0.35 : 0.12), decayAt: settle, detune: dt }));
      partial(ac, out, "triangle", freq, t, Math.min(len, 0.12), 0.12, { attack: 0.002, decayTo: 0.001, decayAt: 0.1 }); // the hammer
    }
  }
  const ping = (p, a = 0, inst) => tone(freqOf(p, a), undefined, 0.5, inst);

  let playing = null;
  function stop() {
    if (!playing) return;
    playing.timers.forEach(clearTimeout);
    const done = playing.onDone;
    playing = null;
    done && done();
  }
  // Plays a tune; onBeat(eventIndex) fires as each event starts (-1 at the end).
  function play(tuneLike, { onBeat, onDone, inst } = {}) {
    stop();
    const tune = normalize(tuneLike);
    const voice = inst || tune.inst || instrument;
    const ac = audio();
    const start = ac ? ac.currentTime + 0.05 : 0;
    const timers = [];
    tune.events.forEach((e, k) => {
      if (ac && e.p != null) tone(freqOf(e.p, e.a), start + e.s * UNIT, e.d * UNIT, voice);
      timers.push(setTimeout(() => onBeat && onBeat(k), 50 + e.s * UNIT * 1000));
    });
    const total = totalSlots(tune) * UNIT * 1000;
    timers.push(setTimeout(() => { playing = null; onBeat && onBeat(-1); onDone && onDone(); }, 50 + total + 150));
    playing = { timers, onDone };
    return total;
  }

  /* ---------- the score ---------- */
  const SP = 8; // one pitch step (half a stave space)
  const LINE = SP * 2;
  const STEM = 52;
  const yOf = (p, base) => base - (p - 2) * SP; // bottom line is E4 (step 2)
  const stepAt = (y, base, range) => Math.max(range[0], Math.min(range[1], Math.round((base - y) / SP + 2)));

  function flagPath(sx, sy, up) {
    const k = up ? 1 : -1; // a filled crescent curling away from the stem tip
    return `<path d="M${sx} ${sy} C ${sx + 1} ${sy + 11 * k}, ${sx + 13} ${sy + 13 * k}, ${sx + 10} ${sy + 30 * k} C ${sx + 11} ${sy + 19 * k}, ${sx + 5} ${sy + 15 * k}, ${sx} ${sy + 10 * k} Z" fill="currentColor"/>`;
  }
  function restGlyph(d, x, base) {
    const mid = base - 2 * LINE; // middle line (B4)
    if (d >= 16) return `<rect x="${x - 7}" y="${mid - LINE}" width="14" height="${SP - 1}" rx="1" fill="currentColor"/>`;
    if (d >= 8) return `<rect x="${x - 7}" y="${mid - SP + 1}" width="14" height="${SP - 1}" rx="1" fill="currentColor"/>`;
    if (d >= 4) return `<path d="M${x - 3} ${mid - 14} l6 7 l-5 6 l6 8 c-5 -3 -8 0 -5 6 c-4 -3 -5 -8 -1 -11 l-5 -7 z" fill="currentColor"/>`;
    const hook = (cy) => `<circle cx="${x - 5}" cy="${cy}" r="2.4" fill="currentColor"/><path d="M${x + 4} ${cy - 1} c-3 4 -7 4 -9 1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
    if (d >= 2) return `<path d="M${x + 4} ${mid - 8} l-5 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>${hook(mid - 7)}`;
    return `<path d="M${x + 5} ${mid - 10} l-7 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>${hook(mid - 9)}${hook(mid - 1)}`;
  }

  // Runs of quavers/semiquavers that share a beat get a beam instead of flags.
  function beamGroups(tune) {
    const per = beatLen(tune.sig), ev = tune.events, groups = [];
    let cur = [];
    const flush = () => { if (cur.length >= 2) groups.push(cur); cur = []; };
    ev.forEach((e, i) => {
      if (e.p == null || e.d >= 4) { flush(); return; }
      if (cur.length) {
        const prev = ev[cur[cur.length - 1]];
        if (Math.floor(prev.s / per) !== Math.floor(e.s / per) || prev.s + prev.d !== e.s) flush();
      }
      cur.push(i);
    });
    flush();
    return groups;
  }

  // SVG of the score. opts: {editor, active (event index), ghost:{s,d,p,a,ok}, compact}
  function scoreSvg(tuneLike, opts = {}) {
    const tune = normalize(tuneLike);
    const lvl = levelOf(tune.level);
    const spb = slotsPerBar(tune.sig), slots = totalSlots(tune);
    const col = opts.compact ? 8 : 12; // per semiquaver
    const left = 76, right = 18;
    const w = left + slots * col + right;
    const base = 100, top = base - 4 * LINE;
    const xOf = (s) => left + s * col + 2 * col; // a note sits a quaver in from the start of its slot
    const out = [];
    for (let k = 0; k < 5; k++) out.push(`<line x1="${left - 60}" y1="${base - k * LINE}" x2="${w - right + 4}" y2="${base - k * LINE}" stroke="currentColor" stroke-width="1.3"/>`);
    out.push(`<text x="${left - 62}" y="${base + 10}" font-size="62" font-family="'Noto Music','Bravura Text','Apple Symbols',serif" fill="currentColor">𝄞</text>`);
    const [num, den] = sigParts(tune.sig);
    out.push(`<text x="${left - 18}" y="${base - LINE * 2 - 2}" font-size="22" font-weight="800" text-anchor="middle" fill="currentColor" font-family="serif">${num}</text><text x="${left - 18}" y="${base - 1}" font-size="22" font-weight="800" text-anchor="middle" fill="currentColor" font-family="serif">${den}</text>`);
    for (let b = 1; b < tune.bars; b++) out.push(`<line x1="${left + b * spb * col}" y1="${top}" x2="${left + b * spb * col}" y2="${base}" stroke="currentColor" stroke-width="1.3"/>`);
    out.push(`<line x1="${w - right}" y1="${top}" x2="${w - right}" y2="${base}" stroke="currentColor" stroke-width="1.3"/><line x1="${w - right + 4}" y1="${top}" x2="${w - right + 4}" y2="${base}" stroke="currentColor" stroke-width="3.5"/>`);
    if (opts.editor) {
      const beat = beatLen(tune.sig);
      for (let s = 0; s < slots; s++) {
        if (s % beat === 0 && s % spb !== 0) out.push(`<line x1="${left + s * col}" y1="${base + 6}" x2="${left + s * col}" y2="${base + 11}" stroke="currentColor" stroke-width="1" opacity="0.35"/>`);
        out.push(`<rect class="score-slot" data-slot="${s}" x="${left + s * col}" y="${top - 7 * SP}" width="${col}" height="${base - top + 14 * SP}" fill="transparent"/>`);
      }
    }

    // beams first, so stems know where to stop
    const beamed = new Map(); // event index -> {y, up}
    const beams = [];
    for (const g of beamGroups(tune)) {
      const ps = g.map((i) => tune.events[i].p);
      const up = ps.reduce((a, b) => a + b, 0) / ps.length < 6;
      const ys = ps.map((p) => yOf(p, base));
      const y = up ? Math.min(...ys) - STEM : Math.max(...ys) + STEM;
      g.forEach((i) => beamed.set(i, { y, up }));
      const sx = (i) => xOf(tune.events[i].s) + (up ? 7.5 : -7.5);
      beams.push(`<line x1="${sx(g[0])}" y1="${y}" x2="${sx(g[g.length - 1])}" y2="${y}" stroke="currentColor" stroke-width="5"/>`);
      const y2 = up ? y + 8 : y - 8; // second beam for semiquavers
      g.forEach((i, k) => {
        if (tune.events[i].d !== 1) return;
        const nextIs = k + 1 < g.length && tune.events[g[k + 1]].d === 1;
        const prevIs = k > 0 && tune.events[g[k - 1]].d === 1;
        if (nextIs) beams.push(`<line x1="${sx(i)}" y1="${y2}" x2="${sx(g[k + 1])}" y2="${y2}" stroke="currentColor" stroke-width="5"/>`);
        else if (!prevIs) { const dir = k + 1 < g.length ? 1 : -1; beams.push(`<line x1="${sx(i)}" y1="${y2}" x2="${sx(i) + dir * 10}" y2="${y2}" stroke="currentColor" stroke-width="5"/>`); }
      });
    }

    const drawEvent = (e, i, ghost) => {
      const x = xOf(e.s);
      const active = opts.active === i;
      const colr = ghost ? (ghost.ok ? "#1d3f78" : "#c92a2a") : active ? "#1d6fd8" : "currentColor";
      let g = `<g class="score-ev ${active ? "active" : ""}" data-ev="${i}" opacity="${ghost ? 0.55 : 1}" style="color:${colr}">`;
      if (active && !ghost) g += `<rect x="${x - 2 * col - 2}" y="${top - 6 * SP}" width="${e.d * col + 4}" height="${base - top + 12 * SP}" rx="5" fill="#1d6fd8" opacity="0.1"/>`;
      if (e.p == null) { out.push(g + restGlyph(e.d, x, base) + "</g>"); return; }
      const v = valueFor(e.d);
      const y = yOf(e.p, base);
      for (let k = 0; k >= e.p; k -= 2) g += `<line x1="${x - 12}" y1="${yOf(k, base)}" x2="${x + 12}" y2="${yOf(k, base)}" stroke="currentColor" stroke-width="1.4"/>`;
      for (let k = 12; k <= e.p; k += 2) g += `<line x1="${x - 12}" y1="${yOf(k, base)}" x2="${x + 12}" y2="${yOf(k, base)}" stroke="currentColor" stroke-width="1.4"/>`;
      if (e.a) g += `<text x="${x - 11}" y="${y + 5}" text-anchor="end" font-size="16" font-weight="700" fill="currentColor">${e.a === 1 ? "♯" : "♭"}</text>`;
      const bm = ghost ? null : beamed.get(i);
      const up = bm ? bm.up : e.p < 6;
      if (v.stem) {
        const sx = up ? x + 7.5 : x - 7.5, sy1 = up ? y - 2 : y + 2;
        const sy2 = bm ? bm.y : up ? y - STEM : y + STEM;
        g += `<line x1="${sx}" y1="${sy1}" x2="${sx}" y2="${sy2}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
        if (!bm) for (let f = 0; f < (v.flags || 0); f++) g += flagPath(sx, sy2 + (up ? f * 8 : -f * 8), up);
      }
      g += `<ellipse cx="${x}" cy="${y}" rx="8.2" ry="5.6" fill="${v.hollow ? "none" : "currentColor"}" stroke="currentColor" stroke-width="${v.hollow ? 2.4 : 1}" transform="rotate(-22 ${x} ${y})"/>`;
      if (lvl.letters && !ghost) g += `<text x="${x}" y="${y + 2.8}" text-anchor="middle" font-size="7.5" font-weight="800" fill="${v.hollow ? "currentColor" : "#fff"}" style="pointer-events:none">${STEP_NAMES[mod(e.p, 7)]}</text>`;
      if (v.dot) g += `<circle cx="${x + 13}" cy="${mod(e.p, 2) === 0 ? y - SP / 2 : y}" r="2.2" fill="currentColor"/>`;
      out.push(g + "</g>");
    };
    tune.events.forEach((e, i) => drawEvent(e, i, null));
    out.push(...beams);
    if (opts.ghost) drawEvent(opts.ghost, -1, opts.ghost);
    return `<svg class="score" viewBox="0 -20 ${w} ${base + 60}" width="100%" style="max-width:${w * 1.6}px;display:block" data-left="${left}" data-col="${col}" data-base="${base}" aria-label="music score">${out.join("")}</svg>`;
  }

  // A palette picture of one note value or rest.
  function valueGlyph(d, rest) {
    const x = 20;
    if (rest) return `<svg viewBox="0 0 44 56" width="34" height="44">${restGlyph(d, x, 60)}</svg>`;
    const v = valueFor(d), y = 36;
    let g = "";
    if (v.stem) g += `<line x1="${x + 7.5}" y1="${y - 2}" x2="${x + 7.5}" y2="${y - 32}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
    for (let f = 0; f < (v.flags || 0); f++) g += flagPath(x + 7.5, y - 32 + f * 8, true);
    g += `<ellipse cx="${x}" cy="${y}" rx="8.2" ry="5.6" fill="${v.hollow ? "none" : "currentColor"}" stroke="currentColor" stroke-width="${v.hollow ? 2.4 : 1}" transform="rotate(-22 ${x} ${y})"/>`;
    if (v.dot) g += `<circle cx="${x + 13}" cy="${y - 2}" r="2.2" fill="currentColor"/>`;
    return `<svg viewBox="0 0 48 44" width="36" height="34">${g}</svg>`;
  }

  // Where a point on the rendered score lands: {slot, step, onStave}. Starts snap to a grid that suits the value.
  function hitTest(svg, clientX, clientY, range = [0, 12], d = 4) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    const left = +svg.dataset.left, col = +svg.dataset.col, base = +svg.dataset.base;
    const raw = Math.floor((p.x - left) / col);
    const snap = d >= 4 ? 4 : d === 3 ? 1 : d;
    return { slot: Math.floor(raw / snap) * snap, step: stepAt(p.y, base, range), onStave: p.y > base - 4 * LINE - 8 * SP && p.y < base + 8 * SP };
  }

  // Can `ev` go into the tune? It must fit inside one bar and not overlap anything.
  function fits(tune, ev) {
    const spb = slotsPerBar(tune.sig), slots = totalSlots(tune);
    if (ev.s < 0 || ev.s + ev.d > slots) return false;
    if (Math.floor(ev.s / spb) !== Math.floor((ev.s + ev.d - 1) / spb)) return false;
    return !tune.events.some((e) => ev.s < e.s + e.d && e.s < ev.s + ev.d);
  }

  // First free place where a value of length d fits (for "tap a key to add the next note").
  function nextFree(tune, d) {
    const slots = totalSlots(tune), snap = d >= 4 ? 4 : d === 3 ? 1 : d;
    for (let s = 0; s + d <= slots; s += snap) if (fits(tune, { s, d })) return s;
    return -1;
  }
  const STEP_SEMIS = SEMIS;
  window.TUNE = { VALUES, LEVELS, levelOf, BPM, INSTRUMENTS, setInstrument, valueFor, slotsPerBar, totalSlots, normalize, letters, pitchName, play, stop, ping, scoreSvg, valueGlyph, hitTest, fits, nextFree, unlock: audio, STEP_NAMES, STEP_SEMIS };
})();
