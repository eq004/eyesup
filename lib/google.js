/* Sign in with Google — checks the ID token Google hands the browser.
   No dependency: the token is a signed note (RS256) and Google publishes
   the public keys. We accept it only when the signature is Google's, it
   was made for this site (aud), it hasn't expired, and Google has
   verified the email address. */
const crypto = require("crypto");

const CERTS_URL = process.env.GOOGLE_CERTS_URL || "https://www.googleapis.com/oauth2/v3/certs";
let cache = { at: 0, keys: [] };

async function googleKeys(force) {
  const age = Date.now() - cache.at;
  // Keys rotate every few days: an hour's memory, and at most one forced refresh a minute.
  if (cache.keys.length && (force ? age < 60000 : age < 3600000)) return cache.keys;
  const r = await fetch(CERTS_URL, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("google_certs_unavailable");
  const j = await r.json();
  cache = { at: Date.now(), keys: Array.isArray(j.keys) ? j.keys : [] };
  return cache.keys;
}

const b64u = (s) => Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64");

// → { sub, email, name } or null. Throws only when Google's keys can't be fetched.
async function verifyGoogleIdToken(token, clientId) {
  if (typeof token !== "string" || token.length > 4096 || !clientId) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let head, body;
  try {
    head = JSON.parse(b64u(parts[0]).toString("utf8"));
    body = JSON.parse(b64u(parts[1]).toString("utf8"));
  } catch {
    return null;
  }
  if (!head || head.alg !== "RS256" || typeof head.kid !== "string" || !body) return null;
  let jwk = (await googleKeys()).find((k) => k.kid === head.kid);
  if (!jwk) jwk = (await googleKeys(true)).find((k) => k.kid === head.kid);
  if (!jwk || jwk.kty !== "RSA") return null;
  let ok = false;
  try {
    const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
    ok = crypto.verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), key, b64u(parts[2]));
  } catch {
    return null;
  }
  if (!ok) return null;
  const now = Date.now() / 1000;
  if (body.aud !== clientId) return null;
  if (body.iss !== "accounts.google.com" && body.iss !== "https://accounts.google.com") return null;
  if (!(Number(body.exp) > now - 30)) return null;
  if (Number(body.iat) > now + 300) return null;
  const email = String(body.email || "").trim().toLowerCase();
  if (!body.sub || !email || body.email_verified !== true) return null;
  return { sub: String(body.sub), email: email.slice(0, 120), name: String(body.name || "").trim().slice(0, 40) };
}

module.exports = { verifyGoogleIdToken };
