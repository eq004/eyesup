/* Eyes Up — teacher's pocket remote.
   Connects as a second teacher: the dashboard stays live, the projector
   shows the class screen, and the teacher walks the room with this. */

const $ = (id) => document.getElementById(id);
const main = $("main");

let ws = null;
let state = null;
let needPw = false;

const MODE_NAMES = {
  word_cloud: "☁️ Word Cloud", one_word: "🗣️ One Word", mindmap: "🕸️ Mindmap",
  post_its: "🗒️ Post-its", short_answer: "✏️ Short Answer", poll: "📊 Poll",
  agree_disagree: "⚖️ Agree/Disagree", true_false: "✅ True/False",
  this_or_that: "⚡ This or That", confidence: "🎯 Confidence", smiley: "😊 Smiley",
  scale: "🎚️ Scale", example_nonexample: "↔️ Example/Non-ex", multi_choice: "🅰️ Multi Choice",
  ranking: "🔢 Ranking", put_in_order: "🪜 Put in Order", match_up: "🧩 Match Up",
  venn: "◉ Venn", predict: "🔮 Predict", exit_ticket: "🎟️ Exit Ticket",
  muddiest_point: "🌫️ Muddiest", retrieval_sprint: "🧠 Sprint 60s",
  spot_mistake: "🔎 Spot Mistake", teach_back: "🧑‍🏫 Teach Back",
  give_example: "💡 Example", make_connection: "🔗 Connection",
  finish_sentence: "📝 Finish Sentence", quick_challenge: "🚀 Challenge",
  three_two_one: "3️⃣ 3-2-1", notice_wonder: "👀 Notice/Wonder", before_after: "🔄 Before/After",
  ask_question: "❓ Ask a Question", sketch: "🎨 Sketch", annotate: "🖍️ Annotate",
  picture_prompt: "🖼️ Picture Prompt",
};

// Launchable from the remote with zero setup — the question lives in your voice.
const QUICK_LAUNCH = [
  "agree_disagree", "true_false", "confidence",
  "smiley", "scale", "one_word",
  "word_cloud", "mindmap", "post_its",
  "short_answer", "predict", "retrieval_sprint",
  "exit_ticket", "muddiest_point", "ask_question",
  "three_two_one", "notice_wonder", "sketch",
];

const REVEAL_MODES = new Set([
  "short_answer", "predict", "ask_question", "exit_ticket", "muddiest_point",
  "retrieval_sprint", "spot_mistake", "teach_back", "give_example", "make_connection",
  "finish_sentence", "quick_challenge", "picture_prompt", "three_two_one",
  "notice_wonder", "before_after", "sketch", "annotate", "example_nonexample", "post_its",
]);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------- connection ---------------- */

function creds() {
  return {
    code: (sessionStorage.getItem("eyesup_remote_code") || "").toUpperCase(),
    password: sessionStorage.getItem("eyesup_remote_pw") || "",
  };
}

function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onopen = () => {
    $("conn").textContent = "";
    const { code, password } = creds();
    if (code) ws.send(JSON.stringify({ type: "teacher_resume", code, password }));
  };
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "error") {
      needPw = msg.error === "bad_password";
      if (msg.error === "no_session") sessionStorage.removeItem("eyesup_remote_code");
      state = null;
      renderGate(msg.error);
      return;
    }
    if (msg.type === "state") {
      state = msg;
      render();
    }
  };
  ws.onclose = () => {
    $("conn").textContent = "reconnecting…";
    setTimeout(connect, 1200);
  };
}
const send = (obj) => ws && ws.readyState === 1 && ws.send(JSON.stringify(obj));

/* ---------------- render ---------------- */

function render() {
  if (!state) return renderGate();
  $("topInfo").innerHTML = `<b>${esc(state.code)}</b> · ${state.students.length} in`;

  const itx = state.interaction;
  let status;
  if (itx) {
    status = `
      <div class="status">
        <div class="mode">${MODE_NAMES[itx.mode] || itx.mode}</div>
        <div class="q">${itx.prompt ? esc(itx.prompt) : "🎤 asked aloud"}</div>
        <div class="meta">
          <span><b>${itx.responses.length}</b>/${state.students.length} responded</span>
          <span class="${itx.open ? "open-tag" : "closed-tag"}">${itx.open ? "● open" : "■ closed"}</span>
        </div>
      </div>`;
  } else {
    status = `
      <div class="status">
        <div class="q">${state.phase === "eyesup" ? "👀 Eyes up — the room is talking" : "🎤 Nothing live — the room is yours"}</div>
      </div>`;
  }

  const canReveal = itx && REVEAL_MODES.has(itx.mode);
  const seq = state.sequence || [];
  const nextStep = state.seqIndex + 1 < seq.length ? seq[state.seqIndex + 1] : null;

  const t = state.timer;
  const timerControls = t
    ? `${t.paused
        ? `<button class="rbtn" data-act="timer_resume">▶</button>`
        : `<button class="rbtn" data-act="timer_pause">⏸</button>`}
       <button class="rbtn" data-act="timer_clear">✕</button>
       <span class="timer-live" id="timerLive"></span>`
    : `<button class="rbtn" data-timer="30">30s</button>
       <button class="rbtn" data-timer="60">1m</button>
       <button class="rbtn" data-timer="120">2m</button>
       <button class="rbtn" data-timer="300">5m</button>`;

  main.innerHTML = `
    ${status}
    <button class="rbtn eyes" data-act="eyes_up">👀 EYES UP</button>
    ${itx ? `
    <div class="btn-row">
      ${itx.open
        ? `<button class="rbtn" data-act="close_responses">⏸ Close</button>`
        : `<button class="rbtn" data-act="open_responses">▶ Open</button>`}
      ${itx.resultsVisible
        ? `<button class="rbtn" data-act="hide_results">🙈 Hide</button>`
        : `<button class="rbtn" data-act="show_results">📊 Show</button>`}
      ${canReveal ? `<button class="rbtn" data-act="reveal_all">✨ Reveal all</button>` : ""}
      ${itx.mode === "multi_choice" && itx.correct != null && !itx.answerRevealed
        ? `<button class="rbtn" data-act="reveal_answer">🎯 Answer</button>` : ""}
    </div>` : ""}
    ${nextStep
      ? `<button class="rbtn accent" data-act="next">▶ Next: ${esc(MODE_NAMES[nextStep.mode] || nextStep.mode)}${nextStep.prompt ? " — " + esc(nextStep.prompt.slice(0, 32)) + (nextStep.prompt.length > 32 ? "…" : "") : ""}</button>`
      : ""}

    <h3 class="sec">Launch — say it aloud, tap it</h3>
    <div class="launch-grid">${QUICK_LAUNCH
      .map((m) => {
        const [ic, ...rest] = (MODE_NAMES[m] || m).split(" ");
        return `<button class="rbtn" data-launch="${m}"><span class="ic">${ic}</span>${rest.join(" ")}</button>`;
      })
      .join("")}</div>

    <h3 class="sec">Room tools</h3>
    <div class="timer-row">${timerControls}</div>
    <div class="btn-row" style="margin-top:0.55rem">
      <button class="rbtn" data-act="pick_student">🎲 Pick</button>
      <button class="rbtn" data-act="toggle_join">🔳 QR ${state.showJoin ? "off" : ""}</button>
      ${state.focus ? `<button class="rbtn" data-act="clear_focus">✕ Clear screen</button>` : ""}
    </div>
    ${state.focus?.type === "spotlight" ? `<div class="status" style="margin-top:0.6rem"><div class="q">🎲 ${esc(state.focus.name)}</div></div>` : ""}
  `;

  main.querySelectorAll("[data-act]").forEach((b) => (b.onclick = () => send({ type: b.dataset.act })));
  main.querySelectorAll("[data-timer]").forEach(
    (b) => (b.onclick = () => send({ type: "timer_start", seconds: +b.dataset.timer }))
  );
  main.querySelectorAll("[data-launch]").forEach(
    (b) => (b.onclick = () => send({ type: "launch", mode: b.dataset.launch, prompt: "" }))
  );
}

setInterval(() => {
  const el = $("timerLive");
  const t = state?.timer;
  if (!el || !t) return;
  const left = t.paused ? t.remaining : Math.max(0, t.endsAt - Date.now());
  const s = Math.ceil(left / 1000);
  el.textContent = left <= 0 ? "0:00" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}, 300);

/* ---------------- connect gate ---------------- */

function renderGate(err) {
  $("topInfo").textContent = "";
  const preset = (new URLSearchParams(location.search).get("code") || creds().code || "").toUpperCase();
  main.innerHTML = `
    <div class="gate">
      <div style="font-size:2.5rem">📱</div>
      <h2 style="font-family:var(--font-display);margin-top:0.5rem">Teacher remote</h2>
      <p style="color:#9aa0b5;font-size:0.9rem;margin-top:0.3rem">Controls your live session while the projector shows the class screen.</p>
      <input id="codeIn" maxlength="4" placeholder="SESSION CODE" value="${esc(preset)}" autocomplete="off" />
      ${needPw || err === "bad_password" ? `<input id="pwIn" type="password" placeholder="Teacher password" autocomplete="current-password" />` : ""}
      ${err === "bad_password" ? `<p class="err">Password didn't match — try again.</p>` : ""}
      ${err === "no_session" ? `<p class="err">No live session with that code.</p>` : ""}
      <button class="rbtn accent" id="goBtn" style="margin-top:0.8rem">Connect</button>
    </div>`;
  const go = () => {
    const code = $("codeIn").value.trim().toUpperCase();
    if (code.length !== 4) return;
    sessionStorage.setItem("eyesup_remote_code", code);
    if ($("pwIn")) sessionStorage.setItem("eyesup_remote_pw", $("pwIn").value);
    send({ type: "teacher_resume", code, password: sessionStorage.getItem("eyesup_remote_pw") || "" });
  };
  $("goBtn").onclick = go;
  main.querySelectorAll("input").forEach((i) => (i.onkeydown = (e) => { if (e.key === "Enter") go(); }));
}

renderGate();
connect();
