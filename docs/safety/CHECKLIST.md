# Eyes Up — Monthly ten-minute safety checklist

Do this on the first Monday of each month (or the first day of term). Tick the box, write the date at the top, and keep the sheet. If any line makes you say "hmm", open `INCIDENT-PLAN.md` or `FIX-LIST.md`; do not try to fix it inside the ten minutes.

**Month: ____________   Done by: ____________   Date: ____________**

## The ten minutes

| ✓ | Minute | Check | Where | What "good" looks like |
| --- | --- | --- | --- | --- |
| ☐ | 0–1 | **Is it up and talking to the database?** | Open `https://<site>/api/health` on your phone | `"ok":true,"storage":true,"db":"ok","schemaReady":true` |
| ☐ | 1–3 | **Any crashes or failed deploys this month?** | Render → service **eyesup** → **Events** | Only deploys you made; no repeated "restarted" entries. If there are, open **Logs** and search `heap`, `Storage init failed`, `photo refused`. |
| ☐ | 3–4 | **Database healthy and not paused?** | Supabase → project home; then **Project Settings → General** (status) and **Database** size | Status "Active", size well under the free limit (500 MB). If `lesson_images` is big, the 60-day prune is doing its job; check the log line "Pruned … student image(s)". |
| ☐ | 4–6 | **Who has access?** | Admin page (`/admin`) → filter "Everyone" | Every **Owner** badge is someone you chose. No sign-ups you do not recognise. Anyone who has left their school is **switched off**. Business set-up panel: "Separate sign-in secret" is green; "Public sign-up" is what you intend. |
| ☐ | 6–7 | **Any new known vulnerabilities?** | GitHub → repository → **Security** tab (Dependabot alerts), or run `npm audit` in the project folder on your computer | "No open alerts" / "found 0 vulnerabilities". Note the number if not. |
| ☐ | 7–9 | **Backup taken?** | Your computer: run the `pg_dump` command from `CONTINUITY.md`; move the file to the encrypted folder; delete dumps older than three months | A new file dated today exists; at most three files remain. |
| ☐ | 9–10 | **Open incidents, renewals, second person?** | Your incident log; calendar | Nothing waiting on you from last month. Domain, Render and Supabase cards are not about to expire. The second person's name and phone in `INCIDENT-PLAN.md` are still right. |

## Once a term (add fifteen minutes)

| ✓ | Check | Where |
| --- | --- | --- |
| ☐ | The second person signs into Render, Supabase and the admin page from their own device and reads one log line. | Their device |
| ☐ | Restore last month's backup into a scratch Supabase project, look at it, delete the project. | `CONTINUITY.md` → Rehearse |
| ☐ | Re-read `FIX-LIST.md` "Fix now". Anything still open goes in the next free week. | This folder |
| ☐ | Spot-check a share link a teacher made: open it in a private window and confirm no child's name is visible. | Data page → Share link |
| ☐ | Change the invite code if more than a term has passed since it was last changed, and re-send the invite link to active teachers. | Render → Environment → `TEACHER_PASSWORD` |
| ☐ | Re-read the privacy statement in `STUDENT-DATA.md`; is every sentence still true? | This folder |

## Any time one of these happens, do the matching step straight away

| Event | Step |
| --- | --- |
| A teacher leaves a school | Admin → Manage → **Switch account off** (their lessons stay; nothing is deleted). |
| A teacher's phone or laptop is lost or stolen | Admin → Manage → **Give a new password** (signs out every device). |
| You change your own owner password | Nothing else; your other devices will ask you to sign in again. |
| You add a new service key (Stripe, Anthropic) or change `DATABASE_URL` | Check `/api/health` after the redeploy; open the admin page; tell nobody the value. |
| A school asks "what do you store?" | Send the statement at the end of `STUDENT-DATA.md`, after confirming the "fix now" items are done. |
| A school asks for a child's data to be deleted | `STUDENT-DATA.md` → "How a teacher or school gets data deleted". Confirm in writing within 30 days. |
| Something looks wrong and you are not sure what | `INCIDENT-PLAN.md`, first page. Write the time down before anything else. |

## Keep this folder current

When you fix an item from `FIX-LIST.md`, strike it through there with the date. When something changes in Render or Supabase's menus, correct the page names in `INCIDENT-PLAN.md`. A plan that describes last year's buttons is worse than no plan, because you will trust it.
