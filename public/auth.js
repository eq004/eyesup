/* Eyes Up — how a signed-in page proves who it is.

   The sign-in token lives in localStorage and is sent as an Authorization header,
   never in a web address. Links that cannot carry a header (a PDF report, a ZIP of
   pictures, a stored picture, a slide) get a short-lived download token instead
   (?d=…, valid 10 minutes, GET only), fetched from /api/dl-token and refreshed
   every 4 minutes while the page is open. Mark such links data-dl and they are
   stamped with a fresh token at the moment they are clicked. */
(function () {
  const KEY = "eyesup_token";
  let dl = { d: "", at: 0 };
  let timer = null;
  let readyResolve;
  const ready = new Promise((r) => (readyResolve = r));

  const token = () => { try { return localStorage.getItem(KEY) || ""; } catch { return ""; } };
  const headers = (extra = {}) => { const t = token(); return t ? { ...extra, Authorization: "Bearer " + t } : { ...extra }; };
  const fetchAuth = (url, opts = {}) => fetch(url, { ...opts, headers: headers(opts.headers || {}) });

  async function refresh() {
    const t = token();
    if (!t) { dl = { d: "", at: 0 }; readyResolve(""); return ""; }
    try {
      const r = await fetch("/api/dl-token", { headers: headers(), cache: "no-store" });
      if (r.ok) { const j = await r.json(); dl = { d: j.d, at: Date.now() }; }
      else if (r.status === 403) dl = { d: "", at: 0 };
    } catch { /* offline — links keep whatever token they had */ }
    readyResolve(dl.d);
    return dl.d;
  }
  const current = () => dl.d;
  const query = () => (dl.d ? "d=" + encodeURIComponent(dl.d) : "");
  // The same address with a fresh download token (and never the sign-in token).
  function withDl(url) {
    try {
      const u = new URL(url, location.origin);
      u.searchParams.delete("t");
      if (dl.d) u.searchParams.set("d", dl.d); else u.searchParams.delete("d");
      return u.pathname + u.search + u.hash;
    } catch { return url; }
  }
  function start() {
    refresh();
    clearInterval(timer);
    timer = setInterval(refresh, 4 * 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && Date.now() - dl.at > 4 * 60 * 1000) refresh(); });
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[data-dl]");
    if (a && token()) a.href = withDl(a.getAttribute("href"));
  }, true);

  window.EUAuth = { token, headers, fetch: fetchAuth, refresh, ready, current, withDl, query, start, KEY };
  start();
})();
