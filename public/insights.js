/* Eyes Up — the lesson insights page (teacher view and the public share view). */
const wrap = document.getElementById("wrap");
const esc = LV.esc;
const params = new URLSearchParams(location.search);
const key = params.get("share");
const lessonId = params.get("lesson");
const dq = params.get("d") || "";

async function boot() {
  let s;
  const teacherView = !!lessonId;
  if (teacherView) {
    // Teacher's own copy — full detail, student names included.
    try {
      const res = EUAuth.token() ? await EUAuth.fetch(`/api/lessons/${encodeURIComponent(lessonId)}`) : await fetch(`/api/lessons/${encodeURIComponent(lessonId)}?d=${encodeURIComponent(dq)}`);
      if (!res.ok) throw new Error();
      s = await res.json();
    } catch {
      wrap.innerHTML = `<div class="gate">🔒<br/><b>Sign in first.</b><br/><span class="muted">Open the <a href="/teacher" style="color:var(--accent);font-weight:700">teacher dashboard</a>, sign in, then come back here.</span></div>`;
      return;
    }
  } else {
    if (!key) {
      wrap.innerHTML = `<div class="gate muted">This page needs a share link from a teacher.</div>`;
      return;
    }
    try {
      const res = await fetch(`/api/shared/${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error();
      s = await res.json();
    } catch {
      wrap.innerHTML = `<div class="gate">🔗<br/><b>This link isn't valid.</b><br/><span class="muted">Ask the teacher who shared it for a fresh one.</span></div>`;
      return;
    }
  }
  if (!teacherView) document.getElementById("pageKind").textContent = "· Shared lesson dashboard";
  const when = s.createdAt
    ? new Date(s.createdAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })
    : "";
  const nResp = (s.items || []).reduce((a, it) => a + (it.responses || 0), 0);
  wrap.innerHTML = `
    <h1 class="title">${esc(window.LV ? LV.title(s) : (s.title || "Lesson dashboard"))}</h1>
    <div class="lmeta">${[when, s.teacherName ? (teacherView ? esc(s.teacherName) : `Shared by ${esc(s.teacherName)}`) : ""].filter(Boolean).join(" · ")}</div>
    <div class="stats">
      <div class="st"><b>${window.LV ? LV.shown(LV.normalise(s)).length : (s.items || []).length}</b><span>activities</span></div>
      <div class="st"><b>${nResp}</b><span>responses</span></div>
      <div class="st"><b>${s.participatedCount ?? "—"}/${s.joinedCount ?? "—"}</b><span>students participated</span></div>
    </div>
    ${teacherView ? `<div class="no-print" style="margin-bottom:1.2rem"><button class="pdf-btn" id="printBtn">🖨 Export as PDF / print</button> <span class="muted" style="font-size:0.78rem;margin-left:0.5rem">Includes every student's name and answer.</span></div>` : ""}
    <div id="insBox"></div>`;
  renderInsights(document.getElementById("insBox"), s, {
    showNames: teacherView,
    note: teacherView ? "" : "👁 View-only shared dashboard — class results only, no student names.",
  });
}
boot().then(() => { const b = document.getElementById("printBtn"); if (b) b.onclick = () => window.print(); });
