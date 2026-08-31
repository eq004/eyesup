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
  sketch: "🎨 Sketch It", spot_mistake: "🔎 Spot the Mistake",
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
  counters: "🟠 Counters",
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

  // Venn and Post-its keep their input screen after submitting — students add more one by one.
  if (state.submitted && !changingAnswer && !["venn", "post_its"].includes(itx.mode)) {
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
  };
  if (WRITTEN_PH[itx.mode]) {
    const anon = ["ask_question", "muddiest_point"].includes(itx.mode);
    show(`${h}
      ${itx.imageUrl ? `<img class="prompt-img" src="${itx.imageUrl}" alt="look at this image" />` : ""}
      <textarea id="textInput" rows="4" maxlength="500" placeholder="${WRITTEN_PH[itx.mode]}"></textarea>
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
          if (counterItems.length >= 40) return;
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
      ctx.lineWidth = 4;
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
