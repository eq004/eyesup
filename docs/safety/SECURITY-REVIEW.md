# Eyes Up — Security review

**Reviewed:** 4 November 2026, code at commit `0d0cfb0` (branch `main`).
**Written for:** the owner (a teacher, not an engineer). Everything here is in plain English. Where a file is named, it is so a developer can find the spot quickly; you do not need to open it.
**What this is:** a description of how each part of Eyes Up works *today* and where each could be misused. It changes no code. The recommended fixes, ranked, are in `FIX-LIST.md`.

Eyes Up is used live with children aged 5 to 18. The two things that matter most are: (1) a child's name, answers and photos must only be seen by their own teacher, and (2) nothing a stranger or a mischievous student does should be able to disrupt a lesson or put something on the classroom screen.

## The short version

Overall the code is careful. Student answers are cleaned before they are stored, teachers' passwords are hashed properly, the Stripe webhook checks its signature, no secrets are in the code, and the dependency audit found **no known vulnerabilities** in the Node packages. The server adds sensible security headers.

There are, however, a handful of gaps that matter in a school setting. In order of seriousness:

1. **Anyone who knows the 4-letter room code can download every answer and every photo from that lesson, with names.** The classroom screen (projector) needs no password, and the server hands every projector connection a "download token" for that room. Every student knows the room code, because it is on the board. A student could open `/projector?code=XXXX` on their own phone and use that token to download the class's answers as a spreadsheet and all photos as a ZIP, during the lesson and for up to six hours after it starts.
2. **Anyone with the room code can press the projector's buttons.** The projector is allowed to send a small set of commands: show or hide results, reveal a random answer, switch names on, pick a random student, start or stop the timer, and move to the *next* step of the lesson plan. A student on their phone can do all of these.
3. **Photos and drawings go onto the big screen the moment a child sends them, unless the teacher has turned "Hold answers" on.** The README says written answers "arrive privately"; the current code puts every answer up straight away and lets the teacher take things *down*. For drawing and photo activities with young children, this means an inappropriate picture would be on the board before the teacher sees it.
4. **A child can take over a classmate's seat.** Rejoining by typing the same first name (when the other child's device has gone quiet), or by sending a classmate's seat number (they are `s1`, `s2`, `s3`… in order), kicks the other child off and lets the first child answer as them.
5. **The "names hidden" share link still contains the class name list.** The public share page strips each student's individual answers, but the lesson JSON it serves still includes the roster (the list of first names who joined), the class name, the teacher's name and, for music activities, the composer's name against each tune.
6. **The class roster is public to anyone who guesses a 5-letter class code.** The join page asks the server "who is in this class?" with no sign-in and no rate limit; the answer includes every child's first name and the class name, even when no lesson is running.
7. **The slide-import library (pdf.js 3.11.174) has a known weakness** (CVE-2024-4367, fixed in version 4.2.67): a specially crafted PDF can run script inside the teacher dashboard. Only a PDF the teacher chooses to import can trigger it, so the risk is "a teacher is tricked into importing a bad file", but the dashboard holds the teacher's sign-in token, so it is worth updating.
8. **Teacher sign-in tokens never expire and are placed in web addresses** for downloads and reports. They end up in browser history and in Render's request logs. On a shared staffroom computer, "Sign out" removes the token but not the dashboard's local backup of the last ten lessons (names and answers included).

None of these need a redesign. Most are a few lines each. See `FIX-LIST.md`.

---

## 1. Teacher logins

### How it works today

Eyes Up has two modes, chosen by whether the `DATABASE_URL` setting exists on Render:

- **Account mode (the live site):** each teacher has an account in the `teachers` table in Supabase. They sign up with a name and a password; the sign-in name is made from their name ("Sarah Jones" becomes `sarah.jones`). Passwords are hashed with bcrypt (cost 10) before being stored. Nobody, including the owner, can read a password back.
- **Password mode (local testing only):** one shared password from the `TEACHER_PASSWORD` setting gates the dashboard. This is not used on the live site once a database is connected, but the same setting is reused there as the *invite code* (below).

Signing up (`/api/signup`):
- Needs a name (at least 3 characters once cleaned), a password of **at least 6 characters** and optionally an email.
- Needs the **invite code** only if open sign-up is off *and* `TEACHER_PASSWORD` is set. If `TEACHER_PASSWORD` is blank, anyone can create an account.
- Rate limit: 60 sign-ups per hour per IP address.

Signing in (`/api/login`):
- Accepts the sign-in name, the display name, or the email on the account, plus the password.
- Rate limit: 80 attempts per 15 minutes **per IP address**. There is no limit per *account*.
- A switched-off account cannot sign in.

Password changes: a teacher can change their own password under My account (needs the current password; 10 attempts per 15 minutes per IP). There is **no "forgot password" by email**. The owner gives out a new temporary password from the admin page (see section 7).

### Where it could be abused

- **Weak passwords are allowed.** Six characters, no other rules. Teachers will choose `school1` or the school name. Combined with the per-IP (not per-account) limit, an attacker outside the school can try 80 guesses every 15 minutes per IP address they control, forever, against one teacher. There is no lockout and no notification to the teacher.
- **The per-IP limit can lock out a whole school.** A large secondary school has 100+ teachers behind one IP address. If they all sign in between 8:45 and 9:00, the 80-per-15-minute login limit can be reached by honest use, and everyone after that sees "slow down" for a while. Students are not affected (they never log in), but a teacher locked out at 9am is a lesson lost. The limit is keyed on `req.ip`, which Render sets from the real client address.
- **Open sign-up by accident.** If `TEACHER_PASSWORD` is ever cleared on Render while `OPEN_SIGNUP` is unset and billing is off, sign-up silently becomes public. The admin page shows this as "Public sign-up: Anyone can create an account", so it is visible, but only if you look.
- **The invite code is shared widely and lives in browsers.** Every signed-in teacher can fetch the invite code (`/api/invite`) and the invite link stores it in the colleague's browser (`localStorage`, key `eyesup_invite`) indefinitely. Once it is out, it is out; rotating it means changing the Render setting.
- **No password reset by email** means the owner is the reset desk for every teacher, and the temporary passwords are from a tiny space (12 words × 12 words × 900 numbers, about 130,000 combinations) and are not forced to be changed on first use.
- **Display-name sign-in.** Signing in with the plain display name is convenient, but it means knowing a colleague's name is enough to know their sign-in name; only the password protects the account.

### What is already good

bcrypt hashing; no plaintext passwords anywhere; constant-time comparison of tokens; failed logins give the same error whether the name or the password was wrong.

---

## 2. Teacher tokens (how a signed-in teacher stays signed in)

### How it works today

When a teacher signs in, the server returns a **token** that looks like `12.ab34…` : the teacher's account number, a dot, and a signature. The signature is an HMAC (a keyed hash) over the account number and the teacher's current *password hash*, using a server secret. There is no database of tokens; the server re-computes the signature on every request.

The secret is, in order of preference: the `AUTH_SECRET` setting; else the `TEACHER_PASSWORD` setting; else the built-in string `eyesup-local-secret`.

Consequences:
- A token **never expires**. It stops working only when the teacher's password changes (which changes the hash) or the account is switched off.
- The token is kept in the browser's `localStorage` (key `eyesup_token`) on the dashboard, the phone remote, the data page and the admin page. It is sent in the JSON body of most requests, and **in the web address** (`?t=…`) for anything that is a link rather than a button: PDF reports, picture ZIPs, individual stored pictures, slide images, past-lesson links from the phone remote.
- Pairing a phone: the dashboard mints a one-time, 10-minute code and puts it in the remote's QR; the phone swaps it for a full token. Good design: the token itself is never in the QR.

### Where it could be abused

- **Tokens in web addresses leak.** Anything in the address bar ends up in browser history, in Render's HTTP access logs, in screenshots, in bookmarks, and in "copy link" emails. A token copied from one of those links is a permanent sign-in as that teacher until they change their password. The `Referrer-Policy` header stops it leaking to other sites via the Referer header, which is good, but history and logs remain.
- **Shared computers.** Classroom and staffroom PCs are shared. The token persists until "Sign out" is pressed. If a teacher forgets, the next person at that PC is them.
- **No way to sign out everywhere except by changing the password.** A lost phone that was paired keeps working.
- **The signing secret may be the invite code.** If `AUTH_SECRET` is not set on Render, the invite code (which every teacher can see) is also the token-signing key. Forging a token still needs the victim's password hash, which an attacker should not have, so this is not an immediate break, but it removes a layer of defence. The admin page flags this as "Separate sign-in secret: Not set yet".
- **Token readable by any script on the page.** Because it is in `localStorage`, any cross-site-scripting (XSS) bug would be able to steal it. The code escapes student text consistently (I checked the dashboard, projector, remote, data and report pages and found no unescaped student text), and there is no Content-Security-Policy header to act as a second line of defence. The pdf.js issue in section 5 is the one known route to running script in the dashboard.

---

## 3. Room codes and class codes

### How it works today

- A **room code** is 4 characters from a 31-character alphabet (no 0/O/1/I lookalikes), about 920,000 combinations, picked with `Math.random`. It is created when a teacher opens the dashboard and shown on the board and in the QR. The room lives in server memory for **6 hours from creation**, whether or not the lesson has finished.
- A **class code** is 5 letters from a 24-letter alphabet (about 8 million combinations), picked with a cryptographic random generator, stored permanently against a class in the `classes` table. It goes on a printable sticker and joins students to whatever lesson that class is currently running.

What the room code unlocks, with no password:
1. **Joining as a student** (section 4).
2. **Opening the classroom screen** (`/projector?code=…`): shows the live question, counts, and every revealed answer; shows names when the names switch is on.
3. **Projector controls:** the projector connection may send `pick_student`, `clear_focus`, `timer_start/pause/resume/clear`, `toggle_hold`, `set_answer_limit`, `show_results`, `hide_results`, `reveal_random`, `clear_peek`, `next`, `seq_prev`, `toggle_names`, `spotlight_response` and `timer_big`. These exist so a teacher can tap an interactive whiteboard. They work from any device that joined as a projector.
4. **A download token.** Every state message to a projector includes `dl`, a token derived from the room code alone. With it, `/api/question/CODE/N.csv?pt=…` returns that question's answers **with student names** as a spreadsheet, and `/api/images/CODE?pt=…` returns **every picture from the lesson** as a ZIP. This is what powers the "⬇ download this question" button on the board.
5. **Live student photos** at `/api/resp-image/CODE/question/seat/index` are served to anyone, no token at all. Seat numbers are `s1`, `s2`… and question numbers are `1`, `2`… so they are trivially guessable once you have the code. These are cached by browsers for a day.
6. **Teacher-uploaded pictures** (annotate images, picture-vote options) at `/api/image/CODE/id`, likewise public.
7. **The class list.** `/api/join-info?code=…` returns the class name, the full roster of first names, and who has joined so far. For a 5-letter class code it answers from the database even when no lesson is live.

### Where it could be abused

- **Students downloading the class's answers and photos.** This is the most serious finding. Every child has the room code. One child opens the projector page on their phone (or just types the address), reads the download token from the connection (easy for a 15-year-old with browser developer tools; or simply presses the board's own download button if they can reach the whiteboard), and gets a spreadsheet of everyone's answers with names, and a ZIP of everyone's photos. Photos in "Drop an Image" lessons are often of the children or their homes.
- **Students disrupting the lesson from their phones.** `next` advances the plan; `show_results` reveals answers the teacher was holding back; `toggle_names` puts names on the board for an activity the teacher wanted anonymous (anonymous modes themselves are protected and never show names); `reveal_random` picks a child's answer for the screen; `timer_start` with `big` fills the board with a countdown. The projector was designed for an interactive whiteboard, so this is a design gap, not a bug.
- **Guessing room codes from outside.** 920,000 codes is small by computer standards. The WebSocket join is rate-limited (30 joins a minute per connection, 3,000 per 10 minutes per IP), but the HTTP routes `/api/join-info`, `/api/resp-image`, `/api/image` and `/projector` are **not rate-limited at all**. An outsider could scan codes against `/api/join-info` and find every live room in the country in minutes, then open their projectors. Codes are only live for a few hours, which limits the damage, but a school's roster (first names) can be read for any class code, forever.
- **Guessing class codes** is ~10× harder but still feasible without a rate limit, and the prize (a stable roster of children's first names, with the class name, which often includes a year group) is permanent.
- **Room codes outlive the lesson.** A session is only removed 6 hours after it was *created*, not when the teacher finishes. "Finish & summarise" marks it ended (students can no longer join), but the projector can still connect and the download token still works, so answers and photos are reachable for the rest of the school day.
- **Preview student.** The dashboard's "Student view" joins as "👁 Preview"; this name is filtered out of counts and exports. A real student could type the name "👁 Preview" and be invisible to the roster and exports; harmless but worth knowing.

### What is already good

Payloads a student sends are strictly cleaned (lengths capped, options checked against the question, numbers range-checked). A student can only answer the *current* question, and only once unless the teacher allows changes. Students never receive other students' answers or the answer key: spelling words, cloze answers and the correct option are kept server-side until revealed.

---

## 4. Student joins

### How it works today

Students have no accounts. They go to `/join`, type a 4-letter room code (or 5-letter class code, or scan a QR) and a first name (up to 24 characters), or tap their name from the class list. The server gives them a seat number (`s` plus a counter that increases across the whole server) and remembers the name.

Reconnecting:
- The device remembers the seat (`sessionStorage`, and `localStorage` for 4 hours) and sends it back after a refresh or a locked phone.
- If the seat number is unknown but a seat with the **same first name** has no live connection, the server gives them that seat and its answers.
- If a seat is reclaimed while another device still holds it, the other device is told "replaced" and disconnected.
- A shared iPad can "Switch student"; the old seat is dropped.

Rate limits: 30 joins a minute per connection; 3,000 joins per 10 minutes per IP. Every refused join is logged with the reason, the code and the IP.

### Where it could be abused

- **Impersonating a classmate by name.** If Ava's iPad goes to sleep, Ben can type "Ava" on his phone and get Ava's seat, see what Ava has already submitted (the "Response received" state) and answer the next question as Ava. Ava's iPad, on waking, is told it has been replaced. With young children this is more likely mischief than malice, but it corrupts the record the teacher later marks.
- **Impersonating by seat number.** Seat numbers are sequential and guessable. A student can send `{studentId:"s7"}` with any name and take seat 7. No secret is attached to a seat.
- **Two children with the same first name** share a seat if the first goes quiet; the code tries to avoid this (it only matches an idle seat) but cannot tell them apart.
- **Join-storm limits.** 3,000 joins per 10 minutes per IP is generous and should hold for a school; but note that the WebSocket IP is taken from the *last* address in `X-Forwarded-For`, which on Render is the real client, so a whole school counts as one. A reconnect storm (Wi-Fi drops for the whole building; 600 devices each retrying every few seconds) could reach it, after which students see "Lots of people are joining at once". This is the right failure mode (a brief pause, not a crash) but worth knowing.
- **Names are not moderated.** A child can join as anything 24 characters long; it appears on the board when names are on, in random-student spotlights and in group cards. The teacher can see the roster and there is no rename or kick button for a single student (the only remedy is a new lesson code).

### What is already good

Text is escaped everywhere it is displayed. The server never trusts the client's idea of which question it is answering. Anonymous modes stay anonymous even to the teacher's own dashboard.

---

## 5. Photo uploads and drawings

### How it works today

Three activities take photos (Drop an Image, Image + Writing, Image + Long Answer), up to **6 per student**. Five produce drawings (Sketch, Letter Formation, Annotate, Maths Board, Counters + Drawing).

On the child's device:
- Photos are drawn onto a canvas and **shrunk to 1,280 px on the long edge, then re-encoded as JPEG** before sending. A side effect worth stating plainly: this strips the photo's metadata (EXIF), including GPS location, so a photo taken on a child's phone does not carry the home address into the database.
- Drawings are the canvas contents as PNG/JPEG.

On the server:
- Checks: must be a `data:image/png` or `data:image/jpeg` URL; each at most ~2.6 MB of text (about 1.9 MB of image); total at most 14 MB per answer; at most 6 images. A room may hold 64 MB of photos in memory and the whole server 192 MB; beyond that the child sees "the room is full of photos" and keeps their seat.
- Photos are kept as raw bytes in memory and every screen is sent a *link* (`/api/resp-image/…`) rather than the bytes. Drawings travel inline in the state message to the teacher and projector.
- **Every picture is also written to the database immediately** (`lesson_images` table: lesson, question, seat, **student name**, the bytes, any caption), and deleted automatically after **60 days** (`IMAGE_KEEP_DAYS`, minimum 7).
- Teacher-uploaded pictures (for Annotate, Picture Prompt, Picture Vote, Picture Choice, Match Up) are shrunk on the teacher's computer (1,000 px or 480 px) and kept in the room for the lesson; pictures in saved lesson plans are stored in the `lesson_plans` table as part of the plan.
- Slide decks imported from PDF are rendered to JPEG on the teacher's computer by the bundled pdf.js and uploaded one page at a time (max 120 pages, ~3 MB each) to the `slide_decks`/`slide_images` tables. Served only to the owning teacher or to screens of a class that teacher is running.

What appears on the board:
- A new answer is marked **revealed as soon as it arrives**. For every activity type (including drawings and photos) the board shows results immediately **unless** the room's **"Hold answers"** switch is on (or the activity is a test type: multiple choice, spelling, cloze, working out, counters). The teacher's controls take things down: hide results, un-reveal one answer, spotlight.

### Where it could be abused

- **Harmful content reaches the big screen first.** With "Hold answers" off (the default), a rude drawing or an inappropriate photo is on the projector the instant a child presses Send. The teacher can hide it within a second, but the class has seen it. For activities with young children or any photo activity, this default is the wrong way round.
- **Pictures are reachable without sign-in during the lesson** (section 3, item 5), and the whole set is downloadable with the room code (section 3, item 4).
- **No content checks.** There is no scanning of images for nudity, violence or other harm. For a classroom tool with a teacher present this is acceptable *if* the teacher sees everything before the class does; see the previous point.
- **Storage limits are memory limits, not checks on content.** A class could fill the 64 MB room budget on purpose; the effect is that later photos are refused with a clear message. The server itself is protected (the 192 MB global cap exists because a real class of photos once pushed the process over its 512 MB memory limit on 3 November 2026 and it restarted).
- **Student names are stored next to every picture** in the database. Anyone with database access (Supabase dashboard, a leaked connection string) can match a face to a first name and a class.
- **pdf.js 3.11.174** (bundled in `public/vendor/pdfjs/`, from 2023) has a published vulnerability, CVE-2024-4367: a PDF with a malicious font can run JavaScript in the page that renders it. Here that page is the teacher dashboard, which holds the teacher's token and can make any request the teacher can. The attack needs a teacher to import a crafted PDF as slides, so it is not remote, but PDFs are routinely shared between teachers and downloaded from the internet. Updating to pdf.js 4.2.67 or later closes it; the library is free.

### What is already good

Size caps at every layer; images re-encoded on the device (strips metadata and neutralises image-format tricks); strict `data:image/...` checks; the server never writes uploads to disk; per-room and global memory budgets with a clear student-facing message.

---

## 6. Downloads, reports and share links

### How it works today

Live lesson (in memory), per room:
- `/api/summary/CODE`, `/api/question/CODE/N.csv`, `/api/images/CODE[/N]`: allowed if (a) the request carries the room's board token `pt`, or (b) the caller is the signed-in teacher who owns the room, or (c) in password mode, the shared password. These are what the Export as PDF, spreadsheet and ZIP buttons use.

Archived lessons (database), per lesson id:
- `/api/lessons` (list), `/api/lessons/ID` (full summary), `/api/lesson-image/ID`, `/api/lessons/ID/images[/N]` (ZIP): only the owning teacher, **or any teacher for lessons with no owner** (lessons saved before accounts existed have `teacher_id` NULL).
- `/api/lessons/ID/edit`: rename, re-word prompts, add marks after the lesson. Same ownership rule.
- `/api/lessons/ID/ai-summary`: sends the written answers (never names) to Anthropic's API and stores the result in the lesson. Only when `ANTHROPIC_API_KEY` is set.
- **There is no way to delete a stored lesson** from the app. Lesson plans and classes can be deleted; lesson *results* (names, answers) cannot.

Share links:
- A teacher presses "Share link"; the server generates a 12-character random key (72 bits, not guessable) and stores it on the lesson. `/insights?share=KEY` then serves the lesson to anyone with the link, with each activity's per-student rows removed.
- The key **never expires** and there is no button to revoke it; the only way is to clear it in the database.

The teacher's browser also keeps a rolling **autosave of the last 10 lessons** (`localStorage`, key `eyesup_archive`), including every student name and answer, so the report page can recover a lesson if the server restarts. It is not cleared on sign-out.

### Where it could be abused

- **The board token (`pt`) is a skeleton key for the room** and is handed to every projector connection (section 3). Downloads of names + answers + photos are therefore available to anyone with the room code.
- **Share links leak more than intended.** The public response removes `students` and `noResponse` from each activity but leaves: the lesson `roster` (first names of everyone who joined), `classRoster` and `className` (often "Year 3 Blue"), `teacherName`, each tune's `name` in Make a Tune activities, and the `manual` marks object whose keys are student names. So a parent, a blog reader or anyone forwarded the link can see which children are in the class and which teacher taught it. The page's own text says "names are hidden on the shared page".
- **Share links are forever.** A link pasted into a school newsletter in 2026 still works in 2030.
- **Legacy lessons are visible to every teacher.** Any lesson row with no owner is listed for, viewable by, editable by and shareable by every account. If there are such rows in the live database they should be assigned or deleted.
- **Autosave on shared computers.** A teacher who signs out on a shared PC leaves the last ten lessons' names and answers readable in the browser's storage (developer tools, or simply the report page's recovery path).
- **No deletion route** makes it impossible for a teacher to honour a parent's "please delete my child's data" request without the owner running SQL in Supabase.
- **AI summaries send student writing off-site.** Only answer text, never names, but children write their own and classmates' names into answers. This should be disclosed (see `STUDENT-DATA.md`) and is fine to keep as an opt-in button.

---

## 7. The owner admin page

### How it works today

- An account is an owner if `is_admin` is true in the `teachers` table. The first owner is set by hand in Supabase. The server also accepts a "make owner" action from any owner (the admin page does not show a button for it yet, but anyone holding an owner token can send it).
- `/admin` shows every account (name, sign-in name, email, plan, lessons taught, students reached, last activity, private note), the live class count, whether Stripe/AI/the separate secret are configured, and a CSV download of all accounts.
- Per account an owner can: save email and note; change plan and end date; **give a new password** (a temporary word-word-number password, shown once); **switch the account off** (signs it out everywhere) and back on; make or un-make another owner. An owner cannot switch themselves off or un-owner themselves.
- Every action is checked server-side for a valid owner token; the page just renders.

### Where it could be abused

- **The owner account is the crown jewels and has only a password.** No second factor, no login alerts, no audit log of admin actions. If the owner's password or token (section 2) is taken, the attacker can read every teacher's name and email, reset any password, make themselves an owner and switch off accounts. A 6-character password is allowed for the owner too.
- **Owners can create owners.** The server accepts `set_admin` from any owner token, so a compromised owner account can mint another owner, which survives the original being fixed.
- **Temporary passwords are weak and not forced to change.** About 130,000 possibilities and the server does not require a change at first login; combined with no per-account login limit, a temp password that is read out in a busy staffroom is guessable within the day by someone who heard the pattern.
- **The admin CSV contains teacher emails.** Treat the download as personal data.
- **Admin reads happen on the same token as everything else**, so a leaked token from a report URL (section 2) is also an admin token if the owner generated it.

### What is already good

Clear server-side checks; cannot lock yourself out; actions are small and explicit; the page is `noindex`.

---

## 8. The Stripe webhook and billing

### How it works today

Billing is **dormant** until `STRIPE_SECRET_KEY` and `STRIPE_PRICE_MONTHLY` are set. Until then every account has full access and nothing in this section is reachable.

When on:
- Checkout and "manage subscription" open Stripe-hosted pages; card details never touch Eyes Up.
- Stripe tells Eyes Up what happened by calling `/api/stripe/webhook`. The server reads the raw body, checks the `Stripe-Signature` header (HMAC-SHA256 with `STRIPE_WEBHOOK_SECRET`, constant-time comparison, 5-minute timestamp window) and only then updates the teacher's plan and paid-until date. It finds the teacher by the id Eyes Up put in the checkout metadata, or by the Stripe customer/subscription ids it already stored.
- A failed update returns 500 so Stripe retries.
- Return links after checkout use `PUBLIC_URL` if set, otherwise the request's Host header.

### Where it could be abused

- **Replays within 5 minutes are accepted** (no record of processed event ids). The handler is idempotent (it writes the same values again), so this is harmless today, but a future handler that, say, extends a date by a month would be replayable. Worth a note, not a fix now.
- **Host-header return links.** If `PUBLIC_URL` is unset, the checkout success/cancel links are built from the Host header. On Render the header is the real site address, and the request comes from the teacher's own browser, so this is low risk, but setting `PUBLIC_URL` before going live removes the question.
- **Keys live only in Render's environment.** Correct. There is nothing to leak in the repository.
- **If the webhook secret is missing** the endpoint answers 404 and subscriptions silently never activate; the admin page shows "Payment updates from Stripe: Not connected yet".

### What is already good

This is textbook: raw body, signature check, time window, constant-time compare, Stripe-hosted pages, metadata binding to the teacher id.

---

## 9. Cross-cutting notes

### Rate limits and the one-IP-per-school problem

All limits are per IP address or per connection; a school typically presents **one** public IP for every teacher and every student device. The code already comments on this and chooses generous numbers. For the record:

| Door | Limit | Who it could lock out |
| --- | --- | --- |
| Teacher sign-in | 80 / 15 min / IP | A big staffroom at 8:50am |
| Sign-up | 60 / hour / IP | Only a whole-staff onboarding session |
| Change own password | 10 / 15 min / IP | Several teachers changing passwords at once |
| Create a room (WebSocket) | 20 / min / connection, 300 / 10 min / IP | Nobody realistic |
| Student join (WebSocket) | 30 / min / connection, 3,000 / 10 min / IP | A whole-school Wi-Fi outage causing a reconnect storm |
| Everything over plain HTTP (`/api/join-info`, pictures, projector, downloads, shared links) | **none** | Nobody, but nothing slows an attacker either |

Any tightening of the login limit should be **per account**, never per IP, so that one teacher's typos cannot lock out the school.

### Headers and transport

Set: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera allowed, microphone/geolocation/payment denied), `Strict-Transport-Security` for 180 days, `X-Powered-By` removed. Missing: a `Content-Security-Policy`. Render terminates HTTPS; the app trusts one proxy hop, which is right for Render.

### Database connection

The Postgres connection uses TLS but with `rejectUnauthorized: false`, meaning the server does not check that it is really talking to Supabase. Someone able to interfere with Render's outbound traffic could impersonate the database. Low likelihood, easy fix (use Supabase's CA certificate).

### Secrets

No secrets are in the repository or its history (one commit; grep for Stripe, Postgres and API-key patterns found only the README's placeholders). All configuration is in Render environment variables. `.gitignore` excludes `node_modules`, `server.log` and `.DS_Store`.

### Logging

Server logs (visible in Render) contain: refused joins (reason, code, IP), database retry warnings, persist failures, Stripe failures with the event type, AI-summary error messages, image prune counts, and room revivals with the teacher's account id. They do **not** contain student names, answers or tokens. Render keeps logs for a limited time on the free plan.

### Dependencies

`npm audit` on 4 November 2026: **0 vulnerabilities** (0 critical, 0 high, 0 moderate, 0 low) across 85 production packages. Direct dependencies: `express` 4.22.3, `ws` 8.21.3, `pg` 8.23.0, `bcryptjs` 3.0.3, `qrcode-generator` 2.0.4. Vendored (not audited by npm): `pdf.js` 3.11.174 (see section 5) and a QR code library. No dev dependencies, no tests, no CI. Express 4 is in maintenance mode (Express 5 is current) but still receives security fixes.

### Things that are fine and I checked

- Student and teacher text is HTML-escaped on every page that renders it (dashboard, remote, projector, data, report, insights, admin). The one calculator feature that uses `Function()` restricts input to digits and arithmetic symbols first.
- Links students are sent to must be `http`/`https` with a real hostname; `javascript:` and friends are rejected. Live slide decks may only come from Google Slides, OneDrive/SharePoint and Canva, and are embedded with `referrerPolicy` set.
- The WebSocket message handler catches every error so a bad message cannot crash the server; JSON parsing failures are ignored; payload size is capped at 10 MB.
- Sessions survive a restart via the stored lesson (students and the board reconnect by themselves).
- The `/api/health` endpoint reveals only that storage and AI are on or off.
