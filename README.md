# Eyes Up 👀

A teacher-led, real-time classroom engagement platform for the recall/review portion of a lesson.

**The teacher holds the room. The room responds.**

Student devices behave like classroom remotes, not independent learning platforms. The teacher conducts short 10–60 second bursts of whole-class digital response between moments of real teaching, questioning and discussion. After every interaction, student screens return to **"Eyes up 👀 — back to the room."**

The rhythm the product is built around:

```
TEACH → ASK → RESPOND → REVEAL → DISCUSS → TEACH
```

## Running it

```bash
npm install
npm start
```

Then open **http://localhost:4630**.

- **/teacher** — the dashboard. A session and 4-letter join code are created automatically.
- **/join** — students enter the code (no accounts). Also reachable via the QR code on the projector.
- **/projector?code=XXXX** — the big classroom screen (opens via the 📽️ button on the dashboard).

For real classroom use, students on other devices connect to your machine's LAN address (e.g. `http://192.168.x.x:4630/join`).

## Interaction modes

**Fast votes**: Poll · Agree/Disagree · True or False · This or That · Confidence Check · Example/Non-example
**Words & ideas**: Word Cloud · One Word · Mindmap · Post-its (sticky notes on the board — teacher chooses at launch whether notes appear instantly or wait for per-note approval / "Reveal all")

Contribution modes (Word Cloud, Mindmap, Post-its, Venn) also have a launch option for **one contribution each** vs **multiple contributions each**.
**Written recall**: Short Answer · Retrieval Sprint (60s timer) · Exit Ticket · Finish the Sentence · Give an Example · Make a Connection · Teach It Back · Spot the Mistake · Quick Challenge · Predict
**Reflect**: 3–2–1 · Notice/Wonder · Before/After · Muddiest Point (anonymous) · Ask a Question (anonymous)
**Arrange & match**: Ranking · Put in Order · Match Up · Venn Diagram (sort ideas into two overlapping circles, drawn live on the projector)
**Draw**: Sketch It (canvas drawing, revealed as a gallery)

Teacher controls: **Open / Close responses · Show / Hide results · Reveal (one by one or all) · Clear · Next (planned sequence) · EYES UP**.

The **📱 Student view** button on the dashboard opens a phone-sized live preview of the real student experience — it joins the session as "👁 Preview" so a teacher can test any interaction end-to-end without a second device. Closing the panel removes the preview student from the roster.

Written answers (Short Answer, Predict, anonymous questions) arrive on the teacher dashboard privately and only reach the projector when the teacher reveals them — gradually or all at once. Live modes (word cloud, polls, votes) build on the projector in real time.

## Phone remote

**📱 Remote** on the dashboard shows a QR — scan it with a phone to get a pocket control surface at `/remote` (session code + teacher password). The projector keeps showing the class screen while the teacher walks the room: Eyes Up, open/close/reveal, Next-in-plan, zero-setup launches (question asked aloud), timer, random student, QR toggle. The dashboard and any number of remotes stay connected to the same session simultaneously.

## Room tools

The dashboard sidebar has teacher utilities that use the big screen without being an "activity":

- **⏱ Timer** — presets (30s/1m/2m/5m) or custom, with pause/resume. Shows as a large countdown overlay on the projector, pulsing red in the last 10 seconds.
- **🎲 Random student** — spotlights a random joined student's name on the projector, with no repeats until everyone has had a turn.
- **👥 Random groups** — shuffles joined students into "groups of N" or "split into N groups" and projects the allocation as cards.

Spotlight/groups take over the projector until cleared; the preview student is excluded from picks and groups.

## Recall plans

Teachers can optionally pre-build a short sequence (e.g. One Word → Short Answer → Agree/Disagree → Confidence Check) and step through it with **Next** — or abandon it at any moment and launch anything spontaneously. A "Load example" button seeds a Generative-AI recall plan for demoing.

**Finish & summarise** produces a deliberately simple recap: who participated, the confidence picture, commonly remembered words, and what each interaction gathered — enough to decide what to reteach, no analytics rabbit hole.

**Export as PDF** (button on the summary, or `/report?code=XXXX` directly) opens a clean print-styled lesson report — headline stats, common words, and every interaction with its distributions and answers — and saves via the browser's print dialog ("Save as PDF").

**Autosave**: sessions live in server memory, but the dashboard continuously snapshots the full session summary into the teacher's browser (localStorage, last 10 sessions) a few seconds after every change. If the server restarts or the host sleeps before exporting, the report page transparently recovers from that autosave (with a "recovered" banner) — open it on the computer that ran the dashboard.

## Going live

The app is one Node process (HTTP + WebSockets), so it needs a host that runs persistent Node servers — **Render**, Railway, or Fly.io all work; plain static hosts (Netlify/Vercel static) do not.

Typical Render setup: push this folder to a GitHub repo → Render "New Web Service" → build command `npm install`, start command `npm start`. The server reads `PORT` from the environment automatically.

**Teacher password**: set the `TEACHER_PASSWORD` environment variable on the host. When set, opening `/teacher` asks for the password before a session can be created or resumed, and `/report` + `/api/summary` require it too. Students and the projector never need the password — a live 4-letter session code is their only key, and without a teacher there are no sessions to join. When the variable is unset (e.g. local testing), there is no gate.

Caveats for live use: sessions are in-memory, so a server restart/redeploy clears them (fine for a lesson-length tool), and free hosting tiers may sleep when idle — the first visit of the day can take a minute to wake.

## Architecture

- `server.js` — single Node process: Express serves static views, `ws` powers real-time. Sessions are in-memory (no database, no accounts — right for a prototype; swap for Redis/Postgres later without touching the clients).
- `public/teacher.*` — dashboard (conductor).
- `public/student.*` — minimal remote. Students can only ever see what the teacher has made live.
- `public/projector.*` — bold dark presentation view, readable from the back row.
- All state flows one way: **teacher action → server state → broadcast to every screen.** Students cannot browse ahead; there is nothing to browse.

### AI (deliberately not included yet)

The architecture leaves a clean seam for a future **✨ Create Recall** feature: a teacher speaks for 30–60 seconds about last lesson, and an LLM proposes a recall sequence (the same `{mode, prompt, options}` step objects the plan already uses) for the teacher to review, edit and accept. AI as planning assistant — never the teacher. The dashboard shows a stub where this will live.

## Teacher accounts

### Inviting another teacher

Signed-in teachers click **➕ Invite a colleague** (dashboard header, or the remote's More tab) — it copies a link like `https://eyesup.onrender.com/teacher?invite=…`. The colleague opens it, types **their name and a password**, and they're in. Their sign-in name is made from their name automatically (`Sarah Jones` → `sarah.jones`), and either form works at sign-in. Without the link, the invite code (`TEACHER_PASSWORD`) can be typed by hand.

## Student images after the lesson

Pictures students submit (Drop an Image, Image + Writing, Sketch, Annotate) are saved to the database **the moment they arrive**, so nothing depends on downloading during class. Afterwards they appear in the archived lesson report, the Data dashboard's Lesson dashboard tab, and as ZIP downloads (whole lesson, or one activity) — files named per student, with a `captions.txt` for Image + Writing. Only the lesson's owner can view or download them; shared links never include pictures.

**AI summaries (optional)**: set `ANTHROPIC_API_KEY` on Render and the data section's ✨ *Visualise this lesson* snapshot gains a **Summarise the written answers** button — common threads, misconceptions and follow-ups across every short/long answer in the lesson. Only the answer texts are sent (never student names); the result is saved with the lesson so it's free to re-open. `AI_MODEL` overrides the model (default `claude-sonnet-5`). Without the key the feature stays hidden.

Images are kept for **60 days** by default (`IMAGE_KEEP_DAYS` on Render changes this) and then pruned, to keep the free database within its limits. Everything else about the lesson stays forever.

## Lesson plans (plan ahead, teach again and again)

The dashboard opens on **📝 Lesson plans**: every saved lesson as a card with **▶ Teach**, **✎ Edit**, copy and delete. No live class is needed to plan.

- **Editor** — name the lesson, then **＋ Add an activity**: choose the activity type, type the question, add. Steps can be edited (the form comes back filled in), reordered with ↑ ↓, duplicated or deleted, and a pasted ChatGPT quiz lands at the end. It saves itself as you work.
- **Teach** — pressing ▶ Teach opens the lesson in **🎤 Teach** as a strip across the top: every step as a chip, and one big **▶ Start the lesson / ▶ Launch step N** button showing what's next. Tap any chip to jump to that step. The activity grid folds away behind "Ask something on the spot".
- **Changes in class** — adding a question on the spot marks the lesson "changed during class" with a **💾 Save changes to plan** button. A lesson built on the spot can be kept with **💾 Save as a lesson plan**.
- **Back-to-back classes** — **🆕 Next class** keeps the same lesson loaded, restarted at step 1, with a fresh class code.
- **Phone remote** — the **📝 Lessons** tab lists your plans with ▶ Teach and runs the open lesson step by step. Plans are created and edited on a computer.

Plans are stored per teacher in the `lesson_plans` table (steps as JSON, pictures included) and count how often and how recently each was taught.

## Several pictures per answer

**Drop an Image**, **Image + Writing** and **Image + Long Answer** let each student send up to **6 pictures** in one answer (drag several in, choose several, or add them one at a time; each has a ✕ to remove). Image + Long Answer pairs the pictures with a full written answer of up to 3,000 characters.

- The projector shows one card per student: the first picture large, the rest as thumbnails. Tapping any thumbnail puts that exact picture on the big screen, with the student's writing underneath.
- The dashboard and phone remote show every picture; click one to spotlight it.
- Downloads name them `Ava Nguyen 1.jpg`, `Ava Nguyen 2.jpg`…, with the writing once in `captions.txt`.
- In the archive (`lesson_images`), each picture is its own row numbered by `img_index`; a changed answer replaces the student's earlier pictures, including any extras.
