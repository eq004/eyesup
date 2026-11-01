/* Eyes Up — one clean view of a stored lesson, shared by the data page,
   the printable report and the lesson dashboard.

   Stored summaries differ by age: newer ones carry per-student ✓/✗ marks,
   a name-based roster and "ghost" flags for re-launched questions; older
   ones don't. normalise() fills those in from what is there, so every
   page can trust the same fields:

     s.roster        — unique student names (people, not connections)
     s.joinedCount / s.participatedCount — counted by name
     item.noResponse — de-duplicated, never lists someone who answered
     item.ghost      — an empty re-launch of a question asked again later
     item.students[].ok / .score — right / wrong where the mode has a key

   students(s) turns that into one row per student with every answer. */

(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const canonical = (n) => String(n || "").trim().toLowerCase().replace(/\s+/g, " ");
  const SKIP = new Set(["link", "slide", "deck"]);

  // Marks for older lessons, read back from the stored answer text.
  function legacyMark(it, row) {
    const r = String(row.response || "");
    if (it.distribution && !["spelling", "cloze", "phonics_cloze", "working", "counters", "tick_boxes"].includes(it.mode)) {
      const right = it.distribution.find((d) => /\s✓$/.test(d.label));
      if (!right) return {};
      return { ok: r === right.label.replace(/\s✓$/, "") };
    }
    if (["spelling", "cloze", "phonics_cloze"].includes(it.mode)) {
      const good = (r.match(/ ✓/g) || []).length, bad = (r.match(/ ✗/g) || []).length;
      if (!good && !bad) return {};
      return { ok: bad === 0, score: `${good}/${good + bad}` };
    }
    if (it.mode === "working" || it.mode === "counters") {
      if (/ ✓$/.test(r)) return { ok: true };
      if (/ ✗$/.test(r)) return { ok: false };
      return {};
    }
    if (it.mode === "match_up") {
      const m = r.match(/^(\d+)\/(\d+) matched/);
      if (!m) return {};
      return { ok: m[1] === m[2], score: `${m[1]}/${m[2]}` };
    }
    return {};
  }

  function normalise(s) {
    if (!s || s._normalised) return s;
    const items = s.items || [];
    const roster = new Map(); // canonical -> display name
    const add = (n) => { if (n && !roster.has(canonical(n))) roster.set(canonical(n), n); };
    (s.roster || []).forEach(add);
    items.forEach((it) => { (it.students || []).forEach((x) => add(x.name)); (it.noResponse || []).forEach(add); });

    const answeredEver = new Set();
    items.forEach((it) => {
      // One answer per student: a re-joined device answering again replaces the first.
      if (!it.anonymous && (it.students || []).some((x) => x.name)) {
        const last = new Map();
        it.students.forEach((x) => last.set(canonical(x.name), x));
        it.students = [...last.values()];
        it.responses = it.students.length;
      }
      const answered = new Set((it.students || []).map((x) => canonical(x.name)).filter(Boolean));
      answered.forEach((k) => answeredEver.add(k));
      if (it.noResponse) {
        const seen = new Set();
        it.noResponse = it.noResponse.filter((n) => {
          const k = canonical(n);
          if (!k || answered.has(k) || seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      }
      // Fill in marks the server didn't store at the time.
      (it.students || []).forEach((x) => {
        if (x.ok === undefined) {
          const m = legacyMark(it, x);
          if (m.ok !== undefined) { x.ok = m.ok; if (m.score) x.score = m.score; }
        }
      });
      it.markable = (it.students || []).some((x) => x.ok === true || x.ok === false);
    });

    // Ghost launches: same question, same mode, an emptier copy.
    items.forEach((it, i) => {
      if (it.ghost !== undefined) return;
      it.ghost = false;
      if ((it.responses || 0) > 1 || SKIP.has(it.mode)) return;
      it.ghost = items.some((o, j) => j !== i && o.mode === it.mode && (o.prompt || "") === (it.prompt || "") && (o.responses || 0) > (it.responses || 0));
    });
    s.ghostCount = items.filter((it) => it.ghost).length;

    if (roster.size) {
      s.roster = [...roster.values()].sort((a, b) => a.localeCompare(b));
      s.joinedCount = roster.size;
      // Counted by name too. Only when every activity was anonymous is there
      // nothing to count by name — then the stored number stands.
      const anyNamed = items.some((it) => (it.students || []).some((x) => x.name));
      if (anyNamed) s.participatedCount = answeredEver.size;
      else s.participatedCount = Math.min(s.participatedCount || 0, roster.size);
    }
    s._normalised = true;
    return s;
  }

  // The activities a teacher wants to see: ghosts folded away unless asked.
  const shown = (s, withGhosts) => (s.items || []).filter((it) => withGhosts || !it.ghost);

  // Lesson name: the title, else the first question asked, else the code.
  function title(x) {
    const t = x.title || x.meta?.title;
    if (t) return t;
    const fp = x.first_prompt || x.meta?.first_prompt || (x.items || x.summary?.items || []).find((it) => it.prompt && !SKIP.has(it.mode))?.prompt;
    if (fp) return fp.length > 70 ? fp.slice(0, 68).trimEnd() + "…" : fp;
    const code = x.code || x.meta?.code;
    return code ? `Lesson ${code}` : "Lesson";
  }

  // One row per student: what they answered on every counted activity.
  function students(s) {
    normalise(s);
    const items = shown(s).map((it, i) => ({ it, i }));
    const counted = items.filter(({ it }) => !it.anonymous && !SKIP.has(it.mode));
    const byName = new Map();
    (s.roster || []).forEach((n) => byName.set(canonical(n), { name: n, n: 0, right: 0, wrong: 0, answers: [] }));
    counted.forEach(({ it, i }) => {
      const seen = new Set();
      (it.students || []).forEach((x) => {
        if (!x.name) return;
        const k = canonical(x.name);
        if (seen.has(k)) return; // a re-joined device answering twice counts once
        seen.add(k);
        if (!byName.has(k)) byName.set(k, { name: x.name, n: 0, right: 0, wrong: 0, answers: [] });
        const row = byName.get(k);
        row.n += 1;
        if (x.ok === true) row.right += 1;
        if (x.ok === false) row.wrong += 1;
        const pics = (it.images || []).filter((im) => canonical(im.name) === k).map((im) => im.image);
        row.answers.push({ index: i, item: it, response: x.response, ok: x.ok, score: x.score, images: pics });
      });
    });
    const markable = counted.filter(({ it }) => it.markable).length;
    const rows = [...byName.values()].map((r) => {
      const have = new Set(r.answers.map((a) => a.index));
      r.missed = counted.filter(({ i }) => !have.has(i)).map(({ it, i }) => ({ index: i, item: it }));
      return r;
    });
    return { total: counted.length, markable, rows };
  }

  // Which kind of answer key an activity can take after the lesson.
  const KEY_CHOICE = new Set(["multi_choice", "true_false", "this_or_that", "picture_vote", "poll", "example_nonexample"]);
  const KEY_TEXT = new Set(["short_answer", "predict", "exit_ticket", "retrieval_sprint", "spot_mistake", "teach_back", "give_example",
    "make_connection", "finish_sentence", "quick_challenge", "picture_prompt", "long_response", "working", "counters", "maths_board", "image_caption", "image_long", "one_word"]);
  const keyKind = (it) => it.anonymous || SKIP.has(it.mode) ? null : KEY_CHOICE.has(it.mode) ? "choice" : it.mode === "question_set" ? "set" : KEY_TEXT.has(it.mode) ? "text" : "hand";

  // ✓ / ✗ a teacher can tap to mark one student's answer by hand.
  const markButtons = (i, name, x, byHand) => `<span class="mkb" data-mark="${i}" data-name="${esc(canonical(name))}" title="${byHand ? "Marked by hand — tap the lit one to undo" : "Tap to mark right or wrong"}">
      <button type="button" data-v="1" class="${x?.ok === true ? "on" : ""}" aria-label="Right">✓</button><button type="button" data-v="0" class="${x?.ok === false ? "on" : ""}" aria-label="Not right">✗</button></span>`;
  const byHand = (it, name) => !!(it.manual && Object.prototype.hasOwnProperty.call(it.manual, canonical(name)));

  const mark = (x) => x?.ok === true ? `<span class="lv-ok" title="Right">✓</span>` : x?.ok === false ? `<span class="lv-no" title="Not right">✗</span>` : "";
  const label = (it, i, names) => `${i + 1}. ${names?.(it.mode, it.counterKind) || it.mode}${it.prompt ? ` — ${it.prompt}` : ""}`;

  // Spreadsheet: one row per student, one column per activity.
  function csv(s, lessonTitle, when, names) {
    const { total, rows } = students(s);
    const cols = shown(s).map((it, i) => ({ it, i })).filter(({ it }) => !it.anonymous && !SKIP.has(it.mode));
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Student", "Answered", "Out of", "Right", "Wrong", ...cols.map(({ it, i }) => label(it, i, names))];
    const lines = [[q(lessonTitle), q(when)].join(","), "", head.map(q).join(",")];
    rows.sort((a, b) => a.name.localeCompare(b.name)).forEach((r) => {
      const byIdx = new Map(r.answers.map((a) => [a.index, a]));
      lines.push([
        q(r.name), r.n, total, r.right, r.wrong,
        ...cols.map(({ i }) => {
          const a = byIdx.get(i);
          if (!a) return q("");
          const flag = a.ok === true ? "✓ " : a.ok === false ? "✗ " : "";
          return q(`${flag}${a.response || ""}${a.score ? ` (${a.score})` : ""}`);
        }),
      ].join(","));
    });
    return "﻿" + lines.join("\r\n");
  }

  function download(name, text, type = "text/csv;charset=utf-8") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // Question Set answers are stored as "Q1: …   |   Q2: …" — back to parts.
  const parts = (resp) => String(resp || "").split(/\s{2,}\|\s{2,}/).map((p) => p.replace(/^Q\d+:\s*/, ""));

  const CSS = `
  .lv-ok, .lv-no { display:inline-block; min-width:1.35em; text-align:center; border-radius:6px; font-weight:800; font-size:0.78rem; padding:0.05rem 0.3rem; margin-right:0.35rem; vertical-align:middle; }
  .lv-ok { background:#e3f4ea; color:#1f6b46; } .lv-no { background:#f9e3e3; color:#8f2f2f; }
  .lv-ghosts { font-size:0.8rem; color:#74829a; margin:0.4rem 0 0.9rem; }
  .lv-ghosts button { font:inherit; font-weight:700; color:#1d3f78; background:none; border:none; cursor:pointer; padding:0; }
  .lv-grid { overflow-x:auto; } .lv-grid table { border-collapse:collapse; font-size:0.84rem; width:100%; }
  .lv-grid th, .lv-grid td { text-align:left; padding:0.35rem 0.5rem; border-bottom:1px solid #e5eaf2; vertical-align:top; }
  .lv-grid th { font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em; color:#74829a; }
  .lv-grid td:first-child { font-weight:700; white-space:nowrap; }
  .mkb { display:inline-flex; border:1px solid #d5dce8; border-radius:7px; overflow:hidden; margin-right:0.4rem; vertical-align:middle; }
  .mkb button { font:inherit; font-size:0.74rem; font-weight:800; line-height:1.3; padding:0.08rem 0.42rem; border:none; background:#fff; color:#b3bccb; cursor:pointer; }
  .mkb button + button { border-left:1px solid #e5eaf2; }
  .mkb button:hover { background:#f2f5fa; color:#435169; }
  .mkb button.on[data-v="1"] { background:#e3f4ea; color:#1f6b46; } .mkb button.on[data-v="0"] { background:#f9e3e3; color:#8f2f2f; }
  .lv-key { margin:0.2rem 0 0.8rem; font-size:0.86rem; border:1px dashed #cfd7e4; border-radius:10px; background:#fbfcfe; }
  .lv-key summary { cursor:pointer; padding:0.5rem 0.8rem; font-weight:700; color:#1d3f78; list-style:none; }
  .lv-key summary::-webkit-details-marker { display:none; }
  .lv-key summary .lv-after { margin-left:0.5rem; }
  .lv-key .lv-keybody { padding:0 0.8rem 0.7rem; display:flex; flex-wrap:wrap; gap:0.4rem; align-items:center; }
  .lv-key .lv-keybody small { flex-basis:100%; color:#74829a; }
  .lv-chip { font:inherit; font-size:0.84rem; font-weight:700; padding:0.3rem 0.7rem; border-radius:999px; border:1.5px solid #cfd7e4; background:#fff; color:#243655; cursor:pointer; }
  .lv-chip:hover { border-color:#1d3f78; } .lv-chip.on { background:#e3f4ea; border-color:#1f6b46; color:#1f6b46; }
  .lv-key input { font:inherit; font-size:0.86rem; padding:0.35rem 0.55rem; border:1.5px solid #cfd7e4; border-radius:8px; min-width:12rem; flex:1 1 14rem; }
  .lv-key label { display:flex; flex-direction:column; gap:0.15rem; font-weight:700; flex:1 1 12rem; }
  .lv-key label span { font-size:0.74rem; color:#74829a; }
  .lv-key .lv-save { font:inherit; font-weight:800; padding:0.35rem 0.8rem; border-radius:8px; border:none; background:#1d3f78; color:#fff; cursor:pointer; }
  .lv-key .lv-clear { font:inherit; font-weight:700; padding:0.35rem 0.6rem; border-radius:8px; border:1px solid #cfd7e4; background:#fff; color:#74829a; cursor:pointer; }
  .lv-after { display:inline-block; font-size:0.72rem; font-weight:700; color:#8a5a10; background:#fff3dc; border-radius:6px; padding:0.05rem 0.4rem; vertical-align:middle; }
  @media print { .lv-ghosts, .lv-key { display:none !important; } .mkb { border:none; } .mkb button:not(.on) { display:none; } .mkb button.on { border-radius:6px; } }`;
  function css() {
    if (document.getElementById("lv-css")) return;
    const st = document.createElement("style");
    st.id = "lv-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  window.LV = { esc, canonical, normalise, shown, title, students, mark, markButtons, byHand, keyKind, csv, download, parts, css, SKIP };
})();
