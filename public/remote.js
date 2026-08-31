/* Eyes Up — teacher's phone remote.
   Full parity with the desktop dashboard, laid out for thumbs:
   Live · Launch · Plan · Tools · More. */

const $ = (id) => document.getElementById(id);
const main = $("main");

let ws = null;
let state = null;
let needPw = false;
let tab = "live";
let composerModeKey = null;
let composerImage = null;
let parsedQuiz = [];
let userSummaryWanted = false;

/* ---------------- mode config (mirrors the dashboard) ---------------- */

const MODES = {
  multi_choice:  { icon: "🅰️", name: "Multi Choice", opts: { min: 2, max: 5, labels: "Option" }, hasCorrect: true },
  poll:          { icon: "📊", name: "Poll", opts: { min: 2, max: 5, labels: "Option" } },
  picture_vote:  { icon: "🗳️", name: "Picture Vote", opts: { min: 2, max: 5, labels: "Option" }, imageUpload: true },
  agree_disagree:{ icon: "⚖️", name: "Agree/Disagree" },
  true_false:    { icon: "✅", name: "True/False" },
  this_or_that:  { icon: "⚡", name: "This or That", opts: { min: 2, max: 2, labels: "Choice" } },
  confidence:    { icon: "🎯", name: "Confidence" },
  smiley:        { icon: "😊", name: "Smiley Review" },
  scale:         { icon: "🎚️", name: "Scale", opts: { min: 0, max: 2, labels: "End (optional)" } },
  example_nonexample: { icon: "↔️", name: "Example/Non-ex", opts: { min: 2, max: 2, labels: "Item" } },
  word_cloud:    { icon: "☁️", name: "Word Cloud", multiOpt: true },
  one_word:      { icon: "🗣️", name: "One Word" },
  mindmap:       { icon: "🕸️", name: "Mindmap", multiOpt: true, ph: "The central concept" },
  post_its:      { icon: "🗒️", name: "Post-its", postits: true, multiOpt: true },
  phonics:       { icon: "🔤", name: "Phonics" },
  short_answer:  { icon: "✏️", name: "Short Answer" },
  picture_prompt:{ icon: "🖼️", name: "Picture Prompt", imageUpload: true },
  retrieval_sprint:{ icon: "🧠", name: "Sprint 60s" },
  exit_ticket:   { icon: "🎟️", name: "Exit Ticket" },
  finish_sentence:{ icon: "📝", name: "Finish Sentence", needPrompt: true, ph: "The sentence stem" },
  give_example:  { icon: "💡", name: "Give Example" },
  make_connection:{ icon: "🔗", name: "Connection" },
  teach_back:    { icon: "🧑‍🏫", name: "Teach Back" },
  spot_mistake:  { icon: "🔎", name: "Spot Mistake", ph: "The statement with a mistake" },
  quick_challenge:{ icon: "🚀", name: "Challenge" },
  predict:       { icon: "🔮", name: "Predict" },
  three_two_one: { icon: "3️⃣", name: "3-2-1" },
  notice_wonder: { icon: "👀", name: "Notice/Wonder" },
  before_after:  { icon: "🔄", name: "Before/After" },
  muddiest_point:{ icon: "🌫️", name: "Muddiest" },
  ask_question:  { icon: "❓", name: "Ask Question" },
  ranking:       { icon: "🔢", name: "Ranking", opts: { min: 2, max: 6, labels: "Item" } },
  put_in_order:  { icon: "🪜", name: "Put in Order", opts: { min: 2, max: 6, labels: "Step (correct order)" } },
  match_up:      { icon: "🧩", name: "Match Up", pairs: { min: 2, max: 6 } },
  venn:          { icon: "◉", name: "Venn", opts: { min: 2, max: 2, labels: "Circle" }, multiOpt: true },
  spelling:      { icon: "🔡", name: "Spelling Test", opts: { min: 1, max: 10, labels: "Word" } },
  cloze:         { icon: "▭", name: "Cloze", clozeUI: true },
  working:       { icon: "🧮", name: "Working Out", workingUI: true, ph: "The problem — or say it aloud" },
  counters:      { icon: "🟠", name: "Counters", workingUI: true, forceKind: "colors", ph: "The equation, e.g. “3 + 4 = ?”" },
  tens_ones:     { icon: "🔟", name: "Tens & Ones", workingUI: true, forceKind: "base10", launchAs: "counters", ph: "e.g. “Build 47”" },
  sketch:        { icon: "🎨", name: "Sketch It" },
  annotate:      { icon: "🖍️", name: "Annotate", imageUpload: true },
};

const CATEGORIES = [
  { label: "Fast votes", modes: ["multi_choice", "poll", "picture_vote", "agree_disagree", "true_false", "this_or_that", "confidence", "smiley", "scale", "example_nonexample"] },
  { label: "Words & ideas", modes: ["word_cloud", "one_word", "mindmap", "post_its", "phonics"] },
  { label: "Written recall", modes: ["short_answer", "picture_prompt", "retrieval_sprint", "exit_ticket", "finish_sentence", "give_example", "make_connection", "teach_back", "spot_mistake", "quick_challenge", "predict"] },
  { label: "Reflect", modes: ["three_two_one", "notice_wonder", "before_after", "muddiest_point", "ask_question"] },
  { label: "Arrange & match", modes: ["ranking", "put_in_order", "match_up", "venn"] },
  { label: "Practise & test", modes: ["spelling", "cloze", "working", "counters", "tens_ones"] },
  { label: "Draw", modes: ["sketch", "annotate"] },
];

const TEXT_MODES = new Set(["short_answer", "predict", "ask_question", "exit_ticket", "muddiest_point", "retrieval_sprint", "spot_mistake", "teach_back", "give_example", "make_connection", "finish_sentence", "quick_challenge", "picture_prompt"]);
const STRUCTURED = new Set(["three_two_one", "notice_wonder", "before_after"]);
const ANON_MODES = new Set(["ask_question", "muddiest_point"]);
const revealMode = (m) =>
  TEXT_MODES.has(m) || STRUCTURED.has(m) || ["sketch", "annotate", "example_nonexample", "post_its", "phonics", "working", "counters"].includes(m);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function markMatch(a, t) {
  const x = String(a || "").trim().toLowerCase();
  const y = String(t || "").trim().toLowerCase();
  if (!x) return false;
  if (x === y) return true;
  const nx = Number(x.replace(",", ".")), ny = Number(y.replace(",", "."));
  return Number.isFinite(nx) && Number.isFinite(ny) && Math.abs(nx - ny) < 1e-9;
}
function modeName(m, counterKind) {
  if (m === "counters" && counterKind === "base10") return "🔟 Tens & Ones";
  const md = MODES[m];
  return md ? `${md.icon} ${md.name}` : m;
}

let toastTimer = null;
function toast(t) {
  $("rtoast").textContent = t;
  $("rtoast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("rtoast").classList.remove("show"), 1700);
}

/* ---------------- connection ---------------- */

function creds() {
  return {
    code: (sessionStorage.getItem("eyesup_remote_code") || "").toUpperCase(),
    password: sessionStorage.getItem("eyesup_remote_pw") || "",
    token: localStorage.getItem("eyesup_token") || "",
  };
}
function authQuery() {
  const { token, password } = creds();
  if (token) return `t=${encodeURIComponent(token)}`;
  return password ? `pw=${encodeURIComponent(password)}` : "";
}

function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onopen = () => {
    $("conn").textContent = "";
    const { code, password, token } = creds();
    if (code) ws.send(JSON.stringify({ type: "teacher_resume", code, password, token }));
  };
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "error") {
      needPw = msg.error === "bad_password" || msg.error === "auth_required";
      if (msg.error === "auth_required") localStorage.removeItem("eyesup_token");
      if (msg.error === "no_session") sessionStorage.removeItem("eyesup_remote_code");
      state = null;
      $("tabbar").style.display = "none";
      renderGate(msg.error);
      return;
    }
    if (msg.type === "summary") {
      if (userSummaryWanted) {
        userSummaryWanted = false;
        renderSummarySheet(msg);
      }
      return;
    }
    if (msg.type === "state") {
      state = msg;
      sessionStorage.setItem("eyesup_remote_code", state.code); // follows "new lesson" switches
      $("tabbar").style.display = "";
      render();
    }
  };
  ws.onclose = () => {
    $("conn").textContent = "reconnecting…";
    setTimeout(connect, 1200);
  };
}
const send = (obj) => ws && ws.readyState === 1 && ws.send(JSON.stringify(obj));

/* ---------------- tab switching ---------------- */

document.querySelectorAll("#tabbar button").forEach((b) => {
  b.onclick = () => { tab = b.dataset.tab; render(); };
});

function render() {
  if (!state) return renderGate();
  $("topInfo").innerHTML = `<b>${esc(state.code)}</b> · ${state.students.length} in`;
  document.querySelectorAll("#tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  if (tab === "live") renderLive();
  else if (tab === "launch") renderLaunch();
  else if (tab === "plan") renderPlan();
  else if (tab === "tools") renderTools();
  else renderMore();
  bindActions();
}

function bindActions() {
  main.querySelectorAll("[data-act]").forEach((b) => (b.onclick = () => send({ type: b.dataset.act })));
  main.querySelectorAll("[data-timer]").forEach((b) => (b.onclick = () => send({ type: "timer_start", seconds: +b.dataset.timer })));
  main.querySelectorAll("[data-spot]").forEach((el) => (el.onclick = () => send({ type: "spotlight_response", studentId: el.dataset.spot })));
  main.querySelectorAll("[data-reveal]").forEach((b) => (b.onclick = () => send({ type: "reveal", studentId: b.dataset.reveal })));
  main.querySelectorAll("[data-note]").forEach((b) => (b.onclick = () => {
    const [sid, i] = b.dataset.note.split("|");
    send({ type: "reveal", studentId: sid, noteIndex: +i });
  }));
  main.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => openComposer(b.dataset.open)));
  main.querySelectorAll("[data-jump]").forEach((b) => (b.onclick = () => send({ type: "jump_to_step", index: +b.dataset.jump })));
  main.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => {
    send({ type: "set_sequence", items: state.sequence.filter((_, i) => i !== +b.dataset.del) });
  }));
}

/* ---------------- LIVE tab ---------------- */

// One readable line per response (mirrors the export).
function lineFor(itx, p) {
  const m = itx.mode;
  if (["word_cloud", "one_word", "mindmap"].includes(m)) return (p.words || []).join(", ");
  if (m === "post_its") return null; // rendered as chips
  if (m === "phonics") return (p.parts || []).map((x) => (x === "-e" ? "e" : x)).join("·");
  if (m === "venn") return (p.items || []).map((it) => `${it.text}→${["A", "both", "B"][it.region]}`).join(", ");
  if (m === "scale") return `${p.value}/100`;
  if (m === "example_nonexample") return `${itx.options[p.choice]}${p.text ? " — " + p.text : ""}`;
  if (itx.options && Number.isInteger(p.choice)) return itx.options[p.choice];
  if (p.order) return p.order.map((i) => itx.options[i]).join(" → ");
  if (p.matches) return `${p.matches.filter((x, i) => x === i).length}/${itx.pairs.length} correct`;
  if (p.parts && itx.fields) return p.parts.filter(Boolean).join(" · ");
  if (m === "spelling") return itx.words.map((w, i) => `${p.answers[i] || "—"}${markMatch(p.answers[i], w) ? "✓" : "✗"}`).join(" ");
  if (m === "cloze") return itx.cloze.answers.map((w, i) => `${p.fills[i] || "—"}${markMatch(p.fills[i], w) ? "✓" : "✗"}`).join(" ");
  if (m === "working") return `${(p.lines || []).join("; ")}${p.lines?.length ? " → " : ""}${p.answer || "—"}${itx.expected ? (markMatch(p.answer, itx.expected) ? " ✓" : " ✗") : ""}`;
  if (m === "counters") {
    const ok = itx.expected ? (markMatch(p.answer, itx.expected) ? " ✓" : " ✗") : "";
    if (itx.counterKind === "base10") {
      const t = (p.items || []).filter((i) => i.k === 0).length;
      const o = (p.items || []).filter((i) => i.k === 1).length;
      return `${t} tens + ${o} ones → ${p.answer || "—"}${ok}`;
    }
    return `${(p.items || []).length} counters → ${p.answer || "—"}${ok}`;
  }
  return p.text || "";
}

function miniBars(labels, counts, marks) {
  const max = Math.max(1, ...counts);
  return counts
    .map(
      (n, i) => `<div class="mini-bar">
      <div class="mb-top"><span>${esc(labels[i])}${marks && marks[i] ? " " + marks[i] : ""}</span><span>${n}</span></div>
      <div class="mb-track"><div class="mb-fill" style="width:${(n / max) * 100}%"></div></div></div>`
    )
    .join("");
}

function renderLive() {
  const itx = state.interaction;
  let status;
  if (itx) {
    status = `
      <div class="status">
        <div class="mode">${modeName(itx.mode, itx.counterKind)}</div>
        <div class="q">${itx.prompt ? esc(itx.prompt) : "🎤 asked aloud"}</div>
        <div class="meta">
          <span><b>${itx.responses.length}</b>/${state.students.length} responded</span>
          <span class="${itx.open ? "open-tag" : "closed-tag"}">${itx.open ? "● open" : "■ closed"}</span>
          ${itx.resultsVisible ? "" : `<span>🙈 results hidden</span>`}
          ${itx.showNames ? `<span>🏷 names on</span>` : ""}
        </div>
      </div>`;
  } else {
    status = `<div class="status"><div class="q">${state.phase === "eyesup" ? "👀 Eyes up — the room is talking" : "🎤 Nothing live — the room is yours"}</div></div>`;
  }

  const seq = state.sequence || [];
  const nextStep = state.seqIndex + 1 < seq.length ? seq[state.seqIndex + 1] : null;

  let controls = "";
  if (itx) {
    controls = `<div class="btn-row">
      ${itx.open ? `<button class="rbtn" data-act="close_responses">⏸ Close</button>` : `<button class="rbtn" data-act="open_responses">▶ Open</button>`}
      ${itx.resultsVisible ? `<button class="rbtn" data-act="hide_results">🙈 Hide</button>` : `<button class="rbtn" data-act="show_results">📊 Show</button>`}
      ${revealMode(itx.mode) ? `<button class="rbtn" data-act="reveal_all">✨ All up</button>` : ""}
      ${revealMode(itx.mode) && !ANON_MODES.has(itx.mode) ? `<button class="rbtn" data-act="toggle_names">🏷 ${itx.showNames ? "Names ON" : "Names"}</button>` : ""}
      ${itx.mode === "multi_choice" && itx.correct != null && !itx.answerRevealed ? `<button class="rbtn" data-act="reveal_answer">🎯 Answer</button>` : ""}
      <button class="rbtn warn" data-act="clear">Clear</button>
    </div>`;
  }

  main.innerHTML = `
    ${status}
    <button class="rbtn eyes" data-act="eyes_up">👀 EYES UP</button>
    ${controls}
    ${nextStep ? `<button class="rbtn accent" data-act="next">▶ Next: ${esc(modeName(nextStep.mode))}${nextStep.prompt ? " — " + esc(nextStep.prompt.slice(0, 28)) + "…" : ""}</button>` : ""}
    ${itx ? renderLiveResponses(itx) : ""}
  `;
}

function renderLiveResponses(itx) {
  const agg = itx.aggregate;
  let out = "";

  if (["sketch", "annotate"].includes(itx.mode) && itx.responses.length) {
    out += `<h3 class="sec">Tap a drawing → big on the projector</h3>
      <div class="thumb-grid">${itx.responses
        .map((r) => `<img class="thumb ${itx.spotlightId === r.studentId ? "spot" : ""}" data-spot="${r.studentId}" src="${r.payload.image}" alt="drawing" />`)
        .join("")}</div>`;
    return out;
  }

  if (agg) {
    if (agg.counts) out += `<h3 class="sec">Results</h3>` + miniBars(itx.options, agg.counts, itx.correct != null ? itx.options.map((_, i) => (i === itx.correct ? "✓" : "")) : null);
    else if (agg.words) out += `<h3 class="sec">Words</h3><div>${agg.words.map((w) => `<span class="word-chip-r">${esc(w.word)}${w.count > 1 ? ` ×${w.count}` : ""}</span>`).join("")}</div>`;
    else if (agg.ranked) out += `<h3 class="sec">Class order</h3><div class="status">${agg.ranked.map((r) => `<div>${r.position}. ${esc(r.label)}${r.correctPct != null ? ` <small style="color:var(--rdim)">${r.correctPct}%✓</small>` : ""}</div>`).join("")}</div>`;
    else if (agg.matches) out += `<h3 class="sec">Matches</h3>` + miniBars(agg.matches.map((m) => `${m.left}↔${m.right}`), agg.matches.map((m) => m.correct));
    else if (agg.stats) out += `<h3 class="sec">Marking</h3>` + miniBars(agg.stats.map((s) => s.target + (s.wrongTop.length ? ` (slip: ${s.wrongTop[0].text})` : "")), agg.stats.map((s) => s.correct));
    else if (agg.answerDist) out += `<h3 class="sec">Answers</h3>` + miniBars(agg.answerDist.map((d) => d.answer + (d.ok === true ? " ✓" : d.ok === false ? " ✗" : "")), agg.answerDist.map((d) => d.count));
    else if (agg.regions) out += `<h3 class="sec">Venn</h3><div class="status">${[`${itx.options[0]} only`, "Both", `${itx.options[1]} only`].map((h, i) => `<div><b>${esc(h)}:</b> ${agg.regions[i].map((w) => esc(w.word)).join(", ") || "—"}</div>`).join("")}</div>`;
    else if (agg.values) out += `<h3 class="sec">Scale</h3><div class="status">avg <b>${agg.avg ?? "—"}</b> / 100 · ${agg.values.length} placed</div>`;
  }

  if (["spelling", "cloze", "scale", "ranking", "put_in_order", "match_up", "counters"].includes(itx.mode) && itx.responses.length) {
    out += `<h3 class="sec">By student</h3>` + itx.responses
      .map((r) => `<div class="resp-row"><span class="rr-who">${esc(r.name || "")}</span><span class="rr-what">${esc(lineFor(itx, r.payload) || "")}</span></div>`)
      .join("");
    return out;
  }

  if (itx.mode === "post_its" && itx.responses.length) {
    out += `<h3 class="sec">Notes ${itx.moderated ? "(tap to approve)" : ""}</h3>`;
    out += itx.responses
      .map((r) => (r.payload.notes || [])
        .map((n, i) => {
          const on = r.noteRevealed?.[i];
          return `<div class="resp-row"><span class="rr-who">${esc(r.name || "")}</span><span class="rr-what">${esc(n)}</span>
            <button class="rr-tgl ${on ? "on" : ""}" data-note="${r.studentId}|${i}">${on ? "on board ✓" : "put up →"}</button></div>`;
        }).join(""))
      .join("");
    return out;
  }

  if (revealMode(itx.mode) && itx.responses.length) {
    out += `<h3 class="sec">Responses</h3>`;
    out += itx.responses
      .map((r) => `<div class="resp-row">
        <span class="rr-who">${ANON_MODES.has(itx.mode) ? "🕶" : esc(r.name || "")}</span>
        <span class="rr-what">${esc(lineFor(itx, r.payload) || "")}</span>
        <button class="rr-tgl ${r.revealed ? "on" : ""}" data-reveal="${r.studentId}">${r.revealed ? "on ✓" : "up →"}</button>
      </div>`)
      .join("");
  } else if (!agg && itx.responses.length && !revealMode(itx.mode)) {
    out += `<h3 class="sec">Responses</h3>` + itx.responses
      .map((r) => `<div class="resp-row"><span class="rr-who">${esc(r.name || "")}</span><span class="rr-what">${esc(lineFor(itx, r.payload) || "")}</span></div>`)
      .join("");
  }
  return out;
}

/* ---------------- LAUNCH tab + composer ---------------- */

function renderLaunch() {
  main.innerHTML = `<div class="launch-grid">${CATEGORIES.map(
    (cat) => `<div class="cat-label">${esc(cat.label)}</div>` + cat.modes
      .map((m) => `<button class="rbtn" data-open="${m}"><span class="ic">${MODES[m].icon}</span>${esc(MODES[m].name)}</button>`)
      .join("")
  ).join("")}</div>`;
}

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

function openComposer(key) {
  composerModeKey = key;
  composerImage = null;
  const m = MODES[key];
  let fields = `<input class="rin" id="cPrompt" maxlength="300" placeholder="${esc(m.ph || "Question — or leave blank and ask aloud")}" />`;
  if (m.opts) fields += Array.from({ length: m.opts.max }, (_, i) =>
    `<input class="rin" data-copt maxlength="80" placeholder="${esc(m.opts.labels)} ${i + 1}${i < m.opts.min ? "" : " (optional)"}" />`).join("");
  if (m.hasCorrect) fields += `<select class="rin" id="cCorrect"><option value="">Correct answer: not set</option>${["A", "B", "C", "D", "E"].map((L, i) => `<option value="${i}">Correct: ${L}</option>`).join("")}</select>`;
  if (m.pairs) fields += Array.from({ length: m.pairs.max }, (_, i) =>
    `<div class="pair-row"><input class="rin" data-cleft maxlength="60" placeholder="Term ${i + 1}${i < m.pairs.min ? "" : " (opt)"}" /><span class="pair-eq">↔</span><input class="rin" data-cright maxlength="60" placeholder="Match" /></div>`).join("");
  if (m.clozeUI) fields += `<textarea class="rin" id="cCloze" rows="5" maxlength="1500" placeholder="Paste the passage; put [brackets] around hidden words"></textarea>
    <select class="rin" id="cClozeMode"><option value="type">⌨️ Students type</option><option value="bank">🧺 Word bank</option></select>`;
  if (m.workingUI) fields += `<input class="rin" id="cExpected" maxlength="30" placeholder="Correct answer (optional, auto-checks)" />`;
  if (m.imageUpload) fields += `<input class="rin" type="file" id="cImg" accept="image/*" />
    <img id="cImgPrev" alt="" style="display:none;max-height:110px;border-radius:10px;margin-bottom:0.5rem" />`;
  if (m.postits) fields += `<select class="rin" id="cMod"><option value="0">⚡ Notes straight to the board</option><option value="1">🛡 I approve notes first</option></select>`;
  if (m.multiOpt) fields += `<select class="rin" id="cMulti"><option value="1">🙌 Multiple contributions each</option><option value="0">1️⃣ One each</option></select>`;

  $("composerSheet").innerHTML = `
    <button class="close-x" id="cClose">✕</button>
    <h2>${MODES[key].icon} ${esc(MODES[key].name)}</h2>
    ${fields}
    <button class="rbtn accent" id="cLaunch">Launch now</button>
    <button class="rbtn" id="cAddPlan">＋ Add to plan instead</button>`;
  $("composerWrap").classList.add("show");
  $("cClose").onclick = () => $("composerWrap").classList.remove("show");
  if (m.imageUpload) $("cImg").onchange = (e) => {
    const f = e.target.files[0];
    if (f) loadComposerImage(f, (u) => { composerImage = u; $("cImgPrev").src = u; $("cImgPrev").style.display = "block"; });
  };
  $("cLaunch").onclick = () => { const d = readComposer(); if (d) { send({ type: "launch", ...d }); $("composerWrap").classList.remove("show"); tab = "live"; render(); } };
  $("cAddPlan").onclick = () => { const d = readComposer(); if (d) { send({ type: "set_sequence", items: [...(state?.sequence || []), d] }); $("composerWrap").classList.remove("show"); toast("Added to plan"); } };
}

function readComposer() {
  const m = MODES[composerModeKey];
  const sheet = $("composerSheet");
  const prompt = $("cPrompt").value.trim();
  if (m.needPrompt && !prompt) { toast("Type it — students read this one"); return null; }
  let options, correct, passage, wordBank, expected;
  if (m.opts) {
    options = [...sheet.querySelectorAll("[data-copt]")].map((i) => i.value.trim()).filter(Boolean);
    if (options.length < m.opts.min) { toast(`Needs at least ${m.opts.min}`); return null; }
  }
  if (m.hasCorrect) {
    const v = parseInt($("cCorrect").value, 10);
    correct = Number.isInteger(v) && v < (options?.length || 0) ? v : null;
  }
  if (m.pairs) {
    const lefts = [...sheet.querySelectorAll("[data-cleft]")];
    const rights = [...sheet.querySelectorAll("[data-cright]")];
    options = lefts.map((l, i) => (l.value.trim() && rights[i].value.trim() ? `${l.value.trim()} = ${rights[i].value.trim()}` : null)).filter(Boolean);
    if (options.length < m.pairs.min) { toast(`Needs ${m.pairs.min}+ complete pairs`); return null; }
  }
  if (m.clozeUI) {
    passage = $("cCloze").value;
    if (!/\[[^\]]+\]/.test(passage)) { toast("Bracket at least one [word]"); return null; }
    wordBank = $("cClozeMode").value === "bank";
  }
  if (m.workingUI) expected = $("cExpected").value.trim() || undefined;
  const counterKind = m.forceKind || undefined;
  if (m.imageUpload && !composerImage) { toast("Choose an image first"); return null; }
  const moderated = m.postits ? $("cMod").value !== "0" : undefined;
  const multi = m.multiOpt ? $("cMulti").value !== "0" : undefined;
  return { mode: m.launchAs || composerModeKey, prompt, options, correct, moderated, multi, image: composerImage || undefined, passage, wordBank, expected, counterKind };
}

/* ---------------- PLAN tab ---------------- */

function parseQuiz(text) {
  const lines = String(text).replace(/\r/g, "").split("\n").map((l) => l.replace(/\*\*|__/g, "").trim());
  const optRe = /^[-*•]?\s*\(?([A-Ha-h])[\.\)\:]\s+(.+)$/;
  const ansRe = /^(?:correct\s*answer|correct\s*option|answer|correct|ans)\s*(?:is)?\s*[:\-\.]?\s*\(?([A-Ha-h])\b/i;
  const qStartRe = /^(?:q(?:uestion)?\s*)?\d+\s*[\.\):]\s*(.*)$/i;
  const out = [];
  let cur = null;
  const push = () => {
    if (cur && cur.prompt && cur.options.length >= 2) {
      cur.options = cur.options.slice(0, 5);
      if (cur.correct != null && (cur.correct < 0 || cur.correct >= cur.options.length)) cur.correct = null;
      out.push(cur);
    }
    cur = null;
  };
  for (const line of lines) {
    if (!line) continue;
    const ans = line.match(ansRe);
    if (ans && cur && cur.options.length) { cur.correct = ans[1].toUpperCase().charCodeAt(0) - 65; continue; }
    const opt = line.match(optRe);
    if (opt && cur) { cur.options.push(opt[2].trim()); continue; }
    const qs = line.match(qStartRe);
    if (qs) { push(); cur = { prompt: qs[1].trim(), options: [], correct: null }; continue; }
    if (!cur) cur = { prompt: line, options: [], correct: null };
    else if (cur.options.length) { push(); cur = { prompt: line, options: [], correct: null }; }
    else cur.prompt += " " + line;
  }
  push();
  return out.slice(0, 25);
}

function renderPlan() {
  const seq = state.sequence || [];
  main.innerHTML = `
    ${seq.length ? seq.map((s, i) => `
      <div class="seq-item ${i < state.seqIndex ? "done" : ""} ${i === state.seqIndex ? "current" : ""}">
        <span class="sq-n">${i + 1}</span>
        <span class="sq-t">${modeName(s.mode)}${s.prompt ? " — " + esc(s.prompt) : ""}</span>
        <button data-jump="${i}">▶</button><button data-del="${i}">✕</button>
      </div>`).join("") : `<div class="status"><div class="q">No plan yet — spontaneity welcome. Add steps from Launch → “Add to plan”.</div></div>`}
    <button class="rbtn accent" data-act="next" ${state.seqIndex + 1 >= seq.length ? "disabled" : ""}>▶ Next in plan</button>
    <button class="rbtn" id="loadExample">Load example: Gen-AI recall</button>
    <h3 class="sec">📋 Paste a quiz (from ChatGPT etc.)</h3>
    <textarea class="rin" id="quizPaste" rows="6" placeholder="1. Question…&#10;A) … B) … C) …&#10;Answer: A"></textarea>
    <div id="quizPrev" style="font-size:0.8rem;color:var(--rdim);margin-bottom:0.5rem"></div>
    <button class="rbtn" id="quizAdd" disabled>Add to plan</button>`;
  $("loadExample").onclick = () => {
    send({ type: "set_sequence", items: [
      { mode: "one_word", prompt: "One word that comes to mind when you hear “training data”." },
      { mode: "short_answer", prompt: "Explain an AI hallucination in your own words." },
      { mode: "agree_disagree", prompt: "AI understands information the same way humans do." },
      { mode: "confidence", prompt: "Could you explain generative AI to someone else?" },
    ]});
    toast("Example loaded");
  };
  $("quizPaste").oninput = () => {
    parsedQuiz = parseQuiz($("quizPaste").value);
    $("quizPrev").textContent = parsedQuiz.length
      ? `Found ${parsedQuiz.length} question${parsedQuiz.length === 1 ? "" : "s"} (${parsedQuiz.filter((q) => q.correct != null).length} with answers)`
      : $("quizPaste").value.trim() ? "No complete questions yet…" : "";
    $("quizAdd").disabled = !parsedQuiz.length;
  };
  $("quizAdd").onclick = () => {
    send({ type: "set_sequence", items: [...(state.sequence || []), ...parsedQuiz.map((q) => ({ mode: "multi_choice", prompt: q.prompt, options: q.options, correct: q.correct }))] });
    toast(`${parsedQuiz.length} added to plan`);
    $("quizPaste").value = ""; parsedQuiz = []; $("quizAdd").disabled = true; $("quizPrev").textContent = "";
  };
}

/* ---------------- TOOLS tab ---------------- */

function renderTools() {
  const t = state.timer;
  main.innerHTML = `
    <h3 class="sec">⏱ Timer</h3>
    <div class="timer-row">
      ${t
        ? `<span class="timer-live" id="timerLive"></span>
           ${t.paused ? `<button class="rbtn" data-act="timer_resume">▶ Resume</button>` : `<button class="rbtn" data-act="timer_pause">⏸ Pause</button>`}
           <button class="rbtn" data-act="timer_clear">✕ Clear</button>`
        : `<button class="rbtn" data-timer="30">30s</button>
           <button class="rbtn" data-timer="60">1m</button>
           <button class="rbtn" data-timer="120">2m</button>
           <button class="rbtn" data-timer="300">5m</button>`}
    </div>
    ${!t ? `<div class="timer-row" style="margin-top:0.5rem">
      <input class="rin" id="timerCustom" type="number" min="5" max="3600" placeholder="seconds" style="margin:0;flex:1" />
      <button class="rbtn" id="timerGo" style="flex:0 0 30%">Go</button></div>` : ""}

    <h3 class="sec">🎲 Random student</h3>
    <button class="rbtn" data-act="pick_student">Pick someone</button>
    ${state.focus?.type === "spotlight" ? `<div class="status"><div class="q">🎲 ${esc(state.focus.name)}</div></div>` : ""}

    <h3 class="sec">👥 Random groups</h3>
    <div class="timer-row">
      <select class="rin" id="groupBy" style="margin:0;flex:1"><option value="size">groups of</option><option value="count">split into</option></select>
      <input class="rin" id="groupN" type="number" min="2" max="15" value="2" style="margin:0;flex:0 0 26%" />
      <button class="rbtn" id="groupsGo" style="flex:0 0 30%">Make</button>
    </div>
    ${state.focus?.type === "groups" ? `<div class="status">${state.focus.groups.map((g, i) => `<div><b>Group ${i + 1}:</b> ${g.map(esc).join(", ")}</div>`).join("")}</div>` : ""}

    <h3 class="sec">📽 Big screen</h3>
    <div class="btn-row">
      <button class="rbtn" data-act="toggle_join">🔳 ${state.showJoin ? "QR is up — hide" : "Show join QR"}</button>
      ${state.focus ? `<button class="rbtn" data-act="clear_focus">✕ Clear screen</button>` : ""}
    </div>`;
  const tg = $("timerGo");
  if (tg) tg.onclick = () => { const s = parseInt($("timerCustom").value, 10); if (s >= 5) send({ type: "timer_start", seconds: s }); };
  $("groupsGo").onclick = () => send({ type: "make_groups", n: parseInt($("groupN").value, 10) || 2, by: $("groupBy").value });
}

setInterval(() => {
  const el = $("timerLive");
  const t = state?.timer;
  if (!el || !t) return;
  const left = t.paused ? t.remaining : Math.max(0, t.endsAt - Date.now());
  const s = Math.ceil(left / 1000);
  el.textContent = left <= 0 ? "0:00" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}, 300);

/* ---------------- MORE tab ---------------- */

function renderMore() {
  const name = localStorage.getItem("eyesup_teacher_name");
  main.innerHTML = `
    <h3 class="sec">Lesson</h3>
    <input class="rin" id="titleIn" maxlength="80" placeholder="Class / lesson title…" value="${esc(state.title || "")}" />
    <button class="rbtn accent" id="finishBtn">✅ Finish & summarise</button>
    <button class="rbtn" id="newLessonBtn">🆕 New lesson (next class)</button>

    <h3 class="sec">Sharing</h3>
    <button class="rbtn" id="copyJoin">🔗 Copy student join link</button>
    <a class="rbtn" style="text-decoration:none" href="/projector?code=${esc(state.code)}" target="_blank" rel="noopener">📽 Open projector view</a>

    ${state.storage ? `<h3 class="sec">Archive</h3><button class="rbtn" id="lessonsBtn">📚 Past lessons</button><div id="lessonsList"></div>` : ""}

    <h3 class="sec">Account</h3>
    <div class="status"><div class="q">${name ? `Signed in as ${esc(name)}` : "Local mode"}</div></div>
    ${creds().token ? `<button class="rbtn warn" id="signOut">↪ Sign out</button>` : ""}`;

  $("titleIn").onchange = () => { send({ type: "set_title", title: $("titleIn").value }); toast("Title saved"); };
  $("newLessonBtn").onclick = () => {
    if (confirm("Start a fresh lesson? This one is archived and ends for the students in the room."))
      send({ type: "new_lesson" });
  };
  $("finishBtn").onclick = () => { userSummaryWanted = true; send({ type: "get_summary" }); };
  $("copyJoin").onclick = () => { navigator.clipboard?.writeText(`${location.origin}/join?code=${state.code}`); toast("Join link copied"); };
  const lb = $("lessonsBtn");
  if (lb) lb.onclick = async () => {
    $("lessonsList").innerHTML = `<p style="color:var(--rdim)">Loading…</p>`;
    try {
      const res = await fetch(`/api/lessons${authQuery() ? `?${authQuery()}` : ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      $("lessonsList").innerHTML = data.lessons.length
        ? data.lessons.map((l) => `<a class="lesson-row" href="/report?lesson=${l.id}${authQuery() ? `&${authQuery()}` : ""}" target="_blank" rel="noopener">
            <b>${esc(l.title || "Untitled lesson")}</b>
            <span>${esc(new Date(l.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }))} · ${l.participated ?? 0}/${l.joined ?? 0} students · ${l.interactions ?? 0} interactions</span>
          </a>`).join("")
        : `<p style="color:var(--rdim)">No stored lessons yet.</p>`;
    } catch { $("lessonsList").innerHTML = `<p style="color:#e79191">Couldn't load the archive.</p>`; }
  };
  const so = $("signOut");
  if (so) so.onclick = () => { localStorage.removeItem("eyesup_token"); sessionStorage.clear(); location.reload(); };
}

function renderSummarySheet(s) {
  $("summarySheet").innerHTML = `
    <button class="close-x" id="sumClose">✕</button>
    <h2>${s.title ? esc(s.title) : "Recap summary"}</h2>
    <div class="status">
      <div class="q">${s.participatedCount}/${s.joinedCount} participated · ${s.interactionCount} interactions${s.confidence ? ` · ${s.confidence.understanding}% signalled understanding` : ""}</div>
    </div>
    ${s.commonWords.length ? `<div style="margin-bottom:0.7rem">${s.commonWords.map((w) => `<span class="word-chip-r">${esc(w.word)} ×${w.count}</span>`).join("")}</div>` : ""}
    ${s.items.map((it) => `<div class="resp-row"><span class="rr-what"><b>${modeName(it.mode)}</b> ${esc(it.prompt || "")} — ${it.responses} responses</span></div>`).join("")}
    <a class="rbtn accent" style="text-decoration:none;margin-top:0.7rem" href="/report?code=${esc(state.code)}${authQuery() ? `&${authQuery()}` : ""}" target="_blank" rel="noopener">🖨 Open full report / export PDF</a>`;
  $("summaryWrap").classList.add("show");
  $("sumClose").onclick = () => $("summaryWrap").classList.remove("show");
}

/* ---------------- connect gate ---------------- */

function renderGate(err) {
  $("topInfo").textContent = "";
  const preset = (new URLSearchParams(location.search).get("code") || creds().code || "").toUpperCase();
  const hasToken = !!creds().token;
  main.innerHTML = `
    <div class="gate">
      <div style="font-size:2.5rem">📱</div>
      <h2 style="font-family:var(--font-display);margin-top:0.5rem">Teacher remote</h2>
      <p style="color:var(--rdim);font-size:0.9rem;margin-top:0.3rem">Everything the dashboard does, from your pocket.</p>
      <input id="codeIn" maxlength="4" placeholder="SESSION CODE" value="${esc(preset)}" autocomplete="off" />
      ${hasToken && err !== "auth_required" ? "" : `
        <input id="userIn" placeholder="Your username" autocomplete="username" />
        <input id="pwIn" type="password" placeholder="Your password" autocomplete="current-password" />`}
      ${err === "bad_password" || err === "auth_required" ? `<p class="err">Sign-in didn't match — try again.</p>` : ""}
      ${err === "no_session" ? `<p class="err">No live session with that code (or it isn't yours).</p>` : ""}
      <button class="rbtn accent" id="goBtn" style="margin-top:0.8rem">Connect</button>
    </div>`;
  const go = async () => {
    const code = $("codeIn").value.trim().toUpperCase();
    if (code.length !== 4) return;
    sessionStorage.setItem("eyesup_remote_code", code);
    if ($("userIn")) {
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: $("userIn").value, password: $("pwIn").value }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("eyesup_token", data.token);
          localStorage.setItem("eyesup_teacher_name", data.name || data.username);
        } else if (data.error === "storage_off") {
          sessionStorage.setItem("eyesup_remote_pw", $("pwIn").value);
        } else {
          renderGate("auth_required");
          $("codeIn").value = code;
          return;
        }
      } catch { /* try the resume anyway */ }
    }
    const { password, token } = creds();
    send({ type: "teacher_resume", code, password, token });
  };
  $("goBtn").onclick = go;
  main.querySelectorAll("input").forEach((i) => (i.onkeydown = (e) => { if (e.key === "Enter") go(); }));
}

/* Boot: a QR from the signed-in dashboard carries ?pair=… — claim it so
   the phone signs in and joins with zero typing. */
(async () => {
  const params = new URLSearchParams(location.search);
  const urlCode = (params.get("code") || "").toUpperCase();
  if (urlCode) sessionStorage.setItem("eyesup_remote_code", urlCode);
  const pair = params.get("pair");
  if (pair) {
    try {
      const res = await fetch("/api/pair/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pair }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("eyesup_token", data.token);
        localStorage.setItem("eyesup_teacher_name", data.name || data.username);
        localStorage.setItem("eyesup_has_account", "1");
      }
    } catch { /* fall back to the sign-in gate */ }
    history.replaceState(null, "", urlCode ? `/remote?code=${urlCode}` : "/remote");
  }
  renderGate();
  connect(); // onopen auto-resumes with the stored code + fresh token
})();
