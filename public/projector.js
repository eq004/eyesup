/* Eyes Up — projected classroom screen */

const stage = document.getElementById("stage");
const barCode = document.getElementById("barCode");
const barCount = document.getElementById("barCount");

let ws = null;
let state = null;
let code = (new URLSearchParams(location.search).get("code") || "").toUpperCase();

const MODE_TAGS = {
  word_cloud: "Word Cloud", short_answer: "Short Answer", poll: "Poll",
  agree_disagree: "Agree / Disagree", confidence: "Confidence Check",
  ranking: "Ranking", predict: "Make a Prediction", this_or_that: "This or That",
  one_word: "One Word", ask_question: "Your Questions",
  true_false: "True or False", mindmap: "Mindmap", exit_ticket: "Exit Ticket",
  muddiest_point: "Muddiest Point", retrieval_sprint: "Retrieval Sprint — 60 seconds",
  sketch: "Sketch It", spot_mistake: "Spot the Mistake",
  example_nonexample: "Example or Non-example?", teach_back: "Teach It Back",
  match_up: "Match Up", put_in_order: "Put in Order", give_example: "Give an Example",
  make_connection: "Make a Connection", finish_sentence: "Finish the Sentence",
  notice_wonder: "Notice / Wonder", quick_challenge: "Quick Challenge",
  three_two_one: "3 – 2 – 1", before_after: "Before / After",
  venn: "Venn Diagram", multi_choice: "Multiple Choice", post_its: "Post-it Board",
  smiley: "Smiley Review", scale: "Where Do You Stand?", annotate: "Annotate",
  picture_prompt: "Picture Prompt", picture_vote: "Picture Vote", phonics: "Build the Word",
  spelling: "Spelling Test", cloze: "Fill the Gaps", working: "Show Your Working",
  counters: "Build It With Counters",
};

const COUNTER_COLORS = ["#e05252", "#4a7de0", "#e8c33c", "#3f9e5f"];
function boardSvg(items, kind, width) {
  const inner = (items || [])
    .map((it) =>
      kind === "base10"
        ? it.k === 0
          ? `<g><rect x="${it.x - 2}" y="${it.y - 10}" width="4" height="20" fill="#7f8ff0" stroke="#4a3fb5" stroke-width="0.5"/>${Array.from(
              { length: 9 },
              (_, s) => `<line x1="${it.x - 2}" y1="${it.y - 10 + 2 * (s + 1)}" x2="${it.x + 2}" y2="${it.y - 10 + 2 * (s + 1)}" stroke="#4a3fb5" stroke-width="0.3"/>`
            ).join("")}</g>`
          : `<rect x="${it.x - 2}" y="${it.y - 2}" width="4" height="4" fill="#7f8ff0" stroke="#4a3fb5" stroke-width="0.5"/>`
        : `<circle cx="${it.x}" cy="${it.y}" r="3.4" fill="${COUNTER_COLORS[it.k] || "#999"}" stroke="rgba(0,0,0,0.25)" stroke-width="0.5"/>`
    )
    .join("");
  return `<svg viewBox="0 0 100 62" style="width:${width};background:#f4f2ea;border-radius:10px" aria-label="counter board">${inner}</svg>`;
}

function phonCat(p) {
  if (p === "-e") return "sil";
  if (["a", "e", "i", "o", "u", "oo"].includes(p)) return "vow";
  if (["ch", "sh", "th", "ph", "ck", "wh", "ng", "qu"].includes(p)) return "dig";
  if (["ow", "er", "ar", "ai", "ay", "ee", "ea", "igh", "oa", "oi", "oy"].includes(p)) return "team";
  return "let";
}

const CLOUD_COLORS = ["#e9ecff", "#9db1ff", "#8fd6a9", "#edc27a", "#e0a7f0", "#7fd0d4", "#f4f2ea", "#c4cdfb"];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------- connection ---------------- */

const send = (obj) => ws && ws.readyState === 1 && ws.send(JSON.stringify(obj));

function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onopen = () => {
    if (code) ws.send(JSON.stringify({ type: "projector_join", code }));
  };
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "error") {
      code = "";
      renderCodeEntry(true);
      return;
    }
    if (msg.type === "state") {
      state = msg;
      render();
    }
  };
  ws.onclose = () => setTimeout(connect, 1200);
}

/* ---------------- render ---------------- */

function render() {
  if (!state) return renderCodeEntry(false);
  barCode.textContent = state.code;
  barCount.innerHTML = `<span class="dot"></span> ${state.studentCount} in the room`;

  const itx = state.interaction;

  updateJoinBadge();

  if (state.phase === "ended") {
    stage.innerHTML = bigState("🙌", "Great thinking today", "Recap complete.");
    return;
  }

  // Teacher pressed the QR button — the join screen takes over until toggled off.
  if (state.showJoin) return renderLobby();

  // Room-tool focus takes the big screen until the teacher clears it.
  if (state.focus?.type === "spotlight") {
    stage.innerHTML = `
      <div class="giant-emoji">🎲</div>
      <div class="giant-sub" style="margin-top:1rem">All eyes on…</div>
      <div class="spot-name">${esc(state.focus.name)}</div>
      <div class="giant-sub">Your voice — tell us what you think.</div>`;
    return;
  }
  if (state.focus?.type === "groups") {
    stage.innerHTML = `
      <div class="q-tag">Working Groups</div>
      <h1 class="prompt" style="margin-bottom:1.6rem">Find your people 👥</h1>
      <div class="groups-grid">${state.focus.groups
        .map(
          (g, i) => `
        <div class="group-card" style="animation-delay:${i * 0.08}s">
          <h3>Group ${i + 1}</h3>
          <ul>${g.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
        </div>`
        )
        .join("")}</div>`;
    return;
  }

  if (state.phase === "eyesup" || (!itx && state.phase !== "lobby")) {
    stage.innerHTML = bigState("👀", "Eyes up", "Back to the room. Let's talk about it.");
    return;
  }
  if (!itx) return renderLobby();

  renderInteraction(itx);
}

/* ---------------- always-on join badge ---------------- */

let badgeCode = null; // rebuild the little QR only when the code changes

function joinTarget() {
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  const host = isLocal && state.joinHost ? state.joinHost : location.host;
  const proto = isLocal ? "http:" : location.protocol;
  return { host, url: `${proto}//${host}/join?code=${state.code}` };
}

function updateJoinBadge() {
  const el = document.getElementById("joinBadge");
  // Hidden in the lobby / forced join screen (a big one is already up) and when over.
  const wanted = state.phase !== "lobby" && !state.showJoin && state.phase !== "ended";
  el.classList.toggle("show", wanted);
  if (!wanted) return;
  if (badgeCode === state.code) return;
  badgeCode = state.code;
  const { host, url } = joinTarget();
  let qrSvg = "";
  try {
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    qrSvg = qr.createSvgTag({ cellSize: 3, margin: 2, scalable: true });
  } catch { /* fine without */ }
  el.innerHTML = `
    ${qrSvg ? `<span class="mini-qr">${qrSvg}</span>` : ""}
    <span class="txt">${esc(host)}/join<br/><b>${esc(state.code)}</b></span>`;
}

/* ---------------- timer overlay ---------------- */

function updateTimerOverlay() {
  const el = document.getElementById("timerOverlay");
  const t = state?.timer;
  if (!t) { el.classList.remove("show", "urgent"); return; }
  const left = t.paused ? t.remaining : Math.max(0, t.endsAt - Date.now());
  const s = Math.ceil(left / 1000);
  el.classList.add("show");
  el.classList.toggle("urgent", left > 0 && left <= 10000);
  el.innerHTML =
    left <= 0
      ? `⏰ Time's up`
      : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}${t.paused ? `<span class="paused-tag">paused</span>` : ""}`;
}
setInterval(updateTimerOverlay, 250);

function bigState(emoji, title, sub) {
  return `
    <div class="giant-emoji">${emoji}</div>
    <div class="giant-title">${esc(title)}</div>
    <div class="giant-sub">${esc(sub)}</div>`;
}

function renderLobby() {
  // Locally, advertise the LAN address other devices can reach; on a real
  // deployment the page's own host IS the public address.
  const { host, url: full } = joinTarget();
  const joinUrl = `${host}/join`;
  let qrSvg = "";
  try {
    const qr = qrcode(0, "M");
    qr.addData(full);
    qr.make();
    qrSvg = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  } catch { /* QR lib missing — code alone is fine */ }

  stage.innerHTML = `
    ${state.title ? `<div class="q-tag" style="margin-bottom:1.5rem">${esc(state.title)}</div>` : ""}
    <div class="join-wrap">
      <div class="join-block">
        <div class="lead">Grab any device and go to</div>
        <div class="url">${esc(joinUrl)}</div>
        <div class="lead">Class code</div>
        <div class="bigcode">${esc(state.code)}</div>
      </div>
      ${qrSvg ? `<div class="qr-card">${qrSvg}</div>` : ""}
    </div>
    <div class="joined-pill"><b>${state.studentCount}</b> ${state.studentCount === 1 ? "student is" : "students are"} in — then it's eyes up. 👀</div>`;
}

function promptBlock(itx) {
  const tag = itx.mode === "counters" && itx.counterKind === "base10" ? "Tens & Ones" : MODE_TAGS[itx.mode] || itx.mode;
  return `
    <div class="q-tag">${tag}</div>
    <h1 class="prompt">${itx.prompt ? esc(itx.prompt) : `<span class="aloud">Listen to the question…</span>`}</h1>`;
}

function progressLine(itx) {
  return `
    <div class="progress-line ${itx.open ? "" : "closed"}">
      <span class="dot"></span>
      <span><b>${state.respondedCount}</b> of <b>${state.studentCount}</b> responded${itx.open ? "" : " · closed"}</span>
    </div>`;
}

function renderInteraction(itx) {
  const agg = itx.aggregate;
  let body = "";

  if (!agg) {
    // Results hidden — build anticipation, show only the count.
    body = `<p class="waiting-note">${itx.open ? "Thinking time… responses are coming in." : "Responses are in. Waiting for the reveal…"}</p>`;
  } else if (agg.words) {
    body = itx.mode === "mindmap" ? renderMindmap(itx, agg) : renderCloud(agg);
  } else if (itx.mode === "example_nonexample") {
    body = renderBars(itx, agg) + renderWhys(agg);
  } else if (agg.matches) {
    body = renderMatches(agg);
  } else if (itx.mode === "venn") {
    body = renderVenn(agg);
  } else if (itx.mode === "post_its") {
    body = renderStickies(agg);
  } else if (itx.mode === "smiley") {
    body = renderSmileys(itx, agg);
  } else if (itx.mode === "scale") {
    body = renderScale(agg);
  } else if (itx.mode === "annotate") {
    body = agg.sketches.length
      ? renderSketches(agg)
      : `${itx.imageUrl ? `<img src="${itx.imageUrl}" alt="image to annotate" style="max-height:45vh;max-width:80%;border-radius:14px;box-shadow:0 16px 44px rgba(0,0,0,0.45)" />` : ""}
         <p class="waiting-note" style="margin-top:1.4rem">${agg.total ? `${agg.total} annotation${agg.total === 1 ? "" : "s"} in — your teacher will reveal them.` : "Mark it up on your device…"}</p>`;
  } else if (agg.counts) {
    body = renderBars(itx, agg);
  } else if (agg.ranked) {
    body = renderRanked(agg);
  } else if (agg.builds) {
    body = renderBuilds(agg);
  } else if (itx.mode === "spelling") {
    body = renderMarkedStats(agg, "How we spelled them");
  } else if (itx.mode === "cloze") {
    body = renderCloze(agg);
  } else if (itx.mode === "working") {
    body = renderWorkings(agg);
  } else if (itx.mode === "counters") {
    body = renderCounterBoards(agg);
  } else if (agg.sketches) {
    body = renderSketches(agg);
  } else if (agg.fields) {
    body = renderStructured(agg);
  } else if (agg.revealed) {
    body = renderAnswers(itx, agg);
  }

  // A spotlighted response (any type, except sketch which has its own stage)
  // replaces the body until tapped away.
  if (agg?.spotlight && !["sketch", "annotate"].includes(itx.mode)) {
    body = renderGenericSpotlight(agg.spotlight);
  }

  stage.innerHTML = promptBlock(itx) + body + progressLine(itx);

  // Interactive whiteboard: tap a response to spotlight it; while one is
  // up, tapping anywhere else takes the board back to normal.
  if (agg?.spotlight) {
    stage.onclick = (e) => {
      const hit = e.target.closest("[data-spot]");
      send({ type: "spotlight_response", studentId: hit ? hit.dataset.spot : null });
    };
  } else {
    stage.onclick = null;
    stage.querySelectorAll("[data-spot]").forEach((el) => {
      el.onclick = () => send({ type: "spotlight_response", studentId: el.dataset.spot });
    });
  }
}

/* Any non-drawing response, blown up big for discussion. */
function renderGenericSpotlight(s) {
  let inner = "";
  if (s.kind === "text") {
    inner = `<div class="spot-text">${esc(s.text)}</div>`;
  } else if (s.kind === "structured") {
    inner = `<div class="spot-text" style="text-align:left">${s.fields
      .map((f, i) => (s.parts[i] ? `<div style="margin-bottom:0.5em"><b style="color:var(--glow);font-size:0.55em">${esc(f)}</b><br/>${esc(s.parts[i])}</div>` : ""))
      .join("")}</div>`;
  } else if (s.kind === "phonics") {
    inner = `<div class="build-card" style="transform:scale(1.8);margin:3rem 0">${s.parts
      .map((p) => `<span class="build-seg bs-${phonCat(p)}">${esc(p === "-e" ? "e" : p)}</span>`)
      .join("")}</div>`;
  } else if (s.kind === "working") {
    inner = `<div class="spot-text" style="font-family:ui-monospace,monospace;text-align:left">
      ${(s.lines || []).map((l) => `<div style="color:var(--chalk-dim)">${esc(l)}</div>`).join("")}
      <b>= ${esc(s.answer || "—")}${s.ok === true ? " ✓" : s.ok === false ? " ✗" : ""}</b></div>`;
  } else if (s.kind === "board") {
    inner = `${boardSvg(s.items, s.counterKind, "min(640px, 74vw)")}
      <div class="spot-text" style="margin-top:0.6rem">= ${esc(s.answer || "—")}${s.ok === true ? " ✓" : s.ok === false ? " ✗" : ""}</div>`;
  }
  return `<div class="spot-stage">
    <div class="spot-card">${inner}${s.name ? `<div class="sketch-name" style="font-size:clamp(1rem,2vw,1.5rem)">${esc(s.name)}</div>` : ""}</div>
    <p class="tap-hint">tap anywhere to go back</p>
  </div>`;
}

/* Mindmap — submissions branch out around the central concept. */
function renderMindmap(itx, agg) {
  const items = agg.words.slice(0, 22);
  if (!items.length) return `<p class="waiting-note">Ideas will branch out here as they land…</p>`;
  const W = 1200, H = 560, cx = W / 2, cy = H / 2;
  const max = Math.max(...items.map((w) => w.count));
  const nodes = items.map((w, i) => {
    const angle = i * 2.39996; // golden angle — organic spread
    const r = 130 + 150 * Math.sqrt(i / Math.max(1, items.length - 1));
    return {
      ...w,
      x: cx + Math.cos(angle) * r * 1.55,
      y: cy + Math.sin(angle) * r * 0.78,
      size: 20 + (max > 1 ? ((w.count - 1) / (max - 1)) * 22 : 8),
      color: CLOUD_COLORS[i % CLOUD_COLORS.length],
    };
  });
  const center = itx.prompt || "the idea";
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-height:58vh" role="img" aria-label="class mindmap">
    ${nodes.map((n) => `<line x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}" stroke="rgba(255,255,255,0.14)" stroke-width="2"/>`).join("")}
    ${nodes.map((n, i) => `<text x="${n.x}" y="${n.y}" text-anchor="middle" dominant-baseline="middle"
        font-size="${n.size}" font-weight="800" fill="${n.color}"
        style="animation:fade-in 0.5s ${(i % 10) * 0.05}s ease both">${esc(n.word)}${n.count > 1 ? ` ×${n.count}` : ""}</text>`).join("")}
    <g>
      <ellipse cx="${cx}" cy="${cy}" rx="${Math.min(190, 40 + center.length * 7)}" ry="52" fill="#1d2140" stroke="#7b93ff" stroke-width="2"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="24" font-weight="800" fill="#f4f2ea">${esc(center.length > 40 ? center.slice(0, 38) + "…" : center)}</text>
    </g>
  </svg>`;
}

/* Venn — two overlapping circles filling live with the class's ideas. */
function renderVenn(agg) {
  const W = 1200, H = 640, cy = 330, r = 275;
  const cxA = 430, cxB = 770;
  const anchors = [285, 600, 915]; // A-only, both, B-only
  const colors = ["#aab8ff", "#8fd6a9", "#edc27a"];
  const CAP = 9, LH = 42;

  const regionWords = (list, x, color) => {
    const words = list.slice(0, CAP);
    const startY = cy - ((words.length - 1) * LH) / 2;
    let out = words
      .map((w, i) => {
        const size = 20 + Math.min(3, w.count - 1) * 5;
        return `<text x="${x}" y="${startY + i * LH}" text-anchor="middle" dominant-baseline="middle"
          font-size="${size}" font-weight="800" fill="${color}"
          style="animation:fade-in 0.4s ${i * 0.05}s ease both">${esc(w.word)}${w.count > 1 ? ` ×${w.count}` : ""}</text>`;
      })
      .join("");
    if (list.length > CAP)
      out += `<text x="${x}" y="${startY + CAP * LH}" text-anchor="middle" font-size="17" fill="var(--chalk-dim)">+${list.length - CAP} more</text>`;
    return out;
  };

  const empty = agg.regions.every((reg) => !reg.length);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-height:62vh" role="img" aria-label="class venn diagram">
    <circle cx="${cxA}" cy="${cy}" r="${r}" fill="rgba(111,134,255,0.16)" stroke="#7b93ff" stroke-width="3"/>
    <circle cx="${cxB}" cy="${cy}" r="${r}" fill="rgba(232,161,60,0.13)" stroke="#edc27a" stroke-width="3"/>
    <text x="${cxA - 90}" y="34" text-anchor="middle" font-size="30" font-weight="800" fill="#aab8ff">${esc(agg.labels[0])}</text>
    <text x="${cxB + 90}" y="34" text-anchor="middle" font-size="30" font-weight="800" fill="#edc27a">${esc(agg.labels[1])}</text>
    ${empty ? `<text x="600" y="${cy}" text-anchor="middle" font-size="24" fill="var(--chalk-dim)">Ideas land here as the class sorts them…</text>` : ""}
    ${agg.regions.map((list, i) => regionWords(list, anchors[i], colors[i])).join("")}
  </svg>`;
}

/* Scale — every marker on the continuum, plus the class average. */
function renderScale(agg) {
  const dots = agg.values
    .map((v, i) => {
      // Deterministic vertical jitter so stacked markers stay visible.
      const lane = (i * 7) % 5;
      return `<span class="cont-dot" style="left:${v}%;top:${16 + lane * 16}px;animation-delay:${(i % 12) * 0.04}s"></span>`;
    })
    .join("");
  return `
    <div class="continuum">
      <div class="cont-track">${dots}
        ${agg.avg != null ? `<div class="cont-avg" style="left:${agg.avg}%"><span>▲</span><small>class average</small></div>` : ""}
      </div>
      <div class="cont-ends"><span>← ${esc(agg.labels[0])}</span><span>${esc(agg.labels[1])} →</span></div>
      ${!agg.values.length ? `<p class="waiting-note" style="margin-top:1.6rem">Markers land on the line as the class decides…</p>` : ""}
    </div>`;
}

/* Smiley review — faces grow as votes land. */
function renderSmileys(itx, agg) {
  const total = agg.counts.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...agg.counts);
  return `<div class="smiley-board">${itx.options
    .map((face, i) => {
      const n = agg.counts[i];
      const pct = total ? Math.round((n / total) * 100) : 0;
      const scale = 0.75 + (n / max) * 0.6;
      return `
      <div class="smiley-cell ${n === max && n > 0 ? "leader" : ""}">
        <div class="face" style="transform:scale(${scale.toFixed(2)})">${face}</div>
        <div class="n">${n}</div>
        <div class="p">${pct}%</div>
      </div>`;
    })
    .join("")}</div>`;
}

/* Spelling / cloze reveal — per-target accuracy plus the common slips. */
function renderMarkedStats(agg, ariaLabel) {
  if (!agg.total) return `<p class="waiting-note">Waiting for answers…</p>`;
  return `<div class="bars" aria-label="${ariaLabel}">${agg.stats
    .map((s) => {
      const pct = Math.round((s.correct / agg.total) * 100);
      const cls = pct >= 70 ? "c-green" : pct >= 40 ? "c-amber" : "c-red";
      return `
      <div class="pbar ${cls}">
        <div class="top"><span>${esc(s.target)}${s.wrongTop.length ? ` <small style="color:var(--chalk-dim);font-size:0.62em">we also wrote: ${s.wrongTop.map((w) => esc(w.text)).join(", ")}</small>` : ""}</span>
        <span class="pct">${pct}% ✓</span></div>
        <div class="track"><div class="fill" style="width:${pct}%"></div></div>
      </div>`;
    })
    .join("")}</div>`;
}

/* Cloze reveal — the passage with answers restored + accuracy per gap. */
function renderCloze(agg) {
  if (!agg.total) return `<p class="waiting-note">Waiting for answers…</p>`;
  const passage = agg.parts
    .map((p, i) => {
      if (i >= agg.stats.length) return esc(p);
      const s = agg.stats[i];
      const pct = Math.round((s.correct / agg.total) * 100);
      const col = pct >= 70 ? "#8fd6a9" : pct >= 40 ? "#edc27a" : "#e79191";
      return `${esc(p)}<span class="cloze-fill" style="border-color:${col}">${esc(s.target)}<small>${pct}%</small></span>`;
    })
    .join("");
  const slips = agg.stats.filter((s) => s.wrongTop.length);
  return `
    <div class="cloze-reveal">${passage}</div>
    ${slips.length ? `<p class="waiting-note" style="margin-top:1.2rem;font-size:clamp(0.9rem,1.6vw,1.2rem)">Common slips: ${slips
      .map((s) => `${esc(s.wrongTop[0].text)} (for ${esc(s.target)})`)
      .join(" · ")}</p>` : ""}`;
}

/* Working out — answer spread plus the working stacks. */
function renderWorkings(agg) {
  const distr = agg.answerDist.length
    ? `<div class="bars" style="max-width:760px;margin-bottom:1.6rem">${agg.answerDist
        .map((d) => {
          const max = Math.max(...agg.answerDist.map((x) => x.count));
          const cls = d.ok === true ? "c-green" : d.ok === false ? "c-red" : "";
          return `<div class="pbar ${cls}">
            <div class="top"><span>${esc(d.answer)}${d.ok === true ? " ✓" : ""}</span><span class="pct">${d.count}</span></div>
            <div class="track"><div class="fill" style="width:${(d.count / max) * 100}%"></div></div>
          </div>`;
        })
        .join("")}</div>`
    : "";
  const cards = agg.workings.length
    ? `<div class="answers">${agg.workings
        .map(
          (w, i) => `<div class="answer-card tappable" data-spot="${w.sid}" style="animation-delay:${(i % 8) * 0.06}s;font-family:ui-monospace,monospace;font-size:clamp(0.85rem,1.6vw,1.2rem)">
            ${(w.lines || []).map((l) => `<div style="color:var(--chalk-dim)">${esc(l)}</div>`).join("")}
            <b>= ${esc(w.answer || "—")}${w.ok === true ? " ✓" : w.ok === false ? " ✗" : ""}</b>
            ${nameTag(w.name)}
          </div>`
        )
        .join("")}</div>`
    : `<p class="waiting-note">Workings appear here…</p>`;
  return distr + cards;
}

/* Counters — every child's board, with their answer. */
function renderCounterBoards(agg) {
  const distr = agg.answerDist.length
    ? `<div class="bars" style="max-width:700px;margin-bottom:1.4rem">${agg.answerDist
        .map((d) => {
          const max = Math.max(...agg.answerDist.map((x) => x.count));
          const cls = d.ok === true ? "c-green" : d.ok === false ? "c-red" : "";
          return `<div class="pbar ${cls}">
            <div class="top"><span>${esc(d.answer)}${d.ok === true ? " ✓" : ""}</span><span class="pct">${d.count}</span></div>
            <div class="track"><div class="fill" style="width:${(d.count / max) * 100}%"></div></div>
          </div>`;
        })
        .join("")}</div>`
    : "";
  const cards = agg.boards.length
    ? `<div class="answers">${agg.boards
        .map(
          (b, i) => `<div class="answer-card tappable" data-spot="${b.sid}" style="animation-delay:${(i % 8) * 0.06}s;padding:0.8rem">
            ${boardSvg(b.items, agg.counterKind, "clamp(150px, 19vw, 240px)")}
            <div style="font-weight:800;margin-top:0.4rem">= ${esc(b.answer || "—")}${b.ok === true ? " ✓" : b.ok === false ? " ✗" : ""}</div>
            ${nameTag(b.name)}
          </div>`
        )
        .join("")}</div>`
    : `<p class="waiting-note">Boards appear here…</p>`;
  return distr + cards;
}

/* Phonics — revealed word builds, grapheme by grapheme. */
function renderBuilds(agg) {
  if (!agg.builds.length) {
    return `<p class="waiting-note">${agg.total
      ? `${agg.total} word${agg.total === 1 ? "" : "s"} built — your teacher will reveal them.`
      : "Words appear here as the class builds them…"}</p>`;
  }
  return `<div class="answers">${agg.builds
    .map(
      (b, i) => `<div class="build-wrap tappable" data-spot="${b.sid}" style="animation-delay:${(i % 8) * 0.06}s"><div class="build-card">${b.parts
        .map((p) => `<span class="build-seg bs-${phonCat(p)}">${esc(p === "-e" ? "e" : p)}</span>`)
        .join("")}</div>${b.name ? `<div class="sketch-name">${esc(b.name)}</div>` : ""}</div>`
    )
    .join("")}</div>`;
}

// Small name badge, shown only when the teacher flips names on.
function nameTag(name) {
  return name ? `<span class="resp-name">${esc(name)}</span>` : "";
}

/* Post-its — approved notes stuck across the board. */
const STICKY_COLORS = ["#fef3a2", "#ffd6e7", "#d3f4e2", "#d6e6ff", "#ffe8c9"];

function renderStickies(agg) {
  if (!agg.stickies.length) {
    return `<p class="waiting-note">${agg.totalNotes
      ? `${agg.totalNotes} note${agg.totalNotes === 1 ? "" : "s"} written — waiting for your teacher to stick them up…`
      : "Notes land here as they're written…"}</p>`;
  }
  return `<div class="sticky-board">${agg.stickies
    .map((s, i) => {
      const rot = ((i * 47) % 7) - 3; // organic tilt, deterministic
      const color = STICKY_COLORS[i % STICKY_COLORS.length];
      return `<div class="sticky tappable" data-spot="${s.sid}" style="background:${color};transform:rotate(${rot}deg);animation-delay:${(i % 10) * 0.05}s">${esc(s.text)}${s.name ? `<div class="sticky-name">— ${esc(s.name)}</div>` : ""}</div>`;
    })
    .join("")}</div>`;
}

/* Match Up — how much of the room matched each pair correctly. */
function renderMatches(agg) {
  if (!agg.total) return `<p class="waiting-note">Matches will appear here…</p>`;
  return `<div class="bars">${agg.matches
    .map((m) => {
      const pct = Math.round((m.correct / agg.total) * 100);
      const cls = pct >= 70 ? "c-green" : pct >= 40 ? "c-amber" : "c-red";
      return `
      <div class="pbar ${cls}">
        <div class="top"><span>${esc(m.left)} <span style="color:var(--chalk-dim)">↔</span> ${esc(m.right)}</span><span class="pct">${pct}% matched it</span></div>
        <div class="track"><div class="fill" style="width:${pct}%"></div></div>
      </div>`;
    })
    .join("")}</div>`;
}

/* Example / Non-example — the written "why"s the teacher has revealed. */
function renderWhys(agg) {
  if (!agg.revealed.length) return "";
  return `<div class="answers" style="margin-top:2rem">${agg.revealed
    .map((r, i) => `<div class="answer-card tappable" data-spot="${r.sid}" style="animation-delay:${(i % 8) * 0.06}s"><b style="color:var(--glow)">${esc(r.choiceLabel)}</b> — ${esc(r.text)}${nameTag(r.name)}</div>`)
    .join("")}</div>`;
}

/* Structured responses (3-2-1, notice/wonder, before/after). */
function renderStructured(agg) {
  if (!agg.revealed.length) {
    return `<p class="waiting-note">${agg.total ? `${agg.total} in — your teacher will reveal them.` : "Responses will appear here…"}</p>`;
  }
  return `<div class="answers">${agg.revealed
    .map(
      (r, i) => `<div class="answer-card tappable" data-spot="${r.sid}" style="animation-delay:${(i % 6) * 0.07}s">${agg.fields
        .map((f, j) => (r.parts[j] ? `<div style="margin-bottom:0.4em"><b style="color:var(--glow);font-size:0.8em">${esc(f)}</b><br/>${esc(r.parts[j])}</div>` : ""))
        .join("")}${nameTag(r.name)}</div>`
    )
    .join("")}</div>`;
}

/* Sketch gallery — with a teacher-driven spotlight for discussing one big. */
function renderSketches(agg) {
  if (!agg.sketches.length) {
    return `<p class="waiting-note">${agg.total ? `${agg.total} sketch${agg.total === 1 ? "" : "es"} in…` : "Sketches will appear here…"}</p>`;
  }
  if (agg.spotlight) {
    const rest = agg.sketches.filter((s) => s.sid !== agg.spotlight.sid);
    return `
      <div class="spot-stage">
        <img class="spot-img tappable" data-spot="${agg.spotlight.sid}" src="${agg.spotlight.image}" alt="spotlighted drawing — tap to shrink" />
        ${agg.spotlight.name ? `<div class="sketch-name" style="font-size:clamp(1.1rem,2.2vw,1.7rem)">${esc(agg.spotlight.name)}</div>` : ""}
      </div>
      ${rest.length ? `<div class="spot-strip">${rest
        .map((s) => `<img class="tappable" data-spot="${s.sid}" src="${s.image}" alt="sketch thumbnail — tap to spotlight" />`)
        .join("")}</div>` : ""}`;
  }
  return `<div class="answers">${agg.sketches
    .map((s, i) => `<div class="sketch-card tappable" data-spot="${s.sid}" style="animation-delay:${(i % 8) * 0.06}s"><img src="${s.image}" alt="student sketch"/>${s.name ? `<div class="sketch-name">${esc(s.name)}</div>` : ""}</div>`)
    .join("")}</div>
    <p class="tap-hint">👆 tap a drawing to make it big</p>`;
}

/* A real packed word cloud: biggest word at the centre, the rest spiral
   in around it (collision-checked), some turned vertical — wordle-style. */
function renderCloud(agg) {
  if (!agg.words.length)
    return `<p class="waiting-note">Words will appear here as they land…</p>`;

  const words = [...agg.words].sort((a, b) => b.count - a.count).slice(0, 50);
  const max = words[0].count;
  const min = words[words.length - 1].count;

  const meas = renderCloud._ctx || (renderCloud._ctx = document.createElement("canvas").getContext("2d"));
  const placed = [];
  const collides = (r) =>
    placed.some((p) => !(r.x + r.w < p.x || p.x + p.w < r.x || r.y + r.h < p.y || p.y + p.h < r.y));

  const nodes = [];
  words.forEach((w, i) => {
    // Aggressive size curve: repeated words visibly dominate.
    const t = max > min ? (w.count - min) / (max - min) : (max > 1 ? 1 : 0);
    const size = Math.round(24 + Math.pow(t, 0.75) * 72); // 24 → 96px
    const rot = i !== 0 && i % 3 === 2 && w.word.length <= 10; // every third word stands up
    meas.font = `800 ${size}px Manrope, sans-serif`;
    const tw = meas.measureText(w.word).width;
    const th = size * 1.02;
    const bw = (rot ? th : tw) + 12;
    const bh = (rot ? tw : th) + 8;

    let x = 0, y = 0, a = 0, ok = false;
    for (let step = 0; step < 2500; step++) {
      const rad = 3 * a;
      x = Math.cos(a) * rad * 1.5; // elliptical spiral suits a wide screen
      y = Math.sin(a) * rad * 0.58;
      const rect = { x: x - bw / 2, y: y - bh / 2, w: bw, h: bh };
      if (!collides(rect)) { placed.push(rect); ok = true; break; }
      a += 0.28;
    }
    if (ok) nodes.push({ ...w, x, y, size, rot, color: CLOUD_COLORS[i % CLOUD_COLORS.length], delay: (i % 14) * 0.05 });
  });

  const pad = 24;
  const minX = Math.min(...placed.map((p) => p.x)) - pad;
  const maxX = Math.max(...placed.map((p) => p.x + p.w)) + pad;
  const minY = Math.min(...placed.map((p) => p.y)) - pad;
  const maxY = Math.max(...placed.map((p) => p.y + p.h)) + pad;

  return `<svg viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}"
      style="width:100%;max-height:62vh" role="img" aria-label="class word cloud">
    ${nodes
      .map(
        (n) => `<text x="${n.x}" y="${n.y}" text-anchor="middle" dominant-baseline="middle"
          font-weight="800" font-size="${n.size}" fill="${n.color}"
          ${n.rot ? `transform="rotate(90 ${n.x} ${n.y})"` : ""}
          style="animation:fade-in 0.5s ${n.delay}s ease both">${esc(n.word)}</text>`
      )
      .join("")}
  </svg>`;
}

const CHOICE_COLOR_SETS = {
  agree_disagree: ["c-green", "c-amber", "c-red"],
  confidence: ["c-green", "c-amber", "c-red"],
  true_false: ["c-green", "c-red"],
};

function renderBars(itx, agg) {
  const total = agg.counts.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...agg.counts);
  const colors = CHOICE_COLOR_SETS[itx.mode] || [];
  const answered = agg.correct != null; // teacher revealed the correct answer
  const letter = (i) => (itx.mode === "multi_choice" ? String.fromCharCode(65 + i) + ")  " : "");
  const img = itx.imageUrl
    ? `<img src="${itx.imageUrl}" alt="vote image" style="max-height:32vh;max-width:70%;border-radius:14px;box-shadow:0 16px 44px rgba(0,0,0,0.45);margin-bottom:1.6rem" /><br/>`
    : "";
  return `${img}<div class="bars">${itx.options
    .map((o, i) => {
      const n = agg.counts[i];
      const pct = total ? Math.round((n / total) * 100) : 0;
      const cls = answered ? (i === agg.correct ? "c-green" : "") : colors[i] || "";
      const dim = answered && i !== agg.correct ? "opacity:0.45" : "";
      return `
      <div class="pbar ${cls}" style="${dim}">
        <div class="top"><span>${letter(i)}${esc(o)}${answered && i === agg.correct ? " ✓" : ""}</span><span class="pct">${n} · ${pct}%</span></div>
        <div class="track"><div class="fill" style="width:${total ? (n / max) * 100 : 0}%"></div></div>
      </div>`;
    })
    .join("")}</div>`;
}

function renderRanked(agg) {
  if (!agg.total) return `<p class="waiting-note">The class order will appear here…</p>`;
  return `<div class="ranked">${agg.ranked
    .map(
      (r, i) => `
    <div class="rank-row" style="animation-delay:${i * 0.08}s">
      <span class="pos">${r.position}</span>
      <span style="flex:1;text-align:left">${esc(r.label)}</span>
      ${r.correctPct != null ? `<span class="pct-badge">${r.correctPct}% placed it here</span>` : ""}
    </div>`
    )
    .join("")}</div>`;
}

function renderAnswers(itx, agg) {
  // Picture Prompt: the image stays up — big while the class writes,
  // smaller above the answers once revealing starts.
  const img = itx.imageUrl
    ? `<img src="${itx.imageUrl}" alt="prompt image" style="max-height:${agg.revealed.length ? "26vh" : "48vh"};max-width:80%;border-radius:14px;box-shadow:0 16px 44px rgba(0,0,0,0.45);margin-bottom:1.4rem" /><br/>`
    : "";
  if (!agg.revealed.length) {
    const n = agg.total;
    return `${img}<p class="waiting-note">${n ? `${n} response${n === 1 ? "" : "s"} in — your teacher will reveal them.` : "Responses will appear here…"}</p>`;
  }
  return `${img}<div class="answers">${agg.revealed
    .map((r, i) => `<div class="answer-card tappable" data-spot="${r.sid}" style="animation-delay:${(i % 8) * 0.06}s">${esc(r.text)}${nameTag(r.name)}</div>`)
    .join("")}</div>`;
}

/* ---------------- code entry ---------------- */

function renderCodeEntry(failed) {
  barCode.textContent = "";
  barCount.textContent = "";
  stage.innerHTML = `
    <div class="giant-emoji">📽️</div>
    <div class="giant-title" style="font-size:clamp(2rem,5vw,3.4rem)">Connect this screen</div>
    <div class="giant-sub" style="margin-bottom:1.6rem">${failed ? "That code didn't match a live session — check the teacher dashboard." : "Enter the session code from the teacher dashboard."}</div>
    <div class="enter-code">
      <input id="codeIn" maxlength="4" placeholder="CODE" autocomplete="off" />
      <button id="goBtn">Connect</button>
    </div>`;
  const input = document.getElementById("codeIn");
  input.focus();
  const go = () => {
    const c = input.value.trim().toUpperCase();
    if (c.length !== 4) return;
    code = c;
    history.replaceState(null, "", `/projector?code=${c}`);
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "projector_join", code: c }));
  };
  document.getElementById("goBtn").onclick = go;
  input.onkeydown = (e) => { if (e.key === "Enter") go(); };
}

if (!code) renderCodeEntry(false);
connect();
