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
  const unitFor = (bpm) => 60 / (bpm || BPM) / 4; // one semiquaver, in seconds
  // Key signatures: sharps in the order F C G D A E B, flats B E A D G C F. key = +n sharps / -n flats.
  const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6], FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3]; // letter indexes (C=0)
  const KEY_NAMES = { 0: "C major / A minor", 1: "G major / E minor", 2: "D major / B minor", 3: "A major / F♯ minor", "-1": "F major / D minor", "-2": "B♭ major / G minor", "-3": "E♭ major / C minor" };
  const keyAccidental = (key, letter) => (key > 0 && SHARP_ORDER.slice(0, key).includes(letter) ? 1 : key < 0 && FLAT_ORDER.slice(0, -key).includes(letter) ? -1 : 0);
  const DYNAMICS = { pp: 0.22, p: 0.4, mp: 0.6, mf: 0.8, f: 1, ff: 1.25 };
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
  const beatsText = (d) => { const b = d / 4; const t = b === 0.25 ? "¼" : b === 0.5 ? "½" : b === 0.75 ? "¾" : b === 1.5 ? "1½" : String(b); return `${t} beat${b === 1 ? "" : "s"}`; };

  // What each level puts in the student's hands.
  const LEVELS = {
    beginner: { title: "Beginner", values: [8, 4], rests: [4], accidentals: false, range: [0, 7], letters: true, sigs: ["4/4"], bars: [1, 2] },
    standard: { title: "Standard", values: [16, 12, 8, 4, 2], rests: [16, 8, 4, 2], accidentals: true, range: [0, 12], letters: false, sigs: ["4/4", "3/4", "2/4"], bars: [1, 2, 4] },
    advanced: { title: "Advanced", values: [16, 12, 8, 6, 4, 3, 2, 1], rests: [16, 8, 4, 2, 1], accidentals: true, range: [-2, 14], letters: false, sigs: ["4/4", "3/4", "2/4", "6/8"], bars: [1, 2, 4] },
  };
  const levelOf = (name) => LEVELS[name] || LEVELS.standard; // older "simple"/"full" count as standard
  // Bass-clef range per level (steps from middle C: G2 is -10, the bottom line of the bass stave).
  const BASS_RANGE = { beginner: [-10, -2], standard: [-12, 2], advanced: [-14, 2] };
  const rangeFor = (level, st) => (st === 1 ? BASS_RANGE[level] || BASS_RANGE.standard : levelOf(level).range);
  // Which staves a tune shows: [{st, clef, bottom (step on the bottom line), mid (step on the middle line)}]
  const stavesOf = (staff) => staff === "bass" ? [{ st: 1, clef: "bass", bottom: -10, mid: -6 }] : staff === "grand" ? [{ st: 0, clef: "treble", bottom: 2, mid: 6 }, { st: 1, clef: "bass", bottom: -10, mid: -6 }] : [{ st: 0, clef: "treble", bottom: 2, mid: 6 }];

  const sigParts = (sig) => String(sig || "4/4").split("/").map((n) => parseInt(n, 10) || 4);
  const slotsPerBar = (sig) => { const [n, d] = sigParts(sig); return (n * 16) / d; };
  const beatLen = (sig) => (sigParts(sig)[1] === 8 ? 6 : 4); // beaming group: dotted crotchet in x/8, else a crotchet
  const totalSlots = (t) => slotsPerBar(t.sig) * (t.bars || 2);

  function normalize(payload) {
    if (!payload) return { sig: "4/4", bars: 2, level: "standard", staff: "treble", key: 0, bpm: BPM, unit: 16, events: [] };
    if (Array.isArray(payload.notes)) {
      const notes = payload.notes; // very first format: one crotchet per beat
      return { sig: "4/4", bars: Math.max(1, Math.ceil(notes.length / 4)), level: "beginner", staff: "treble", unit: 16, events: notes.map((n, i) => (n == null ? null : { s: i * 4, d: 4, p: n, a: 0, st: 0 })).filter(Boolean) };
    }
    const k = payload.unit === 16 ? 1 : 2; // quaver-unit tunes → semiquavers
    const staff = ["treble", "bass", "grand"].includes(payload.staff) ? payload.staff : "treble";
    const key = Math.max(-3, Math.min(3, parseInt(payload.key, 10) || 0));
    const bpm = Math.max(40, Math.min(200, parseInt(payload.bpm, 10) || BPM));
    return { sig: payload.sig || "4/4", bars: payload.bars || 2, level: payload.level || "standard", staff, chords: payload.chords === true, key, bpm, inst: INSTRUMENTS[payload.inst] ? payload.inst : "piano", unit: 16,
      events: (payload.events || []).map((e) => ({ s: e.s * k, d: e.d * k, p: e.p, a: [-1, 0, 1, 2].includes(e.a) ? e.a : 0, st: staff === "bass" ? 1 : staff === "grand" && e.st === 1 ? 1 : 0, tie: e.tie === true, dyn: DYNAMICS[e.dyn] ? e.dyn : undefined })).sort((x, y) => x.s - y.s || x.st - y.st) };
  }

  const pitchName = (p, a) => `${STEP_NAMES[mod(p, 7)]}${a === 1 ? "♯" : a === -1 ? "♭" : a === 2 ? "♮" : ""}${p >= 7 ? "′" : p < 0 ? "," : ""}`;
  // The semitone shift a note actually sounds with: its own accidental, or the key signature's.
  const soundAcc = (e, key) => (e.a === 2 ? 0 : e.a ? e.a : keyAccidental(key || 0, mod(e.p, 7)));
  // The note a tie joins to: next note on the same stave, same pitch, starting when this one ends.
  const tieTarget = (tune, e) => (e.tie && e.p != null ? tune.events.find((o) => o !== e && (o.st || 0) === (e.st || 0) && o.p === e.p && o.a === e.a && o.s === e.s + e.d) : null);
  const letters = (tune) => {
    const t = normalize(tune), out = [];
    t.events.forEach((e, i) => {
      const prev = t.events[i - 1];
      const name = e.p == null ? "–" : pitchName(e.p, e.a);
      if (prev && prev.s === e.s && (prev.st || 0) === (e.st || 0) && prev.p != null && e.p != null) out[out.length - 1] += "+" + name;
      else out.push(name);
    });
    return out.join(" ");
  };
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

  function tone(freq, when, dur, inst = instrument, vol = 0.9) {
    const ac = audio();
    if (!ac || !freq) return;
    const t = when ?? ac.currentTime;
    const out = ac.createGain();
    out.gain.value = Math.min(1.2, vol);
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
    const UNIT = unitFor(tune.bpm);
    const ac = audio();
    const start = ac ? ac.currentTime + 0.05 : 0;
    const timers = [];
    const tiedInto = new Set(); // notes that continue a tie don't restrike
    const level = {}; // current dynamic per stave
    tune.events.forEach((e, k) => {
      if (e.dyn) level[e.st || 0] = DYNAMICS[e.dyn];
      if (ac && e.p != null && !tiedInto.has(e)) {
        let len = e.d, cur = e, next;
        while ((next = tieTarget(tune, cur))) { tiedInto.add(next); len += next.d; cur = next; }
        tone(freqOf(e.p, soundAcc(e, tune.key)), start + e.s * UNIT, len * UNIT, voice, level[e.st || 0] || 0.8);
      }
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
  const MUSIC_FONT = "'Noto Music','Bravura Text',serif";
  const EM = 4 * LINE; // music font size: one em spans the five lines
  const glyph = (ch, x, y, size = EM, extra = "") => `<text x="${x}" y="${y}" font-size="${size}" font-family="${MUSIC_FONT}" fill="currentColor" ${extra}>${ch}</text>`;
  const STAVE_GAP = 128; // treble bottom line to bass bottom line on a grand staff
  const yOn = (p, base, bottom) => base - (p - bottom) * SP;
  const stepOn = (y, base, bottom, range) => Math.max(range[0], Math.min(range[1], Math.round((base - y) / SP + bottom)));

  function flagPath(sx, sy, up) {
    const k = up ? 1 : -1; // a filled crescent curling away from the stem tip
    return `<path d="M${sx} ${sy} C ${sx + 1} ${sy + 11 * k}, ${sx + 13} ${sy + 13 * k}, ${sx + 10} ${sy + 30 * k} C ${sx + 11} ${sy + 19 * k}, ${sx + 5} ${sy + 15 * k}, ${sx} ${sy + 10 * k} Z" fill="currentColor"/>`;
  }
  // Rests from the music font. Whole and half rests sit one space higher than the font draws them
  // (hanging from the 4th line / sitting on the middle line, as engraved).
  function restGlyph(d, x, base) {
    const ch = d >= 16 ? "𝄻" : d >= 8 ? "𝄼" : d >= 4 ? "𝄽" : d >= 2 ? "𝄾" : "𝄿";
    const wide = d >= 8;
    return glyph(ch, x - (wide ? 0.34 : d >= 2 && d < 4 ? 0.12 : 0.16) * EM, wide ? base - LINE : base, EM);
  }

  // Runs of quavers/semiquavers on one stave that share a beat get a beam instead of flags.
  function beamGroups(tune, st) {
    const per = beatLen(tune.sig), ev = tune.events, groups = [];
    let cur = [];
    const flush = () => { if (cur.length >= 2) groups.push(cur); cur = []; };
    ev.forEach((e, i) => {
      if (e.st !== st) return;
      if (e.p == null || e.d >= 4) { flush(); return; }
      if (cur.length) {
        const prev = ev[cur[cur.length - 1]];
        if (prev.s === e.s && (prev.st || 0) === (e.st || 0)) { cur.push(i); return; } // chord mate shares the beam
        if (Math.floor(prev.s / per) !== Math.floor(e.s / per) || prev.s + prev.d !== e.s) flush();
      }
      cur.push(i);
    });
    flush();
    return groups;
  }

  // SVG of the score. opts: {editor, active (event index), ghost:{s,d,p,a,st,ok}, compact}
  function scoreSvg(tuneLike, opts = {}) {
    const tune = normalize(tuneLike);
    const lvl = levelOf(tune.level);
    const staves = stavesOf(tune.staff);
    const spb = slotsPerBar(tune.sig), slots = totalSlots(tune);
    const col = opts.compact ? 8 : 12; // per semiquaver
    const nKey = Math.abs(tune.key || 0);
    const left0 = 90; // clef and brace stay put; the key signature pushes the time signature and notes right
    const KW = 13; // width of one key-signature accidental
    const left = left0 + (nKey ? nKey * KW + 12 : 0), right = 18;
    const w = left + slots * col + right;
    const base0 = 100;
    staves.forEach((sv, i) => { sv.base = base0 + i * STAVE_GAP; sv.top = sv.base - 4 * LINE; });
    const firstTop = staves[0].top, lastBase = staves[staves.length - 1].base;
    const xOf = (sl) => left + sl * col + 2 * col; // a note sits a quaver in from the start of its slot
    const out = [];
    const [num, den] = sigParts(tune.sig);
    for (const sv of staves) {
      for (let k = 0; k < 5; k++) out.push(`<line x1="${left0 - 78}" y1="${sv.base - k * LINE}" x2="${w - right + 4}" y2="${sv.base - k * LINE}" stroke="currentColor" stroke-width="1.3"/>`);
      // clef: baseline on the bottom line, one em tall — the treble curls round the G line, the bass dots sit either side of the F line
      out.push(glyph(sv.clef === "bass" ? "𝄢" : "𝄞", left0 - 76, sv.base, EM));
      // key signature between the clef and the time signature
      if (nKey) {
        const order = tune.key > 0 ? SHARP_ORDER : FLAT_ORDER;
        const trebleSteps = tune.key > 0 ? [10, 7, 11, 8, 5, 9, 6] : [6, 9, 5, 8, 4, 7, 3];
        for (let i = 0; i < nKey; i++) {
          const step = trebleSteps[i] - (sv.st === 1 ? 14 : 0);
          const y = yOn(step, sv.base, sv.bottom);
          const kx = left - 36 - (nKey - i) * KW; // between the clef and the time signature, in order
          out.push(tune.key > 0 ? glyph("♯", kx, y + 0.135 * EM * 0.78, EM * 0.78) : glyph("♭", kx + 1, y, EM * 0.78));
        }
      }
      out.push(`<text x="${left - 20}" y="${sv.base - LINE * 2 - 1}" font-size="30" font-weight="800" text-anchor="middle" fill="currentColor" font-family="'Noto Music',serif">${num}</text><text x="${left - 20}" y="${sv.base - 1}" font-size="30" font-weight="800" text-anchor="middle" fill="currentColor" font-family="'Noto Music',serif">${den}</text>`);
    }
    if (tune.bpm && tune.bpm !== BPM && !opts.compact) out.push(`<text x="${left}" y="${firstTop - 7 * SP + 10}" font-size="13" font-weight="700" fill="currentColor" font-family="sans-serif">♩ = ${tune.bpm}</text>`);
    if (staves.length > 1) out.push(`<line x1="${left0 - 78}" y1="${firstTop}" x2="${left0 - 78}" y2="${lastBase}" stroke="currentColor" stroke-width="1.6"/><path d="M${left0 - 84} ${firstTop} q -8 ${(lastBase - firstTop) / 4} 0 ${(lastBase - firstTop) / 2} q -8 ${(lastBase - firstTop) / 4} 0 ${(lastBase - firstTop) / 2}" fill="none" stroke="currentColor" stroke-width="2.4"/>`);
    for (let b = 1; b < tune.bars; b++) out.push(`<line x1="${left + b * spb * col}" y1="${firstTop}" x2="${left + b * spb * col}" y2="${lastBase}" stroke="currentColor" stroke-width="1.3"/>`);
    out.push(`<line x1="${w - right}" y1="${firstTop}" x2="${w - right}" y2="${lastBase}" stroke="currentColor" stroke-width="1.3"/><line x1="${w - right + 4}" y1="${firstTop}" x2="${w - right + 4}" y2="${lastBase}" stroke="currentColor" stroke-width="3.5"/>`);
    if (opts.editor) {
      const beat = beatLen(tune.sig);
      for (let sl = 0; sl < slots; sl++) {
        if (sl % beat === 0 && sl % spb !== 0) out.push(`<line x1="${left + sl * col}" y1="${lastBase + 6}" x2="${left + sl * col}" y2="${lastBase + 11}" stroke="currentColor" stroke-width="1" opacity="0.35"/>`);
        out.push(`<rect class="score-slot" data-slot="${sl}" x="${left + sl * col}" y="${firstTop - 7 * SP}" width="${col}" height="${lastBase - firstTop + 14 * SP}" fill="transparent"/>`);
      }
    }

    // beams first, so stems know where to stop
    const beamed = new Map(); // event index -> {y, up}
    const beams = [];
    for (const sv of staves) {
      for (const g of beamGroups(tune, sv.st)) {
        const ps = g.map((i) => tune.events[i].p);
        const up = ps.reduce((a, b) => a + b, 0) / ps.length < sv.mid;
        const ys = ps.map((p) => yOn(p, sv.base, sv.bottom));
        const y = up ? Math.min(...ys) - STEM : Math.max(...ys) + STEM;
        g.forEach((i) => beamed.set(i, { y, up }));
        const sx = (i) => xOf(tune.events[i].s) + (up ? 7.5 : -7.5);
        if (sx(g[0]) === sx(g[g.length - 1])) { g.forEach((i) => beamed.delete(i)); continue; } // a lone chord: flags, not a beam
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
    }

    // Notes that start together on one stave form a chord: one stem, heads stacked.
    const chordOf = (e) => tune.events.filter((o) => o.p != null && (o.st || 0) === (e.st || 0) && o.s === e.s);
    const drawEvent = (e, i, ghost) => {
      const sv = staves.find((x) => x.st === (e.st || 0)) || staves[0];
      const chord = ghost || e.p == null ? [e] : chordOf(e);
      const x0 = xOf(e.s);
      let x = x0;
      const active = opts.active === i;
      const sel = opts.selected === i;
      const colr = ghost ? (ghost.ok ? "#1d3f78" : "#c92a2a") : active || sel ? "#1d6fd8" : "currentColor";
      let g = `<g class="score-ev ${active ? "active" : ""}" data-ev="${i}" opacity="${ghost ? 0.55 : 1}" style="color:${colr}">`;
      if (active && !ghost) g += `<rect x="${x - 2 * col - 2}" y="${sv.top - 6 * SP}" width="${e.d * col + 4}" height="${sv.base - sv.top + 12 * SP}" rx="5" fill="#1d6fd8" opacity="0.1"/>`;
      if (e.p == null) { out.push(g + restGlyph(e.d, x, sv.base) + "</g>"); return; }
      const v = valueFor(e.d);
      const y = yOn(e.p, sv.base, sv.bottom);
      const bm = ghost ? null : beamed.get(i);
      const up = bm ? bm.up : chord.reduce((a, o) => a + o.p, 0) / chord.length < sv.mid;
      // a "second" (adjacent notes) can't share a column: the upper note goes right of an up-stem, the lower note left of a down-stem
      const sorted = chord.slice().sort((a, b) => a.p - b.p);
      if (chord.length > 1) {
        const k = sorted.indexOf(e);
        if (up && k > 0 && sorted[k].p - sorted[k - 1].p === 1 && !(k > 1 && sorted[k - 1].p - sorted[k - 2].p === 1)) x = x0 + 15;
        if (!up && k < sorted.length - 1 && sorted[k + 1].p - sorted[k].p === 1 && !(k < sorted.length - 2 && sorted[k + 2].p - sorted[k + 1].p === 1)) x = x0 - 15;
      }
      for (let k = sv.bottom - 2; k >= e.p; k -= 2) g += `<line x1="${x - 12}" y1="${yOn(k, sv.base, sv.bottom)}" x2="${x + 12}" y2="${yOn(k, sv.base, sv.bottom)}" stroke="currentColor" stroke-width="1.4"/>`;
      for (let k = sv.bottom + 10; k <= e.p; k += 2) g += `<line x1="${x - 12}" y1="${yOn(k, sv.base, sv.bottom)}" x2="${x + 12}" y2="${yOn(k, sv.base, sv.bottom)}" stroke="currentColor" stroke-width="1.4"/>`;
      if (e.a) g += e.a === 1 ? glyph("♯", x - 23, y + 0.135 * EM * 0.78, EM * 0.78) : e.a === 2 ? glyph("♮", x - 21, y + 0.1 * EM * 0.78, EM * 0.78) : glyph("♭", x - 21, y, EM * 0.78);
      if (e.dyn && !ghost) g += `<text x="${x0}" y="${sv.base + 2.4 * LINE}" font-size="15" font-style="italic" font-weight="800" text-anchor="middle" fill="currentColor" font-family="serif">${e.dyn}</text>`;
      if (e.tie && !ghost) {
        const to = tieTarget(tune, e);
        if (to) { const x2 = xOf(to.s); const dir = up ? 1 : -1; g += `<path d="M${x + 6} ${y + 7 * dir} q ${(x2 - x - 12) / 2} ${12 * dir} ${x2 - x - 12} 0" fill="none" stroke="currentColor" stroke-width="2"/>`; }
      }
      if (v.stem) {
        const tipNote = up ? sorted[sorted.length - 1] : sorted[0];
        const tipY = yOn(tipNote.p, sv.base, sv.bottom);
        const sx = up ? x0 + 7.5 : x0 - 7.5, sy1 = up ? y - 2 : y + 2;
        const sy2 = bm ? bm.y : up ? tipY - STEM : tipY + STEM;
        g += `<line x1="${sx}" y1="${sy1}" x2="${sx}" y2="${sy2}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
        if (!bm && e === tipNote) for (let f = 0; f < (v.flags || 0); f++) g += flagPath(sx, sy2 + (up ? f * 8 : -f * 8), up);
      }
      g += `<ellipse cx="${x}" cy="${y}" rx="8.2" ry="5.6" fill="${v.hollow ? "none" : "currentColor"}" stroke="currentColor" stroke-width="${v.hollow ? 2.4 : 1}" transform="rotate(-22 ${x} ${y})"/>`;
      if (lvl.letters && !ghost) g += `<text x="${x}" y="${y + 2.8}" text-anchor="middle" font-size="7.5" font-weight="800" fill="${v.hollow ? "currentColor" : "#fff"}" style="pointer-events:none">${STEP_NAMES[mod(e.p, 7)]}</text>`;
      if (v.dot) g += `<circle cx="${x + 13}" cy="${mod(e.p, 2) === 0 ? y - SP / 2 : y}" r="2.2" fill="currentColor"/>`;
      out.push(g + "</g>");
    };
    tune.events.forEach((e, i) => drawEvent(e, i, null));
    out.push(...beams);
    if (opts.ghost) drawEvent(opts.ghost, -1, opts.ghost);
    const vbTop = firstTop - 7 * SP - 4, vbBottom = lastBase + 8 * SP + 4;
    return `<svg class="score" viewBox="0 ${vbTop} ${w} ${vbBottom - vbTop}" width="100%" style="max-width:${w * 1.6}px;display:block" data-left="${left}" data-col="${col}" data-staves="${staves.map((sv) => `${sv.st}:${sv.base}:${sv.bottom}`).join("|")}" aria-label="music score">${out.join("")}</svg>`;
  }

  // A palette picture of one note value or rest.
  function valueGlyph(d, rest) {
    const x = 20;
    if (rest) return `<svg viewBox="0 0 44 56" width="34" height="44">${restGlyph(d, 22, d >= 8 ? 50 : 54)}</svg>`;
    const v = valueFor(d), y = 36;
    let g = "";
    if (v.stem) g += `<line x1="${x + 7.5}" y1="${y - 2}" x2="${x + 7.5}" y2="${y - 32}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
    for (let f = 0; f < (v.flags || 0); f++) g += flagPath(x + 7.5, y - 32 + f * 8, true);
    g += `<ellipse cx="${x}" cy="${y}" rx="8.2" ry="5.6" fill="${v.hollow ? "none" : "currentColor"}" stroke="currentColor" stroke-width="${v.hollow ? 2.4 : 1}" transform="rotate(-22 ${x} ${y})"/>`;
    if (v.dot) g += `<circle cx="${x + 13}" cy="${y - 2}" r="2.2" fill="currentColor"/>`;
    return `<svg viewBox="0 0 48 44" width="36" height="34">${g}</svg>`;
  }

  // Where a point on the rendered score lands: {slot, step, st, onStave}. Starts snap to a grid that suits the value.
  function hitTest(svg, clientX, clientY, level = "standard", d = 4) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    const left = +svg.dataset.left, col = +svg.dataset.col;
    const staves = String(svg.dataset.staves).split("|").map((x) => { const [st, base, bottom] = x.split(":").map(Number); return { st, base, bottom, top: base - 4 * LINE }; });
    // nearest stave by distance to its middle line
    const sv = staves.reduce((best, x) => (Math.abs(p.y - (x.base - 2 * LINE)) < Math.abs(p.y - (best.base - 2 * LINE)) ? x : best), staves[0]);
    const raw = Math.floor((p.x - left) / col);
    const snap = d >= 4 ? 4 : d === 3 ? 1 : d;
    const range = rangeFor(level, sv.st);
    return { slot: Math.floor(raw / snap) * snap, step: stepOn(p.y, sv.base, sv.bottom, range), st: sv.st, onStave: p.y > staves[0].top - 8 * SP && p.y < staves[staves.length - 1].base + 8 * SP };
  }

  // Can `ev` go into the tune? It must fit inside one bar and not overlap anything on its own stave.
  function fits(tune, ev) {
    const spb = slotsPerBar(tune.sig), slots = totalSlots(tune);
    if (ev.s < 0 || ev.s + ev.d > slots) return false;
    if (Math.floor(ev.s / spb) !== Math.floor((ev.s + ev.d - 1) / spb)) return false;
    const same = (e) => (e.st || 0) === (ev.st || 0);
    if (tune.chords && ev.p != null) {
      const mates = tune.events.filter((e) => same(e) && e.s === ev.s && e.p != null);
      if (mates.length) return mates.length < 4 && mates.every((e) => e.d === ev.d && (e.p !== ev.p || e.a !== ev.a)) && !tune.events.some((e) => same(e) && e.s !== ev.s && ev.s < e.s + e.d && e.s < ev.s + ev.d);
    }
    return !tune.events.some((e) => same(e) && ev.s < e.s + e.d && e.s < ev.s + ev.d);
  }

  // Where a dropped note settles: the spot under the finger if it fits, otherwise the nearest
  // earlier start in the same bar that does (a semibreve dropped mid-bar fills the bar). null = nowhere.
  function settle(tune, ev) {
    if (fits(tune, ev)) return ev;
    const spb = slotsPerBar(tune.sig), slots = totalSlots(tune);
    if (ev.s < 0 || ev.s >= slots) return null;
    const barStart = Math.floor(ev.s / spb) * spb;
    const snap = ev.d >= 4 ? 4 : ev.d === 3 ? 1 : ev.d;
    for (let s = ev.s - snap; s >= barStart; s -= snap) {
      const cand = { ...ev, s };
      if (fits(tune, cand)) return cand; // the latest free gap in this bar that holds it
    }
    return null;
  }

  // Plain-English reason a note won't go where it was dropped.
  function whyNot(tune, ev) {
    const spb = slotsPerBar(tune.sig), slots = totalSlots(tune);
    const name = ev.p == null ? `A ${valueFor(ev.d).label} rest` : `A ${valueFor(ev.d).label}`;
    if (ev.s < 0 || ev.s >= slots) return "Drop it on the stave";
    const barEnd = (Math.floor(ev.s / spb) + 1) * spb;
    const clash = tune.events.find((e) => (e.st || 0) === (ev.st || 0) && ev.s < e.s + e.d && e.s < ev.s + ev.d);
    if (tune.chords && clash && clash.s === ev.s && ev.p != null && clash.p != null) {
      const mates = tune.events.filter((e) => (e.st || 0) === (ev.st || 0) && e.s === ev.s && e.p != null);
      if (mates.length >= 4) return "A chord can have up to 4 notes";
      if (mates.some((e) => e.d !== ev.d)) return `Notes in a chord must be the same length — that one is a ${valueFor(mates[0].d).label}`;
      if (mates.some((e) => e.p === ev.p && e.a === ev.a)) return "That note is already in the chord";
    }
    if (clash && clash.s <= ev.s) {
      const what = clash.p == null ? `${valueFor(clash.d).label} rest` : valueFor(clash.d).label;
      return clash.d >= spb
        ? `That bar is already full — the ${what} takes all ${spb / 4} beats. Tap it to remove it.`
        : `There's already a ${what} there — tap it to remove it first`;
    }
    const room = (clash ? clash.s : barEnd) - ev.s;
    const beats = (n) => { const b = n / 4; return `${b % 1 ? b.toFixed(1) : b} beat${b === 1 ? "" : "s"}`; };
    if (room <= 0) return "That bar is full";
    return `${name} needs ${beats(ev.d)} but only ${beats(room)} ${room === 4 ? "is" : "are"} left there`;
  }

  // First free place on a stave where a value of length d fits (for "tap a key to add the next note").
  function nextFree(tune, d, st = 0) {
    const slots = totalSlots(tune), snap = d >= 4 ? 4 : d === 3 ? 1 : d;
    for (let s = 0; s + d <= slots; s += snap) if (fits(tune, { s, d, st })) return s;
    return -1;
  }
  const STEP_SEMIS = SEMIS;
  window.TUNE = { VALUES, LEVELS, levelOf, rangeFor, stavesOf, BPM, KEY_NAMES, DYNAMICS, tieTarget, INSTRUMENTS, setInstrument, valueFor, slotsPerBar, totalSlots, normalize, letters, pitchName, play, stop, ping, scoreSvg, valueGlyph, hitTest, fits, settle, whyNot, nextFree, beatsText, unlock: audio, STEP_NAMES, STEP_SEMIS };
})();
