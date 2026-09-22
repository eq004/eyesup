/* Eyes Up — the teacher's data dashboard.
   Interactive views over every archived lesson: participation, activity
   mix, per-lesson energy, and a per-student table. */

const wrap = document.getElementById("wrap");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const MODE_META = {
  word_cloud: ["☁️", "Word Cloud"], one_word: ["🗣️", "One Word"], mindmap: ["🕸️", "Mindmap"],
  post_its: ["🗒️", "Post-its"], phonics: ["🔤", "Phonics"], short_answer: ["✏️", "Short Answer"],
  long_response: ["📜", "Long Response"], picture_prompt: ["🖼️", "Picture Prompt"],
  retrieval_sprint: ["🧠", "Retrieval Sprint"], table: ["📋", "Table"], question_set: ["📝", "Question Set"], dot_points: ["📌", "Dot Points"], link: ["🔗", "Website Link"], exit_ticket: ["🎟️", "Exit Ticket"],
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
  working: ["🧮", "Working Out"], counters: ["🟠", "Counters"], sketch: ["🎨", "Sketch"], annotate: ["🖍️", "Annotate"], image_drop: ["📥", "Drop an Image"], image_caption: ["📸", "Image + Writing"], image_long: ["📓", "Image + Long Answer"], maths_board: ["🧮", "Maths Board"], counters_draw: ["🟠", "Counters + Drawing"],
};
const modeIcon = (m) => (MODE_META[m] || ["▫️", m])[0];
const modeName = (m, ck) => (m === "counters" && ck === "base10" ? "Tens & Ones" : (MODE_META[m] || ["", m])[1]);

const token = localStorage.getItem("eyesup_token") || "";
const authQ = token ? `t=${encodeURIComponent(token)}` : "";
const canonical = (n) => String(n || "").trim().toLowerCase();

let lessons = []; // [{meta, summary}]
let selectedId = null;
let sortBy = { key: "pct", dir: 1 };
let search = "";
let detailTab = "part"; // "part" | "ins"
let shareLink = ""; // per-lesson, cleared on lesson change

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
  const recent = list.slice(0, 40);
  const detail = await Promise.all(
    recent.map((l) =>
      fetch(`/api/lessons/${l.id}?${authQ}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    )
  );
  lessons = recent
    .map((meta, i) => ({ meta, summary: detail[i] }))
    .filter((x) => x.summary)
    .sort((a, b) => new Date(a.meta.created_at) - new Date(b.meta.created_at)); // chronological
  selectedId = lessons[lessons.length - 1]?.meta.id ?? null;
  render();
}

function overview() {
  const nLessons = lessons.length;
  let nInteractions = 0, nResponses = 0, pctSum = 0, pctN = 0;
  const students = new Set();
  for (const { summary: s } of lessons) {
    nInteractions += s.interactionCount || 0;
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
  return `${x.meta.title ? esc(x.meta.title) : esc(x.meta.code)}<br/>${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function render() {
  const o = overview();

  // activity mix across all lessons
  const mix = new Map();
  lessons.forEach(({ summary: s }) =>
    (s.items || []).forEach((it) => {
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
      <div class="sub">Grey = joined, blue = participated. Click a lesson to explore it below.</div>
      <div class="lchart">${lessons
        .map((x) => {
          const s = x.summary;
          const pct = s.joinedCount ? Math.round((s.participatedCount / s.joinedCount) * 100) : 0;
          const jh = Math.max(6, (s.joinedCount / maxJoined) * 130);
          const ph = Math.max(4, (s.participatedCount / maxJoined) * 130);
          return `<div class="lbar ${x.meta.id === selectedId ? "sel" : ""}" data-lesson="${x.meta.id}"
              title="${esc(x.meta.title || x.meta.code)} — ${s.participatedCount}/${s.joinedCount} participated">
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
    render();
    document.getElementById("detail").scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  bindDetail();
}

function refreshDetail() {
  document.getElementById("detail").innerHTML = renderDetail();
  bindDetail();
}

function studentStats(s) {
  // interactions that actually collected responses
  const active = (s.items || []).filter((it) => (it.responses || 0) > 0 && !it.anonymous);
  const byName = new Map();
  active.forEach((it) => {
    const seen = new Set();
    (it.students || []).forEach((x) => {
      if (!x.name) return;
      const k = canonical(x.name);
      if (seen.has(k)) return; // rejoined device — count once per activity
      seen.add(k);
      if (!byName.has(k)) byName.set(k, { name: x.name, n: 0 });
      byName.get(k).n += 1;
    });
  });
  return { total: active.length, rows: [...byName.values()] };
}

function renderDetail() {
  const x = lessons.find((l) => l.meta.id === selectedId);
  if (!x) return "";
  const s = x.summary;
  const when = new Date(x.meta.created_at).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });

  return `
    <div class="card">
      <h2>${x.meta.title ? esc(x.meta.title) : `Lesson ${esc(x.meta.code)}`} <span class="muted" style="font-weight:500;font-size:0.85rem">· ${esc(when)} · ${s.participatedCount}/${s.joinedCount} participated${s.teacherName ? ` · ${esc(s.teacherName)}` : ""}</span></h2>
      <div class="dtabs">
        <button class="dtab ${detailTab === "part" ? "on" : ""}" data-dtab="part">👥 Student participation</button>
        <button class="dtab ${detailTab === "ins" ? "on" : ""}" data-dtab="ins">📊 Lesson dashboard</button>
        <span class="spacer"></span>
        <button class="dtab viz" id="vizBtn">✨ Visualise this lesson</button>
      </div>
      ${detailTab === "part" ? renderParticipation(x) : renderInsightsTab(x)}
    </div>`;
}

function renderParticipation(x) {
  const s = x.summary;
  const items = (s.items || []);
  const maxResp = Math.max(1, ...items.map((it) => it.responses || 0));
  const { total, rows } = studentStats(s);

  let shown = rows;
  if (search) shown = rows.filter((r) => canonical(r.name).includes(canonical(search)));
  shown = [...shown].sort((a, b) => {
    if (sortBy.key === "name") return sortBy.dir * a.name.localeCompare(b.name);
    return sortBy.dir * ((b.n / total) - (a.n / total)) || a.name.localeCompare(b.name);
  });

  return `
      <div class="sub">Response energy, activity by activity — dips are where the room lost people.</div>
      <div class="ichart">${items
        .map((it, i) => {
          const h = Math.max(4, ((it.responses || 0) / maxResp) * 100);
          return `<div class="ibar" title="${i + 1}. ${esc(modeName(it.mode, it.counterKind))}${it.prompt ? " — " + esc(it.prompt) : ""} · ${it.responses} responses">
            <div class="bar" style="height:${h}px"></div>
            <div class="cnt">${it.responses}</div>
            <div class="ic">${modeIcon(it.mode)}</div>
          </div>`;
        })
        .join("")}</div>

      <h2 style="margin-top:1.6rem">Students in this lesson</h2>
      <div class="sub">Responses given out of ${total} counted activities (anonymous modes excluded). Click headers to sort.</div>
      <input class="search" id="stuSearch" placeholder="🔍 Find a student…" value="${esc(search)}" />
      <table class="stab">
        <thead><tr>
          <th data-sort="name">Student ${sortBy.key === "name" ? (sortBy.dir === 1 ? "▲" : "▼") : ""}</th>
          <th data-sort="pct">Participation ${sortBy.key === "pct" ? (sortBy.dir === 1 ? "▼" : "▲") : ""}</th>
          <th class="bar-cell"></th>
        </tr></thead>
        <tbody>${shown
          .map((r) => {
            const pct = total ? Math.round((r.n / total) * 100) : 0;
            const cls = pct >= 70 ? "p-hi" : pct >= 40 ? "p-mid" : "p-lo";
            return `<tr><td><b>${esc(r.name)}</b></td>
              <td style="white-space:nowrap">${r.n} / ${total} · <b>${pct}%</b></td>
              <td class="bar-cell"><div class="pbarr"><div class="pfill ${cls}" style="width:${pct}%"></div></div></td></tr>`;
          })
          .join("")}</tbody>
      </table>
      <p class="muted" style="font-size:0.78rem;margin-top:0.7rem">Students are matched by the name they typed, so a re-typed name counts separately. Open the full <a href="/report?lesson=${x.meta.id}&${authQ}" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700">report / PDF</a> for every answer.</p>`;
}

function renderInsightsTab(x) {
  return `
      <div class="sub">Everything this lesson captured, as a visual dashboard with every student's name and answer.</div>
      <div class="share-row">
        <a class="share-btn" style="text-decoration:none" href="/insights?lesson=${x.meta.id}&${authQ}" target="_blank" rel="noopener">📄 Export lesson (PDF / print)</a>
        <button class="share-btn" id="shareBtn" style="background:var(--surface);color:var(--ink);border:1.5px solid var(--line)">🔗 ${shareLink ? "Copy share link again" : "Share with a link"}</button>
        ${(x.summary.items || []).some((it) => it.images?.length) ? `<a class="share-btn" style="text-decoration:none;background:var(--surface);color:var(--ink);border:1.5px solid var(--line)" href="/api/lessons/${x.meta.id}/images?${authQ}">⬇ Student images (ZIP)</a>` : ""}
        ${shareLink ? `<span class="share-link">${esc(shareLink)}</span><span class="muted" style="font-size:0.78rem">Copied! Anyone with the link can view it — the shared version hides student names.</span>` : `<span class="muted" style="font-size:0.78rem">The export keeps names; the share link is view-only for anyone and hides them.</span>`}
      </div>
      <div id="insBox"></div>`;
}

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

function bindDetail() {
  const x = lessons.find((l) => l.meta.id === selectedId);
  document.querySelectorAll("[data-dtab]").forEach((b) => (b.onclick = () => {
    detailTab = b.dataset.dtab;
    refreshDetail();
  }));
  const insBox = document.getElementById("insBox");
  if (insBox && x) renderInsights(insBox, x.summary, { showNames: true });
  const sb = document.getElementById("shareBtn");
  if (sb && x) sb.onclick = () => shareLesson(x);
  const vb = document.getElementById("vizBtn");
  if (vb && x) vb.onclick = () => openSnapshot(x);
  const si = document.getElementById("stuSearch");
  if (si) {
    si.oninput = () => {
      search = si.value;
      document.getElementById("detail").innerHTML = renderDetail();
      bindDetail();
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
      document.getElementById("detail").innerHTML = renderDetail();
      bindDetail();
    };
  });
}

/* ---------- ✨ Lesson snapshot: the whole lesson on one calm screen ---------- */

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
  const items = (s.items || []).filter((it) => it.mode !== "link");
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

  // Energy: peaks and dips
  const counted = items.filter((it) => (it.responses || 0) > 0 || joined);
  if (counted.length >= 2) {
    const hi = [...counted].sort((a, b) => (b.responses || 0) - (a.responses || 0))[0];
    const lo = [...counted].sort((a, b) => (a.responses || 0) - (b.responses || 0))[0];
    if (hi !== lo && (hi.responses || 0) > (lo.responses || 0))
      takeaways.push({ icon: "⚡", text: `Energy peaked at ${itemLabel(hi)} (${plural(hi.responses, "answer")}) and dipped at ${itemLabel(lo)} (${plural(lo.responses || 0, "answer")}).` });
  }

  // Quiet students
  const { total, rows } = studentStats(s);
  if (total >= 2 && rows.length) {
    const quiet = rows.filter((r) => r.n / total < 0.4).map((r) => r.name).sort();
    const stars = rows.filter((r) => r.n === total).map((r) => r.name).sort();
    if (quiet.length) takeaways.push({ icon: "🤫", text: `<b>Quieter students</b> (answered under 40% of activities): ${listNames(quiet)}.` });
    if (stars.length && stars.length < rows.length) takeaways.push({ icon: "⭐", text: `Answered every single activity: ${listNames(stars)}.` });
  }
  const never = joined && took < joined && s.items
    ? (() => {
        const answered = new Set();
        s.items.forEach((it) => (it.students || []).forEach((st) => st.name && answered.add(canonical(st.name))));
        const all = new Set();
        s.items.forEach((it) => (it.noResponse || []).forEach((n) => all.add(n)));
        return [...all].filter((n) => !answered.has(canonical(n))).sort();
      })()
    : [];
  if (never.length) takeaways.push({ icon: "👀", text: `Joined but never answered: ${listNames(never)}.` });

  // Per-activity takeaways (the interesting ones only)
  for (const it of items) {
    if (!it.responses) continue;
    if (it.distribution && !["spelling", "cloze", "phonics_cloze", "working", "counters"].includes(it.mode)) {
      const tot = it.distribution.reduce((a, d) => a + d.count, 0);
      if (!tot) continue;
      const top = [...it.distribution].sort((a, b) => b.count - a.count)[0];
      const topPct = Math.round((top.count / tot) * 100);
      const correct = it.distribution.find((d) => /✓$/.test(d.label));
      if (correct) {
        const cp = Math.round((correct.count / tot) * 100);
        takeaways.push({ icon: cp >= 70 ? "✅" : cp >= 40 ? "🟡" : "❗", text: `${itemLabel(it)}: <b>${cp}% got it right</b> (${esc(correct.label.replace(/ ✓$/, ""))}).${cp < 70 ? " Worth revisiting." : ""}` });
      } else if (it.mode === "tick_boxes") {
        takeaways.push({ icon: "☑️", text: `${itemLabel(it)}: most ticked <b>${esc(top.label)}</b> (${top.count} of ${it.responses}).` });
      } else {
        const split = topPct < 55 && it.distribution.length >= 2 ? " — a real split" : topPct >= 80 ? " — near-unanimous" : "";
        takeaways.push({ icon: "📊", text: `${itemLabel(it)}: <b>${esc(top.label)}</b> led with ${topPct}%${split}.` });
      }
      visuals.push({ kind: "bars", title: `${modeIcon(it.mode)} ${itemLabel(it)}`, rows: it.distribution.map((d) => ({ label: d.label, count: d.count })) });
    } else if (["spelling", "cloze", "phonics_cloze"].includes(it.mode) && it.distribution) {
      const hard = [...it.distribution].sort((a, b) => a.count - b.count)[0];
      const hp = Math.round((hard.count / it.responses) * 100);
      takeaways.push({ icon: hp < 50 ? "❗" : "🔡", text: `${modeName(it.mode)}: <b>${esc(hard.label.split("  (")[0])}</b> was the hardest — ${hp}% got it.` });
      visuals.push({ kind: "bars", title: `${modeIcon(it.mode)} ${esc(modeName(it.mode))} — how many got each right (of ${it.responses})`, rows: it.distribution.map((d) => ({ label: d.label, count: d.count })) });
    } else if (["working", "counters"].includes(it.mode) && it.distribution) {
      const right = it.distribution.filter((d) => /✓$/.test(d.label)).reduce((a, d) => a + d.count, 0);
      const marked = it.distribution.some((d) => /[✓✗]$/.test(d.label));
      if (marked) {
        const rp = Math.round((right / it.responses) * 100);
        takeaways.push({ icon: rp >= 70 ? "✅" : "❗", text: `${itemLabel(it)}: <b>${rp}% reached the right answer</b>.` });
      }
      visuals.push({ kind: "bars", title: `${modeIcon(it.mode)} ${itemLabel(it)} — answers given`, rows: it.distribution.map((d) => ({ label: d.label, count: d.count })) });
    } else if (it.topWords?.length) {
      takeaways.push({ icon: "☁️", text: `${itemLabel(it)}: the room said <b>${it.topWords.slice(0, 3).map((w) => esc(w.word)).join("</b>, <b>")}</b> most.` });
      visuals.push({ kind: "words", title: `${modeIcon(it.mode)} ${itemLabel(it)}`, words: it.topWords });
    } else if (it.scale?.avg != null) {
      const [lo, hi] = it.scale.labels || [];
      const v = Number(it.scale.avg);
      takeaways.push({ icon: "🎚️", text: `${itemLabel(it)}: the class averaged <b>${v.toFixed(1)}</b>${lo && hi ? ` (between “${esc(lo)}” and “${esc(hi)}”)` : ""}.` });
    } else if (it.ranked?.length) {
      takeaways.push({ icon: "🔢", text: `${itemLabel(it)}: the class put <b>${esc(it.ranked[0].label)}</b> first.` });
    } else if (it.matchStats?.length) {
      const weakest = [...it.matchStats].sort((a, b) => a.correctPct - b.correctPct)[0];
      takeaways.push({ icon: "🧩", text: `Match Up: weakest pair was <b>${esc(weakest.pair)}</b> (${weakest.correctPct}% right).` });
    } else if (it.sketchCount) {
      takeaways.push({ icon: "🎨", text: `${itemLabel(it)}: ${plural(it.sketchCount, "picture")} came in.` });
    }
  }

  // Energy strip always
  if (items.length) visuals.unshift({ kind: "energy", title: "Answers per activity, in order", items });

  return { pct, joined, took, responses, nItems: items.length, takeaways: takeaways.slice(0, 12), visuals: visuals.slice(0, 6) };
}

function renderSnapshotVisual(v) {
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

function openSnapshot(x) {
  const snap = snapshotOf(x);
  const s = x.summary;
  const when = new Date(x.meta.created_at).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const ring = (p) => {
    const r = 44, c = 2 * Math.PI * r;
    return `<svg class="snap-ring" viewBox="0 0 110 110"><circle cx="55" cy="55" r="${r}" class="bg"/><circle cx="55" cy="55" r="${r}" class="fg" style="stroke-dasharray:${c};stroke-dashoffset:${c * (1 - p / 100)}"/><text x="55" y="61" text-anchor="middle">${p}%</text></svg>`;
  };
  const plain = [
    `${x.meta.title || "Lesson " + x.meta.code} — ${when}`,
    `${snap.took} of ${snap.joined} students took part (${snap.pct}%), ${snap.responses} answers across ${plural(snap.nItems, "activity").replace("activitys", "activities")}.`,
    ...snap.takeaways.map((t) => "• " + t.text.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")),
  ].join("\n");

  const ov = document.createElement("div");
  ov.className = "snap-overlay";
  ov.innerHTML = `
    <div class="snap" role="dialog" aria-label="Lesson snapshot">
      <div class="snap-head">
        <div>
          <div class="snap-kicker">✨ Lesson snapshot</div>
          <h2>${x.meta.title ? esc(x.meta.title) : `Lesson ${esc(x.meta.code)}`}</h2>
          <div class="muted">${esc(when)}${s.teacherName ? ` · ${esc(s.teacherName)}` : ""}</div>
        </div>
        <div class="snap-actions">
          <button class="share-btn ghost" id="snapCopy">📋 Copy as text</button>
          <button class="share-btn ghost" id="snapPrint">🖨 Print</button>
          <button class="share-btn ghost" id="snapClose">✕ Close</button>
        </div>
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
      ${snap.visuals.length ? `<h3>At a glance</h3><div class="snap-grid">${snap.visuals.map(renderSnapshotVisual).join("")}</div>` : ""}
      <p class="muted" style="font-size:0.78rem;margin-top:1rem">Want every answer? Use 📊 Lesson dashboard or 📄 Export lesson. This snapshot is the short version.</p>
    </div>`;
  document.body.appendChild(ov);
  document.body.classList.add("snap-open");
  const close = () => { ov.remove(); document.body.classList.remove("snap-open"); };
  ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.querySelector("#snapClose").onclick = close;
  ov.querySelector("#snapPrint").onclick = () => window.print();
  ov.querySelector("#snapCopy").onclick = async () => {
    const b = ov.querySelector("#snapCopy");
    try { await navigator.clipboard.writeText(plain); b.textContent = "✓ Copied"; } catch { b.textContent = "Couldn't copy"; }
    setTimeout(() => (b.textContent = "📋 Copy as text"), 1800);
  };
  document.addEventListener("keydown", function onKey(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); } });
}

load();
