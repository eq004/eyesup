/* Eyes Up — the teacher's data dashboard.
   Interactive views over every archived lesson: participation, activity
   mix, per-lesson energy, and a per-student table. */

const wrap = document.getElementById("wrap");
const esc = LV.esc;

const MODE_META = {
  word_cloud: ["☁️", "Word Cloud"], one_word: ["🗣️", "One Word"], mindmap: ["🕸️", "Mindmap"],
  post_its: ["🗒️", "Post-its"], phonics: ["🔤", "Phonics"], short_answer: ["✏️", "Short Answer"],
  long_response: ["📜", "Long Response"], picture_prompt: ["🖼️", "Picture Prompt"],
  retrieval_sprint: ["🧠", "Retrieval Sprint"], table: ["📋", "Table"], question_set: ["📝", "Question Set"], dot_points: ["📌", "Dot Points"], compose: ["🎵", "Make a Tune"], link: ["🔗", "Website Link"], exit_ticket: ["🎟️", "Exit Ticket"],
  finish_sentence: ["📝", "Finish Sentence"], give_example: ["💡", "Give Example"],
  make_connection: ["🔗", "Connection"], teach_back: ["🧑‍🏫", "Teach Back"], spot_mistake: ["🔎", "Spot Mistake"],
  quick_challenge: ["🚀", "Challenge"], predict: ["🔮", "Predict"], three_two_one: ["3️⃣", "3-2-1"],
  notice_wonder: ["👀", "Notice/Wonder"], before_after: ["🔄", "Before/After"], plus_minus: ["➕", "Plus & Minus"],
  muddiest_point: ["🌫️", "Muddiest Point"], ask_question: ["❓", "Ask a Question"],
  poll: ["📊", "Poll"], tick_boxes: ["☑️", "Tick the Boxes"], multi_choice: ["🅰️", "Multiple Choice"], picture_vote: ["🗳️", "Picture Vote"],
  agree_disagree: ["⚖️", "Agree/Disagree"], true_false: ["✅", "True/False"], this_or_that: ["⚡", "This or That"],
  confidence: ["🎯", "Confidence"], smiley: ["😊", "Smiley Review"], scale: ["🎚️", "Scale"],
  example_nonexample: ["↔️", "Example/Non-ex"], ranking: ["🔢", "Ranking"], put_in_order: ["🪜", "Put in Order"],
  match_up: ["🧩", "Match Up"], venn: ["◉", "Venn"], spelling: ["🔡", "Spelling"], cloze: ["▭", "Cloze"], phonics_cloze: ["🖼️", "Picture Phonics"],
  working: ["🧮", "Working Out"], counters: ["🟠", "Counters"], sketch: ["🎨", "Sketch"], trace: ["✍️", "Letter Formation"], annotate: ["🖍️", "Annotate"], image_drop: ["📥", "Drop an Image"], image_caption: ["📸", "Image + Writing"], image_long: ["📓", "Image + Long Answer"], maths_board: ["🧮", "Maths Board"], counters_draw: ["🟠", "Counters + Drawing"],
};
const modeIcon = (m) => (MODE_META[m] || ["▫️", m])[0];
const modeName = (m, ck) => (m === "counters" && ck === "base10" ? "Tens & Ones" : (MODE_META[m] || ["", m])[1]);


const token = localStorage.getItem("eyesup_token") || "";
const authQ = token ? `t=${encodeURIComponent(token)}` : "";
const canonical = LV.canonical;

let lessons = []; // [{meta, summary}]
let aiOn = false; // server has an AI key → written answers can be summarised
let selectedId = null;
let sortBy = { key: "pct", dir: 1 };
let search = "";
let detailTab = "snap"; // "snap" | "stu" | "act"
let openStudent = null; // canonical name expanded in the By-student table
let shareLink = ""; // per-lesson, cleared on lesson change

const lessonTitle = (x) => LV.title({ title: x.meta.title, first_prompt: x.meta.first_prompt, code: x.meta.code, items: x.summary.items });

async function load(attempt = 0) {
  if (!token) {
    wrap.innerHTML = `<div class="gate">📈<br/><b>Sign in first.</b><br/><span class="muted">Open the <a href="/teacher">teacher dashboard</a>, sign in, then come back here.</span></div>`;
    return;
  }
  let list;
  try {
    const res = await fetch(`/api/lessons?${authQ}`);
    const data = await res.json();
    if (res.status === 403) {
      wrap.innerHTML = `<div class="gate">🔒<br/><b>Your sign-in has expired on this device.</b><br/><span class="muted">Sign out and back in on the <a href="/teacher">teacher dashboard</a>, then come back here.</span></div>`;
      return;
    }
    if (!res.ok) throw new Error(data.error);
    if (!data.storage) {
      wrap.innerHTML = `<div class="gate muted">No database connected — the data dashboard needs lesson storage.</div>`;
      return;
    }
    list = data.lessons;
    aiOn = !!data.ai;
  } catch {
    if (attempt < 18) {
      wrap.innerHTML = `<div class="gate muted">⏳ Waking the server up — the first visit of the day can take up to a minute.<br/>Retrying automatically (${attempt + 1})…</div>`;
      setTimeout(() => load(attempt + 1), 5000);
      return;
    }
    wrap.innerHTML = `<div class="gate">☁️<br/><b>Couldn't reach the lesson archive right now.</b><br/><span class="muted">Your lessons are safe — this is a connection hiccup, not lost data.</span><br/><br/><a href="javascript:location.reload()">Try again</a></div>`;
    return;
  }
  if (!list.length) {
    wrap.innerHTML = `<div class="gate muted">No lessons stored yet — run one and come back. 📚</div>`;
    return;
  }
  // A link from "Past lessons" names one lesson: make sure it's loaded even if it's old.
  const wanted = Number(new URLSearchParams(location.search).get("lesson")) || null;
  const recent = list.slice(0, 40);
  if (wanted && !recent.some((l) => l.id === wanted)) {
    const old = list.find((l) => l.id === wanted);
    if (old) recent.push(old);
  }
  const detail = await Promise.all(
    recent.map((l) =>
      fetch(`/api/lessons/${l.id}?${authQ}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    )
  );
  lessons = recent
    .map((meta, i) => ({ meta, summary: detail[i] && LV.normalise(detail[i]) }))
    .filter((x) => x.summary)
    .sort((a, b) => new Date(a.meta.created_at) - new Date(b.meta.created_at)); // chronological
  selectedId = (wanted && lessons.some((x) => x.meta.id === wanted)) ? wanted : lessons[lessons.length - 1]?.meta.id ?? null;
  render();
  if (wanted) document.getElementById("detail")?.scrollIntoView({ block: "start" });
}

function overview() {
  const nLessons = lessons.length;
  let nInteractions = 0, nResponses = 0, pctSum = 0, pctN = 0;
  const students = new Set();
  for (const { summary: s } of lessons) {
    nInteractions += LV.shown(s).length;
    (s.items || []).forEach((it) => {
      nResponses += it.responses || 0;
      (it.students || []).forEach((x) => x.name && students.add(canonical(x.name)));
    });
    if (s.joinedCount) {
      pctSum += (s.participatedCount / s.joinedCount) * 100;
      pctN++;
    }
  }
  return { nLessons, nInteractions, nResponses, nStudents: students.size, avgPct: pctN ? Math.round(pctSum / pctN) : 0 };
}

function lessonLabel(x) {
  const d = new Date(x.meta.created_at);
  return `<span class="lt" title="${esc(lessonTitle(x))}">${esc(lessonTitle(x))}</span><br/>${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function render() {
  const o = overview();

  // activity mix across all lessons
  const mix = new Map();
  lessons.forEach(({ summary: s }) =>
    LV.shown(s).forEach((it) => {
      const k = it.mode === "counters" && it.counterKind === "base10" ? "tens_ones" : it.mode;
      mix.set(k, (mix.get(k) || 0) + 1);
    })
  );
  const mixRows = [...mix.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const mixMax = Math.max(1, ...mixRows.map(([, n]) => n));

  const maxJoined = Math.max(1, ...lessons.map((x) => x.summary.joinedCount || 0));

  wrap.innerHTML = `
    <div class="tiles">
      <div class="tile"><div class="v">${o.nLessons}</div><div class="k">lessons stored</div></div>
      <div class="tile"><div class="v">${o.nInteractions}</div><div class="k">activities run</div></div>
      <div class="tile"><div class="v">${o.nResponses.toLocaleString()}</div><div class="k">student responses</div></div>
      <div class="tile"><div class="v">${o.nStudents}</div><div class="k">students seen</div></div>
      <div class="tile"><div class="v">${o.avgPct}%</div><div class="k">avg participation</div></div>
    </div>

    <div class="card">
      <h2>Participation by lesson</h2>
      <div class="sub">Grey = joined, blue = participated. Click a lesson to open its results below.</div>
      <div class="lchart">${lessons
        .map((x) => {
          const s = x.summary;
          const pct = s.joinedCount ? Math.round((s.participatedCount / s.joinedCount) * 100) : 0;
          const jh = Math.max(6, (s.joinedCount / maxJoined) * 130);
          const ph = Math.max(4, (s.participatedCount / maxJoined) * 130);
          return `<div class="lbar ${x.meta.id === selectedId ? "sel" : ""}" data-lesson="${x.meta.id}"
              title="${esc(lessonTitle(x))} — ${s.participatedCount}/${s.joinedCount} participated">
            <div class="stack"><div class="joined" style="height:${jh}px"></div><div class="part" style="height:${ph}px"></div></div>
            <div class="pct">${pct}%</div><div class="lab">${lessonLabel(x)}</div>
          </div>`;
        })
        .join("")}</div>
    </div>

    <div class="card">
      <h2>What you reach for</h2>
      <div class="sub">Activity types across all stored lessons.</div>
      ${mixRows
        .map(([m, n]) => `<div class="mix-row">
          <span class="nm">${m === "tens_ones" ? "🔟 Tens & Ones" : `${modeIcon(m)} ${esc(modeName(m))}`}</span>
          <span class="track"><span class="fill" style="width:${(n / mixMax) * 100}%"></span></span>
          <span class="n">${n}</span></div>`)
        .join("")}
    </div>

    <div id="detail">${renderDetail()}</div>
  `;

  wrap.querySelectorAll("[data-lesson]").forEach((el) => (el.onclick = () => {
    selectedId = +el.dataset.lesson;
    sortBy = { key: "pct", dir: 1 };
    search = "";
    shareLink = "";
    openStudent = null;
    render();
    document.getElementById("detail").scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  bindDetail();
}

function refreshDetail() {
  document.getElementById("detail").innerHTML = renderDetail();
  bindDetail();
}

const current = () => lessons.find((l) => l.meta.id === selectedId);

/* ---------- Lesson results: one card, three tabs, one export row ---------- */

function renderDetail() {
  const x = current();
  if (!x) return "";
  const s = x.summary;
  const when = new Date(x.meta.created_at).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
  const hasPics = (s.items || []).some((it) => it.images?.length);

  return `
    <div class="card detail-card">
      <div class="dhead">
        <h2 class="dtitle"><span id="dTitle">${esc(lessonTitle(x))}</span> <button class="edit-btn" id="renameBtn" title="Rename this lesson">✎</button></h2>
        <div class="muted" style="font-size:0.85rem">${esc(when)} · ${s.participatedCount} of ${s.joinedCount} students took part${s.teacherName ? ` · ${esc(s.teacherName)}` : ""}</div>
      </div>
      <div class="dtabs">
        <button class="dtab ${detailTab === "snap" ? "on" : ""}" data-dtab="snap">✨ Snapshot</button>
        <button class="dtab ${detailTab === "stu" ? "on" : ""}" data-dtab="stu">👥 By student</button>
        <button class="dtab ${detailTab === "act" ? "on" : ""}" data-dtab="act">📊 By activity</button>
      </div>
      <div class="export-row">
        <span class="muted" style="font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em">Export</span>
        <a class="xbtn" href="/report?lesson=${x.meta.id}&${authQ}" target="_blank" rel="noopener" title="Every answer with names, laid out for printing or saving as PDF">🖨 Print / PDF</a>
        <button class="xbtn" id="csvBtn" title="One row per student, one column per activity — opens in Excel or Google Sheets">📊 Spreadsheet</button>
        ${hasPics ? `<a class="xbtn" href="/api/lessons/${x.meta.id}/images?${authQ}" title="Every picture students sent, as a ZIP">🖼 Pictures</a>` : ""}
        <button class="xbtn" id="shareBtn" title="A view-only link for anyone; student names are hidden on it">🔗 ${shareLink ? "Copy share link again" : "Share link"}</button>
        ${shareLink ? `<span class="share-link">${esc(shareLink)}</span><span class="muted" style="font-size:0.76rem">Copied — names are hidden on the shared page.</span>` : ""}
      </div>
      ${detailTab === "snap" ? renderSnapshotTab(x) : detailTab === "stu" ? renderStudents(x) : renderActivities(x)}
    </div>`;
}

/* ---------- 👥 By student ---------- */

function renderStudents(x) {
  const s = x.summary;
  const { total, markable, rows } = LV.students(s);

  let shown = rows;
  if (search) shown = rows.filter((r) => canonical(r.name).includes(canonical(search)));
  shown = [...shown].sort((a, b) => {
    if (sortBy.key === "name") return sortBy.dir * a.name.localeCompare(b.name);
    if (sortBy.key === "right") return sortBy.dir * (b.right - a.right) || a.name.localeCompare(b.name);
    return sortBy.dir * ((b.n / (total || 1)) - (a.n / (total || 1))) || a.name.localeCompare(b.name);
  });
  const arrow = (k) => sortBy.key === k ? (sortBy.dir === 1 ? " ▼" : " ▲") : "";

  return `
      <div class="sub">Everyone who joined, with how much they answered${markable ? " and how many they got right" : ""}. Click a name to read all their answers.</div>
      <input class="search" id="stuSearch" placeholder="🔍 Find a student…" value="${esc(search)}" />
      <table class="stab">
        <thead><tr>
          <th data-sort="name">Student${arrow("name")}</th>
          <th data-sort="pct">Answered${arrow("pct")}</th>
          <th class="bar-cell"></th>
          ${markable ? `<th data-sort="right">Right${arrow("right")}</th>` : ""}
        </tr></thead>
        <tbody>${shown
          .map((r) => {
            const pct = total ? Math.round((r.n / total) * 100) : 0;
            const cls = pct >= 70 ? "p-hi" : pct >= 40 ? "p-mid" : "p-lo";
            const k = canonical(r.name);
            const open = openStudent === k;
            const marked = r.right + r.wrong;
            return `<tr class="srow ${open ? "open" : ""}" data-student="${esc(k)}">
                <td><b>${esc(r.name)}</b></td>
                <td style="white-space:nowrap">${r.n} / ${total} · <b>${pct}%</b></td>
                <td class="bar-cell"><div class="pbarr"><div class="pfill ${cls}" style="width:${pct}%"></div></div></td>
                ${markable ? `<td style="white-space:nowrap">${marked ? `<b>${r.right}</b> / ${marked}` : `<span class="muted">—</span>`}</td>` : ""}
              </tr>${open ? `<tr class="sdetail"><td colspan="${markable ? 4 : 3}">${studentPanel(x, r, total)}</td></tr>` : ""}`;
          })
          .join("")}</tbody>
      </table>
      <p class="muted" style="font-size:0.78rem;margin-top:0.7rem">Counted over ${total} activit${total === 1 ? "y" : "ies"}; anonymous ones are left out so they stay anonymous. Students are matched by the name they typed.</p>`;
}

// Everything one student did in this lesson, in order — printable on its own.
function studentPanel(x, r, total) {
  const s = x.summary;
  const byIdx = new Map(r.answers.map((a) => [a.index, a]));
  const order = LV.shown(s).map((it, i) => ({ it, i })).filter(({ it }) => !it.anonymous && !LV.SKIP.has(it.mode));
  const pct = total ? Math.round((r.n / total) * 100) : 0;
  const marked = r.right + r.wrong;
  return `<div class="spanel">
      <div class="spanel-head">
        <div><b style="font-size:1.05rem">${esc(r.name)}</b> <span class="muted">· ${esc(lessonTitle(x))} · ${new Date(x.meta.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</span><br/>
          <span class="muted" style="font-size:0.85rem">Answered ${r.n} of ${total} (${pct}%)${marked ? ` · got ${r.right} of ${marked} right` : ""}</span></div>
        <button class="xbtn no-print" data-print-student="${esc(canonical(r.name))}">🖨 Print this student</button>
      </div>
      <ol class="slist">${order
        .map(({ it, i }) => {
          const a = byIdx.get(i);
          const head = `<span class="sq">${modeIcon(it.mode)} ${esc(it.prompt || modeName(it.mode, it.counterKind))}</span>`;
          if (!a) return `<li class="miss">${head}<span class="sa muted">— no answer</span></li>`;
          const pics = a.images.length ? `<div class="spics">${a.images.map((src) => `<a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="" loading="lazy" /></a>`).join("")}</div>` : "";
          const txt = it.mode === "question_set" && it.questions?.length
            ? `<table class="sqs">${it.questions.map((q, k) => `<tr><td>${esc(q)}</td><td>${esc(LV.parts(a.response)[k] || "—")}</td></tr>`).join("")}</table>`
            : esc(a.response || "—");
          return `<li>${head}<span class="sa">${LV.keyKind(it) ? LV.markButtons(i, r.name, a, LV.byHand(it, r.name)) : LV.mark(a)}${txt}${a.score && a.ok !== true ? ` <small class="muted">(${esc(a.score)})</small>` : ""}</span>${pics}</li>`;
        })
        .join("")}</ol>
    </div>`;
}

/* ---------- 📊 By activity ---------- */

function renderActivities(x) {
  return `
      <div class="sub">Every activity in order, with each student's answer${x.summary.items?.some((it) => it.markable) ? " and whether it was right" : ""}. Open <b>✎</b> on an activity to set the right answer now — every page, print and spreadsheet updates to match.</div>
      <div id="insBox"></div>`;
}

/* ---------- ✨ Snapshot ---------- */

function renderSnapshotTab(x) {
  const snap = snapshotOf(x);
  const s = x.summary;
  const ring = (p) => {
    const r = 44, c = 2 * Math.PI * r;
    return `<svg class="snap-ring" viewBox="0 0 110 110"><circle cx="55" cy="55" r="${r}" class="bg"/><circle cx="55" cy="55" r="${r}" class="fg" style="stroke-dasharray:${c};stroke-dashoffset:${c * (1 - p / 100)}"/><text x="55" y="61" text-anchor="middle">${p}%</text></svg>`;
  };
  return `
    <div class="snap inline" id="snapBox">
      <div class="snap-actions no-print" style="margin-bottom:0.6rem">
        <button class="share-btn ghost" id="snapCopy">📋 Copy as text</button>
        <button class="share-btn ghost" id="snapPrint">🖨 Print this page</button>
      </div>
      <div class="snap-top">
        ${ring(snap.pct)}
        <div class="snap-nums">
          <div><b>${snap.took}</b><span>of ${snap.joined} took part</span></div>
          <div><b>${snap.nItems}</b><span>activities</span></div>
          <div><b>${snap.responses}</b><span>answers</span></div>
        </div>
      </div>
      <h3>What stood out</h3>
      ${snap.takeaways.length
        ? `<ul class="snap-list">${snap.takeaways.map((t) => `<li><span class="ic">${t.icon}</span><span>${t.text}</span></li>`).join("")}</ul>`
        : `<p class="muted">Not much to say yet — this lesson didn't collect enough answers.</p>`}
      ${snap.written.length ? renderAiSection(x, snap) : ""}
      ${snap.visuals.length ? `<h3>At a glance</h3><div class="snap-grid">${snap.visuals.map(renderSnapshotVisual).join("")}</div>` : ""}
      ${s.ghostCount ? `<p class="muted" style="font-size:0.78rem;margin-top:1rem">${s.ghostCount === 1 ? "1 empty re-launch" : `${s.ghostCount} empty re-launches`} of a question left out of these numbers.</p>` : ""}
      <p class="muted" style="font-size:0.78rem;margin-top:0.6rem">This is the short version. 👥 By student and 📊 By activity have every answer.</p>
    </div>`;
}

const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const listNames = (arr, max = 6) => {
  const a = arr.slice(0, max).map(esc);
  const rest = arr.length - a.length;
  return a.join(", ") + (rest > 0 ? ` and ${rest} more` : "");
};
const itemLabel = (it) => it.prompt ? `“${esc(it.prompt.slice(0, 60))}${it.prompt.length > 60 ? "…" : ""}”` : esc(modeName(it.mode, it.counterKind));

// Turns a stored lesson into short, plain-English takeaways and the
// handful of visuals worth a glance. No jargon: it's for a busy teacher.
function snapshotOf(x) {
  const s = x.summary;
  const items = LV.shown(s).filter((it) => !LV.SKIP.has(it.mode));
  const joined = s.joinedCount || 0;
  const took = s.participatedCount || 0;
  const pct = joined ? Math.round((took / joined) * 100) : 0;
  const responses = items.reduce((a, it) => a + (it.responses || 0), 0);
  const takeaways = [];
  const visuals = [];

  // Participation headline
  if (joined) {
    const tone = pct >= 85 ? "Nearly everyone took part" : pct >= 65 ? "Most of the room took part" : pct >= 40 ? "About half the room took part" : "Participation was low";
    takeaways.push({ icon: pct >= 65 ? "🟢" : pct >= 40 ? "🟡" : "🔴", text: `<b>${tone}</b> — ${took} of ${joined} students answered at least once.` });
  }

  // Energy: peaks and dips (only among activities that actually ran)
  const counted = items.filter((it) => (it.responses || 0) > 0);
  if (counted.length >= 3) {
    const hi = [...counted].sort((a, b) => (b.responses || 0) - (a.responses || 0))[0];
    const lo = [...counted].sort((a, b) => (a.responses || 0) - (b.responses || 0))[0];
    if (hi !== lo && (hi.responses || 0) > (lo.responses || 0) * 1.5)
      takeaways.push({ icon: "⚡", text: `Energy peaked at ${itemLabel(hi)} (${plural(hi.responses, "answer")}) and dipped at ${itemLabel(lo)} (${plural(lo.responses || 0, "answer")}).` });
  }

  // Quiet students, stars, and anyone who joined but never answered
  const { total, markable, rows } = LV.students(s);
  if (total >= 2 && rows.length) {
    const quiet = rows.filter((r) => r.n > 0 && r.n / total < 0.4).map((r) => r.name).sort();
    const stars = rows.filter((r) => r.n === total).map((r) => r.name).sort();
    const never = rows.filter((r) => r.n === 0).map((r) => r.name).sort();
    if (quiet.length) takeaways.push({ icon: "🤫", text: `<b>Quieter students</b> (answered under 40% of activities): ${listNames(quiet)}.` });
    if (stars.length && stars.length < rows.length) takeaways.push({ icon: "⭐", text: `Answered every single activity: ${listNames(stars)}.` });
    if (never.length) takeaways.push({ icon: "👀", text: `Joined but never answered: ${listNames(never)}.` });
    if (markable >= 1) {
      const marked = rows.filter((r) => r.right + r.wrong > 0);
      const struggling = marked.filter((r) => r.wrong > r.right).map((r) => `${r.name} (${r.right}/${r.right + r.wrong})`).sort();
      if (struggling.length && struggling.length < marked.length)
        takeaways.push({ icon: "🧭", text: `<b>Got more wrong than right</b>: ${listNames(struggling, 8)} — worth a quiet check-in.` });
    }
  }

  // Per-activity takeaways (the interesting ones only)
  for (const it of items) {
    if (!it.responses) continue;
    const wrongNames = it.markable ? (it.students || []).filter((x) => x.ok === false).map((x) => x.name).sort() : [];
    const whoWrong = wrongNames.length && wrongNames.length <= 8 ? ` Not yet: ${listNames(wrongNames, 8)}.` : "";
    if (it.distribution && !["spelling", "cloze", "phonics_cloze", "working", "counters"].includes(it.mode)) {
      const tot = it.distribution.reduce((a, d) => a + d.count, 0);
      if (!tot) continue;
      const top = [...it.distribution].sort((a, b) => b.count - a.count)[0];
      const topPct = Math.round((top.count / tot) * 100);
      const correct = it.distribution.find((d) => /✓$/.test(d.label));
      if (correct) {
        const cp = Math.round((correct.count / tot) * 100);
        takeaways.push({ icon: cp >= 70 ? "✅" : cp >= 40 ? "🟡" : "❗", text: `${itemLabel(it)}: <b>${cp}% got it right</b> (${esc(correct.label.replace(/ ✓$/, ""))}).${cp < 70 ? " Worth revisiting." : ""}${whoWrong}` });
      } else if (it.mode === "tick_boxes") {
        takeaways.push({ icon: "☑️", text: `${itemLabel(it)}: most ticked <b>${esc(top.label)}</b> (${top.count} of ${it.responses}).` });
      } else {
        const split = topPct < 55 && it.distribution.length >= 2 ? " — a real split" : topPct >= 80 ? " — near-unanimous" : "";
        takeaways.push({ icon: "📊", text: `${itemLabel(it)}: <b>${esc(top.label)}</b> led with ${topPct}%${split}.` });
      }
      const rows = it.distribution.map((d) => ({ label: d.label, count: d.count }));
      if (it.mode === "smiley") visuals.push({ kind: "faces", title: `${modeIcon(it.mode)} ${itemLabel(it)}`, rows });
      else if (rows.length <= 4 && !correct) visuals.push({ kind: "donut", title: `${modeIcon(it.mode)} ${itemLabel(it)}`, rows });
      else visuals.push({ kind: "bars", title: `${modeIcon(it.mode)} ${itemLabel(it)}`, rows });
    } else if (["spelling", "cloze", "phonics_cloze"].includes(it.mode) && it.distribution) {
      const hard = [...it.distribution].sort((a, b) => a.count - b.count)[0];
      const hp = Math.round((hard.count / it.responses) * 100);
      takeaways.push({ icon: hp < 50 ? "❗" : "🔡", text: `${modeName(it.mode)}: <b>${esc(hard.label.split("  (")[0])}</b> was the hardest — ${hp}% got it.${whoWrong}` });
      visuals.push({ kind: "accuracy", title: `${modeIcon(it.mode)} ${esc(modeName(it.mode))} — who got each one right`, total: it.responses, rows: it.distribution.map((d) => ({ label: d.label.split("  (")[0], count: d.count })) });
    } else if (["working", "counters"].includes(it.mode) && it.distribution) {
      const right = it.distribution.filter((d) => /✓$/.test(d.label)).reduce((a, d) => a + d.count, 0);
      const marked = it.distribution.some((d) => /[✓✗]$/.test(d.label));
      if (marked) {
        const rp = Math.round((right / it.responses) * 100);
        takeaways.push({ icon: rp >= 70 ? "✅" : "❗", text: `${itemLabel(it)}: <b>${rp}% reached the right answer</b>.${whoWrong}` });
      }
      visuals.push({ kind: "bars", title: `${modeIcon(it.mode)} ${itemLabel(it)} — answers given`, rows: it.distribution.map((d) => ({ label: d.label, count: d.count })) });
    } else if (it.topWords?.length) {
      takeaways.push({ icon: "☁️", text: `${itemLabel(it)}: the room said <b>${it.topWords.slice(0, 3).map((w) => esc(w.word)).join("</b>, <b>")}</b> most.` });
      visuals.push({ kind: "words", title: `${modeIcon(it.mode)} ${itemLabel(it)}`, words: it.topWords });
    } else if (it.scale?.avg != null) {
      const [lo, hi] = it.scale.labels || [];
      const v = Number(it.scale.avg);
      takeaways.push({ icon: "🎚️", text: `${itemLabel(it)}: the class averaged <b>${Math.round(v)} out of 100</b>${lo && hi ? ` (between “${esc(lo)}” and “${esc(hi)}”)` : ""}.` });
      visuals.push({ kind: "gauge", title: `${modeIcon(it.mode)} ${itemLabel(it)}`, avg: v, labels: it.scale.labels || [], n: it.responses });
    } else if (it.ranked?.length) {
      const rightAll = it.markable ? (it.students || []).filter((x) => x.ok === true).length : 0;
      takeaways.push({ icon: "🔢", text: `${itemLabel(it)}: the class put <b>${esc(it.ranked[0].label)}</b> first.${it.markable ? ` ${rightAll} of ${it.responses} had the whole order right.${whoWrong}` : ""}` });
      visuals.push({ kind: "podium", title: `${modeIcon(it.mode)} ${itemLabel(it)}`, ranked: it.ranked });
    } else if (it.matchStats?.length) {
      const weakest = [...it.matchStats].sort((a, b) => a.correctPct - b.correctPct)[0];
      takeaways.push({ icon: "🧩", text: `Match Up: weakest pair was <b>${esc(weakest.pair)}</b> (${weakest.correctPct}% right).${whoWrong}` });
      visuals.push({ kind: "pairs", title: `🧩 Match Up — % who paired each correctly`, rows: it.matchStats });
    } else if (it.sketchCount) {
      takeaways.push({ icon: "🎨", text: `${itemLabel(it)}: ${plural(it.sketchCount, "picture")} came in.` });
    } else if ((it.answers || []).length >= 3) {
      // Written answers: the words the class leaned on, and how much they wrote.
      const kw = keywords(it.answers, 12, it.prompt);
      const avgWords = Math.round(it.answers.reduce((a, t) => a + String(t).split(/\s+/).filter(Boolean).length, 0) / it.answers.length);
      if (kw.length) {
        if (visuals.filter((q) => q.kind === "words").length < 4)
          visuals.push({ kind: "words", title: `${modeIcon(it.mode)} ${itemLabel(it)} — words the class used most`, words: kw });
        takeaways.push({ icon: "✏️", text: `${itemLabel(it)}: ${plural(it.answers.length, "written answer")}, about ${plural(avgWords, "word")} each — the class kept coming back to <b>${kw.slice(0, 3).map((w) => esc(w.word)).join("</b>, <b>")}</b>.` });
      }
    }
  }

  // Who answered what: one dot per student per activity (✓/✗ where marked).
  if (total >= 2 && rows.length >= 3) {
    const named = items.filter((it) => (it.responses || 0) > 0 && !it.anonymous);
    visuals.push({
      kind: "heat", title: "👥 Who answered what — one dot per activity", cols: named,
      rows: [...rows].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, 40).map((r) => ({
        name: r.name,
        cells: named.map((it) => {
          const st = (it.students || []).find((y) => y.name && canonical(y.name) === canonical(r.name));
          return st ? (st.ok === true ? "ok" : st.ok === false ? "no" : "on") : "";
        }),
      })),
    });
  }

  // Energy strip always
  if (items.length) visuals.unshift({ kind: "energy", title: "Answers per activity, in order", items });

  const written = items.filter((it) => (it.answers || []).length >= 3 && !it.distribution && !it.topWords);
  // Keep it scannable: a dozen visuals at most, but the who-answered-what grid always makes the cut.
  const heat = visuals.find((v) => v.kind === "heat");
  const rest = visuals.filter((v) => v.kind !== "heat").slice(0, 12);
  return { pct, joined, took, responses, nItems: items.length, takeaways: takeaways.slice(0, 14), visuals: heat ? [...rest, heat] : rest, written };
}

const STOP = new Set("a an the and or but so if of to in on at for with from by as is are was were be been being it its this that these those i we you he she they them our your their my me us him her his not no yes do does did have has had can could would should will just very really also than then there here what which who when where why how about into over under more most some any all each other such only own same too s t ll ve re d m don didn isn wasn aren because like get got make made one two lot lots thing things think thought know remember last lesson learnt learned".split(" "));
// Words the class leaned on — minus the question's own words, with plurals folded in.
function keywords(answers, n = 12, prompt = "") {
  const skip = new Set(STOP);
  for (const w of String(prompt).toLowerCase().match(/[a-z][a-z'’-]{2,}/g) || []) { skip.add(w); skip.add(w.replace(/s$/, "")); }
  const freq = new Map();
  for (const a of answers) {
    const seen = new Set();
    for (const raw of String(a).toLowerCase().match(/[a-z][a-z'’-]{2,}/g) || []) {
      let w = raw.replace(/^['’-]+|['’-]+$/g, "");
      if (w.length > 4 && /[^s]s$/.test(w)) w = w.slice(0, -1); // objects → object
      if (skip.has(w) || skip.has(w + "s") || seen.has(w)) continue;
      seen.add(w);
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return [...freq.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, n).map(([word, count]) => ({ word, count }));
}

const PALETTE = ["#1d3f78", "#5b7fc7", "#2f9e6a", "#e0a63a", "#c95c5c", "#8b6bc7"];
function renderSnapshotVisual(v) {
  if (v.kind === "donut") {
    const tot = v.rows.reduce((a, r) => a + r.count, 0) || 1;
    let acc = 0;
    const r = 40, c = 2 * Math.PI * r;
    const arcs = v.rows.map((row, i) => {
      const frac = row.count / tot;
      const el = `<circle cx="55" cy="55" r="${r}" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="18" stroke-dasharray="${(frac * c).toFixed(2)} ${c}" stroke-dashoffset="${(-acc * c).toFixed(2)}" transform="rotate(-90 55 55)"/>`;
      acc += frac;
      return el;
    });
    const top = [...v.rows].sort((a, b) => b.count - a.count)[0];
    return `<div class="snap-vis"><h4>${v.title}</h4><div class="snap-donut">
      <svg viewBox="0 0 110 110">${arcs.join("")}<text x="55" y="52" text-anchor="middle" class="big">${Math.round((top.count / tot) * 100)}%</text><text x="55" y="66" text-anchor="middle" class="small">${esc(String(top.label).slice(0, 12))}</text></svg>
      <ul class="legend">${v.rows.map((row, i) => `<li><i style="background:${PALETTE[i % PALETTE.length]}"></i><span>${esc(row.label)}</span><b>${row.count} · ${Math.round((row.count / tot) * 100)}%</b></li>`).join("")}</ul>
    </div></div>`;
  }
  if (v.kind === "faces") {
    const tot = v.rows.reduce((a, r) => a + r.count, 0) || 1;
    const max = Math.max(1, ...v.rows.map((r) => r.count));
    return `<div class="snap-vis"><h4>${v.title}</h4><div class="snap-faces">${v.rows
      .map((r) => `<div class="face ${r.count === max && r.count ? "lead" : ""}"><span style="font-size:${(1.3 + (r.count / max) * 1.4).toFixed(2)}rem">${esc(r.label)}</span><b>${r.count}</b><small>${Math.round((r.count / tot) * 100)}%</small></div>`)
      .join("")}</div></div>`;
  }
  if (v.kind === "gauge") {
    const pct = Math.max(0, Math.min(1, v.avg / 100)); // scale markers run 0–100
    const ang = -90 + pct * 180;
    return `<div class="snap-vis"><h4>${v.title}</h4><div class="snap-gauge">
      <svg viewBox="0 0 120 70"><path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="var(--line)" stroke-width="12" stroke-linecap="round"/>
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(pct * 157).toFixed(1)} 157"/>
        <g transform="rotate(${ang.toFixed(1)} 60 60)"><line x1="60" y1="60" x2="60" y2="18" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/></g><circle cx="60" cy="60" r="5" fill="var(--ink)"/>
        <text x="60" y="48" text-anchor="middle" class="big">${Math.round(v.avg)}</text></svg>
      <div class="ends"><span>${esc(v.labels[0] || "0")}</span><span>${esc(v.labels[1] || "100")}</span></div>
      <div class="muted" style="font-size:0.78rem;text-align:center">class average · ${plural(v.n, "answer")}</div></div></div>`;
  }
  if (v.kind === "podium") {
    const top3 = v.ranked.slice(0, 3);
    const order = [top3[1], top3[0], top3[2]].filter(Boolean);
    const h = { 1: 84, 2: 60, 3: 44 };
    return `<div class="snap-vis"><h4>${v.title}</h4><div class="snap-podium">${order
      .map((r) => `<div class="step"><div class="lbl">${esc(r.label)}</div><div class="block p${r.position}" style="height:${h[r.position] || 40}px">${r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : "🥉"}</div></div>`)
      .join("")}</div>${v.ranked.length > 3 ? `<div class="muted" style="font-size:0.78rem;margin-top:0.4rem">then ${v.ranked.slice(3).map((r) => esc(r.label)).join(", ")}</div>` : ""}</div>`;
  }
  if (v.kind === "pairs") {
    return `<div class="snap-vis"><h4>${v.title}</h4>${v.rows
      .map((p) => `<div class="snap-bar ${p.correctPct >= 70 ? "good" : p.correctPct < 40 ? "bad" : ""}"><span class="l">${esc(p.pair)}</span><span class="t"><span class="f" style="width:${p.correctPct}%"></span></span><span class="c">${p.correctPct}%</span></div>`)
      .join("")}</div>`;
  }
  if (v.kind === "accuracy") {
    return `<div class="snap-vis"><h4>${v.title}</h4><div class="snap-acc">${v.rows
      .map((r) => { const p = v.total ? Math.round((r.count / v.total) * 100) : 0; return `<div class="chip ${p >= 70 ? "good" : p >= 40 ? "mid" : "bad"}"><b>${esc(r.label)}</b><span>${p}%</span></div>`; })
      .join("")}</div></div>`;
  }
  if (v.kind === "heat") {
    return `<div class="snap-vis wide"><h4>${v.title}</h4><div class="muted" style="font-size:0.74rem;margin:-0.4rem 0 0.5rem">blue = answered · green = right · red = not right</div><div class="snap-heat"><table>
      <thead><tr><th></th>${v.cols.map((it, i) => `<th title="${esc(modeName(it.mode, it.counterKind))}${it.prompt ? " — " + esc(it.prompt) : ""}">${modeIcon(it.mode)}</th>`).join("")}</tr></thead>
      <tbody>${v.rows.map((r) => `<tr><td>${esc(r.name)}</td>${r.cells.map((st) => `<td><i class="${st}" title="${st === "ok" ? "right" : st === "no" ? "not right" : st ? "answered" : "no answer"}"></i></td>`).join("")}</tr>`).join("")}</tbody>
    </table></div></div>`;
  }
  if (v.kind === "energy") {
    const max = Math.max(1, ...v.items.map((it) => it.responses || 0));
    return `<div class="snap-vis"><h4>${v.title}</h4><div class="snap-energy">${v.items
      .map((it, i) => `<div class="se" title="${i + 1}. ${esc(modeName(it.mode, it.counterKind))}${it.prompt ? " — " + esc(it.prompt) : ""}">
        <span class="n">${it.responses || 0}</span><span class="b" style="height:${Math.max(4, ((it.responses || 0) / max) * 64)}px"></span><span class="i">${modeIcon(it.mode)}</span></div>`)
      .join("")}</div></div>`;
  }
  if (v.kind === "bars") {
    const max = Math.max(1, ...v.rows.map((r) => r.count));
    const tot = v.rows.reduce((a, r) => a + r.count, 0) || 1;
    return `<div class="snap-vis"><h4>${v.title}</h4>${v.rows
      .map((r) => `<div class="snap-bar ${/✓$/.test(r.label) ? "good" : ""}"><span class="l">${esc(r.label)}</span><span class="t"><span class="f" style="width:${(r.count / max) * 100}%"></span></span><span class="c">${r.count} · ${Math.round((r.count / tot) * 100)}%</span></div>`)
      .join("")}</div>`;
  }
  if (v.kind === "words") {
    const max = Math.max(1, ...v.words.map((w) => w.count));
    return `<div class="snap-vis"><h4>${v.title}</h4><div class="snap-words">${v.words
      .map((w) => `<span style="font-size:${(0.85 + (w.count / max) * 0.9).toFixed(2)}rem">${esc(w.word)}${w.count > 1 ? `<small>×${w.count}</small>` : ""}</span>`)
      .join("")}</div></div>`;
  }
  return "";
}


/* ---- AI summary of the written answers (only when the server has a key) ---- */
function mdLite(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .split(/\n/)
    .map((l) => (/^\s*[-•*]\s+/.test(l) ? `<li>${l.replace(/^\s*[-•*]\s+/, "")}</li>` : l.trim() ? `<p>${l}</p>` : ""))
    .join("")
    .replace(/(<li>.*?<\/li>)+/g, (m) => `<ul>${m}</ul>`);
}
function renderAiSection(x, snap) {
  const cached = x.summary.ai?.all;
  if (!aiOn) {
    return `<h3>🤖 AI summary of written answers</h3>
      <div class="snap-ai off"><p>This lesson has ${plural(snap.written.length, "activity").replace("activitys", "activities")} with written answers (${snap.written.map((it) => itemLabel(it)).join(", ")}). An AI summary can read them all and tell you the common threads, misconceptions and what to follow up.</p>
      <p class="muted">Not switched on yet — it needs an Anthropic API key added to the server. Names are never sent, only the answers.</p></div>`;
  }
  return `<h3>🤖 AI summary of written answers</h3>
    <div class="snap-ai" id="aiBox">${cached
      ? `<div class="ai-text">${mdLite(cached.text)}</div><div class="ai-foot"><span class="muted">Summarised ${new Date(cached.at).toLocaleDateString()} · names never sent</span><button class="share-btn ghost" id="aiRedo">↻ Redo</button></div>`
      : `<p>${plural(snap.written.length, "activity").replace("activitys", "activities")} with written answers: ${snap.written.map((it) => itemLabel(it)).join(", ")}.</p>
         <button class="share-btn" id="aiGo">✨ Summarise the written answers</button> <span class="muted" style="font-size:0.78rem">Takes about 10 seconds · names are never sent</span>`}</div>`;
}
function bindAi(ov, x) {
  const box = ov.querySelector("#aiBox");
  if (!box) return;
  const run = async (force) => {
    box.innerHTML = `<p class="muted">⏳ Reading the answers…</p>`;
    try {
      const res = await fetch(`/api/lessons/${x.meta.id}/ai-summary`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, item: "all", force }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error);
      x.summary.ai = x.summary.ai || {};
      x.summary.ai.all = data.summary;
      box.innerHTML = `<div class="ai-text">${mdLite(data.summary.text)}</div><div class="ai-foot"><span class="muted">Summarised just now · names never sent</span><button class="share-btn ghost" id="aiRedo">↻ Redo</button></div>`;
    } catch (e) {
      box.innerHTML = `<p style="color:#c95c5c">Couldn't summarise right now (${esc(e.message)}). <button class="share-btn ghost" id="aiGo">Try again</button></p>`;
    }
    wire();
  };
  const wire = () => {
    const go = box.querySelector("#aiGo"); if (go) go.onclick = () => run(false);
    const redo = box.querySelector("#aiRedo"); if (redo) redo.onclick = () => run(true);
  };
  wire();
}



/* ---------- wiring ---------- */

async function shareLesson(x) {
  try {
    const res = await fetch(`/api/lessons/${x.meta.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: token }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    shareLink = `${location.origin}/insights?share=${data.key}`;
    try { await navigator.clipboard.writeText(shareLink); } catch {}
    refreshDetail();
  } catch {
    alert("Couldn't create a share link — check you're signed in and try again.");
  }
}

// Rename in place; saves to the archive so Past lessons and reports follow.
function renameLesson(x) {
  const span = document.getElementById("dTitle");
  const input = document.createElement("input");
  input.value = x.meta.title || "";
  input.placeholder = "Name this lesson…";
  input.maxLength = 80;
  input.className = "rename";
  span.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = async (save) => {
    if (done) return;
    done = true;
    const v = input.value.trim();
    if (save && v !== (x.meta.title || "")) {
      try {
        const res = await fetch(`/api/lessons/${x.meta.id}/edit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, title: v }) });
        if (!res.ok) throw new Error();
        x.meta.title = v;
        x.summary.title = v;
      } catch { alert("Couldn't save the name — try again."); }
    }
    render();
  };
  input.onkeydown = (e) => { if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); };
  input.onblur = () => finish(true);
}

/* ---------- Marking after the lesson ---------- */

// Save an answer key or a hand mark; the server re-marks the whole lesson and
// sends the result back, so every tab, print and spreadsheet follows.
async function saveMarks(x, edit) {
  const res = await fetch(`/api/lessons/${x.meta.id}/edit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, marks: [edit] }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.summary) throw new Error(data.error || "save failed");
  // Keep what the archive doesn't store (pictures, the lesson name shown on this page).
  const old = x.summary;
  (data.summary.items || []).forEach((it, i) => { if (old.items?.[i]?.images) it.images = old.items[i].images; });
  data.summary.title = data.summary.title || old.title;
  x.summary = LV.normalise(data.summary);
  const openKey = [...document.querySelectorAll("details.lv-key[open]")].map((d) => d.dataset.keybox);
  refreshDetail();
  openKey.forEach((k) => { const d = document.querySelector(`details.lv-key[data-keybox="${k}"]`); if (d) d.open = true; });
}

const splitAccept = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

function bindMarking(x) {
  const root = document.getElementById("detail");
  if (!root || root._marking) return;
  root._marking = true;
  const fail = () => alert("Couldn't save that mark — check you're signed in and try again.");
  root.addEventListener("click", async (e) => {
    const cur = current();
    if (!cur) return;
    const mb = e.target.closest(".mkb button");
    if (mb) {
      e.stopPropagation();
      const box = mb.closest(".mkb");
      const i = Number(box.dataset.mark), name = box.dataset.name;
      const v = mb.classList.contains("on") ? null : mb.dataset.v === "1"; // tap the lit one to undo
      try { await saveMarks(cur, { i, manual: { [name]: v } }); } catch { fail(); }
      return;
    }
    const chip = e.target.closest("[data-keychip]");
    if (chip) {
      const i = Number(chip.dataset.keychip);
      const key = chip.classList.contains("on") ? null : { label: chip.dataset.label };
      try { await saveMarks(cur, { i, key }); } catch { fail(); }
      return;
    }
    const clr = e.target.closest("[data-keyclear]");
    if (clr) {
      try { await saveMarks(cur, { i: Number(clr.dataset.keyclear), key: null }); } catch { fail(); }
    }
  });
  root.addEventListener("submit", async (e) => {
    const form = e.target.closest("form[data-keyform]");
    if (!form) return;
    e.preventDefault();
    const cur = current();
    if (!cur) return;
    const i = Number(form.dataset.keyform);
    let key;
    if (form.dataset.set) {
      const it = cur.summary.items[i];
      const parts = (it.questions || []).map((_, k) => { const l = splitAccept(form.elements["p" + k]?.value); return l.length ? l : null; });
      key = parts.some(Boolean) ? { parts } : null;
    } else {
      const accept = splitAccept(form.elements.accept.value);
      key = accept.length ? { accept } : null;
    }
    try { await saveMarks(cur, { i, key }); } catch { fail(); }
  });
}

function printOnly(cls, el) {
  document.body.classList.add(cls);
  if (el) el.classList.add("print-me");
  const after = () => { document.body.classList.remove(cls); if (el) el.classList.remove("print-me"); window.removeEventListener("afterprint", after); };
  window.addEventListener("afterprint", after);
  window.print();
}

function bindDetail() {
  const x = current();
  if (!x) return;
  document.querySelectorAll("[data-dtab]").forEach((b) => (b.onclick = () => {
    detailTab = b.dataset.dtab;
    refreshDetail();
  }));
  const insBox = document.getElementById("insBox");
  if (insBox) renderInsights(insBox, x.summary, { showNames: true, edit: true });
  bindMarking(x);
  const sb = document.getElementById("shareBtn");
  if (sb) sb.onclick = () => shareLesson(x);
  const rb = document.getElementById("renameBtn");
  if (rb) rb.onclick = () => renameLesson(x);
  const cb = document.getElementById("csvBtn");
  if (cb) cb.onclick = () => {
    const when = new Date(x.meta.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    const name = `${lessonTitle(x).replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60)} – ${new Date(x.meta.created_at).toISOString().slice(0, 10)}.csv`;
    LV.download(name, LV.csv(x.summary, lessonTitle(x), when, modeName));
  };

  // By student
  const si = document.getElementById("stuSearch");
  if (si) {
    si.oninput = () => {
      search = si.value;
      refreshDetail();
      const s2 = document.getElementById("stuSearch");
      s2.focus();
      s2.setSelectionRange(s2.value.length, s2.value.length);
    };
  }
  document.querySelectorAll(".stab th[data-sort]").forEach((th) => {
    th.onclick = () => {
      const k = th.dataset.sort;
      if (sortBy.key === k) sortBy.dir *= -1;
      else sortBy = { key: k, dir: 1 };
      refreshDetail();
    };
  });
  document.querySelectorAll("tr.srow[data-student]").forEach((tr) => (tr.onclick = () => {
    openStudent = openStudent === tr.dataset.student ? null : tr.dataset.student;
    refreshDetail();
    if (openStudent) document.querySelector("tr.sdetail")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }));
  document.querySelectorAll("[data-print-student]").forEach((b) => (b.onclick = (e) => {
    e.stopPropagation();
    printOnly("print-student", b.closest("tr.sdetail"));
  }));

  // Snapshot
  const sp = document.getElementById("snapPrint");
  if (sp) sp.onclick = () => printOnly("print-snap");
  const sc = document.getElementById("snapCopy");
  if (sc) sc.onclick = async () => {
    const snap = snapshotOf(x);
    const when = new Date(x.meta.created_at).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    const plain = [
      `${lessonTitle(x)} — ${when}`,
      `${snap.took} of ${snap.joined} students took part (${snap.pct}%), ${snap.responses} answers across ${plural(snap.nItems, "activity").replace("activitys", "activities")}.`,
      ...snap.takeaways.map((t) => "• " + t.text.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")),
    ].join("\n");
    try { await navigator.clipboard.writeText(plain); sc.textContent = "✓ Copied"; } catch { sc.textContent = "Couldn't copy"; }
    setTimeout(() => (sc.textContent = "📋 Copy as text"), 1800);
  };
  const snapBox = document.getElementById("snapBox");
  if (snapBox) bindAi(snapBox, x);
}

load();
