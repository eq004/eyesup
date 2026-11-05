/* Eyes Up — the printable lesson report (moved out of report.html so the page can run under a strict Content-Security-Policy). */
const esc = LV.esc;

/* Packed word cloud for print — same spiral layout the projector uses,
   in report-friendly colours. */
const CLOUD_INK = ["#1d3f78", "#0f1c30", "#2f9e44", "#c07d10", "#7048ba", "#0e7490"];
function cloudSvg(wordList) {
  const words = [...wordList].sort((a, b) => b.count - a.count).slice(0, 50);
  if (!words.length) return "";
  const max = words[0].count, min = words[words.length - 1].count;
  const meas = cloudSvg._ctx || (cloudSvg._ctx = document.createElement("canvas").getContext("2d"));
  const placed = [];
  const collides = (r) => placed.some((p) => !(r.x + r.w < p.x || p.x + p.w < r.x || r.y + r.h < p.y || p.y + p.h < r.y));
  const nodes = [];
  words.forEach((w, i) => {
    const t = max > min ? (w.count - min) / (max - min) : (max > 1 ? 1 : 0);
    const size = Math.round(15 + Math.pow(t, 0.75) * 42);
    const rot = i !== 0 && i % 3 === 2 && w.word.length <= 10;
    meas.font = `800 ${size}px Manrope, sans-serif`;
    const tw = meas.measureText(w.word).width;
    const th = size * 1.02;
    const bw = (rot ? th : tw) + 8, bh = (rot ? tw : th) + 6;
    let x = 0, y = 0, a = 0, ok = false;
    for (let step = 0; step < 2500; step++) {
      const rad = 2.4 * a;
      x = Math.cos(a) * rad * 1.5;
      y = Math.sin(a) * rad * 0.6;
      const rect = { x: x - bw / 2, y: y - bh / 2, w: bw, h: bh };
      if (!collides(rect)) { placed.push(rect); ok = true; break; }
      a += 0.28;
    }
    if (ok) nodes.push({ ...w, x, y, size, rot, color: CLOUD_INK[i % CLOUD_INK.length] });
  });
  const pad = 14;
  const minX = Math.min(...placed.map((p) => p.x)) - pad;
  const maxX = Math.max(...placed.map((p) => p.x + p.w)) + pad;
  const minY = Math.min(...placed.map((p) => p.y)) - pad;
  const maxY = Math.max(...placed.map((p) => p.y + p.h)) + pad;
  return `<svg viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" role="img" aria-label="word cloud">
    ${nodes.map((n) => `<text x="${n.x}" y="${n.y}" text-anchor="middle" dominant-baseline="middle"
      font-weight="800" font-size="${n.size}" fill="${n.color}" font-family="Manrope, sans-serif"
      ${n.rot ? `transform="rotate(90 ${n.x} ${n.y})"` : ""}>${esc(n.word)}</text>`).join("")}
  </svg>`;
}

const MODE_NAMES = {
  word_cloud: "Word Cloud", short_answer: "Short Answer", poll: "Poll", tick_boxes: "Tick the Boxes",
  agree_disagree: "Agree / Disagree", confidence: "Confidence Check",
  ranking: "Ranking", predict: "Predict", this_or_that: "This or That",
  one_word: "One Word", ask_question: "Anonymous Questions",
  true_false: "True or False", mindmap: "Mindmap", exit_ticket: "Exit Ticket",
  muddiest_point: "Muddiest Point", retrieval_sprint: "Retrieval Sprint",
  sketch: "Sketch It", trace: "Letter Formation", image_drop: "Drop an Image", image_caption: "Image + Writing", image_long: "Image + Long Answer", maths_board: "Maths Board", counters_draw: "Counters + Drawing", spot_mistake: "Spot the Mistake",
  example_nonexample: "Example / Non-example", teach_back: "Teach It Back",
  match_up: "Match Up", put_in_order: "Put in Order", give_example: "Give an Example",
  make_connection: "Make a Connection", finish_sentence: "Finish the Sentence",
  notice_wonder: "Notice / Wonder", quick_challenge: "Quick Challenge",
  three_two_one: "3 – 2 – 1", before_after: "Before / After",
  venn: "Venn Diagram", multi_choice: "Multiple Choice", post_its: "Post-it Board",
  smiley: "Smiley Review", scale: "Scale", annotate: "Annotate",
  picture_prompt: "Picture Prompt", picture_vote: "Picture Vote", phonics: "Phonics Keyboard",
  spelling: "Spelling Test", cloze: "Cloze Passage", phonics_cloze: "Picture Phonics", working: "Working Out",
  counters: "Counters", table: "Table", question_set: "Question Set", dot_points: "Dot Points", compose: "Make a Tune", link: "Website Link", plus_minus: "Plus & Minus", long_response: "Long Response",
};

// Whole-lesson ZIP button, whenever there is at least one stored picture.
function offerImageZips(s) {
  if (!window._imgLinks || !(s.items || []).some((it) => it.images && it.images.length)) return;
  const b = document.getElementById("allImagesBtn");
  b.href = window._imgLinks.all;
  b.style.display = "inline-block";
}

async function load() {
  const params = new URLSearchParams(location.search);
  const code = (params.get("code") || "").toUpperCase();
  const pw = params.get("pw") || "";
  // Signed in on this browser: the sign-in goes in a header and links get short-lived tokens (auth.js).
  // Opened from a link with a short-lived token (?d=): that token opens the report and its pictures.
  if (EUAuth.token()) await EUAuth.ready;
  const dq = params.get("d") || "";
  const authQ = EUAuth.token() ? EUAuth.query() : dq ? `d=${encodeURIComponent(dq)}` : pw ? `pw=${encodeURIComponent(pw)}` : "";
  const fetchAuth = (url) => EUAuth.token() ? EUAuth.fetch(url) : fetch(url);
  const page = document.getElementById("page");
  let s;
  let recovered = false;

  // Archived lesson from the database (?lesson=id) — the permanent path.
  const lessonId = params.get("lesson");
  if (lessonId) {
    try {
      const res = await fetchAuth(`/api/lessons/${encodeURIComponent(lessonId)}${authQ ? `?${authQ}` : ""}`);
      if (res.status === 403) {
        page.innerHTML = `<div class="err"><h2>Sign-in needed.</h2><p>Open this report via “Past lessons” on the teacher dashboard.</p></div>`;
        return;
      }
      if (!res.ok) throw new Error();
      s = await res.json();
    } catch {
      page.innerHTML = `<div class="err"><h2>Lesson not found in the archive.</h2></div>`;
      return;
    }
    window._edit = { lessonId, authQ }; // owner opened it — allow retro edits
    window._imgLinks = {
      per: (it) => `/api/lessons/${encodeURIComponent(lessonId)}/images/${it.id}${authQ ? `?${authQ}` : ""}`,
      all: `/api/lessons/${encodeURIComponent(lessonId)}/images${authQ ? `?${authQ}` : ""}`,
    };
    offerImageZips(s);
    renderReport(s, false);
    return;
  }

  try {
    const res = await fetchAuth(`/api/summary/${code}${authQ ? `?${authQ}` : ""}`);
    if (res.status === 403) {
      page.innerHTML = `<div class="err"><h2>Sign-in needed.</h2><p>Open this report via the “Export as PDF” button on the teacher dashboard — it carries your sign-in for you.</p></div>`;
      return;
    }
    if (!res.ok) throw new Error();
    s = await res.json();
    window._imgLinks = {
      per: (it) => `/api/images/${encodeURIComponent(code)}/${it.id}${authQ ? `?${authQ}` : ""}`,
      all: `/api/images/${encodeURIComponent(code)}${authQ ? `?${authQ}` : ""}`,
    };
    offerImageZips(s);
  } catch {
    // The session is gone from the server — fall back to the dashboard's
    // continuous autosave in this browser.
    try {
      const arc = JSON.parse(localStorage.getItem("eyesup_archive") || "{}");
      const saved = arc[code];
      if (saved) {
        s = { ...saved.summary, code, createdAt: saved.savedAt };
        recovered = true;
      }
    } catch { /* no archive */ }
    if (!s) {
      page.innerHTML = `<div class="err"><h2>No data found for “${esc(code)}”.</h2><p>The live session has ended and no autosave for it exists in this browser. Autosaves are kept on the computer that ran the teacher dashboard — open this report there.</p></div>`;
      return;
    }
  }

  renderReport(s, recovered);
}

function renderReport(s, recovered) {
  const page = document.getElementById("page");
  const when = new Date(s.createdAt).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });

  const conf = s.confidence ? `
    <div class="stat"><div class="v">${s.confidence.understanding}%</div><div class="k">signalled understanding<br/>(${s.confidence.gotIt} got it · ${s.confidence.nearly} nearly · ${s.confidence.confused} confused)</div></div>` : "";

  const words = s.commonWords.length ? `
    <h2 class="sec">Commonly remembered</h2>
    <div class="word-chips">${s.commonWords.map((w) => `<span class="word-chip">${esc(w.word)}<small>×${w.count}</small></span>`).join("")}</div>` : "";

  LV.normalise(s);
  LV.css();
  const items = LV.shown(s).map((it) => {
    const idx = s.items.indexOf(it);
    let body = "";
    if (it.mode === "smiley" && it.distribution) {
      // The smiley chart itself, faces scaled by votes.
      const total = it.distribution.reduce((a, d) => a + d.count, 0) || 1;
      const maxN = Math.max(1, ...it.distribution.map((d) => d.count));
      body = `<div class="smiley-print">${it.distribution
        .map((d) => `<div class="sp-cell">
          <div class="sp-face" style="font-size:${Math.round(30 + (d.count / maxN) * 34)}px">${esc(d.label)}</div>
          <div class="sp-n">${d.count}</div><div class="sp-p">${Math.round((d.count / total) * 100)}%</div>
        </div>`)
        .join("")}</div>`;
    } else if ((it.words && it.words.length) || (it.topWords && it.topWords.length && ["word_cloud", "one_word", "mindmap"].includes(it.mode))) {
      // The cloud graphic, redrawn exactly from the class's words.
      body = `<div class="cloud-print">${cloudSvg(it.words || it.topWords)}</div>`;
    } else if (it.distribution) {
      const max = Math.max(1, ...it.distribution.map((d) => d.count));
      body = `<div class="dist">${it.distribution.map((d) => `
        <div class="row"><span class="lbl">${esc(d.label)}</span>
        <span class="track"><span class="fill" style="width:${(d.count / max) * 100}%"></span></span>
        <span class="num">${d.count}</span></div>`).join("")}</div>`;
    } else if (it.ranked) {
      body = `<ol class="ranked-list">${it.ranked.map((r) => `<li>${esc(r.label)}${r.correctPct != null ? ` <small style="color:var(--muted)">(${r.correctPct}% placed it here)</small>` : ""}</li>`).join("")}</ol>`;
    } else if (it.scale) {
      body = `<div class="dist"><div class="row">
        <span class="lbl">${esc(it.scale.labels[0])}</span>
        <span class="track"><span class="fill" style="width:${it.scale.avg ?? 50}%"></span></span>
        <span class="lbl" style="text-align:right">${esc(it.scale.labels[1])}</span></div></div>
        <p style="color:var(--ink-soft);font-size:0.85rem;margin-top:0.3rem">Class average: ${it.scale.avg ?? "—"} / 100</p>`;
    } else if (it.venn) {
      const heads = [`${it.venn.labels[0]} only`, "Both", `${it.venn.labels[1]} only`];
      body = `<div class="dist">${it.venn.regions.map((reg, i) => `
        <div class="row"><span class="lbl">${esc(heads[i])}</span>
        <span style="flex:1">${reg.map((w) => esc(w.word) + (w.count > 1 ? ` ×${w.count}` : "")).join(", ") || "—"}</span></div>`).join("")}</div>`;
    } else if (it.matchStats) {
      body = `<ol class="ranked-list">${it.matchStats.map((m) => `<li>${esc(m.pair)} — ${m.correctPct}% matched correctly</li>`).join("")}</ol>`;
    } else if (it.sketchCount != null) {
      const noun = it.mode === "maths_board" || it.mode === "counters_draw" ? ["board", "boards"] : ["image_drop", "image_caption", "image_long"].includes(it.mode) ? ["image", "images"] : ["sketch", "sketches"];
      body = it.images && it.images.length
        ? `${window._imgLinks ? `<a class="dl-btn" href="${window._imgLinks.per(it)}">⬇ Download these ${it.images.length} image${it.images.length === 1 ? "" : "s"} (ZIP)</a>` : ""}<div class="img-gallery">${it.images
            .map((im) => `<figure><img src="${im.image}" alt="student ${noun[0]}" />${im.text ? `<p class="img-text">${esc(im.text)}</p>` : ""}${im.name && !it.anonymous ? `<figcaption>${esc(im.name)}</figcaption>` : ""}</figure>`)
            .join("")}</div>`
        : `<p style="color:var(--ink-soft);margin-top:0.4rem">${it.sketchCount} ${it.sketchCount === 1 ? noun[0] : noun[1]} submitted — no stored pictures for this activity.</p>`;
    } else if (it.topWords && it.topWords.length) {
      body = `<div class="word-chips" style="margin-top:0.5rem">${it.topWords.map((w) => `<span class="word-chip">${esc(w.word)}<small>×${w.count}</small></span>`).join("")}</div>`;
    } else if (it.mode === "question_set" && (it.questions || []).length && (it.students || []).length && !it.anonymous) {
      body = `<div class="lv-grid"><table><thead><tr><th>Student</th>${it.questions.map((q, k) => `<th>Q${k + 1} · ${esc(q)}</th>`).join("")}</tr></thead>
        <tbody>${it.students.map((st) => { const ps = LV.parts(st.response); return `<tr><td>${esc(st.name)}</td>${it.questions.map((_, k) => `<td>${esc(ps[k] || "—")}</td>`).join("")}</tr>`; }).join("")}</tbody></table></div>`;
    } else if (it.answers && it.answers.length && (it.anonymous || !(it.students || []).length)) {
      body = `<ol class="answers">${it.answers.map((a) => `<li>${esc(a)}</li>`).join("")}</ol>`;
    }
    // Per-student attribution (anonymous modes stay anonymous by design).
    let who = "";
    if (it.anonymous) {
      who = `<p class="who-note">🕶 Responses in this mode are anonymous — names are never recorded.</p>`;
    } else if (it.students && it.students.length && it.mode !== "question_set") {
      who = `<div class="who-list">${it.students
        .map((s) => `<div class="who-row"><span class="who-name">${esc(s.name)}</span><span class="who-resp">${LV.mark(s)}${esc(s.response)}${s.score && s.ok !== true ? ` <small style="color:var(--muted)">(${esc(s.score)})</small>` : ""}</span></div>`)
        .join("")}</div>`;
      const marked = it.students.filter((x) => x.ok === true || x.ok === false);
      if (marked.length) who = `<p class="who-note" style="font-weight:700;color:var(--ink-soft)">${marked.filter((x) => x.ok).length} of ${marked.length} right</p>` + who;
      if (it.noResponse && it.noResponse.length)
        who += `<p class="who-note">No response: ${it.noResponse.map(esc).join(", ")}</p>`;
      if (it.marked) who += `<p class="who-note">✎ Marked after the lesson.</p>`;
    }
    return `<div class="itx${it.images && it.images.length ? " has-gallery" : ""}">
      <span class="mode">${idx + 1} · ${it.mode === "counters" && it.counterKind === "base10" ? "Tens & Ones" : MODE_NAMES[it.mode] || esc(it.mode)}</span>
      <h3>${it.prompt ? esc(it.prompt) : "<i>Question asked aloud</i>"}</h3>
      ${body}
      ${who}
      <div class="n">${it.responses} response${it.responses === 1 ? "" : "s"}</div>
    </div>`;
  }).join("");

  page.innerHTML = `
    ${recovered ? `<p style="background:var(--accent-soft);color:var(--accent-ink);border-radius:10px;padding:0.6rem 0.9rem;font-size:0.85rem;font-weight:600;margin-bottom:1.2rem">♻️ The live session has ended — this report was recovered from the dashboard's autosave on this computer (saved ${esc(new Date(s.createdAt).toLocaleTimeString())}).</p>` : ""}
    <div class="report-head">
      <h1>${esc(LV.title(s))}</h1>
      <div class="meta">${s.teacherName ? `Taught by <b>${esc(s.teacherName)}</b> · ` : ""}Session <b>${esc(s.code)}</b><br/>${esc(when)}</div>
    </div>
    <div class="stat-row">
      <div class="stat"><div class="v">${s.participatedCount}/${s.joinedCount}</div><div class="k">students participated</div></div>
      <div class="stat"><div class="v">${LV.shown(s).length}</div><div class="k">activities run</div></div>
      ${conf}
    </div>
    ${words}
    <h2 class="sec">Interactions</h2>
    ${s.ghostCount ? `<p class="who-note" style="margin:0 0 0.8rem">${s.ghostCount === 1 ? "1 empty re-launch" : `${s.ghostCount} empty re-launches`} of a question left out (it was asked again later).</p>` : ""}
    ${items || "<p style='color:var(--muted)'>No interactions were run.</p>"}
    <div class="note">Generated by Eyes Up 👀 — use this to decide what to reteach, not to grade. Student answers to anonymous questions carry no names anywhere in the system.</div>`;
  document.title = `${LV.title(s)} — Eyes Up report`;
  attachEditors(s, recovered);
}

/* ---- retro editing: click ✎ to title the lesson or write in the
   questions you asked aloud. Saves straight to the archive. ---- */

async function saveEdit(body) {
  const res = await fetch(`/api/lessons/${window._edit.lessonId}/edit`, {
    method: "POST",
    headers: EUAuth.headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("save failed");
}

function inlineEdit(el, initial, placeholder, onSave) {
  const input = document.createElement("input");
  input.value = initial;
  input.placeholder = placeholder;
  input.maxLength = 300;
  input.style.cssText = "font:inherit;width:100%;border:2px solid var(--accent);border-radius:8px;padding:0.15em 0.4em;background:#fff";
  const old = el.innerHTML;
  el.innerHTML = "";
  el.appendChild(input);
  input.focus();
  input.select();
  let finished = false;
  const done = async (save) => {
    if (finished) return;
    finished = true;
    if (save) {
      try { await onSave(input.value.trim()); return; } catch { /* fall through */ }
    }
    el.innerHTML = old;
  };
  input.onkeydown = (e) => {
    if (e.key === "Enter") done(true);
    if (e.key === "Escape") done(false);
  };
  input.onblur = () => done(true);
}

function attachEditors(s, recovered) {
  if (!window._edit) return;
  const page = document.getElementById("page");
  const head = page.querySelector(".report-head");
  head.insertAdjacentHTML("beforebegin",
    `<div class="edit-hint">✎ Asked things aloud? Click a pencil to title this lesson or write the questions in — they save to the archive.</div>`);

  const mkBtn = (title) => {
    const b = document.createElement("button");
    b.className = "edit-btn";
    b.textContent = "✎";
    b.title = title;
    return b;
  };

  const h1 = head.querySelector("h1");
  const tb = mkBtn("Edit lesson title");
  tb.onclick = () => inlineEdit(h1, s.title || "", "Lesson title…", async (v) => {
    await saveEdit({ title: v });
    s.title = v;
    renderReport(s, recovered);
  });
  h1.appendChild(tb);

  const visible = LV.shown(s);
  page.querySelectorAll(".itx").forEach((el, k) => {
    const h3 = el.querySelector("h3");
    const i = s.items.indexOf(visible[k]);
    if (!h3 || i < 0) return;
    const b = mkBtn("Edit this question's wording");
    b.onclick = () => inlineEdit(h3, s.items[i].prompt || "", "What did you ask?", async (v) => {
      await saveEdit({ prompts: [{ i, prompt: v }] });
      s.items[i].prompt = v;
      renderReport(s, recovered);
    });
    h3.appendChild(b);
  });
}
load();
document.getElementById("printBtn").onclick = () => window.print();

