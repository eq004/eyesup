/*
 * Eyes Up — teacher-led classroom recall & participation platform.
 * Single Node server: Express serves the three views, ws powers real-time.
 * Sessions live in memory — a prototype needs no database.
 *
 * Roles per connection: teacher | student | projector
 * The teacher is the conductor; every state change is pushed to all screens.
 */

const os = require("os");
const path = require("path");
const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");

// The address other devices in the room (iPads, phones) can reach us on.
function lanAddress() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces || []) {
      if (i.family === "IPv4" && !i.internal) return i.address;
    }
  }
  return "localhost";
}

const PORT = process.env.PORT || 4630;
// When set, the teacher dashboard (and reports) require this password.
// Students and the projector never need it — they only need a session code.
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || "";

const app = express();
app.use(express.static(path.join(__dirname, "public")));

// Friendly routes
app.get("/teacher", (_req, res) => res.sendFile(path.join(__dirname, "public/teacher.html")));
app.get("/join", (_req, res) => res.sendFile(path.join(__dirname, "public/student.html")));
app.get("/projector", (_req, res) => res.sendFile(path.join(__dirname, "public/projector.html")));
app.get("/report", (_req, res) => res.sendFile(path.join(__dirname, "public/report.html")));

// Summary as JSON for the printable report. The session code is the key,
// same trust model as joining the room.
app.get("/api/summary/:code", (req, res) => {
  if (TEACHER_PASSWORD && req.query.pw !== TEACHER_PASSWORD)
    return res.status(403).json({ error: "bad_password" });
  const session = sessions.get(String(req.params.code || "").toUpperCase());
  if (!session) return res.status(404).json({ error: "no_session" });
  res.json({ ...buildSummary(session), code: session.code, createdAt: session.createdAt });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

/* ------------------------------------------------------------------ */
/* Session model                                                      */
/* ------------------------------------------------------------------ */

const sessions = new Map(); // code -> session

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no lookalikes
function newCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () =>
      CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    ).join("");
  } while (sessions.has(code));
  return code;
}

function createSession(teacherWs) {
  const code = newCode();
  const session = {
    code,
    createdAt: Date.now(),
    teacher: teacherWs,
    projectors: new Set(),
    students: new Map(), // id -> {id, name, ws}
    everJoined: new Map(), // id -> name (for summary even after disconnects)
    phase: "lobby", // lobby | interaction | eyesup | ended
    interaction: null,
    history: [],
    sequence: [],
    seqIndex: -1,
    counter: 0,
    // Room tools
    showJoin: false, // teacher-toggled: force the big join screen onto the projector
    timer: null, // {seconds, endsAt, paused, remaining}
    focus: null, // {type:'spotlight', name} | {type:'groups', groups:[[names]]}
    picked: new Set(), // student ids already randomly selected (no repeats till all picked)
  };
  sessions.set(code, session);
  return session;
}

const TEXT_MODES = new Set([
  "short_answer", "predict", "ask_question", "exit_ticket", "muddiest_point",
  "retrieval_sprint", "spot_mistake", "teach_back", "give_example",
  "make_connection", "finish_sentence", "quick_challenge",
]);
const CHOICE_MODES = new Set(["poll", "agree_disagree", "confidence", "this_or_that", "true_false", "multi_choice"]);
const WORD_MODES = new Set(["word_cloud", "one_word", "mindmap"]);
const ORDER_MODES = new Set(["ranking", "put_in_order"]);
// Responses in these modes never carry a name anywhere.
const ANON_MODES = new Set(["ask_question", "muddiest_point"]);
// Custom options entered by the teacher at launch.
const OPTION_MODES = new Set(["poll", "this_or_that", "ranking", "put_in_order", "example_nonexample", "venn", "multi_choice"]);

const FIXED_OPTIONS = {
  agree_disagree: ["Agree", "Unsure", "Disagree"],
  confidence: ["I've got it", "I'm nearly there", "I'm confused"],
  true_false: ["True", "False"],
};

const STRUCTURED_FIELDS = {
  three_two_one: ["3 ideas you remember", "2 connections between ideas", "1 question you still have"],
  notice_wonder: ["I notice…", "I wonder…"],
  before_after: ["Before, I thought…", "Now I think…"],
};

const TIME_LIMITS = { retrieval_sprint: 60 }; // seconds

// Does the teacher gate this response type onto the projector?
function isRevealMode(mode) {
  return (
    TEXT_MODES.has(mode) || STRUCTURED_FIELDS[mode] ||
    mode === "sketch" || mode === "example_nonexample" || mode === "post_its"
  );
}

// Modes where the teacher chooses "one response each" vs "multiple".
const MULTI_MODES = new Set(["word_cloud", "mindmap", "post_its", "venn"]);

function newInteraction(session, { mode, prompt, options, correct, moderated, multi }) {
  session.counter += 1;
  let opts = null;
  let pairs = null;
  if (FIXED_OPTIONS[mode]) opts = FIXED_OPTIONS[mode];
  else if (OPTION_MODES.has(mode)) {
    opts = (options || []).map((o) => String(o).trim()).filter(Boolean);
  } else if (mode === "match_up") {
    // Options arrive as "term = match" strings so plans stay simple text.
    pairs = (options || [])
      .map((o) => String(o).split("=").map((s) => s.trim()))
      .filter((p) => p.length === 2 && p[0] && p[1])
      .map(([left, right]) => ({ left, right }));
  }
  const correctIdx =
    mode === "multi_choice" && Number.isInteger(correct) && opts && correct >= 0 && correct < opts.length
      ? correct
      : null;
  return {
    id: session.counter,
    mode,
    prompt: String(prompt || "").trim(),
    options: opts,
    pairs,
    fields: STRUCTURED_FIELDS[mode] || null,
    timeLimit: TIME_LIMITS[mode] || null,
    correct: correctIdx,
    answerRevealed: false,
    // Post-its: teacher chooses at launch — screen notes first, or straight up.
    moderated: mode === "post_its" ? moderated !== false : null,
    // One contribution each, or several (the default).
    multi: MULTI_MODES.has(mode) ? multi !== false : null,
    open: true,
    // Live-building modes show results as they arrive; written/drawn answers
    // are revealed by the teacher (gradually or all at once).
    // Quiz questions hide results until the teacher shows them, so nobody
    // bandwagons onto the popular answer.
    resultsVisible: mode !== "multi_choice",
    responses: new Map(), // studentId -> {name, payload, revealed, at}
    startedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* Aggregation (what the projector shows)                             */
/* ------------------------------------------------------------------ */

function aggregate(session, itx) {
  if (!itx) return null;
  const responses = [...itx.responses.values()];
  const total = responses.length;
  const base = { mode: itx.mode, total };

  if (WORD_MODES.has(itx.mode)) {
    const freq = new Map();
    for (const r of responses) {
      for (const w of r.payload.words || []) {
        const key = w.toLowerCase();
        if (!freq.has(key)) freq.set(key, { word: w, count: 0 });
        freq.get(key).count += 1;
      }
    }
    const words = [...freq.values()].sort((a, b) => b.count - a.count).slice(0, 60);
    return { ...base, words };
  }

  if (CHOICE_MODES.has(itx.mode)) {
    const counts = itx.options.map(() => 0);
    for (const r of responses) {
      const i = r.payload.choice;
      if (Number.isInteger(i) && i >= 0 && i < counts.length) counts[i] += 1;
    }
    // The correct answer only reaches screens after the teacher reveals it.
    return { ...base, options: itx.options, counts, correct: itx.answerRevealed ? itx.correct : null };
  }

  if (ORDER_MODES.has(itx.mode)) {
    // Lower average position = ranked higher by the class.
    const n = itx.options.length;
    const sums = itx.options.map(() => 0);
    const correctAt = itx.options.map(() => 0); // placed at its original index
    for (const r of responses) {
      (r.payload.order || []).forEach((optIndex, pos) => {
        if (Number.isInteger(optIndex) && optIndex >= 0 && optIndex < n) {
          sums[optIndex] += pos;
          if (optIndex === pos) correctAt[optIndex] += 1;
        }
      });
    }
    const ranked = itx.options
      .map((label, i) => ({
        label,
        avg: total ? sums[i] / total : i,
        // For put_in_order the entered order IS the correct order.
        correctPct: itx.mode === "put_in_order" && total ? Math.round((correctAt[i] / total) * 100) : null,
      }))
      .sort((a, b) => a.avg - b.avg)
      .map((x, i) => ({ ...x, position: i + 1 }));
    return { ...base, ranked, isSequence: itx.mode === "put_in_order" };
  }

  if (itx.mode === "post_its") {
    // Only approved notes reach the board; the teacher sees everything.
    const stickies = [];
    let totalNotes = 0;
    for (const r of responses) {
      (r.payload.notes || []).forEach((text, i) => {
        totalNotes += 1;
        if (r.noteRevealed?.[i]) stickies.push({ text });
      });
    }
    return { ...base, stickies, totalNotes };
  }

  if (itx.mode === "venn") {
    // Three regions: [left only, both, right only] — live word frequencies.
    const regionMaps = [new Map(), new Map(), new Map()];
    for (const r of responses) {
      for (const item of r.payload.items || []) {
        const m = regionMaps[item.region];
        const key = item.text.toLowerCase();
        if (!m.has(key)) m.set(key, { word: item.text, count: 0 });
        m.get(key).count += 1;
      }
    }
    const regions = regionMaps.map((m) =>
      [...m.values()].sort((a, b) => b.count - a.count).slice(0, 14)
    );
    return { ...base, labels: itx.options, regions };
  }

  if (itx.mode === "match_up") {
    const n = itx.pairs.length;
    const correctCounts = itx.pairs.map(() => 0);
    for (const r of responses) {
      (r.payload.matches || []).forEach((rightIndex, leftIndex) => {
        if (rightIndex === leftIndex && leftIndex < n) correctCounts[leftIndex] += 1;
      });
    }
    return {
      ...base,
      matches: itx.pairs.map((p, i) => ({ left: p.left, right: p.right, correct: correctCounts[i] })),
    };
  }

  if (itx.mode === "example_nonexample") {
    // Votes build live; the written "why" waits for the teacher's reveal.
    const counts = itx.options.map(() => 0);
    for (const r of responses) {
      const i = r.payload.choice;
      if (Number.isInteger(i) && i >= 0 && i < counts.length) counts[i] += 1;
    }
    const revealed = responses
      .filter((r) => r.revealed && r.payload.text)
      .map((r) => ({ text: r.payload.text, choiceLabel: itx.options[r.payload.choice] }));
    return { ...base, options: itx.options, counts, revealed };
  }

  if (STRUCTURED_FIELDS[itx.mode]) {
    const revealed = responses
      .filter((r) => r.revealed)
      .map((r) => ({ parts: r.payload.parts }));
    return { ...base, fields: itx.fields, revealed, revealedCount: revealed.length };
  }

  if (itx.mode === "sketch") {
    const revealed = responses.filter((r) => r.revealed).map((r) => ({ image: r.payload.image }));
    return { ...base, sketches: revealed, revealedCount: revealed.length };
  }

  // Text modes — projector only sees responses the teacher has revealed.
  const revealed = responses
    .filter((r) => r.revealed)
    .map((r) => ({ text: r.payload.text }));
  return { ...base, revealed, revealedCount: revealed.length };
}

/* ------------------------------------------------------------------ */
/* Broadcasting                                                       */
/* ------------------------------------------------------------------ */

function safeSend(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function teacherState(session) {
  const itx = session.interaction;
  return {
    type: "state",
    role: "teacher",
    code: session.code,
    phase: session.phase,
    timer: session.timer,
    focus: session.focus,
    showJoin: session.showJoin,
    students: [...session.students.values()].map((s) => ({ id: s.id, name: s.name })),
    sequence: session.sequence,
    seqIndex: session.seqIndex,
    historyCount: session.history.length,
    interaction: itx
      ? {
          id: itx.id,
          mode: itx.mode,
          prompt: itx.prompt,
          options: itx.options,
          pairs: itx.pairs,
          fields: itx.fields,
          timeLimit: itx.timeLimit,
          correct: itx.correct,
          answerRevealed: itx.answerRevealed,
          moderated: itx.moderated,
          multi: itx.multi,
          open: itx.open,
          resultsVisible: itx.resultsVisible,
          responses: [...itx.responses.entries()].map(([sid, r]) => ({
            studentId: sid,
            name: ANON_MODES.has(itx.mode) ? null : r.name, // anonymous modes stay anonymous
            payload: r.payload,
            revealed: r.revealed,
            noteRevealed: r.noteRevealed,
          })),
          aggregate: aggregate(session, itx),
        }
      : null,
  };
}

function projectorState(session) {
  const itx = session.interaction;
  return {
    type: "state",
    role: "projector",
    code: session.code,
    joinHost: `${lanAddress()}:${PORT}`,
    phase: session.phase,
    timer: session.timer,
    focus: session.focus,
    showJoin: session.showJoin,
    studentCount: session.students.size,
    respondedCount: itx ? itx.responses.size : 0,
    interaction: itx
      ? {
          mode: itx.mode,
          prompt: itx.prompt,
          options: itx.options,
          open: itx.open,
          resultsVisible: itx.resultsVisible,
          aggregate: itx.resultsVisible ? aggregate(session, itx) : null,
        }
      : null,
  };
}

function studentState(session, student) {
  const itx = session.interaction;
  const submitted = itx ? itx.responses.has(student.id) : false;
  return {
    type: "state",
    role: "student",
    code: session.code,
    phase: session.phase,
    name: student.name,
    submitted,
    interaction:
      itx && session.phase === "interaction"
        ? {
            id: itx.id,
            mode: itx.mode,
            prompt: itx.prompt,
            options: itx.options,
            pairs: itx.pairs,
            fields: itx.fields,
            multi: itx.multi,
            timeLimit: itx.timeLimit,
            secondsLeft: itx.timeLimit
              ? Math.max(0, Math.round(itx.timeLimit - (Date.now() - itx.startedAt) / 1000))
              : null,
            open: itx.open,
          }
        : null,
  };
}

function broadcast(session) {
  safeSend(session.teacher, teacherState(session));
  for (const p of session.projectors) safeSend(p, projectorState(session));
  for (const s of session.students.values()) safeSend(s.ws, studentState(session, s));
}

/* ------------------------------------------------------------------ */
/* Summary                                                            */
/* ------------------------------------------------------------------ */

function buildSummary(session) {
  const all = [...session.history];
  if (session.interaction) all.push(session.interaction);

  const participants = new Set();
  for (const itx of all) for (const sid of itx.responses.keys()) participants.add(sid);

  const items = all.map((itx) => {
    const agg = aggregate(session, itx);
    const item = { mode: itx.mode, prompt: itx.prompt, responses: itx.responses.size };
    if (WORD_MODES.has(itx.mode)) item.topWords = agg.words.slice(0, 8);
    if (CHOICE_MODES.has(itx.mode) || itx.mode === "example_nonexample")
      item.distribution = itx.options.map((o, i) => ({
        label: o + (itx.correct === i ? " ✓" : ""),
        count: agg.counts[i],
      }));
    if (ORDER_MODES.has(itx.mode)) item.ranked = agg.ranked;
    if (itx.mode === "match_up") {
      const total = itx.responses.size;
      item.matchStats = itx.pairs.map((p, i) => ({
        pair: `${p.left} → ${p.right}`,
        correctPct: total ? Math.round((agg.matches[i].correct / total) * 100) : 0,
      }));
    }
    if (STRUCTURED_FIELDS[itx.mode])
      item.answers = [...itx.responses.values()]
        .map((r) => r.payload.parts.filter(Boolean).join(" · "))
        .slice(0, 40);
    if (itx.mode === "sketch") item.sketchCount = itx.responses.size;
    if (itx.mode === "venn")
      item.venn = { labels: itx.options, regions: agg.regions.map((r) => r.slice(0, 8)) };
    if (itx.mode === "post_its")
      item.answers = [...itx.responses.values()].flatMap((r) => r.payload.notes || []).slice(0, 60);
    if (itx.mode === "example_nonexample")
      item.answers = [...itx.responses.values()].map((r) => r.payload.text).filter(Boolean).slice(0, 40);
    if (TEXT_MODES.has(itx.mode))
      item.answers = [...itx.responses.values()].map((r) => r.payload.text).slice(0, 40);
    return item;
  });

  // Confidence headline: % of latest confidence-check who chose got-it / nearly.
  let confidence = null;
  const confChecks = all.filter((i) => i.mode === "confidence");
  if (confChecks.length) {
    const last = confChecks[confChecks.length - 1];
    const agg = aggregate(session, last);
    const total = agg.counts.reduce((a, b) => a + b, 0);
    if (total) {
      confidence = {
        gotIt: agg.counts[0],
        nearly: agg.counts[1],
        confused: agg.counts[2],
        understanding: Math.round(((agg.counts[0] + agg.counts[1]) / total) * 100),
      };
    }
  }

  // Most common words across word modes — "commonly remembered".
  const wordFreq = new Map();
  for (const itx of all.filter((i) => WORD_MODES.has(i.mode))) {
    for (const r of itx.responses.values())
      for (const w of r.payload.words || []) {
        const k = w.toLowerCase();
        wordFreq.set(k, (wordFreq.get(k) || 0) + 1);
      }
  }
  const commonWords = [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word, count]) => ({ word, count }));

  return {
    type: "summary",
    joinedCount: session.everJoined.size,
    participatedCount: participants.size,
    interactionCount: all.length,
    confidence,
    commonWords,
    items,
  };
}

/* ------------------------------------------------------------------ */
/* Message handling                                                   */
/* ------------------------------------------------------------------ */

let nextStudentId = 1;

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));

  ws.meta = { role: null, code: null, studentId: null };

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    try {
      handle(ws, msg);
    } catch (err) {
      console.error("handler error:", err);
    }
  });

  ws.on("close", () => {
    const session = sessions.get(ws.meta.code);
    if (!session) return;
    if (ws.meta.role === "student" && session.students.get(ws.meta.studentId)?.ws === ws) {
      session.students.delete(ws.meta.studentId);
      broadcast(session);
    } else if (ws.meta.role === "projector") {
      session.projectors.delete(ws);
    } else if (ws.meta.role === "teacher" && session.teacher === ws) {
      session.teacher = null; // session survives; teacher can resume with the code
    }
  });
});

function handle(ws, msg) {
  const { type } = msg;

  /* ---- connection / identity ---- */

  if (type === "teacher_create") {
    if (TEACHER_PASSWORD && msg.password !== TEACHER_PASSWORD)
      return safeSend(ws, { type: "error", error: "bad_password" });
    const session = createSession(ws);
    ws.meta = { role: "teacher", code: session.code };
    broadcast(session);
    return;
  }

  if (type === "teacher_resume") {
    if (TEACHER_PASSWORD && msg.password !== TEACHER_PASSWORD)
      return safeSend(ws, { type: "error", error: "bad_password" });
    const session = sessions.get(String(msg.code || "").toUpperCase());
    if (!session) return safeSend(ws, { type: "error", error: "no_session" });
    session.teacher = ws;
    ws.meta = { role: "teacher", code: session.code };
    broadcast(session);
    return;
  }

  if (type === "projector_join") {
    const session = sessions.get(String(msg.code || "").toUpperCase());
    if (!session) return safeSend(ws, { type: "error", error: "no_session" });
    session.projectors.add(ws);
    ws.meta = { role: "projector", code: session.code };
    safeSend(ws, projectorState(session));
    return;
  }

  if (type === "student_join") {
    const session = sessions.get(String(msg.code || "").toUpperCase());
    if (!session || session.phase === "ended")
      return safeSend(ws, { type: "error", error: "no_session" });
    let student;
    // Rejoin after a refresh keeps identity (and any submitted answers).
    if (msg.studentId && session.students.has(msg.studentId) === false && session.everJoined.has(msg.studentId)) {
      student = { id: msg.studentId, name: session.everJoined.get(msg.studentId), ws };
    } else {
      const id = "s" + nextStudentId++;
      const name = String(msg.name || "").trim().slice(0, 24) || "Student";
      student = { id, name, ws };
      session.everJoined.set(id, name);
    }
    session.students.set(student.id, student);
    ws.meta = { role: "student", code: session.code, studentId: student.id };
    safeSend(ws, { type: "joined", studentId: student.id, code: session.code });
    broadcast(session);
    return;
  }

  /* ---- everything below requires an attached session ---- */

  const session = sessions.get(ws.meta.code);
  if (!session) return;

  /* ---- student actions ---- */

  if (type === "respond" && ws.meta.role === "student") {
    const itx = session.interaction;
    const student = session.students.get(ws.meta.studentId);
    if (!itx || !itx.open || !student || session.phase !== "interaction") return;
    if (msg.interactionId !== itx.id) return;
    const payload = sanitizePayload(itx, msg.payload);
    if (!payload) return;
    const record = {
      name: student.name,
      payload,
      // Live modes are effectively revealed on arrival; written/drawn ones wait for the teacher.
      revealed: !isRevealMode(itx.mode),
      at: Date.now(),
    };
    if (itx.mode === "post_its") {
      // Per-note approval; unmoderated boards reveal on arrival. Resubmits
      // (students adding notes) keep the approval state of earlier notes.
      const prev = itx.responses.get(student.id);
      record.noteRevealed = payload.notes.map((_, i) =>
        itx.moderated ? prev?.noteRevealed?.[i] || false : true
      );
      record.revealed = record.noteRevealed.some(Boolean);
    }
    itx.responses.set(student.id, record);
    broadcast(session);
    return;
  }

  /* ---- teacher actions ---- */

  if (ws.meta.role !== "teacher") return;

  switch (type) {
    case "launch": {
      startInteraction(session, msg);
      break;
    }
    case "open_responses": {
      if (session.interaction) {
        session.interaction.open = true;
        session.phase = "interaction";
      }
      break;
    }
    case "close_responses": {
      if (session.interaction) session.interaction.open = false;
      break;
    }
    case "show_results": {
      if (session.interaction) session.interaction.resultsVisible = true;
      break;
    }
    case "hide_results": {
      if (session.interaction) session.interaction.resultsVisible = false;
      break;
    }
    case "reveal": {
      const r = session.interaction?.responses.get(msg.studentId);
      if (!r) break;
      if (Number.isInteger(msg.noteIndex) && Array.isArray(r.noteRevealed)) {
        if (msg.noteIndex >= 0 && msg.noteIndex < r.noteRevealed.length) {
          r.noteRevealed[msg.noteIndex] = !r.noteRevealed[msg.noteIndex];
          r.revealed = r.noteRevealed.some(Boolean);
        }
      } else {
        r.revealed = !r.revealed;
      }
      break;
    }
    case "reveal_all": {
      const itx = session.interaction;
      if (itx)
        for (const r of itx.responses.values()) {
          r.revealed = true;
          if (Array.isArray(r.noteRevealed)) r.noteRevealed = r.noteRevealed.map(() => true);
        }
      break;
    }
    case "reveal_answer": {
      const itx = session.interaction;
      if (itx && itx.correct != null) {
        itx.answerRevealed = true;
        itx.resultsVisible = true; // showing the answer implies showing the results
      }
      break;
    }
    case "clear": {
      if (session.interaction) session.interaction.responses.clear();
      break;
    }
    case "eyes_up": {
      if (session.interaction) {
        session.interaction.open = false;
        session.history.push(session.interaction);
        session.interaction = null;
      }
      session.phase = "eyesup";
      break;
    }
    case "set_sequence": {
      session.sequence = (msg.items || []).slice(0, 30).map((it) => ({
        mode: String(it.mode || ""),
        prompt: String(it.prompt || "").slice(0, 300),
        options: Array.isArray(it.options) ? it.options.map((o) => String(o).slice(0, 80)) : null,
        correct: Number.isInteger(it.correct) ? it.correct : null,
        moderated: typeof it.moderated === "boolean" ? it.moderated : undefined,
        multi: typeof it.multi === "boolean" ? it.multi : undefined,
      }));
      if (session.seqIndex >= session.sequence.length) session.seqIndex = session.sequence.length - 1;
      break;
    }
    case "next": {
      if (session.seqIndex + 1 < session.sequence.length) {
        session.seqIndex += 1;
        startInteraction(session, session.sequence[session.seqIndex]);
      }
      break;
    }
    case "jump_to_step": {
      const i = msg.index;
      if (Number.isInteger(i) && i >= 0 && i < session.sequence.length) {
        session.seqIndex = i;
        startInteraction(session, session.sequence[i]);
      }
      break;
    }
    /* ---- room tools ---- */
    case "timer_start": {
      const s = Math.min(3600, Math.max(5, Math.round(msg.seconds || 60)));
      session.timer = { seconds: s, endsAt: Date.now() + s * 1000, paused: false, remaining: null };
      break;
    }
    case "timer_pause": {
      const t = session.timer;
      if (t && !t.paused) {
        t.paused = true;
        t.remaining = Math.max(0, t.endsAt - Date.now());
      }
      break;
    }
    case "timer_resume": {
      const t = session.timer;
      if (t && t.paused) {
        t.paused = false;
        t.endsAt = Date.now() + t.remaining;
        t.remaining = null;
      }
      break;
    }
    case "timer_clear": {
      session.timer = null;
      break;
    }
    case "pick_student": {
      // Random selection with no repeats until everyone has had a turn.
      const candidates = [...session.students.values()].filter((s) => s.name !== "👁 Preview");
      if (!candidates.length) break;
      let pool = candidates.filter((s) => !session.picked.has(s.id));
      if (!pool.length) {
        session.picked.clear(); // everyone's been picked — start a fresh round
        pool = candidates;
      }
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      session.picked.add(chosen.id);
      session.focus = { type: "spotlight", name: chosen.name };
      break;
    }
    case "make_groups": {
      const names = [...session.students.values()]
        .filter((s) => s.name !== "👁 Preview")
        .map((s) => s.name);
      if (names.length < 2) break;
      for (let i = names.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [names[i], names[j]] = [names[j], names[i]];
      }
      const n = Math.max(1, Math.min(names.length, Math.round(msg.n || 2)));
      const groupCount = msg.by === "count" ? Math.min(n, names.length) : Math.ceil(names.length / n);
      const groups = Array.from({ length: groupCount }, () => []);
      names.forEach((name, i) => groups[i % groupCount].push(name)); // round-robin keeps sizes even
      session.focus = { type: "groups", groups };
      break;
    }
    case "clear_focus": {
      session.focus = null;
      break;
    }
    case "toggle_join": {
      session.showJoin = !session.showJoin;
      break;
    }
    case "get_summary": {
      safeSend(session.teacher, buildSummary(session));
      return; // no broadcast needed
    }
    case "end_session": {
      if (session.interaction) {
        session.history.push(session.interaction);
        session.interaction = null;
      }
      session.phase = "ended";
      safeSend(session.teacher, buildSummary(session));
      break;
    }
    default:
      return;
  }
  broadcast(session);
}

function startInteraction(session, spec) {
  if (session.interaction) session.history.push(session.interaction);
  const itx = newInteraction(session, spec);
  session.interaction = itx;
  session.phase = "interaction";
  // Timed modes (Retrieval Sprint) close themselves when time is up.
  if (itx.timeLimit) {
    setTimeout(() => {
      if (session.interaction === itx && itx.open) {
        itx.open = false;
        broadcast(session);
      }
    }, itx.timeLimit * 1000 + 500);
  }
}

/* ------------------------------------------------------------------ */
/* Payload sanitising                                                 */
/* ------------------------------------------------------------------ */

function sanitizePayload(itx, payload) {
  if (!payload || typeof payload !== "object") return null;

  if (WORD_MODES.has(itx.mode)) {
    let words = Array.isArray(payload.words) ? payload.words : [];
    const maxLen = itx.mode === "mindmap" ? 40 : 30; // mindmap allows short phrases
    const cap =
      itx.mode === "one_word" || itx.multi === false ? 1 : itx.mode === "mindmap" ? 6 : 5;
    words = words
      .map((w) => String(w).trim().replace(/\s+/g, " ").slice(0, maxLen))
      .filter(Boolean)
      .slice(0, cap);
    return words.length ? { words } : null;
  }

  if (CHOICE_MODES.has(itx.mode)) {
    const i = payload.choice;
    if (!Number.isInteger(i) || i < 0 || i >= itx.options.length) return null;
    return { choice: i };
  }

  if (itx.mode === "example_nonexample") {
    const i = payload.choice;
    if (!Number.isInteger(i) || i < 0 || i >= itx.options.length) return null;
    const text = String(payload.text || "").trim().slice(0, 300);
    return { choice: i, text };
  }

  if (ORDER_MODES.has(itx.mode)) {
    const order = Array.isArray(payload.order) ? payload.order : [];
    const n = itx.options.length;
    const valid =
      order.length === n &&
      [...order].sort((a, b) => a - b).every((v, i) => v === i);
    return valid ? { order } : null;
  }

  if (itx.mode === "post_its") {
    const seen = new Set();
    const notes = (Array.isArray(payload.notes) ? payload.notes : [])
      .map((n) => String(n).trim().replace(/\s+/g, " ").slice(0, 140))
      .filter((n) => {
        if (!n || seen.has(n.toLowerCase())) return false;
        seen.add(n.toLowerCase());
        return true;
      })
      .slice(0, itx.multi === false ? 1 : 4);
    return notes.length ? { notes } : null;
  }

  if (itx.mode === "venn") {
    let items = Array.isArray(payload.items) ? payload.items : [];
    const seen = new Set();
    items = items
      .map((it) => ({
        text: String(it?.text || "").trim().replace(/\s+/g, " ").slice(0, 40),
        region: it?.region,
      }))
      .filter((it) => it.text && [0, 1, 2].includes(it.region))
      .filter((it) => {
        const k = it.region + "|" + it.text.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, itx.multi === false ? 1 : 6);
    return items.length ? { items } : null;
  }

  if (itx.mode === "match_up") {
    const matches = Array.isArray(payload.matches) ? payload.matches : [];
    const n = itx.pairs.length;
    const valid = matches.length === n && matches.every((m) => Number.isInteger(m) && m >= 0 && m < n);
    return valid ? { matches } : null;
  }

  if (STRUCTURED_FIELDS[itx.mode]) {
    const fields = STRUCTURED_FIELDS[itx.mode];
    let parts = Array.isArray(payload.parts) ? payload.parts : [];
    parts = fields.map((_, i) => String(parts[i] || "").trim().slice(0, 400));
    return parts.some(Boolean) ? { parts } : null;
  }

  if (itx.mode === "sketch") {
    const image = String(payload.image || "");
    if (!image.startsWith("data:image/png;base64,") || image.length > 400000) return null;
    return { image };
  }

  const text = String(payload.text || "").trim().slice(0, itx.mode === "retrieval_sprint" ? 1500 : 500);
  return text ? { text } : null;
}

/* ------------------------------------------------------------------ */

// Drop dead sockets so the roster stays honest.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  }
}, 15000);

// Tidy sessions older than 6 hours.
setInterval(() => {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const [code, s] of sessions) if (s.createdAt < cutoff) sessions.delete(code);
}, 10 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`Eyes Up running → http://localhost:${PORT}`);
});
