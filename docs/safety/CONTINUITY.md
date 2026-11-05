# Eyes Up — Continuity: what happens when a piece is missing

**Date:** 4 November 2026 · **For:** the owner and the second person.

Eyes Up has four moving parts outside the classroom: **Render** (runs the program), **Supabase** (the database), **GitHub** (the code), and **you** (the owner). This document says what breaks when each is unavailable, what keeps working, and what to do. Nothing here costs money; the two paid options are named as options only.

## The picture in one table

| If this is unavailable… | Teachers can… | Teachers cannot… | Data at risk | What to do |
| --- | --- | --- | --- | --- |
| **Render** (hosting) | Nothing on the site | Anything | Live rooms in memory (recoverable, see below) | Wait; use the classroom fallback; check `status.render.com`; if Render is gone for good, re-host (below) |
| **Supabase** (database) | Keep teaching a room that is already open; students join and answer; the board works | Sign in; start a new room; open past lessons, plans, classes, data; save photos | Answers from rooms open during the outage are only in memory and in the teacher's browser autosave; **photos sent during the outage are not saved** | Wait; export PDFs from the teaching computer afterwards; check `status.supabase.com`; if the project is *paused*, restore it (below) |
| **GitHub** | Everything (the live site does not touch GitHub) | Deploy changes | Nothing | Nothing urgent; keep a local copy of the code |
| **The owner** | Everything, for as long as the services run | Get a password reset, a new invite, a deletion, a fix, a renewal | Everything, eventually (unpaid cards, paused projects, expired domain) | The "second person" arrangements below |

## If Render is down

What happens: the site does not load; the board, phones and dashboards show "reconnecting". Rooms live in the server's memory, so when the service restarts they are gone from memory, **but** every lesson is written to the database a few seconds after each answer, and when the teacher's dashboard reconnects it asks for its room back by code; the server rebuilds it from the stored lesson (if it was saved within the last 6 hours), the board reconnects, and students' devices rejoin their seats. Photos sent before the restart are already in the database. So a short Render outage costs a few minutes, not the lesson.

What to do:
1. `https://status.render.com`. If there is an incident, wait.
2. If there is not, it is probably your service, not Render: follow `INCIDENT-PLAN.md` (b).
3. Free-tier sleep is not an outage: the first visit after 15 idle minutes takes up to a minute. A free uptime pinger (for example UptimeRobot's free plan, or `cron-job.org`) requesting `https://<site>/api/health` every 5 minutes keeps the service awake during the school day and keeps the Supabase project from pausing, because the health check touches the database. This is a free service; it adds nothing to the code.

If Render disappears permanently (company gone, account closed): the whole app is one Node program. It runs anywhere that can run Node and keep a process alive: Railway and Fly.io have free or near-free tiers; a Raspberry Pi or old laptop at a school can run it on the local network (`npm install`, `npm start`, students go to `http://<that machine's address>:4630/join`). The database stays on Supabase; only `DATABASE_URL` and the other settings need to be entered on the new host. Keep a note of the **names** of every Render environment variable (not the values) in your password manager, so they can be re-entered: `DATABASE_URL`, `TEACHER_PASSWORD`, `AUTH_SECRET`, `PUBLIC_URL`, `CANONICAL_HOST`, `IMAGE_KEEP_DAYS`, `MAX_RESP_IMAGE_MB`, `ANTHROPIC_API_KEY`, `AI_MODEL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `TRIAL_DAYS`, `OPEN_SIGNUP`, `PORT` (Render sets this one itself).

## If Supabase is down or paused

What happens: the program keeps running. A room that is already open keeps working for students and the board, and the dashboard that opened it keeps control. Every write to the database fails quietly (the server logs "persist failed" and "image persist failed"); answers stay in memory and in the teacher's browser autosave; **photos and drawings sent while the database is down are not saved anywhere permanent**. Anything that needs the database answers "db_unavailable": signing in, starting a new room, Past lessons, Lesson plans, Classes, Data, the admin page. Dashboards show "Connecting to the lesson archive… retrying" and keep trying every 5 seconds without signing the teacher out.

When it returns: the next answer in a still-open room triggers a save and the whole room is written again (everything in memory, including earlier answers). A room that the teacher *finished* during the outage was saved only to the browser autosave; the teacher can open **Export as PDF** on the same computer and the report page recovers it from the autosave with a "recovered" banner. That PDF is the record; the lesson will not appear in Past lessons.

What to do:
1. `https://status.supabase.com`.
2. Supabase dashboard → the project. **Paused?** Free projects pause after about a week with no connections. Press **Restore project**; it takes a few minutes. The uptime pinger above prevents this.
3. If the project is running and the health check still says `db: error`: Project Settings → Database. Someone may have reset the database password; put the new pooler connection string into Render → Environment → `DATABASE_URL` → Save.
4. Tell teachers (template in `INCIDENT-PLAN.md`): "you can keep teaching; don't press Finish until I say it's back; open Export as PDF afterwards if you need the record."

## If GitHub is unavailable

Nothing on the live site depends on GitHub at run time. You cannot deploy a change until it is back. If the repository or account is lost for good, Render still has the last built copy running, and your computer has a clone (the README's local-run instructions assume it). Push that clone to a new repository and point Render → Settings → Build & Deploy at it.

Keep the clone current: `git pull` on your computer each time you merge something. Keep GitHub's two-factor authentication on, and keep a recovery code in your password manager.

## If the owner is unavailable

This is the real single point of failure. Today only the owner can: reset a teacher's password, send an invite, delete student data, change any setting, pay Render/Supabase/the domain, fix a bug, answer a school's privacy question, or respond to an incident. Teachers can keep teaching indefinitely as long as the services stay up and paid; the first thing to fail is usually a card expiry or a paused free project.

Minimum arrangements (an afternoon's work, no cost):

1. **A second owner account.** The admin page has no "make owner" button yet, so: Supabase → Table Editor → `teachers` → the trusted colleague's row → tick `is_admin`. Two owner accounts mean password resets and invites do not stop when you are off sick. The colleague needs this document and `INCIDENT-PLAN.md`.
2. **A second person on each service.** Render supports team members; Supabase organisations do too; GitHub repositories take collaborators. Add the same person with the minimum role that can restart, roll back and read logs. For GitHub, a collaborator with write access can also merge an emergency fix.
3. **Emergency access to your password manager** (1Password, Bitwarden and others offer "emergency access" or a sealed-envelope export) for: Render, Supabase, GitHub, the domain registrar, Stripe, Anthropic, the owner Eyes Up login, and the email address those accounts recover to. Write the list of environment variable names there too.
4. **Billing continuity.** Even on free tiers, put a second card or the second person's details where the services allow, and set calendar reminders for the domain renewal.
5. **A one-page handover note** (this file is most of it): what Eyes Up is, which schools use it, where the four services are, who the second person is, and the sentence "if I am unreachable for more than two weeks, the second person may act as owner".
6. **Test it once a term:** the second person signs into Render, Supabase and the admin page from their own device and reads a log line. Ten minutes.

## Backups: how they work on Supabase, and how a restore would go

### What Supabase does by itself

- **Free plan:** no automatic backups. If the database is deleted or corrupted, it is gone. The project also pauses after about a week of inactivity and must be restored by hand in the dashboard (no data is lost by pausing).
- **Pro plan (paid, not recommended here, listed for completeness):** daily backups kept for 7 days under **Database → Backups → Scheduled backups**, with one-click restore; point-in-time recovery is a further add-on.

So on the current free plan, **the only backup is one you make yourself.**

### Making a backup yourself (free)

The database is ordinary Postgres, so the standard `pg_dump` tool works. One-time setup on your Mac: install the Postgres client tools (`brew install libpq`, then follow its note to add it to your PATH), and get the connection string from Supabase → project → **Connect** → choose the **Session** pooler or direct connection (not the transaction pooler) → copy.

Then, monthly (and before any risky change):

```bash
pg_dump "<connection string>" --format=custom --no-owner --file="eyesup-$(date +%Y-%m-%d).dump"
```

Notes:
- The dump contains **children's first names, answers and photos**. Treat the file like the database: keep it in an encrypted location (FileVault on the Mac is on by default; an encrypted disk image or your password manager's file storage is better), never in email, never in the Git repository, never in a shared drive.
- Photos make the file large. For a smaller monthly copy that keeps everything except the pictures (which expire after 60 days anyway): add `--exclude-table-data=lesson_images --exclude-table-data=slide_images`.
- Keep the last three. Delete older ones; a backup is also a liability.
- Alternative without installing anything: Supabase → **SQL Editor** can run `select` queries and download results as CSV table by table. Fine for the `teachers`, `classes` and `lesson_plans` tables; the JSON in `lessons` survives CSV but is awkward to put back. `pg_dump` is the one to learn.

### Restoring

When you would do this: the database was deleted, a table was emptied by mistake, or you are moving to a new project.

1. Create the destination: either the same project (after Supabase support has recovered it) or a new Supabase project (free). Copy its connection string.
2. On your Mac:

```bash
pg_restore --dbname="<new connection string>" --no-owner --clean --if-exists eyesup-YYYY-MM-DD.dump
```

   `--clean --if-exists` drops and recreates the tables so a partial restore does not leave duplicates. If the project is brand new and empty, those flags are harmless.
3. Render → Environment → `DATABASE_URL` → paste the new connection string → Save. The service redeploys. At start-up the program runs `CREATE TABLE IF NOT EXISTS` for every table, so even an **empty** database works (teachers would need new accounts and there would be no history, but lessons can be taught immediately).
4. Open `/api/health` and the admin page to check the account list looks right.
5. Tell teachers to sign in again if you also changed `AUTH_SECRET`; otherwise their sign-ins keep working because tokens are tied to their password hash, which the restore brought back.

What is lost in a restore from a monthly dump: everything saved since the dump (lessons, new accounts, plan edits). Photos sent since the dump are lost unless you dumped `lesson_images`. That is the trade-off of a free backup; weekly dumps shrink it.

### Rehearse once a term

Restore last month's dump into a **scratch** Supabase project (free; create it for the test and delete it afterwards), look at the admin page against it (set `DATABASE_URL` on a second, free Render service or simply run the app on your Mac with `DATABASE_URL` set), then delete the scratch project. Twenty minutes. The first time will find a missing step; that is the point.

## What a teacher can do in class if the site is unreachable

Give every teacher this list (it fits on a sticky note):

1. **Wait one minute and reload once.** The site sleeps when idle and takes up to a minute to wake. Repeated reloading does not help.
2. **Check it is the site, not the school.** Open the address on your phone using mobile data. If it works there, the school's Wi-Fi or web filter is the problem; tell IT the site and "WebSocket" connections need to be allowed. Teach from the phone remote on mobile data if the board already has the lesson up.
3. **Carry on without it.** Every Eyes Up activity has a no-tech twin: ask the question aloud; hands up, fingers 1–5, thumbs up/sideways/down for votes; mini-whiteboards or scrap paper for short answers, sketches and working out; "turn and tell your partner" for word clouds; a paper exit ticket. The point of the lesson was the question, not the tool.
4. **Keep a copy of your questions.** Before a lesson that matters (an assessment, an observed lesson), screenshot or print the plan from Lesson plans → ✎ Edit, so the questions are in your hand if the screen is not.
5. **Your answers are not lost.** If the site dropped out mid-lesson: when it is back, reload the dashboard; the room comes back with the same code. If it does not, open Export as PDF on the same computer; it recovers the autosave.
6. **Tell the owner** with the time and what the screen said. Logs are only kept for a few days.

For the owner only: as a last resort, Eyes Up runs on a laptop with no internet. `npm start` in the project folder, then students go to `http://<laptop address>:4630/join` on the school Wi-Fi (the dashboard shows the address). No accounts, no database, no saved history; the lesson's report is recoverable from that browser. Useful for a demo day with no connectivity, not something to ask teachers to do.
