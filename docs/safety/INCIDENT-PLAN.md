# Eyes Up — Incident plan (the first hour)

**Date:** 4 November 2026 · **For:** the owner, and whoever is covering for the owner.
Print this. Keep the "Where things are" box filled in and up to date.

## Where things are (fill in and keep current)

| Thing | Address | Account / notes |
| --- | --- | --- |
| Live site | `https://eyesup.onrender.com` (or the custom address if `CANONICAL_HOST` is set) | |
| Health check | `https://<site>/api/health` | Shows `ok`, `storage`, `db` |
| Render dashboard | `https://dashboard.render.com` → service **eyesup** | Render login: ______ |
| Render status page | `https://status.render.com` | |
| Supabase dashboard | `https://supabase.com/dashboard` → project **______** | Supabase login: ______ |
| Supabase status page | `https://status.supabase.com` | |
| GitHub repository | `https://github.com/eq004/eyesup` | |
| Stripe (if billing is on) | `https://dashboard.stripe.com` | |
| Anthropic console (if AI is on) | `https://console.anthropic.com` | |
| Owner admin page | `https://<site>/admin` | Your Eyes Up login |
| Second person who can act | Name: ______ Phone: ______ | Has: Render / Supabase / admin account (tick) |
| eSafety Commissioner (Australia) | `https://www.esafety.gov.au/report` | For harmful content involving children |

Terminology used below: **Render** hosts the running program and its settings ("environment variables"); **Supabase** holds the database; **GitHub** holds the code. Menu names are as of late 2026; if one has moved, the Render and Supabase search boxes will find it.

A note on timing: most actions below either sign every teacher out or restart the server for about a minute. Live lessons survive a restart (rooms rebuild themselves, students reconnect), but a sign-out mid-lesson means the teacher must log in again on the spot. **If it is school hours and the risk is not immediate, prefer to act at the next break.**

---

## (a) Suspected break-in or leaked password

Signs: a teacher says they did not do something their account did; a lesson or class appears that nobody made; an unknown owner account; you find a Render or Supabase login notification you did not cause; a password or key was pasted somewhere public.

### Minutes 0–10: decide what leaked

Write down the time and what you saw. Then pick the row that matches. Do the "immediate" step for that row first; the rest of this section follows.

| What leaked | Immediate step (where to click) |
| --- | --- |
| **One teacher's Eyes Up password or sign-in** | Admin page → find the teacher → **Manage** → **🔑 Give a new password**. This signs them out of every device at once. Read the new password to them by phone, not email. If you suspect the person is still active, use **⛔ Switch account off** first, then reset. |
| **Your own (owner) Eyes Up password** | Dashboard → ☰ Menu → 👤 My account → Change password. If the attacker has already changed it so you cannot sign in: Supabase → **Table Editor** → `teachers` → your row → set `status` to `disabled` (locks the account), then see "Getting back into the owner account" below. |
| **Any sign-in token** (for example a report link with `?t=` in it was shared) | Render → service **eyesup** → **Environment** → edit `AUTH_SECRET` to a new long random value → **Save Changes**. The service redeploys (about a minute) and **every teacher is signed out** and must log in again; every old token and every old link with a token in it stops working. If `AUTH_SECRET` does not exist yet, add it. |
| **The invite code** (`TEACHER_PASSWORD`) | Render → Environment → change `TEACHER_PASSWORD` → Save. (If `AUTH_SECRET` is not set, this also signs everyone out, because the invite code is then also the token key.) Delete any sign-ups you do not recognise from the admin page (Switch off). |
| **Render login** | `https://dashboard.render.com` → top right avatar → **Account Settings** → change password, turn on **Two-Factor Authentication**, and sign out other sessions if offered. Then check **Environment** on the service for any variable you did not add. |
| **Supabase login or database password** | Supabase → project → **Project Settings** (gear) → **Database** → **Reset database password**. Copy the new connection string from the project's **Connect** button (use the pooler string the app already uses). Then Render → Environment → paste it into `DATABASE_URL` → Save (redeploys). Do this at a break: the site cannot save lessons between the reset and the redeploy. Also change the Supabase *account* password and turn on 2FA under your Supabase account settings. |
| **GitHub login** | `https://github.com/settings/security` → change password, turn on 2FA, review **Sessions** and **Applications**. Check the repo's recent commits for anything you did not push: `https://github.com/eq004/eyesup/commits/main`. Render deploys from this repo, so an attacker who can push can change the live site; if you see a strange commit, go to Render → **Events** → find the last deploy you trust → **Rollback**. |
| **Stripe secret key or webhook secret** | Stripe → **Developers** → **API keys** → **Roll key** on the secret key; **Developers** → **Webhooks** → the Eyes Up endpoint → **Roll secret**. Paste both new values into Render → Environment → Save. |
| **Anthropic API key** | `https://console.anthropic.com` → API Keys → delete the key, create a new one → Render → Environment → `ANTHROPIC_API_KEY` → Save. |

### Minutes 10–30: contain and look

1. **Check the owners.** Admin page: filter "Everyone", look at every row with the **Owner** badge. Anyone you do not recognise: Manage → Switch account off. Then in Supabase → Table Editor → `teachers` → untick `is_admin` on that row.
2. **Check recent sign-ups.** Admin page sorted by "Joined". Switch off anything odd.
3. **Look at the logs.** Render → service → **Logs**. Search (the filter box) for `join refused`, `revived`, `admin action failed`, `stripe`. You are looking for bursts of activity at odd hours or from a code you do not recognise. Render's free plan keeps logs for a short time, so screenshot anything relevant now.
4. **Database check.** Supabase → **Logs** → Postgres logs: any connections from unexpected places? Supabase → **Table Editor** → `lessons` sorted by `saved_at` and `lesson_plans` by `updated_at`: anything created by an account you do not know?
5. **Note what data could have been reached.** If the leaked thing was a teacher's token or password: that teacher's lessons (names, answers, photos for the last 60 days), their classes and plans. If it was the owner's: every teacher's name and email, every teacher's data via Supabase if the database password also leaked. Write it down; you will need it for step 7.

### Minutes 30–60: tell people

6. **Tell the affected teacher(s)** by phone or in person first, then confirm in writing. Say what happened, what you did, and what they need to do (sign in again; change any reused password).
7. **If student data may have been seen by someone outside the school**, tell the school's principal or deputy the same day, in writing, with: what was involved (for example "first names and written answers from three Year 5 lessons on 12 and 14 October; no photos"), when, what you have done, and who to contact. Schools have their own duty to assess and may need to notify the Office of the Australian Information Commissioner under the Notifiable Data Breaches scheme; give them what they need to decide. If PeakYou is itself covered by the Privacy Act, the same 30-day assessment duty applies to you.
8. **Write five lines** in an incident log (a note in your password manager or a `docs/safety/incidents/` file kept out of the public repo): date, what, cause, what you did, what to change. The monthly checklist asks you to re-read these.

### Getting back into the owner account when you are locked out

The app has no password-reset email. You need a bcrypt hash of a new password and to put it in the database:

1. On your own computer, in the Eyes Up folder (it has the `bcryptjs` package installed): run `node -e "console.log(require('bcryptjs').hashSync('YOUR-NEW-PASSWORD', 10))"`. Copy the output (starts with `$2`).
2. Supabase → Table Editor → `teachers` → your row → paste it into `pass_hash`; set `status` back to `active`; make sure `is_admin` is ticked. Save.
3. Sign in on the dashboard with the new password. Change it again from My account so the one you typed on the command line is not the one in use.

---

## (b) The site is down or keeps restarting during lessons

Signs: teachers message "it won't load", "students can't join", "it dropped out mid-lesson". The phone remote shows "reconnecting…" for more than a minute.

### Minutes 0–5: is it down, and for whom?

1. On your **phone, using mobile data not school Wi-Fi**, open `https://<site>/api/health`.
   - `{"ok":true,"storage":true,"db":"ok"}` → the site is up. The problem is at the school (Wi-Fi, web filter) or in one browser. Go to step 6.
   - It loads after 30–60 seconds → the free-tier service was asleep and has just woken. Tell the teacher to wait a minute and reload once. Consider the uptime pinger (`CONTINUITY.md`).
   - `"db":"error"` or `503` → the site is up but cannot reach the database. Go to step 4.
   - Nothing loads, or Render's own error page → go to step 2.
2. Check `https://status.render.com`. If Render has an incident, there is nothing to fix; go to "What to tell teachers" and the offline fallback in `CONTINUITY.md`.
3. Render → service **eyesup** → **Events**. Read the latest entries:
   - **"Deploy failed"** or a deploy that just finished → a code change broke it. Find the previous deploy marked **Live** or succeeded → its menu → **Rollback to this deploy**. Takes about a minute.
   - **"Instance restarted"** or similar repeating every few minutes → it is crashing. Open **Logs** and look at the last lines before each restart. `JavaScript heap out of memory` or `Allocation failed` = memory. `photo refused` lines just before = a class sent a lot of photos. `Storage init failed` = database. `EADDRINUSE` / `listen` errors = misconfiguration.
   - Nothing unusual → open **Logs** anyway and read the last 100 lines.
4. **Database problems.** `https://status.supabase.com` first. Then Supabase → project home: if it says **Paused** (free projects pause after a week with no traffic), press **Restore project** and wait 2–3 minutes. If the project is running, Supabase → Project Settings → Database: is the connection string the same one Render has? (If someone reset the password, Render's `DATABASE_URL` is now wrong: paste the new one in and Save.) Note: while the database is unreachable, teachers cannot sign in or start new rooms, but **rooms already running keep working**; their answers are kept in memory and on the teacher's dashboard autosave.
5. **Memory crash.** The server has 512 MB. The code already caps photos at 64 MB per room and 192 MB overall, so a plain crash from photos should not recur; if it does, a fix is in `FIX-LIST.md` (lower the caps via the `MAX_RESP_IMAGE_MB` setting on Render, no code change: Render → Environment → add `MAX_RESP_IMAGE_MB` = `32` → Save). After any restart the rooms revive themselves when the teacher's dashboard reconnects; students see "Reconnecting to your class…" and rejoin their seats; the board reconnects on its own.
6. **It is up but a school cannot reach it.** Ask the teacher to try the site on their phone's mobile data. If that works, the school's web filter is blocking either the site or WebSockets (`wss://`). The school's IT needs to allow `<site>` (both `https` and `wss`). Nothing on your side will fix it. Give them the address and the words "allow WebSocket connections to this host".

### What to tell teachers, and when

- **Within 10 minutes of confirming a real outage**, a short message to every teacher you can reach (email list, the school's staff chat, a WhatsApp group if you have one). Template:

  > Eyes Up is down right now (since about 9:40). I'm on it. If you're mid-lesson: ask the question aloud and use hands up or mini-whiteboards; nothing already answered is lost. I'll update you by 10:10.

- **Every 30 minutes** until it is back, even if the message is "still down, Render's fault, nothing to do".
- **When it is back:**

  > Eyes Up is back (10:05). Reload the dashboard; your room will come back with the same code. Students reload once. If your lesson didn't save, open Export as PDF on the computer you taught from; it will recover the autosave.

- **Same day, if it was your fault** (a bad deploy, an expired card, a paused database): say so in one line. Teachers trust a tool whose owner tells them the truth.

### Afterwards

Write the five-line log entry. If it was the free tier sleeping or the free database pausing, set up the free uptime pinger described in `CONTINUITY.md` today.

---

## (c) A student uploads something harmful

"Harmful" covers a rude drawing, a violent or sexual image, a photo of another child taken without consent, bullying text in a caption, or, in the worst case, an indecent image of a child.

### In the classroom, first 60 seconds (the teacher)

1. Press **👀 EYES UP** on the dashboard, the phone remote or the board. This clears the classroom screen for everyone and closes the question. (Alternatives: **🙈 Hide board**, or tap **🙈 Hide the answers again** on the board.)
2. Do **not** delete anything yet, and do not download it.
3. Note the time, the room code (top of the dashboard), the activity, and the name shown next to the response on the dashboard.
4. Deal with the class and the child as the school's behaviour policy says. This is the school's job, not the app's.

### Minutes 2–15 (the teacher, with the school)

5. **If the image might be an indecent image of a child, or shows abuse:** stop. Do not open it again, copy it, screenshot it, forward it or delete it. Tell the school's designated child-protection / safeguarding lead immediately. They decide about police / eSafety. Everything below waits for their instruction. Possession and forwarding of such images is itself an offence; preserving evidence is the police's job.
6. **For anything else (rude, offensive, bullying, a photo of a classmate without consent):** tell the designated lead the same day anyway. Ask the owner (you) to remove it from the system.

### Within the hour (the owner, when the school asks)

Where the picture can exist, and how to remove each copy:

| Copy | Where | How to remove |
| --- | --- | --- |
| The stored picture | Supabase → **Table Editor** → `lesson_images` → filter `lesson_code` = the room code and `student_name` = the name → the row(s) for that `itx_id` (question number) | Delete the row(s). If a caption was sent, also open `lessons` → the row with that `code` → edit the `summary` JSON and remove that student's `response` text under the matching activity. |
| In the server's memory (up to 6 hours after the room was created) | Render | Render → service → **Manual Deploy** menu (or the service's ⋯ menu) → **Restart service**. Every live room restarts and revives from the database; takes about a minute. Do this at a break if you can. After the restart the memory copy is gone. |
| The classroom screen's browser cache (pictures are cached for a day) | The classroom PC | Close the projector tab; clear that browser's cached images (Chrome: ⋮ → Delete browsing data → Cached images and files). |
| The teacher's dashboard / phone remote | Their browser | Same as above on each device they used. Drawings also live in the dashboard's autosave: Chrome → ⋮ → Settings → Privacy → Delete browsing data → Cookies and other site data for the Eyes Up address, or simply teach ten more lessons. |
| A downloaded ZIP or PDF | The teacher's computer | Only if the teacher downloaded it. Ask; delete and empty the bin. |
| A share link for that lesson | Supabase → `lessons` → that row | Set `share_key` to empty. |
| Database backups (Pro plan only) | Supabase | Expire by themselves after 7 days. |

Students never receive other students' pictures, so there are no copies on other children's devices unless someone photographed the board.

If the school has said "preserve it", do none of the deletions; instead clear `share_key` (so no link can reach it) and leave everything else untouched until told otherwise.

### Reporting

- Australia: the school's designated lead reports to police or to the eSafety Commissioner (`esafety.gov.au/report`) as appropriate. You may be asked for the stored picture's row (`lesson_images.id`), the time (`created_at`) and the room code. Provide those, not the picture.
- Record the incident in your log without the content: date, school, "harmful image, removed at [time], school informed".

### Prevention the teacher can do today

Switch **🙈 Hold answers** on (Lesson settings) before any drawing or photo activity, especially with younger children. With it on, nothing a child sends appears on the board until the teacher reveals it. (Making this the default for picture activities is in `FIX-LIST.md`.)

---

## (d) A teacher reports that students saw another class's data

First, what the app can and cannot show a student. A student's screen only ever shows the current question and the student's own confirmation; **it never shows other students' answers.** So "saw another class's data" almost always means one of:

- the **classroom screen** (`/projector?code=…`) opened on a student's own device with another room's code;
- a **download** (spreadsheet or picture ZIP) made with a room code;
- a **share link** or **report** link that was forwarded;
- a shared iPad that **auto-rejoined** a previous class's room (the device remembers a seat for 4 hours, and the earlier room stays open for 6 hours unless the teacher pressed Finish or Next class);
- a **class sticker** (5-letter code) that pointed students into the wrong live lesson;
- a teacher seeing another teacher's lesson in **Past lessons** (only possible for lessons with no owner, from before accounts existed).

### Minutes 0–10: get the facts, stop the flow

1. Ask the reporting teacher for: the two room codes (theirs and the one that was seen), what exactly was seen (ask for a photo of the screen), on what device, at what time, and which students.
2. **If answers, names or photos of another class are still viewable:** ask the teacher of the *exposed* class to press **🆕 Next class** or **✅ Finish** on their dashboard. That ends the room for students and the board. (The board's download token for an ended room remains valid until the room is cleaned up; if a download is the concern, Render → Restart service clears every room from memory at once; rooms that were live revive, ended ones do not.)
3. If a **share link** is the route: Supabase → `lessons` → that row → clear `share_key`.
4. If a **report link with `?t=`** was forwarded: that is the teacher's sign-in token; treat it as a leaked password (section a): Admin → Give a new password, or change `AUTH_SECRET` at the next break.

### Minutes 10–40: find out how

5. Render → **Logs** → filter `join refused` and the exposed room code: refused joins show attempts from outside the room's own IP (a different `ip=` from the school's). Successful projector joins are not logged (a fix in `FIX-LIST.md`).
6. Walk through the list at the top of this section with the teacher. The shared-iPad case is the most common and the least sinister: period 1's room was never finished, the iPad reopened the page in period 2 and sat in the old room. The fix is habit (press Finish or Next class) and, in code, ending rooms sooner (`FIX-LIST.md`).
7. Decide what was actually exposed: a question prompt only (low), names on the board (medium), written answers with names (serious), photos (serious).

### Minutes 40–60: tell people

8. Tell **both teachers** what you found, in writing.
9. If names, answers or photos of children were seen by children or adults who should not have seen them, tell the **school's principal or deputy the same day** with the facts from step 7, what you have done, and what will change. The school decides about parents and about notification duties; give them enough to decide. Keep a copy.
10. Five-line log entry. If the route was the projector or download token, move the first item of `FIX-LIST.md` ("fix now") to the top of your week.

---

## After any incident: a 15-minute review within a week

- Re-read the five-line entry. What would have made it impossible, not just unlikely?
- Is that change in `FIX-LIST.md`? Add it if not; move it up if so.
- Did the "Where things are" box have everything you needed? Fill in what was missing.
- Did the second person (table at the top) know what to do? If there is no second person, that is the finding.
