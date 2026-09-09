/* Eyes Up — student remote */

const $ = (id) => document.getElementById(id);
const screenEl = $("screen");

let ws = null;
let state = null;
let joined = false;
let lastInteractionId = null;
let changingAnswer = false;
let rankOrder = null; // local ranking order while arranging
let matchShuffle = null; // shuffled display order for match-up choices
let vennItems = []; // ideas this student has sorted so far
let pmItems = []; // plus/minus points sent so far
let postNotes = []; // sticky notes this student has sent so far
let sprintDeadline = null; // retrieval-sprint countdown target
let sprintTimer = null;
let lastRenderKey = null; // skip re-renders that would wipe half-typed input

const MODE_NAMES = {
  word_cloud: "☁️ Word Cloud", short_answer: "✏️ Short Answer", poll: "📊 Poll",
  agree_disagree: "⚖️ Agree / Disagree", confidence: "🎯 Confidence Check",
  ranking: "🔢 Ranking", predict: "🔮 Predict", this_or_that: "⚡ This or That",
  one_word: "🗣️ One Word", ask_question: "❓ Ask a Question",
  true_false: "✅ True or False", mindmap: "🕸️ Mindmap", exit_ticket: "🎟️ Exit Ticket",
  muddiest_point: "🌫️ Muddiest Point", retrieval_sprint: "🧠 Retrieval Sprint",
  sketch: "🎨 Sketch It", maths_board: "🧮 Maths Board", counters_draw: "🟠 Counters + Drawing", image_drop: "📥 Drop an Image", image_caption: "📸 Image + Writing", spot_mistake: "🔎 Spot the Mistake",
  example_nonexample: "↔️ Example / Non-example", teach_back: "🧑‍🏫 Teach It Back",
  match_up: "🧩 Match Up", put_in_order: "🪜 Put in Order", give_example: "💡 Give an Example",
  make_connection: "🔗 Make a Connection", finish_sentence: "📝 Finish the Sentence",
  notice_wonder: "👀 Notice / Wonder", quick_challenge: "🚀 Quick Challenge",
  three_two_one: "3️⃣ 3 – 2 – 1", before_after: "🔄 Before / After",
  venn: "◉ Venn Diagram", multi_choice: "🅰️ Multiple Choice", post_its: "🗒️ Post-its",
  smiley: "😊 Smiley Review", scale: "🎚️ Scale", annotate: "🖍️ Annotate",
  picture_prompt: "🖼️ Picture Prompt", picture_vote: "🗳️ Picture Vote",
  phonics: "🔤 Phonics Keyboard",
  spelling: "🔡 Spelling Test", cloze: "▭ Cloze Passage", working: "🧮 Working Out",
  counters: "🟠 Counters", table: "📋 Table", plus_minus: "➕➖ Plus & Minus",
  long_response: "📜 Long Response",
};

/* Phonics keyboard layout & colours */
const PHON_ROWS = [
  ["qu", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];
const PHON_EXTRAS = [
  ["-e", "a", "e", "i", "o", "u", "oo"],
  ["ch", "sh", "th", "ph", "ck", "wh", "ng"],
  ["ow", "er", "ar", "ai", "ay", "ee", "ea", "igh", "oa", "oi", "oy"],
];
function phonCat(p) {
  if (p === "-e") return "sil";
  if (["a", "e", "i", "o", "u", "oo"].includes(p)) return "vow";
  if (["ch", "sh", "th", "ph", "ck", "wh", "ng", "qu"].includes(p)) return "dig";
  if (["ow", "er", "ar", "ai", "ay", "ee", "ea", "igh", "oa", "oi", "oy"].includes(p)) return "team";
  return "let";
}
let phonParts = []; // graphemes tapped so far
let workLines = []; // working-out: completed calculation lines
let workCur = ""; // working-out: line being typed
let counterItems = []; // counters: {k, x, y} pieces on the board (percent coords)

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------- connection ---------------- */

// Preview mode: embedded in the teacher dashboard for testing — auto-joins
// as a labelled preview student, no join form.
const PREVIEW = new URLSearchParams(location.search).get("preview") === "1";
const PREVIEW_CODE = (new URLSearchParams(location.search).get("code") || "").toUpperCase();

function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onopen = () => {
    $("conn").textContent = "";
    if (PREVIEW && PREVIEW_CODE) {
      ws.send(JSON.stringify({ type: "student_join", code: PREVIEW_CODE, name: "👁 Preview" }));
      return;
    }
    const code = sessionStorage.getItem("eyesup_code");
    const sid = sessionStorage.getItem("eyesup_sid");
    const name = sessionStorage.getItem("eyesup_name");
    if (code && sid) ws.send(JSON.stringify({ type: "student_join", code, studentId: sid, name }));
  };
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "joined") {
      joined = true;
      sessionStorage.setItem("eyesup_sid", msg.studentId);
      sessionStorage.setItem("eyesup_code", msg.code);
      return;
    }
    if (msg.type === "error") {
      joined = false;
      if (PREVIEW) {
        show(`<div class="big-emoji">👁</div><p class="state-sub">No live session for this code — start one on the dashboard.</p>`);
        return;
      }
      sessionStorage.removeItem("eyesup_code");
      sessionStorage.removeItem("eyesup_sid");
      render();
      return;
    }
    if (msg.type === "state") {
      state = msg;
      joined = true;
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

function render(force) {
  $("topInfo").textContent = state && joined ? `${state.name} · ${state.code}` : "";

  if (!joined || !state) return renderJoin();

  const itx = state.interaction;

  // Only repaint when something the student can see actually changed —
  // a classmate submitting must never wipe this student's half-typed answer.
  const key = [state.phase, itx?.id, itx?.open, state.submitted, changingAnswer].join("|");
  if (!force && key === lastRenderKey) return;
  lastRenderKey = key;

  if (state.phase === "ended") {
    return show(`
      <div class="big-emoji">🙌</div>
      <div class="state-title">That's a wrap</div>
      <p class="state-sub">Thanks for thinking out loud today.</p>`);
  }

  if (!itx) {
    if (state.phase === "eyesup") {
      return show(`
        <div class="big-emoji">👀</div>
        <div class="state-title">Eyes up</div>
        <p class="state-sub">Back to the room. Let's talk about it.</p>`);
    }
    return show(`
      <div class="big-emoji">🪑</div>
      <div class="state-title">You're in, ${esc(state.name)}</div>
      <p class="state-sub">Eyes up — your teacher will send something to this screen when it's time.</p>`);
  }

  // interaction changed → reset local bits
  if (itx.id !== lastInteractionId) {
    lastInteractionId = itx.id;
    changingAnswer = false;
    rankOrder = null;
    matchShuffle = null;
    vennItems = [];
    pmItems = [];
    postNotes = [];
    phonParts = [];
    workLines = [];
    workCur = "";
    counterItems = [];
    sprintDeadline = null;
    if (sprintTimer) { clearInterval(sprintTimer); sprintTimer = null; }
  }

  if (!itx.open) {
    return show(`
      <div class="big-emoji">👀</div>
      <div class="state-title">Eyes up</div>
      <p class="state-sub">Responses are closed. Back to the room.</p>`);
  }

  // Venn, Post-its and Plus/Minus keep their input screen — students add more one by one.
  if (state.submitted && !changingAnswer && !["venn", "post_its", "plus_minus"].includes(itx.mode)) {
    return show(`
      <div class="big-emoji">✓</div>
      <div class="state-title">Response received</div>
      <p class="state-sub">Eyes up while the rest of the class finishes.</p>
      <button class="change-link" id="changeBtn">Change my answer</button>`, () => {
      $("changeBtn").onclick = () => { changingAnswer = true; render(); };
    });
  }

  renderInteraction(itx);
}

function show(html, after) {
  screenEl.classList.remove("wide"); // drawing modes opt back in
  screenEl.innerHTML = html;
  if (after) after();
}

function header(itx) {
  const tag = itx.mode === "counters" && itx.counterKind === "base10" ? "🔟 Tens & Ones" : MODE_NAMES[itx.mode] || itx.mode;
  return `
    <span class="mode-tag">${tag}</span>
    <h1 class="q">${itx.prompt ? esc(itx.prompt) : "Listen to your teacher's question 🎤"}</h1>`;
}

function submit(payload) {
  send({ type: "respond", interactionId: lastInteractionId, payload });
  changingAnswer = false;
}

function renderInteraction(itx) {
  const h = header(itx);

  /* --- words (incl. mindmap phrases) --- */
  if (["word_cloud", "one_word", "mindmap"].includes(itx.mode)) {
    const single = itx.mode === "one_word" || itx.multi === false;
    const ph = itx.mode === "one_word"
      ? "One word only"
      : single
      ? (itx.mode === "mindmap" ? "One idea only" : "One word only")
      : itx.mode === "mindmap"
      ? "Ideas connected to it — separate with commas"
      : "A word — or a few, separated by commas";
    show(`${h}
      <input type="text" id="wordInput" autocomplete="off" placeholder="${ph}" maxlength="${single && itx.mode !== "mindmap" ? 30 : 160}" />
      <button class="btn send" id="sendBtn">Send</button>
      ${single ? `<p class="hint">Just one — make it count.</p>` : ""}`, () => {
      const input = $("wordInput");
      input.focus();
      const go = () => {
        let words = input.value.split(/[,\n]+/).map((w) => w.trim()).filter(Boolean);
        if (single) {
          words = words.slice(0, 1);
          if (itx.mode !== "mindmap") words = words.map((w) => w.split(/\s+/)[0]);
        }
        if (!words.length) return;
        submit({ words });
      };
      $("sendBtn").onclick = go;
      input.onkeydown = (e) => { if (e.key === "Enter") go(); };
    });
    return;
  }

  /* --- retrieval sprint: timed free recall --- */
  if (itx.mode === "retrieval_sprint") {
    if (sprintDeadline == null) sprintDeadline = Date.now() + (itx.secondsLeft ?? 60) * 1000;
    show(`${h}
      <div class="timer"><div class="timer-fill" id="timerFill"></div></div>
      <div class="timer-num" id="timerNum"></div>
      <textarea id="textInput" rows="6" maxlength="1500" placeholder="Go — everything you can recall. Short phrases are fine."></textarea>
      <button class="btn send" id="sendBtn">Send</button>`, () => {
      const input = $("textInput");
      input.focus();
      const totalMs = (itx.timeLimit ?? 60) * 1000;
      const tick = () => {
        const fill = $("timerFill");
        if (!fill) { clearInterval(sprintTimer); sprintTimer = null; return; }
        const left = Math.max(0, sprintDeadline - Date.now());
        fill.style.width = (left / totalMs) * 100 + "%";
        $("timerNum").textContent = Math.ceil(left / 1000) + "s";
        if (left <= 0) {
          clearInterval(sprintTimer);
          sprintTimer = null;
          const text = input.value.trim();
          if (text) submit({ text }); // whatever's down when time's up counts
        }
      };
      if (sprintTimer) clearInterval(sprintTimer);
      sprintTimer = setInterval(tick, 250);
      tick();
      $("sendBtn").onclick = () => {
        const text = input.value.trim();
        if (text) { clearInterval(sprintTimer); sprintTimer = null; submit({ text }); }
      };
    });
    return;
  }

  /* --- written --- */
  const WRITTEN_PH = {
    short_answer: "Type your answer…",
    predict: "What do you predict?",
    ask_question: "What are you still unsure about? (anonymous)",
    exit_ticket: "One thing you learned today…",
    muddiest_point: "The thing that's least clear to you… (anonymous)",
    spot_mistake: "What's the mistake — and why is it wrong?",
    teach_back: "Explain it like you're the teacher…",
    give_example: "Your own example…",
    make_connection: "This connects to…",
    finish_sentence: "Finish the sentence…",
    quick_challenge: "Your answer…",
    picture_prompt: "Look closely. What do you see / think / wonder?",
    long_response: "Take your time — full sentences, full thoughts…",
  };
  if (WRITTEN_PH[itx.mode]) {
    const anon = ["ask_question", "muddiest_point"].includes(itx.mode);
    const long = itx.mode === "long_response";
    show(`${h}
      ${itx.imageUrl ? `<img class="prompt-img" src="${itx.imageUrl}" alt="look at this image" />` : ""}
      <textarea id="textInput" rows="${long ? 10 : 4}" maxlength="${long ? 3000 : 500}" placeholder="${WRITTEN_PH[itx.mode]}"></textarea>
      <button class="btn send" id="sendBtn">Send</button>
      ${anon ? `<p class="hint">🕶 Your name is never shown with this.</p>` : ""}`, () => {
      const input = $("textInput");
      input.focus();
      const go = () => {
        const text = input.value.trim();
        if (text) submit({ text });
      };
      $("sendBtn").onclick = go;
      input.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); } };
    });
    return;
  }

  /* --- structured (3-2-1, notice/wonder, before/after) --- */
  if (itx.fields) {
    show(`${h}${itx.fields
      .map(
        (f, i) => `<label class="fld"><span>${esc(f)}</span><textarea data-part="${i}" rows="2" maxlength="400"></textarea></label>`
      )
      .join("")}
      <button class="btn send" id="sendBtn">Send</button>`, () => {
      screenEl.querySelector("[data-part]")?.focus();
      $("sendBtn").onclick = () => {
        const parts = [...screenEl.querySelectorAll("[data-part]")].map((t) => t.value.trim());
        if (parts.some(Boolean)) submit({ parts });
      };
    });
    return;
  }

  /* --- example / non-example: pick one, say why --- */
  if (itx.mode === "example_nonexample") {
    show(`${h}
      ${itx.options.map((o, i) => `<button class="btn choice sel-btn" data-i="${i}">${esc(o)}</button>`).join("")}
      <textarea id="whyInput" rows="2" maxlength="300" placeholder="Why? (optional but better)"></textarea>
      <button class="btn send" id="sendBtn">Send</button>`, () => {
      let sel = null;
      const btns = [...screenEl.querySelectorAll(".sel-btn")];
      btns.forEach((b) => (b.onclick = () => {
        sel = +b.dataset.i;
        btns.forEach((x) => x.classList.toggle("selected", x === b));
      }));
      $("sendBtn").onclick = () => {
        if (sel == null) return;
        submit({ choice: sel, text: $("whyInput").value.trim() });
      };
    });
    return;
  }

  /* --- scale: slide a marker along the line --- */
  if (itx.mode === "scale") {
    show(`${h}
      <div class="scale-labels"><span>${esc(itx.options[0])}</span><span>${esc(itx.options[1])}</span></div>
      <input type="range" id="scaleInput" min="0" max="100" value="50" />
      <div class="scale-value" id="scaleValue">Drag the marker, then send</div>
      <button class="btn send" id="sendBtn">Place my marker</button>`, () => {
      const input = $("scaleInput");
      let moved = false;
      input.oninput = () => {
        moved = true;
        const v = +input.value;
        const lean = v < 40 ? itx.options[0] : v > 60 ? itx.options[1] : "right in the middle";
        $("scaleValue").textContent = `${v} — leaning ${lean}`;
      };
      $("sendBtn").onclick = () => {
        if (!moved) $("scaleValue").textContent = "Slide the marker first — where do YOU sit?";
        else submit({ value: +input.value });
      };
    });
    return;
  }

  /* --- smiley review: one tap on a face --- */
  if (itx.mode === "smiley") {
    show(`${h}
      <div class="smiley-row">${itx.options
        .map((o, i) => `<button class="smiley-btn" data-i="${i}" aria-label="rating ${i + 1} of 5">${o}</button>`)
        .join("")}</div>
      <p class="hint">Tap a face — it sends straight away.</p>`, () => {
      screenEl.querySelectorAll("[data-i]").forEach(
        (b) => (b.onclick = () => submit({ choice: +b.dataset.i }))
      );
    });
    return;
  }

  /* --- choices --- */
  if (["poll", "agree_disagree", "confidence", "this_or_that", "true_false", "multi_choice", "picture_vote"].includes(itx.mode)) {
    const emojis = {
      agree_disagree: ["👍", "🤔", "👎"],
      confidence: ["💪", "🌤", "🌫"],
      true_false: ["✅", "❌"],
    }[itx.mode];
    const huge = ["this_or_that", "true_false"].includes(itx.mode) ? "huge" : "";
    const letter = (i) =>
      itx.mode === "multi_choice" ? `<b style="color:var(--accent-ink);margin-right:0.45rem">${String.fromCharCode(65 + i)}</b>` : "";
    show(`${h}${itx.imageUrl ? `<img class="prompt-img" src="${itx.imageUrl}" alt="vote on this image" />` : ""}${itx.options
      .map(
        (o, i) => `<button class="btn choice ${huge}" data-i="${i}">
          ${letter(i)}${emojis ? emojis[i] + " " : ""}${esc(o)}
        </button>`
      )
      .join("")}
      <p class="hint">Tap to answer — it sends straight away.</p>`, () => {
      screenEl.querySelectorAll("[data-i]").forEach(
        (b) => (b.onclick = () => submit({ choice: +b.dataset.i }))
      );
    });
    return;
  }

  /* --- ranking & put-in-order --- */
  if (["ranking", "put_in_order"].includes(itx.mode)) {
    const seq = itx.mode === "put_in_order";
    if (!rankOrder) {
      rankOrder = itx.options.map((_, i) => i);
      if (seq) rankOrder.sort(() => Math.random() - 0.5); // never show the correct order
    }
    show(`${h}
      <div class="rank-list">${rankOrder
        .map(
          (optIdx, pos) => `
        <div class="rank-item">
          <span class="pos">${pos + 1}</span>
          <span class="label">${esc(itx.options[optIdx])}</span>
          <button data-up="${pos}" ${pos === 0 ? "disabled" : ""}>↑</button>
          <button data-down="${pos}" ${pos === rankOrder.length - 1 ? "disabled" : ""}>↓</button>
        </div>`
        )
        .join("")}</div>
      <button class="btn send" id="sendBtn">Send my order</button>
      <p class="hint">${seq ? "Arrange into the correct sequence." : "1 = most important / first. Use the arrows."}</p>`, () => {
      screenEl.querySelectorAll("[data-up]").forEach((b) => (b.onclick = () => {
        const p = +b.dataset.up;
        [rankOrder[p - 1], rankOrder[p]] = [rankOrder[p], rankOrder[p - 1]];
        render(true);
      }));
      screenEl.querySelectorAll("[data-down]").forEach((b) => (b.onclick = () => {
        const p = +b.dataset.down;
        [rankOrder[p + 1], rankOrder[p]] = [rankOrder[p], rankOrder[p + 1]];
        render(true);
      }));
      $("sendBtn").onclick = () => submit({ order: rankOrder });
    });
    return;
  }

  /* --- post-its: write a note, stick it, write another --- */
  if (itx.mode === "post_its") {
    const cap = itx.multi === false ? 1 : 4;
    const full = postNotes.length >= cap;
    show(`${h}
      <textarea id="noteInput" rows="3" maxlength="140" placeholder="Write your note…" ${full ? "disabled" : ""}></textarea>
      <button class="btn send" id="stickBtn" ${full ? "disabled" : ""}>🗒️ Stick it on the board</button>
      ${postNotes.length
        ? `<div class="venn-sent">${postNotes.map((n) => `<span class="sent-chip">🗒 ${esc(n)}</span>`).join("")}</div>`
        : ""}
      <p class="hint">${full ? (cap === 1 ? "Sent ✓ — eyes up! 👀" : "That's the lot. Eyes up! 👀") : postNotes.length ? `${postNotes.length} sent ✓ — add another if you've got one.` : cap === 1 ? "One note each — make it your best thought." : "Short and punchy. You can add up to 4."}</p>`, () => {
      const input = $("noteInput");
      if (!full) input.focus();
      const stick = () => {
        const text = input.value.trim();
        if (!text || postNotes.length >= cap) return;
        postNotes.push(text);
        submit({ notes: postNotes });
        render(true);
      };
      $("stickBtn").onclick = stick;
      input.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); stick(); } };
    });
    return;
  }

  /* --- plus & minus: type a point, tap its side --- */
  if (itx.mode === "plus_minus") {
    const cap = itx.multi === false ? 1 : 6;
    const full = pmItems.length >= cap;
    show(`${h}
      <input type="text" id="pmInput" autocomplete="off" maxlength="140" placeholder="Type a point…" ${full ? "disabled" : ""} />
      <div class="venn-btns" style="grid-template-columns:1fr 1fr">
        <button class="btn choice" data-s="0" style="border-color:#bfe3c9" ${full ? "disabled" : ""}>➕ Positive</button>
        <button class="btn choice" data-s="1" style="border-color:#f2c4c4" ${full ? "disabled" : ""}>➖ Negative</button>
      </div>
      ${pmItems.length
        ? `<div class="venn-sent">${pmItems.map((it) => `<span class="sent-chip">${it.side === 0 ? "➕" : "➖"} ${esc(it.text)}</span>`).join("")}</div>`
        : ""}
      <p class="hint">${full ? "Sent ✓ — eyes up! 👀" : pmItems.length ? `${pmItems.length} sent ✓ — add another, or eyes up.` : cap === 1 ? "One point each — pick your strongest." : "Type a point, then tap which side it belongs on."}</p>`, () => {
      const input = $("pmInput");
      if (!full) input.focus();
      screenEl.querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => {
        const text = input.value.trim();
        if (!text || pmItems.length >= cap) return;
        pmItems.push({ text, side: +b.dataset.s });
        submit({ items: pmItems });
        render(true);
      }));
    });
    return;
  }

  /* --- venn: type an idea, tap where it belongs, repeat --- */
  if (itx.mode === "venn") {
    const [A, B] = itx.options;
    const regionNames = [`${A} only`, "Both", `${B} only`];
    show(`${h}
      <input type="text" id="vennInput" autocomplete="off" maxlength="40" placeholder="Type an idea…" />
      <div class="venn-btns">
        <button class="btn choice" data-r="0">⬅ ${esc(A)}<span class="sub">only</span></button>
        <button class="btn choice" data-r="1">◉ Both</button>
        <button class="btn choice" data-r="2">${esc(B)} ➡<span class="sub">only</span></button>
      </div>
      ${vennItems.length
        ? `<div class="venn-sent">${vennItems
            .map((it) => `<span class="sent-chip">${esc(it.text)} → ${esc(regionNames[it.region])}</span>`)
            .join("")}</div>`
        : ""}
      <p class="hint">${vennItems.length >= (itx.multi === false ? 1 : 6) ? "Sent ✓ — eyes up! 👀" : vennItems.length ? `${vennItems.length} sent ✓ — add another, or eyes up.` : itx.multi === false ? "One idea each — type it, then tap where it belongs." : "Type an idea, then tap where it belongs. Add a few!"}</p>`, () => {
      const input = $("vennInput");
      input.focus();
      screenEl.querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => {
        const text = input.value.trim();
        if (!text || vennItems.length >= (itx.multi === false ? 1 : 6)) return;
        vennItems.push({ text, region: +b.dataset.r });
        submit({ items: vennItems });
        render(true);
      }));
    });
    return;
  }

  /* --- match up --- */
  if (itx.mode === "match_up") {
    if (!matchShuffle) matchShuffle = itx.pairs.map((_, i) => i).sort(() => Math.random() - 0.5);
    show(`${h}
      <div class="match-list">${itx.pairs
        .map(
          (p, i) => `
        <div class="match-row">
          <span class="term">${esc(p.left)}</span>
          <select data-m="${i}">
            <option value="">choose…</option>
            ${matchShuffle.map((j) => `<option value="${j}">${esc(itx.pairs[j].right)}</option>`).join("")}
          </select>
        </div>`
        )
        .join("")}</div>
      <button class="btn send" id="sendBtn">Send my matches</button>
      <p class="hint">Match every term before sending.</p>`, () => {
      $("sendBtn").onclick = () => {
        const matches = [...screenEl.querySelectorAll("select[data-m]")].map((s) => parseInt(s.value, 10));
        if (matches.some((m) => Number.isNaN(m))) return;
        submit({ matches });
      };
    });
    return;
  }

  /* --- spelling test: numbered boxes, autocorrect off --- */
  if (itx.mode === "spelling") {
    const n = itx.wordCount || 0;
    show(`${h}
      <div class="spell-list">${Array.from({ length: n }, (_, i) => `
        <label class="spell-row"><span class="spell-num">${i + 1}</span>
          <input type="text" data-sp="${i}" maxlength="40" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
        </label>`).join("")}</div>
      <button class="btn send" id="sendBtn">Send my spellings</button>
      <p class="hint">Listen for each word, type it next to its number.</p>`, () => {
      screenEl.querySelector("[data-sp]")?.focus();
      $("sendBtn").onclick = () => {
        const answers = [...screenEl.querySelectorAll("[data-sp]")].map((i) => i.value.trim());
        if (answers.some(Boolean)) submit({ answers });
      };
    });
    return;
  }

  /* --- cloze passage: fill the gaps inline --- */
  if (itx.mode === "cloze" && itx.clozeParts) {
    const parts = itx.clozeParts;
    const bank = itx.clozeBank;
    const gap = (i) =>
      bank
        ? `<select class="cloze-gap" data-cz="${i}"><option value="">___</option>${bank.map((w) => `<option value="${esc(w)}">${esc(w)}</option>`).join("")}</select>`
        : `<input class="cloze-gap" data-cz="${i}" maxlength="40" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="____" />`;
    show(`${h}
      <div class="cloze-text">${parts
        .map((p, i) => `${esc(p)}${i < parts.length - 1 ? gap(i) : ""}`)
        .join("")}</div>
      <button class="btn send" id="sendBtn">Send</button>`, () => {
      screenEl.querySelector("[data-cz]")?.focus();
      $("sendBtn").onclick = () => {
        const fills = [...screenEl.querySelectorAll("[data-cz]")].map((i) => i.value.trim());
        if (fills.some(Boolean)) submit({ fills });
      };
    });
    return;
  }

  /* --- table: write into the cells --- */
  if (itx.mode === "table") {
    const cols = itx.options || [];
    const rows = itx.tableRows || 1;
    show(`${h}
      <div class="tbl-wrap"><table class="stu-table">
        <thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${Array.from({ length: rows }, (_, ri) =>
          `<tr>${cols.map((_, ci) => `<td><textarea data-cell="${ri}-${ci}" rows="3" maxlength="400"></textarea></td>`).join("")}</tr>`
        ).join("")}</tbody>
      </table></div>
      <button class="btn send" id="sendBtn">Send my table</button>`, () => {
      screenEl.querySelector("textarea")?.focus();
      $("sendBtn").onclick = () => {
        const out = Array.from({ length: rows }, (_, ri) =>
          cols.map((_, ci) => screenEl.querySelector(`[data-cell="${ri}-${ci}"]`).value.trim())
        );
        if (out.some((row) => row.some(Boolean))) submit({ rows: out });
      };
    });
    return;
  }

  /* --- counters: drag manipulatives to build the maths --- */
  if (itx.mode === "counters") {
    const base10 = itx.counterKind === "base10";
    const COLORS = ["#e05252", "#4a7de0", "#e8c33c", "#3f9e5f"];
    const tray = base10
      ? `<button class="ctr-src mab-ten" data-k="0" title="a ten"></button>
         <button class="ctr-src mab-one" data-k="1" title="a one"></button>
         <span class="ctr-tray-lbl">← tap or drag<br/>tens &amp; ones</span>`
      : COLORS.map((c, i) => `<button class="ctr-src" data-k="${i}" style="background:${c};width:34px;height:34px;border-radius:50%"></button>`).join("") +
        `<span class="ctr-tray-lbl">← tap or drag counters</span>`;
    show(`${h}
      <div class="ctr-tray">${tray}</div>
      <div class="ctr-board" id="ctrBoard"></div>
      <p class="hint" id="ctrCount" style="margin-top:0.4rem"></p>
      <div class="work-ans-row">
        <span>My answer:</span>
        <input id="ctrAns" maxlength="30" autocomplete="off" inputmode="numeric" />
      </div>
      <button class="btn send" id="sendBtn">Send</button>
      <p class="hint">Drag a piece off the board to remove it.</p>`, () => {
      const board = $("ctrBoard");
      let ansTouched = false;
      const valueOf = () =>
        base10
          ? counterItems.filter((i) => i.k === 0).length * 10 + counterItems.filter((i) => i.k === 1).length
          : counterItems.length;
      const describe = () => {
        if (base10) {
          const t = counterItems.filter((i) => i.k === 0).length;
          const o = counterItems.filter((i) => i.k === 1).length;
          return `${t} ten${t === 1 ? "" : "s"} + ${o} one${o === 1 ? "" : "s"} = ${valueOf()}`;
        }
        return `${counterItems.length} counter${counterItems.length === 1 ? "" : "s"} on the board`;
      };
      const paint = () => {
        board.innerHTML = counterItems
          .map((it, i) =>
            base10
              ? it.k === 0
                ? `<div class="ctr-piece mab-ten" data-i="${i}" style="left:${it.x}%;top:${it.y}%;width:5%;height:32%"></div>`
                : `<div class="ctr-piece mab-one" data-i="${i}" style="left:${it.x}%;top:${it.y}%;width:5%;height:8%"></div>`
              : `<div class="ctr-piece" data-i="${i}" style="left:${it.x}%;top:${it.y}%;width:7%;height:11.3%;background:${COLORS[it.k]};border-radius:50%"></div>`
          )
          .join("");
        $("ctrCount").textContent = describe();
        if (!ansTouched) $("ctrAns").value = counterItems.length ? String(valueOf()) : "";
        board.querySelectorAll(".ctr-piece").forEach((el) => (el.onpointerdown = (e) => startDrag(e, +el.dataset.i)));
      };
      const pctPos = (e) => {
        const r = board.getBoundingClientRect();
        return {
          x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
          y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
          inside: e.clientX >= r.left - 10 && e.clientX <= r.right + 10 && e.clientY >= r.top - 30 && e.clientY <= r.bottom + 30,
        };
      };
      const startDrag = (e, idx) => {
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY;
        let moved = false;
        const move = (ev) => {
          if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 8) moved = true;
          const p = pctPos(ev);
          counterItems[idx].x = p.x;
          counterItems[idx].y = p.y;
          paint();
        };
        const up = (ev) => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          // A real drag ending off the board removes the piece; a simple tap keeps it.
          if (moved && !pctPos(ev).inside) {
            counterItems.splice(idx, 1);
            paint();
          }
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      };
      screenEl.querySelectorAll(".ctr-src").forEach((src) => {
        src.onpointerdown = (e) => {
          e.preventDefault();
          if (counterItems.length >= 400) return;
          // Tap drops it in a tidy spot; dragging carries it to wherever you release.
          counterItems.push({
            k: +src.dataset.k,
            x: 12 + (counterItems.length % 8) * 10,
            y: 20 + (Math.floor(counterItems.length / 8) % 4) * 22,
          });
          paint();
          startDrag(e, counterItems.length - 1);
        };
      });
      $("ctrAns").oninput = () => (ansTouched = true);
      $("sendBtn").onclick = () => {
        const answer = $("ctrAns").value.trim();
        if (counterItems.length || answer) submit({ items: counterItems, answer });
      };
      paint();
    });
    return;
  }

  /* --- maths board: counters + tens & ones + free drawing (+ number pad) --- */
  if (itx.mode === "maths_board" || itx.mode === "counters_draw") {
    const COLORS = ["#e05252", "#4a7de0", "#e8c33c", "#3f9e5f"];
    const withPad = itx.mode === "maths_board";
    show(`${h}
      <div class="mb-tools">
        <button id="mbMove" class="on">✋ Move counters</button>
        <button id="mbDraw">✏️ Draw</button>
        <button id="mbErase">🧽 Clear drawing</button>
      </div>
      <div class="ctr-tray">
        ${COLORS.map((c, i) => `<button class="ctr-src" data-k="${i}" style="background:${c};width:34px;height:34px;border-radius:50%"></button>`).join("")}
        <button class="ctr-src mab-ten" data-k="4" title="a ten"></button>
        <button class="ctr-src mab-one" data-k="5" title="a one"></button>
        <span class="ctr-tray-lbl">← tap or drag pieces<br/>onto the board</span>
      </div>
      <div class="ctr-board mb-board" id="ctrBoard"><canvas class="mb-canvas" id="mbCanvas"></canvas></div>
      ${withPad ? `<div class="mb-keys">
        ${["7","8","9","4","5","6","1","2","3","0",".","−"].map((k) => `<button class="wk" data-k="${k}">${k}</button>`).join("")}
        <button class="wk op" id="mbBack" style="grid-column:span 3">⌫</button>
        <button class="wk op" id="mbClearAns" style="grid-column:span 3">Clear answer</button>
      </div>
      <div class="work-ans-row">
        <span>My answer:</span>
        <input id="mbAns" maxlength="30" autocomplete="off" inputmode="decimal" />
      </div>` : ""}
      <button class="btn send" id="sendBtn">Send my board</button>
      <p class="hint">Drag a piece off the board to remove it. Switch to ✏️ Draw to write working out.</p>`, () => {
      screenEl.classList.add("wide"); // whole screen, like the drawing pad
      const board = $("ctrBoard"), canvas = $("mbCanvas"), ctx = canvas.getContext("2d");
      const pieces = document.createElement("div");
      pieces.style.cssText = "position:absolute;inset:0;z-index:2;pointer-events:none";
      board.appendChild(pieces);
      // Board fills the screen height, like the drawing pad.
      const top = board.getBoundingClientRect().top;
      const availH = Math.max(240, window.innerHeight - top - (withPad ? 230 : 110));
      const bw = board.clientWidth;
      const bh = Math.min(Math.max(availH, bw * 0.45), bw * 0.9);
      board.style.height = `${Math.floor(bh)}px`;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.min(1800, Math.round(bw * dpr));
      canvas.height = Math.round(canvas.width * (bh / bw));
      ctx.strokeStyle = "#191c26";
      ctx.lineWidth = Math.max(3, Math.round(canvas.width / 180));
      ctx.lineCap = "round"; ctx.lineJoin = "round";

      /* pieces (k 0-3 colours, 4 ten, 5 one), positions in % of the board */
      const items = [];
      const paint = () => {
        pieces.innerHTML = items
          .map((it, i) => it.k === 4
            ? `<div class="ctr-piece mab-ten" data-i="${i}" style="left:${it.x}%;top:${it.y}%;width:4%;height:${(bw * 0.04 * 4) / bh * 100}%;pointer-events:auto"></div>`
            : it.k === 5
              ? `<div class="ctr-piece mab-one" data-i="${i}" style="left:${it.x}%;top:${it.y}%;width:4%;height:${(bw * 0.04) / bh * 100}%;pointer-events:auto"></div>`
              : `<div class="ctr-piece" data-i="${i}" style="left:${it.x}%;top:${it.y}%;width:6%;height:${(bw * 0.06) / bh * 100}%;background:${COLORS[it.k]};border-radius:50%;pointer-events:auto"></div>`)
          .join("");
        pieces.querySelectorAll(".ctr-piece").forEach((el) => (el.onpointerdown = (e) => startDrag(e, +el.dataset.i)));
      };
      const pctPos = (e) => {
        const r = board.getBoundingClientRect();
        return {
          x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
          y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
          inside: e.clientX >= r.left - 10 && e.clientX <= r.right + 10 && e.clientY >= r.top - 30 && e.clientY <= r.bottom + 30,
        };
      };
      const startDrag = (e, idx) => {
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY;
        let moved = false;
        const move = (ev) => {
          if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 8) moved = true;
          const p = pctPos(ev); items[idx].x = p.x; items[idx].y = p.y; paint();
        };
        const up = (ev) => {
          window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
          if (moved && !pctPos(ev).inside) { items.splice(idx, 1); paint(); }
        };
        window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
      };
      screenEl.querySelectorAll(".ctr-src").forEach((src) => {
        src.onpointerdown = (e) => {
          e.preventDefault();
          if (items.length >= 400) return;
          setTool("move");
          items.push({ k: +src.dataset.k, x: 10 + (items.length % 10) * 8, y: 12 + (Math.floor(items.length / 10) % 5) * 16 });
          paint();
          startDrag(e, items.length - 1);
        };
      });

      /* drawing layer */
      const pos = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) * canvas.width) / r.width, ((e.clientY - r.top) * canvas.height) / r.height]; };
      let drawing = false;
      canvas.addEventListener("pointerdown", (e) => { drawing = true; try { canvas.setPointerCapture(e.pointerId); } catch {} const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke(); e.preventDefault(); });
      canvas.addEventListener("pointermove", (e) => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); e.preventDefault(); });
      canvas.addEventListener("pointerup", () => (drawing = false));
      const setTool = (t) => { board.classList.toggle("drawing", t === "draw"); $("mbDraw").classList.toggle("on", t === "draw"); $("mbMove").classList.toggle("on", t !== "draw"); };
      $("mbMove").onclick = () => setTool("move");
      $("mbDraw").onclick = () => setTool("draw");
      $("mbErase").onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* number pad (Maths Board only) */
      const ans = $("mbAns");
      if (withPad) {
        screenEl.querySelectorAll(".mb-keys .wk[data-k]").forEach((b) => (b.onclick = () => { if (ans.value.length < 30) ans.value += b.dataset.k; }));
        $("mbBack").onclick = () => (ans.value = ans.value.slice(0, -1));
        $("mbClearAns").onclick = () => (ans.value = "");
      }

      /* send: flatten pieces + drawing into one picture */
      $("sendBtn").onclick = () => {
        const answer = withPad ? ans.value.trim() : "";
        if (!items.length && !answer && !drawing && isBlank()) return;
        const out = document.createElement("canvas");
        out.width = canvas.width; out.height = canvas.height;
        const o = out.getContext("2d");
        o.fillStyle = "#fbfaf5"; o.fillRect(0, 0, out.width, out.height);
        const W = out.width, H = out.height, px = (p) => (p / 100) * W, py = (p) => (p / 100) * H;
        for (const it of items) {
          if (it.k === 4) { // a ten: striped rod
            const w = W * 0.04, hh = w * 4, x = px(it.x), y = py(it.y);
            o.fillStyle = "#7f8ff0"; o.fillRect(x, y, w, hh);
            o.strokeStyle = "#4a3fb5"; o.lineWidth = Math.max(2, W / 500);
            for (let s = 1; s < 10; s++) { o.beginPath(); o.moveTo(x, y + (hh * s) / 10); o.lineTo(x + w, y + (hh * s) / 10); o.stroke(); }
            o.strokeRect(x, y, w, hh);
          } else if (it.k === 5) {
            const w = W * 0.04, x = px(it.x), y = py(it.y);
            o.fillStyle = "#7f8ff0"; o.fillRect(x, y, w, w); o.strokeStyle = "#4a3fb5"; o.lineWidth = Math.max(2, W / 500); o.strokeRect(x, y, w, w);
          } else {
            const d = W * 0.06, x = px(it.x), y = py(it.y);
            o.beginPath(); o.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); o.fillStyle = COLORS[it.k]; o.fill();
            o.strokeStyle = "rgba(0,0,0,0.25)"; o.lineWidth = Math.max(2, W / 500); o.stroke();
          }
        }
        o.drawImage(canvas, 0, 0);
        submit({ image: out.toDataURL("image/jpeg", 0.85), answer });
      };
      const isBlank = () => { const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data; for (let i = 3; i < d.length; i += 4 * 97) if (d[i]) return false; return true; };
      paint();
    });
    return;
  }

  /* --- working out: a calculator that remembers every step --- */
  if (itx.mode === "working") {
    show(`${h}
      <div class="work-pad">
        <div class="work-lines" id="workLines"></div>
        <div class="work-cur" id="workCur">&nbsp;</div>
      </div>
      <div class="work-keys">
        ${["7","8","9","÷","4","5","6","×","1","2","3","−","0",".","(",")"].map((k) => `<button class="wk" data-k="${k}">${k}</button>`).join("")}
        <button class="wk op" data-k="+">+</button>
        <button class="wk op" id="wkBack">⌫</button>
        <button class="wk op" id="wkClear">C</button>
        <button class="wk eq" id="wkEq">=</button>
      </div>
      <div class="work-ans-row">
        <span>My answer:</span>
        <input id="workAns" maxlength="30" autocomplete="off" inputmode="decimal" />
      </div>
      <button class="btn send" id="sendBtn">Send answer + working</button>
      <p class="hint">Every “=” you press is saved as a line of working.</p>`, () => {
      const linesEl = $("workLines"), curEl = $("workCur");
      const paint = () => {
        linesEl.innerHTML = workLines.map((l) => `<div>${esc(l)}</div>`).join("");
        curEl.textContent = workCur || " ";
        linesEl.scrollTop = linesEl.scrollHeight;
      };
      paint();
      const evalLine = (s) => {
        const js = s.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
        if (!/^[\d+\-*/().\s]+$/.test(js) || !/\d/.test(js)) return null;
        try {
          const v = Function(`"use strict";return (${js})`)();
          if (!Number.isFinite(v)) return null;
          return Math.round(v * 1e9) / 1e9;
        } catch { return null; }
      };
      screenEl.querySelectorAll(".wk[data-k]").forEach((b) => (b.onclick = () => {
        if (workCur.length < 40) { workCur += b.dataset.k; paint(); }
      }));
      $("wkBack").onclick = () => { workCur = workCur.slice(0, -1); paint(); };
      $("wkClear").onclick = () => { workCur = ""; paint(); };
      $("wkEq").onclick = () => {
        const v = evalLine(workCur);
        if (v === null) { curEl.textContent = workCur + "  ⚠"; return; }
        if (workLines.length < 12) workLines.push(`${workCur} = ${v}`);
        workCur = String(v);
        $("workAns").value = String(v);
        paint();
      };
      $("sendBtn").onclick = () => {
        const answer = $("workAns").value.trim();
        if (answer || workLines.length) submit({ lines: workLines, answer });
      };
    });
    return;
  }

  /* --- phonics keyboard: build the word from graphemes --- */
  if (itx.mode === "phonics") {
    const key = (p, wide) =>
      `<button class="phon-key pc-${phonCat(p)}${wide ? " wide" : ""}" data-p="${p}">${p === "-e" ? "silent e" : esc(p)}</button>`;
    show(`${h}
      <div class="phon-strip-row">
        <div class="phon-strip" id="phonStrip"></div>
        <button class="phon-ctl" id="phonBack" title="Backspace">⌫</button>
        <button class="phon-ctl" id="phonClear" title="Clear">✕</button>
      </div>
      <div class="phon-board">
        ${PHON_ROWS.map((row) => `<div class="phon-row">${row.map((p) => key(p)).join("")}</div>`).join("")}
        <div class="phon-divider"></div>
        ${PHON_EXTRAS.map((row) => `<div class="phon-row">${row.map((p) => key(p, p === "-e")).join("")}</div>`).join("")}
      </div>
      <button class="btn send" id="sendBtn">Send my word</button>
      <p class="hint">Tap the sounds in order to build your word.</p>`, () => {
      const strip = $("phonStrip");
      const paint = () => {
        strip.innerHTML = phonParts.length
          ? phonParts
              .map((p) => `<span class="phon-chip pc-${phonCat(p)}">${esc(p === "-e" ? "e" : p)}</span>`)
              .join("")
          : `<span class="phon-placeholder">your word builds here…</span>`;
      };
      paint();
      screenEl.querySelectorAll(".phon-key").forEach((b) => (b.onclick = () => {
        if (phonParts.length >= 14) return;
        phonParts.push(b.dataset.p);
        paint();
      }));
      $("phonBack").onclick = () => { phonParts.pop(); paint(); };
      $("phonClear").onclick = () => { phonParts = []; paint(); };
      $("sendBtn").onclick = () => { if (phonParts.length) submit({ parts: phonParts }); };
    });
    return;
  }

  /* --- drop an image: a photo or picture IS the answer (optionally with writing) --- */
  if (itx.mode === "image_drop" || itx.mode === "image_caption") {
    const withText = itx.mode === "image_caption";
    show(`${h}
      <div id="dropZone" style="border:2px dashed var(--line);border-radius:14px;padding:1.6rem 1rem;text-align:center;background:var(--surface);cursor:pointer">
        <div id="dropPreview" style="display:none;margin-bottom:0.8rem"><img id="dropImg" alt="your image" style="max-width:100%;max-height:45vh;border-radius:10px" /></div>
        <div id="dropText"><div style="font-size:2rem">📥</div><b>Drop an image here</b><br/><span class="hint" style="margin:0">or tap to choose a photo — or take one</span></div>
        <input type="file" id="dropFile" accept="image/*" style="display:none" />
      </div>
      ${withText ? `<textarea id="capText" rows="4" maxlength="1500" placeholder="Write a few sentences about your image…" style="width:100%;margin-top:0.8rem;font:inherit;padding:0.7rem 0.8rem;border:1.5px solid var(--line);border-radius:12px;resize:vertical"></textarea>` : ""}
      <div style="display:flex;gap:0.6rem;margin-top:0.8rem">
        <button class="btn" id="dropClear" style="flex:0 0 auto;width:auto;margin-top:0;background:var(--surface);border:1.5px solid var(--line)">↺ Change</button>
        <button class="btn send" id="sendBtn" style="flex:1;margin-top:0" disabled>${withText ? "Send image + writing" : "Send my image"}</button>
      </div>`, () => {
      let dataUrl = null;
      const zone = $("dropZone"), file = $("dropFile");
      const textOf = () => (withText ? $("capText").value.trim() : "");
      // Both halves before it can go: the picture, and (here) the sentences.
      const ready = () => { $("sendBtn").disabled = !dataUrl || (withText && !textOf()); };
      if (withText) $("capText").oninput = ready;
      const setImage = (blob) => {
        if (!blob || !blob.type.startsWith("image/")) return;
        const img = new Image();
        img.onload = () => {
          // Keep it print-size: a 2000px long edge still prints crisply on A4.
          const s = Math.min(1, 2000 / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * s);
          c.height = Math.round(img.height * s);
          const cx = c.getContext("2d");
          cx.fillStyle = "#fff";
          cx.fillRect(0, 0, c.width, c.height);
          cx.drawImage(img, 0, 0, c.width, c.height);
          dataUrl = c.toDataURL("image/jpeg", 0.85);
          URL.revokeObjectURL(img.src);
          $("dropImg").src = dataUrl;
          $("dropPreview").style.display = "block";
          $("dropText").style.display = "none";
          ready();
        };
        img.src = URL.createObjectURL(blob);
      };
      zone.onclick = () => file.click();
      file.onchange = () => setImage(file.files[0]);
      ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.style.borderColor = "var(--accent)"; }));
      ["dragleave", "drop"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.style.borderColor = "var(--line)"; }));
      zone.addEventListener("drop", (e) => setImage(e.dataTransfer.files[0]));
      document.onpaste = (e) => { const f = e.clipboardData?.files?.[0]; if (f) setImage(f); };
      $("dropClear").onclick = () => {
        dataUrl = null; file.value = "";
        $("dropPreview").style.display = "none"; $("dropText").style.display = "block"; $("sendBtn").disabled = true;
      };
      $("sendBtn").onclick = () => {
        if (!dataUrl || (withText && !textOf())) return;
        submit(withText ? { image: dataUrl, text: textOf() } : { image: dataUrl });
      };
    });
    return;
  }

  /* --- sketch & annotate --- */
  if (itx.mode === "sketch" || itx.mode === "annotate") {
    const anno = itx.mode === "annotate";
    show(`${h}
      <canvas id="pad" width="600" height="450"></canvas>
      <div style="display:flex;gap:0.6rem;margin-top:0.8rem">
        <button class="btn" id="clearPad" style="flex:0 0 auto;width:auto;margin-top:0;background:var(--surface);border:1.5px solid var(--line)">↺ Clear</button>
        <button class="btn send" id="sendBtn" style="flex:1;margin-top:0">${anno ? "Send my annotation" : "Send my sketch"}</button>
      </div>
      <p class="hint">${anno ? "Draw on the image with your finger or mouse." : "Draw with your finger or mouse."}</p>`, () => {
      const canvas = $("pad");
      const ctx = canvas.getContext("2d");
      // Fill the screen: as wide as the device allows, as tall as fits above
      // the buttons, keeping 4:3. Resolution follows the display size so an
      // iPad drawing is crisp and prints well.
      screenEl.classList.add("wide");
      let padAspect = null; // height / width, fixed once the pad exists
      const fitPad = (first) => {
        const controls = 120; // buttons + hint below the pad
        const top = canvas.getBoundingClientRect().top;
        const availH = Math.max(260, window.innerHeight - top - controls);
        const availW = screenEl.clientWidth;
        let w, hgt;
        if (first) {
          // Take the whole space, within sane shapes (not a thin strip).
          w = availW;
          hgt = Math.min(Math.max(availH, w * 0.55), w * 1.3);
          padAspect = hgt / w;
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          canvas.width = Math.min(2000, Math.round(w * dpr));
          canvas.height = Math.round(canvas.width * padAspect);
        } else {
          // Rotated or resized: scale, never reshape (that would warp the drawing).
          w = availW;
          hgt = w * padAspect;
          if (hgt > availH) { hgt = availH; w = hgt / padAspect; }
        }
        canvas.style.width = `${Math.floor(w)}px`;
        canvas.style.height = `${Math.floor(hgt)}px`;
      };
      fitPad(true);
      window.addEventListener("resize", () => fitPad(false), { passive: true });
      let bg = null; // the teacher's image, once loaded
      const blank = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (bg) {
          // fit the image inside the canvas, centred
          const s = Math.min(canvas.width / bg.width, canvas.height / bg.height);
          const w = bg.width * s, hh = bg.height * s;
          ctx.drawImage(bg, (canvas.width - w) / 2, (canvas.height - hh) / 2, w, hh);
        }
      };
      blank();
      if (anno && itx.imageUrl) {
        const img = new Image();
        img.onload = () => { bg = img; blank(); };
        img.src = itx.imageUrl;
      }
      ctx.strokeStyle = anno ? "#e02d2d" : "#191c26";
      ctx.lineWidth = Math.max(3, Math.round(canvas.width / 150)); // same feel at any resolution
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      let drawing = false, drew = false;
      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        return [((e.clientX - r.left) * canvas.width) / r.width, ((e.clientY - r.top) * canvas.height) / r.height];
      };
      canvas.addEventListener("pointerdown", (e) => {
        drawing = true; drew = true;
        try { canvas.setPointerCapture(e.pointerId); } catch { /* fine without capture */ }
        const [x, y] = pos(e);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke();
        e.preventDefault();
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!drawing) return;
        const [x, y] = pos(e);
        ctx.lineTo(x, y); ctx.stroke();
        e.preventDefault();
      });
      canvas.addEventListener("pointerup", () => (drawing = false));
      $("clearPad").onclick = () => { blank(); drew = false; };
      $("sendBtn").onclick = () => {
        if (!drew) return;
        // annotations carry a photo background — jpeg keeps them small
        submit({ image: anno ? canvas.toDataURL("image/jpeg", 0.8) : canvas.toDataURL("image/png") });
      };
    });
    return;
  }
}

/* ---------------- join screen ---------------- */

function renderJoin(forceFullForm) {
  const params = new URLSearchParams(location.search);
  const preset = (params.get("code") || "").toUpperCase();
  // The device remembers who you are — next lesson is one tap.
  const savedName = localStorage.getItem("eyesup_name") || "";

  const doJoin = (c, n) => {
    if (c.length !== 4) return;
    if (n) localStorage.setItem("eyesup_name", n);
    sessionStorage.setItem("eyesup_name", n);
    sessionStorage.removeItem("eyesup_sid");
    send({ type: "student_join", code: c, name: n });
  };

  if (preset && savedName && !forceFullForm) {
    show(`
      <div class="big-emoji">🙋</div>
      <div class="state-title" style="font-size:1.7rem">Ready to join</div>
      <button class="btn send" id="quickJoin" style="margin-top:1.4rem;font-size:1.2rem">Join as ${esc(savedName)} →</button>
      <button class="change-link" id="notMe">Not ${esc(savedName)}? Change name</button>
      <p class="hint">Class code ${esc(preset)}</p>`, () => {
      $("quickJoin").onclick = () => doJoin(preset, savedName);
      $("notMe").onclick = () => renderJoin(true);
    });
    return;
  }

  show(`
    <div class="big-emoji">🙋</div>
    <div class="state-title" style="font-size:1.7rem">Join your class</div>
    <input type="text" id="codeInput" placeholder="CLASS CODE" maxlength="4" value="${esc(preset)}"
      style="margin-top:1.2rem;text-transform:uppercase;text-align:center;letter-spacing:0.35em;font-weight:800;font-size:1.4rem" />
    <input type="text" id="nameInput" placeholder="First name" maxlength="24" value="${forceFullForm ? "" : esc(savedName)}" style="margin-top:0.6rem;text-align:center" />
    <button class="btn send" id="joinBtn">Join</button>
    <p class="hint">No account. No downloads. You're just here to think.</p>`, () => {
    const code = $("codeInput"), name = $("nameInput");
    (preset ? name : code).focus();
    const go = () => doJoin(code.value.trim().toUpperCase(), name.value.trim());
    $("joinBtn").onclick = go;
    [code, name].forEach((i) => (i.onkeydown = (e) => { if (e.key === "Enter") go(); }));
  });
}

if (PREVIEW) {
  show(`<div class="big-emoji">👁</div><p class="state-sub">Connecting preview…</p>`);
} else {
  renderJoin();
}
connect();
