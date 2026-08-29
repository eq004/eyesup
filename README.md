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
