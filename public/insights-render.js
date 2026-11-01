/* Eyes Up — lesson insights renderer.
   Turns an archived lesson summary into a friendly visual dashboard.
   Used by the teacher's /data page and the public /insights share page. */

(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const META = {
    word_cloud: ["☁️", "Word Cloud"], one_word: ["🗣️", "One Word"], mindmap: ["🕸️", "Mindmap"],
    post_its: ["🗒️", "Post-its"], phonics: ["🔤", "Phonics"], short_answer: ["✏️", "Short Answer"],
    long_response: ["📜", "Long Response"], picture_prompt: ["🖼️", "Picture Prompt"],
    retrieval_sprint: ["🧠", "Retrieval Sprint"], table: ["📋", "Table"], question_set: ["📝", "Question Set"], dot_points: ["📌", "Dot Points"], compose: ["🎵", "Make a Tune"], link: ["🔗", "Website Link"], exit_ticket: ["🎟️", "Exit Ticket"],
    finish_sentence: ["📝", "Finish the Sentence"], give_example: ["💡", "Give an Example"],
    make_connection: ["🔗", "Make a Connection"], teach_back: ["🧑‍🏫", "Teach It Back"],
    spot_mistake: ["🔎", "Spot the Mistake"], quick_challenge: ["🚀", "Quick Challenge"], predict: ["🔮", "Predict"],
    three_two_one: ["3️⃣", "3-2-1"], notice_wonder: ["👀", "Notice / Wonder"], before_after: ["🔄", "Before / After"],
    plus_minus: ["➕", "Plus & Minus"], muddiest_point: ["🌫️", "Muddiest Point"], ask_question: ["❓", "Anonymous Questions"],
    poll: ["📊", "Poll"], tick_boxes: ["☑️", "Tick the Boxes"], multi_choice: ["🅰️", "Multiple Choice"], picture_vote: ["🗳️", "Picture Vote"],
    agree_disagree: ["⚖️", "Agree / Disagree"], true_false: ["✅", "True or False"], this_or_that: ["⚡", "This or That"],
    confidence: ["🎯", "Confidence Check"], smiley: ["😊", "Smiley Review"], scale: ["🎚️", "Scale"],
    example_nonexample: ["↔️", "Example / Non-example"], ranking: ["🔢", "Ranking"], put_in_order: ["🪜", "Put in Order"],
    match_up: ["🧩", "Match Up"], venn: ["◉", "Venn Diagram"], spelling: ["🔡", "Spelling Test"], cloze: ["▭", "Cloze Passage"], phonics_cloze: ["🖼️", "Picture Phonics"],
    working: ["🧮", "Working Out"], counters: ["🟠", "Counters"], sketch: ["🎨", "Sketch It"], annotate: ["🖍️", "Annotate"], image_drop: ["📥", "Drop an Image"], image_caption: ["📸", "Image + Writing"], image_long: ["📓", "Image + Long Answer"], maths_board: ["🧮", "Maths Board"], counters_draw: ["🟠", "Counters + Drawing"],
  };
  const meta = (it) =>
    it.mode === "counters" && it.counterKind === "base10" ? ["🔟", "Tens & Ones"] : META[it.mode] || ["▫️", it.mode];

  const CSS = `
  .ins-note { color:#74829a; font-size:0.82rem; margin-bottom:0.9rem; }
  .ins-card { background:#fff; border:1px solid #dbe2ec; border-radius:16px; box-shadow:0 1px 2px rgba(14,36,69,0.05),0 8px 24px rgba(14,36,69,0.07); padding:1.1rem 1.3rem; margin-bottom:1rem; animation:rise .35s ease both; }
  .ins-head { display:flex; align-items:baseline; gap:0.6rem; flex-wrap:wrap; }
  .ins-tag { font-size:0.7rem; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:#15305c; background:#e6edf7; border-radius:6px; padding:0.15rem 0.5rem; }
  .ins-q { font-family:"Plus Jakarta Sans","Manrope",sans-serif; font-size:1.15rem; font-weight:600; }
  .ins-q i { color:#74829a; }
  .ins-n { margin-left:auto; color:#74829a; font-size:0.8rem; white-space:nowrap; }
  .ins-body { margin-top:0.8rem; }
  .ins-bar { margin-bottom:0.5rem; font-size:0.88rem; }
  .ins-bar .t { display:flex; justify-content:space-between; font-weight:700; margin-bottom:0.15rem; }
  .ins-bar .tr { height:12px; background:#e9eef5; border-radius:7px; overflow:hidden; }
  .ins-bar .fl { height:100%; border-radius:7px; background:linear-gradient(90deg,#1d3f78,#7fa3dc); }
  .ins-bar.good .fl { background:#2f9e44; } .ins-bar.bad .fl { background:#d64545; }
  .ins-cloud { text-align:center; } .ins-cloud svg { max-height:300px; width:100%; }
  .ins-smiley { display:flex; justify-content:center; align-items:flex-end; gap:1.5rem; }
  .ins-smiley .c { text-align:center; } .ins-smiley .f { line-height:1.1; }
  .ins-smiley .n { font-weight:800; margin-top:0.15rem; } .ins-smiley .p { color:#74829a; font-size:0.75rem; }
  .ins-list { list-style:none; padding:0; }
  .ins-list li { border-left:3px solid #dbe2ec; padding:0.25rem 0 0.25rem 0.7rem; margin-bottom:0.3rem; font-size:0.9rem; overflow-wrap:anywhere; }
  .ins-list li b.who { color:#435169; font-size:0.78rem; margin-right:0.4rem; }
  .ins-more { color:#1d3f78; font-weight:700; font-size:0.85rem; cursor:pointer; background:none; border:none; padding:0.2rem 0; }
  .ins-scale { position:relative; height:16px; background:linear-gradient(90deg,#e6edf7,#dbe5f3); border-radius:9px; margin:1.4rem 0 0.3rem; }
  .ins-scale .avg { position:absolute; top:-11px; transform:translateX(-50%); font-size:1rem; color:#e8a13c; }
  .ins-ends { display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; color:#435169; }
  .ins-cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:0.8rem; }
  .ins-col { background:#f1f4f9; border:1px solid #dbe2ec; border-radius:10px; padding:0.6rem 0.8rem; font-size:0.85rem; }
  .ins-col b { display:block; color:#15305c; margin-bottom:0.3rem; font-size:0.78rem; }
  .ins-chip { display:inline-block; background:#e6edf7; color:#15305c; border-radius:999px; padding:0.15rem 0.6rem; font-weight:700; font-size:0.8rem; margin:0 0.25rem 0.3rem 0; }
  .ins-gallery { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:0.7rem; }
  .ins-gallery figure { margin:0; text-align:center; break-inside:avoid; }
  .ins-gallery img { width:100%; aspect-ratio:4/3; object-fit:cover; border-radius:10px; border:1px solid #dbe2ec; background:#fff; }
  .ins-gallery p { font-size:0.78rem; text-align:left; margin:0.3rem 0 0; line-height:1.35; color:#0f1c30; }
  .ins-gallery figcaption { font-size:0.75rem; font-weight:800; color:#435169; margin-top:0.2rem; }
  @media print {
    * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .ins-card { break-inside: avoid; box-shadow: none; }
    .ins-rest { display: inline !important; }
    .ins-more { display: none !important; }
  }
  `;

  const CLOUD_INK = ["#1d3f78", "#0f1c30", "#2f9e44", "#c07d10", "#7048ba", "#0e7490"];
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

  function answerList(it, showNames, i, edit) {
    let rows;
    if (showNames && it.students?.length) {
      rows = it.students.map((s) => ({ who: s.name, text: s.response, ok: s.ok, score: s.score }));
      if (edit && !it.anonymous) rows.forEach((r) => (r.btn = LV.markButtons(i, r.who, r, LV.byHand(it, r.who))));
    } else if (it.answers?.length) {
      rows = it.answers.map((a) => ({ who: null, text: a }));
    } else return "";
    const id = "ins" + Math.random().toString(36).slice(2, 8);
    const li = (r) => `<li>${r.who ? `<b class="who">${esc(r.who)}</b>` : ""}${r.btn || (window.LV ? LV.mark(r) : "")}${esc(r.text || "—")}${r.score && r.ok !== true ? ` <small style="color:#74829a">(${esc(r.score)})</small>` : ""}</li>`;
    const head = rows.slice(0, 6).map(li).join("");
    const rest = rows.slice(6).map(li).join("");
    return `<ul class="ins-list">${head}${rest ? `<span class="ins-rest" id="${id}" style="display:none">${rest}</span>` : ""}</ul>
      ${rest ? `<button class="ins-more" data-more="${id}">Show all ${rows.length} →</button>` : ""}`;
  }

  function questionGrid(it, showNames, i, edit) {
    const qs = it.questions || [];
    const rows = showNames && it.students?.length ? it.students.map((s) => ({ who: s.name, parts: LV.parts(s.response), ok: s.ok, score: s.score })) : (it.answers || []).map((a) => ({ who: null, parts: LV.parts(a) }));
    if (!qs.length || !rows.length) return "";
    const marked = rows.some((r) => r.ok === true || r.ok === false) || edit;
    const cell = (r) => edit ? LV.markButtons(i, r.who, r, LV.byHand(it, r.who)) : LV.mark(r);
    return `<div class="lv-grid"><table><thead><tr>${showNames ? "<th>Student</th>" : ""}${qs.map((q, k) => `<th>Q${k + 1} · ${esc(q)}</th>`).join("")}${showNames && marked ? "<th>Mark</th>" : ""}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${showNames ? `<td>${esc(r.who)}</td>` : ""}${qs.map((_, k) => `<td>${esc(r.parts[k] || "—")}</td>`).join("")}${showNames && marked ? `<td style="white-space:nowrap">${cell(r)}${r.score ? `<small style="color:#74829a">${esc(r.score)}</small>` : ""}</td>` : ""}</tr>`).join("")}</tbody></table></div>`;
  }

  // The answer-key editor a teacher opens on an activity after the lesson.
  function keyEditor(it, i) {
    const kind = LV.keyKind(it);
    if (!kind) return "";
    const after = it.marked ? `<span class="lv-after">✎ marked after the lesson</span>` : "";
    const hint = `<small>Capital letters, spaces and punctuation don't matter. Tap ✓ or ✗ beside any student to overrule.</small>`;
    let summary = "", body = "";
    if (kind === "choice") {
      const labels = (it.distribution || []).map((d) => d.label.replace(/\s✓$/, ""));
      const right = it.key?.label ?? (it.distribution || []).find((d) => /\s✓$/.test(d.label))?.label.replace(/\s✓$/, "");
      summary = right ? `✎ Right answer: ${esc(right)}` : "✎ Set the right answer";
      body = `<b style="flex-basis:100%">Which answer was right?</b>${labels.map((l) => `<button type="button" class="lv-chip ${l === right ? "on" : ""}" data-keychip="${i}" data-label="${esc(l)}">${esc(l)}</button>`).join("")}
        <small>Tap the one that was right${it.key ? " · tap it again to clear" : ""}. Tap ✓ or ✗ beside any student to overrule.</small>`;
    } else if (kind === "text") {
      const acc = it.key?.accept || [];
      summary = acc.length ? `✎ Accepted: ${esc(acc.join(", "))}` : "✎ Set the accepted answer";
      body = `<form data-keyform="${i}" style="display:contents"><b style="flex-basis:100%">What counts as right?</b>
        <input name="accept" value="${esc(acc.join(", "))}" placeholder="e.g. Canberra, ACT — commas separate alternatives" />
        <button class="lv-save">Save</button>${acc.length ? `<button type="button" class="lv-clear" data-keyclear="${i}">Clear</button>` : ""}${hint}</form>`;
    } else if (kind === "set") {
      const parts = it.key?.parts || [];
      const n = parts.filter(Boolean).length;
      summary = n ? `✎ Answer key set for ${n} of ${(it.questions || []).length} questions` : "✎ Set the answers";
      body = `<form data-keyform="${i}" data-set="1" style="display:contents"><b style="flex-basis:100%">What counts as right? (leave a question blank to skip it)</b>
        ${(it.questions || []).map((q, k) => `<label><span>Q${k + 1} · ${esc(q)}</span><input name="p${k}" value="${esc((parts[k] || []).join(", "))}" placeholder="commas separate alternatives" /></label>`).join("")}
        <button class="lv-save">Save</button>${n ? `<button type="button" class="lv-clear" data-keyclear="${i}">Clear</button>` : ""}${hint}</form>`;
    } else {
      summary = "✎ Mark by hand";
      body = `<small style="flex-basis:100%">There's no answer key for this kind of activity. Tap ✓ or ✗ beside each student to mark it yourself.</small>`;
    }
    return `<details class="lv-key no-print" data-keybox="${i}"><summary>${summary}${after}</summary><div class="lv-keybody">${body}</div></details>`;
  }

  // "· 18 of 23 right" when the activity had an answer key.
  function rightRate(it) {
    const marked = (it.students || []).filter((x) => x.ok === true || x.ok === false);
    if (!marked.length) return "";
    const right = marked.filter((x) => x.ok).length;
    const pct = Math.round((right / marked.length) * 100);
    return ` · <b style="color:${pct >= 70 ? "#1f6b46" : pct >= 40 ? "#8a5a10" : "#8f2f2f"}">${right} of ${marked.length} right</b>`;
  }

  function card(it, i, showNames, edit) {
    const [icon, name] = meta(it);
    let body = "";
    if (it.mode === "question_set" && window.LV && (it.questions || []).length) {
      body = questionGrid(it, showNames, i, edit);
    } else if (it.mode === "smiley" && it.distribution) {
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
      body = `<ol style="padding-left:1.3rem;font-weight:700">${it.ranked.map((r) => `<li>${esc(r.label)}${r.correctPct != null ? ` <small style="color:#74829a;font-weight:500">${r.correctPct}% placed it here</small>` : ""}</li>`).join("")}</ol>`;
    } else if (it.distribution) {
      body = bars(it.distribution);
    } else if (it.images?.length && showNames) {
      body = `<div class="ins-gallery">${it.images
        .map((im) => `<figure><a href="${im.image}" target="_blank" rel="noopener"><img src="${im.image}" alt="student picture" loading="lazy" /></a>
          ${im.text ? `<p>${esc(im.text)}</p>` : ""}${im.name ? `<figcaption>${esc(im.name)}</figcaption>` : ""}</figure>`)
        .join("")}</div>`;
    } else if (it.sketchCount != null) {
      body = `<p style="color:#435169">${it.sketchCount} ${["image_drop", "image_caption", "image_long"].includes(it.mode) ? "image" : "drawing"}${it.sketchCount === 1 ? "" : "s"} submitted${showNames ? " — no stored pictures for this activity." : "."}</p>`;
    }
    const answers = ["smiley"].includes(it.mode) || it.words || (it.mode === "question_set" && body) ? "" : answerList(it, showNames, i, edit);
    const extraAnswers = (it.words || it.mode === "smiley") && showNames && it.students?.length ? answerList(it, showNames, i, edit) : "";
    const editor = edit && window.LV ? keyEditor(it, i) : "";
    const afterNote = !edit && it.marked ? ` <span class="lv-after">✎ marked after the lesson</span>` : "";
    return `<div class="ins-card">
      <div class="ins-head">
        <span class="ins-tag">${icon} ${esc(name)}</span>
        <span class="ins-q">${it.prompt ? esc(it.prompt) : "<i>asked aloud</i>"}</span>
        <span class="ins-n">${it.responses} response${it.responses === 1 ? "" : "s"}${rightRate(it)}${afterNote}</span>
      </div>
      <div class="ins-body">${editor}${body}${answers}${extraAnswers}</div>
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
    if (window.LV) { LV.normalise(s); LV.css(); }
    const items = window.LV ? LV.shown(s, opts.ghosts) : (s.items || []);
    const ghosts = s.ghostCount || 0;
    const ghostNote = ghosts && !opts.ghosts
      ? `<p class="lv-ghosts">${ghosts === 1 ? "1 empty re-launch" : `${ghosts} empty re-launches`} of a question hidden (asked again later). <button data-ghosts>Show anyway</button></p>`
      : ghosts && opts.ghosts ? `<p class="lv-ghosts">Showing empty re-launches too. <button data-ghosts>Hide them</button></p>` : "";
    container.innerHTML = `
      ${opts.note ? `<p class="ins-note">${opts.note}</p>` : ""}
      ${ghostNote}
      ${items.map((it) => card(it, (s.items || []).indexOf(it), showNames, !!opts.edit)).join("") || `<p class="ins-note">Nothing captured in this lesson.</p>`}`;
    container.querySelectorAll("[data-more]").forEach((b) => (b.onclick = () => {
      document.getElementById(b.dataset.more).style.display = "inline";
      b.remove();
    }));
    const g = container.querySelector("[data-ghosts]");
    if (g) g.onclick = () => window.renderInsights(container, s, { ...opts, ghosts: !opts.ghosts });
  };
})();
