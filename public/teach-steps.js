/* Eyes Up — the step-by-step Teach page (/teach).

   The engine is public/teacher.js, shared with the classic dashboard: the room, the activities, the
   composer, the live answers, the plans and every sheet are its work. This file only decides what is
   on the screen at each moment of a lesson — 1 Get the class in → 2 Ask → 3 See answers — and draws
   the parts that are new: the big class code, who is here, the favourites tiles and "What next?".

   The rule it keeps: one main button per screen, at most three other choices, the rest behind "More". */
(function () {
  if (!document.body.classList.contains("ui-steps")) return;
  const el = (id) => document.getElementById(id);

  let step = 1;
  let started = false; // the first state decides where a reload lands
  let lastItxId = null;
  let lastBoard = "";
  let favKey = "";
  // Shown until a teacher has starred favourites of their own.
  const STARTERS = ["short_answer", "multi_choice", "word_cloud", "sketch", "agree_disagree", "exit_ticket"];
  const PICTURE_MODES = new Set(["sketch", "trace", "annotate", "annotate_caption", "image_drop", "image_caption", "image_long", "maths_board", "counters_draw"]);
  const activityKeys = () => CATEGORIES.filter((c) => c.label !== TOOL_STEP_LABEL).flatMap((c) => c.modes).filter((k) => MODES[k]);
  const realStudents = () => (state?.students || []).filter((s) => s.name && s.name !== "👁 Preview");
  const sameName = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

  function go(n, byTeacher) {
    step = n;
    document.body.dataset.step = String(n);
    for (const i of [1, 2, 3]) el(`sxPane${i}`).hidden = i !== n;
    paint();
    if (byTeacher) window.scrollTo(0, 0);
  }

  /* ---------- step 1: the code and who is here ---------- */
  function paintJoin() {
    el("sxCodeBlocks").innerHTML = String(state.code || "").split("").map((ch) => `<span>${esc(ch)}</span>`).join("");
    el("sxOpenScreen").href = el("openProjector").href;
    const joined = realStudents().map((s) => s.name);
    const roster = state.roster || [];
    const who = el("sxWho");
    if (roster.length) {
      const extras = joined.filter((n) => !roster.some((r) => sameName(r, n)));
      const here = roster.filter((r) => joined.some((n) => sameName(r, n))).length + extras.length;
      el("sxHereCount").textContent = `${here} of ${Math.max(roster.length, here)}`;
      el("sxHereBarWrap").hidden = false;
      el("sxHereBar").style.width = `${Math.min(100, (here / Math.max(1, roster.length)) * 100)}%`;
      who.innerHTML = roster.map((r) => `<span class="${joined.some((n) => sameName(r, n)) ? "in" : "out"}" title="${esc(r)}">${esc(r)}</span>`).join("")
        + extras.map((n) => `<span class="in" title="${esc(n)}">${esc(n)}</span>`).join("");
    } else {
      el("sxHereCount").textContent = joined.length ? `${joined.length} here` : "";
      el("sxHereBarWrap").hidden = true;
      who.innerHTML = joined.length
        ? joined.map((n) => `<span class="in" title="${esc(n)}">${esc(n)}</span>`).join("")
        : `<span class="none">Names appear here as students join. Choose a class at the top and they can tap their own name.</span>`;
    }
    const seq = state.sequence || [];
    el("sxPlanLine").innerHTML = seq.length
      ? `<b>${esc(state.planTitle || "Today's lesson")}</b> · ${seq.length} step${seq.length === 1 ? "" : "s"} loaded`
      : "Step through a lesson you planned earlier.";
    el("sxPlans").textContent = seq.length ? "📘 Change the plan" : "📘 Choose a lesson plan";
  }

  /* ---------- step 2: favourites first ---------- */
  function paintFavs() {
    const q = el("sxSearch").value.trim().toLowerCase();
    const all = activityKeys();
    let keys, label;
    if (q) {
      keys = all.filter((k) => `${MODES[k].name} ${MODES[k].hint}`.toLowerCase().includes(q));
      label = keys.length ? `Activities matching “${q}”` : `Nothing matches “${q}”. Try another word, or browse all the activities.`;
    } else {
      const favs = (state.favs || []).filter((k) => all.includes(k));
      keys = favs.length ? favs : STARTERS.filter((k) => MODES[k]);
      label = favs.length ? "Your favourites" : "Good ones to start with";
    }
    const composing = composerTarget.kind === "launch" ? composerModeKey : null;
    const key = JSON.stringify([q, keys, composing, state.tier, state.video]);
    if (key === favKey) return;
    favKey = key;
    el("sxFavLabel").textContent = label;
    el("sxFavs").innerHTML = keys.map((k, i) => {
      const m = MODES[k], locked = isLocked(k);
      const on = composing && (composing === k || MODES[composing]?.launchAs === k);
      return `<button class="sx-tile c${i % 6}${on ? " on" : ""}${locked ? " locked" : ""}" data-key="${k}" aria-pressed="${on ? "true" : "false"}">
        <span class="ic" aria-hidden="true">${m.icon}</span><b>${esc(m.name)}</b><small>${esc(m.hint)}</small>${locked ? `<span class="lock" title="${videoLocked(k) ? "Video add-on" : "Part of the Individual plan"}">🔒</span>` : ""}</button>`;
    }).join("");
    el("sxFavs").querySelectorAll("[data-key]").forEach((b) => (b.onclick = () => {
      const k = b.dataset.key;
      if (isLocked(k)) return showSubscribe(videoLocked(k) ? "locked_video" : "locked_activity");
      openComposer(k, !!(MODES[k].imageUpload && composerImage));
      el("launchPanel").scrollIntoView({ block: "nearest", behavior: "smooth" });
    }));
  }

  /* ---------- step 3: what next ---------- */
  function paintNext() {
    const itx = state.interaction;
    const seq = state.sequence || [], idx = state.seqIndex, nextSt = seq[idx + 1];
    const big = (act, title, sub) => `<button class="sx-next main" data-sx="${act}"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</button>`;
    const plain = (act, title, sub) => `<button class="sx-next" data-sx="${act}"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</button>`;
    const quiet = (act, title) => `<button class="sx-next quiet" data-sx="${act}">${title}</button>`;
    const nextLabel = nextSt ? (idx < 0 ? "Start the lesson" : `Next: ${esc(stepTag(nextSt))}`) : "";
    const main = [], more = [];
    if (itx) {
      const canReveal = revealMode(itx.mode) && !(itx.mode === "post_its" && !itx.moderated);
      const answerDue = itx.mode === "multi_choice" && itx.correct != null && !itx.answerRevealed;
      let first;
      if (!itx.resultsVisible) first = ["show_results", "Show the class", "Puts the answers on the classroom screen"];
      else if (answerDue) first = ["reveal_answer", "Reveal the right answer", "Marks it on the classroom screen"];
      else if (nextSt) first = ["next", nextLabel, "The next step of your plan"];
      else first = ["ask", "Ask another question", "Pick the next activity"];
      main.push(big(...first));
      const others = [];
      if (!itx.resultsVisible && itx.responses.length) others.push(plain("reveal_random", "Show one answer at random", "The rest stay hidden"));
      others.push(itx.open ? plain("close_responses", "Stop taking answers") : plain("open_responses", "Take answers again"));
      if (first[0] !== "ask") others.push(plain("ask", "Ask another question"));
      if (nextSt && first[0] !== "next") others.push(plain("next", nextLabel));
      main.push(...others.slice(0, 3));
      if (itx.resultsVisible) more.push(quiet("hide_results", "Hide the answers again"));
      if (canReveal) more.push(quiet("reveal_all", "Reveal every answer"));
      if (canReveal && !ANON_MODES.has(itx.mode)) more.push(quiet("toggle_names", `Names on the classroom screen: ${state.showNames ? "on" : "off"}`));
      if (seq.slice(0, Math.max(0, idx) + 1).some((st) => st.mode === "slide" || st.mode === "deck")) more.push(quiet("back_to_slides", "Back to my slides"));
      more.push(quiet("clear", "Clear these answers"));
      more.push(quiet("close_question", "Close this question"));
      if (!onFreePlan() && itx.responses.length) {
        const href = itx.mode === "video_drop" ? `/api/videos/${state.code}/${itx.id}?${authQuery()}`
          : PICTURE_MODES.has(itx.mode) ? `/api/images/${state.code}/${itx.id}?${authQuery()}`
          : `/api/question/${state.code}/${itx.id}.csv?${authQuery()}`;
        more.push(`<a class="sx-next quiet" href="${href}">Download this question</a>`);
      }
    } else {
      if (nextSt) {
        main.push(big("next", idx < 0 ? "Start the lesson" : `Launch ${esc(stepTag(nextSt))}`, idx < 0 ? `${seq.length} steps are ready` : `Step ${idx + 2} of ${seq.length}`));
        main.push(plain("ask", "Ask something on the spot"));
      } else {
        main.push(big("ask", "Ask a question", "Pick an activity"));
      }
      if (state.focus) main.push(plain("clear_focus", "Clear the classroom screen"));
    }
    el("sxNextMain").innerHTML = main.join("");
    el("sxNextMore").innerHTML = more.join("");
    el("sxNext").querySelectorAll("[data-sx]").forEach((b) => (b.onclick = () => {
      const act = b.dataset.sx;
      if (act === "ask") return go(2, true);
      if (act === "clear" && !confirm("Clear every answer to this question?\n\nStudents can answer again.")) return;
      send({ type: act });
    }));
  }

  /* ---------- everything that follows the room ---------- */
  function paint() {
    if (!state) return;
    const itx = state.interaction;
    const here = realStudents().length, roster = (state.roster || []).length;
    el("sxSub1").textContent = roster ? `${here} of ${Math.max(roster, here)} are here` : here ? `${here} here` : "Share the code";
    const composing = composerTarget.kind === "launch" && composerModeKey ? MODES[composerModeKey] : null;
    el("sxSub2").textContent = composing ? `${composing.name}: type it and launch` : "Pick an activity and launch";
    el("sxSub3").textContent = itx ? `${itx.responses.length} of ${state.students.length} have answered`
      : state.phase === "slide" || state.phase === "deck" ? "Your slides are on the screen" : "Reveal, spotlight, discuss";
    document.querySelectorAll(".sx-stepbtn").forEach((b) => {
      const n = +b.dataset.step;
      b.classList.toggle("on", n === step);
      b.classList.toggle("done", n !== step && ((n === 1 && here > 0 && step > 1) || (n === 2 && !!itx && step === 3)));
      if (n === step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    paintJoin();
    paintFavs();
    paintNext();
    el("sxComposerEmpty").hidden = !!composing;
    el("pasteQuizBtn").hidden = false; // always one tap away here, whatever the classic launcher is doing
    el("sxBrowse").textContent = el("sxAll").hidden ? `Browse all ${activityKeys().length} activities` : "Hide the full list";
  }

  function render() {
    if (!state) return;
    // This page is switched on per account; anyone else belongs on the classic dashboard.
    if (me && me.newUi === false) {
      try { localStorage.setItem("eyesup_ui", "classic"); } catch { /* private window */ }
      location.replace("/teacher?classic=1");
      return;
    }
    const itx = state.interaction;
    const board = `${state.phase}:${state.slide ? state.slide.img : ""}:${state.deck ? state.deck.url : ""}`;
    const onSlides = !itx && (state.phase === "slide" || state.phase === "deck");
    if (!started) {
      started = true;
      lastItxId = itx ? itx.id : null;
      lastBoard = board;
      // Back after a reload: carry on where the lesson is, not at the front door.
      go(itx || onSlides ? 3 : realStudents().length || (state.sequence || []).length ? 2 : 1);
      return;
    }
    if (itx && itx.id !== lastItxId) { lastItxId = itx.id; lastBoard = board; go(3); return; } // something was launched: watch the answers
    if (!itx) lastItxId = null;
    if (onSlides && board !== lastBoard) { lastBoard = board; go(3); return; }
    lastBoard = board;
    paint();
  }

  /* ---------- wiring ---------- */
  document.querySelectorAll(".sx-stepbtn").forEach((b) => (b.onclick = () => go(+b.dataset.step, true)));
  el("sxGoAsk").onclick = () => go(2, true);
  el("sxPlans").onclick = () => showView("plans");
  el("sxRemote").onclick = () => el("remoteBtn").click();
  el("sxPreview").onclick = () => el("togglePreview").click();
  el("sxEyesUp").onclick = () => send({ type: "eyes_up" });
  el("sxSearch").oninput = () => { favKey = ""; if (state) paintFavs(); };
  el("sxBrowse").onclick = () => {
    const open = el("sxAll").hidden;
    el("sxAll").hidden = !open;
    el("sxBrowse").setAttribute("aria-expanded", open ? "true" : "false");
    paint();
    if (open) el("sxAll").scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  el("classicLink").onclick = () => { try { localStorage.setItem("eyesup_ui", "classic"); } catch { /* private window */ } };
  // Screens and Tools close like the menu does: a click anywhere else puts them away.
  document.addEventListener("click", (e) => {
    document.querySelectorAll("details.sx-pop[open]").forEach((d) => { if (!d.contains(e.target)) d.open = false; });
  });
  el("sxScreens").addEventListener("click", (e) => { if (e.target.closest(".sx-pop-item")) setTimeout(() => { el("sxScreens").open = false; }, 0); });

  window.stepsUI = { render, sync: paint, go };
  if (typeof state !== "undefined" && state) render();
})();
