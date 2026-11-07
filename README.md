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

📚 Past lessons and 📈 Data live in the ☰ Menu. Pictures come out fast: once students have sent any drawing or photo, a **🖼 Pictures ZIP (n)** button appears on the Teach bar (one ZIP of the whole class so far, a folder per activity, a file per student), and every lesson in Past lessons with pictures has its own 🖼 ZIP button. The Teach page opens with “Ready to teach?”: four equal doors in one row (Classroom screen · Teacher remote · Student link · Student QR; the QR door turns green while the join screen is up on the projector), a Class join row (code, address, who has joined, Student view) and a Lesson setup card on the right (Lesson settings, Class, Lesson name). The page always opens on Teach; Lesson plans is the tab beside it. Text on the Teach page is never smaller than 0.9 rem and every button, chip and box is at least 44 px tall, for older eyes and fingers on a classroom laptop. Beside the fold is a 📌: the Teach bar and Live now are docked by default, and each has its own pin so a teacher can let either scroll with the page instead. Every other area folds like an accordion and is remembered on that computer: Live now (▾, and it reopens by itself when something launches), the lesson strip's steps (▾ Steps), Ask something on the spot (Hide activities), each activity category (its heading is a soft bar with the name, how many activities it holds and a chevron) and 🧰 Room tools. The categories and Room tools start folded; ⭐ Favourites starts open, so a teacher's own picks are the first thing on the grid. A small ▴ at the bar's right folds it to one slim row (the four doors without captions, the code and who has joined) for more room on a laptop; ▾ brings it back, and the choice is remembered on that computer. Under the Teach bar, **Live now** is docked too: it stays in view while the page scrolls, and a long list of responses scrolls inside it. The lesson-plan strip (or the “No lesson plan open” bar) sits beneath Live now, above the activity grid. 🧰 Room tools (timer, random student, random groups, question dice) is a section of its own at the foot of the activity grid, laid out like ⚡ Fast votes and the other categories, so the Teach page is one wide column. The Teach bar keeps only what is used every minute — 🔗 Student link, 🔳 Student QR, 📽️ Projector, 📱 Teacher remote and 👀 EYES UP; everything set once per lesson (Names, Hold answers, Change answers, Student view, Next class, Finish) sits behind one **⚙️ Lesson settings** button. **The Free plan.** When billing is on (or `FREE_TIER=1` forces it for a local check), an account on plan `free` gets Short Answer, Word Cloud, Mind Map, Post-its and Agree / Disagree plus the room tools; every other tile shows a 🔒 and opens the subscribe sheet, lesson plans show a locked page, "Add to lesson" is refused (`locked_plans`), and the ZIP/CSV downloads answer 402 (`locked_downloads`; the classroom screen gets no download token). The five Free activities are the default favourites. A lapsed trial or subscription drops to the Free plan instead of locking the teacher out; plan `complimentary` (new, in Owner admin) is full access for free. With billing off everyone is full. **Site pages and footer.** Every page ends with a footer (`public/footer.js`, one copy): Help & setup, Features, Pricing, FAQ, Privacy, Terms and Contact, served at `/help`, `/features`, `/pricing`, `/faq`, `/privacy`, `/terms`, `/contact` from plain HTML in `public/` styled by `pages.css`. Pricing shows Free (30 days, no card), Individual $6.99 a month or $59.99 a year, and a school licence; while billing is off the page says every account is free. The Contact page shows the address in the `CONTACT_EMAIL` environment variable, or a holding note until one is set. **One screen on the student device.** Drawing pads (Sketch, Annotate, Letter Formation) size themselves to the space above the Send button, so pad, tools and Send are always on one screen with no scrolling; Letter Formation lays its cards in one row or two, whichever makes them bigger. Launching a question or a slide takes the big join screen down on the classroom screen by itself. **Letter Formation replays.** The student pad records every stroke as a child traces (order, direction, timing, pen lifts, rubber), sends it with the picture, and the dashboard card gets **▶ Replay · N strokes**: a player draws the letter back at the child's own pace over a faint copy of their drawing, with a numbered red dot where each stroke began and a speed control. The server checks the record (120 strokes, 800 points each at most); a bad one is dropped and the picture still counts. Strokes live in the lesson only. On the classroom screen, tapping a Letter Formation picture plays the same movie big over a faint copy of the letter, "✍️ stroke 2 of 3", with a tap to watch again and ✕ Back to all the letters. The a, d, g and q cards use an oval bowl whose right side is the stem, as in the NSW Foundation sample. **Room tools are lesson steps too.** The activity picker has a 🧰 Room tools group: ⏱ Timer (length, optionally filling the classroom screen), 🎲 Random student, 👥 Random groups (groups of N or split into N) and 🎲 Question dice (six faces, or blank to use the ones typed under Room tools). Each is saved in the plan and runs the moment ▶ reaches it, exactly as it would on the spot: a question already up stays up underneath, and Live now says what the tool did with a Clear button. On the spot the tools keep their own section under the grid, so the tiles show only in the picker. **Slides as a PDF, with questions at the right moment.** On PDF slides the classroom screen has two corner buttons: ◀ Previous slide beside the code, and on the right a quiet “Next slide ▶” — which becomes a blue “Eyes Up: Word Cloud ▶” only when that question is the very next step, i.e. once the slide before it is up. Eyes Up owns every page of a PDF deck, so the timing is exact. **Questions between live slides.** In a lesson plan, an activity that follows a 🎞 live deck can carry *Ask after slide №*; the classroom screen's corner button then reads “After slide 5: Word Cloud ▶”, or plainly “No Eyes Up question next” (with “· more slides ▶” when another slide step follows) so the teacher knows nothing is waiting. While a question is up, the board's bar has a blue **🎞 Back to slides** button, also on the remote and in Live now: it returns to the slides exactly where they were and leaves the plan where it is, so ▶ moves on to the step after that question rather than offering it again (`back_to_slides`; the earlier answers stay in the lesson record). Stepping through a plan works like a tape recorder on the remote and the dashboard: **⏮ start again · ◀ previous (shows the step before again) · ▶ next · ⏭ skip**, with “Step n of m” beside them; the classroom screen has a **⛶ full screen** button (F toggles, Esc leaves) and slides or live decks fill the whole display with the room code in a corner. A student who closes the tab, locks the phone or reopens the browser walks straight back into the same seat (remembered on the device for four hours); typing or tapping the same first name again after a dropped connection reclaims the seat and its answers, and a seat opened on a second device tells the first screen to step aside.

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

**Export as PDF** (button on the summary, or `/report?code=XXXX` directly) opens a clean print-styled lesson report — headline stats, common words, and every interaction with its distributions and named answers (once, with ✓/✗ where the activity had a right answer) — and saves via the browser's print dialog ("Save as PDF").

**Lesson results** (📚 Past lessons → a lesson, or 📈 Data → click a lesson; `/data?lesson=ID`) is the one place for a stored lesson: **✨ Snapshot** (plain-English takeaways, who got more wrong than right, visuals), **👥 By student** (one row per student — answered, right — click a name for every answer they gave, printable on its own) and **📊 By activity** (every activity with named answers and marks, Question Sets as a grid). The export row offers 🖨 Print / PDF, 📊 Spreadsheet (CSV: one row per student, one column per activity, opens in Excel/Sheets), 🖼 Pictures (ZIP) and 🔗 Share link (view-only, names hidden). Students are counted by name, so a re-joined phone is one student; a question launched by mistake and launched again is folded away as an "empty re-launch"; untitled lessons are named after their first question and can be renamed with the ✎.

**Classes and tap-your-name joining** (Teach tab → 👥 Class): give a class a name and paste the students’ first names once. Pick the class on the Teach tab (remembered for next time) and the join page shows the names as big tiles with an animal and a colour — a child taps their own name, no typing; names already joined are marked, “My name isn’t here” falls back to typing, and “Not X? Switch student” on the waiting screen hands a shared iPad to the next child (the old seat is dropped). Each class has a fixed 5-letter class code and a printable QR sticker (✎ → 🔳 Print QR sticker, `/class-sticker?c=CODE`, one big or four small per A4): scanning it always opens that class’s live lesson, and before the teacher starts it waits and joins automatically. The 5-letter code can also be typed in the code box. The class name is saved with the lesson results.

**Picture Choice** (⚡ Fast votes): drop 2–8 pictures into the composer in one go (or drop several pictures anywhere on the dashboard), tap ✓ on the right one if there is one, add short captions if you like, and launch — students tap a picture. It runs as a Multiple Choice with a picture per option, so results, marking and plans work as they already do. **Picture answers**: Multiple Choice, Poll, This or That, Put in Order, Ranking and Match Up take a picture per option (the 🖼 beside each option box; click again to remove). Students see big picture tiles to tap (two per row), pictures beside the steps to order, or the picture next to each term to match; the classroom screen shows the picture beside each bar, rank and pair. A picture can stand alone — it gets the label “Picture 1” so results stay readable — but a short word beside it is better. Pictures are shrunk on the teacher’s computer (480 px) and saved in the lesson plan, so a picture quiz is reusable.

**Letter Formation** (🎨 Draw & images → ✍️ Letter Formation): type up to 8 letters or numbers (a, Aa, 3, sat) and every student pad shows them as NSW Foundation Style tracing cards on writing lines — generated by `tools/make-trace-cards.js` from stroke definitions (starting points, stroke order and a separate stroke for every pencil lift, 6° forward slope, short letters between the dotted line and the baseline, tall letters to the top line, tails below) (the teacher picks lowercase, UPPERCASE or both, and dots-with-arrows-and-numbers or dots only; numbers are drawn dotted on writing lines); children trace over them with a fat crayon-style pen and send; the classroom screen shows every attempt in the usual drawing gallery (tap one to make it big) and the attempts are kept with the lesson like any other drawing, guide lines included, so they print for portfolios.

**Marking after the lesson**: on 📊 By activity, each activity has a ✎ panel. Multiple choice / true-false / this-or-that: tap the option that was right. Short answers, working out, counters, captions: type what counts as right (commas separate alternatives; case, spaces and punctuation are ignored). Question Sets: one box per question. Anything else, or any single student: tap ✓ / ✗ beside the name to mark by hand (a hand mark beats the key; tap the lit one to undo). The server re-marks the stored answers and every view follows — Snapshot, By student, By activity, Print / PDF, Spreadsheet and shared links — with a small "marked after the lesson" note. Works on lessons saved before this existed, because the answer text is stored.

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

**Owner admin**: the owner's account (`is_admin` on the `teachers` table) gets **☰ Menu → 🛠 Owner admin** (`/admin`): every teacher account with lessons taught, students reached and last activity; a CSV download; and per-account *Manage* — change plan (free / trial / school licence / subscriber, with an end date), add an email and a private note, give a new password (shown once), or switch the account off and on. Every teacher also has **☰ Menu → 👤 My account** to set their email and change their own password.

**Subscriptions for individual teachers (optional, Stripe)**: dormant until these are set on Render — until then every account has full access and nobody is charged.

| Variable | What it is |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` while testing, `sk_live_…` to sell) |
| `STRIPE_PRICE_MONTHLY` | Price ID (`price_…`) of the monthly subscription created in Stripe |
| `STRIPE_PRICE_YEARLY` | *(optional)* Price ID of a yearly option |
| `STRIPE_WEBHOOK_SECRET` | Signing secret (`whsec_…`) of a Stripe webhook pointing at `https://<site>/api/stripe/webhook`, sending `checkout.session.completed` and `customer.subscription.created/updated/deleted` |
| `TRIAL_DAYS` | *(optional)* free-trial length for new accounts, default 30 |
| `OPEN_SIGNUP` | *(optional)* `1`/`0` to force sign-up open or invite-only; by default it opens when billing is on |
| `AUTH_SECRET` | *(recommended before selling)* a long random string that signs sign-ins, so the invite code is no longer also the signing key. Setting it signs everyone out once. |
| `PUBLIC_URL` | *(optional)* site address used for Stripe return links |

With billing on: new accounts start a trial; accounts that existed before stay on **free access** until the owner changes them; when a trial or subscription lapses the teacher can still sign in and open/export their data but cannot start a new class (a class already running is never interrupted); a late card gets 3 days' grace. Prices are read from Stripe, so they are changed there. Card details never touch this server — checkout and "manage subscription" are Stripe-hosted pages. School licences are recorded by the owner in the admin page (plan *School licence* + end date) and invoiced outside the app.

**AI summaries (optional)**: set `ANTHROPIC_API_KEY` on Render and the data section's ✨ *Visualise this lesson* snapshot gains a **Summarise the written answers** button — common threads, misconceptions and follow-ups across every short/long answer in the lesson. Only the answer texts are sent (never student names); the result is saved with the lesson so it's free to re-open. `AI_MODEL` overrides the model (default `claude-sonnet-5`). Without the key the feature stays hidden.

A server restart (a deploy, or the host recycling the process) is no longer a lost lesson: the dashboard asks for its room back by code, the room is rebuilt with the same code and the same lesson record (earlier answers stay in it), the classroom screen keeps showing the board and reconnects on its own, and students’ screens show “Reconnecting to your class…” and rejoin their seats by themselves. The classroom screen’s bar also has **⬇ download this question** — pictures as a ZIP for drawing and photo activities, a spreadsheet for everything else — so a teacher can keep a record mid-lesson without leaving the board. Images are kept for **60 days** by default (`IMAGE_KEEP_DAYS` on Render changes this) and then pruned, to keep the free database within its limits. Everything else about the lesson stays forever.

## Lesson plans (plan ahead, teach again and again)

The dashboard opens on **📝 Lesson plans**: every saved lesson as a card with **▶ Teach**, **✎ Edit**, copy and delete. No live class is needed to plan.

- **Editor** — name the lesson, then **＋ Add an activity**: choose the activity type, type the question, add. Steps can be edited (the form comes back filled in), reordered with ↑ ↓, duplicated or deleted, and a pasted ChatGPT quiz lands at the end. It saves itself as you work.
- **Teach** — pressing ▶ Teach opens the lesson in **🎤 Teach** as a strip across the top: every step as a chip, and one big **▶ Start the lesson / ▶ Launch step N** button showing what's next. Tap any chip to jump to that step. The activity grid folds away behind "Ask something on the spot".
- **Changes in class** — adding a question on the spot marks the lesson "changed during class" with a **💾 Save changes to plan** button. A lesson built on the spot can be kept with **💾 Save as a lesson plan**.
- **Back-to-back classes** — **🆕 Next class** keeps the same lesson loaded, restarted at step 1, with a fresh class code.
- **Phone remote** — the **📝 Lessons** tab lists your plans with ▶ Teach and runs the open lesson step by step. Plans are created and edited on a computer.

Plans are stored per teacher in the `lesson_plans` table (steps as JSON, pictures included) and count how often and how recently each was taught.

## Several pictures per answer

**Drop an Image**, **Image + Writing** and **Image + Long Answer** let each student send up to **6 pictures** in one answer (drag several in, choose several, or add them one at a time; each has a ✕ to remove). Image + Long Answer pairs the pictures with a full written answer of up to 3,000 characters. **✋ Answers each** (Lesson settings → Students) caps how many answers a student may send in the activities that take several — Word Cloud, Mind Map, Post-its, Venn, Plus & Minus: Unlimited (up to 12), One response, or a number you choose; one-answer activities are unaffected. The same control sits on the classroom screen’s bar (a drop-down) and on the remote (∞ · 1 · 2 · 3 · 5 buttons); a change applies at once, even to the activity that is live, and never disturbs what a student is typing. A sent answer is final by default: the student sees “Response received” with no way back, and the server ignores a second answer. **🔁 Change answers** (dashboard header, or the remote) switches “Change my answer” on for the room; Venn, Post-its, Plus/Minus and link boards always take more items. A photo that is slow to send tells the child so (“Sending…”, then “Still sending — stay on this page”) and offers a retry if nothing comes back. Photos are shrunk on the student’s own device to 1280 px on the long edge before they are sent (a quarter of a print-size photo), so a whole class can send at once over school Wi‑Fi; the server keeps each room’s photos as raw bytes with a fixed budget per room and per server, and a student whose photo is refused sees why and stays in the class.

- The projector shows one card per student: the first picture large, the rest as thumbnails. Tapping any thumbnail puts that exact picture on the big screen, with the student's writing underneath.
- The dashboard and phone remote show every picture; click one to spotlight it.
- Downloads name them `Ava Nguyen 1.jpg`, `Ava Nguyen 2.jpg`…, with the writing once in `captions.txt`.
- In the archive (`lesson_images`), each picture is its own row numbered by `img_index`; a changed answer replaces the student's earlier pictures, including any extras.
