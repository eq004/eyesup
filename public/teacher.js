/* Eyes Up — teacher dashboard */

const MODES = {
  /* fast votes */
  multi_choice:  { icon: "🅰️", name: "Multiple Choice", hint: "Quiz question — reveal the answer after voting", opts: { min: 2, max: 5, labels: "Option" }, hasCorrect: true },
  poll:          { icon: "📊", name: "Poll",          hint: "2–5 options, live results",       opts: { min: 2, max: 5, labels: "Option" } },
  agree_disagree:{ icon: "⚖️", name: "Agree / Disagree", hint: "Agree · Unsure · Disagree",    opts: null },
  true_false:    { icon: "✅", name: "True or False", hint: "Two buttons, instant",            opts: null },
  this_or_that:  { icon: "⚡", name: "This or That",  hint: "Two big options, fast",           opts: { min: 2, max: 2, labels: "Choice" } },
  confidence:    { icon: "🎯", name: "Confidence",    hint: "Got it · Nearly · Confused",      opts: null },
  example_nonexample: { icon: "↔️", name: "Example / Non-example", hint: "Which fits the concept — and why?", opts: { min: 2, max: 2, labels: "Item" } },
  smiley:        { icon: "😊", name: "Smiley Review", hint: "5 faces, happiest to saddest — one tap", opts: null,
                   ph: "What are they reviewing? e.g. “How was today's lesson?”" },
  scale:         { icon: "🎚️", name: "Scale",        hint: "Students place a marker along a line", opts: { min: 0, max: 2, labels: "End" },
                   ph: "The statement or question they're placing themselves on" },
  /* words & ideas */
  word_cloud:    { icon: "☁️", name: "Word Cloud",    hint: "Words build a live cloud",        opts: null, multiOpt: true },
  one_word:      { icon: "🗣️", name: "One Word",     hint: "Exactly one word each",           opts: null },
  mindmap:       { icon: "🕸️", name: "Mindmap",      hint: "Ideas branch around a concept",   opts: null,
                   ph: "The central concept, e.g. “Generative AI”", multiOpt: true },
  post_its:      { icon: "🗒️", name: "Post-its",     hint: "Sticky notes fill the board — screened or straight up", opts: null, postits: true, multiOpt: true },
  /* written recall */
  short_answer:  { icon: "✏️", name: "Short Answer",  hint: "Written replies, reveal in turn", opts: null },
  picture_prompt:{ icon: "🖼️", name: "Picture Prompt", hint: "Put an image up — students write about it", opts: null, imageUpload: true,
                   ph: "The question about the image — or ask it aloud" },
  retrieval_sprint:{ icon: "🧠", name: "Retrieval Sprint", hint: "60 seconds — write everything you recall", opts: null },
  exit_ticket:   { icon: "🎟️", name: "Exit Ticket",  hint: "One thing learned before you leave", opts: null },
  finish_sentence:{ icon: "📝", name: "Finish the Sentence", hint: "Students complete your stem", opts: null,
                   needPrompt: true, ph: "The sentence stem, e.g. “An AI hallucination is…”" },
  give_example:  { icon: "💡", name: "Give an Example", hint: "Apply the idea to something new", opts: null },
  make_connection:{ icon: "🔗", name: "Make a Connection", hint: "Link today's idea to something else", opts: null },
  teach_back:    { icon: "🧑‍🏫", name: "Teach It Back", hint: "Explain it as if teaching someone", opts: null },
  spot_mistake:  { icon: "🔎", name: "Spot the Mistake", hint: "Find and explain the error",    opts: null,
                   ph: "The statement containing a mistake" },
  quick_challenge:{ icon: "🚀", name: "Quick Challenge", hint: "One short problem to prove it", opts: null,
                   ph: "The problem — or set it verbally / on the board" },
  predict:       { icon: "🔮", name: "Predict",       hint: "Guess before the reveal",         opts: null },
  /* reflect */
  three_two_one: { icon: "3️⃣", name: "3 – 2 – 1",    hint: "3 ideas · 2 connections · 1 question", opts: null },
  notice_wonder: { icon: "👀", name: "Notice / Wonder", hint: "What do you notice? Wonder?",   opts: null },
  before_after:  { icon: "🔄", name: "Before / After", hint: "How has your thinking changed?", opts: null },
  muddiest_point:{ icon: "🌫️", name: "Muddiest Point", hint: "Anonymous — least clear thing", opts: null },
  ask_question:  { icon: "❓", name: "Ask a Question", hint: "Anonymous — what's still fuzzy?", opts: null },
  /* arrange & match */
  ranking:       { icon: "🔢", name: "Ranking",       hint: "Class orders by importance",      opts: { min: 2, max: 6, labels: "Item" } },
  put_in_order:  { icon: "🪜", name: "Put in Order",  hint: "Sequence steps or events — enter them in the CORRECT order", opts: { min: 2, max: 6, labels: "Step" } },
  match_up:      { icon: "🧩", name: "Match Up",      hint: "Match terms to definitions or examples", pairs: { min: 2, max: 6 } },
  venn:          { icon: "◉", name: "Venn Diagram",   hint: "Sort ideas into two overlapping circles", opts: { min: 2, max: 2, labels: "Circle" },
                   ph: "The sorting question, e.g. “Which features belong where?”", multiOpt: true },
  /* draw */
  sketch:        { icon: "🎨", name: "Sketch It",     hint: "Draw understanding instead of writing", opts: null },
  annotate:      { icon: "🖍️", name: "Annotate",     hint: "Upload an image — students draw on it", opts: null, imageUpload: true,
                   ph: "What should they mark up? e.g. “Circle the error / label the diagram”" },
};

const CATEGORIES = [
  { label: "⚡ Fast votes", modes: ["multi_choice", "poll", "agree_disagree", "true_false", "this_or_that", "confidence", "smiley", "scale", "example_nonexample"] },
  { label: "☁️ Words & ideas", modes: ["word_cloud", "one_word", "mindmap", "post_its"] },
  { label: "✏️ Written recall", modes: ["short_answer", "picture_prompt", "retrieval_sprint", "exit_ticket", "finish_sentence", "give_example", "make_connection", "teach_back", "spot_mistake", "quick_challenge", "predict"] },
  { label: "🪞 Reflect", modes: ["three_two_one", "notice_wonder", "before_after", "muddiest_point", "ask_question"] },
  { label: "🧩 Arrange & match", modes: ["ranking", "put_in_order", "match_up", "venn"] },
  { label: "🎨 Draw", modes: ["sketch", "annotate"] },
];

const TEXT_MODES = new Set(["short_answer", "predict", "ask_question", "exit_ticket", "muddiest_point", "retrieval_sprint", "spot_mistake", "teach_back", "give_example", "make_connection", "finish_sentence", "quick_challenge", "picture_prompt"]);
const WORD_MODES = new Set(["word_cloud", "one_word", "mindmap"]);
const STRUCTURED = new Set(["three_two_one", "notice_wonder", "before_after"]);
const ANON_MODES = new Set(["ask_question", "muddiest_point"]);
// Modes where the teacher gates responses onto the projector.
const revealMode = (m) =>
  TEXT_MODES.has(m) || STRUCTURED.has(m) || m === "sketch" || m === "annotate" || m === "example_nonexample" || m === "post_its";

const $ = (id) => document.getElementById(id);
let ws = null;
let state = null;
let composerModeKey = null;

/* ---------------- connection ---------------- */

function teacherPw() {
  return sessionStorage.getItem("eyesup_pw") || "";
}

function attach() {
  const code = sessionStorage.getItem("eyesup_teacher_code");
  if (code) ws.send(JSON.stringify({ type: "teacher_resume", code, password: teacherPw() }));
  else ws.send(JSON.stringify({ type: "teacher_create", password: teacherPw() }));
}

function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onopen = attach;
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "error" && msg.error === "bad_password") {
      $("pwError").style.display = teacherPw() ? "block" : "none";
      sessionStorage.removeItem("eyesup_pw");
      $("pwOverlay").classList.add("show");
      $("pwInput").focus();
      return;
    }
    if (msg.type === "error" && msg.error === "no_session") {
      sessionStorage.removeItem("eyesup_teacher_code");
      ws.send(JSON.stringify({ type: "teacher_create", password: teacherPw() }));
      return;
    }
    if (msg.type === "summary") return renderSummary(msg);
    if (msg.type === "state") {
      state = msg;
      $("pwOverlay").classList.remove("show");
      sessionStorage.setItem("eyesup_teacher_code", state.code);
      render();
    }
  };
  ws.onclose = () => setTimeout(connect, 1200);
}
const send = (obj) => ws && ws.readyState === 1 && ws.send(JSON.stringify(obj));

/* ---------------- toast ---------------- */

let toastTimer = null;
function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

/* ---------------- mode grid & composer ---------------- */

function buildModeGrid() {
  const grid = $("modeGrid");
  grid.innerHTML = "";
  for (const cat of CATEGORIES) {
    const h = document.createElement("div");
    h.className = "mode-cat";
    h.textContent = cat.label;
    grid.appendChild(h);
    for (const key of cat.modes) {
      const m = MODES[key];
      const b = document.createElement("button");
      b.className = "mode-tile";
      b.innerHTML = `<span class="icon">${m.icon}</span><span class="name">${m.name}</span><span class="hint">${m.hint}</span>`;
      // Switching between image modes keeps the image you already loaded.
      b.onclick = () => openComposer(key, !!(MODES[key].imageUpload && composerImage));
      grid.appendChild(b);
    }
  }
}

let composerImage = null;

// Downscale the teacher's image client-side so launches stay snappy.
function loadComposerImage(file, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1000 / img.width, 750 / img.height);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", 0.82));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function setComposerImage(dataUrl) {
  composerImage = dataUrl;
  const p = $("imgPreview");
  if (p) {
    p.src = dataUrl;
    p.style.display = "block";
  }
  const z = $("dropZone");
  if (z) z.textContent = "✓ Image ready — drop another to replace it";
}

function openComposer(key, keepImage) {
  composerModeKey = key;
  if (!keepImage) composerImage = null;
  const m = MODES[key];
  $("composer").classList.add("show");
  $("composerMode").textContent = `${m.icon} ${m.name}`;
  const prompt = $("composerPrompt");
  prompt.value = "";
  prompt.placeholder = m.ph || "Type the question — or leave blank and just ask it aloud";
  const opts = $("composerOpts");
  opts.innerHTML = "";
  if (m.opts) {
    for (let i = 0; i < m.opts.max; i++) {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.maxLength = 80;
      inp.placeholder = `${m.opts.labels} ${i + 1}${i < m.opts.min ? "" : " (optional)"}`;
      inp.dataset.opt = "1";
      opts.appendChild(inp);
    }
  }
  if (m.imageUpload) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="drop-zone" id="dropZone">🖼️ Drop an image here — or click to choose
        <input type="file" id="imgFile" accept="image/*" hidden />
      </div>
      <img id="imgPreview" alt="" style="display:none;margin-top:0.5rem;max-height:120px;border-radius:8px;border:1px solid var(--line)" />`;
    opts.appendChild(wrap);
    $("dropZone").onclick = () => $("imgFile").click();
    $("imgFile").onchange = (e) => {
      const f = e.target.files[0];
      if (f) loadComposerImage(f, setComposerImage);
    };
    if (composerImage) setComposerImage(composerImage); // dropped before opening
  }
  if (m.multiOpt) {
    const multiSel = document.createElement("select");
    multiSel.id = "multiSel";
    multiSel.innerHTML = `
      <option value="1">🙌 Multiple contributions each</option>
      <option value="0">1️⃣ One contribution each</option>`;
    multiSel.style.cssText = "margin-top:0.55rem;border:1px solid #c9d1fb;border-radius:10px;padding:0.5rem 0.7rem;background:#fff;font-size:0.9rem";
    opts.appendChild(multiSel);
  }
  if (m.postits) {
    const modSel = document.createElement("select");
    modSel.id = "modSel";
    modSel.innerHTML = `
      <option value="1">🛡 I approve notes before they appear</option>
      <option value="0">⚡ Notes go straight to the board</option>`;
    modSel.style.cssText = "margin-top:0.55rem;border:1px solid #c9d1fb;border-radius:10px;padding:0.5rem 0.7rem;background:#fff;font-size:0.9rem";
    opts.appendChild(modSel);
  }
  if (m.hasCorrect) {
    const sel = document.createElement("select");
    sel.id = "correctSel";
    sel.innerHTML =
      `<option value="">Correct answer: not set</option>` +
      ["A", "B", "C", "D", "E"].slice(0, m.opts.max).map((L, i) => `<option value="${i}">Correct answer: ${L}</option>`).join("");
    sel.style.cssText = "margin-top:0.55rem;border:1px solid #c9d1fb;border-radius:10px;padding:0.5rem 0.7rem;background:#fff;font-size:0.9rem";
    opts.appendChild(sel);
  }
  if (m.pairs) {
    for (let i = 0; i < m.pairs.max; i++) {
      const row = document.createElement("div");
      row.className = "pair-row";
      row.innerHTML = `
        <input type="text" maxlength="60" data-left="1" placeholder="Term ${i + 1}${i < m.pairs.min ? "" : " (optional)"}" />
        <span class="pair-eq">↔</span>
        <input type="text" maxlength="60" data-right="1" placeholder="Its match" />`;
      opts.appendChild(row);
    }
  }
  $("composerTip").textContent = ANON_MODES.has(key)
    ? "Students submit anonymously — pick ones worth discussing."
    : key === "put_in_order"
    ? "Enter the steps in the correct order — students see them shuffled."
    : key === "retrieval_sprint"
    ? "Responses auto-close after 60 seconds."
    : m.needPrompt
    ? "Students need to read this one on their screen."
    : "Tip: the question can live in your voice. Blank prompt = asked aloud.";
  prompt.focus();
}

function closeComposer() {
  $("composer").classList.remove("show");
  composerModeKey = null;
}

function readComposer() {
  const m = MODES[composerModeKey];
  const prompt = $("composerPrompt").value.trim();
  if (m.needPrompt && !prompt) {
    toast("This mode needs the text typed — students read it on their screen");
    return null;
  }
  let options = null;
  let correct = null;
  if (m.opts) {
    options = [...$("composerOpts").querySelectorAll("input")]
      .map((i) => i.value.trim())
      .filter(Boolean);
    if (options.length < m.opts.min) {
      toast(`Needs at least ${m.opts.min} options`);
      return null;
    }
    if (m.hasCorrect) {
      const v = parseInt($("correctSel")?.value, 10);
      correct = Number.isInteger(v) && v < options.length ? v : null;
    }
  }
  if (m.pairs) {
    options = [...$("composerOpts").querySelectorAll(".pair-row")]
      .map((row) => {
        const l = row.querySelector("[data-left]").value.trim();
        const r = row.querySelector("[data-right]").value.trim();
        return l && r ? `${l} = ${r}` : null;
      })
      .filter(Boolean);
    if (options.length < m.pairs.min) {
      toast(`Needs at least ${m.pairs.min} complete pairs`);
      return null;
    }
  }
  if (m.imageUpload && !composerImage) {
    toast("Choose an image first — that's the thing they'll draw on");
    return null;
  }
  const moderated = m.postits ? $("modSel")?.value !== "0" : undefined;
  const multi = m.multiOpt ? $("multiSel")?.value !== "0" : undefined;
  return { mode: composerModeKey, prompt, options, correct, moderated, multi, image: composerImage || undefined };
}

/* ---------------- rendering ---------------- */

function render() {
  if (!state) return;
  const ti = $("titleInput");
  if (document.activeElement !== ti) ti.value = state.title || "";
  $("codeText").textContent = state.code;
  $("joinUrl").textContent = `${location.host}/join`;
  $("openProjector").href = `/projector?code=${state.code}`;
  $("qrToggle").classList.toggle("primary", !!state.showJoin);
  $("qrToggle").textContent = state.showJoin ? "🔳 QR is up" : "🔳 QR";
  $("studentCount").textContent = state.students.length;
  renderLive();
  renderSequence();
  renderTools();
}

/* ---------------- room tools ---------------- */

function timerLeftMs(t) {
  if (!t) return null;
  return t.paused ? t.remaining : Math.max(0, t.endsAt - Date.now());
}

function fmtTime(ms) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function renderTools() {
  const t = state.timer;
  const controls = $("timerControls");
  if (t) {
    controls.innerHTML = `
      ${t.paused
        ? `<button class="btn mini" data-tact="timer_resume">▶ Resume</button>`
        : `<button class="btn mini" data-tact="timer_pause">⏸ Pause</button>`}
      <button class="btn mini" data-tact="timer_clear">✕ Clear</button>`;
  } else {
    controls.innerHTML = "";
  }
  controls.querySelectorAll("[data-tact]").forEach((b) => (b.onclick = () => send({ type: b.dataset.tact })));
  updateTimerDisplay();

  const focus = state.focus;
  $("pickedName").textContent = focus?.type === "spotlight" ? `→ ${focus.name}` : "";
  $("groupsList").innerHTML =
    focus?.type === "groups"
      ? focus.groups.map((g, i) => `<div class="grp"><b>Group ${i + 1}</b> — ${g.map(esc).join(", ")}</div>`).join("")
      : "";
  $("focusClearRow").innerHTML = focus
    ? `<button class="btn mini" id="clearFocusBtn">✕ Clear the big screen (${focus.type === "spotlight" ? "spotlight" : "groups"})</button>`
    : "";
  const cf = $("clearFocusBtn");
  if (cf) cf.onclick = () => send({ type: "clear_focus" });
}

function updateTimerDisplay() {
  const el = $("timerDisplay");
  const t = state?.timer;
  if (!t) { el.textContent = ""; return; }
  const left = timerLeftMs(t);
  el.textContent = (t.paused ? "⏸ " : "") + (left <= 0 ? "Time's up!" : fmtTime(left));
  el.classList.toggle("urgent", left > 0 && left <= 10000);
}
setInterval(updateTimerDisplay, 250);

function modeTag(mode) {
  const m = MODES[mode] || { icon: "", name: mode };
  return `${m.icon} ${m.name}`;
}

function renderLive() {
  const area = $("liveArea");
  const itx = state.interaction;
  $("liveSub").textContent = "";

  if (!itx) {
    const msg =
      state.phase === "eyesup"
        ? `<p class="big">👀 Eyes up — the class is looking at you.</p><p>Discuss what just came in, then launch the next interaction when ready.</p>`
        : `<p class="big">Nothing live — the room is yours. 🎤</p><p>Teach, question, discuss. Launch an interaction when you want the whole class to respond.</p>`;
    area.innerHTML = `<div class="live-empty">${msg}</div>`;
    return;
  }

  const responded = itx.responses.length;
  const total = state.students.length;
  const isWord = WORD_MODES.has(itx.mode);
  // Unmoderated post-it boards have nothing to approve.
  const canReveal = revealMode(itx.mode) && !(itx.mode === "post_its" && !itx.moderated);
  const agg = itx.aggregate;

  let controls = `
    ${itx.open
      ? `<button class="btn" data-act="close_responses">⏸ Close responses</button>`
      : `<button class="btn" data-act="open_responses">▶ Open responses</button>`}
    ${itx.resultsVisible
      ? `<button class="btn" data-act="hide_results">🙈 Hide results</button>`
      : `<button class="btn" data-act="show_results">📊 Show results</button>`}
    ${canReveal ? `<button class="btn" data-act="reveal_all">✨ Reveal all</button>` : ""}
    ${itx.mode === "multi_choice" && itx.correct != null
      ? itx.answerRevealed
        ? `<button class="btn" disabled>🎯 Answer shown ✓</button>`
        : `<button class="btn" data-act="reveal_answer">🎯 Reveal answer</button>`
      : ""}
    <button class="btn danger-ghost" data-act="clear">Clear</button>
    <button class="btn dark" data-act="eyes_up">👀 EYES UP</button>
  `;

  const whoLabel = (r) => (ANON_MODES.has(itx.mode) ? "🕶 anon" : esc(r.name || ""));
  const revealCards = (renderWhat) => `<div class="responses">${itx.responses
    .map(
      (r) => `
      <div class="resp-card ${r.revealed ? "revealed" : ""}">
        <span class="who">${whoLabel(r)}</span>
        <span class="what">${renderWhat(r)}</span>
        <button class="reveal-btn" data-reveal="${r.studentId}">${r.revealed ? "On screen ✓" : "Reveal →"}</button>
      </div>`
    )
    .join("")}</div>`;

  const bars = (labels, counts, extras = []) => {
    const max = Math.max(1, ...counts);
    return `<div class="agg-bars">${labels
      .map(
        (o, i) => `
        <div class="agg-bar">
          <div class="lbl"><span>${esc(o)}</span><span>${extras[i] != null ? extras[i] + " · " : ""}${counts[i]}</span></div>
          <div class="track"><div class="fill" style="width:${(counts[i] / max) * 100}%"></div></div>
        </div>`
      )
      .join("")}</div>`;
  };

  let body = "";
  if (isWord && agg) {
    body = `<div class="word-chips">${agg.words
      .map((w) => `<span class="word-chip">${esc(w.word)}${w.count > 1 ? `<small>×${w.count}</small>` : ""}</span>`)
      .join("")}</div>`;
  } else if (itx.mode === "example_nonexample" && agg) {
    body =
      bars(itx.options, agg.counts) +
      revealCards((r) =>
        `<b>${esc(itx.options[r.payload.choice])}</b>${r.payload.text ? " — " + esc(r.payload.text) : " <i style='color:var(--muted)'>(no reason given)</i>"}`
      );
  } else if (itx.mode === "post_its") {
    const rows = itx.responses
      .map(
        (r) => `
      <div class="resp-card" style="flex-wrap:wrap">
        <span class="who">${esc(r.name || "")}</span>
        <span class="what" style="display:flex;flex-wrap:wrap;gap:0.35rem">${(r.payload.notes || [])
          .map((n, i) => {
            const on = r.noteRevealed?.[i];
            return itx.moderated
              ? `<button class="note-chip ${on ? "on-board" : ""}" data-note="${r.studentId}|${i}" title="${on ? "Click to take it down" : "Click to approve onto the board"}">${esc(n)} ${on ? "✓" : "→"}</button>`
              : `<span class="note-chip on-board">${esc(n)} ✓</span>`;
          })
          .join("")}</span>
      </div>`
      )
      .join("");
    const boardCount = itx.aggregate?.stickies?.length ?? 0;
    const noteCount = itx.aggregate?.totalNotes ?? 0;
    body = `
      <p style="margin-top:1rem;font-size:0.85rem;color:var(--ink-soft)">
        ${itx.moderated ? `🛡 Screening on — <b>${boardCount}</b> of <b>${noteCount}</b> notes on the board. Click a note to approve it.` : `⚡ Straight to the board — ${noteCount} notes up.`}
      </p>
      <div class="responses">${rows}</div>`;
  } else if (itx.mode === "venn" && agg) {
    const heads = [`${itx.options[0]} only`, "Both", `${itx.options[1]} only`];
    body = `<div class="venn-cols">${agg.regions
      .map(
        (r, i) => `
      <div class="venn-col">
        <div class="venn-head">${esc(heads[i])}</div>
        <div class="word-chips" style="margin-top:0.4rem">${r
          .map((w) => `<span class="word-chip">${esc(w.word)}${w.count > 1 ? `<small>×${w.count}</small>` : ""}</span>`)
          .join("") || "<span style='color:var(--muted);font-size:0.8rem'>—</span>"}</div>
      </div>`
      )
      .join("")}</div>`;
  } else if (itx.mode === "scale" && agg) {
    const dots = agg.values
      .map((v, i) => `<span class="scale-dot" style="left:${v}%;top:${18 + ((i * 37) % 3) * 9}px"></span>`)
      .join("");
    const byValue = [...itx.responses].sort((a, b) => a.payload.value - b.payload.value);
    body = `
      <div class="scale-track-wrap">
        <div class="scale-track">${dots}
          ${agg.avg != null ? `<span class="scale-avg" style="left:${agg.avg}%" title="class average">▲</span>` : ""}
        </div>
        <div class="scale-ends"><span>${esc(itx.options[0])}</span><span>${esc(itx.options[1])}</span></div>
      </div>
      <div class="word-chips" style="margin-top:0.8rem">${byValue
        .map((r) => `<span class="word-chip">${esc(r.name || "")} · ${r.payload.value}</span>`)
        .join("")}</div>`;
  } else if (agg && agg.matches) {
    body = bars(
      agg.matches.map((m) => `${m.left} ↔ ${m.right}`),
      agg.matches.map((m) => m.correct),
      agg.matches.map((m) => (agg.total ? Math.round((m.correct / agg.total) * 100) + "% correct" : ""))
    );
  } else if (agg && agg.counts) {
    body = bars(
      itx.options.map((o, i) => (itx.correct === i ? `${o} ✓` : o)),
      agg.counts
    );
  } else if (agg && agg.ranked) {
    body = `<div class="agg-bars">${agg.ranked
      .map(
        (r) => `
        <div class="agg-bar">
          <div class="lbl"><span>#${r.position} ${esc(r.label)}</span>${r.correctPct != null ? `<span>${r.correctPct}% placed it right</span>` : ""}</div>
          <div class="track"><div class="fill" style="width:${100 - ((r.position - 1) / Math.max(1, agg.ranked.length - 1)) * 70}%"></div></div>
        </div>`
      )
      .join("")}</div>`;
  } else if (STRUCTURED.has(itx.mode)) {
    body = revealCards((r) =>
      itx.fields
        .map((f, i) => (r.payload.parts[i] ? `<b>${esc(f)}</b> ${esc(r.payload.parts[i])}` : ""))
        .filter(Boolean)
        .join("<br/>")
    );
  } else if (itx.mode === "sketch" || itx.mode === "annotate") {
    const source = itx.imageUrl
      ? `<div style="margin-top:0.9rem"><img src="${itx.imageUrl}" alt="source image" style="max-height:110px;border-radius:8px;border:1px solid var(--line)" /> <span style="font-size:0.78rem;color:var(--muted)">← what they're drawing on</span></div>`
      : "";
    body = source + revealCards((r) => `<img src="${r.payload.image}" alt="student drawing" style="height:90px;border-radius:8px;background:#fff;border:1px solid var(--line)" />`);
  } else if (TEXT_MODES.has(itx.mode)) {
    const source = itx.imageUrl
      ? `<div style="margin-top:0.9rem"><img src="${itx.imageUrl}" alt="prompt image" style="max-height:110px;border-radius:8px;border:1px solid var(--line)" /></div>`
      : "";
    body = source + revealCards((r) => esc(r.payload.text || ""));
  }

  area.innerHTML = `
    <div class="live">
      <div class="live-top">
        <div class="live-q">
          <span class="mode-tag">${modeTag(itx.mode)}</span>
          <h2>${itx.prompt ? esc(itx.prompt) : `<span class="aloud">Question asked aloud 🎤</span>`}</h2>
          <span class="status-line ${itx.open ? "open" : "closed"}">${itx.open ? "● Responses open" : "■ Responses closed"}</span>
        </div>
        <div class="resp-meter">
          <div class="n">${responded}<span style="color:var(--muted);font-size:1.1rem">/${total}</span></div>
          <div class="lbl">responded</div>
        </div>
      </div>
      <div class="controls">${controls}</div>
      ${body}
    </div>`;

  area.querySelectorAll("[data-act]").forEach((b) => (b.onclick = () => send({ type: b.dataset.act })));
  area.querySelectorAll("[data-reveal]").forEach(
    (b) => (b.onclick = () => send({ type: "reveal", studentId: b.dataset.reveal }))
  );
  area.querySelectorAll("[data-note]").forEach((b) => {
    b.onclick = () => {
      const [sid, i] = b.dataset.note.split("|");
      send({ type: "reveal", studentId: sid, noteIndex: +i });
    };
  });
}

function renderSequence() {
  const area = $("seqArea");
  const seq = state.sequence || [];
  if (!seq.length) {
    area.innerHTML = `<div class="seq-empty">Plan a short sequence before class — or don't. Spontaneity welcome.</div>`;
  } else {
    area.innerHTML = `<div class="seq-list">${seq
      .map(
        (s, i) => `
      <div class="seq-item ${i < state.seqIndex ? "done" : ""} ${i === state.seqIndex ? "current" : ""}">
        <span class="num">${i + 1}</span>
        <span class="txt"><span class="m">${modeTag(s.mode)}</span><br/><span class="p">${esc(s.prompt) || "<i>asked aloud</i>"}</span></span>
        <button class="play" title="Launch this step" data-jump="${i}">▶</button>
        <button class="del" title="Remove" data-del="${i}">✕</button>
      </div>`
      )
      .join("")}</div>`;
  }
  area.querySelectorAll("[data-jump]").forEach(
    (b) => (b.onclick = () => send({ type: "jump_to_step", index: +b.dataset.jump }))
  );
  area.querySelectorAll("[data-del]").forEach(
    (b) =>
      (b.onclick = () => {
        const items = state.sequence.filter((_, i) => i !== +b.dataset.del);
        send({ type: "set_sequence", items });
      })
  );
  $("nextBtn").disabled = state.seqIndex + 1 >= seq.length;
}

/* ---------------- summary ---------------- */

function renderSummary(s) {
  const sheet = $("summarySheet");
  const conf = s.confidence
    ? `<div class="stat"><div class="v">${s.confidence.understanding}%</div><div class="k">signalled understanding (got it / nearly)</div></div>`
    : "";
  const words = s.commonWords.length
    ? `<div class="sum-section"><h3>Commonly remembered</h3><div class="word-chips">${s.commonWords
        .map((w) => `<span class="word-chip">${esc(w.word)}<small>×${w.count}</small></span>`)
        .join("")}</div></div>`
    : "";
  const items = s.items
    .map((it) => {
      let d = `${it.responses} responses`;
      if (it.distribution)
        d = it.distribution.map((x) => `${esc(x.label)}: ${x.count}`).join(" · ");
      if (it.ranked) d = "Class order: " + it.ranked.map((r) => esc(r.label)).join(" → ");
      if (it.matchStats) d = it.matchStats.map((m) => `${esc(m.pair)} (${m.correctPct}%)`).join(" · ");
      if (it.sketchCount != null) d = `${it.sketchCount} sketch${it.sketchCount === 1 ? "" : "es"} drawn`;
      if (it.answers && it.answers.length)
        d = it.answers.slice(0, 5).map(esc).join(" — ") + (it.answers.length > 5 ? " …" : "");
      if (it.topWords && it.topWords.length)
        d = it.topWords.map((w) => esc(w.word)).join(", ");
      return `<div class="sum-item"><div class="q">${modeTag(it.mode)} — ${esc(it.prompt) || "<i>asked aloud</i>"}</div><div class="d">${d}</div></div>`;
    })
    .join("");

  sheet.innerHTML = `
    <h2>${s.title ? esc(s.title) : "Recap summary"}</h2>
    <p style="color:var(--ink-soft)">Use this to decide what to teach next — then close it and keep going.</p>
    <div class="stat-row">
      <div class="stat"><div class="v">${s.participatedCount}/${s.joinedCount}</div><div class="k">students participated</div></div>
      <div class="stat"><div class="v">${s.interactionCount}</div><div class="k">interactions run</div></div>
      ${conf}
    </div>
    ${words}
    <div class="sum-section"><h3>What happened</h3>${items || "<p style='color:var(--muted)'>No interactions yet.</p>"}</div>
    <div style="margin-top:1.4rem;display:flex;gap:0.6rem">
      <button class="btn primary" id="closeSummary">Back to the room</button>
      <a class="btn" id="exportPdf" target="_blank" rel="noopener"
         href="/report?code=${state.code}${teacherPw() ? `&pw=${encodeURIComponent(teacherPw())}` : ""}"
         style="text-decoration:none">🖨 Export as PDF</a>
    </div>`;
  $("summaryOverlay").classList.add("show");
  $("closeSummary").onclick = () => $("summaryOverlay").classList.remove("show");
}

/* ---------------- wire-up ---------------- */

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function joinLink() {
  return `${location.origin}/join?code=${state?.code || ""}`;
}
$("codeChip").onclick = () => {
  navigator.clipboard?.writeText(joinLink());
  toast("Join link copied — students who click it only type their name");
};
$("copyLink").onclick = $("codeChip").onclick;
$("qrToggle").onclick = () => send({ type: "toggle_join" });
$("remoteBtn").onclick = () => {
  if (!state) return;
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  const host = isLocal && state.lanHost ? state.lanHost : location.host;
  const proto = isLocal ? "http:" : location.protocol;
  const url = `${proto}//${host}/remote?code=${state.code}`;
  $("remoteUrl").textContent = url.replace(/^https?:\/\//, "");
  try {
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    $("remoteQr").innerHTML = `<div style="background:#fff;padding:10px;border-radius:12px">${qr.createSvgTag({ cellSize: 5, margin: 0, scalable: true })}</div>`;
    $("remoteQr").querySelector("svg").style.width = "190px";
    $("remoteQr").querySelector("svg").style.height = "190px";
  } catch { $("remoteQr").innerHTML = ""; }
  $("remoteOverlay").classList.add("show");
};
$("closeRemote").onclick = () => $("remoteOverlay").classList.remove("show");

$("titleInput").addEventListener("change", () => send({ type: "set_title", title: $("titleInput").value }));
$("titleInput").addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
// A real link (not window.open) so popup blockers never eat it;
// render() keeps its href pointed at the current session.
$("togglePreview").onclick = () => {
  if (!state) return;
  const panel = $("phonePanel");
  if (panel.classList.contains("show")) return $("closePreview").click();
  $("phoneFrame").src = `/join?code=${state.code}&preview=1`;
  panel.classList.add("show");
};
$("closePreview").onclick = () => {
  $("phonePanel").classList.remove("show");
  $("phoneFrame").src = "about:blank"; // disconnects the preview student so the roster stays honest
};
$("eyesUpTop").onclick = () => send({ type: "eyes_up" });
$("endBtn").onclick = () => send({ type: "get_summary" });
$("nextBtn").onclick = () => send({ type: "next" });

$("launchBtn").onclick = () => {
  const data = readComposer();
  if (!data) return;
  send({ type: "launch", ...data });
  closeComposer();
};
$("addStepBtn").onclick = () => {
  const data = readComposer();
  if (!data) return;
  send({ type: "set_sequence", items: [...(state?.sequence || []), data] });
  closeComposer();
  toast("Added to plan");
};
$("cancelComposer").onclick = closeComposer;
$("composer").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("launchBtn").click();
  if (e.key === "Escape") closeComposer();
});

document.querySelectorAll("[data-timer]").forEach(
  (b) => (b.onclick = () => send({ type: "timer_start", seconds: +b.dataset.timer }))
);
$("timerGo").onclick = () => {
  const s = parseInt($("timerCustom").value, 10);
  if (s >= 5) send({ type: "timer_start", seconds: s });
};
$("pickBtn").onclick = () => send({ type: "pick_student" });
$("groupsBtn").onclick = () =>
  send({ type: "make_groups", n: parseInt($("groupN").value, 10) || 2, by: $("groupBy").value });

$("loadExample").onclick = () => {
  send({
    type: "set_sequence",
    items: [
      { mode: "one_word", prompt: "One word that comes to mind when you hear “training data”." },
      { mode: "short_answer", prompt: "Explain an AI hallucination in your own words." },
      { mode: "agree_disagree", prompt: "AI understands information in the same way humans do." },
      { mode: "confidence", prompt: "Could you explain generative AI to someone else?" },
    ],
  });
  toast("Example plan loaded");
};

/* ---------------- paste-a-quiz importer ---------------- */

// Parses the multiple-choice formats ChatGPT typically produces:
// numbered questions, A)/A./(A) options, dash bullets, "Answer: B" /
// "Correct answer: C" lines, markdown bold. Forgiving by design.
function parseQuiz(text) {
  const lines = String(text).replace(/\r/g, "").split("\n").map((l) => l.replace(/\*\*|__/g, "").trim());
  const optRe = /^[-*•]?\s*\(?([A-Ha-h])[\.\)\:]\s+(.+)$/;
  const ansRe = /^(?:correct\s*answer|correct\s*option|answer|correct|ans)\s*(?:is)?\s*[:\-\.]?\s*\(?([A-Ha-h])\b/i;
  const qStartRe = /^(?:q(?:uestion)?\s*)?\d+\s*[\.\):]\s*(.*)$/i;

  const questions = [];
  let cur = null;
  const push = () => {
    if (cur && cur.prompt && cur.options.length >= 2) {
      cur.options = cur.options.slice(0, 5);
      if (cur.correct != null && (cur.correct < 0 || cur.correct >= cur.options.length)) cur.correct = null;
      questions.push(cur);
    }
    cur = null;
  };

  for (const line of lines) {
    if (!line) continue;
    const ans = line.match(ansRe);
    if (ans && cur && cur.options.length) {
      cur.correct = ans[1].toUpperCase().charCodeAt(0) - 65;
      continue;
    }
    const opt = line.match(optRe);
    if (opt && cur) {
      cur.options.push(opt[2].trim());
      continue;
    }
    const qs = line.match(qStartRe);
    if (qs) {
      push();
      cur = { prompt: qs[1].trim(), options: [], correct: null };
      continue;
    }
    if (!cur) {
      cur = { prompt: line, options: [], correct: null };
    } else if (cur.options.length) {
      push(); // options had ended — this text starts the next question
      cur = { prompt: line, options: [], correct: null };
    } else {
      cur.prompt = (cur.prompt ? cur.prompt + " " : "") + line; // wrapped question text
    }
  }
  push();
  return questions.slice(0, 25);
}

let parsedQuiz = [];

function renderQuizPreview() {
  parsedQuiz = parseQuiz($("quizPaste").value);
  const box = $("quizPreview");
  if (!parsedQuiz.length) {
    box.innerHTML = $("quizPaste").value.trim()
      ? `<p style="color:var(--red);font-size:0.85rem">Couldn't find complete questions yet — each needs a question line plus at least two A) B) options.</p>`
      : "";
  } else {
    box.innerHTML =
      `<p style="font-weight:800;font-size:0.85rem;margin-bottom:0.4rem">Found ${parsedQuiz.length} question${parsedQuiz.length === 1 ? "" : "s"}:</p>` +
      parsedQuiz
        .map(
          (q, qi) => `
        <div style="border:1px solid var(--line);border-radius:10px;padding:0.55rem 0.8rem;margin-bottom:0.45rem;font-size:0.85rem;background:var(--paper)">
          <b>${qi + 1}. ${esc(q.prompt)}</b><br/>
          ${q.options
            .map((o, i) => `<span style="${i === q.correct ? "color:var(--green);font-weight:700" : "color:var(--ink-soft)"}">${String.fromCharCode(65 + i)}) ${esc(o)}${i === q.correct ? " ✓" : ""}</span>`)
            .join(" &nbsp; ")}
          ${q.correct == null ? `<br/><span style="color:var(--amber);font-size:0.78rem">⚠ No answer line found — you can still run it, just without a reveal.</span>` : ""}
        </div>`
        )
        .join("");
  }
  $("quizAdd").disabled = !parsedQuiz.length;
}

$("pasteQuizBtn").onclick = () => {
  $("quizPaste").value = "";
  $("quizPreview").innerHTML = "";
  $("quizAdd").disabled = true;
  $("quizOverlay").classList.add("show");
  $("quizPaste").focus();
};
$("quizPaste").addEventListener("input", renderQuizPreview);
$("quizCancel").onclick = () => $("quizOverlay").classList.remove("show");
$("quizAdd").onclick = () => {
  if (!parsedQuiz.length) return;
  const items = parsedQuiz.map((q) => ({ mode: "multi_choice", prompt: q.prompt, options: q.options, correct: q.correct }));
  send({ type: "set_sequence", items: [...(state?.sequence || []), ...items] });
  $("quizOverlay").classList.remove("show");
  toast(`${items.length} question${items.length === 1 ? "" : "s"} added to plan`);
};

/* ---------------- drag & drop an image anywhere on the dashboard ---------------- */

let dragDepth = 0;
document.addEventListener("dragenter", (e) => {
  if ([...(e.dataTransfer?.types || [])].includes("Files")) {
    dragDepth++;
    $("dropHint").classList.add("show");
  }
});
document.addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) $("dropHint").classList.remove("show");
});
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  $("dropHint").classList.remove("show");
  const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith("image/"));
  if (!f) return;
  loadComposerImage(f, (dataUrl) => {
    composerImage = dataUrl;
    // Already composing an image mode? Keep it. Otherwise open Picture Prompt.
    if (!composerModeKey || !MODES[composerModeKey]?.imageUpload) {
      openComposer("picture_prompt", true);
      $("composerTip").textContent = "Image loaded ✓ — or pick 🖍️ Annotate instead if they should draw on it.";
    }
    setComposerImage(dataUrl);
  });
});

$("pwGo").onclick = () => {
  const pw = $("pwInput").value;
  if (!pw) return;
  sessionStorage.setItem("eyesup_pw", pw);
  $("pwInput").value = "";
  if (ws && ws.readyState === 1) attach();
};
$("pwInput").addEventListener("keydown", (e) => { if (e.key === "Enter") $("pwGo").click(); });

buildModeGrid();
connect();
