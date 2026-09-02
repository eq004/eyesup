/* Eyes Up — lesson insights renderer.
   Turns an archived lesson summary into a friendly visual dashboard.
   Used by the teacher's /data page and the public /insights share page. */

(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const META = {
    word_cloud: ["☁️", "Word Cloud"], one_word: ["🗣️", "One Word"], mindmap: ["🕸️", "Mindmap"],
    post_its: ["🗒️", "Post-its"], phonics: ["🔤", "Phonics"], short_answer: ["✏️", "Short Answer"],
    long_response: ["📜", "Long Response"], picture_prompt: ["🖼️", "Picture Prompt"],
    retrieval_sprint: ["🧠", "Retrieval Sprint"], table: ["📋", "Table"], exit_ticket: ["🎟️", "Exit Ticket"],
    finish_sentence: ["📝", "Finish the Sentence"], give_example: ["💡", "Give an Example"],
    make_connection: ["🔗", "Make a Connection"], teach_back: ["🧑‍🏫", "Teach It Back"],
    spot_mistake: ["🔎", "Spot the Mistake"], quick_challenge: ["🚀", "Quick Challenge"], predict: ["🔮", "Predict"],
    three_two_one: ["3️⃣", "3-2-1"], notice_wonder: ["👀", "Notice / Wonder"], before_after: ["🔄", "Before / After"],
    plus_minus: ["➕", "Plus & Minus"], muddiest_point: ["🌫️", "Muddiest Point"], ask_question: ["❓", "Anonymous Questions"],
    poll: ["📊", "Poll"], multi_choice: ["🅰️", "Multiple Choice"], picture_vote: ["🗳️", "Picture Vote"],
    agree_disagree: ["⚖️", "Agree / Disagree"], true_false: ["✅", "True or False"], this_or_that: ["⚡", "This or That"],
    confidence: ["🎯", "Confidence Check"], smiley: ["😊", "Smiley Review"], scale: ["🎚️", "Scale"],
    example_nonexample: ["↔️", "Example / Non-example"], ranking: ["🔢", "Ranking"], put_in_order: ["🪜", "Put in Order"],
    match_up: ["🧩", "Match Up"], venn: ["◉", "Venn Diagram"], spelling: ["🔡", "Spelling Test"], cloze: ["▭", "Cloze Passage"],
    working: ["🧮", "Working Out"], counters: ["🟠", "Counters"], sketch: ["🎨", "Sketch It"], annotate: ["🖍️", "Annotate"],
  };
  const meta = (it) =>
    it.mode === "counters" && it.counterKind === "base10" ? ["🔟", "Tens & Ones"] : META[it.mode] || ["▫️", it.mode];

  const CSS = `
  .ins-note { color:#878da0; font-size:0.82rem; margin-bottom:0.9rem; }
  .ins-card { background:#fff; border:1px solid #e6e4dd; border-radius:16px; box-shadow:0 1px 2px rgba(25,28,38,0.05),0 8px 24px rgba(25,28,38,0.07); padding:1.1rem 1.3rem; margin-bottom:1rem; animation:rise .35s ease both; }
  .ins-head { display:flex; align-items:baseline; gap:0.6rem; flex-wrap:wrap; }
  .ins-tag { font-size:0.7rem; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:#2941c8; background:#eceffe; border-radius:6px; padding:0.15rem 0.5rem; }
  .ins-q { font-family:"Fraunces",Georgia,serif; font-size:1.15rem; font-weight:600; }
  .ins-q i { color:#878da0; }
  .ins-n { margin-left:auto; color:#878da0; font-size:0.8rem; white-space:nowrap; }
  .ins-body { margin-top:0.8rem; }
  .ins-bar { margin-bottom:0.5rem; font-size:0.88rem; }
  .ins-bar .t { display:flex; justify-content:space-between; font-weight:700; margin-bottom:0.15rem; }
  .ins-bar .tr { height:12px; background:#eef0f6; border-radius:7px; overflow:hidden; }
  .ins-bar .fl { height:100%; border-radius:7px; background:linear-gradient(90deg,#3d5af1,#7b93ff); }
  .ins-bar.good .fl { background:#2f9e44; } .ins-bar.bad .fl { background:#d64545; }
  .ins-cloud { text-align:center; } .ins-cloud svg { max-height:300px; width:100%; }
  .ins-smiley { display:flex; justify-content:center; align-items:flex-end; gap:1.5rem; }
  .ins-smiley .c { text-align:center; } .ins-smiley .f { line-height:1.1; }
  .ins-smiley .n { font-weight:800; margin-top:0.15rem; } .ins-smiley .p { color:#878da0; font-size:0.75rem; }
  .ins-list { list-style:none; padding:0; }
  .ins-list li { border-left:3px solid #e6e4dd; padding:0.25rem 0 0.25rem 0.7rem; margin-bottom:0.3rem; font-size:0.9rem; overflow-wrap:anywhere; }
  .ins-list li b.who { color:#4b5163; font-size:0.78rem; margin-right:0.4rem; }
  .ins-more { color:#3d5af1; font-weight:700; font-size:0.85rem; cursor:pointer; background:none; border:none; padding:0.2rem 0; }
  .ins-scale { position:relative; height:16px; background:linear-gradient(90deg,#eceffe,#dfe5ff); border-radius:9px; margin:1.4rem 0 0.3rem; }
  .ins-scale .avg { position:absolute; top:-11px; transform:translateX(-50%); font-size:1rem; color:#e8a13c; }
  .ins-ends { display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; color:#4b5163; }
  .ins-cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:0.8rem; }
  .ins-col { background:#f6f5f1; border:1px solid #e6e4dd; border-radius:10px; padding:0.6rem 0.8rem; font-size:0.85rem; }
  .ins-col b { display:block; color:#2941c8; margin-bottom:0.3rem; font-size:0.78rem; }
  .ins-chip { display:inline-block; background:#eceffe; color:#2941c8; border-radius:999px; padding:0.15rem 0.6rem; font-weight:700; font-size:0.8rem; margin:0 0.25rem 0.3rem 0; }
  `;

  const CLOUD_INK = ["#3d5af1", "#191c26", "#2f9e44", "#c07d10", "#7048ba", "#0e7490"];
  function cloudSvg(wordList) {
    const words = [...wordList].sort((a, b) => b.count - a.count).slice(0, 50);
    if (!words.length) return "";
    const max = words[0].count, min = words[words.length - 1].count;
    const meas = cloudSvg._c || (cloudSvg._c = document.createElement("canvas").getContext("2d"));
    const placed = [];
    const hit = (r) => placed.some((p) => !(r.x + r.w < p.x || p.x + p.w < r.x || r.y + r.h < p.y || p.y + p.h < r.y));
    const nodes = [];
    words.forEach((w, i) => {
      const t = max > min ? (w.count - min) / (max - min) : (max > 1 ? 1 : 0);
      const size = Math.round(14 + Math.pow(t, 0.75) * 40);
      const rot = i !== 0 && i % 3 === 2 && w.word.length <= 10;
      meas.font = `800 ${size}px Manrope, sans-serif`;
      const tw = meas.measureText(w.word).width, th = size * 1.02;
      const bw = (rot ? th : tw) + 8, bh = (rot ? tw : th) + 6;
      let x = 0, y = 0, a = 0, ok = false;
      for (let s = 0; s < 2500; s++) {
        const rad = 2.4 * a;
        x = Math.cos(a) * rad * 1.5; y = Math.sin(a) * rad * 0.6;
        const rect = { x: x - bw / 2, y: y - bh / 2, w: bw, h: bh };
        if (!hit(rect)) { placed.push(rect); ok = true; break; }
        a += 0.28;
      }
      if (ok) nodes.push({ ...w, x, y, size, rot, color: CLOUD_INK[i % CLOUD_INK.length] });
    });
    const pad = 12;
    const mnX = Math.min(...placed.map((p) => p.x)) - pad, mxX = Math.max(...placed.map((p) => p.x + p.w)) + pad;
    const mnY = Math.min(...placed.map((p) => p.y)) - pad, mxY = Math.max(...placed.map((p) => p.y + p.h)) + pad;
    return `<svg viewBox="${mnX} ${mnY} ${mxX - mnX} ${mxY - mnY}">${nodes
      .map((n) => `<text x="${n.x}" y="${n.y}" text-anchor="middle" dominant-baseline="middle" font-weight="800" font-family="Manrope,sans-serif" font-size="${n.size}" fill="${n.color}" ${n.rot ? `transform="rotate(90 ${n.x} ${n.y})"` : ""}>${esc(n.word)}</text>`)
      .join("")}</svg>`;
  }

  function bars(rows) {
    const max = Math.max(1, ...rows.map((r) => r.count));
    return rows
      .map((r) => {
        const cls = /✓/.test(r.label) ? "good" : /✗/.test(r.label) ? "bad" : "";
        return `<div class="ins-bar ${cls}"><div class="t"><span>${esc(r.label)}</span><span>${r.count}</span></div>
          <div class="tr"><div class="fl" style="width:${(r.count / max) * 100}%"></div></div></div>`;
      })
      .join("");
  }

  function answerList(it, showNames) {
    let rows;
    if (showNames && it.students?.length) {
      rows = it.students.map((s) => ({ who: s.name, text: s.response }));
    } else if (it.answers?.length) {
      rows = it.answers.map((a) => ({ who: null, text: a }));
    } else return "";
    const id = "ins" + Math.random().toString(36).slice(2, 8);
    const li = (r) => `<li>${r.who ? `<b class="who">${esc(r.who)}</b>` : ""}${esc(r.text || "—")}</li>`;
    const head = rows.slice(0, 6).map(li).join("");
    const rest = rows.slice(6).map(li).join("");
    return `<ul class="ins-list">${head}${rest ? `<span id="${id}" style="display:none">${rest}</span>` : ""}</ul>
      ${rest ? `<button class="ins-more" data-more="${id}">Show all ${rows.length} →</button>` : ""}`;
  }

  function card(it, i, showNames) {
    const [icon, name] = meta(it);
    let body = "";
    if (it.mode === "smiley" && it.distribution) {
      const total = it.distribution.reduce((a, d) => a + d.count, 0) || 1;
      const maxN = Math.max(1, ...it.distribution.map((d) => d.count));
      body = `<div class="ins-smiley">${it.distribution
        .map((d) => `<div class="c"><div class="f" style="font-size:${Math.round(26 + (d.count / maxN) * 30)}px">${esc(d.label)}</div>
          <div class="n">${d.count}</div><div class="p">${Math.round((d.count / total) * 100)}%</div></div>`)
        .join("")}</div>`;
    } else if (it.words?.length || (it.topWords?.length && ["word_cloud", "one_word", "mindmap"].includes(it.mode))) {
      const w = it.words || it.topWords;
      body = `<div class="ins-cloud">${cloudSvg(w)}</div>
        <div style="margin-top:0.5rem">${w.slice(0, 14).map((x) => `<span class="ins-chip">${esc(x.word)}${x.count > 1 ? ` ×${x.count}` : ""}</span>`).join("")}</div>`;
    } else if (it.scale) {
      body = `<div class="ins-scale"><span class="avg" style="left:${it.scale.avg ?? 50}%">▼ ${it.scale.avg ?? "—"}</span></div>
        <div class="ins-ends"><span>${esc(it.scale.labels[0])}</span><span>${esc(it.scale.labels[1])}</span></div>`;
    } else if (it.venn) {
      const heads = [`${it.venn.labels[0]} only`, "Both", `${it.venn.labels[1]} only`];
      body = `<div class="ins-cols">${it.venn.regions
        .map((reg, j) => `<div class="ins-col"><b>${esc(heads[j])}</b>${reg.map((w) => `<span class="ins-chip">${esc(w.word)}${w.count > 1 ? ` ×${w.count}` : ""}</span>`).join("") || "—"}</div>`)
        .join("")}</div>`;
    } else if (it.matchStats) {
      body = bars(it.matchStats.map((m) => ({ label: m.pair + (m.correctPct >= 50 ? " ✓" : ""), count: m.correctPct })));
    } else if (it.ranked) {
      body = `<ol style="padding-left:1.3rem;font-weight:700">${it.ranked.map((r) => `<li>${esc(r.label)}${r.correctPct != null ? ` <small style="color:#878da0;font-weight:500">${r.correctPct}% placed it here</small>` : ""}</li>`).join("")}</ol>`;
    } else if (it.distribution) {
      body = bars(it.distribution);
    } else if (it.sketchCount != null) {
      body = `<p style="color:#4b5163">${it.sketchCount} drawing${it.sketchCount === 1 ? "" : "s"} submitted — open the lesson report to view them live next time.</p>`;
    }
    const answers = ["smiley"].includes(it.mode) || it.words ? "" : answerList(it, showNames);
    const extraAnswers = (it.words || it.mode === "smiley") && showNames && it.students?.length ? answerList(it, showNames) : "";
    return `<div class="ins-card">
      <div class="ins-head">
        <span class="ins-tag">${icon} ${esc(name)}</span>
        <span class="ins-q">${it.prompt ? esc(it.prompt) : "<i>asked aloud</i>"}</span>
        <span class="ins-n">${it.responses} response${it.responses === 1 ? "" : "s"}</span>
      </div>
      <div class="ins-body">${body}${answers}${extraAnswers}</div>
    </div>`;
  }

  window.renderInsights = function (container, s, opts = {}) {
    if (!document.getElementById("ins-css")) {
      const st = document.createElement("style");
      st.id = "ins-css";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const showNames = !!opts.showNames;
    container.innerHTML = `
      ${opts.note ? `<p class="ins-note">${opts.note}</p>` : ""}
      ${(s.items || []).map((it, i) => card(it, i, showNames)).join("") || `<p class="ins-note">Nothing captured in this lesson.</p>`}`;
    container.querySelectorAll("[data-more]").forEach((b) => (b.onclick = () => {
      document.getElementById(b.dataset.more).style.display = "inline";
      b.remove();
    }));
  };
})();
