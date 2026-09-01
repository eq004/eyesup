/* Eyes Up — the teacher's data dashboard.
   Interactive views over every archived lesson: participation, activity
   mix, per-lesson energy, and a per-student table. */

const wrap = document.getElementById("wrap");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const MODE_META = {
  word_cloud: ["☁️", "Word Cloud"], one_word: ["🗣️", "One Word"], mindmap: ["🕸️", "Mindmap"],
  post_its: ["🗒️", "Post-its"], phonics: ["🔤", "Phonics"], short_answer: ["✏️", "Short Answer"],
  long_response: ["📜", "Long Response"], picture_prompt: ["🖼️", "Picture Prompt"],
  retrieval_sprint: ["🧠", "Retrieval Sprint"], table: ["📋", "Table"], exit_ticket: ["🎟️", "Exit Ticket"],
  finish_sentence: ["📝", "Finish Sentence"], give_example: ["💡", "Give Example"],
  make_connection: ["🔗", "Connection"], teach_back: ["🧑‍🏫", "Teach Back"], spot_mistake: ["🔎", "Spot Mistake"],
  quick_challenge: ["🚀", "Challenge"], predict: ["🔮", "Predict"], three_two_one: ["3️⃣", "3-2-1"],
  notice_wonder: ["👀", "Notice/Wonder"], before_after: ["🔄", "Before/After"], plus_minus: ["➕", "Plus & Minus"],
  muddiest_point: ["🌫️", "Muddiest Point"], ask_question: ["❓", "Ask a Question"],
  poll: ["📊", "Poll"], multi_choice: ["🅰️", "Multiple Choice"], picture_vote: ["🗳️", "Picture Vote"],
  agree_disagree: ["⚖️", "Agree/Disagree"], true_false: ["✅", "True/False"], this_or_that: ["⚡", "This or That"],
  confidence: ["🎯", "Confidence"], smiley: ["😊", "Smiley Review"], scale: ["🎚️", "Scale"],
  example_nonexample: ["↔️", "Example/Non-ex"], ranking: ["🔢", "Ranking"], put_in_order: ["🪜", "Put in Order"],
  match_up: ["🧩", "Match Up"], venn: ["◉", "Venn"], spelling: ["🔡", "Spelling"], cloze: ["▭", "Cloze"],
  working: ["🧮", "Working Out"], counters: ["🟠", "Counters"], sketch: ["🎨", "Sketch"], annotate: ["🖍️", "Annotate"],
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

async function load() {
  if (!token) {
    wrap.innerHTML = `<div class="gate">📈<br/><b>Sign in first.</b><br/><span class="muted">Open the <a href="/teacher">teacher dashboard</a>, sign in, then come back here.</span></div>`;
    return;
  }
  let list;
  try {
    const res = await fetch(`/api/lessons?${authQ}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (!data.storage) {
      wrap.innerHTML = `<div class="gate muted">No database connected — the data dashboard needs lesson storage.</div>`;
      return;
    }
    list = data.lessons;
  } catch {
    wrap.innerHTML = `<div class="gate">Couldn't load your data — <a href="/teacher">sign in on the dashboard</a> and try again.</div>`;
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
    render();
    document.getElementById("detail").scrollIntoView({ behavior: "smooth", block: "start" });
  }));
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
  const items = (s.items || []);
  const maxResp = Math.max(1, ...items.map((it) => it.responses || 0));
  const { total, rows } = studentStats(s);

  let shown = rows;
  if (search) shown = rows.filter((r) => canonical(r.name).includes(canonical(search)));
  shown = [...shown].sort((a, b) => {
    if (sortBy.key === "name") return sortBy.dir * a.name.localeCompare(b.name);
    return sortBy.dir * ((b.n / total) - (a.n / total)) || a.name.localeCompare(b.name);
  });

  const when = new Date(x.meta.created_at).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });

  return `
    <div class="card">
      <h2>${x.meta.title ? esc(x.meta.title) : `Lesson ${esc(x.meta.code)}`} <span class="muted" style="font-weight:500;font-size:0.85rem">· ${esc(when)} · ${s.participatedCount}/${s.joinedCount} participated${s.teacherName ? ` · ${esc(s.teacherName)}` : ""}</span></h2>
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
      <p class="muted" style="font-size:0.78rem;margin-top:0.7rem">Students are matched by the name they typed, so a re-typed name counts separately. Open the full <a href="/report?lesson=${x.meta.id}&${authQ}" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700">report / PDF</a> for every answer.</p>
    </div>`;
}

function bindDetail() {
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

load();
