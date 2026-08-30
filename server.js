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
const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
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
// When set: gates the teacher dashboard (password mode without a database,
// signup invite code in account mode). Students never need it.
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || "";

/* ------------------------------------------------------------------ */
/* Optional persistent storage (Supabase/Postgres via DATABASE_URL).  */
/* Without it, everything still works — sessions are just in-memory   */
/* plus the dashboard's browser autosave.                             */
/* ------------------------------------------------------------------ */

let db = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require("pg");
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
  });
  db.query(`CREATE TABLE IF NOT EXISTS lessons (
      id serial PRIMARY KEY,
      code text NOT NULL,
      title text,
      created_at timestamptz NOT NULL,
      saved_at timestamptz NOT NULL DEFAULT now(),
      summary jsonb NOT NULL,
      UNIQUE (code, created_at)
    )`)
    .then(() =>
      db.query(`CREATE TABLE IF NOT EXISTS teachers (
        id serial PRIMARY KEY,
        username text UNIQUE NOT NULL,
        display_name text,
        pass_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`)
    )
    .then(() => db.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS teacher_id int`))
    .then(() => db.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS teacher_name text`))
    .then(() => console.log("Storage connected — lessons persist to Postgres"))
    .catch((e) => {
      console.error("Storage init failed (continuing without):", e.message);
      db = null;
    });
}

/* ---- teacher accounts (active only in database mode) ----
   Tokens are stateless: HMAC over the account's password hash, so they
   survive server restarts and die if the password changes. */

const AUTH_SECRET = TEACHER_PASSWORD || "eyesup-local-secret";

function signToken(id, passHash) {
  const mac = crypto.createHmac("sha256", AUTH_SECRET).update(`${id}:${passHash}`).digest("hex");
  return `${id}.${mac}`;
}

async function teacherFromToken(token) {
  if (!db || typeof token !== "string" || !token.includes(".")) return null;
  const id = parseInt(token.split(".")[0], 10);
  if (!Number.isInteger(id)) return null;
  try {
    const { rows } = await db.query(
      `SELECT id, username, display_name, pass_hash FROM teachers WHERE id = $1`, [id]
    );
    if (!rows[0]) return null;
    return token === signToken(rows[0].id, rows[0].pass_hash) ? rows[0] : null;
  } catch {
    return null;
  }
}

// Debounced write of the session's full summary — every response nudges it,
// at most one write per few seconds per session.
function persistSession(session) {
  if (!db || session.persistTimer) return;
  session.persistTimer = setTimeout(async () => {
    session.persistTimer = null;
    try {
      const summary = buildSummary(session);
      if (!summary.interactionCount) return; // nothing worth keeping yet
      await db.query(
        `INSERT INTO lessons (code, title, created_at, saved_at, summary, teacher_id, teacher_name)
         VALUES ($1, $2, $3, now(), $4, $5, $6)
         ON CONFLICT (code, created_at)
         DO UPDATE SET title = $2, saved_at = now(), summary = $4, teacher_id = $5, teacher_name = $6`,
        [session.code, session.title, new Date(session.createdAt), summary,
         session.teacherId ?? null, session.teacherName ?? null]
      );
    } catch (e) {
      console.error("persist failed:", e.message);
    }
  }, 4000);
}
const app = express();
app.use(express.json({ limit: "16kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Friendly routes
app.get("/teacher", (_req, res) => res.sendFile(path.join(__dirname, "public/teacher.html")));
app.get("/join", (_req, res) => res.sendFile(path.join(__dirname, "public/student.html")));
app.get("/projector", (_req, res) => res.sendFile(path.join(__dirname, "public/projector.html")));
app.get("/report", (_req, res) => res.sendFile(path.join(__dirname, "public/report.html")));
app.get("/remote", (_req, res) => res.sendFile(path.join(__dirname, "public/remote.html")));

// Teacher-uploaded images (annotate mode), served over HTTP so websocket
// broadcasts stay light — clients just get a URL.
app.get("/api/image/:code/:id", (req, res) => {
  const session = sessions.get(String(req.params.code || "").toUpperCase());
  const dataUrl = session?.images.get(Number(req.params.id));
  const m = dataUrl?.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!m) return res.status(404).end();
  res.set("Cache-Control", "public, max-age=3600");
  res.type(m[1]).send(Buffer.from(m[2], "base64"));
});

/* ---- teacher accounts (database mode) ---- */

app.post("/api/signup", async (req, res) => {
  if (!db) return res.status(400).json({ error: "storage_off" });
  const { invite, username, password, name } = req.body || {};
  if (TEACHER_PASSWORD && invite !== TEACHER_PASSWORD)
    return res.status(403).json({ error: "bad_invite" });
  const u = String(username || "").trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,24}$/.test(u)) return res.status(400).json({ error: "bad_username" });
  if (String(password || "").length < 6) return res.status(400).json({ error: "bad_pass" });
  const hash = bcrypt.hashSync(String(password), 10);
  try {
    const { rows } = await db.query(
      `INSERT INTO teachers (username, display_name, pass_hash)
       VALUES ($1, $2, $3) RETURNING id, username, display_name, pass_hash`,
      [u, String(name || "").trim().slice(0, 40) || u, hash]
    );
    res.json({ token: signToken(rows[0].id, rows[0].pass_hash), name: rows[0].display_name, username: u });
  } catch (e) {
    if (String(e.message).includes("duplicate")) return res.status(409).json({ error: "taken" });
    res.status(500).json({ error: "db_error" });
  }
});

app.post("/api/login", async (req, res) => {
  if (!db) return res.status(400).json({ error: "storage_off" });
  try {
    const u = String(req.body?.username || "").trim().toLowerCase();
    const { rows } = await db.query(`SELECT * FROM teachers WHERE username = $1`, [u]);
    const t = rows[0];
    if (!t || !bcrypt.compareSync(String(req.body?.password || ""), t.pass_hash))
      return res.status(403).json({ error: "bad_login" });
    res.json({ token: signToken(t.id, t.pass_hash), name: t.display_name, username: t.username });
  } catch {
    res.status(500).json({ error: "db_error" });
  }
});

// Past lessons archive — each teacher sees their own (plus pre-account legacy rows).
app.get("/api/lessons", async (req, res) => {
  if (!db) return res.json({ storage: false, lessons: [] });
  const t = await teacherFromToken(req.query.t);
  if (!t) return res.status(403).json({ error: "auth_required" });
  try {
    const { rows } = await db.query(
      `SELECT id, code, title, created_at, teacher_name,
              summary->>'participatedCount' AS participated,
              summary->>'joinedCount' AS joined,
              summary->>'interactionCount' AS interactions
       FROM lessons
       WHERE teacher_id = $1 OR teacher_id IS NULL
       ORDER BY created_at DESC LIMIT 200`,
      [t.id]
    );
    res.json({ storage: true, lessons: rows });
  } catch (e) {
    res.status(500).json({ error: "db_error" });
  }
});

app.get("/api/lessons/:id", async (req, res) => {
  if (!db) return res.status(404).json({ error: "storage_off" });
  const t = await teacherFromToken(req.query.t);
  if (!t) return res.status(403).json({ error: "auth_required" });
  try {
    const { rows } = await db.query(
      `SELECT * FROM lessons WHERE id = $1 AND (teacher_id = $2 OR teacher_id IS NULL)`,
      [req.params.id, t.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "not_found" });
    const r = rows[0];
    res.json({ ...r.summary, code: r.code, title: r.title, createdAt: new Date(r.created_at).getTime() });
  } catch (e) {
    res.status(500).json({ error: "db_error" });
  }
});

// Summary as JSON for the printable report. The session code is the key,
// same trust model as joining the room.
app.get("/api/summary/:code", async (req, res) => {
  if (db) {
    // Account mode: only the session's owner may pull its report.
    const t = await teacherFromToken(req.query.t);
    if (!t) return res.status(403).json({ error: "auth_required" });
    const session = sessions.get(String(req.params.code || "").toUpperCase());
    if (!session) return res.status(404).json({ error: "no_session" });
    if (session.teacherId != null && session.teacherId !== t.id)
      return res.status(403).json({ error: "auth_required" });
    return res.json({ ...buildSummary(session), code: session.code, createdAt: session.createdAt });
  }
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
    title: "",
    images: new Map(), // interaction id -> uploaded image dataURL (annotate mode)
    createdAt: Date.now(),
    teachers: new Set([teacherWs]), // dashboard + any phone remotes, all in control
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
  "make_connection", "finish_sentence", "quick_challenge", "picture_prompt",
]);
const CHOICE_MODES = new Set(["poll", "agree_disagree", "confidence", "this_or_that", "true_false", "multi_choice", "smiley", "picture_vote"]);
const WORD_MODES = new Set(["word_cloud", "one_word", "mindmap"]);
const ORDER_MODES = new Set(["ranking", "put_in_order"]);
// Responses in these modes never carry a name anywhere.
const ANON_MODES = new Set(["ask_question", "muddiest_point"]);
// Custom options entered by the teacher at launch.
const OPTION_MODES = new Set(["poll", "this_or_that", "ranking", "put_in_order", "example_nonexample", "venn", "multi_choice", "scale", "picture_vote"]);

const FIXED_OPTIONS = {
  agree_disagree: ["Agree", "Unsure", "Disagree"],
  confidence: ["I've got it", "I'm nearly there", "I'm confused"],
  true_false: ["True", "False"],
  smiley: ["😢", "🙁", "😐", "🙂", "😄"], // saddest on the left → happiest on the right
};

const STRUCTURED_FIELDS = {
  three_two_one: ["3 ideas you remember", "2 connections between ideas", "1 question you still have"],
  notice_wonder: ["I notice…", "I wonder…"],
  before_after: ["Before, I thought…", "Now I think…"],
};

const TIME_LIMITS = { retrieval_sprint: 60 }; // seconds

// Phonics keyboard: the graphemes students may build words from.
// "-e" is the silent-e tile (renders as e, flagged for the teacher).
const PHONICS_TOKENS = new Set([
  ..."abcdefghijklmnopqrstuvwxyz",
  "qu", "oo", "ch", "sh", "th", "ph", "ck", "wh", "ng",
  "ow", "er", "ar", "ai", "ay", "ee", "ea", "igh", "oa", "oi", "oy", "-e",
]);

// Does the teacher gate this response type onto the projector?
function isRevealMode(mode) {
  return (
    TEXT_MODES.has(mode) || STRUCTURED_FIELDS[mode] ||
    mode === "sketch" || mode === "annotate" || mode === "example_nonexample" ||
    mode === "post_its" || mode === "phonics"
  );
}

// Modes where the teacher chooses "one response each" vs "multiple".
const MULTI_MODES = new Set(["word_cloud", "mindmap", "post_its", "venn"]);

function newInteraction(session, { mode, prompt, options, correct, moderated, multi, image }) {
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
  if (mode === "scale") {
    // A continuum needs two ends; sensible defaults keep launch instant.
    opts = [(opts && opts[0]) || "Disagree", (opts && opts[1]) || "Agree"];
  }
  let imageUrl = null;
  if (
    (mode === "annotate" || mode === "picture_prompt" || mode === "picture_vote") &&
    typeof image === "string" &&
    /^data:image\/(png|jpeg|webp);base64,/.test(image) &&
    image.length < 900000
  ) {
    session.images.set(session.counter, image);
    imageUrl = `/api/image/${session.code}/${session.counter}`;
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
    imageUrl,
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

  if (itx.mode === "scale") {
    const values = responses.map((r) => r.payload.value);
    const avg = values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : null;
    return { ...base, labels: itx.options, values, avg };
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

  if (itx.mode === "sketch" || itx.mode === "annotate") {
    const revealed = responses.filter((r) => r.revealed).map((r) => ({ image: r.payload.image }));
    return { ...base, sketches: revealed, revealedCount: revealed.length };
  }

  if (itx.mode === "phonics") {
    const revealed = responses.filter((r) => r.revealed).map((r) => ({ parts: r.payload.parts }));
    return { ...base, builds: revealed, revealedCount: revealed.length };
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
    title: session.title,
    lanHost: `${lanAddress()}:${PORT}`, // so the dashboard can QR the phone remote locally
    storage: !!db, // lessons persist to Postgres
    teacherName: session.teacherName || null,
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
          imageUrl: itx.imageUrl,
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
    title: session.title,
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
          imageUrl: itx.imageUrl,
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
            imageUrl: itx.imageUrl,
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
  const ts = teacherState(session);
  for (const t of session.teachers) safeSend(t, ts);
  for (const p of session.projectors) safeSend(p, projectorState(session));
  for (const s of session.students.values()) safeSend(s.ws, studentState(session, s));
  persistSession(session); // debounced; no-op without a database
}

/* ------------------------------------------------------------------ */
/* Summary                                                            */
/* ------------------------------------------------------------------ */

// One readable line per response, for the per-student export.
function describePayload(itx, p) {
  if (WORD_MODES.has(itx.mode)) return (p.words || []).join(", ");
  if (itx.mode === "post_its") return (p.notes || []).join("  |  ");
  if (itx.mode === "phonics")
    return (p.parts || []).map((x) => (x === "-e" ? "e" : x)).join("·");
  if (itx.mode === "venn") {
    const zones = [`${itx.options[0]} only`, "both", `${itx.options[1]} only`];
    return (p.items || []).map((it) => `${it.text} → ${zones[it.region]}`).join("  |  ");
  }
  if (itx.mode === "scale") return `${p.value} / 100`;
  if (itx.mode === "example_nonexample")
    return `${itx.options[p.choice]}${p.text ? ` — ${p.text}` : ""}`;
  if (CHOICE_MODES.has(itx.mode)) return itx.options[p.choice];
  if (ORDER_MODES.has(itx.mode)) return (p.order || []).map((i) => itx.options[i]).join(" → ");
  if (itx.mode === "match_up") {
    const right = (p.matches || []).filter((m, i) => m === i).length;
    return `${right}/${itx.pairs.length} matched correctly`;
  }
  if (STRUCTURED_FIELDS[itx.mode])
    return (p.parts || []).filter(Boolean).join("  ·  ");
  if (itx.mode === "sketch" || itx.mode === "annotate") return "(drawing submitted)";
  return p.text || "";
}

function buildSummary(session) {
  const all = [...session.history];
  if (session.interaction) all.push(session.interaction);

  const participants = new Set();
  for (const itx of all) for (const sid of itx.responses.keys()) participants.add(sid);

  const items = all.map((itx) => {
    const agg = aggregate(session, itx);
    const item = { mode: itx.mode, prompt: itx.prompt, responses: itx.responses.size };

    // Per-student attribution for the export — except the modes that
    // promise students anonymity, which stay anonymous everywhere.
    const anon = ANON_MODES.has(itx.mode);
    item.anonymous = anon;
    item.students = [...itx.responses.values()]
      .filter((r) => r.name !== "👁 Preview")
      .map((r) => ({ name: anon ? null : r.name, response: describePayload(itx, r.payload) }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!anon) {
      item.noResponse = [...session.everJoined.entries()]
        .filter(([id, n]) => n !== "👁 Preview" && !itx.responses.has(id))
        .map(([, n]) => n)
        .sort();
    }
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
    if (itx.mode === "sketch" || itx.mode === "annotate") item.sketchCount = itx.responses.size;
    if (itx.mode === "venn")
      item.venn = { labels: itx.options, regions: agg.regions.map((r) => r.slice(0, 8)) };
    if (itx.mode === "post_its")
      item.answers = [...itx.responses.values()].flatMap((r) => r.payload.notes || []).slice(0, 60);
    if (itx.mode === "phonics")
      item.answers = [...itx.responses.values()]
        .map((r) => (r.payload.parts || []).map((p) => (p === "-e" ? "e" : p)).join("·"))
        .slice(0, 40);
    if (itx.mode === "scale") item.scale = { labels: itx.options, avg: agg.avg };
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
    title: session.title,
    teacherName: session.teacherName || null,
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
    handle(ws, msg).catch((err) => console.error("handler error:", err));
  });

  ws.on("close", () => {
    const session = sessions.get(ws.meta.code);
    if (!session) return;
    if (ws.meta.role === "student" && session.students.get(ws.meta.studentId)?.ws === ws) {
      session.students.delete(ws.meta.studentId);
      broadcast(session);
    } else if (ws.meta.role === "projector") {
      session.projectors.delete(ws);
    } else if (ws.meta.role === "teacher") {
      session.teachers.delete(ws); // session survives; teacher can resume with the code
    }
  });
});

// In database mode teachers authenticate with an account token; without a
// database the shared TEACHER_PASSWORD gate applies (local dev).
async function authTeacher(msg) {
  if (db) {
    const t = await teacherFromToken(msg.token);
    return t ? { ok: true, teacher: t } : { ok: false, error: "auth_required" };
  }
  if (TEACHER_PASSWORD && msg.password !== TEACHER_PASSWORD)
    return { ok: false, error: "bad_password" };
  return { ok: true, teacher: null };
}

async function handle(ws, msg) {
  const { type } = msg;

  /* ---- connection / identity ---- */

  if (type === "teacher_create") {
    const auth = await authTeacher(msg);
    if (!auth.ok) return safeSend(ws, { type: "error", error: auth.error });
    const session = createSession(ws);
    if (auth.teacher) {
      session.teacherId = auth.teacher.id;
      session.teacherName = auth.teacher.display_name;
    }
    ws.meta = { role: "teacher", code: session.code };
    broadcast(session);
    return;
  }

  if (type === "teacher_resume") {
    const auth = await authTeacher(msg);
    if (!auth.ok) return safeSend(ws, { type: "error", error: auth.error });
    const session = sessions.get(String(msg.code || "").toUpperCase());
    if (!session) return safeSend(ws, { type: "error", error: "no_session" });
    // A session belongs to its teacher — others can't take it over.
    if (session.teacherId != null && auth.teacher?.id !== session.teacherId)
      return safeSend(ws, { type: "error", error: "no_session" });
    session.teachers.add(ws);
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
        image:
          typeof it.image === "string" && it.image.startsWith("data:image/") && it.image.length < 900000
            ? it.image
            : undefined,
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
    case "set_title": {
      session.title = String(msg.title || "").trim().slice(0, 80);
      break;
    }
    case "get_summary": {
      safeSend(ws, buildSummary(session));
      return; // no broadcast needed
    }
    case "end_session": {
      if (session.interaction) {
        session.history.push(session.interaction);
        session.interaction = null;
      }
      session.phase = "ended";
      const summary = buildSummary(session);
      for (const t of session.teachers) safeSend(t, summary);
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
    const seen = new Set();
    words = words
      .map((w) => String(w).trim().replace(/\s+/g, " ").slice(0, maxLen))
      .filter(Boolean)
      .filter((w) => {
        // repeating your own word doesn't make it bigger
        const k = w.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
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

  if (itx.mode === "scale") {
    const v = payload.value;
    if (!Number.isInteger(v) || v < 0 || v > 100) return null;
    return { value: v };
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

  if (itx.mode === "phonics") {
    const parts = (Array.isArray(payload.parts) ? payload.parts : [])
      .map((p) => String(p).toLowerCase())
      .filter((p) => PHONICS_TOKENS.has(p))
      .slice(0, 14);
    return parts.length ? { parts } : null;
  }

  if (itx.mode === "sketch" || itx.mode === "annotate") {
    const image = String(payload.image || "");
    if (!/^data:image\/(png|jpeg);base64,/.test(image) || image.length > 600000) return null;
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
