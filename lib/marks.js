/* Eyes Up — marking, in one place for the server and the results pages.

   Names are people, not connections: canonName() is how every page and the
   server decide two answers came from the same student. markMatch() is the
   forgiving comparison used live and afterwards (case, spaces, 3 vs 3.0).

   Marking after the lesson: a teacher can set the right answer once the
   lesson is over (item.key) and overrule any one student's mark by hand
   (item.manual, keyed by canonical name). applyMarks() recomputes every
   student's mark from the stored answer text — live mark, then the key,
   then the hand mark — so it works on lessons saved long before this
   existed. row.ok0 / row.score0 / item.dist0 keep what was there live, so a
   key can be cleared again.

   Loads with require() on the server and as window.Marks in the browser. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Marks = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const canonName = (n) => String(n || "").trim().toLowerCase().replace(/\s+/g, " ");

  function markMatch(attempt, target) {
    const a = String(attempt || "").trim().toLowerCase();
    const t = String(target || "").trim().toLowerCase();
    if (!a) return false;
    if (a === t) return true;
    const na = Number(a.replace(",", "."));
    const nt = Number(t.replace(",", "."));
    return Number.isFinite(na) && Number.isFinite(nt) && Math.abs(na - nt) < 1e-9;
  }
  const anyMatch = (answer, accept) => (accept || []).some((a) => markMatch(answer, a));

  // Which kind of answer key an activity can take after the lesson.
  const KEY_CHOICE = new Set(["multi_choice", "true_false", "this_or_that", "picture_vote", "poll", "example_nonexample"]);
  const KEY_TEXT = new Set([
    "short_answer", "predict", "exit_ticket", "retrieval_sprint", "spot_mistake", "teach_back", "give_example",
    "make_connection", "finish_sentence", "quick_challenge", "picture_prompt", "long_response",
    "working", "counters", "maths_board", "image_caption", "image_long", "one_word",
  ]);
  const keyKind = (mode) => (KEY_CHOICE.has(mode) ? "choice" : mode === "question_set" ? "set" : KEY_TEXT.has(mode) ? "text" : null);

  // Clean a key sent by the teacher's page; null means "no key".
  function cleanKey(mode, key) {
    if (key === null || key === undefined) return null;
    const kind = keyKind(mode);
    const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
    const list = (v) => (Array.isArray(v) ? v.map((x) => str(x, 120)).filter(Boolean).slice(0, 12) : []);
    if (kind === "choice") { const label = str(key.label, 200); return label ? { label } : null; }
    if (kind === "text") { const accept = list(key.accept); return accept.length ? { accept } : null; }
    if (kind === "set") {
      const parts = (Array.isArray(key.parts) ? key.parts : []).slice(0, 20).map((p) => { const l = list(p); return l.length ? l : null; });
      return parts.some(Boolean) ? { parts } : null;
    }
    return null;
  }

  // The part of a stored answer line that an answer key applies to.
  function answerTextOf(item, row) {
    const r = String(row.response || "");
    if (item.mode === "example_nonexample") return r.split(" — ")[0];
    if (item.mode === "working" || item.mode === "counters") {
      const tail = r.includes("  →  ") ? r.split("  →  ").pop() : r;
      return tail.replace(/ [✓✗]$/, "").trim();
    }
    if (item.mode === "maths_board") return r.replace(/^\(board\)\s*/, "").trim();
    if (item.mode === "image_caption" || item.mode === "image_long") return r.replace(/^\((?:\d+ images|image)\)\s*/, "").trim();
    return r;
  }

  // Question Set answers are stored as "Q1: …   |   Q2: …" — back to parts.
  const parts = (resp) => String(resp || "").split(/\s{2,}\|\s{2,}/).map((p) => p.replace(/^Q\d+:\s*/, ""));

  function keyMark(item, row) {
    const key = item.key;
    if (!key) return null;
    const kind = keyKind(item.mode);
    if (kind === "choice") return typeof key.label === "string" ? { ok: answerTextOf(item, row) === key.label } : null;
    if (kind === "set") {
      const given = parts(row.response);
      const keyed = (key.parts || []).map((acc, k) => ({ acc, k })).filter(({ acc }) => Array.isArray(acc) && acc.length);
      if (!keyed.length) return null;
      const right = keyed.filter(({ acc, k }) => anyMatch(given[k], acc)).length;
      return { ok: right === keyed.length, score: `${right}/${keyed.length}` };
    }
    if (kind === "text" && Array.isArray(key.accept) && key.accept.length) return { ok: anyMatch(answerTextOf(item, row), key.accept) };
    return null;
  }

  // Recompute every student's mark on one stored item. Safe to run any number of times.
  function applyMarks(item) {
    const manual = item.manual || {};
    for (const row of item.students || []) {
      if (row.ok0 === undefined) row.ok0 = row.ok === undefined ? null : row.ok;
      if (row.score0 === undefined) row.score0 = row.score === undefined ? null : row.score;
      let ok = row.ok0, score = row.score0;
      const km = keyMark(item, row);
      if (km) { ok = km.ok; score = km.score ?? null; }
      const k = canonName(row.name);
      if (row.name && Object.prototype.hasOwnProperty.call(manual, k)) ok = manual[k];
      if (ok === true || ok === false) row.ok = ok; else delete row.ok;
      if (score) row.score = score; else delete row.score;
    }
    // The answer bars follow the key; dist0 keeps the labels as they were live.
    const kind = keyKind(item.mode);
    if (Array.isArray(item.distribution) && (kind === "choice" || kind === "text")) {
      if (!item.dist0) item.dist0 = item.distribution.map((d) => d.label);
      item.distribution.forEach((d, j) => {
        const live = item.dist0[j] ?? d.label;
        if (!item.key) { d.label = live; return; }
        const base = live.replace(/ [✓✗]$/, "");
        const ok = kind === "choice" ? base === item.key.label : anyMatch(base, item.key.accept);
        d.label = base + (ok ? " ✓" : kind === "text" ? " ✗" : "");
      });
    }
    item.marked = !!(item.key || Object.keys(manual).length);
    return item;
  }

  // Fold one edit from the teacher's page — { key?: {...}|null, manual?: { name: true|false|null } } —
  // into an activity's after-lesson marks. Returns { key?, manual? }, or null when none are left.
  function mergeRetro(mode, current, e) {
    let key = current?.key || null;
    const manual = { ...(current?.manual || {}) };
    if (e && Object.prototype.hasOwnProperty.call(e, "key")) key = cleanKey(mode, e.key);
    if (e?.manual && typeof e.manual === "object") {
      for (const [name, v] of Object.entries(e.manual).slice(0, 200)) {
        const k = canonName(name).slice(0, 80);
        if (!k) continue;
        if (v === true || v === false) manual[k] = v; else delete manual[k];
      }
    }
    const out = {};
    if (key) out.key = key;
    if (Object.keys(manual).length) out.manual = manual;
    return Object.keys(out).length ? out : null;
  }

  // The same, applied straight to a stored item, which is then re-marked.
  function mergeMarks(item, e) {
    const r = mergeRetro(item.mode, item, e);
    if (r?.key) item.key = r.key; else delete item.key;
    if (r?.manual) item.manual = r.manual; else delete item.manual;
    return applyMarks(item);
  }

  return { canonName, canonical: canonName, markMatch, parts, KEY_CHOICE, KEY_TEXT, keyKind, cleanKey, keyMark, applyMarks, mergeRetro, mergeMarks };
});
