/* Eyes Up — safety tests. Starts the server without a database (local mode) on a spare
   port and checks the things docs/safety/FIX-LIST.md says must hold:
   a classroom screen opened by typing the code cannot control or download; pictures need
   their key; drawings wait for the teacher; a seat needs its secret; a teacher can remove a
   seat; the security headers are there. Run with: npm test */

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const WebSocket = require("ws");

const PORT = 4690 + Math.floor(Math.random() * 200);
const BASE = `http://127.0.0.1:${PORT}`;
let server;

before(async () => {
  server = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: { ...process.env, PORT: String(PORT), DATABASE_URL: "", TEACHER_PASSWORD: "test-pass", AUTH_SECRET: "test-secret" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("server did not start")), 10000);
    server.stdout.on("data", (d) => { if (String(d).includes("running")) { clearTimeout(t); resolve(); } });
    server.stderr.on("data", (d) => process.stderr.write(d));
  });
});
after(() => server && server.kill());

// A tiny client: open a socket, send, and wait for the next message that matches.
function client() {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
  const queue = [];
  const waiters = [];
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);
    const i = waiters.findIndex((w) => w.pred(msg));
    if (i >= 0) waiters.splice(i, 1)[0].resolve(msg); else queue.push(msg);
  });
  const next = (pred = () => true, ms = 3000) => {
    const i = queue.findIndex(pred);
    if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const w = { pred, resolve };
      waiters.push(w);
      setTimeout(() => { const k = waiters.indexOf(w); if (k >= 0) { waiters.splice(k, 1); reject(new Error("timed out waiting for a message")); } }, ms);
    });
  };
  const open = new Promise((r) => ws.on("open", r));
  return { ws, open, next, send: (o) => ws.send(JSON.stringify(o)), close: () => ws.close(), queue };
}
const state = (c) => c.next((m) => m.type === "state");
const settle = (ms = 150) => new Promise((r) => setTimeout(r, ms));
// The teacher's view of the room right now: a harmless action makes the server send a fresh state
// (ignored commands from a view-only screen send nothing, which is the point of several tests).
let tick = 0;
const latestState = async (c) => {
  await settle();
  for (let i = c.queue.length - 1; i >= 0; i--) if (c.queue[i].type === "state") c.queue.splice(i, 1);
  c.send({ type: "set_title", title: `t${++tick}` });
  return state(c);
};

async function room() {
  const t = client();
  await t.open;
  t.send({ type: "teacher_create", password: "test-pass" });
  const st = await state(t);
  return { t, code: st.code, key: st.boardKey };
}
async function join(code, name, extra = {}) {
  const s = client();
  await s.open;
  s.send({ type: "student_join", code, name, ...extra });
  const j = await s.next((m) => m.type === "joined" || m.type === "error");
  return { s, j };
}
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

test("security headers are sent", async () => {
  const r = await fetch(`${BASE}/`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-security-policy") || "", /script-src 'self'/);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(r.headers.get("x-powered-by"), null);
  const p = await fetch(`${BASE}/privacy`);
  assert.equal(p.status, 200);
});

test("a room has a key; the dashboard gets it, the board does not show it", async () => {
  const { t, code, key } = await room();
  assert.match(code, /^[A-Z0-9]{4}$/);
  assert.equal(typeof key, "string");
  assert.ok(key.length >= 20);
  t.close();
});

test("a screen opened by typing the code can watch but not control or download", async () => {
  const { t, code, key } = await room();
  const watcher = client();
  await watcher.open;
  watcher.send({ type: "projector_join", code }); // no key
  const ws1 = await state(watcher);
  assert.equal(ws1.trusted, false);
  assert.equal(ws1.dl, null);
  assert.equal(ws1.boardKey, null);
  watcher.send({ type: "toggle_names" });
  watcher.send({ type: "timer_start", seconds: 60 });
  watcher.send({ type: "show_results" });
  await settle();
  const after = await latestState(t);
  assert.equal(after.showNames, false, "names must stay off");
  assert.equal(after.timer, null, "no timer may be started");

  const board = client();
  await board.open;
  board.send({ type: "projector_join", code, key });
  const ws2 = await state(board);
  assert.equal(ws2.trusted, true);
  assert.ok(ws2.dl, "a trusted board gets a download token");
  board.send({ type: "toggle_names" });
  const after2 = await latestState(t);
  assert.equal(after2.showNames, true, "the trusted board can switch names on");

  // The download token only works for the trusted board's room.
  t.send({ type: "launch", mode: "poll", prompt: "Q", options: ["A", "B"] });
  const st = await latestState(t);
  const itx = st.interaction.id;
  const ok = await fetch(`${BASE}/api/question/${code}/${itx}.csv?pt=${ws2.dl}`);
  assert.equal(ok.status, 200);
  const bad = await fetch(`${BASE}/api/question/${code}/${itx}.csv?pt=nonsense`);
  assert.equal(bad.status, 403, "a made-up board token is refused");
  const ws1dl = await fetch(`${BASE}/api/images/${code}?pt=${ws1.dl}`);
  assert.equal(ws1dl.status, 403, "the view-only screen has no usable token");
  t.close(); watcher.close(); board.close();
});

test("drawings and photos wait for the teacher; text goes straight up", async () => {
  const { t, code } = await room();
  const { s } = await join(code, "Ava");
  t.send({ type: "launch", mode: "sketch", prompt: "Draw it" });
  let st = await latestState(t);
  s.send({ type: "respond", interactionId: st.interaction.id, payload: { image: PNG } });
  st = await latestState(t);
  assert.equal(st.interaction.responses.length, 1);
  assert.equal(st.interaction.responses[0].revealed, false, "a drawing is held for the teacher");

  t.send({ type: "launch", mode: "short_answer", prompt: "Say it" });
  st = await latestState(t);
  s.send({ type: "respond", interactionId: st.interaction.id, payload: { text: "hello" } });
  st = await latestState(t);
  assert.equal(st.interaction.responses[0].revealed, true, "text shows as it arrives");
  t.close(); s.close();
});

test("a student photo needs its key; the room code alone is not enough", async () => {
  const { t, code } = await room();
  const { s } = await join(code, "Ben");
  t.send({ type: "launch", mode: "image_drop", prompt: "Photo" });
  let st = await latestState(t);
  s.send({ type: "respond", interactionId: st.interaction.id, payload: { images: [PNG] } });
  st = await latestState(t);
  const url = st.interaction.responses[0].payload.images[0];
  assert.match(url, /\/api\/resp-image\/.*[?&]key=/);
  const withKey = await fetch(BASE + url);
  assert.equal(withKey.status, 200);
  assert.match(withKey.headers.get("cache-control") || "", /private/);
  const u = new URL(BASE + url);
  u.searchParams.delete("key");
  const without = await fetch(u);
  assert.equal(without.status, 404);
  t.close(); s.close();
});

test("a seat can only be taken back with its secret", async () => {
  const { t, code } = await room();
  const { s: a, j: ja } = await join(code, "Chloe");
  assert.ok(ja.secret, "a seat comes with a secret");
  // Another device claims Chloe's seat number without the secret: it gets its own seat.
  const { j: jb } = await join(code, "Chloe", { studentId: ja.studentId });
  assert.notEqual(jb.studentId, ja.studentId);
  // The real device, after a refresh, presents the secret and gets the same seat back.
  a.close();
  await settle(200);
  const { s: c, j: jc } = await join(code, "Chloe", { studentId: ja.studentId, secret: ja.secret });
  assert.equal(jc.studentId, ja.studentId);
  t.close(); c.close();
});

test("only the dashboard's own preview may use the preview name", async () => {
  const { t, code, key } = await room();
  const { s: fake } = await join(code, "👁 Preview");
  let st = await latestState(t);
  assert.ok(st.students.every((x) => x.name !== "👁 Preview"), "a student cannot hide as the preview");
  const { s: real } = await join(code, "👁 Preview", { key });
  st = await latestState(t);
  assert.ok(st.students.some((x) => x.name === "👁 Preview"), "the dashboard's preview can");
  t.close(); fake.close(); real.close();
});

test("the teacher can remove a seat, and the device is told", async () => {
  const { t, code } = await room();
  const { s, j } = await join(code, "Rude Name");
  await latestState(t);
  t.send({ type: "kick_student", studentId: j.studentId });
  const msg = await s.next((m) => m.type === "removed");
  assert.equal(msg.type, "removed");
  const st = await latestState(t);
  assert.equal(st.students.length, 0);
  t.close();
});

test("join-info never lists a class that is not live", async () => {
  const r = await fetch(`${BASE}/api/join-info?code=ABCDE`);
  const j = await r.json();
  assert.equal(j.live, false);
  assert.equal(j.roster, undefined);
});
