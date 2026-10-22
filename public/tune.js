/* Eyes Up — "Make a Tune": one stave, one sound, shared by the student
   device, the projector and the teacher's screens.

   A tune is an array, one entry per beat: a note index 0–7 (C D E F G A B C')
   or null for a rest. Colours follow the Boomwhacker / hand-bell convention
   most primary classrooms already know. */

(function () {
  const NOTES = [
    { name: "C", freq: 261.63, color: "#e03131" },
    { name: "D", freq: 293.66, color: "#f08c00" },
    { name: "E", freq: 329.63, color: "#f5c400" },
    { name: "F", freq: 349.23, color: "#74c042" },
    { name: "G", freq: 392.0, color: "#1aa37a" },
    { name: "A", freq: 440.0, color: "#5f3dc4" },
    { name: "B", freq: 493.88, color: "#d6336c" },
    { name: "C′", freq: 523.25, color: "#ff6b6b" },
  ];
  // Which notes a class may use: a gentle three, the can't-go-wrong five, or all eight.
  const NOTE_SETS = { three: [0, 1, 2], penta: [0, 1, 2, 4, 5], all: [0, 1, 2, 3, 4, 5, 6, 7] };
  const BPM = 100;

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
  // Browsers only let a page make sound after someone has touched it; make the first touch count.
  ["pointerdown", "keydown", "touchstart"].forEach((ev) => document.addEventListener(ev, () => audio(), { passive: true }));

  function ping(i, when, dur = 0.45) {
    const ac = audio();
    if (!ac || i == null || !NOTES[i]) return;
    const t = when ?? ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = NOTES[i].freq;
    // Soft bell-ish envelope: quick in, gentle out.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  let playing = null; // {timers:[], onDone}
  function stop() {
    if (!playing) return;
    playing.timers.forEach(clearTimeout);
    const done = playing.onDone;
    playing = null;
    done && done();
  }
  // Plays a tune; calls onBeat(index) as each beat lands (-1 at the end) so screens can bounce along.
  function play(notes, { onBeat, onDone, bpm = BPM } = {}) {
    stop();
    const ac = audio();
    const beat = 60 / bpm;
    const start = ac ? ac.currentTime + 0.05 : 0;
    const timers = [];
    notes.forEach((n, k) => {
      if (ac && n != null) ping(n, start + k * beat, beat);
      timers.push(setTimeout(() => onBeat && onBeat(k), 50 + k * beat * 1000));
    });
    timers.push(setTimeout(() => { playing = null; onBeat && onBeat(-1); onDone && onDone(); }, 50 + notes.length * beat * 1000 + 150));
    playing = { timers, onDone };
    return notes.length * beat * 1000;
  }

  /* ---------- the stave ---------- */
  // y of a pitch on a five-line stave whose bottom line (E) sits at `base`.
  const STEP = 7;
  const yOf = (i, base) => base - (i - 2) * STEP;

  // SVG of a stave with the notes on it. opts: {slots, active, ghost, width, idPrefix}
  //   slots  — draw tappable beat columns (student editor)
  //   active — beat index to highlight while playing
  function staffSvg(notes, opts = {}) {
    const beats = notes.length;
    const left = 44, right = 14, col = opts.compact ? 26 : 38;
    const w = left + beats * col + right;
    const base = 78, top = base - 4 * (STEP * 2);
    const lines = [0, 1, 2, 3, 4].map((k) => `<line x1="${left - 30}" y1="${base - k * STEP * 2}" x2="${w - right + 6}" y2="${base - k * STEP * 2}" stroke="currentColor" stroke-width="1.2" opacity="0.6"/>`);
    const bars = [];
    for (let b = 4; b < beats; b += 4) bars.push(`<line x1="${left + b * col - col / 2}" y1="${top}" x2="${left + b * col - col / 2}" y2="${base}" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>`);
    const clef = `<text x="${left - 32}" y="${base + 6}" font-size="44" font-family="serif" fill="currentColor" opacity="0.85">𝄞</text>`;
    const cells = [];
    for (let b = 0; b < beats; b++) {
      const x = left + b * col;
      const n = notes[b];
      const isActive = opts.active === b;
      if (opts.slots) cells.push(`<rect class="tune-slot ${n == null ? "empty" : ""}" data-beat="${b}" x="${x - col / 2}" y="${top - 18}" width="${col}" height="${base - top + 36}" rx="6" fill="${isActive ? "rgba(255,255,255,0.12)" : "transparent"}" />`);
      else if (isActive) cells.push(`<rect x="${x - col / 2}" y="${top - 14}" width="${col}" height="${base - top + 28}" rx="6" fill="currentColor" opacity="0.12"/>`);
      if (n == null) {
        // Editor: an empty slot shows a faint "+"; a finished tune shows a rest as a small block on the middle line.
        if (opts.slots) cells.push(`<text class="tune-rest" data-beat="${b}" x="${x}" y="${base - 2 * STEP + 5}" text-anchor="middle" font-size="14" fill="currentColor" opacity="0.35" font-weight="800">+</text>`);
        else cells.push(`<rect x="${x - 6}" y="${base - 2 * STEP - 4}" width="12" height="7" rx="2" fill="currentColor" opacity="0.5"/>`);
        continue;
      }
      const y = yOf(n, base);
      const color = NOTES[n].color;
      const up = n < 5;
      const ledger = n === 0 ? `<line x1="${x - 11}" y1="${y}" x2="${x + 11}" y2="${y}" stroke="currentColor" stroke-width="1.4" opacity="0.7"/>` : "";
      const stem = up
        ? `<line x1="${x + 7}" y1="${y - 1}" x2="${x + 7}" y2="${y - 30}" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`
        : `<line x1="${x - 7}" y1="${y + 1}" x2="${x - 7}" y2="${y + 30}" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`;
      cells.push(`<g class="tune-note ${isActive ? "active" : ""}" data-beat="${b}" data-note="${n}">${ledger}${stem}
        <ellipse cx="${x}" cy="${y}" rx="9" ry="6.5" fill="${color}" stroke="${isActive ? "#fff" : "rgba(0,0,0,0.25)"}" stroke-width="${isActive ? 2.5 : 1}" transform="rotate(-18 ${x} ${y})"/>
        <text x="${x}" y="${y + 3}" text-anchor="middle" font-size="8" font-weight="800" fill="#fff" style="pointer-events:none">${NOTES[n].name}</text></g>`);
    }
    return `<svg class="tune-staff" viewBox="0 0 ${w} ${base + 28}" width="100%" style="max-width:${w * 2}px;display:block" aria-label="tune">${lines.join("")}${bars.join("")}${clef}${cells.join("")}</svg>`;
  }

  const letters = (notes) => notes.map((n) => (n == null ? "–" : NOTES[n].name)).join(" ");

  window.TUNE = { NOTES, NOTE_SETS, BPM, play, stop, ping, staffSvg, letters, unlock: audio };
})();
