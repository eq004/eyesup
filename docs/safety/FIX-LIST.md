# Eyes Up — Fix list

**Date:** 4 November 2026 · **Code reviewed:** commit `0d0cfb0`.
**This branch changes no behaviour.** Every item here is a recommendation for a separate change. Each has the risk in one sentence, a rough size, and a pointer for the developer.

Sizes: **tiny** = under an hour, often a setting · **small** = a few hours · **medium** = a day or two · **large** = a week or more.
"No code" means it is done in Render, Supabase or GitHub settings, not in the repository.

---

## Fix now (before the next school term, or before showing a school the privacy statement)

| # | Change | Risk today, in one sentence | Size | Where |
| --- | --- | --- | --- | --- |
| 1 | **Stop handing the room's download token to every projector connection.** Only a projector opened from the teacher's dashboard (via a one-time key the dashboard puts in the projector link, or the teacher's own token on the dashboard) should be able to download; drop the `dl` field from the projector state and check the key instead. | Any student who knows the 4-letter room code (they all do) can download the whole class's answers with names and every photo as a ZIP, for up to six hours. | small | `server.js` `projectorState` (`dl:`), `ownedSession` (`pt` check), `public/projector.js` download button |
| 2 | **Only let a trusted projector send controls.** Same key as #1: projector connections without it get the picture but cannot send `next`, `show_results`, `toggle_names`, `reveal_random`, timers or spotlights. Or add a Lesson-settings switch "Allow controls from the board" that is off by default. | A student can advance the lesson, reveal held-back answers, put names on the board and start a full-screen timer from their phone. | small | `server.js` `BOARD_ACTIONS` block in `handle()` |
| 3 | **Make live picture links unguessable and private.** Put a random 16-byte key in each `/api/resp-image/...` and `/api/image/...` address (store it with the image), send `Cache-Control: private`, and return 404 when the room has ended. | Photos students send are served to anyone who knows the room code and counts up `s1, s2, …`; browsers cache them for a day. | small | `server.js` `/api/resp-image`, `/api/image`, `respond` handler, `picUrls` |
| 4 | **Hold pictures and drawings until the teacher reveals them, by default.** Set `revealed: false` for drawing and photo activities on arrival (teacher presses "All up" or reveals one at a time), or make "Hold answers" start on for those activities. Update the README, which currently says written answers arrive privately (they do not). | An inappropriate drawing or photo is on the classroom screen the instant a child presses Send. | tiny | `server.js` `respond` handler (`revealed: true`), `newInteraction` `resultsVisible`; `README.md` |
| 5 | **Make share links really name-free, and revocable.** In `/api/shared/:key` also delete `roster`, `classRoster`, `className`, `teacherName`, each item's `manual`, and each tune's `name`. Add "Stop sharing" (clears `share_key`) to the data page. Consider a 90-day expiry. | A public link that says "names are hidden" still lists every child's first name, the class name and the teacher's name, forever. | small | `server.js` `/api/shared`, new `DELETE /api/lessons/:id/share`; `public/data.js` |
| 6 | **Stop giving out class lists to anyone.** `/api/join-info` should return the roster only while that class's lesson is live (the sticker still works then), never for a dormant class; rate-limit it generously per IP (for example 1,000 per 10 minutes) and per code (for example 100 per 10 minutes) so scanning codes is impractical while a school is never blocked. | Anyone can guess 5-letter codes and read a class's children's first names and class name, with no sign-in and no limit. | small | `server.js` `/api/join-info`, `limited()` |
| 7 | **Set `AUTH_SECRET` on Render** to a long random value (`openssl rand -hex 32`). Also set `PUBLIC_URL`. | The invite code every teacher can see is also the key that signs sign-in tokens; Stripe return links are built from the request's Host header. | tiny, **no code** | Render → Environment |
| 8 | **Turn on two-factor authentication** on the Render, Supabase and GitHub accounts, and on Stripe/Anthropic if used. | One phished password gives full control of the hosting, the database or the code. | tiny, **no code** | Each service's account settings |
| 9 | **Update the bundled pdf.js** from 3.11.174 to 4.2.67 or later (free; the new build is `pdf.mjs` + `pdf.worker.mjs`, so the loader in `teacher.js` changes slightly). | A crafted PDF imported as slides can run script inside the teacher dashboard, which holds the teacher's sign-in token (CVE-2024-4367). | small | `public/vendor/pdfjs/`, `public/teacher.js` `loadPdfJs()` |
| 10 | **Add "Delete this lesson" and "Delete this class" for teachers** (server routes that remove the `lessons` row, its `lesson_images` rows and its `share_key`; a confirm dialog on the data page and in Classes). | There is no way to delete a child's stored answers or photos without the owner editing the database by hand, so a parent's deletion request cannot be honoured by the teacher. | small | `server.js` (new `DELETE /api/lessons/:id`), `public/data.js`, `public/teacher.js` |
| 11 | **Deal with ownerless lessons.** In Supabase, assign `teacher_id` on any `lessons` rows where it is NULL (or delete them), then remove the `OR teacher_id IS NULL` clause from the lesson routes. | Any lesson saved before accounts existed is visible, editable and shareable by every teacher. | tiny | Supabase Table Editor; `server.js` (five queries) |

## Fix soon (this term)

| # | Change | Risk today, in one sentence | Size | Where |
| --- | --- | --- | --- | --- |
| 12 | **Give each seat a secret.** On `student_join`, return a random seat secret alongside `studentId`; reclaiming by `studentId` must present it. Keep name-based reclaim for dropped devices but only when the old socket is really closed, and show the teacher a small "Ava rejoined from a new device" notice. | A child can type a classmate's name, or send a guessed seat number, take over their seat and answer as them. | small–medium | `server.js` `student_join`, `public/student.js` `saveSeat`/`loadSeat` |
| 13 | **End rooms when the teacher ends them.** After `end_session` or `new_lesson`, remove the room from memory after a short grace (say 15 minutes) instead of 6 hours from creation; make student devices forget a seat whose room has ended. | A finished lesson's board, download token and pictures stay reachable for the rest of the school day, and shared iPads auto-rejoin a previous class's room. | tiny | `server.js` cleanup `setInterval`, `end_session`/`new_lesson`; `public/student.js` |
| 14 | **Throttle sign-in per account, not only per IP.** For example: after 8 failed attempts on one account, require a 15-minute wait that doubles each time; raise the per-IP login limit to something a large staffroom cannot hit (300 per 15 minutes); require **10+ characters** for new passwords and for owners. | A password can be guessed at 80 tries per 15 minutes per attacker IP with no lockout, while an honest big school can hit the per-IP limit at 9am. | small | `server.js` `/api/login`, `/api/signup`, `/api/me/password`, `limited()` |
| 15 | **Record admin actions.** A small `admin_log` table (who, what, which account, when); show the last 50 on the admin page. Require the owner to re-enter their password for `reset_password`, `disable` and `set_admin`. | If an owner token is misused, there is no trace of what was done to whose account. | small–medium | `server.js` `/api/admin/teacher/:id`, `public/admin.js` |
| 16 | **Give tokens an expiry and a "sign out everywhere" button.** Add a `token_version` column mixed into the HMAC (bump it to sign out all devices); include an issue time and reject tokens older than, say, 60 days; refresh on use. | A token never expires; a lost paired phone or a shared PC stays signed in until the password is changed. | medium | `server.js` `signToken`/`teacherFromToken`, `public/teacher.js` |
| 17 | **Keep tokens out of web addresses.** Send the token in an `Authorization` header for `fetch` calls, and for links (reports, ZIPs, slides, stored pictures) mint short-lived, single-purpose download tokens (an HMAC over the lesson id and an expiry, valid 10 minutes). | Sign-in tokens sit in browser history, bookmarks, screenshots and Render's access logs. | medium | all `?t=` uses in `server.js`, `teacher.js`, `remote.js`, `data.js`, `report.html`, `insights.html`, `admin.js` |
| 18 | **Clear the dashboard autosave on Sign out** (and add "Forget saved lessons on this computer" under My account). | On a shared staffroom PC, the last ten lessons' names and answers remain readable after sign-out. | tiny | `public/teacher.js` `signOutBtn` |
| 19 | **Stronger temporary passwords** (three words from a 200-word list plus four digits) and a `must_change_password` flag the dashboard honours at next sign-in. | Owner-issued passwords have about 130,000 possibilities and are never forced to be changed. | small | `server.js` `tempPassword`, `/api/login`; `public/teacher.js` |
| 20 | **Rate-limit the public HTTP routes and projector joins** generously per IP and per code: `/api/join-info`, `/api/image`, `/api/resp-image`, `/api/shared`, `/api/slide`, `projector_join`. | None of these have any limit, so room-code scanning from outside is cheap. | small | `server.js` |
| 21 | **Log projector joins and downloads** (room code, IP, time) at info level. | When a teacher reports "students saw another class", there is nothing in the logs to confirm or refute it. | tiny | `server.js` `projector_join`, `ownedSession` |
| 22 | **Add a Content-Security-Policy header.** Roughly: `default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' wss:; frame-src docs.google.com onedrive.live.com *.sharepoint.com www.canva.com; frame-ancestors 'self'`. Needs the inline scripts in `index.html`, `report.html`, `insights.html`, `class-sticker.html` moved to files and the one `onclick=` in `teacher.js` replaced. | A single cross-site-scripting bug anywhere would be able to read the teacher's token; a CSP makes most such bugs harmless. | medium | `server.js` header middleware; four HTML files; `public/teacher.js` |
| 23 | **Verify the database's certificate.** Replace `ssl: { rejectUnauthorized: false }` with Supabase's CA certificate (downloadable from Project Settings → Database). | The app would talk to anything that answers on the database address, so traffic could in theory be intercepted. | tiny | `server.js` Pool options |
| 24 | **Let the teacher remove or rename a student** from the dashboard roster. | The only way to deal with a silly or offensive join name is a new room code. | small | `server.js` (new `kick_student` action), `public/teacher.js` |
| 25 | **Turn on GitHub Dependabot alerts and a monthly `npm audit` in GitHub Actions** (both free). | New vulnerabilities in the 85 packages would only be noticed when someone remembers to run the audit. | tiny, **no code** (+ one workflow file) | GitHub → Settings → Code security |
| 26 | **Fix the README's description of reveal behaviour** and document "Hold answers" as the safe default for young classes. | Teachers believe answers arrive privately and are surprised when they do not. | tiny | `README.md` |

## Nice to have

| # | Change | Risk today, in one sentence | Size | Where |
| --- | --- | --- | --- | --- |
| 27 | **"Forgot password" by email** (a free transactional-email tier would do; if none is acceptable, keep the owner reset but with #19). | Every reset goes through the owner by phone. | medium | `server.js`, `public/teacher.js` |
| 28 | **Two-factor sign-in for owner accounts** (TOTP app codes). | The owner account is protected by one password. | medium | `server.js`, `public/teacher.js`, `teachers` table |
| 29 | **A retention setting for lesson records** (for example delete lessons older than two years, or let each teacher choose), plus a self-service "Download all my data" and "Delete my account". | Student names and answers are kept forever by default. | small–medium | `server.js` prune job, `public/teacher.js` My account |
| 30 | **Record processed Stripe event ids** for 24 hours and ignore repeats. | Replayed webhooks within the 5-minute window are accepted (harmless today, risky if a future handler is not idempotent). | tiny | `server.js` `/api/stripe/webhook` |
| 31 | **Reject the join name "👁 Preview" from real students**, and generate room codes with `crypto.randomInt`. | A student can hide from the roster and exports by using the preview name; room codes come from a non-cryptographic generator. | tiny | `server.js` `student_join`, `newCode` |
| 32 | **Forget the saved first name on student devices after 24 hours** (shared iPads). | The last child's name is offered as "Join as …" to the next child who picks up the device. | tiny | `public/student.js` |
| 33 | **Truncate or drop the IP address in "join refused" log lines.** | Logs hold device IPs of children's phones (minor, but unnecessary). | tiny | `server.js` `student_join` |
| 34 | **Serve the privacy statement at `/privacy`** and link it from the join page and dashboard footer. | Schools and parents have nowhere to read what is collected. | tiny | `public/`, `server.js` |
| 35 | **Automated tests** for sign-in, token checks, ownership checks and payload cleaning, run on every push. | Any future change can silently reopen one of the holes above. | medium | new `test/` folder, GitHub Actions |
| 36 | **Move to Express 5** when convenient. | Express 4 is in maintenance mode; still patched, but the clock is running. | medium | `package.json`, `server.js` |
| 37 | **Lower the default photo budget** (`MAX_RESP_IMAGE_MB` 64 → 48) or document the setting in the README. | The 3 November restart happened at the old limits; the new ones are untested against the largest realistic class. | tiny, **no code** | Render → Environment |

---

## Dependency audit

Run on 4 November 2026 against `package-lock.json` (`npm audit --package-lock-only`):

| Severity | Count |
| --- | --- |
| Critical | 0 |
| High | 0 |
| Moderate | 0 |
| Low | 0 |
| Info | 0 |
| **Total packages (production)** | **85** |

Direct dependencies (all current major versions as of the audit):

| Package | Version in lock file | Purpose | Note |
| --- | --- | --- | --- |
| `express` | 4.22.3 | Web server | Express 4 is in maintenance; security fixes continue. Upgrade to 5 is item #36. |
| `ws` | 8.21.3 | WebSockets | Fine. Payload cap set (10 MB). |
| `pg` | 8.23.0 | Postgres client | Fine. See #23 for certificate checking. |
| `bcryptjs` | 3.0.3 | Password hashing | Fine (pure JS; cost 10 is acceptable). |
| `qrcode-generator` | 2.0.4 | QR codes (server side) | Fine. |

Bundled code not covered by `npm audit` (in `public/vendor/`):

| Library | Version | Note |
| --- | --- | --- |
| pdf.js (`pdf.min.js`, `pdf.worker.min.js`) | 3.11.174 (2023) | **Known vulnerability CVE-2024-4367** (arbitrary script via a crafted PDF), fixed in 4.2.67. Item #9. |
| `qrcode.js` (Kazuhiko Arase's QR generator) | version string not embedded | Small, stable library; no known issues. Record the version when next updated. |

No dev dependencies, no test suite, no CI, no Dependabot. Item #25 covers monitoring.

## What this list does not include

- Anything about the quality of lessons, the UI, or performance beyond safety.
- Paid services (content moderation APIs, Supabase Pro backups, paid email). Where a paid option is the only full answer (backups), `CONTINUITY.md` gives the free alternative.
- Changes to the database schema beyond the small columns named above.
