/* Eyes Up — Cloudflare Stream, the home for students' video clips (Drop a Video).

   The server never carries video bytes. It asks Stream for a one-time upload
   address, the student's device sends the clip straight there, and Stream
   converts it so it plays on every screen. Afterwards the server only ever
   holds the clip's id. Dormant until CF_ACCOUNT_ID and CF_STREAM_TOKEN are set
   (an API token with Stream edit rights). CF_STREAM_API points at a stand-in
   for local tests. */
const API = (process.env.CF_STREAM_API || "https://api.cloudflare.com/client/v4").replace(/\/$/, "");
const ACCOUNT = (process.env.CF_ACCOUNT_ID || "").trim();
const TOKEN = (process.env.CF_STREAM_TOKEN || "").trim();

const ready = () => !!(ACCOUNT && TOKEN);

async function call(method, path, body) {
  if (!ready()) throw new Error("stream_off");
  const res = await fetch(`${API}/accounts/${ACCOUNT}/stream${path}`, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let j = null;
  try { j = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  // A delete answers 200 with an empty body; anything else is JSON with success true or false.
  if (!res.ok || (j && j.success === false)) {
    const why = j?.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`;
    throw new Error(`stream ${method} ${path}: ${why}`);
  }
  return j ? j.result : null;
}

// A one-time address the student's device uploads to; the clip may be at most maxSeconds long.
async function directUpload({ maxSeconds, meta }) {
  const r = await call("POST", "/direct_upload", {
    maxDurationSeconds: Math.max(1, Math.min(600, Math.round(maxSeconds || 30) + 2)),
    expiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    requireSignedURLs: false,
    meta: meta || {},
  });
  return { uploadURL: r.uploadURL, uid: r.uid };
}

// How a clip is doing: ready to play, how long it is, and where it plays.
async function details(uid) {
  const r = await call("GET", `/${uid}`);
  const preview = r.preview || "";
  return {
    uid: r.uid,
    ready: !!r.readyToStream,
    state: r.status?.state || "",
    error: r.status?.errorReasonText || "",
    duration: typeof r.duration === "number" && r.duration > 0 ? Math.round(r.duration) : null,
    thumbnail: r.thumbnail || "",
    preview,
    iframe: preview ? preview.replace(/\/watch\/?$/, "/iframe") : "",
    hls: r.playback?.hls || "",
  };
}

// An MP4 of the clip for the teacher's ZIP: ask once, then it is ready after a moment.
async function download(uid) {
  let r;
  try { r = await call("POST", `/${uid}/downloads`); } catch { r = await call("GET", `/${uid}/downloads`); }
  const d = r?.default || {};
  return { ready: d.status === "ready", url: d.url || "", percent: d.percentComplete || 0 };
}

async function remove(uid) {
  try { await call("DELETE", `/${uid}`); return true; } catch (e) { if (/404|not found/i.test(e.message)) return true; throw e; }
}

const isUid = (s) => typeof s === "string" && /^[a-f0-9]{32}$/.test(s);

module.exports = { ready, directUpload, details, download, remove, isUid };
