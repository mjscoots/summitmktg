# Summit Platform — Running Final Report

_Report file created in Pass 34; earlier pass reports were delivered in chat. Append new passes below._

## (a) Status — Passes 29–34

| Pass | Scope | Status |
| --- | --- | --- |
| 29 | Earnings calculator reset (accounts-based) + multi-industry landing copy | Complete |
| 30 | Rank + stack model (ranks, carriers, rank_stacks, requirements, fiber_installs) | Complete — values seeded as unconfirmed drafts |
| 31 | My Money multi-industry, stack visibility settings, calculator Fiber toggle | Complete |
| 32 | Public industry pages, apply-by-industry, source attribution, partners admin | Complete |
| 33 | Fiber regions (East/West), picker ordering, Stack View tree, Command fiber report + CSV | Complete — region leads unassigned pending owner |
| 34 | Regression, security scan, copy check, typecheck/build, this report | Complete |

## (b) Issues found and fixed in Pass 34

1. **Missing table grants (blocking).** `ranks`, `carriers`, `rank_stacks`, `rank_requirements`, `fiber_installs`, `partners`, `regions` had RLS and policies but no Data API grants, so every admin/rep read or write on them would have failed with a permission error. Granted to `authenticated` (policies still gate rows) and `service_role`. No anonymous grant.
2. **My Money crashed for anyone without a rank** — `get_my_money` referenced an unassigned `_next` record. Next-rank lookup now always executes.
3. **Owner prep sheet failed** — `get_session_prep` referenced `profiles.is_archived`; corrected to `profiles.archived`.
4. **Team lead applications failed** — `get_team_lead_applications` referenced `recruiting_leads.assigned_to`; corrected to `claimed_by`.
5. **Stack View returned an error (found in Pass 33, fixed)** — `get_the_stack` compared text `direct_manager` to uuid; now cast.

Verified working after fixes at 390px and 1280px: landing copy and calculator (Pest/Fiber toggles, draft gating), public industry pages, `/ticket`, `/join?ref=` resolution (unknown ref → organic, vertical preserved), apply-by-industry, recruits/partners admin, regions admin, manager picker with region tags, Stack View tree, Command fiber table with CSV export, My Money per-vertical cards.

## (c) Seeded DRAFT values awaiting owner confirmation

All rows below are `confirmed = false` and are **not readable by rep-role users at the RLS level**.

**Fiber / Sonic stacks (per install):** Rookie 50, Rep 150, Senior Rep 200, Team Lead 250, Senior Team Lead 300, Manager 350, Rising Regional 375, Regional 400, Senior Regional 425.

**Fiber / Surf stacks:** all nine rank rows exist with **no values set**.

**Fiber tier-up rules (draft):**
- Rookie → Rep: 20 installs total; 4 weeks active
- Rep → Senior Rep: 6 installs per week over 4 weeks
- Senior Rep → Team Lead: 3 producing reps
- Team Lead → Senior Team Lead: 6 producing reps
- Senior Team Lead → Manager: 10 producing reps; 2 team leads under
- Manager → Rising Regional: 20 producing reps; 2 managers under

**Unset settings:** `fiber_expense_allowance_per_install`, `fiber_holdback_percent`, `summit_stack_fiber_sonic`, `summit_stack_fiber_surf`, `vertical_lead_margin`.

**Current visibility settings:** `stack_visibility = direct_leader`, `show_stacks_to_rookies = false`, `publish_stacks_publicly = false`.

**Fiber regions:** East and West exist, both active, **no leads assigned**.

## (d) Owner to-dos

1. Confirm or edit the fiber ladder and tier-up rules (Admin → Ranks & Stacks).
2. Set the Surf table values.
3. Set `summit_stack` per carrier (Sonic, Surf).
4. Set `fiber_expense_allowance_per_install` and `fiber_holdback_percent`.
5. Choose `stack_visibility` and `show_stacks_to_rookies`.
6. Decide `publish_stacks_publicly` (currently OFF — no dollar values appear publicly).
7. Write the Fiber and Life setup steps in the Pass 26 vertical path builder.
8. Assign the fiber vertical lead and the East / West region leads (Admin → Teams → Regions).
9. Have the region leads write their one-line intros and set accepting / capacity.
10. Add partner records (Admin → Recruiting → By Source).
11. Enter fiber installs weekly (Admin → Fiber Installs, or CSV import).

## (e) Publish-readiness — multi-industry wave

**Ready to publish**, with these facts on the record:

- Typecheck clean; production build clean (main chunk ~660 kB, pre-existing size warning only).
- Security scan on all new tables (`ranks`, `rank_stacks`, `rank_requirements`, `carriers`, `fiber_installs`, `partners`, `regions`) and the new columns on `profiles`, `applications`, `rep_vertical_enrollments`: **no findings**. RLS on, policies present, no anonymous grants. Unconfirmed drafts are filtered by policy (`confirmed = true OR manager/admin/owner`), not just hidden in the UI. Anonymous reads of all seven tables return empty; `get_public_fiber_stacks` returns `published: false` with no dollar values.
- Copy check: no banned hype words in new copy; no occurrences of "doors per day", "doors knocked", "close rate", or "President" anywhere in the app.
- Open, pre-existing (not from this wave): the `chat-uploads` storage bucket is public, so chat attachments are downloadable by URL — recommend switching to private + signed URLs in the next pass. Supabase linter also reports its standing SECURITY DEFINER function warnings (the app's RPC pattern) and the short-OTP setting.
- Publishing is the owner's call; nothing was published in this pass.

---

# Second wave — Passes 35–38 (closing sweep)

## (a) Status

| Pass | Scope | Status |
| --- | --- | --- |
| 35 | Roster sweep (phone-first), gap counters, Region Sheet funnel | Done |
| 36 | Screenshot / leaderboard image import, dedicated leader-scorecard + under-led + outreach-task build | **Never sent — not built.** See note below. |
| 37 | Pest tier rules from the Manager Manual, sent-rep override, vertical leads, recruiter role, draft fiber path, Ask Summit data mode, season goal | Done |
| 38 | This closing sweep | Done |

**Pass 36 note:** the instruction set for Pass 36 was never sent to the build. There is no screenshot / multi-image import, no review-and-match step, no unmatched-row handling, no duplicate-period protection, no commit step and no import log. Nothing in Passes 35, 37 or 38 depends on it. The closest existing pieces are the CSV/text mass import (Admin → Mass Import), the fiber install CSV import, `RepScorecard` (per-rep scorecard used in 1:1 prep and Team), `action_items` (manager outreach tasks from Pass 13), and the Ask Summit data-mode under-led list. Monthly leaderboard screenshots still have to be entered as revenue rows by hand or by CSV until Pass 36 is built.

## (b) Regression checked and issues fixed

Checked at 390 px and 1280 px on an owner session: Home, `/app/roster/sweep` (plain and gap-filtered), `/command`, `/app/money`, `/app/industries`, `/app/team`, `/app/ask`.

- Roster sweep: queue loads 534 people, unresolved first, filters (Everyone / Only gaps / no committed last day / departed with no reason / no next-season status) and the office selector render at 390 px. "Gone" opens Fired / Quit / Unknown, a one-line reason with the speech-to-text mic, an optional last sale date, and Back / Save and next. "Still here" opens committed last day, next-season status and office confirm. Skip / undo / resume cursor present.
- Gap counters render on Command, Home and Team and deep-link into the matching sweep filter.
- Region Sheet funnel, per-office / per-leader breakdown, per-name production, copy-as-text and CSV all present.
- Pest draft rules, the sent-rep override block (Draft badge, no payout math), the vertical-lead assignment panel, the draft fiber path and the season goal note all render.
- **Fixed:** edge-function CORS rejected the sandbox origin, so `ask-summit` and `weekly-owner-report` failed preflight during verification. Both now accept `localhost` in addition to the published domains and `*.lovable.app`; redeployed.
- **Fixed (Pass 37 carry-over):** the new `recruiter` role broke three narrow local role unions (`TrainingTiles`, `TrainingCoursePage`, `MemberProfileModal` via `editPermissions` / `hierarchyUtils`). Recruiter now types cleanly and is treated as rookie-level for roster edit permissions.
- Ask Summit data mode answered "how many active reps by office" with live per-office counts and cited `profiles` as the source table.
- Remaining console noise is pre-existing React `forwardRef` / `fetchPriority` warnings, not errors from this wave.

## (c) Security scan

- New surfaces reviewed: `sweep_sessions`, `profiles.showed_up_date` / `last_sweep_at` / `last_sweep_by`, the sweep RPCs (`get_sweep_queue`, `sweep_mark_gone`, `sweep_mark_here`, `sweep_restore`, `start_sweep_session`, `get_roster_gaps`, `can_sweep_person`), `admin_set_recruiter_role`, `admin_set_vertical_lead`, `get_region_sheet`. Anonymous EXECUTE is revoked on all of them; manager scoping runs server-side through `can_sweep_person`, so a manager cannot sweep or score outside their own tree.
- The recruiter role grants nothing on its own: no policy anywhere keys off `recruiter`, so recruiters read no money or team data, and the sidebar plus `ProtectedRoute` keep them out of Team, Forms, Approvals, War Room, Command and Money admin.
- Sweep writes go through single security-definer RPCs and are idempotent (re-marking the same person overwrites the same fields; `sweep_restore` reverses).
- Scan result: no critical findings, 5 warnings, all pre-existing and none from this wave — the standing SECURITY DEFINER function warnings (the app's RPC pattern), the short-OTP setting (already dismissed), the public `chat-uploads` bucket, and the broad manager read on `profiles` (managers can see the company-wide roster by design).

## (d) Draft values awaiting your confirmation

1. **Pest tier rules** (source: Manager Manual, all unconfirmed): Rep → Team Lead 3 producing reps OR $250,000 team active; Team Lead → Manager $100,000 personal active; Manager → Regional 9 producing reps OR $1,200,000 team active; Regional → Senior Regional 20 producing reps OR $2,500,000 team active. Rookie → Rep stays the existing full-season graduation rule.
2. **Sent-rep override:** "Reps Summit sends you: 5% to manage + 5% to train = 10% override" — display only, no payout math until confirmed.
3. **Fiber ladder and per-install stacks:** Sonic values and rules unconfirmed; Surf rows still blank; `summit_stack`, expense allowance and holdback unset.
4. **Draft fiber setup path:** Carrier product training → Knocking app and territory set up → Ride-along with your manager → First install logged (auto-completes from a `fiber_installs` row). Unpublished, admin-visible only; reps see the "being finalized" message.
5. **Season revenue goal:** $9,000,000, noted "set from coaching notes — edit anytime."

## (e) Owner to-dos, in order of leverage

1. Run the roster sweep on the whole region — `/app/roster/sweep` on your phone, "Only people with gaps" first.
2. Enter the season's revenue month by month (leaderboard screenshots have to be typed or CSV'd until Pass 36 exists).
3. Review and commit the revenue import, then check the Region Sheet funnel numbers against your own count.
4. Open the leader scorecard for a sub-leader before that conversation (Team → Members → scorecard, or 1:1 prep).
5. Confirm the draft tables above in Admin → Money → Ranks & Stacks.
6. Assign Pest / Fiber leads and the East / West region leads (Admin → Team → Teams). Pest = Mathew Rubino, Fiber = Brendan Pillar, both already set; region leads still need confirming.
7. Publish the fiber setup path once the four steps read the way you want.

## (f) Publish-readiness — Passes 29–38 as one release

Ready to publish as a single release. Typecheck clean, production build clean (main chunk ~664 kB, pre-existing size warning only). No new security findings. No banned hype words, no "President" anywhere in the app, and no dollar values on the public site while the stacks stay unpublished. Two carry-over items that do not block: the public `chat-uploads` bucket, and Pass 36's import tooling. Nothing has been published — that stays your call.
