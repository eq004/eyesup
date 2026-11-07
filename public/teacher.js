/* Eyes Up — teacher dashboard */

const MODES = {
  slide:         { icon: "📽", name: "Slide", hint: "A slide from your PowerPoint or Google Slides", opts: null },
  deck:          { icon: "🎞", name: "Live slides", hint: "Your real Google Slides / PowerPoint / Canva deck, animations and all", opts: null },
  /* fast votes */
  multi_choice:  { icon: "🅰️", name: "Multiple Choice", hint: "Quiz question — reveal the answer after voting", opts: { min: 2, max: 5, labels: "Option" }, hasCorrect: true, picOpts: true },
  picture_choice:{ icon: "🖼️", name: "Picture Choice", hint: "Drop in 2–8 pictures — students tap one; mark the right one if there is one", opts: { min: 2, max: 8, labels: "Caption" }, hasCorrect: true, picOpts: true, picDrop: true, launchAs: "multi_choice",
                   ph: "The question, e.g. “Which one is a mammal?”" },
  tick_boxes:    { icon: "☑️", name: "Tick the Boxes", hint: "Students tick every box that applies — the board keeps a tally", opts: { min: 2, max: 10, labels: "Box" } },
  poll:          { icon: "📊", name: "Poll",          hint: "2–5 options, live results",       opts: { min: 2, max: 5, labels: "Option" }, picOpts: true },
  agree_disagree:{ icon: "⚖️", name: "Agree / Disagree", hint: "Agree · Unsure · Disagree",    opts: null },
  true_false:    { icon: "✅", name: "True or False", hint: "Two buttons, instant",            opts: null },
  this_or_that:  { icon: "⚡", name: "This or That",  hint: "Two big options, fast",           opts: { min: 2, max: 2, labels: "Choice" }, picOpts: true },
  confidence:    { icon: "🎯", name: "Confidence",    hint: "Got it · Nearly · Confused",      opts: null },
  example_nonexample: { icon: "↔️", name: "Example / Non-example", hint: "Which fits the concept — and why?", opts: { min: 2, max: 2, labels: "Item" } },
  smiley:        { icon: "😊", name: "Smiley Review", hint: "5 faces, happiest to saddest — one tap", opts: null,
                   ph: "What are they reviewing? e.g. “How was today's lesson?”" },
  picture_vote:  { icon: "🗳️", name: "Picture Vote", hint: "Put an image up — class votes on it", opts: { min: 2, max: 5, labels: "Option" }, imageUpload: true,
                   ph: "The question about the image, e.g. “Which technique is this?”" },
  scale:         { icon: "🎚️", name: "Scale",        hint: "Students place a marker along a line", opts: { min: 0, max: 2, labels: "End" },
                   ph: "The statement or question they're placing themselves on" },
  /* words & ideas */
  word_cloud:    { icon: "☁️", name: "Word Cloud",    hint: "Words build a live cloud",        opts: null, multiOpt: true },
  one_word:      { icon: "🗣️", name: "One Word",     hint: "Exactly one word each",           opts: null },
  mindmap:       { icon: "🕸️", name: "Mindmap",      hint: "Ideas branch around a concept",   opts: null,
                   ph: "The central concept, e.g. “Generative AI”", multiOpt: true },
  post_its:      { icon: "🗒️", name: "Post-its",     hint: "Sticky notes fill the board — screened or straight up", opts: null, postits: true, multiOpt: true },
  phonics:       { icon: "🔤", name: "Phonics Keyboard", hint: "Say a word — students build it from sounds", opts: null,
                   ph: "Optional: show the word/question on screens — or just say it aloud" },
  phonics_cloze: { icon: "🖼️", name: "Picture Phonics", hint: "Picture on the board only; students build the missing sounds on the phonics keyboard",
                   opts: null, imageUpload: true, wordUI: true, ph: "Optional instruction on their screens, e.g. “Look at the board and build the word”" },
  /* written recall */
  short_answer:  { icon: "✏️", name: "Short Answer",  hint: "Written replies, reveal in turn", opts: null },
  long_response: { icon: "📜", name: "Long Response", hint: "Extended writing — paragraphs, not phrases", opts: null,
                   ph: "The question that deserves a full answer" },
  picture_prompt:{ icon: "🖼️", name: "Picture Prompt", hint: "Drop in a picture — it appears on every student's screen and they write about it", opts: null, imageUpload: true,
                   ph: "The question about the image — or ask it aloud" },
  retrieval_sprint:{ icon: "🧠", name: "Retrieval Sprint", hint: "1–3 timed minutes — write everything you recall", opts: null, sprintUI: true },
  link:          { icon: "🔗", name: "Website Link",  hint: "Send every student to a website with one tap", opts: null, linkUI: true,
                   ph: "Instruction for students, e.g. “Read the first section, then come back”" },
  question_set:  { icon: "📝", name: "Question Set",  hint: "Several short-answer questions on one screen, sent together", opts: { min: 2, max: 8, labels: "Question", maxLen: 200 },
                   ph: "Optional heading, e.g. “Chapter 3 check-in”" },
  compose_beginner: { icon: "🎵", name: "Make a Tune · Beginner", hint: "Crotchets and minims in 4/4, letters inside the notes, C to C — a first go at writing music", opts: null, tuneUI: true, launchAs: "compose", forceLevel: "beginner",
                   ph: "e.g. “Write a tune using C, D and E” — or leave blank" },
  compose:       { icon: "🎼", name: "Make a Tune",   hint: "Semibreve to quaver with rests, sharps & flats, 2/4 3/4 4/4 — real notation on a treble stave", opts: null, tuneUI: true, forceLevel: "standard",
                   ph: "e.g. “Compose a tune that ends on C” — or leave blank" },
  compose_advanced: { icon: "🎼", name: "Make a Tune · Advanced", hint: "Adds semiquavers, dotted notes, beams, 6/8 and a wider range (A below the stave to high C)", opts: null, tuneUI: true, launchAs: "compose", forceLevel: "advanced",
                   ph: "e.g. “Write a 4-bar melody in 6/8” — or leave blank" },
  dot_points:    { icon: "📌", name: "Dot Points",    hint: "Students build a quick bulleted list, one point at a time", opts: null,
                   ph: "e.g. “List everything you know about volcanoes”" },
  table:         { icon: "📋", name: "Table",         hint: "Students fill a table — compare, sort, KWL", opts: { min: 2, max: 4, labels: "Column heading" }, tableUI: true,
                   ph: "The task, e.g. “Compare solids, liquids and gases”" },
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
  plus_minus:    { icon: "➕", name: "Plus & Minus",  hint: "Positives one side, negatives the other", opts: null, multiOpt: true,
                   ph: "The topic to weigh up, e.g. “Homework” or “Social media”" },
  muddiest_point:{ icon: "🌫️", name: "Muddiest Point", hint: "Anonymous — least clear thing", opts: null },
  ask_question:  { icon: "❓", name: "Ask a Question", hint: "Anonymous — what's still fuzzy?", opts: null },
  /* arrange & match */
  ranking:       { icon: "🔢", name: "Ranking",       hint: "Class orders by importance",      opts: { min: 2, max: 6, labels: "Item" }, picOpts: true },
  put_in_order:  { icon: "🪜", name: "Put in Order",  hint: "Sequence steps or events — enter them in the CORRECT order", opts: { min: 2, max: 6, labels: "Step" }, picOpts: true },
  match_up:      { icon: "🧩", name: "Match Up",      hint: "Match terms to definitions or examples — or pictures to words", pairs: { min: 2, max: 6 }, picOpts: true },
  venn:          { icon: "◉", name: "Venn Diagram",   hint: "Sort ideas into two overlapping circles", opts: { min: 2, max: 2, labels: "Circle" },
                   ph: "The sorting question, e.g. “Which features belong where?”", multiOpt: true },
  /* practise & test */
  spelling:      { icon: "🔡", name: "Spelling Test", hint: "You say the words aloud — students type, auto-marked", opts: { min: 1, max: 10, labels: "Word" },
                   ph: "Optional title, e.g. “Week 7 words”" },
  cloze:         { icon: "▭", name: "Cloze Passage",  hint: "Paste a passage; [bracket] the hidden words", clozeUI: true,
                   ph: "Optional instruction, e.g. “Fill the gaps”" },
  working:       { icon: "🧮", name: "Working Out",   hint: "Calculator pad that records every step", workingUI: true,
                   ph: "The problem — or write it on the board" },
  counters:      { icon: "🟠", name: "Counters",      hint: "Drag coloured counters to build the maths", workingUI: true, forceKind: "colors",
                   ph: "The equation, e.g. “3 + 4 = ?”" },
  tens_ones:     { icon: "🔟", name: "Tens & Ones",   hint: "Base-ten blocks — build the number", workingUI: true, forceKind: "base10", launchAs: "counters",
                   ph: "e.g. “Build 47” or “30 + 17 = ?”" },
  /* draw */
  maths_board:   { icon: "🧮", name: "Maths Board",   hint: "Counters, tens & ones, free drawing and a number pad — all on one board", workingUI: true,
                   ph: "The problem, e.g. “23 + 19 = ?”" },
  counters_draw: { icon: "🟠", name: "Counters + Drawing", hint: "Counters, tens & ones and free drawing — no number pad", opts: null,
                   ph: "e.g. “Show 3 groups of 4”" },
  sketch:        { icon: "🎨", name: "Sketch It",     hint: "Draw understanding instead of writing", opts: null },
  trace:         { icon: "✍️", name: "Letter Formation", hint: "Dotted letters or numbers to trace — every attempt shows on the board", opts: null, traceUI: true,
                   ph: "Optional instruction, e.g. “Start at the top and go round”" },
  annotate:      { icon: "🖍️", name: "Annotate",     hint: "Upload an image — students draw on it", opts: null, imageUpload: true,
                   ph: "What should they mark up? e.g. “Circle the error / label the diagram”" },
  image_drop:    { icon: "📥", name: "Drop an Image", hint: "Students drop, choose or photograph an image as their answer", opts: null,
                   ph: "What should they show? e.g. “A photo of your finished model”" },
  image_long:    { icon: "📓", name: "Image + Long Answer", hint: "Images plus a full written answer, sent together", opts: null,
                   ph: "e.g. “Photograph each stage of your experiment and write up what happened”" },
  image_caption: { icon: "📸", name: "Image + Writing", hint: "Images and a few sentences, submitted together", opts: null,
                   ph: "e.g. “Photograph your experiment and explain what happened”" },
};

const TOOL_STEP_LABEL = "🧰 Room tools";
// The Free plan's activities (room tools are always included). Everything else shows a 🔒 on the Free plan.
const FREE_MODES = new Set(["short_answer", "word_cloud", "mindmap", "post_its", "agree_disagree"]);
const onFreePlan = () => (state?.tier || me?.tier) === "free";
const isLocked = (key) => onFreePlan() && !MODES[key]?.toolUI && !FREE_MODES.has(MODES[key]?.launchAs || key);
Object.assign(MODES, {
  tool_timer:  { icon: "⏱", name: "Timer", hint: "A countdown on the classroom screen — 30 seconds to 15 minutes", opts: null, toolUI: "timer" },
  tool_pick:   { icon: "🎲", name: "Random student", hint: "Picks someone at random — no repeats until everyone has had a turn", opts: null, toolUI: "pick" },
  tool_groups: { icon: "👥", name: "Random groups", hint: "Splits whoever has joined into groups on the classroom screen", opts: null, toolUI: "groups" },
  tool_dice:   { icon: "🎲", name: "Question dice", hint: "Rolls the dice — it lands on one of your six questions", opts: null, toolUI: "dice" },
});
const CATEGORIES = [
  { label: "⚡ Fast votes", modes: ["multi_choice", "picture_choice", "poll", "tick_boxes", "picture_vote", "agree_disagree", "true_false", "this_or_that", "confidence", "smiley", "scale", "example_nonexample"] },
  { label: "☁️ Words & ideas", modes: ["word_cloud", "one_word", "mindmap", "post_its", "phonics", "phonics_cloze"] },
  { label: "✏️ Written recall", modes: ["short_answer", "long_response", "picture_prompt", "retrieval_sprint", "question_set", "table", "dot_points", "link", "exit_ticket", "finish_sentence", "give_example", "make_connection", "teach_back", "spot_mistake", "quick_challenge", "predict"] },
  { label: "🪞 Reflect", modes: ["three_two_one", "notice_wonder", "before_after", "plus_minus", "muddiest_point", "ask_question"] },
  { label: "🧩 Arrange & match", modes: ["ranking", "put_in_order", "match_up", "venn"] },
  { label: "🧪 Practise & test", modes: ["spelling", "cloze", "working", "counters", "tens_ones", "maths_board", "counters_draw"] },
  { label: "🎨 Draw & images", modes: ["sketch", "trace", "annotate", "image_drop", "image_caption", "image_long"] },
  { label: "🎵 Music", modes: ["compose_beginner", "compose", "compose_advanced"] },
  // Plan steps for the room tools; on the spot the tools have their own section under the grid, so these tiles show only in the plan picker.
  { label: TOOL_STEP_LABEL, modes: ["tool_timer", "tool_pick", "tool_groups", "tool_dice"] },
];

const TEXT_MODES = new Set(["short_answer", "predict", "ask_question", "exit_ticket", "muddiest_point", "retrieval_sprint", "spot_mistake", "teach_back", "give_example", "make_connection", "finish_sentence", "quick_challenge", "picture_prompt", "long_response"]);
const WORD_MODES = new Set(["word_cloud", "one_word", "mindmap"]);
const STRUCTURED = new Set(["three_two_one", "notice_wonder", "before_after"]);
const ANON_MODES = new Set(["ask_question", "muddiest_point"]);
// Modes where the teacher gates responses onto the classroom screen.
const revealMode = (m) =>
  TEXT_MODES.has(m) || STRUCTURED.has(m) || m === "question_set" || m === "sketch" || m === "trace" || m === "annotate" || m === "image_drop" || m === "image_caption" || m === "image_long" || m === "maths_board" || m === "counters_draw" ||
  m === "example_nonexample" || m === "post_its" || m === "phonics" || m === "working" ||
  m === "counters" || m === "table" || m === "dot_points" || m === "plus_minus" || m === "compose";

function miniTable(columns, rows) {
  return `<table class="mini-table"><thead><tr>${columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
    <tbody>${(rows || []).map((row) => `<tr>${row.map((c) => `<td>${esc(c || "—")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

const COUNTER_COLORS = ["#e05252", "#4a7de0", "#e8c33c", "#3f9e5f"];
// Recreate a student's manipulative board as a small SVG.
function boardSvg(items, kind, width) {
  const inner = (items || [])
    .map((it) =>
      kind === "base10"
        ? it.k === 0
          ? `<g><rect x="${it.x - 2}" y="${it.y - 10}" width="4" height="20" fill="#7f8ff0" stroke="#4a3fb5" stroke-width="0.5"/>${Array.from(
              { length: 9 },
              (_, s) => `<line x1="${it.x - 2}" y1="${it.y - 10 + 2 * (s + 1)}" x2="${it.x + 2}" y2="${it.y - 10 + 2 * (s + 1)}" stroke="#4a3fb5" stroke-width="0.3"/>`
            ).join("")}</g>`
          : `<rect x="${it.x - 2}" y="${it.y - 2}" width="4" height="4" fill="#7f8ff0" stroke="#4a3fb5" stroke-width="0.5"/>`
        : `<circle cx="${it.x}" cy="${it.y}" r="3.4" fill="${COUNTER_COLORS[it.k] || "#999"}" stroke="rgba(0,0,0,0.25)" stroke-width="0.5"/>`
    )
    .join("");
  return `<svg viewBox="0 0 100 62" style="width:${width};background:#eef2f7;border-radius:8px;border:1px solid #d5dde8" aria-label="counter board">${inner}</svg>`;
}

// Same forgiving marker the server uses (case/space-insensitive, numeric-aware).
function markMatch(attempt, target) {
  const a = String(attempt || "").trim().toLowerCase();
  const t = String(target || "").trim().toLowerCase();
  if (!a) return false;
  if (a === t) return true;
  const na = Number(a.replace(",", "."));
  const nt = Number(t.replace(",", "."));
  return Number.isFinite(na) && Number.isFinite(nt) && Math.abs(na - nt) < 1e-9;
}

// Phonics grapheme categories — mirrors the student keyboard's colours.
function phonCat(p) {
  if (p === "-e") return "sil";
  if (["a", "e", "i", "o", "u", "oo"].includes(p)) return "vow";
  if (["ch", "sh", "th", "ph", "ck", "wh", "ng", "qu"].includes(p)) return "dig";
  if (["ow", "er", "ar", "ai", "ay", "ee", "ea", "igh", "oa", "oi", "oy"].includes(p)) return "team";
  return "let";
}
function phonChips(parts) {
  return `<span class="phon-word">${(parts || [])
    .map((p) => `<span class="phon-chip pc-${phonCat(p)}">${esc(p === "-e" ? "e" : p)}</span>`)
    .join("")}</span>`;
}

const $ = (id) => document.getElementById(id);
let ws = null;
let state = null;
let composerModeKey = null;

/* ---------------- connection ---------------- */

function teacherPw() {
  return sessionStorage.getItem("eyesup_pw") || "";
}
function teacherToken() {
  return localStorage.getItem("eyesup_token") || "";
}
// Auth credential for HTTP links/fetches: account token (database mode)
// or the legacy shared password (local mode).
function authQuery() {
  const t = teacherToken();
  if (t) return `t=${encodeURIComponent(t)}`;
  return teacherPw() ? `pw=${encodeURIComponent(teacherPw())}` : "";
}

// While the server is asleep (free hosting) or unreachable, say so instead
// of looking broken.
function wakeNote(show) {
  let el = document.getElementById("wakeNote");
  if (!show) { if (el) el.remove(); return; }
  if (el) return;
  el = document.createElement("div");
  el.id = "wakeNote";
  el.style.cssText = "position:fixed;left:50%;top:0.8rem;transform:translateX(-50%);z-index:9999;background:#0f1c30;color:#fff;padding:0.6rem 1rem;border-radius:12px;font-size:0.9rem;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,0.25)";
  el.textContent = "⏳ Waking the server up… first visit of the day can take up to a minute. Hang tight.";
  document.body.appendChild(el);
}

function attach() {
  const code = sessionStorage.getItem("eyesup_teacher_code");
  const creds = { token: teacherToken(), password: teacherPw() };
  if (code) ws.send(JSON.stringify({ type: "teacher_resume", code, ...creds }));
  else ws.send(JSON.stringify({ type: "teacher_create", ...creds }));
}

function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onopen = () => { wakeNote(false); attach(); };
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "error" && msg.error === "auth_required") {
      localStorage.removeItem("eyesup_token");
      showAuthOverlay();
      return;
    }
    if (msg.type === "error" && msg.error === "subscription_required") {
      showSubscribe(msg.reason);
      return;
    }
    if (msg.type === "error" && (msg.error === "locked_activity" || msg.error === "locked_plans" || msg.error === "locked_downloads")) {
      showSubscribe(msg.error);
      return;
    }
    if (msg.type === "error" && msg.error === "bad_link") {
      toast("That website address doesn't look right — edit the step and paste the full address");
      return;
    }
    if (msg.type === "error" && msg.error === "db_unavailable") {
      // Storage blip (server waking, pooler restart) — keep the sign-in,
      // keep trying; nothing is lost.
      toast("Connecting to the lesson archive… retrying");
      setTimeout(() => ws.readyState === 1 && attach(), 5000);
      return;
    }
    if (msg.type === "error" && msg.error === "bad_password") {
      $("pwError").style.display = teacherPw() ? "block" : "none";
      sessionStorage.removeItem("eyesup_pw");
      $("pwOverlay").classList.add("show");
      $("pwInput").focus();
      return;
    }
    if (msg.type === "error" && msg.error === "no_session") {
      sessionStorage.removeItem("eyesup_teacher_code");
      ws.send(JSON.stringify({ type: "teacher_create", token: teacherToken(), password: teacherPw() }));
      return;
    }
    if (msg.type === "summary") {
      archiveSummary(msg); // every summary is captured locally, asked-for or not
      if (userSummaryWanted) {
        userSummaryWanted = false;
        renderSummary(msg);
      }
      return;
    }
    if (msg.type === "state") {
      state = msg;
      $("pwOverlay").classList.remove("show");
      $("authOverlay").classList.remove("show");
      sessionStorage.setItem("eyesup_teacher_code", state.code);
      render();
      scheduleAutosave();
    }
  };
  ws.onclose = () => { wakeNote(true); setTimeout(connect, 1200); };
}
const send = (obj) => ws && ws.readyState === 1 && ws.send(JSON.stringify(obj));

/* ---------------- session autosave ----------------
   Sessions live in server memory, so the dashboard continuously snapshots
   the full summary into this browser. If the server restarts before the
   teacher exports, the report page recovers from this archive. */

let userSummaryWanted = false;
let autosaveTimer = null;
let lastAutosaveKey = "";

function scheduleAutosave() {
  if (!state) return;
  const itx = state.interaction;
  const key = `${state.historyCount}|${itx?.id || 0}|${itx?.responses.length || 0}`;
  if (key === lastAutosaveKey || autosaveTimer) return;
  lastAutosaveKey = key;
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    send({ type: "get_summary" }); // archived on arrival; no overlay unless asked
  }, 3000);
}

function archiveSummary(summary) {
  if (!state) return;
  try {
    const arc = JSON.parse(localStorage.getItem("eyesup_archive") || "{}");
    arc[state.code] = { savedAt: Date.now(), summary };
    // keep the ten most recent sessions
    const keep = Object.keys(arc)
      .sort((a, b) => arc[b].savedAt - arc[a].savedAt)
      .slice(0, 10);
    localStorage.setItem("eyesup_archive", JSON.stringify(Object.fromEntries(keep.map((c) => [c, arc[c]]))));
  } catch { /* storage full/blocked — the live path still works */ }
}

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
  const favs = (state?.favs || []).filter((f) => MODES[f]);
  grid.innerHTML = "";
  const catHead = (key, label, count) => {
    const h = document.createElement("button");
    h.type = "button";
    h.className = `mode-cat ${foldOn(`cat:${key}`) ? "folded" : ""}`;
    h.title = foldOn(`cat:${key}`) ? "Show these activities" : "Fold these activities away";
    h.innerHTML = `<span class="cat-chev">▸</span><span class="cat-name">${label}</span><span class="cat-count">${count} ${count === 1 ? "activity" : "activities"}</span>`;
    h.dataset.cat = key;
    h.onclick = () => { setFold(`cat:${key}`, !foldOn(`cat:${key}`)); buildModeGrid(); };
    grid.appendChild(h);
  };
  const addTile = (key, cat) => {
    const m = MODES[key];
    const isFav = favs.includes(key);
    const locked = isLocked(key);
    const b = document.createElement("button");
    b.className = `mode-tile ${locked ? "locked" : ""}`;
    b.innerHTML = `<span class="fav-star ${isFav ? "on" : ""}" title="${isFav ? "Remove from favourites" : "Favourite — pins it up top here and on your phone remote"}">${isFav ? "★" : "☆"}</span>
      ${locked ? `<span class="lock" title="Part of the Individual plan">🔒</span>` : ""}
      <span class="icon">${m.icon}</span><span class="name">${m.name}</span><span class="hint">${m.hint}</span>`;
    // Switching between image modes keeps the image you already loaded.
    b.onclick = () => (locked ? showSubscribe("locked_activity") : openComposer(key, !!(MODES[key].imageUpload && composerImage)));
    b.querySelector(".fav-star").onclick = (e) => {
      e.stopPropagation();
      const next = isFav ? favs.filter((f) => f !== key) : [...favs, key];
      send({ type: "set_favs", favs: next });
    };
    b.hidden = foldOn(`cat:${cat}`);
    b.dataset.cat = cat;
    grid.appendChild(b);
  };
  if (favs.length) {
    catHead("favs", "⭐ Favourites", favs.length);
    favs.forEach((k) => addTile(k, "favs"));
  }
  for (const cat of CATEGORIES) {
    catHead(cat.label, cat.label, cat.modes.length);
    cat.modes.forEach((k) => addTile(k, cat.label));
  }
}

/* Folds and pins: which areas a teacher has folded away or let scroll, remembered on this computer. */
const folds = (() => { try { return JSON.parse(localStorage.getItem("eyesup_folds") || "{}") || {}; } catch { return {}; } })();
// Activity categories and Room tools start folded; ⭐ Favourites, Live now and the lesson strip start open.
const foldDefault = (key) => (key.startsWith("cat:") && key !== "cat:favs") || key === "tools";
const foldOn = (key) => (key in folds ? !!folds[key] : foldDefault(key));
const setFold = (key, on) => { folds[key] = !!on; try { localStorage.setItem("eyesup_folds", JSON.stringify(folds)); } catch { /* private window */ } };

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

// Picture answers: a small picture per option, kept beside its text box.
let composerOptImgs = [];
function loadOptionImage(file, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 480 / img.width, 480 / img.height);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", 0.8));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function picButton(i) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "opt-pic";
  b.dataset.pic = String(i);
  b.title = "Add a picture for this option";
  b.innerHTML = "🖼";
  b.onclick = () => {
    if (composerOptImgs[i]) { composerOptImgs[i] = null; showOptThumb(i); return; } // tap again to remove
    const f = document.createElement("input");
    f.type = "file"; f.accept = "image/*";
    f.onchange = () => { if (f.files[0]) loadOptionImage(f.files[0], (d) => { composerOptImgs[i] = d; showOptThumb(i); }); };
    f.click();
  };
  return b;
}
function showOptThumb(i) {
  const b = $("composerOpts").querySelector(`.opt-pic[data-pic="${i}"]`);
  if (!b) return;
  const d = composerOptImgs[i];
  b.innerHTML = d ? `<img src="${d}" alt="" />` : "🖼";
  b.title = d ? "Picture added — click to remove it" : "Add a picture for this option";
  b.classList.toggle("has", !!d);
}
/* Picture Choice: many pictures dropped at once, each one a tappable option. */
let picCorrect = null;
let picCaps = [];
function buildPicDrop(opts) {
  picCorrect = null;
  picCaps = [];
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="drop-zone" id="picDrop">🖼️ Drop your pictures here — as many as you like, up to 8 — or click to choose
      <input type="file" id="picFiles" accept="image/*" multiple hidden />
    </div>
    <div class="pic-grid" id="picGrid"></div>
    <p style="margin:0.4rem 0 0;font-size:0.9rem;color:var(--muted)">Students tap one picture. Tap ✓ on a picture to mark it as the right answer (optional). A short caption under each keeps the results readable.</p>`;
  opts.appendChild(wrap);
  $("picDrop").onclick = () => $("picFiles").click();
  $("picFiles").onchange = (e) => { addPicChoiceFiles(e.target.files); e.target.value = ""; };
  renderPicGrid();
}
function addPicChoiceFiles(list) {
  const files = [...(list || [])].filter((f) => f && f.type && f.type.startsWith("image/"));
  const room = 8 - composerOptImgs.length;
  if (files.length > room) toast(room ? `Up to 8 pictures — the first ${room} were added` : "That's 8 pictures — remove one to add another");
  files.slice(0, room).forEach((f) => loadOptionImage(f, (d) => { composerOptImgs.push(d); picCaps.push(""); renderPicGrid(); }));
}
function renderPicGrid() {
  const g = $("picGrid");
  if (!g) return;
  g.innerHTML = composerOptImgs.map((d, i) => `
    <div class="pic-tile ${picCorrect === i ? "correct" : ""}">
      <img src="${d}" alt="" />
      <button type="button" class="pic-ok" data-ok="${i}" title="${picCorrect === i ? "This is the right answer — tap to unmark" : "Mark as the right answer"}">✓</button>
      <button type="button" class="pic-x" data-x="${i}" title="Remove this picture">✕</button>
      <input type="text" data-opt="1" data-cap="${i}" maxlength="40" placeholder="Caption ${i + 1} (optional)" value="${esc(picCaps[i] || "")}" />
    </div>`).join("");
  g.querySelectorAll("[data-cap]").forEach((inp) => (inp.oninput = () => { picCaps[+inp.dataset.cap] = inp.value; }));
  g.querySelectorAll("[data-x]").forEach((b) => (b.onclick = () => {
    const i = +b.dataset.x;
    composerOptImgs.splice(i, 1);
    picCaps.splice(i, 1);
    if (picCorrect === i) picCorrect = null; else if (picCorrect != null && picCorrect > i) picCorrect -= 1;
    renderPicGrid();
  }));
  g.querySelectorAll("[data-ok]").forEach((b) => (b.onclick = () => { const i = +b.dataset.ok; picCorrect = picCorrect === i ? null : i; renderPicGrid(); }));
}
function picRow(inp, i) {
  const row = document.createElement("div");
  row.className = "opt-row";
  row.appendChild(picButton(i));
  row.appendChild(inp);
  return row;
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
  composerOptImgs = [];
  prompt.hidden = !!m.toolUI; // a room tool has no question to type
  if (m.toolUI) {
    const wrap = document.createElement("div");
    wrap.className = "tool-setup";
    if (m.toolUI === "timer") {
      wrap.innerHTML = `<label>How long? <select id="toolSeconds">${[30, 60, 90, 120, 180, 300, 600, 900].map((s) => `<option value="${s}"${s === 60 ? " selected" : ""}>${s < 60 ? `${s} seconds` : `${s / 60} minute${s === 60 ? "" : "s"}`}</option>`).join("")}</select></label>
        <label class="timer-big-opt"><input type="checkbox" id="toolBig" /> ⛶ Fill the classroom screen with the countdown</label>
        <p class="tool-setup-note">Starts the moment ▶ reaches this step. A question that is already up stays up; the timer sits in the corner.</p>`;
    } else if (m.toolUI === "pick") {
      wrap.innerHTML = `<p class="tool-setup-note">When ▶ reaches this step, one student is picked at random and their name fills the classroom screen. Nobody is picked twice until everyone has had a turn.</p>`;
    } else if (m.toolUI === "groups") {
      wrap.innerHTML = `<label><select id="toolGroupBy"><option value="size">groups of</option><option value="count">split into</option></select> <input type="number" id="toolGroupN" min="1" max="40" value="4" /></label>
        <p class="tool-setup-note">Made from whoever has joined when ▶ reaches this step, and shown on the classroom screen.</p>`;
    } else if (m.toolUI === "dice") {
      wrap.innerHTML = [1, 2, 3, 4, 5, 6].map((i) => `<label class="dice-row"><span class="dice-lbl">Face ${i}</span><input type="text" class="tool-dice-in" data-face="${i - 1}" maxlength="200" placeholder="Question when it lands on ${i}" /></label>`).join("") +
        `<p class="tool-setup-note">Leave the faces blank to roll with the questions already typed under 🧰 Room tools.</p>`;
    }
    opts.appendChild(wrap);
  }
  if (m.picDrop) buildPicDrop(opts);
  if (m.opts && !m.picDrop) {
    for (let i = 0; i < m.opts.max; i++) {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.maxLength = m.opts.maxLen || 80;
      inp.placeholder = `${m.opts.labels} ${i + 1}${i < m.opts.min ? "" : " (optional)"}`;
      inp.dataset.opt = "1";
      if (m.picOpts) opts.appendChild(picRow(inp, i));
      else opts.appendChild(inp);
    }
    if (m.picOpts) {
      const note = document.createElement("p");
      note.style.cssText = "margin:0.4rem 0 0;font-size:0.9rem;color:var(--muted)";
      note.textContent = "🖼 adds a picture to an option — students tap the picture. A short word beside it keeps the results readable.";
      opts.appendChild(note);
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
    multiSel.style.cssText = "margin-top:0.55rem;border:1px solid #c7d4e8;border-radius:10px;padding:0.5rem 0.7rem;background:#fff;font-size:0.9rem";
    opts.appendChild(multiSel);
  }
  if (m.linkUI) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <input type="text" id="linkUrl" maxlength="600" inputmode="url" autocomplete="off" placeholder="Paste the website address, e.g. https://www.bbc.co.uk/bitesize/…" />
      <input type="text" id="linkLabel" maxlength="60" autocomplete="off" placeholder="Button wording (optional) — e.g. “Open the volcano video”" style="margin-top:0.45rem" />`;
    opts.appendChild(wrap);
  }
  if (m.wordUI) {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.id = "wordFrame";
    inp.maxLength = 60;
    inp.placeholder = "The word, with [brackets] round the sounds to build — e.g. sh[ee]p, or [c][a][t] for every sound";
    inp.autocomplete = "off";
    opts.appendChild(inp);
  }
  if (m.clozeUI) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <textarea id="clozeText" rows="5" maxlength="1500"
        placeholder="Paste the passage and put [square brackets] around each hidden word.&#10;e.g. Plants make food by [photosynthesis] using light from the [sun]."
        style="width:100%;margin-top:0.55rem;border:1px solid #c7d4e8;border-radius:10px;padding:0.6rem 0.8rem;font-size:0.9rem;background:#fff;resize:vertical"></textarea>
      <select id="clozeMode" style="margin-top:0.45rem;border:1px solid #c7d4e8;border-radius:10px;padding:0.5rem 0.7rem;background:#fff;font-size:0.9rem">
        <option value="type">⌨️ Students type the missing words</option>
        <option value="bank">🧺 Word bank — students pick from your bracketed words</option>
      </select>`;
    opts.appendChild(wrap);
  }
  if (m.countersUI) {
    const kindSel = document.createElement("select");
    kindSel.id = "kindSel";
    kindSel.innerHTML = `
      <option value="colors">🔴 Coloured counters</option>
      <option value="base10">🔟 Tens & ones (place value)</option>`;
    kindSel.style.cssText = "margin-top:0.55rem;border:1px solid #c7d4e8;border-radius:10px;padding:0.5rem 0.7rem;background:#fff;font-size:0.9rem";
    opts.appendChild(kindSel);
  }
  if (m.tableUI) {
    const rowsSel = document.createElement("select");
    rowsSel.id = "rowsSel";
    rowsSel.innerHTML = `<option value="1">1 row of answers</option><option value="2">2 rows</option><option value="3">3 rows</option>`;
    rowsSel.style.cssText = "margin-top:0.55rem;border:1px solid #c7d4e8;border-radius:10px;padding:0.5rem 0.7rem;background:#fff;font-size:0.9rem";
    opts.appendChild(rowsSel);
  }
  if (m.tuneUI) {
    const lvl = TUNE.levelOf(m.forceLevel);
    const mk = (id, html) => { const el = document.createElement("select"); el.id = id; el.innerHTML = html; el.style.cssText = "margin-top:0.55rem;border:1px solid #c7d4e8;border-radius:10px;padding:0.5rem 0.7rem;background:#fff;font-size:0.9rem"; opts.appendChild(el); };
    if (lvl.sigs.length > 1) mk("sigSel", lvl.sigs.map((s) => `<option value="${s}" ${s === "4/4" ? "selected" : ""}>${s} time</option>`).join(""));
    mk("barsSel", lvl.bars.map((b) => `<option value="${b}" ${b === 2 ? "selected" : ""}>${b} bar${b === 1 ? "" : "s"}</option>`).join(""));
    mk("staffSel", `<option value="treble" selected>Staves: treble only</option><option value="bass">Staves: bass only</option><option value="grand">Staves: treble + bass (grand staff)</option>`);
    mk("keysSel", `<option value="1" selected>On-screen piano: on (tap keys to add notes)</option><option value="0">On-screen piano: off (drag or tap the stave only)</option>`);
    if (m.forceLevel === "advanced") mk("chordsSel", `<option value="1" selected>Chords: allowed (up to 4 notes together)</option><option value="0">Chords: off (one note at a time)</option>`);
    if (m.forceLevel === "advanced") mk("keySel", [["0","C major / A minor (no sharps or flats)"],["1","G major / E minor (1 sharp)"],["2","D major / B minor (2 sharps)"],["3","A major / F♯ minor (3 sharps)"],["-1","F major / D minor (1 flat)"],["-2","B♭ major / G minor (2 flats)"],["-3","E♭ major / C minor (3 flats)"]].map(([v, l]) => `<option value="${v}">Key: ${l}</option>`).join(""));
    const note = document.createElement("p");
    note.style.cssText = "margin:0.5rem 0 0;font-size:0.9rem;color:var(--muted)";
    note.textContent = { beginner: "Students get crotchets, minims and a crotchet rest, C to C, with letter names inside the notes.", standard: "Students get semibreve to quaver, rests, sharps and flats, middle C to A above the stave.", advanced: "Students also get semiquavers, dotted notes, beaming, 6/8 and the range A below the stave to high C." }[m.forceLevel] || "";
    opts.appendChild(note);
  }
  if (m.sprintUI) {
    const durSel = document.createElement("select");
    durSel.id = "durSel";
    durSel.innerHTML = `<option value="60">⏱ 1 minute</option><option value="120">⏱ 2 minutes</option><option value="180">⏱ 3 minutes</option>`;
    durSel.style.cssText = "margin-top:0.55rem;border:1px solid #c7d4e8;border-radius:10px;padding:0.5rem 0.7rem;background:#fff;font-size:0.9rem";
    opts.appendChild(durSel);
  }
  if (m.traceUI) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <input type="text" id="traceText" maxlength="8" autocomplete="off" autocapitalize="off" spellcheck="false"
        placeholder="Letters or numbers to trace — e.g. s, sat, 3" style="font-size:1.15rem;letter-spacing:0.08em" />
      <div class="trace-opts">
        <span class="settings-label">Letters</span>
        <div class="seg" id="traceCase">
          <button type="button" data-v="lower" class="on">abc lowercase</button>
          <button type="button" data-v="upper">ABC uppercase</button>
          <button type="button" data-v="both">Aa both</button>
        </div>
        <span class="settings-label">Guide</span>
        <div class="seg" id="traceGuide">
          <button type="button" data-v="arrows" class="on">Dots with arrows &amp; numbers</button>
          <button type="button" data-v="dots">Dots only</button>
        </div>
      </div>
      <p style="margin:0.45rem 0 0;font-size:0.9rem;color:var(--muted)">NSW Foundation letters, one big card per letter on every student's pad. "Both" shows each letter as a capital and a small letter, so up to 4 letters; otherwise up to 8. Numbers are shown dotted on writing lines.</p>`;
    opts.appendChild(wrap);
    wrap.querySelectorAll(".seg").forEach((seg) => seg.querySelectorAll("button").forEach((b) => (b.onclick = () => { seg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); })));
  }
  if (m.workingUI) {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.id = "expectedAns";
    inp.maxLength = 30;
    inp.placeholder = "Correct answer (optional — turns on auto-check)";
    opts.appendChild(inp);
  }
  if (m.postits) {
    const modSel = document.createElement("select");
    modSel.id = "modSel";
    modSel.innerHTML = `
      <option value="0">⚡ Notes go straight to the board</option>
      <option value="1">🛡 I approve notes before they appear</option>`;
    modSel.style.cssText = "margin-top:0.55rem;border:1px solid #c7d4e8;border-radius:10px;padding:0.5rem 0.7rem;background:#fff;font-size:0.9rem";
    opts.appendChild(modSel);
  }
  if (m.hasCorrect && !m.picDrop) {
    const sel = document.createElement("select");
    sel.id = "correctSel";
    sel.innerHTML =
      `<option value="">Correct answer: not set</option>` +
      ["A", "B", "C", "D", "E"].slice(0, m.opts.max).map((L, i) => `<option value="${i}">Correct answer: ${L}</option>`).join("");
    sel.style.cssText = "margin-top:0.55rem;border:1px solid #c7d4e8;border-radius:10px;padding:0.5rem 0.7rem;background:#fff;font-size:0.9rem";
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
      if (m.picOpts) row.insertBefore(picButton(i), row.querySelector(".pair-eq"));
      opts.appendChild(row);
    }
  }
  $("composerTip").textContent = ANON_MODES.has(key)
    ? "Students submit anonymously — pick ones worth discussing."
    : key === "put_in_order"
    ? "Enter the steps in the correct order — students see them shuffled."
    : key === "retrieval_sprint"
    ? "Responses auto-close when the timer runs out."
    : m.needPrompt
    ? "Students need to read this one on their screen."
    : "Tip: the question can live in your voice. Blank prompt = asked aloud.";
  configureComposerButtons();
  if (composerTarget.kind !== "launch") showActivityForm();
  else if (launcherOpen === false) { launcherOpen = true; renderLauncher(); }
  prompt.focus();
}

function closeComposer() {
  $("composer").classList.remove("show");
  composerModeKey = null;
  if (composerTarget.kind !== "launch") closeActivityPicker();
}

function readComposer() {
  const m = MODES[composerModeKey];
  if (m.toolUI) {
    const out = { mode: composerModeKey, prompt: "" };
    if (m.toolUI === "timer") { out.toolSeconds = parseInt($("toolSeconds").value, 10) || 60; out.toolBig = $("toolBig").checked || undefined; }
    if (m.toolUI === "groups") { out.groupN = Math.min(40, Math.max(1, parseInt($("toolGroupN").value, 10) || 4)); out.groupBy = $("toolGroupBy").value === "count" ? "count" : "size"; }
    if (m.toolUI === "dice") { const faces = [...$("composerOpts").querySelectorAll(".tool-dice-in")].map((i) => i.value.trim().slice(0, 200)); if (faces.some(Boolean)) out.faces = faces; }
    return out;
  }
  const prompt = $("composerPrompt").value.trim();
  if (m.needPrompt && !prompt) {
    toast("This mode needs the text typed — students read it on their screen");
    return null;
  }
  let options = null;
  let correct = null;
  let optionImages, pairImages;
  if (m.opts) {
    const texts = [...$("composerOpts").querySelectorAll("input[data-opt]")].map((i) => i.value.trim());
    if (m.picOpts && composerOptImgs.some(Boolean)) {
      // A picture can stand alone; it gets a short label so results stay readable.
      options = []; optionImages = [];
      texts.forEach((t, i) => {
        const img = composerOptImgs[i] || null;
        if (!t && !img) return;
        options.push(t || `Picture ${options.length + 1}`);
        optionImages.push(img);
      });
    } else options = texts.filter(Boolean);
    if (options.length < m.opts.min) {
      toast(m.picDrop ? "Drop in at least 2 pictures" : `Needs at least ${m.opts.min} options`);
      return null;
    }
    if (m.picDrop) correct = Number.isInteger(picCorrect) && picCorrect < options.length ? picCorrect : null;
    else if (m.hasCorrect) {
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
  let url, linkLabel;
  if (m.linkUI) {
    url = $("linkUrl").value.trim();
    linkLabel = $("linkLabel").value.trim() || undefined;
    let ok = false;
    try {
      const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : "https://" + url);
      ok = (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
    } catch { /* not an address */ }
    if (!ok) {
      toast("Paste the website address students should open");
      return null;
    }
  }
  let passage, wordBank;
  if (m.wordUI) {
    passage = $("wordFrame").value.trim();
    if (!/\[[^\]]+\]/.test(passage)) {
      toast("Put [square brackets] round the sound(s) to build, e.g. sh[ee]p");
      return null;
    }
  }
  if (m.clozeUI) {
    passage = $("clozeText").value;
    if (!/\[[^\]]+\]/.test(passage)) {
      toast("Put [square brackets] around at least one hidden word");
      return null;
    }
    wordBank = $("clozeMode").value === "bank";
  }
  const expected = m.workingUI ? $("expectedAns").value.trim() || undefined : undefined;
  let trace = m.traceUI ? $("traceText").value.trim().slice(0, 8) || undefined : undefined;
  if (m.traceUI && !trace) {
    toast("Type the letter(s) or number(s) to trace");
    return null;
  }
  const traceCase = m.traceUI ? $("traceCase")?.querySelector(".on")?.dataset.v || "lower" : undefined;
  const traceGuide = m.traceUI ? $("traceGuide")?.querySelector(".on")?.dataset.v || "arrows" : undefined;
  if (m.traceUI && traceCase === "both" && trace.replace(/\s/g, "").length > 4) {
    trace = trace.replace(/\s/g, "").slice(0, 4);
    toast("Showing both cases: the first 4 letters fit on the pad");
  }
  const counterKind = m.forceKind || undefined;
  const tableRows = m.tableUI ? parseInt($("rowsSel").value, 10) : undefined;
  const sprintSeconds = m.sprintUI ? parseInt($("durSel").value, 10) : undefined;
  const sig = m.tuneUI ? ($("sigSel") ? $("sigSel").value : "4/4") : undefined;
  const bars = m.tuneUI ? parseInt($("barsSel").value, 10) : undefined;
  const level = m.tuneUI ? m.forceLevel : undefined;
  const staff = m.tuneUI ? $("staffSel").value : undefined;
  const keys = m.tuneUI ? $("keysSel").value !== "0" : undefined;
  const chords = m.tuneUI ? ($("chordsSel") ? $("chordsSel").value !== "0" : false) : undefined;
  const key = m.tuneUI ? ($("keySel") ? parseInt($("keySel").value, 10) : 0) : undefined;
  const moderated = m.postits ? $("modSel")?.value !== "0" : undefined;
  const multi = m.multiOpt ? $("multiSel")?.value !== "0" : undefined;
  if (m.pairs && m.picOpts && composerOptImgs.some(Boolean)) {
    // Pictures sit on the left-hand term of each complete pair.
    const rows = [...$("composerOpts").querySelectorAll(".pair-row")];
    pairImages = [];
    rows.forEach((r, i) => {
      if (r.querySelector("[data-left]").value.trim() && r.querySelector("[data-right]").value.trim()) pairImages.push(composerOptImgs[i] || null);
    });
    if (!pairImages.some(Boolean)) pairImages = undefined;
  }
  return { mode: m.launchAs || composerModeKey, prompt, options, correct, moderated, multi, image: composerImage || undefined, passage, wordBank, expected, trace, traceCase, traceGuide, counterKind, tableRows, sprintSeconds, url, linkLabel, sig, bars, level, staff, keys, chords, key, optionImages, pairImages };
}

/* ---------------- rendering ---------------- */

function render() {
  if (!state) return;
  const ti = $("titleInput");
  if (document.activeElement !== ti) ti.value = state.title || "";
  $("codeText").textContent = state.code;
  $("joinUrl").textContent = `${location.host}/join`;
  $("openProjector").href = `/projector?code=${state.code}`;
  $("lessonsBtn").style.display = state.storage ? "" : "none";
  $("dataBtn").style.display = state.storage ? "" : "none";
  const za = $("zipAll");
  if (onFreePlan()) { za.style.display = "none"; return; }
  za.style.display = state.pictureCount ? "" : "none";
  za.textContent = `🖼 Pictures ZIP (${state.pictureCount || 0})`;
  za.href = `/api/images/${state.code}?${authQuery()}`;
  $("whoAmI").textContent = teacherToken() ? localStorage.getItem("eyesup_teacher_name") || "" : "";
  $("signOutBtn").style.display = teacherToken() ? "" : "none";
  const nb = $("namesBtn");
  nb.textContent = `🏷 Names: ${state.showNames ? "ON" : "off"}`;
  nb.classList.toggle("primary", !!state.showNames);
  const hb = $("holdBtn");
  hb.textContent = `🙈 Hold answers: ${state.holdAnswers ? "ON" : "off"}`;
  hb.classList.toggle("primary", !!state.holdAnswers);
  const cb = $("chgBtn");
  cb.textContent = `🔁 Change answers: ${state.allowChange ? "ON" : "off"}`;
  cb.classList.toggle("primary", !!state.allowChange);
  const ls = $("limitSel"), ln = $("limitN");
  if (ls && document.activeElement !== ls && document.activeElement !== ln) {
    const lim = state.answerLimit;
    ls.value = lim == null ? "" : lim === 1 ? "1" : "custom";
    ln.hidden = ls.value !== "custom";
    if (lim != null && lim !== 1) ln.value = lim;
  }
  $("inviteBtn").style.display = teacherToken() && state?.storage ? "" : "none";
  $("qrToggle").classList.toggle("on", !!state.showJoin);
  $("qrToggle").querySelector(".act-text").innerHTML = state.showJoin ? "<b>Student QR is up</b><small>tap to take it down</small>" : "<b>Student QR</b><small>best for students accessing with iPads</small>";
  $("studentCount").textContent = state.students.length;
  if ($("classSel") && $("classSel").value !== String(state.classId || "")) renderClassSel();
  if ($("classEdit")) $("classEdit").style.display = state.classId ? "" : "none";
  applyRememberedClass();
  const favsKey = JSON.stringify([state.tier || "full", state.favs || []]); // the grid also redraws if the plan tier changes (locks)
  if (favsKey !== render._favsKey) {
    render._favsKey = favsKey;
    buildModeGrid();
  }
  renderLive();
  renderLessonStrip();
  renderLauncher();
  renderTools();
  if (view === "plans" && !plansLoaded && teacherToken()) loadPlans();
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
      <button class="btn mini ${t.big ? "primary-mini" : ""}" data-tact="timer_big" title="Show the countdown full screen on the classroom screen, or shrink it back">${t.big ? "⤡ Make small" : "⛶ Full screen"}</button>
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
    ? `<button class="btn mini" id="clearFocusBtn">✕ Clear the big screen (${{ spotlight: "spotlight", groups: "groups", dice: "dice" }[focus.type] || focus.type})</button>`
    : "";

  // Question dice — the textarea mirrors the session unless the teacher is typing in it.
  const d = state.dice;
  const ta = $("diceFaces");
  if (d && ta) {
    if (d.faces.every((f) => !f) && renderTools._diceRestoredFor !== state.code) {
      // Fresh session: bring back last lesson's questions.
      renderTools._diceRestoredFor = state.code;
      try {
        const saved = JSON.parse(localStorage.getItem("eyesup_dice") || "null");
        if (Array.isArray(saved) && saved.some(Boolean)) send({ type: "dice_set", faces: saved });
      } catch { /* nothing saved */ }
    }
    ta.querySelectorAll(".dice-in").forEach((inp) => {
      const v = d.faces[+inp.dataset.face] || "";
      if (document.activeElement !== inp && inp.value !== v) inp.value = v;
    });
    $("diceResult").textContent =
      focus?.type === "dice" && d.result ? `→ ${d.result}: ${d.faces[d.result - 1] || "(blank face)"}` : "";
  }
  const cf = $("clearFocusBtn");
  if (cf) cf.onclick = () => send({ type: "clear_focus" });
}

function updateTimerDisplay() {
  const el = $("timerDisplay");
  const sum = $("roomToolsLabel");
  const t = state?.timer;
  if (!t) { el.textContent = ""; if (sum) sum.textContent = "Room tools"; return; }
  const left = timerLeftMs(t);
  const text = (t.paused ? "⏸ " : "") + (left <= 0 ? "Time's up!" : fmtTime(left));
  el.textContent = text;
  el.classList.toggle("urgent", left > 0 && left <= 10000);
  if (sum) sum.textContent = `Room tools · ⏱ ${text}`; // the countdown stays visible while the panel is closed
}
setInterval(updateTimerDisplay, 250);

function modeTag(mode, counterKind) {
  if (mode === "counters" && counterKind === "base10") return "🔟 Tens & Ones";
  const m = MODES[mode] || { icon: "", name: mode };
  return `${m.icon} ${m.name}`;
}

let lastLiveItx = null;
function renderLive() {
  const area = $("liveArea");
  const itx = state.interaction;
  $("liveClose").hidden = !itx; // ✕ Close question lives in the panel head, so it is there even when the answers scroll
  if (itx && itx.id !== lastLiveItx) { lastLiveItx = itx.id; if (foldOn("live")) { setFold("live", false); applyFolds(); } }
  $("liveSub").textContent = "";

  if (!itx && state.phase === "deck" && state.deck) {
    const seq = state.sequence || [];
    const nextSt = seq[state.seqIndex + 1];
    area.innerHTML = `<div class="live-empty">
      <p class="big">🎞 Your live slides are on the board${state.deck.title ? ` — ${esc(state.deck.title)}` : ""}</p>
      <p>Move through them with your clicker, the arrow keys, or by clicking the slides on the classroom screen — animations and videos play as normal.</p>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:center;margin-top:0.8rem">
        <button class="btn" data-act="step_prev">◀ Previous step</button>
        <button class="btn primary" data-act="next" ${nextSt ? "" : "disabled"}>${nextSt ? `Next: ${esc(stepTag(nextSt))} ▶` : "End of lesson"}</button>
      </div>
      <p style="color:var(--muted);font-size:0.9rem;margin-top:0.7rem">Launch any activity whenever you like — when you come back, the slides are exactly where you left them.</p>
    </div>`;
    area.querySelectorAll("[data-act]").forEach((b) => (b.onclick = () => send({ type: b.dataset.act })));
    return;
  }

  if (!itx && state.phase === "slide" && state.slide) {
    const sl = state.slide;
    const seq = state.sequence || [];
    const nextSt = seq[state.seqIndex + 1];
    area.innerHTML = `<div class="live-slide">
      <img src="/api/slide/${sl.img}?${authQuery()}" alt="slide ${sl.page}" />
      <div>
        <p class="big">📽 Slide ${sl.page} of ${sl.pages}</p>
        ${sl.title ? `<p>${esc(sl.title)}</p>` : ""}
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.7rem">
          <button class="btn" data-act="step_prev">◀ Previous</button>
          <button class="btn primary" data-act="next" ${nextSt ? "" : "disabled"}>${nextSt ? (nextSt.mode === "slide" ? "Next slide ▶" : `Next: ${esc(stepTag(nextSt))} ▶`) : "End of lesson"}</button>
        </div>
        <p style="color:var(--muted);font-size:0.9rem;margin-top:0.7rem">Tip: your presenter clicker, or the arrow keys on the classroom-screen computer, move through the lesson too.</p>
      </div>
    </div>`;
    area.querySelectorAll("[data-act]").forEach((b) => (b.onclick = () => send({ type: b.dataset.act })));
    return;
  }

  if (!itx && (state.focus || state.timer)) {
    const f = state.focus, d = state.dice;
    const line = f?.type === "spotlight" ? `🎲 All eyes on <b>${esc(f.name)}</b>`
      : f?.type === "groups" ? `👥 ${f.groups.length} groups are on the classroom screen`
      : f?.type === "dice" ? `🎲 The dice landed on <b>${d?.result || "?"}</b>${d?.faces?.[(d.result || 0) - 1] ? ` — ${esc(d.faces[d.result - 1])}` : ""}`
      : `⏱ Timer running on the classroom screen`;
    area.innerHTML = `<div class="live-empty"><p class="big">${line}</p>
      <p>${f ? "It stays on the classroom screen until you clear it or launch something." : "Pause or clear it under 🧰 Room tools."}</p>
      ${f ? `<button class="btn" data-act="clear_focus" style="margin-top:0.6rem">✕ Clear the classroom screen</button>` : ""}</div>`;
    area.querySelectorAll("[data-act]").forEach((b) => (b.onclick = () => send({ type: b.dataset.act })));
    return;
  }
  if (!itx) {
    const msg =
      state.phase === "eyesup"
        ? `<p class="big">👀 Eyes up — the class is looking at you.</p><p>Talk about what just came in, then launch the next step when you're ready.</p>`
        : `<p class="big">Nothing live — the room is yours. 🎤</p><p>${(state.sequence || []).length ? "Press ▶ below to launch the next step of your lesson." : "Pick an activity below to ask the class something."}</p>`;
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
    ${canReveal && !ANON_MODES.has(itx.mode)
      ? `<button class="btn ${state.showNames ? "primary" : ""}" data-act="toggle_names" title="Show student names next to responses on the classroom screen — applies to the whole lesson">🏷 Names on screen: ${state.showNames ? "ON" : "off"}</button>`
      : ""}
    ${itx.mode === "multi_choice" && itx.correct != null
      ? itx.answerRevealed
        ? `<button class="btn" disabled>🎯 Answer shown ✓</button>`
        : `<button class="btn" data-act="reveal_answer">🎯 Reveal answer</button>`
      : ""}
    <button class="btn danger-ghost" data-act="clear">Clear</button>
    ${(state.sequence || []).slice(0, Math.max(0, state.seqIndex) + 1).some((st) => st.mode === "slide" || st.mode === "deck")
      ? `<button class="btn" data-act="back_to_slides" title="Back to your slides, where you left them — ▶ then carries on with the next step">🎞 Back to slides</button>`
      : ""}
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
      <p style="margin-top:1rem;font-size:0.9rem;color:var(--ink-soft)">
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
          .join("") || "<span style='color:var(--muted);font-size:0.9rem'>—</span>"}</div>
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
    const source = itx.imageUrl
      ? `<div style="margin-top:0.9rem"><img src="${itx.imageUrl}" alt="vote image" style="max-height:110px;border-radius:8px;border:1px solid var(--line)" /></div>`
      : "";
    body = source + bars(
      itx.options.map((o, i) => (itx.correct === i ? `${o} ✓` : o)),
      agg.counts
    );
    if (itx.mode === "tick_boxes" && itx.responses.length)
      body += `<div style="margin-top:0.9rem">${itx.responses
        .map((r) => `<div class="resp-card"><span class="who">${esc(r.name || "")}</span><span class="what">${(r.payload.picks || []).map((i) => esc(itx.options[i])).join(", ") || "<i style='color:var(--muted)'>nothing ticked</i>"}</span></div>`)
        .join("")}</div>`;
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
  } else if (STRUCTURED.has(itx.mode) || itx.mode === "question_set") {
    body = revealCards((r) =>
      itx.fields
        .map((f, i) => (r.payload.parts[i] ? `<b>${esc(f)}</b> ${esc(r.payload.parts[i])}` : ""))
        .filter(Boolean)
        .join("<br/>")
    );
  } else if (["sketch", "trace", "annotate", "image_drop", "image_caption", "image_long", "maths_board", "counters_draw"].includes(itx.mode)) {
    const picsOf = (r) => (r.payload.images && r.payload.images.length ? r.payload.images : [r.payload.image]);
    const totalPics = itx.responses.reduce((n, r) => n + picsOf(r).length, 0);
    const source = itx.imageUrl
      ? `<div style="margin-top:0.9rem"><img src="${itx.imageUrl}" alt="source image" style="max-height:110px;border-radius:8px;border:1px solid var(--line)" /> <span style="font-size:0.9rem;color:var(--muted)">← what they're drawing on</span></div>`
      : "";
    const hint = itx.responses.length
      ? `<p style="margin-top:0.8rem;font-size:0.9rem;color:var(--muted)">Click ${["maths_board", "counters_draw"].includes(itx.mode) ? "a board" : ["sketch", "trace", "annotate"].includes(itx.mode) ? "a drawing" : "an image"} to blow it up on the classroom screen; click again to shrink it back.
         ${onFreePlan() ? "" : `<a href="/api/images/${state.code}/${itx.id}?${authQuery()}" style="margin-left:0.6rem;font-weight:800;color:var(--accent)">⬇ Download all ${totalPics} image${totalPics === 1 ? "" : "s"} as ZIP</a>`}</p>`
      : "";
    body = source + hint + revealCards((r) => {
      const pics = picsOf(r);
      const onScreen = pics.some((_, k) => itx.spotlightId === (k ? `${r.studentId}|${k}` : r.studentId));
      return `<span style="display:inline-flex;gap:0.35rem;flex-wrap:wrap;vertical-align:top">${pics
        .map((src, k) => {
          const id = k ? `${r.studentId}|${k}` : r.studentId;
          return `<img src="${src}" alt="student image ${k + 1}" data-spot="${id}" title="${pics.length > 1 ? `Image ${k + 1} of ${pics.length} — ` : ""}click to put it big on the classroom screen"
            style="height:${pics.length > 1 ? 70 : 90}px;border-radius:8px;background:#fff;cursor:zoom-in;border:3px solid ${itx.spotlightId === id ? "var(--amber)" : "var(--line)"}" />`;
        })
        .join("")}</span>
       ${pics.length > 1 ? `<span style="font-size:0.9rem;font-weight:800;color:var(--muted)">${pics.length} images</span>` : ""}
       ${itx.mode === "trace" && r.payload.strokes?.length ? `<button type="button" class="reveal-btn" data-replay="${r.studentId}" title="Watch how this letter was formed, stroke by stroke" style="margin-left:0.4rem">▶ Replay · ${r.payload.strokes.filter((s) => s.tool !== "rubber").length} stroke${r.payload.strokes.filter((s) => s.tool !== "rubber").length === 1 ? "" : "s"}</button>` : ""}
       ${onScreen ? `<span style="font-size:0.9rem;font-weight:800;color:var(--amber)">◉ BIG ON SCREEN</span>` : ""}
       ${r.payload.text ? `<div style="font-size:0.9rem;margin-top:0.3rem;max-width:420px;max-height:9em;overflow:auto;white-space:pre-wrap">${esc(r.payload.text)}</div>` : ""}`;
    });
  } else if (itx.mode === "phonics") {
    body = revealCards((r) => phonChips(r.payload.parts));
  } else if (itx.mode === "spelling" || itx.mode === "cloze" || itx.mode === "phonics_cloze") {
    const targets = itx.mode === "spelling" ? itx.words : itx.cloze.answers;
    const attemptsOf = (r) => (itx.mode === "spelling" ? r.payload.answers : r.payload.fills);
    const stats = agg?.stats || [];
    body = `
      <div class="agg-bars">${stats
        .map((s, i) => `
        <div class="agg-bar">
          <div class="lbl"><span>${i + 1}. ${esc(s.target)}</span>
            <span>${s.correct}/${agg.total} ✓${s.wrongTop.length ? ` · slips: ${s.wrongTop.map((w) => esc(w.text)).join(", ")}` : ""}</span></div>
          <div class="track"><div class="fill" style="width:${agg.total ? (s.correct / agg.total) * 100 : 0}%"></div></div>
        </div>`)
        .join("")}</div>
      <div class="responses">${itx.responses
        .map((r) => `
        <div class="resp-card">
          <span class="who">${esc(r.name || "")}</span>
          <span class="what">${targets
            .map((t, i) => {
              const a = attemptsOf(r)[i] || "";
              return `<span style="font-weight:700;color:${markMatch(a, t) ? "var(--green)" : "var(--red)"}">${esc(a || "—")}</span>`;
            })
            .join(" · ")}</span>
        </div>`)
        .join("")}</div>`;
  } else if (itx.mode === "plus_minus" && agg) {
    const col = (title, list, color) => `
      <div class="venn-col">
        <div class="venn-head" style="color:${color}">${title}</div>
        <div style="margin-top:0.4rem;display:flex;flex-direction:column;gap:0.3rem">${list
          .map((it) => `<div style="font-size:0.9rem"><b style="color:var(--muted);font-size:0.9rem">${esc(it.name || "")}</b> ${esc(it.text)}</div>`)
          .join("") || "<span style='color:var(--muted);font-size:0.9rem'>—</span>"}</div>
      </div>`;
    body = `<div class="venn-cols" style="grid-template-columns:1fr 1fr">${col("＋ Positives", agg.plus, "var(--green)")}${col("− Negatives", agg.minus, "var(--red)")}</div>`;
  } else if (itx.mode === "link") {
    const opened = new Set(itx.responses.map((r) => r.studentId));
    const waiting = state.students.filter((s) => !opened.has(s.id) && s.name !== "👁 Preview");
    body = `
      <p style="margin-top:0.8rem"><a href="${esc(itx.link?.url || "#")}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);font-weight:800;overflow-wrap:anywhere">🔗 ${esc(itx.link?.url || "")}</a></p>
      <p style="margin-top:0.6rem;font-weight:800">${itx.responses.length} of ${state.students.length} have opened it</p>
      ${waiting.length ? `<p style="margin-top:0.3rem;font-size:0.9rem;color:var(--muted)">Not yet: ${waiting.map((s) => esc(s.name)).join(", ")}</p>` : state.students.length ? `<p style="margin-top:0.3rem;font-size:0.9rem;color:var(--green);font-weight:700">Everyone has it open ✓</p>` : ""}`;
  } else if (itx.mode === "compose") {
    body = (itx.responses.length ? `<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.6rem;align-items:center"><button class="btn" data-tune-all="1">▶ Play them all here</button><span style="font-size:0.9rem;color:var(--muted)">“On board” plays through the classroom screen's speakers and puts that tune up big.</span></div>` : "") +
      revealCards((r) => `<div class="tune-mini" style="color:#1f2a3c">${TUNE.scoreSvg(r.payload, { compact: true })}</div>
        <div style="display:flex;gap:0.4rem;margin-top:0.3rem"><button class="btn" data-tune-play="${r.studentId}">▶ Play here</button><button class="btn" data-tune-board="${r.studentId}">📽 On board</button></div>`);
  } else if (itx.mode === "dot_points") {
    body = revealCards((r) => `<ul style="margin:0;padding-left:1.1rem;text-align:left">${(r.payload.points || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`);
  } else if (itx.mode === "table") {
    body = revealCards((r) => miniTable(itx.options, r.payload.rows));
  } else if (itx.mode === "counters") {
    const dist = agg?.answerDist || [];
    body =
      (itx.expected ? `<p style="margin-top:0.8rem;font-size:0.9rem;color:var(--muted)">Auto-checking against <b>${esc(itx.expected)}</b></p>` : "") +
      (dist.length ? bars(dist.map((d) => `${d.answer}${d.ok === true ? " ✓" : d.ok === false ? " ✗" : ""}`), dist.map((d) => d.count)) : "") +
      revealCards((r) => {
        const ok = itx.expected ? markMatch(r.payload.answer, itx.expected) : null;
        return `${boardSvg(r.payload.items, itx.counterKind, "150px")}
          <b style="margin-left:0.5rem;color:${ok === false ? "var(--red)" : ok ? "var(--green)" : "var(--ink)"}">= ${esc(r.payload.answer || "—")}${ok === true ? " ✓" : ok === false ? " ✗" : ""}</b>`;
      });
  } else if (itx.mode === "working") {
    const dist = agg?.answerDist || [];
    const distHtml = dist.length
      ? bars(dist.map((d) => `${d.answer}${d.ok === true ? " ✓" : d.ok === false ? " ✗" : ""}`), dist.map((d) => d.count))
      : "";
    body =
      (itx.expected ? `<p style="margin-top:0.8rem;font-size:0.9rem;color:var(--muted)">Auto-checking against <b>${esc(itx.expected)}</b></p>` : "") +
      distHtml +
      revealCards((r) => {
        const ok = itx.expected ? markMatch(r.payload.answer, itx.expected) : null;
        return `${(r.payload.lines || []).map((l) => `<span style="font-family:ui-monospace,monospace;font-size:0.9rem;color:var(--ink-soft);display:block">${esc(l)}</span>`).join("")}
          <b style="color:${ok === false ? "var(--red)" : ok ? "var(--green)" : "var(--ink)"}">= ${esc(r.payload.answer || "—")}${ok === true ? " ✓" : ok === false ? " ✗" : ""}</b>`;
      });
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
          <span class="mode-tag">${modeTag(itx.mode, itx.counterKind)}</span>
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
  area.querySelectorAll("[data-tune-play]").forEach((b) => (b.onclick = () => {
    const r = itx.responses.find((x) => x.studentId === b.dataset.tunePlay);
    if (r) TUNE.play(r.payload);
  }));
  area.querySelectorAll("[data-tune-board]").forEach((b) => (b.onclick = () => send({ type: "play_tune", studentId: b.dataset.tuneBoard })));
  const all = area.querySelector("[data-tune-all]");
  if (all) all.onclick = () => {
    const list = itx.responses.map((r) => r.payload);
    const next = (i) => { if (i < list.length) TUNE.play(list[i], { onDone: () => setTimeout(() => next(i + 1), 350) }); };
    next(0);
  };
  area.querySelectorAll("[data-reveal]").forEach(
    (b) => (b.onclick = () => send({ type: "reveal", studentId: b.dataset.reveal }))
  );
  area.querySelectorAll("[data-spot]").forEach((img) => {
    img.onclick = (e) => { e.stopPropagation(); send({ type: "spotlight_response", studentId: img.dataset.spot }); };
  });
  area.querySelectorAll("[data-replay]").forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const r = itx.responses.find((x) => x.studentId === b.dataset.replay);
      if (r?.payload?.strokes?.length) openStrokeReplay(r, itx);
    };
  });
  area.querySelectorAll("[data-note]").forEach((b) => {
    b.onclick = () => {
      const [sid, i] = b.dataset.note.split("|");
      send({ type: "reveal", studentId: sid, noteIndex: +i });
    };
  });
}

/* ---------------- Letter Formation replay ---------------- */

// Plays back a child's tracing stroke by stroke, at the pace they wrote it: a
// numbered dot marks where each stroke began, the ink grows in the order it was
// laid down, and pauses between strokes are kept. Their finished drawing sits
// faintly underneath so the teacher can see where each stroke is heading.
function openStrokeReplay(r, itx) {
  document.getElementById("strokeReplay")?.remove();
  const strokes = r.payload.strokes;
  const penStrokes = strokes.filter((s) => s.tool !== "rubber").length;
  const lastT = Math.max(...strokes.map((s) => s.pts[s.pts.length - 1][2]));
  const who = ANON_MODES.has(itx.mode) ? "" : esc(r.name || "");
  const el = document.createElement("div");
  el.id = "strokeReplay";
  el.style.cssText = "position:fixed;inset:0;z-index:1000;background:rgba(15,28,48,0.82);display:flex;align-items:center;justify-content:center;padding:1rem";
  el.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:1rem 1.1rem 1.1rem;max-width:min(92vw,900px);width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.35)">
      <div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap">
        <b style="font-size:1.1rem">✍️ ${who ? who + " — " : ""}how the letter was formed</b>
        <span id="srStatus" style="color:var(--muted);font-weight:700"></span>
        <span style="flex:1"></span>
        <label style="font-size:0.9rem;color:var(--muted)">Speed
          <select id="srSpeed" style="margin-left:0.3rem;font-size:0.95rem"><option value="1">real time</option><option value="2" selected>2×</option><option value="4">4×</option></select>
        </label>
        <button type="button" class="btn" id="srAgain">▶ Play again</button>
        <button type="button" class="btn dark" id="srClose">Close</button>
      </div>
      <div id="srWrap" style="position:relative;margin-top:0.8rem;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff">
        <canvas id="srBg" style="display:block;width:100%"></canvas>
        <canvas id="srInk" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
      </div>
      <p style="margin:0.6rem 0 0;font-size:0.9rem;color:var(--muted)">${penStrokes} pen stroke${penStrokes === 1 ? "" : "s"} · ${(lastT / 1000).toFixed(1)}s from first touch to last · red dots show where each stroke started</p>
    </div>`;
  document.body.appendChild(el);
  const bg = el.querySelector("#srBg"), ink = el.querySelector("#srInk"), status = el.querySelector("#srStatus");
  const bgx = bg.getContext("2d"), ctx = ink.getContext("2d");
  let raf = 0;
  const stop = () => cancelAnimationFrame(raf);
  const close = () => { stop(); el.remove(); };
  el.querySelector("#srClose").onclick = close;
  el.onclick = (e) => { if (e.target === el) close(); };
  const esc_ = (e) => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc_); } };
  document.addEventListener("keydown", esc_);

  const img = new Image();
  const play = () => {
    stop();
    const W = bg.width, H = bg.height;
    const speed = +el.querySelector("#srSpeed").value || 2;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = ctx.lineJoin = "round";
    const penW = Math.max(3, Math.round(W / 60)); // the same fat crayon the child used
    const start = performance.now();
    let si = 0, pi = 0, started = 0;
    const frame = () => {
      const now = (performance.now() - start) * speed;
      let drewAny = false;
      while (si < strokes.length) {
        const s = strokes[si], pts = s.pts;
        if (pts[pi][2] > now) break;
        ctx.globalCompositeOperation = s.tool === "rubber" ? "destination-out" : "source-over";
        ctx.strokeStyle = "#1d3f78";
        ctx.lineWidth = s.tool === "rubber" ? penW * 4 : penW;
        if (pi === 0) {
          started++;
          if (s.tool !== "rubber") {
            status.textContent = `Stroke ${strokes.slice(0, si + 1).filter((x) => x.tool !== "rubber").length} of ${penStrokes}`;
            ctx.save(); ctx.globalCompositeOperation = "source-over";
            ctx.beginPath(); ctx.arc(pts[0][0] * W, pts[0][1] * H, penW * 1.1, 0, Math.PI * 2); ctx.fillStyle = "#e02d2d"; ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = `800 ${penW * 1.3}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(String(strokes.slice(0, si + 1).filter((x) => x.tool !== "rubber").length), pts[0][0] * W, pts[0][1] * H + 0.5);
            ctx.restore();
          }
          ctx.beginPath(); ctx.moveTo(pts[0][0] * W, pts[0][1] * H); ctx.lineTo(pts[0][0] * W + 0.1, pts[0][1] * H + 0.1); ctx.stroke();
          pi = 1;
        }
        while (pi < pts.length && pts[pi][2] <= now) {
          ctx.beginPath(); ctx.moveTo(pts[pi - 1][0] * W, pts[pi - 1][1] * H); ctx.lineTo(pts[pi][0] * W, pts[pi][1] * H); ctx.stroke();
          pi++; drewAny = true;
        }
        if (pi < pts.length) break;
        si++; pi = 0;
      }
      if (si < strokes.length) raf = requestAnimationFrame(frame);
      else status.textContent = `Done — ${penStrokes} stroke${penStrokes === 1 ? "" : "s"}`;
    };
    raf = requestAnimationFrame(frame);
  };
  img.onload = () => {
    // Size the stage to the drawing's shape, as wide as the dialog allows.
    const w = Math.min(img.naturalWidth, 1400), h = Math.round(w * (img.naturalHeight / img.naturalWidth));
    bg.width = ink.width = w; bg.height = ink.height = h;
    bgx.fillStyle = "#fff"; bgx.fillRect(0, 0, w, h);
    bgx.globalAlpha = 0.28; bgx.drawImage(img, 0, 0, w, h); bgx.globalAlpha = 1;
    play();
  };
  img.src = r.payload.image;
  el.querySelector("#srAgain").onclick = play;
  el.querySelector("#srSpeed").onchange = play;
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
      if (it.sketchCount != null) d = ["image_drop", "image_caption", "image_long"].includes(it.mode) ? `${it.sketchCount} student${it.sketchCount === 1 ? "" : "s"} sent image${it.sketchCount === 1 ? "" : "s"} submitted` : `${it.sketchCount} sketch${it.sketchCount === 1 ? "" : "es"} drawn`;
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
         href="/report?code=${state.code}${authQuery() ? `&${authQuery()}` : ""}"
         style="text-decoration:none">🖨 Export as PDF</a>
    </div>`;
  $("summaryOverlay").classList.add("show");
  $("closeSummary").onclick = () => $("summaryOverlay").classList.remove("show");
}

/* ---------------- wire-up ---------------- */

// No autocorrect, auto-capitals or spell-check on anything typed here (covers boxes drawn later too).
function noAutocorrect(root) {
  root.querySelectorAll("input, textarea, [contenteditable]").forEach((el) => {
    if (["file", "checkbox", "radio", "range", "password", "date", "number"].includes(el.type)) return;
    el.setAttribute("spellcheck", "false");
    el.setAttribute("autocorrect", "off");
    el.setAttribute("autocapitalize", "off");
  });
}
noAutocorrect(document);
new MutationObserver(() => noAutocorrect(document)).observe(document.documentElement, { childList: true, subtree: true });

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function joinLink() {
  return `${location.origin}/join?code=${state?.code || ""}`;
}
// Copy the student link and show it, so it can be read out, checked or selected by hand.
function showStudentLink() {
  const url = joinLink();
  navigator.clipboard?.writeText(url).catch(() => {});
  const pop = $("linkPop");
  $("linkPopUrl").value = url;
  $("linkPopHost").textContent = `${location.host}/join`;
  $("linkPopCode").textContent = state?.code || "";
  pop.hidden = false;
  const inp = $("linkPopUrl");
  inp.onclick = () => inp.select();
  setTimeout(() => inp.select(), 50);
}
$("codeChip").onclick = showStudentLink;
$("copyLink").onclick = showStudentLink;
document.addEventListener("click", (e) => { const pop = $("linkPop"); if (pop && !pop.hidden && !e.target.closest(".link-wrap") && e.target !== $("codeChip")) pop.hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { const pop = $("linkPop"); if (pop) pop.hidden = true; } });
$("qrToggle").onclick = () => send({ type: "toggle_join" });
$("remoteBtn").onclick = async () => {
  if (!state) return;
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  const host = isLocal && state.lanHost ? state.lanHost : location.host;
  const proto = isLocal ? "http:" : location.protocol;
  let url = `${proto}//${host}/remote?code=${state.code}`;
  // Signed in? Mint a one-time pairing code so the phone signs in by itself.
  if (teacherToken()) {
    try {
      const res = await fetch("/api/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: teacherToken() }),
      });
      const data = await res.json();
      if (res.ok) url += `&pair=${encodeURIComponent(data.pair)}`;
    } catch { /* plain URL still works — the phone will just ask to sign in */ }
  }
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

$("lessonsBtn").onclick = () => {
  $("lessonsOverlay").classList.add("show");
  loadLessonsList(0);
};

async function loadLessonsList(attempt) {
  $("lessonsList").innerHTML = `<p style="color:var(--muted)">${attempt ? "Still connecting to the lesson archive…" : "Loading…"}</p>`;
  try {
    const res = await fetch(`/api/lessons${authQuery() ? `?${authQuery()}` : ""}`);
    const data = await res.json();
    if (res.status === 403) {
      $("lessonsList").innerHTML = `<p style="color:var(--red)">Your sign-in has expired on this device — sign out and back in to see your lessons.</p>`;
      return;
    }
    if (!res.ok) throw new Error(data.error);
    $("lessonsList").innerHTML = data.lessons.length
      ? data.lessons
          .map((l) => {
            const when = new Date(l.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
            const href = `/data?lesson=${l.id}`;
            const name = l.title || (l.first_prompt ? (l.first_prompt.length > 70 ? l.first_prompt.slice(0, 68).trimEnd() + "…" : l.first_prompt) : "Untitled lesson");
            const pics = Number(l.pictures) || 0;
            return `<div style="display:flex;align-items:center;gap:0.6rem;border:1px solid var(--line);border-radius:10px;padding:0.65rem 0.9rem;margin-bottom:0.5rem;background:var(--paper)">
              <a href="${href}" target="_blank" rel="noopener" style="flex:1;min-width:0;text-decoration:none;color:inherit">
                <b>${esc(name)}</b> <span style="color:var(--muted);font-size:0.9rem">· ${esc(l.code)}</span><br/>
                <span style="color:var(--ink-soft);font-size:0.9rem">${esc(when)} — ${l.participated ?? 0}/${l.joined ?? 0} students · ${l.interactions ?? 0} interactions${pics ? ` · ${pics} picture${pics === 1 ? "" : "s"}` : ""}</span>
              </a>
              ${pics && !onFreePlan() ? `<a class="btn" href="/api/lessons/${l.id}/images?${authQuery()}" style="text-decoration:none;white-space:nowrap" title="Every picture from this lesson as one ZIP — a folder per activity, a file per student">🖼 ZIP</a>` : ""}
            </div>`;
          })
          .join("")
      : `<p style="color:var(--muted)">No stored lessons yet — run one and it saves itself.</p>`;
  } catch {
    // Usually the free server waking from sleep (up to a minute) or a
    // dropped database connection — keep trying for ~90s before giving up.
    if (attempt < 18) {
      setTimeout(() => loadLessonsList(attempt + 1), 5000);
      $("lessonsList").innerHTML = `<p style="color:var(--muted)">⏳ Waking the server up — the first visit of the day can take up to a minute. Retrying automatically (${attempt + 1})…</p>`;
      return;
    }
    $("lessonsList").innerHTML = `<p style="color:var(--red)">Couldn't reach the lesson archive right now. Your lessons are safe — this is a connection hiccup, not lost data.</p>
      <button class="btn" onclick="loadLessonsList(0)">Try again</button>`;
  }
}
$("closeLessons").onclick = () => $("lessonsOverlay").classList.remove("show");

$("titleInput").addEventListener("change", () => send({ type: "set_title", title: $("titleInput").value }));

/* ---------------- classes: names become tap-to-join tiles ---------------- */

let classes = [];
let classAppliedFor = null; // room code the remembered class was applied to
const rememberedClass = () => { try { return Number(localStorage.getItem("eyesup_class_id")) || null; } catch { return null; } };

async function loadClasses() {
  try {
    const res = await fetch(`/api/classes?${authQuery()}`);
    const data = await res.json();
    classes = data.classes || [];
  } catch { classes = []; }
  renderClassSel();
}

function renderClassSel() {
  const sel = $("classSel");
  if (!sel) return;
  const cur = state?.classId || "";
  sel.innerHTML = `<option value="">None</option>` +
    classes.map((c) => `<option value="${c.id}">👥 ${esc(c.name)} (${c.roster.length})</option>`).join("") +
    `<option value="new">＋ New class…</option>`;
  sel.value = String(cur);
  if (sel.value !== String(cur)) sel.value = "";
  $("classEdit").style.display = cur ? "" : "none";
}

function applyRememberedClass() {
  // A new room on this dashboard starts with the class used last time.
  if (!state || state.classId || classAppliedFor === state.code) return;
  classAppliedFor = state.code;
  const id = rememberedClass();
  if (id && classes.some((c) => c.id === id)) send({ type: "set_class", classId: id });
}

function chooseClass(id) {
  try { if (id) localStorage.setItem("eyesup_class_id", String(id)); else localStorage.removeItem("eyesup_class_id"); } catch {}
  send({ type: "set_class", classId: id || null });
}

function openClassEditor(cls) {
  $("classHead").textContent = cls ? `Edit ${cls.name}` : "New class";
  $("className").value = cls?.name || "";
  $("classRoster").value = (cls?.roster || []).join("\n");
  $("classDelete").style.display = cls ? "" : "none";
  const st = $("classSticker");
  st.style.display = cls ? "" : "none";
  if (cls) st.href = `/class-sticker?c=${encodeURIComponent(cls.code)}`;
  const count = () => {
    const n = $("classRoster").value.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean).length;
    $("classCount").textContent = n ? `${n} name${n === 1 ? "" : "s"}${cls ? ` · class code ${cls.code}` : ""}` : cls ? `Class code ${cls.code}` : "";
  };
  $("classRoster").oninput = count;
  count();
  $("classOverlay").classList.add("show");
  $("className").focus();
  $("classClose").onclick = () => { $("classOverlay").classList.remove("show"); renderClassSel(); };
  $("classSave").onclick = async () => {
    const name = $("className").value.trim();
    if (!name) { toast("Give the class a name"); $("className").focus(); return; }
    const roster = $("classRoster").value.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: teacherToken(), id: cls?.id, name, roster }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadClasses();
      $("classOverlay").classList.remove("show");
      chooseClass(data.class.id);
      toast(cls ? "Class updated" : `Class saved — code ${data.class.code}`);
    } catch { toast("Couldn't save the class — try again"); }
  };
  $("classDelete").onclick = async () => {
    if (!cls || !confirm(`Delete ${cls.name}? Past lessons are kept; only the class list and its QR code go.`)) return;
    try {
      await fetch(`/api/classes/${cls.id}?${authQuery()}`, { method: "DELETE" });
      if (rememberedClass() === cls.id) chooseClass(null);
      await loadClasses();
      $("classOverlay").classList.remove("show");
    } catch { toast("Couldn't delete the class"); }
  };
}

$("classSel").addEventListener("change", () => {
  const v = $("classSel").value;
  if (v === "new") { renderClassSel(); openClassEditor(null); return; }
  chooseClass(v ? Number(v) : null);
});
$("classEdit").onclick = () => openClassEditor(classes.find((c) => c.id === state?.classId) || null);
loadClasses();
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
$("newLessonBtn").onclick = () => {
  if (confirm("Start a fresh lesson?\n\nThis one is saved to the archive, its session ends for the students in the room, and you get a new class code."))
    send({ type: "new_lesson" });
};
$("endBtn").onclick = () => {
  userSummaryWanted = true;
  send({ type: "get_summary" });
};
$("launchBtn").onclick = () => {
  const data = readComposer();
  if (!data) return;
  send({ type: "launch", ...data });
  closeComposer();
};
$("addStepBtn").onclick = () => {
  if (onFreePlan()) return showSubscribe("locked_plans");
  const data = readComposer();
  if (!data) return;
  send({ type: "set_sequence", items: [...(state?.sequence || []), data] });
  closeComposer();
  toast("Added to the end of this lesson");
};
$("saveStepBtn").onclick = () => {
  const data = readComposer();
  if (!data || !editing) return;
  let at;
  if (composerTarget.kind === "plan-edit") {
    at = composerTarget.index;
    if (editing.steps[at]?.afterSlide) data.afterSlide = editing.steps[at].afterSlide;
    editing.steps[at] = data;
  } else {
    editing.steps.push(data);
    at = editing.steps.length - 1;
  }
  closeComposer();
  renderEditor(at);
  scheduleSave();
};
$("cancelComposer").onclick = closeComposer;
$("composer").addEventListener("keydown", (e) => {
  if (e.key === "Escape") return closeComposer();
  // Enter submits from a one-line box only — never from a passage textarea.
  if (e.key === "Enter" && e.target.tagName === "INPUT") {
    e.preventDefault();
    (composerTarget.kind === "launch" ? $("launchBtn") : $("saveStepBtn")).click();
  }
});

// Remember whether this teacher likes the countdown full screen.
const timerBig = () => $("timerBigPref").checked;
try { $("timerBigPref").checked = localStorage.getItem("eyesup_timer_big") === "1"; } catch {}
$("timerBigPref").onchange = () => {
  try { localStorage.setItem("eyesup_timer_big", timerBig() ? "1" : "0"); } catch {}
};
document.querySelectorAll("[data-timer]").forEach(
  (b) => (b.onclick = () => send({ type: "timer_start", seconds: +b.dataset.timer, big: timerBig() }))
);
$("timerGo").onclick = () => {
  const s = parseInt($("timerCustom").value, 10);
  if (s >= 5) send({ type: "timer_start", seconds: s, big: timerBig() });
};
$("pickBtn").onclick = () => send({ type: "pick_student" });
$("namesBtn").onclick = () => send({ type: "toggle_names" });
$("holdBtn").onclick = () => send({ type: "toggle_hold" });
$("chgBtn").onclick = () => send({ type: "toggle_change" });
$("limitSel").onchange = () => {
  const v = $("limitSel").value;
  $("limitN").hidden = v !== "custom";
  if (v === "custom") { $("limitN").focus(); send({ type: "set_answer_limit", limit: parseInt($("limitN").value, 10) || 3 }); }
  else send({ type: "set_answer_limit", limit: v ? 1 : null });
};
$("limitN").onchange = () => send({ type: "set_answer_limit", limit: Math.min(12, Math.max(2, parseInt($("limitN").value, 10) || 2)) });
const diceInputs = () => [...document.querySelectorAll("#diceFaces .dice-in")];
const sendDiceFaces = () => {
  const faces = diceInputs().map((i) => i.value.trim());
  localStorage.setItem("eyesup_dice", JSON.stringify(faces));
  send({ type: "dice_set", faces });
};
let diceSaveTimer;
diceInputs().forEach((inp) => {
  inp.oninput = () => { clearTimeout(diceSaveTimer); diceSaveTimer = setTimeout(sendDiceFaces, 500); };
  // Pasting several lines fills this face and the ones below it.
  inp.onpaste = (e) => {
    const lines = (e.clipboardData?.getData("text") || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    const all = diceInputs();
    lines.slice(0, 6 - +inp.dataset.face).forEach((l, k) => (all[+inp.dataset.face + k].value = l));
    sendDiceFaces();
  };
});
$("diceRoll").onclick = () => { clearTimeout(diceSaveTimer); sendDiceFaces(); send({ type: "dice_roll" }); };
$("groupsBtn").onclick = () =>
  send({ type: "make_groups", n: parseInt($("groupN").value, 10) || 2, by: $("groupBy").value });

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
      ? `<p style="color:var(--red);font-size:0.9rem">Couldn't find complete questions yet — each needs a question line plus at least two A) B) options.</p>`
      : "";
  } else {
    box.innerHTML =
      `<p style="font-weight:800;font-size:0.9rem;margin-bottom:0.4rem">Found ${parsedQuiz.length} question${parsedQuiz.length === 1 ? "" : "s"}:</p>` +
      parsedQuiz
        .map(
          (q, qi) => `
        <div style="border:1px solid var(--line);border-radius:10px;padding:0.55rem 0.8rem;margin-bottom:0.45rem;font-size:0.9rem;background:var(--paper)">
          <b>${qi + 1}. ${esc(q.prompt)}</b><br/>
          ${q.options
            .map((o, i) => `<span style="${i === q.correct ? "color:var(--green);font-weight:700" : "color:var(--ink-soft)"}">${String.fromCharCode(65 + i)}) ${esc(o)}${i === q.correct ? " ✓" : ""}</span>`)
            .join(" &nbsp; ")}
          ${q.correct == null ? `<br/><span style="color:var(--amber);font-size:0.9rem">⚠ No answer line found — you can still run it, just without a reveal.</span>` : ""}
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
  $("quizOverlay").classList.remove("show");
  const n = `${items.length} question${items.length === 1 ? "" : "s"}`;
  if (view === "plans" && editing) {
    const from = editing.steps.length;
    editing.steps.push(...items);
    renderEditor(from);
    scheduleSave();
    toast(`${n} added to “${editing.title || "this lesson plan"}”`);
  } else {
    send({ type: "set_sequence", items: [...(state?.sequence || []), ...items] });
    toast(`${n} added to the end of this lesson`);
  }
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
  const files = [...(e.dataTransfer?.files || [])].filter((x) => x.type.startsWith("image/"));
  const f = files[0];
  if (!f) return;
  if (view === "plans" && !editing) return; // nothing to add it to
  const composing = $("composer").classList.contains("show") ? MODES[composerModeKey] : null;
  if (composing?.picDrop) { addPicChoiceFiles(files); return; }
  if (files.length > 1 && !composing?.imageUpload) {
    // Several pictures at once: that's a Picture Choice.
    if (view === "plans" && editing && !$("activityOverlay").classList.contains("show")) openActivityPicker({ kind: "plan-add" });
    openComposer("picture_choice");
    addPicChoiceFiles(files);
    return;
  }
  loadComposerImage(f, (dataUrl) => {
    if (view === "plans" && editing && !$("activityOverlay").classList.contains("show")) {
      openActivityPicker({ kind: "plan-add" });
      composerImage = dataUrl;
      openComposer("picture_prompt", true);
      setComposerImage(dataUrl);
      return;
    }
    composerImage = dataUrl;
    // Already composing an image mode? Keep it. Otherwise open Picture Prompt.
    if (!composerModeKey || !MODES[composerModeKey]?.imageUpload) {
      openComposer("picture_prompt", true);
      $("composerTip").textContent = "Image loaded ✓ — or switch to 🖍️ Annotate (draw on it) / 🗳️ Picture Vote (vote on it); the image comes with you.";
    }
    setComposerImage(dataUrl);
  });
});

/* ---------------- teacher account gate ---------------- */

let authMode = "login";
// What the server allows before anyone is signed in (open sign-up? payments on?).
let siteConfig = { openSignup: false, billing: false, trialDays: 30 };
fetch("/api/config").then((r) => r.json()).then((c) => {
  siteConfig = c;
  if ($("authOverlay").classList.contains("show") && authMode === "signup") showAuthOverlay("signup");
}).catch(() => {});

// An invite link (/teacher?invite=CODE) carries the code so a new teacher
// never has to type it.
function inviteCode() {
  const fromUrl = new URLSearchParams(location.search).get("invite");
  if (fromUrl) localStorage.setItem("eyesup_invite", fromUrl.trim());
  return localStorage.getItem("eyesup_invite") || "";
}

function showAuthOverlay(mode) {
  authMode = mode || (localStorage.getItem("eyesup_has_account") ? "login" : "signup");
  const fields = $("authFields");
  $("tabLogin").classList.toggle("primary", authMode === "login");
  $("tabSignup").classList.toggle("primary", authMode === "signup");
  fields.innerHTML =
    authMode === "login"
      ? `<input id="aUser" placeholder="Your name" autocomplete="username" />
         <input id="aPass" type="password" placeholder="Password" autocomplete="current-password" />`
      : `<input id="aName" placeholder="Your name (e.g. Sarah Jones)" maxlength="40" autocomplete="name" />
         <input id="aPass" type="password" placeholder="Choose a password (6+ characters)" autocomplete="new-password" />
         <input id="aEmail" type="email" placeholder="Email (optional)" title="Optional — it helps if you ever forget your password" maxlength="120" autocomplete="email" />
         ${siteConfig.openSignup
           ? siteConfig.billing ? `<p style="color:var(--muted);font-size:0.9rem;margin:0.2rem 0 0">✓ ${siteConfig.trialDays}-day free trial — no card needed to start.</p>` : ""
           : inviteCode()
             ? `<p style="color:var(--muted);font-size:0.9rem;margin:0.2rem 0 0">✓ Invite code applied — that's all you need.</p>`
             : `<input id="aInvite" placeholder="Invite code (ask a colleague who uses Eyes Up)" />`}`;
  fields.querySelectorAll("input").forEach((i) => {
    i.style.cssText = "border:1.5px solid var(--line);border-radius:10px;padding:0.7rem 0.9rem;font-size:0.95rem";
    i.onkeydown = (e) => { if (e.key === "Enter") $("authGo").click(); };
  });
  $("authGo").textContent = authMode === "login" ? "Sign in" : "Create account";
  $("authError").style.display = "none";
  $("authOverlay").classList.add("show");
  fields.querySelector("input")?.focus();
}

const AUTH_ERRORS = {
  bad_login: "Name or password didn't match.",
  bad_invite: "That invite code isn't right — ask a colleague for their invite link.",
  taken: "That name is already in use — add a surname or initial.",
  bad_name: "Please enter your name.",
  bad_pass: "Password needs at least 6 characters.",
  bad_email: "That email address doesn't look right — check it, or leave it blank.",
  account_disabled: "This account has been switched off. Please contact Eyes Up to have it turned back on.",
  slow_down: "Too many tries — wait a few minutes and try again.",
};

$("tabLogin").onclick = () => showAuthOverlay("login");
$("tabSignup").onclick = () => showAuthOverlay("signup");
$("authGo").onclick = async () => {
  const body =
    authMode === "login"
      ? { username: $("aUser").value, password: $("aPass").value }
      : { invite: ($("aInvite")?.value || inviteCode()).trim(), name: $("aName").value, password: $("aPass").value, email: $("aEmail")?.value.trim() || "" };
  try {
    const res = await fetch(authMode === "login" ? "/api/login" : "/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      $("authError").textContent = AUTH_ERRORS[data.error] || "That didn't work — try again.";
      $("authError").style.display = "block";
      return;
    }
    localStorage.setItem("eyesup_token", data.token);
    localStorage.setItem("eyesup_teacher_name", data.name || data.username);
    localStorage.setItem("eyesup_has_account", "1");
    $("authOverlay").classList.remove("show");
    if (authMode === "signup") toast(`Welcome, ${data.name}! Sign in next time with your name or "${data.username}".`);
    if (ws && ws.readyState === 1) attach();
    loadMe();
  } catch {
    $("authError").textContent = "Couldn't reach the server — try again.";
    $("authError").style.display = "block";
  }
};

$("inviteBtn").onclick = async () => {
  try {
    const res = await fetch(`/api/invite?${authQuery()}`);
    const data = await res.json();
    if (!res.ok) throw new Error();
    const link = `${location.origin}/teacher${data.invite ? `?invite=${encodeURIComponent(data.invite)}` : ""}`;
    await navigator.clipboard.writeText(link);
    toast("Invite link copied — send it to your colleague. They just enter a name and a password.");
  } catch {
    toast("Couldn't fetch the invite link — are you signed in?");
  }
};

/* ---------------- my account · plan · subscribe ---------------- */

let me = null; // {name, username, email, admin, billing, access:{ok, plan, until, daysLeft, reason}, ...}
const fmtDay = (d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

async function loadMe() {
  if (!teacherToken()) return;
  try {
    const res = await fetch(`/api/me?${authQuery()}`);
    if (!res.ok) return;
    me = await res.json();
    $("accountBtn").style.display = "";
    $("adminLink").style.display = me.admin ? "" : "none";
    renderPlanBanner();
  } catch { /* offline — the dashboard still works */ }
}

// A quiet reminder in the last days of a trial. Never shown mid-lesson noise: one line, dismissible.
function renderPlanBanner() {
  const el = $("planBanner");
  const a = me?.access;
  const show = me?.billing && a?.ok && a.plan === "trial" && a.daysLeft <= 7 && sessionStorage.getItem("eyesup_banner_off") !== "1";
  el.style.display = show ? "flex" : "none";
  if (!show) return;
  el.innerHTML = `<span>Free trial: ${a.daysLeft} day${a.daysLeft === 1 ? "" : "s"} left</span><button id="bannerSub">Subscribe</button><button class="x" id="bannerX" aria-label="Hide">✕</button>`;
  $("bannerSub").onclick = () => showSubscribe("trial_ending");
  $("bannerX").onclick = () => { sessionStorage.setItem("eyesup_banner_off", "1"); el.style.display = "none"; };
}

function planLine() {
  const a = me.access;
  if (me.admin) return "<b>Owner</b> — full access.";
  if (me.tier === "free") return `<b>Free plan</b> — Short Answer, Word Cloud, Mind Map, Post-its, Agree / Disagree and the room tools.${a.lapsed === "trial_ended" ? ` Your free trial ended on ${fmtDay(a.until)}.` : a.lapsed ? ` Your ${a.lapsed === "licence_ended" ? "school's licence" : "subscription"} ended on ${fmtDay(a.until)}.` : ""}`;
  if (!me.billing || a.plan === "free" || a.plan === "complimentary") return "<b>Full access</b> — nothing to pay.";
  if (a.plan === "trial") return a.ok ? `<b>Free trial</b> — ${a.daysLeft} day${a.daysLeft === 1 ? "" : "s"} left (ends ${fmtDay(a.until)}).` : `<b>Your free trial ended</b> on ${fmtDay(a.until)}.`;
  if (a.plan === "school") return a.ok ? `<b>School licence</b> — covered until ${fmtDay(a.until)}.` : `<b>Your school's licence ended</b> on ${fmtDay(a.until)}.`;
  return a.ok ? `<b>Subscriber</b> — ${me.hasSubscription ? "renews" : "paid until"} ${fmtDay(a.until)}.` : `<b>Your subscription ended</b> on ${fmtDay(a.until)}.`;
}

async function goBilling(route, body) {
  try {
    const res = await fetch(`/api/billing/${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: teacherToken(), ...body }) });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error();
    location.href = data.url; // Stripe's own secure page
  } catch {
    toast("Couldn't open the payment page — try again in a moment");
  }
}

const money = (p) => new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency.toUpperCase(), minimumFractionDigits: p.amount % 100 ? 2 : 0 }).format(p.amount / 100);

async function showSubscribe(reason) {
  const head = {
    trial_ended: ["Your free trial has ended", "You are on the Free plan: Short Answer, Word Cloud, Mind Map, Post-its, Agree / Disagree and the room tools. Subscribe to get everything back."],
    subscription_ended: ["Your subscription has ended", "You are on the Free plan now. Subscribe again for every activity, lesson plans and downloads."],
    licence_ended: ["Your school's licence has ended", "Ask your school to renew, or subscribe yourself. Until then you are on the Free plan."],
    trial_ending: ["Keep Eyes Up after your trial", "Subscribe now and nothing changes when the trial ends."],
    locked_activity: ["This activity is in the Individual plan", "The Free plan includes Short Answer, Word Cloud, Mind Map, Post-its, Agree / Disagree and the room tools. Individual unlocks all 60+ activities, lesson plans and downloads."],
    locked_plans: ["Lesson plans are in the Individual plan", "Plan your questions and slides ahead of time and teach them with ▶ Next. Individual unlocks lesson plans, every activity and downloads."],
    locked_downloads: ["Downloads are in the Individual plan", "Reports, picture ZIPs and CSVs of every question come with Individual. Your lessons are still kept and viewable here."],
  }[reason] || ["Subscribe to Eyes Up", ""];
  const locked = false; // nothing locks a teacher out any more: the Free plan is always there
  $("subSheet").innerHTML = `
    <div style="font-size:2.2rem">👀</div>
    <h2 style="font-family:var(--font-display);margin-top:0.3rem">${head[0]}</h2>
    <p style="color:var(--ink-soft);margin-top:0.4rem">${head[1]}</p>
    <div class="price-row" id="priceRow"><p style="color:var(--muted)">Loading prices…</p></div>
    <p style="color:var(--muted);font-size:0.9rem;margin-top:0.9rem">Paid securely through Stripe. Cancel any time.${locked ? "<br/>Your lesson plans and past lessons are safe — you can still open and export your data." : ""}</p>
    <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:1rem;flex-wrap:wrap">
      ${locked ? `<a class="btn" href="/data" style="text-decoration:none;color:var(--ink)">📈 Open my data</a><button class="btn" id="subSignOut">↪ Sign out</button>` : `<button class="btn" id="subLater">Not now</button>`}
    </div>`;
  $("subOverlay").classList.add("show");
  if ($("subLater")) $("subLater").onclick = () => $("subOverlay").classList.remove("show");
  if ($("subSignOut")) $("subSignOut").onclick = () => $("signOutBtn").click();
  try {
    const info = await (await fetch("/api/billing/info")).json();
    const names = { month: "Monthly", year: "Yearly" };
    $("priceRow").innerHTML = info.prices.length
      ? info.prices.map((p) => `<button class="price-card ${p.interval === "year" ? "best" : ""}" data-interval="${p.interval}"><small>${names[p.interval]}</small><b>${money(p)}</b><small>per ${p.interval}</small></button>`).join("")
      : `<button class="btn primary big" data-interval="month">Subscribe</button>`;
    $("priceRow").querySelectorAll("[data-interval]").forEach((b) => (b.onclick = () => goBilling("checkout", { interval: b.dataset.interval })));
  } catch {
    $("priceRow").innerHTML = `<button class="btn primary big" data-interval="month">Subscribe</button>`;
    $("priceRow").querySelector("button").onclick = () => goBilling("checkout", { interval: "month" });
  }
}

function showAccount() {
  if (!me) return;
  const a = me.access;
  const canSubscribe = me.billing && !me.admin && (a.plan === "trial" || me.tier === "free");
  $("accountSheet").innerHTML = `
    <h2 style="font-family:var(--font-display)">👤 My account</h2>
    <p style="color:var(--ink-soft);margin-top:0.3rem"><b>${esc(me.name)}</b> · sign-in name <b>${esc(me.username)}</b></p>
    <div class="acct-plan">${planLine()}
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:${canSubscribe || me.canManageBilling ? "0.7rem" : "0"}">
        ${canSubscribe ? `<button class="btn primary" id="acctSub">Subscribe</button>` : ""}
        ${me.billing && me.canManageBilling ? `<button class="btn" id="acctPortal">💳 Manage subscription</button>` : ""}
      </div>
    </div>
    <div class="acct-row"><label for="acctEmail">Email</label><input id="acctEmail" type="email" maxlength="120" placeholder="you@school.edu" value="${esc(me.email)}" /></div>
    <button class="btn" id="acctSaveEmail" style="margin-top:0.6rem">Save email</button>
    <div class="acct-msg" id="acctEmailMsg"></div>
    <div class="acct-row"><label for="acctCur">Change password</label>
      <input id="acctCur" type="password" placeholder="Current password" autocomplete="current-password" />
      <input id="acctNew" type="password" placeholder="New password (6+ characters)" autocomplete="new-password" /></div>
    <button class="btn" id="acctSavePw" style="margin-top:0.6rem">Change password</button>
    <div class="acct-msg" id="acctPwMsg"></div>
    <div style="text-align:right;margin-top:0.6rem"><button class="btn" id="acctClose">Close</button></div>`;
  $("accountOverlay").classList.add("show");
  $("acctClose").onclick = () => $("accountOverlay").classList.remove("show");
  if ($("acctSub")) $("acctSub").onclick = () => { $("accountOverlay").classList.remove("show"); showSubscribe(a.ok ? "trial_ending" : a.reason); };
  if ($("acctPortal")) $("acctPortal").onclick = () => goBilling("portal", {});
  const say = (id, text, ok) => { $(id).textContent = text; $(id).style.color = ok ? "var(--green)" : "var(--red)"; };
  $("acctSaveEmail").onclick = async () => {
    try {
      const res = await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: teacherToken(), email: $("acctEmail").value.trim() }) });
      const data = await res.json();
      if (!res.ok) return say("acctEmailMsg", AUTH_ERRORS[data.error] || "Couldn't save — try again.", false);
      me = data;
      say("acctEmailMsg", "Saved ✓", true);
    } catch { say("acctEmailMsg", "Couldn't reach the server — try again.", false); }
  };
  $("acctSavePw").onclick = async () => {
    try {
      const res = await fetch("/api/me/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: teacherToken(), current: $("acctCur").value, next: $("acctNew").value }) });
      const data = await res.json();
      if (!res.ok) return say("acctPwMsg", data.error === "bad_login" ? "The current password isn't right." : AUTH_ERRORS[data.error] || "Couldn't change it — try again.", false);
      localStorage.setItem("eyesup_token", data.token); // this device stays signed in; others are signed out
      $("acctCur").value = $("acctNew").value = "";
      say("acctPwMsg", "Password changed ✓", true);
    } catch { say("acctPwMsg", "Couldn't reach the server — try again.", false); }
  };
}
$("accountBtn").onclick = showAccount;
$("accountOverlay").addEventListener("click", (e) => { if (e.target === $("accountOverlay")) $("accountOverlay").classList.remove("show"); });

// Back from Stripe's checkout page.
(() => {
  const b = new URLSearchParams(location.search).get("billing");
  if (!b) return;
  history.replaceState(null, "", location.pathname);
  setTimeout(() => toast(b === "success" ? "🎉 You're subscribed — thank you! Your account is all set." : "No payment taken — you can subscribe any time from ☰ Menu → My account."), 600);
  if (b === "success") setTimeout(loadMe, 4000); // give Stripe's confirmation a moment to land
})();
loadMe();

$("signOutBtn").onclick = () => {
  localStorage.removeItem("eyesup_token");
  sessionStorage.removeItem("eyesup_teacher_code");
  location.reload();
};

$("pwGo").onclick = () => {
  const pw = $("pwInput").value;
  if (!pw) return;
  sessionStorage.setItem("eyesup_pw", pw);
  $("pwInput").value = "";
  if (ws && ws.readyState === 1) attach();
};
$("pwInput").addEventListener("keydown", (e) => { if (e.key === "Enter") $("pwGo").click(); });

/* ================================================================== */
/* Views: Lesson plans · Teach                                        */
/* ================================================================== */

// The page always opens on Teach; Lesson plans is a tab away.
let view = "teach";

function showView(v) {
  view = v === "teach" ? "teach" : "plans";
  $("viewPlans").hidden = view !== "plans";
  $("viewTeach").hidden = view !== "teach";
  $("classBar").hidden = view !== "teach";
  document.querySelectorAll(".view-tab[data-view]").forEach((t) => t.classList.toggle("on", t.dataset.view === view));
  if (view === "plans") {
    if (!editing) loadPlans();
  } else if (editing) {
    leaveEditor(); // flush any pending save
  }
  window.scrollTo(0, 0);
}
document.querySelectorAll(".view-tab[data-view]").forEach((t) => (t.onclick = () => showView(t.dataset.view)));

$("menuBtn").onclick = (e) => {
  e.stopPropagation();
  $("menu").classList.toggle("show");
};
document.addEventListener("click", () => $("menu").classList.remove("show"));
// The Lesson settings drop-down closes like the menu: a click anywhere else puts it away.
// The docked teach top sits exactly under the sticky header, whatever height the header wraps to.
// The header and the Teach bar are docked; Live now docks under both, so their heights are measured.
const setHeadH = () => {
  const root = document.documentElement.style;
  root.setProperty("--head-h", `${document.querySelector("header").offsetHeight}px`);
  const bar = $("classBar");
  root.setProperty("--top-h", `${bar && !bar.hidden && !bar.classList.contains("unpinned") ? bar.offsetHeight : 0}px`);
};
setHeadH();
window.addEventListener("resize", setHeadH);
if (window.ResizeObserver) { const ro = new ResizeObserver(setHeadH); ro.observe(document.querySelector("header")); ro.observe($("classBar")); }
// ▴ folds the Teach bar to one slim row (more room for the lesson on a laptop); remembered on this computer.
const setTeachSmall = (small) => {
  $("classBar").classList.toggle("small", small);
  $("teachFold").textContent = small ? "▾" : "▴";
  $("teachFold").title = small ? "Show the full Teach bar" : "Make the Teach bar smaller — more room for the lesson on a laptop";
  try { localStorage.setItem("eyesup_teachbar", small ? "small" : "full"); } catch { /* private window */ }
  setHeadH();
};
$("teachFold").onclick = () => setTeachSmall(!$("classBar").classList.contains("small"));
try { if (localStorage.getItem("eyesup_teachbar") === "small") setTeachSmall(true); } catch { /* fine */ }
// 📌 pins: the Teach bar and Live now are docked unless the teacher lets them scroll.
function applyFolds() {
  const barPinned = !foldOn("unpin:bar"), livePinned = !foldOn("unpin:live");
  $("classBar").classList.toggle("unpinned", !barPinned);
  $("teachPin").classList.toggle("on", barPinned);
  $("teachPin").title = barPinned ? "Docked: this bar stays at the top while the page scrolls. Click to let it scroll away." : "Not docked: this bar scrolls with the page. Click to keep it at the top.";
  $("livePanel").classList.toggle("unpinned", !livePinned);
  $("livePin").classList.toggle("on", livePinned);
  $("livePin").textContent = livePinned ? "📌 docked" : "📌 scrolls";
  $("livePin").title = livePinned ? "Docked: Live now stays in view while the page scrolls. Click to let it scroll away." : "Not docked: Live now scrolls with the page. Click to keep it in view.";
  $("livePanel").classList.toggle("folded", foldOn("live"));
  $("liveFold").textContent = foldOn("live") ? "▸" : "▾";
  $("liveFold").title = foldOn("live") ? "Open Live now" : "Fold Live now away (it opens again when something launches)";
  $("roomTools").classList.toggle("folded", foldOn("tools"));
  $("roomToolsHead").title = foldOn("tools") ? "Show the room tools" : "Fold the room tools away";
  setHeadH();
}
$("teachPin").onclick = () => { setFold("unpin:bar", !foldOn("unpin:bar")); applyFolds(); };
$("livePin").onclick = () => { setFold("unpin:live", !foldOn("unpin:live")); applyFolds(); };
$("liveFold").onclick = () => { setFold("live", !foldOn("live")); applyFolds(); };
$("liveClose").onclick = () => send({ type: "close_question" });
$("roomToolsHead").onclick = () => { setFold("tools", !foldOn("tools")); applyFolds(); };
applyFolds();
document.addEventListener("click", (e) => { document.querySelectorAll("details.lesson-settings").forEach((d) => { if (d.open && !d.contains(e.target)) d.open = false; }); });

/* ---------------- saved lesson plans: server calls ---------------- */

const jsonHeaders = { "Content-Type": "application/json" };
async function api(method, url, body) {
  const res = await fetch(url, { method, headers: body ? jsonHeaders : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "request_failed"), { status: res.status });
  return data;
}
const plansApi = {
  list: () => api("GET", `/api/plans?${authQuery()}`),
  get: (id) => api("GET", `/api/plans/${id}?${authQuery()}`),
  create: (title, steps) => api("POST", "/api/plans", { t: teacherToken(), title, steps }),
  update: (id, title, steps) => api("PUT", `/api/plans/${id}`, { t: teacherToken(), title, steps }),
  duplicate: (id) => api("POST", `/api/plans/${id}/duplicate`, { t: teacherToken() }),
  remove: (id) => api("DELETE", `/api/plans/${id}?${authQuery()}`),
};

// Same steps, regardless of the key order the database hands back.
const canon = (v) =>
  JSON.stringify(v, (k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.keys(val).sort().reduce((o, key) => ((o[key] = val[key]), o), {})
      : val
  );

const keyForStep = (st) =>
  st.mode === "counters" ? (st.counterKind === "base10" ? "tens_ones" : "counters")
  : st.mode === "multi_choice" && Array.isArray(st.optionImages) && (st.options || []).length >= 2 && st.optionImages.filter(Boolean).length === st.options.length ? "picture_choice"
  : st.mode === "compose" ? (st.level === "beginner" ? "compose_beginner" : st.level === "advanced" ? "compose_advanced" : "compose")
  : st.mode;
const stepTag = (st) => {
  const m = MODES[keyForStep(st)];
  return m ? `${m.icon} ${m.name}` : st.mode;
};
const stepIcon = (st) => MODES[keyForStep(st)]?.icon || "▫️";

function timeAgo(when) {
  if (!when) return "";
  const days = Math.floor((Date.now() - new Date(when).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(when).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/* ---------------- the library ---------------- */

let plans = [];
let plansLoaded = false;
let plansStorage = true;

async function loadPlans() {
  if (!teacherToken()) return renderLibrary();
  try {
    const data = await plansApi.list();
    plans = data.plans || [];
    plansStorage = data.storage !== false;
    plansLoaded = true;
  } catch (e) {
    plansLoaded = false;
    $("planLibrary").innerHTML = `<div class="empty-plans"><h2>Couldn't load your lesson plans</h2>
      <p style="color:var(--ink-soft);margin-top:0.5rem">${e.status === 403 ? "Your sign-in has expired — sign out and back in." : "The server may be waking up. Trying again…"}</p></div>`;
    if (e.status !== 403) setTimeout(() => view === "plans" && !editing && loadPlans(), 5000);
    return;
  }
  renderLibrary();
}

function renderLibrary() {
  const lib = $("planLibrary");
  $("planEditor").hidden = true;
  lib.hidden = false;
  if (!plansStorage) {
    lib.innerHTML = `<div class="empty-plans"><h2>Lesson plans need an account</h2>
      <p style="color:var(--ink-soft);margin-top:0.5rem">This copy of Eyes Up isn't connected to a database, so plans can't be saved. You can still teach on the spot.</p>
      <p style="margin-top:1.2rem"><button class="btn primary big" data-go="teach">🎤 Start teaching</button></p></div>`;
    return bindLibrary();
  }
  if (onFreePlan()) {
    lib.innerHTML = `<div class="empty-plans"><div style="font-size:2.6rem">🔒</div><h2>Lesson plans are in the Individual plan</h2>
      <p style="color:var(--ink-soft);margin-top:0.5rem;max-width:52ch;margin-left:auto;margin-right:auto">Plan your questions, slides and room tools ahead of time and teach them with ▶ Next. Individual is $6.99 a month or $59.99 a year and also unlocks every activity and downloads.</p>
      <p style="margin-top:1.2rem;display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap"><button class="btn primary big" id="plansUpgrade">Get Individual</button><button class="btn big" data-go="teach">🎤 Teach on the spot</button></p></div>`;
    $("plansUpgrade").onclick = () => showSubscribe("locked_plans");
    return bindLibrary();
  }
  const liveId = state?.planId;
  const head = `
    <div class="plans-head">
      <div>
        <h1>Lesson plans</h1>
        <p>Plan your questions ahead of time. Each plan is saved to your account, so you can teach it again and again.</p>
      </div>
      <span class="spacer"></span>
      <button class="btn primary big" data-new-plan>＋ Plan a new lesson</button>
    </div>
    <div class="quick-teach">🎤 <span>Teaching right now without a plan?</span>
      <button class="btn" data-go="teach">Start teaching on the spot →</button></div>`;

  if (!plans.length) {
    lib.innerHTML = head.replace(/<div class="quick-teach">[\s\S]*?<\/div>/, "") + `
      <div class="empty-plans">
        <div style="font-size:2.6rem">📝</div>
        <h2>Plan your first lesson</h2>
        <p style="color:var(--ink-soft);margin-top:0.4rem">It takes a few minutes, and you only have to do it once.</p>
        <div class="how-steps">
          <div class="how-step"><span class="n">1</span><b>Add your activities</b><span>Pick a word cloud, a quiz question, a drawing… and type each question, in order.</span></div>
          <div class="how-step"><span class="n">2</span><b>It saves by itself</b><span>Your plan is kept in your account. Come back and change it any time.</span></div>
          <div class="how-step"><span class="n">3</span><b>Press ▶ Teach</b><span>In class, launch each step with one tap. Reuse it with every class, every year.</span></div>
        </div>
        <button class="btn primary big" data-new-plan>＋ Plan my first lesson</button>
        <p style="margin-top:1rem"><button class="link-btn" data-go="teach">or just start teaching on the spot →</button></p>
      </div>`;
    return bindLibrary();
  }

  lib.innerHTML = head + `<div class="plan-cards">${plans
    .map((pl) => {
      const icons = [...new Set(pl.modes.map((m) => stepIcon({ mode: m })))].slice(0, 10).join(" ");
      const taught = pl.timesTaught
        ? `Taught ${pl.timesTaught === 1 ? "once" : `${pl.timesTaught} times`} · last ${timeAgo(pl.lastTaughtAt)}`
        : `Not taught yet · edited ${timeAgo(pl.updatedAt)}`;
      return `
      <div class="plan-card ${pl.id === liveId ? "live" : ""}">
        ${pl.id === liveId ? `<span class="pc-live">Open in Teach</span>` : ""}
        <div class="pc-title ${pl.title ? "" : "untitled"}">${pl.title ? esc(pl.title) : "Untitled lesson"}</div>
        <div class="pc-meta">${pl.stepCount} activit${pl.stepCount === 1 ? "y" : "ies"}</div>
        <div class="pc-icons">${icons || "&nbsp;"}</div>
        <div class="pc-foot">${taught}</div>
        <div class="pc-actions">
          <button class="btn primary grow" data-teach="${pl.id}" ${pl.stepCount ? "" : "disabled"}>▶ Teach</button>
          <button class="btn" data-edit="${pl.id}">✎ Edit</button>
          <button class="btn" data-dup="${pl.id}" title="Make a copy">⧉</button>
          <button class="btn danger-ghost" data-del="${pl.id}" title="Delete">🗑</button>
        </div>
      </div>`;
    })
    .join("")}</div>`;
  bindLibrary();
}

function bindLibrary() {
  const lib = $("planLibrary");
  lib.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => showView(b.dataset.go)));
  lib.querySelectorAll("[data-new-plan]").forEach((b) => (b.onclick = newPlan));
  lib.querySelectorAll("[data-teach]").forEach((b) => (b.onclick = () => teachPlan(+b.dataset.teach)));
  lib.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => openEditor(+b.dataset.edit)));
  lib.querySelectorAll("[data-dup]").forEach((b) => (b.onclick = async () => {
    try {
      await plansApi.duplicate(+b.dataset.dup);
      toast("Copy made — it's at the top");
      loadPlans();
    } catch { toast("Couldn't copy that plan — try again"); }
  }));
  lib.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    const pl = plans.find((x) => x.id === +b.dataset.del);
    if (!confirm(`Delete “${pl?.title || "Untitled lesson"}”?\n\nThe plan is removed for good. Reports from classes you already taught are kept.`)) return;
    try {
      await plansApi.remove(pl.id);
      toast("Lesson plan deleted");
      loadPlans();
    } catch { toast("Couldn't delete that plan — try again"); }
  }));
}

async function newPlan() {
  try {
    const { id } = await plansApi.create("", []);
    await openEditor(id, true);
  } catch { toast("Couldn't start a new plan — check you're signed in"); }
}

/* ---------------- the editor ---------------- */

let editing = null; // { id, title, steps }
let saveTimer = null;
let saveSeq = 0;

async function openEditor(id, isNew) {
  try {
    const pl = await plansApi.get(id);
    editing = { id: pl.id, title: pl.title || "", steps: pl.steps || [] };
  } catch {
    return toast("Couldn't open that plan — try again");
  }
  if (view !== "plans") showView("plans");
  $("planLibrary").hidden = true;
  $("planEditor").hidden = false;
  renderEditor();
  setSaveState("saved");
  window.scrollTo(0, 0);
  if (isNew) $("planTitle").focus();
}

function stepDetail(st) {
  const bits = [];
  if (st.mode === "tool_timer") return `⏱ ${st.toolSeconds < 60 ? `${st.toolSeconds} seconds` : `${st.toolSeconds / 60} min`}${st.toolBig ? " · fills the classroom screen" : ""}`;
  if (st.mode === "tool_groups") return st.groupBy === "count" ? `👥 split into ${st.groupN} groups` : `👥 groups of ${st.groupN}`;
  if (st.mode === "tool_dice") return st.faces ? `🎲 ${st.faces.filter(Boolean).length} of 6 faces have a question` : "🎲 rolls with the faces typed under Room tools";
  if (st.mode === "tool_pick") return "🎲 one student, no repeats until everyone has had a turn";
  if (st.mode === "deck") return `<span>${{ google: "Google Slides", microsoft: "PowerPoint Online", canva: "Canva" }[st.provider] || "Slides"} · plays with animations · picks up where you left off</span>`;
  if (st.mode === "slide") return `<img class="slide-thumb" src="/api/slide/${st.img}?${authQuery()}" alt="slide ${st.page}" loading="lazy" /> <span>Slide ${st.page} of ${st.pages}</span>`;
  if (st.image) bits.push(`<img src="${st.image}" alt="" />`);
  const thumb = (list, i) => (list?.[i] ? `<img src="${list[i]}" alt="" style="height:28px;width:28px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:0.2rem" />` : "");
  if (st.mode === "match_up" && st.options) bits.push(st.options.map((o, i) => thumb(st.pairImages, i) + esc(o).replace(" = ", " ↔ ")).join(" · "));
  else if (st.options && st.options.length)
    bits.push(st.options.map((o, i) => `${thumb(st.optionImages, i)}${esc(o)}${st.correct === i ? " ✓" : ""}`).join(" · "));
  if (st.passage) bits.push(`“${esc(st.passage.slice(0, 110))}${st.passage.length > 110 ? "…" : ""}”`);
  if (st.expected) bits.push(`Answer: <b>${esc(st.expected)}</b>`);
  if (st.trace) bits.push(`✍️ Trace <b>${esc(st.trace)}</b>${st.traceCase === "upper" ? " · capitals" : st.traceCase === "both" ? " · Aa both" : ""}${st.traceGuide === "dots" ? " · dots only" : ""}`);
  if (st.url) bits.push(`🔗 ${esc(st.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 70))}`);
  if (st.sprintSeconds) bits.push(`⏱ ${st.sprintSeconds / 60} min`);
  return bits.join(" &nbsp; ");
}

function renderEditor(flashIndex) {
  const ed = $("planEditor");
  const steps = editing.steps;
  ed.innerHTML = `
    <div class="editor-top">
      <button class="link-btn" id="backToPlans">← All lesson plans</button>
      <span class="save-state" id="saveState"></span>
    </div>
    <input class="plan-title" id="planTitle" maxlength="80" placeholder="Name this lesson, e.g. Year 4 Fractions recap" value="${esc(editing.title)}" />
    <p class="editor-help">Add activities — and your slides — in the order you'll teach them. In class, ▶ Next (or your presenter clicker) moves through them one at a time.${steps.length > 1 ? " <b>Drag a step</b> to change the order." : ""}</p>
    ${steps.length
      ? `<ol class="step-list">${steps
          .map((st, i) => `
        <li class="step-card ${i === flashIndex ? "flash" : ""}" data-i="${i}">
          <span class="step-grip" title="Drag to move this step" aria-hidden="true">⠿</span>
          <span class="step-num">${i + 1}</span>
          <div class="step-body">
            <div class="step-type">${stepTag(st)}</div>
            <div class="step-q ${st.prompt || st.mode === "slide" || st.mode === "deck" || MODES[st.mode]?.toolUI ? "" : "aloud"}">${st.prompt ? esc(st.prompt) : st.mode === "slide" || st.mode === "deck" || MODES[st.mode]?.toolUI ? "" : "You'll ask this one aloud"}</div>
            ${stepDetail(st) ? `<div class="step-extra">${stepDetail(st)}</div>` : ""}
            ${st.mode !== "slide" && st.mode !== "deck" && steps.slice(0, i).some((p) => p.mode === "deck")
              ? `<label class="step-after" title="Which slide of your live deck comes before this question — shown on the classroom screen's corner button so you know when to press it">🎞 Ask after slide <input type="number" min="1" max="999" inputmode="numeric" placeholder="№" data-after="${i}" value="${st.afterSlide || ""}" /></label>`
              : ""}
          </div>
          <div class="step-actions">
            <button class="btn" data-up="${i}" title="Move up" ${i === 0 ? "disabled" : ""}>↑</button>
            <button class="btn" data-down="${i}" title="Move down" ${i === steps.length - 1 ? "disabled" : ""}>↓</button>
            ${st.mode === "slide" || st.mode === "deck" ? "" : `<button class="btn" data-edit-step="${i}">✎ Edit</button>`}
            <button class="btn" data-dup-step="${i}" title="Duplicate this step">⧉</button>
            <button class="btn danger-ghost" data-del-step="${i}" title="Delete this step">🗑</button>
          </div>
        </li>`)
          .join("")}</ol>`
      : `<div class="steps-empty"><b>No activities yet.</b><br/>Press <b>＋ Add an activity</b> to choose your first one.</div>`}
    <div class="add-row">
      <button class="btn primary big" id="addActivityBtn">＋ Add an activity</button>
      <button class="btn" id="pasteQuizPlanBtn">📋 Paste a quiz</button>
      <button class="btn" id="addSlidesBtn" title="PowerPoint: File → Save as → PDF. Google Slides: File → Download → PDF.">📽 Add slides (PDF)</button>
      <button class="btn" id="addDeckBtn" title="Play your real Google Slides, PowerPoint Online or Canva deck — animations and videos included">🎞 Add live slides (link)</button>
      <input type="file" id="slidesFile" accept="application/pdf,image/png,image/jpeg" multiple hidden />
    </div>
    <p class="editor-help" style="margin-top:0.4rem;font-size:0.9rem">📽 <b>Using PowerPoint or Google Slides?</b> Save your slides as a PDF (PowerPoint: File → Save As → PDF · Google Slides: File → Download → PDF) and add it here. Each slide becomes a step — drag activities in between them.</p>
    <div class="editor-foot">
      <button class="btn dark big" id="teachThisBtn" ${steps.length ? "" : "disabled"}>▶ Teach this lesson</button>
      <span style="color:var(--muted);font-size:0.9rem">${steps.length} activit${steps.length === 1 ? "y" : "ies"} · saves automatically</span>
      <span class="spacer"></span>
      <button class="btn danger-ghost" id="deletePlanBtn">🗑 Delete plan</button>
    </div>`;
  setSaveState(lastSaveState);

  $("backToPlans").onclick = async () => { await leaveEditor(); loadPlans(); };
  $("planTitle").oninput = () => { editing.title = $("planTitle").value; scheduleSave(); };
  $("addActivityBtn").onclick = () => openActivityPicker({ kind: "plan-add" });
  $("pasteQuizPlanBtn").onclick = () => $("pasteQuizBtn").click();
  $("addSlidesBtn").onclick = () => $("slidesFile").click();
  $("addDeckBtn").onclick = () => openDeckSheet();
  $("slidesFile").onchange = (e) => { const files = [...e.target.files]; e.target.value = ""; if (files.length) importSlides(files); };
  $("teachThisBtn").onclick = async () => { const id = editing.id; await leaveEditor(); teachPlan(id); };
  $("deletePlanBtn").onclick = async () => {
    if (!confirm(`Delete “${editing.title || "Untitled lesson"}”?\n\nThe plan is removed for good.`)) return;
    const id = editing.id;
    clearTimeout(saveTimer);
    editing = null;
    try { await plansApi.remove(id); toast("Lesson plan deleted"); } catch { toast("Couldn't delete — try again"); }
    loadPlans();
  };
  const move = (from, to) => {
    const [st] = editing.steps.splice(from, 1);
    editing.steps.splice(to, 0, st);
    renderEditor(to);
    scheduleSave();
  };
  enableStepDrag(ed, move);
  ed.querySelectorAll("[data-up]").forEach((b) => (b.onclick = () => move(+b.dataset.up, +b.dataset.up - 1)));
  ed.querySelectorAll("[data-down]").forEach((b) => (b.onclick = () => move(+b.dataset.down, +b.dataset.down + 1)));
  ed.querySelectorAll("[data-dup-step]").forEach((b) => (b.onclick = () => {
    const i = +b.dataset.dupStep;
    editing.steps.splice(i + 1, 0, JSON.parse(JSON.stringify(editing.steps[i])));
    renderEditor(i + 1);
    scheduleSave();
  }));
  ed.querySelectorAll("[data-del-step]").forEach((b) => (b.onclick = () => {
    const i = +b.dataset.delStep;
    if (!confirm(`Delete step ${i + 1}?`)) return;
    editing.steps.splice(i, 1);
    renderEditor();
    scheduleSave();
  }));
  ed.querySelectorAll("[data-edit-step]").forEach((b) => (b.onclick = () => editStep(+b.dataset.editStep)));
  ed.querySelectorAll("[data-after]").forEach((inp) => (inp.onchange = () => {
    const st = editing.steps[+inp.dataset.after];
    const v = parseInt(inp.value, 10);
    if (v > 0) st.afterSlide = Math.min(999, v); else delete st.afterSlide;
    scheduleSave();
  }));
  if (flashIndex != null) ed.querySelector(`.step-card[data-i="${flashIndex}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// Drag a step card up or down to re-order the lesson. A mouse can grab the
// card anywhere (except its buttons); a finger uses the ⠿ grip so the page
// can still be scrolled by touch.
function enableStepDrag(ed, move) {
  const list = ed.querySelector(".step-list");
  if (!list) return;
  list.querySelectorAll(".step-card").forEach((card) => {
    card.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button, a, input")) return;
      if (e.pointerType !== "mouse" && !e.target.closest(".step-grip")) return;
      const from = +card.dataset.i;
      const startY = e.clientY, startScroll = window.scrollY;
      let dragging = false, to = from;
      const others = () => [...list.querySelectorAll(".step-card")].filter((c) => c !== card);
      const clearMarks = () => list.querySelectorAll(".drop-before, .drop-after").forEach((c) => c.classList.remove("drop-before", "drop-after"));

      const onMove = (ev) => {
        if (!dragging) {
          if (Math.abs(ev.clientY - startY) < 6) return;
          dragging = true;
          card.classList.add("dragging");
          document.body.classList.add("step-dragging");
          try { card.setPointerCapture(e.pointerId); } catch { /* fine without */ }
        }
        ev.preventDefault();
        // Keep the card under the pointer even while the page auto-scrolls.
        if (ev.clientY < 90) window.scrollBy(0, -14);
        else if (ev.clientY > window.innerHeight - 90) window.scrollBy(0, 14);
        card.style.transform = `translateY(${ev.clientY - startY + (window.scrollY - startScroll)}px)`;
        // Where would it land? Count the other cards whose middle is above the pointer.
        const rest = others();
        const pos = rest.filter((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2 < ev.clientY; }).length;
        to = pos;
        clearMarks();
        if (pos !== from) {
          if (pos < rest.length) rest[pos].classList.add("drop-before");
          else if (rest.length) rest[rest.length - 1].classList.add("drop-after");
        }
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        document.body.classList.remove("step-dragging");
        clearMarks();
        if (!dragging) return;
        card.classList.remove("dragging");
        card.style.transform = "";
        if (to !== from) move(from, to);
      };
      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    });
  });
}

let lastSaveState = "saved";
function setSaveState(st) {
  lastSaveState = st;
  const el = $("saveState");
  if (!el) return;
  el.className = `save-state ${st}`;
  el.textContent = st === "saving" ? "Saving…" : st === "error" ? "⚠ Not saved yet — retrying" : "✓ Saved";
}

function scheduleSave() {
  setSaveState("saving");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(savePlanNow, 700);
}

async function savePlanNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!editing) return;
  const mine = ++saveSeq;
  try {
    await plansApi.update(editing.id, editing.title, editing.steps);
    if (mine === saveSeq) setSaveState("saved");
  } catch {
    if (mine === saveSeq) {
      setSaveState("error");
      saveTimer = setTimeout(savePlanNow, 4000);
    }
  }
}

async function leaveEditor() {
  if (!editing) return;
  if (saveTimer || lastSaveState !== "saved") await savePlanNow();
  // A plan that was opened and abandoned with nothing in it isn't worth keeping.
  if (!editing.title.trim() && !editing.steps.length) plansApi.remove(editing.id).catch(() => {});
  editing = null;
}

window.addEventListener("beforeunload", (e) => {
  if (editing && lastSaveState !== "saved") {
    e.preventDefault();
    e.returnValue = "";
  }
});

/* ---------------- choosing / editing an activity for a plan ---------------- */

let composerTarget = { kind: "launch" }; // | {kind:"plan-add"} | {kind:"plan-edit", index}
const gridHome = document.createComment("mode-grid-home");
const composerHome = document.createComment("composer-home");
$("modeGrid").before(gridHome);
$("composer").before(composerHome);

function configureComposerButtons() {
  const k = composerTarget.kind;
  $("launchBtn").hidden = k !== "launch";
  $("addStepBtn").hidden = k !== "launch";
  $("saveStepBtn").hidden = k === "launch";
  $("saveStepBtn").textContent = k === "plan-edit" ? "💾 Save changes" : "＋ Add to lesson plan";
}

function openActivityPicker(target) {
  composerTarget = target;
  composerImage = null;
  $("activityPickHost").append($("modeGrid"));
  $("activityFormHost").append($("composer"));
  $("activityTitle").textContent = target.kind === "plan-edit" ? `Edit step ${target.index + 1}` : "Add an activity";
  $("activityOverlay").classList.add("show");
  $("composer").classList.remove("show");
  composerModeKey = null;
  $("activityPick").hidden = false;
  $("activityForm").hidden = true;
  configureComposerButtons();
}

function showActivityForm() {
  $("activityPick").hidden = true;
  $("activityForm").hidden = false;
}

function closeActivityPicker() {
  $("activityOverlay").classList.remove("show");
  gridHome.after($("modeGrid"));
  composerHome.after($("composer"));
  composerTarget = { kind: "launch" };
  configureComposerButtons();
}

$("activityBack").onclick = () => {
  $("composer").classList.remove("show");
  composerModeKey = null;
  $("activityPick").hidden = false;
  $("activityForm").hidden = true;
};
$("activityClose").onclick = () => closeComposer();
$("activityOverlay").onclick = (e) => { if (e.target === $("activityOverlay")) closeComposer(); };
if ($("closeComposer")) $("closeComposer").onclick = closeComposer;

/* ---------------- live slides: paste a deck link ---------------- */

function openDeckSheet() {
  if (!editing) return;
  const wrap = document.createElement("div");
  wrap.className = "overlay show";
  wrap.innerHTML = `<div class="sheet" style="max-width:560px">
    <h2 style="font-family:var(--font-display)">🎞 Add live slides</h2>
    <p style="color:var(--ink-soft);margin-top:0.3rem">Your real deck plays on the classroom screen — animations, transitions and videos included. Launch activities whenever you like; the slides wait exactly where you left them.</p>
    <details class="deck-how" open><summary><b>Google Slides</b></summary><p>Share → General access: <b>Anyone with the link</b> → <b>Copy link</b>. Paste it below.</p></details>
    <details class="deck-how"><summary><b>PowerPoint</b></summary><p>Open the deck in <b>PowerPoint for the web</b> (OneDrive) → File → Share → <b>Embed</b> → copy the embed code. Paste it below. (Your school account may need to allow embedding.)</p></details>
    <details class="deck-how"><summary><b>Canva</b></summary><p>Share → <b>Embed</b> → copy the smart embed link. Paste it below.</p></details>
    <textarea id="deckLink" rows="3" placeholder="Paste the link or embed code here" style="width:100%;margin-top:0.8rem;border:1.5px solid var(--line);border-radius:10px;padding:0.7rem 0.9rem;font:inherit;font-size:0.9rem"></textarea>
    <input id="deckName" maxlength="80" placeholder="Name (optional), e.g. Fractions slides" style="width:100%;margin-top:0.5rem;border:1.5px solid var(--line);border-radius:10px;padding:0.6rem 0.9rem;font:inherit" />
    <p id="deckErr" style="color:var(--red);font-size:0.9rem;margin-top:0.5rem;display:none"></p>
    <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:0.9rem">
      <button class="btn" id="deckCancel">Cancel</button>
      <button class="btn primary" id="deckAdd">Add to lesson</button>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.onclick = (e) => { if (e.target === wrap) close(); };
  wrap.querySelector("#deckCancel").onclick = close;
  wrap.querySelector("#deckLink").focus();
  wrap.querySelector("#deckAdd").onclick = async () => {
    const err = wrap.querySelector("#deckErr");
    try {
      const r = await fetch("/api/deck-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: wrap.querySelector("#deckLink").value }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const name = wrap.querySelector("#deckName").value.trim() || { google: "Google Slides", microsoft: "PowerPoint", canva: "Canva slides" }[d.provider];
      const at = editing.steps.length;
      editing.steps.push({ mode: "deck", url: d.url, provider: d.provider, prompt: name });
      scheduleSave();
      renderEditor(at);
      close();
      toast("🎞 Live slides added — drag them where you want them");
    } catch {
      err.textContent = "That link isn't one Eyes Up can play. Use a Google Slides share link, a PowerPoint “Embed” code from PowerPoint for the web, or a Canva embed link.";
      err.style.display = "block";
    }
  };
}

/* ---------------- slides: PDF (or slide pictures) → one step per slide ---------------- */

let pdfjsReady = null;
function loadPdfJs() {
  if (pdfjsReady) return pdfjsReady;
  pdfjsReady = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/vendor/pdfjs/pdf.min.js"; // pdf.js 3.11.174 (Apache-2.0), served by Eyes Up so school filters can't block it
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    s.onerror = () => { pdfjsReady = null; reject(new Error("pdf_lib")); };
    document.head.appendChild(s);
  });
  return pdfjsReady;
}
const SLIDE_PX = 1600; // long edge — crisp on a classroom screen, small enough to load instantly
function canvasFor(w, h) {
  const k = Math.min(1, SLIDE_PX / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  return { c, g, k };
}
async function pdfToSlides(file, progress) {
  const lib = await loadPdfJs();
  const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
  const n = Math.min(pdf.numPages, 120);
  const out = [];
  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i);
    const v1 = page.getViewport({ scale: 1 });
    const scale = Math.min(SLIDE_PX / v1.width, SLIDE_PX / v1.height);
    const vp = page.getViewport({ scale });
    const { c, g } = canvasFor(vp.width, vp.height);
    await page.render({ canvasContext: g, viewport: page.getViewport({ scale: scale * (c.width / vp.width) }) }).promise;
    out.push(c.toDataURL("image/jpeg", 0.85));
    progress(`Reading your slides… ${i} of ${n}`);
  }
  return out;
}
function imageToSlide(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { const { c, g } = canvasFor(img.naturalWidth, img.naturalHeight); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); resolve(c.toDataURL("image/jpeg", 0.85)); };
    img.onerror = () => reject(new Error("bad_image"));
    img.src = URL.createObjectURL(file);
  });
}
async function importSlides(files) {
  if (!editing) return;
  const box = document.createElement("div");
  box.className = "slide-progress";
  document.body.appendChild(box);
  const progress = (t) => (box.textContent = t);
  try {
    progress("Getting your slides ready…");
    let images = [];
    const pdfs = files.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    for (const f of pdfs) images.push(...(await pdfToSlides(f, progress)));
    const pics = files.filter((f) => f.type.startsWith("image/")).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    for (let i = 0; i < pics.length; i++) { progress(`Reading your slides… ${i + 1} of ${pics.length}`); images.push(await imageToSlide(pics[i])); }
    images = images.slice(0, 120);
    if (!images.length) throw new Error("no_slides");
    if (editing.steps.length + images.length > 150) throw new Error("too_many");
    const title = (pdfs[0]?.name || "Slides").replace(/\.[a-z0-9]+$/i, "").slice(0, 60);
    const post = async (url, body) => {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: teacherToken(), ...body }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "upload_failed");
      return d;
    };
    const deck = await post("/api/decks", { title, pages: images.length });
    const steps = [];
    for (let i = 0; i < images.length; i++) {
      progress(`Saving slide ${i + 1} of ${images.length}…`);
      const { img } = await post(`/api/decks/${deck.id}/slides`, { page: i + 1, image: images[i] });
      steps.push({ mode: "slide", img, deck: deck.id, page: i + 1, pages: images.length, prompt: title });
    }
    const at = editing.steps.length;
    editing.steps.push(...steps);
    scheduleSave();
    renderEditor(at);
    toast(`📽 ${steps.length} slide${steps.length === 1 ? "" : "s"} added — drag activities in between them`);
  } catch (e) {
    toast({
      pdf_lib: "Couldn't load the PDF reader — check the internet connection and try again",
      no_slides: "No slides found — choose a PDF of your slides",
      too_many: "That's more slides than one lesson can hold — split the deck into two lessons",
      too_big: "One of those slides is too large — try saving the PDF again at a smaller size",
    }[e.message] || "Couldn't add those slides — try again");
  } finally {
    box.remove();
  }
}

function editStep(i) {
  const st = editing.steps[i];
  openActivityPicker({ kind: "plan-edit", index: i });
  composerImage = st.image || null;
  openComposer(keyForStep(st), true);
  fillComposer(st);
}

// Put a saved step back into the activity form so it can be changed.
function fillComposer(st) {
  const m = MODES[composerModeKey];
  $("composerPrompt").value = st.prompt || "";
  if (m.toolUI) {
    if ($("toolSeconds") && st.toolSeconds) { const sel = $("toolSeconds"); if (![...sel.options].some((o) => +o.value === st.toolSeconds)) sel.add(new Option(`${st.toolSeconds} seconds`, st.toolSeconds)); sel.value = String(st.toolSeconds); }
    if ($("toolBig")) $("toolBig").checked = !!st.toolBig;
    if ($("toolGroupN") && st.groupN) $("toolGroupN").value = st.groupN;
    if ($("toolGroupBy") && st.groupBy) $("toolGroupBy").value = st.groupBy;
    if (st.faces) $("composerOpts").querySelectorAll(".tool-dice-in").forEach((inp) => { inp.value = st.faces[+inp.dataset.face] || ""; });
    return;
  }
  if (m.opts && st.options) {
    const boxes = [...$("composerOpts").querySelectorAll("input[data-opt]")];
    st.options.forEach((o, i) => { if (boxes[i]) boxes[i].value = o; });
  }
  if (m.hasCorrect && $("correctSel")) $("correctSel").value = Number.isInteger(st.correct) ? String(st.correct) : "";
  if (m.picDrop) {
    composerOptImgs = [...(st.optionImages || [])].filter(Boolean);
    picCaps = (st.options || []).map((o) => (/^Picture \d+$/.test(o) ? "" : o));
    picCorrect = Number.isInteger(st.correct) ? st.correct : null;
    renderPicGrid();
  } else if (m.picOpts) {
    composerOptImgs = [...(st.optionImages || st.pairImages || [])];
    composerOptImgs.forEach((_, i) => showOptThumb(i));
  }
  if (m.pairs && st.options) {
    const rows = [...$("composerOpts").querySelectorAll(".pair-row")];
    st.options.forEach((o, i) => {
      if (!rows[i]) return;
      const [l, ...r] = String(o).split(" = ");
      rows[i].querySelector("[data-left]").value = l;
      rows[i].querySelector("[data-right]").value = r.join(" = ");
    });
  }
  if (m.clozeUI) {
    $("clozeText").value = st.passage || "";
    $("clozeMode").value = st.wordBank ? "bank" : "type";
  }
  if (m.wordUI && $("wordFrame")) $("wordFrame").value = st.passage || "";
  if (m.linkUI) { $("linkUrl").value = st.url || ""; $("linkLabel").value = st.linkLabel || ""; }
  if (m.workingUI && $("expectedAns")) $("expectedAns").value = st.expected || "";
  if (m.traceUI && $("traceText")) {
    $("traceText").value = st.trace || "";
    const pick = (id, v) => $(id)?.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
    pick("traceCase", st.traceCase || "lower");
    pick("traceGuide", st.traceGuide || "arrows");
  }
  if (m.tableUI && $("rowsSel") && st.tableRows) $("rowsSel").value = String(st.tableRows);
  if (m.sprintUI && $("durSel") && st.sprintSeconds) $("durSel").value = String(st.sprintSeconds);
  if (m.tuneUI) { if ($("sigSel") && st.sig) $("sigSel").value = st.sig; if ($("barsSel") && st.bars) $("barsSel").value = String(st.bars); if ($("staffSel") && st.staff) $("staffSel").value = st.staff; if ($("keysSel")) $("keysSel").value = st.keys === false ? "0" : "1"; if ($("chordsSel")) $("chordsSel").value = st.chords === false ? "0" : "1"; if ($("keySel")) $("keySel").value = String(st.key || 0); }
  if (m.postits && $("modSel")) $("modSel").value = st.moderated ? "1" : "0";
  if (m.multiOpt && $("multiSel")) $("multiSel").value = st.multi === false ? "0" : "1";
}

/* ---------------- teaching a plan ---------------- */

let planSnapshot = null; // { id, json } — the saved copy, to spot unsaved changes
let snapshotLoading = false;
let launcherOpen = null; // null = decide automatically
if (foldOn("launch")) launcherOpen = false; // the teacher hid the activities last time on this computer

async function teachPlan(id) {
  let pl;
  try { pl = await plansApi.get(id); } catch { return toast("Couldn't open that plan — try again"); }
  const midLesson = state && state.sequence?.length && state.seqIndex >= 0;
  if (midLesson && !confirm(
    state.planId === pl.id
      ? `Start “${pl.title || "this lesson"}” again from step 1?`
      : `Switch to “${pl.title || "Untitled lesson"}”?\n\nThe lesson you're teaching now will close. Responses so far are kept.`
  )) return;
  send({ type: "set_sequence", items: pl.steps, plan: { id: pl.id, title: pl.title }, reset: true });
  planSnapshot = { id: pl.id, json: canon(pl.steps) };
  launcherOpen = null;
  showView("teach");
  toast(`“${pl.title || "Untitled lesson"}” is ready — press ▶ Start the lesson when you are`);
}

function renderLauncher() {
  const panel = $("launchPanel");
  const hasPlan = (state?.sequence || []).length > 0;
  const composing = composerTarget.kind === "launch" && !!composerModeKey;
  const open = composing || (launcherOpen === null ? !hasPlan : launcherOpen);
  panel.classList.toggle("collapsed", !open);
  $("launchToggle").textContent = open ? "Hide activities" : "＋ Show activities";
  $("pasteQuizBtn").hidden = !open;
}
$("launchToggle").onclick = () => {
  const hasPlan = (state?.sequence || []).length > 0;
  const openNow = launcherOpen === null ? !hasPlan : launcherOpen;
  launcherOpen = !openNow;
  setFold("launch", !launcherOpen);
  if (!launcherOpen) closeComposer();
  renderLauncher();
};

function renderLessonStrip() {
  const el = $("lessonStrip");
  const seq = state.sequence || [];

  // After a reload we no longer hold the saved copy — fetch it once.
  if (state.planId && state.storage && (!planSnapshot || planSnapshot.id !== state.planId) && !snapshotLoading) {
    snapshotLoading = true;
    plansApi.get(state.planId)
      .then((pl) => { planSnapshot = { id: pl.id, json: canon(pl.steps) }; })
      .catch(() => {})
      .finally(() => { snapshotLoading = false; render(); });
  }

  if (!seq.length) {
    el.innerHTML = `<div class="no-plan-bar">📝 <span><b>No lesson plan open.</b> Ask questions on the spot below, or</span>
      <button class="btn" data-strip="plans">Open a lesson plan</button></div>`;
    el.querySelector("[data-strip]").onclick = () => showView("plans");
    return;
  }

  const idx = state.seqIndex;
  const n = seq.length;
  const saved = state.planId && planSnapshot && planSnapshot.id === state.planId;
  const unsaved = state.planId ? saved && canon(seq) !== planSnapshot.json : true;
  const upcoming = idx + 1 < n ? idx + 1 : null;
  const nextSt = upcoming != null ? seq[upcoming] : null;
  const skipped = new Set(state.skipped || []);
  const nav = `
      <div class="ls-nav">
        <button class="btn" data-strip="first" ${idx < 0 ? "disabled" : ""} title="Start again from step 1">⏮</button>
        <button class="btn" data-strip="back" ${idx < 0 ? "disabled" : ""} title="Show the previous step again">◀ Previous</button>
        <button class="btn" data-strip="skip" ${nextSt ? "" : "disabled"} title="Skip this step without running it">Skip ⏭</button>
        <button class="btn danger-ghost" data-strip="stop" ${state.interaction ? "" : "disabled"} title="Close the question that's on the screen now — the next step stays loaded, ready for ▶">⏹ Stop this step</button>
      </div>`;

  let nextBlock;
  if (nextSt) {
    const label = idx < 0 ? "Ready when you are · step 1" : `Up next · step ${upcoming + 1} of ${n}`;
    nextBlock = `
      <div class="ls-next-info">
        <div class="ls-kicker">${label}</div>
        <div class="ls-next-type">${stepTag(nextSt)}${nextSt.afterSlide ? ` · 🎞 after slide ${nextSt.afterSlide}` : ""}</div>
        <div class="ls-next-q ${nextSt.prompt || MODES[nextSt.mode]?.toolUI ? "" : "aloud"}">${nextSt.prompt ? esc(nextSt.prompt) : MODES[nextSt.mode]?.toolUI ? stepDetail(nextSt) : "Ask this one aloud"}</div>
      </div>
      <button class="btn primary big" data-strip="next">${idx < 0 ? "▶ Start the lesson" : nextSt.mode === "slide" ? `▶ Show slide ${nextSt.page}` : nextSt.mode === "deck" ? "▶ Show live slides" : `▶ Launch step ${upcoming + 1}`}</button>
      ${nav}`;
  } else {
    nextBlock = `
      <div class="ls-next-info">
        <div class="ls-kicker">All ${n} steps done${skipped.size ? ` · ${skipped.size} skipped` : ""}</div>
        <div class="ls-next-q">🎉 That was the last step of this lesson.</div>
      </div>
      <button class="btn" data-strip="again">↺ Start again from step 1</button>
      <button class="btn primary big" data-strip="finish">✅ Finish &amp; summarise</button>
      ${nav}`;
  }

  el.innerHTML = `
    <section class="panel lesson-strip ${foldOn("strip") ? "folded" : ""}">
      <div class="ls-head">
        <div>
          <div class="ls-kicker">${state.planId ? "Teaching from your lesson plan" : "Lesson (not saved as a plan)"}</div>
          <div class="ls-title">📘 ${esc(state.planTitle || (state.planId ? "Untitled lesson" : "Today's lesson"))}</div>
        </div>
        <span class="ls-progress">${idx < 0 ? `${n} steps · not started` : `Step ${idx + 1} of ${n}`}${skipped.size ? ` · ${skipped.size} skipped` : ""}</span>
        ${state.planId && unsaved ? `<span class="ls-unsaved">● changed during class</span>` : ""}
        <span class="spacer"></span>
        ${state.planId
          ? unsaved
            ? `<button class="btn primary" data-strip="save">💾 Save changes to plan</button>`
            : `<button class="btn" data-strip="edit">✎ Edit plan</button>`
          : `<button class="btn primary" data-strip="save-as">💾 Save as a lesson plan</button>`}
        <button class="btn" data-strip="fold" title="${foldOn("strip") ? "Show the steps" : "Fold the steps away"}">${foldOn("strip") ? "▸ Steps" : "▾ Steps"}</button>
        <button class="btn" data-strip="close" title="Close this lesson plan">✕ Close</button>
      </div>
      <div class="ls-steps">${seq
        .map((st, i) => {
          const wasSkipped = skipped.has(i) && i <= idx;
          const cls = wasSkipped ? "skipped" : i < idx ? "done" : i === idx ? "now" : "";
          const badge = wasSkipped ? "⏭" : i < idx ? "✓" : i + 1;
          return `
        <span class="ls-chip ${cls}" title="Step ${i + 1}: ${esc(MODES[keyForStep(st)]?.name || st.mode)}${st.prompt ? " — " + esc(st.prompt) : ""}${st.afterSlide ? ` (after slide ${st.afterSlide})` : ""}${wasSkipped ? " (skipped)" : ""}">
          <button class="ls-run" data-jump="${i}" title="Run step ${i + 1} now">
            <span class="n">${badge}</span><span>${stepIcon(st)}</span>
            <span class="t">${st.mode === "slide" ? `Slide ${st.page}` : st.prompt ? esc(st.prompt) : esc(MODES[keyForStep(st)]?.name || st.mode)}</span>
          </button>
          ${i !== idx + 1 ? `<button class="ls-point" data-point="${i}" title="Make step ${i + 1} the next one (without running it)">▸</button>` : ""}
        </span>`;
        })
        .join("")}</div>
      <p class="ls-help">Tap a step to run it · ▸ makes it next · Skip ⏭ passes over a step without running it</p>
      <div class="ls-next">${nextBlock}</div>
    </section>`;

  el.querySelectorAll("[data-jump]").forEach((b) => (b.onclick = () => send({ type: "jump_to_step", index: +b.dataset.jump })));
  el.querySelectorAll("[data-point]").forEach((b) => (b.onclick = () => send({ type: "seq_point", index: +b.dataset.point })));
  const act = (name, fn) => { const b = el.querySelector(`[data-strip="${name}"]`); if (b) b.onclick = fn; };
  act("fold", () => { setFold("strip", !foldOn("strip")); renderLessonStrip(); });
  act("next", () => send({ type: "next" }));
  act("skip", () => send({ type: "seq_skip" }));
  act("back", () => send({ type: "step_prev" }));
  act("first", () => send({ type: "step_first" }));
  act("finish", () => $("endBtn").click());
  // Closes the live question only — the plan and "up next" stay where they are.
  act("stop", () => send({ type: "eyes_up" }));
  act("again", () => send({ type: "set_sequence", items: seq, reset: true }));
  act("edit", () => openEditor(state.planId));
  act("close", () => {
    if (state.planId && unsaved && !confirm("This lesson was changed during class and the changes aren't saved to the plan.\n\nClose it anyway?")) return;
    planSnapshot = null;
    launcherOpen = null;
    send({ type: "set_sequence", items: [], plan: null, reset: true });
  });
  act("save", async () => {
    try {
      await plansApi.update(state.planId, state.planTitle, seq);
      planSnapshot = { id: state.planId, json: canon(seq) };
      plansLoaded = false;
      toast("Saved to your lesson plan ✓");
      render();
    } catch { toast("Couldn't save — try again"); }
  });
  act("save-as", async () => {
    const title = (prompt("Name this lesson plan so you can teach it again:", state.title || "") || "").trim();
    if (!title) return;
    try {
      const { id } = await plansApi.create(title, seq);
      planSnapshot = { id, json: canon(seq) };
      plansLoaded = false;
      send({ type: "set_sequence", items: seq, plan: { id, title } });
      toast(`Saved as “${title}” — find it under 📝 Lesson plans`);
    } catch { toast("Couldn't save — check you're signed in"); }
  });
}

showView(view);
buildModeGrid();
connect();
