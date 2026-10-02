/* Eyes Up — the owner's admin page.
   Who has an account, how much they use it, what plan they're on — and the
   few things only the owner can do: switch an account off, hand out a new
   password, change a plan. */

const wrap = document.getElementById("wrap");
const overlay = document.getElementById("sheetOverlay");
const sheet = document.getElementById("sheet");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const token = localStorage.getItem("eyesup_token") || "";

let data = null;
let search = "";
let filter = "all";

const day = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
const ago = (d) => {
  if (!d) return "never";
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : days < 30 ? `${days} days ago` : day(d);
};
const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

async function load() {
  if (!token) {
    wrap.innerHTML = `<div class="gate">🔒<br/><b>Sign in first.</b><br/><span class="muted">Open the <a href="/teacher">teacher dashboard</a>, sign in, then come back here.</span></div>`;
    return;
  }
  try {
    const res = await fetch(`/api/admin/overview?t=${encodeURIComponent(token)}`);
    const body = await res.json();
    if (res.status === 403) {
      wrap.innerHTML = body.error === "not_admin"
        ? `<div class="gate">🚫<br/><b>This page is for the owner of Eyes Up.</b><br/><span class="muted"><a href="/teacher">Back to your dashboard</a></span></div>`
        : `<div class="gate">🔒<br/><b>Your sign-in has expired on this device.</b><br/><span class="muted">Sign in again on the <a href="/teacher">teacher dashboard</a>, then come back.</span></div>`;
      return;
    }
    if (!res.ok) throw new Error(body.error);
    data = body;
    render();
  } catch {
    wrap.innerHTML = `<div class="gate">☁️<br/><b>Couldn't load the admin page right now.</b><br/><a href="javascript:location.reload()">Try again</a></div>`;
  }
}

// One label per account that says, in a word, where it stands.
function badge(t) {
  if (t.status === "disabled") return `<span class="badge b-disabled">Switched off</span>`;
  if (t.admin) return `<span class="badge b-owner">Owner</span>`;
  const a = t.access;
  if (t.plan === "free") return `<span class="badge b-free">Free access</span>`;
  if (t.plan === "trial")
    return a.ok || !data.billing.on
      ? `<span class="badge b-trial">Trial</span><small>ends ${day(t.trialEndsAt)}</small>`
      : `<span class="badge b-ended">Trial ended</span><small>${day(t.trialEndsAt)}</small>`;
  const name = t.plan === "school" ? "School licence" : "Subscriber";
  return a.ok || !data.billing.on
    ? `<span class="badge b-${t.plan}">${name}</span><small>${t.plan === "paid" && t.hasSubscription ? "renews" : "until"} ${day(t.paidUntil)}</small>`
    : `<span class="badge b-ended">${name} ended</span><small>${day(t.paidUntil)}</small>`;
}

function render() {
  const ts = data.teachers;
  const active30 = ts.filter((t) => t.lessons30 > 0).length;
  const paying = ts.filter((t) => t.plan === "paid" && t.access.ok && !t.admin).length;
  const trials = ts.filter((t) => t.plan === "trial" && t.access.ok).length;
  const b = data.billing;

  const q = search.trim().toLowerCase();
  const shown = ts.filter((t) => {
    if (q && !`${t.name} ${t.username} ${t.email} ${t.note}`.toLowerCase().includes(q)) return false;
    if (filter === "active") return t.lessons30 > 0;
    if (filter === "quiet") return t.lessons30 === 0;
    if (filter === "paying") return t.plan === "paid" || t.plan === "school";
    if (filter === "trial") return t.plan === "trial";
    if (filter === "off") return t.status === "disabled";
    return true;
  });

  const setup = [
    [true, "Owner access", "You're signed in as the owner. Only you can open this page."],
    [b.on, "Card payments (Stripe)", b.on ? `On — new teachers get a ${b.trialDays}-day free trial, then subscribe.` : "Not connected yet. Until it is, every account has full access and nobody is charged."],
    [b.on ? b.webhook : false, "Payment updates from Stripe", b.webhook ? "Connected — subscriptions switch on and off by themselves." : "Not connected yet (set up together with Stripe)."],
    [b.openSignup, "Public sign-up", b.openSignup ? "Anyone can create an account and start a trial." : "Invite-only — new teachers need your invite link."],
    [data.separateSecret, "Separate sign-in secret", data.separateSecret ? "Set — the invite code can be shared safely." : "Not set yet. Recommended before strangers sign up."],
    [data.ai, "AI summaries", data.ai ? "On." : "Off — needs an Anthropic API key."],
  ];

  wrap.innerHTML = `
    <div class="tiles">
      <div class="tile"><div class="v">${ts.length}</div><div class="k">teacher accounts</div></div>
      <div class="tile"><div class="v">${active30}</div><div class="k">taught in the last 30 days</div></div>
      <div class="tile"><div class="v">${ts.reduce((a, t) => a + t.lessons, 0)}</div><div class="k">lessons stored</div></div>
      <div class="tile"><div class="v">${ts.reduce((a, t) => a + t.students, 0).toLocaleString()}</div><div class="k">student joins, all time</div></div>
      <div class="tile"><div class="v">${paying}</div><div class="k">paying subscribers${trials ? ` · ${trials} on trial` : ""}</div></div>
      <div class="tile live"><div class="v">${data.live.classes}</div><div class="k">classes live right now · ${data.live.students} students</div></div>
    </div>

    <div class="card">
      <h2>Business set-up</h2>
      <div class="sub">What's switched on. Amber items aren't done yet — nothing here stops you teaching.</div>
      <div class="setup">${setup
        .map(([on, title, text]) => `<div class="item ${on ? "on" : "off"}"><span class="dot">${on ? "✓" : "!"}</span><span><b>${title}</b>${text}</span></div>`)
        .join("")}</div>
    </div>

    <div class="card">
      <h2>Teachers</h2>
      <div class="sub">Everyone with an account. Click Manage to change a plan, reset a password or switch an account off.</div>
      <div class="toolbar">
        <input id="q" placeholder="🔍 Find a teacher by name or email…" value="${esc(search)}" />
        <select id="f">
          ${[["all", "Everyone"], ["active", "Taught in last 30 days"], ["quiet", "Quiet (no lessons in 30 days)"], ["paying", "Subscribers & schools"], ["trial", "On trial"], ["off", "Switched off"]]
            .map(([v, l]) => `<option value="${v}" ${filter === v ? "selected" : ""}>${l}</option>`)
            .join("")}
        </select>
        <button class="btn-s" id="csv">⬇ Download list (CSV)</button>
      </div>
      <div class="tscroll"><table class="ttable">
        <thead><tr><th>Teacher</th><th>Plan</th><th class="num">Lessons</th><th class="num">Last 30 days</th><th class="num">Students</th><th>Last lesson</th><th>Joined</th><th></th></tr></thead>
        <tbody>${shown
          .map((t) => `<tr class="${t.status === "disabled" ? "off" : ""}">
            <td class="who"><b>${esc(t.name)}</b><small>${esc(t.username)}${t.email ? ` · ${esc(t.email)}` : ""}</small>${t.note ? `<small>📝 ${esc(t.note)}</small>` : ""}</td>
            <td>${badge(t)}</td>
            <td class="num">${t.lessons}</td>
            <td class="num">${t.lessons30}</td>
            <td class="num">${t.students.toLocaleString()}</td>
            <td>${ago(t.lastLesson)}</td>
            <td>${day(t.joined)}</td>
            <td><button class="btn-s" data-manage="${t.id}">Manage</button></td>
          </tr>`)
          .join("") || `<tr><td colspan="8" class="muted" style="text-align:center;padding:1.4rem">No teachers match.</td></tr>`}</tbody>
      </table></div>
    </div>`;

  const qi = document.getElementById("q");
  qi.oninput = () => {
    search = qi.value;
    render();
    const again = document.getElementById("q");
    again.focus();
    again.setSelectionRange(again.value.length, again.value.length);
  };
  document.getElementById("f").onchange = (e) => { filter = e.target.value; render(); };
  document.getElementById("csv").onclick = downloadCsv;
  wrap.querySelectorAll("[data-manage]").forEach((btn) => (btn.onclick = () => openManage(+btn.dataset.manage)));
}

function downloadCsv() {
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["Name", "Sign-in name", "Email", "Plan", "Status", "Trial ends", "Paid until", "Lessons", "Lessons (30 days)", "Students", "Last lesson", "Joined", "Note"]]
    .concat(data.teachers.map((t) => [t.name, t.username, t.email, t.admin ? "owner" : t.plan, t.status, t.trialEndsAt ? isoDate(t.trialEndsAt) : "", t.paidUntil ? isoDate(t.paidUntil) : "", t.lessons, t.lessons30, t.students, t.lastLesson ? isoDate(t.lastLesson) : "", isoDate(t.joined), t.note]))
    .map((row) => row.map(cell).join(","));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  a.download = `eyes-up-teachers-${isoDate(Date.now())}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function act(id, body) {
  const res = await fetch(`/api/admin/teacher/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, ...body }) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "failed");
  return out;
}
const closeSheet = () => overlay.classList.remove("show");
overlay.onclick = (e) => { if (e.target === overlay) closeSheet(); };

function openManage(id) {
  const t = data.teachers.find((x) => x.id === id);
  if (!t) return;
  const self = t.id === data.me;
  const until = t.plan === "trial" ? t.trialEndsAt : t.paidUntil;
  const inMonth = isoDate(Date.now() + 30 * 86400000);
  sheet.innerHTML = `
    <h3>${esc(t.name)}</h3>
    <div class="muted" style="font-size:0.85rem">Signs in as <b>${esc(t.username)}</b> · joined ${day(t.joined)} · ${t.lessons} lessons · last seen ${ago(t.lastSeen || t.lastLesson)}</div>

    <div class="row"><label for="mEmail">Email</label><input id="mEmail" type="email" placeholder="not given" value="${esc(t.email)}" /></div>
    <div class="row"><label for="mNote">Your private note (school, invoice number…)</label><input id="mNote" maxlength="300" value="${esc(t.note)}" /></div>
    <div class="actions"><button class="btn-s primary" id="mSaveDetails">Save details</button></div>

    <hr />
    <div class="row"><label for="mPlan">Plan</label>
      <select id="mPlan" ${t.admin ? "disabled" : ""}>
        <option value="free" ${t.plan === "free" ? "selected" : ""}>Free access — no end date</option>
        <option value="trial" ${t.plan === "trial" ? "selected" : ""}>Trial — free until a date</option>
        <option value="school" ${t.plan === "school" ? "selected" : ""}>School licence — paid by invoice, until a date</option>
        <option value="paid" ${t.plan === "paid" ? "selected" : ""}>Subscriber — paid until a date</option>
      </select></div>
    <div class="row" id="mUntilRow"><label for="mUntil">Until</label><input id="mUntil" type="date" value="${until ? isoDate(until) : inMonth}" /></div>
    ${t.admin ? `<p class="muted" style="font-size:0.8rem;margin-top:0.5rem">The owner always has full access.</p>` : ""}
    ${t.hasSubscription ? `<p class="muted" style="font-size:0.8rem;margin-top:0.5rem">This teacher pays by card through Stripe — their dates update automatically. Refunds and cancellations are done in your Stripe dashboard.</p>` : ""}
    ${!data.billing.on ? `<p class="muted" style="font-size:0.8rem;margin-top:0.5rem">Payments aren't switched on yet, so plans are recorded but nobody is locked out.</p>` : ""}
    <div class="actions"><button class="btn-s primary" id="mSavePlan" ${t.admin ? "disabled" : ""}>Save plan</button></div>

    <hr />
    <div class="actions">
      <button class="btn-s" id="mReset">🔑 Give a new password</button>
      ${self ? "" : `<button class="btn-s ${t.status === "disabled" ? "" : "danger"}" id="mToggle">${t.status === "disabled" ? "✓ Switch account back on" : "⛔ Switch account off"}</button>`}
      <span style="flex:1"></span>
      <button class="btn-s" id="mClose">Close</button>
    </div>
    <div id="mOut"></div>`;
  overlay.classList.add("show");

  const planSel = sheet.querySelector("#mPlan");
  const syncUntil = () => (sheet.querySelector("#mUntilRow").style.display = planSel.value === "free" ? "none" : "flex");
  planSel.onchange = syncUntil;
  syncUntil();

  const done = async (fn, msg) => {
    try {
      const out = await fn();
      if (msg) toast(msg);
      await load();
      return out;
    } catch (e) {
      toast({ bad_email: "That email doesn't look right.", bad_date: "Pick an end date.", not_yourself: "You can't do that to your own account." }[e.message] || "That didn't work — try again.");
      return null;
    }
  };

  sheet.querySelector("#mClose").onclick = closeSheet;
  sheet.querySelector("#mSaveDetails").onclick = () =>
    done(() => act(id, { action: "set_details", email: sheet.querySelector("#mEmail").value, note: sheet.querySelector("#mNote").value }), "Saved ✓");
  sheet.querySelector("#mSavePlan").onclick = async () => {
    const plan = planSel.value;
    const until = plan === "free" ? null : `${sheet.querySelector("#mUntil").value}T23:59:59`;
    if (await done(() => act(id, { action: "set_plan", plan, until }), "Plan saved ✓")) closeSheet();
  };
  sheet.querySelector("#mReset").onclick = async () => {
    if (!confirm(`Give ${t.name} a new password?\n\nTheir current password stops working straight away and they'll be signed out everywhere.`)) return;
    const out = await done(() => act(id, { action: "reset_password" }));
    if (!out) return;
    sheet.querySelector("#mOut").innerHTML = `<div class="pwbox">New password for <b>${esc(t.name)}</b> (sign-in name <b>${esc(t.username)}</b>):<br/><code>${esc(out.password)}</code><br/><span class="muted" style="font-size:0.8rem">Shown once — send it to them now. They can change it under ☰ Menu → My account.</span></div>`;
    if (out.self) {
      // The owner just changed their own password: this device's sign-in is gone.
      localStorage.removeItem("eyesup_token");
      sheet.querySelector("#mOut").innerHTML += `<p class="muted" style="font-size:0.82rem;margin-top:0.5rem">That was your own account — sign in again with this password.</p>`;
    }
  };
  const tog = sheet.querySelector("#mToggle");
  if (tog) tog.onclick = async () => {
    const off = t.status !== "disabled";
    if (off && !confirm(`Switch ${t.name}'s account off?\n\nThey won't be able to sign in. Their lessons are kept, and you can switch it back on any time.`)) return;
    if (await done(() => act(id, { action: off ? "disable" : "enable" }), off ? "Account switched off" : "Account switched back on ✓")) closeSheet();
  };
}

load();
