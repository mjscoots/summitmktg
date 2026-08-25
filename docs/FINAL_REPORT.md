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

## Pass 39 — Leaderboard screenshot import, leader scorecards, under-led view

Correction to the Pass 38 note: Pass 36 was never built. Its scope was re-issued and built here as Pass 39.

**Screenshot import (Admin → Money → Import)**
- Upload up to 12 PNG/JPG leaderboard screenshots. Each image goes to `extract-leaderboard` (Lovable AI, staff-only, strict transcribe-only prompt: blank when unreadable, never inferred, no totals rows).
- Extracted rows are matched by `match_leaderboard_rows` (pg_trgm in `extensions`) against roster profiles, departed/archived profiles and unlinked win-back names. Up to 5 candidates per row with a match score; auto-selection only at ≥90% and a ≥15-point lead over the next candidate, otherwise the row is left for the owner to pick. Rows with two close candidates are flagged.
- Review table shows every value editable, the period (month or season to date), and the value already recorded for that person/period side by side. Unmatched rows are listed at the bottom, never dropped.
- Commit is manual only (`apply_leaderboard_import`): month rows write `rep_revenue`, season-to-date writes `revenue_to_date`, departed people write the win-back production fields. An existing value for the same period is skipped unless the owner ticks "Replace the saved value". Two rows pointing at the same person block the commit.
- Import log keeps the batch, its status, row counts and the source screenshots (private `revenue-imports` bucket, signed thumbnails, staff-only policies).

**Leader scorecard**
- `get_leader_scorecard` walks `downline_edges` and returns recruited, showed up, active now, departed (fired/quit/unknown), tree revenue, the leader's own revenue, PRA per active rep and PRA per person who showed up, committed-last-day coverage %, next-season counts and the leader's own committed last day. Office and season filters. Every empty cell reads "No data yet".
- Reachable from Command → Leaders (list of every leader with a tree). Copy-as-text and print stylesheet, matching Session Prep.
- Access: admins/owner, the leader themself, or a leader above them in the management tree.

**Under-led view**
- Saved view on the win-back board (`/app/recruits?tab=winback&view=under-led`): departed reps sorted by revenue ÷ weeks active, with admin thresholds (`under_led_max_weeks` default 8, `under_led_min_revenue` blank until set).
- Each row shows revenue, weeks active, revenue/week, last sale, former manager, departure type/reason and the story. "Add to outreach" creates an `action_items` task assigned to the owner with the story in the title and links it back to the lead so it cannot be added twice.
- Command shows the count of under-led names not yet in outreach. Ask Summit's data mode (`get_data_under_led`) now reads the same query.

**Notes**
- No numbers are invented anywhere in this pass: blanks stay blank through extraction, review, and commit.
- Typecheck and production build clean. Preview only — nothing published.

## Pass 40 — Mobile/tablet audit, iOS sign-in, Fiber lead access

### Widths now checked automatically
`scripts/regression-widths.py` is the standing regression: 390, 768, 820, 834, 1024, 1180, 1280 across the public landing/calculator, `/industries/*`, apply flows, login, and (with a session) Home, Industries, My Money, Team, Roster Sweep, Command, Ask Summit, Admin. Latest run: 0 route/width combinations with horizontal overflow.

### Layouts fixed
- Sidebar/header breakpoint mismatch: the app header switched to desktop at `lg` (1024px) while the sidebar switched at 768px, so 768–1023px showed a pinned sidebar *and* a mobile hamburger with squeezed content. Added `useIsSidebarMobile()` (1024px) in `src/hooks/use-mobile.tsx` and moved the sidebar's desktop classes from `md:` to `lg:`.
- Full-height layouts: `.min-h-screen` / `.h-screen` now resolve to `100dvh` where supported, so Safari's URL bar no longer clips the bottom of a page.
- Fixed chrome respects the notch/home indicator via `.safe-top` / `.safe-bottom` helpers.
- Sign-in screen touch targets: back link, sign-in/sign-up tabs, password reveal buttons, submit buttons, and the forgot-password link are all at least 44px.

### iOS sign-in
- Viewport meta is `width=device-width, initial-scale=1.0, viewport-fit=cover`; the `maximum-scale=1` / `user-scalable=no` pair was removed (it blocked pinch-zoom and is not needed once inputs are 16px).
- All form controls render at 16px below 1024px, so focusing an input no longer triggers Safari's auto-zoom and layout shift.
- Stale PWA shell could previously block sign-in after a deploy. `public/sw.js` is now versioned (`v2-2026-08-25`), keeps `skipWaiting` + `clients.claim`, and accepts a `SKIP_WAITING` message. `src/lib/registerSW.ts` detects a waiting worker, checks for a new build when the app returns to the foreground, and reloads on controller change. `src/components/layout/UpdatePrompt.tsx` shows a plain "New version available — Reload" bar (only when an older worker is already in control, so a first install never interrupts sign-in).

Walk-through at 390px: `/login` shows the Sign in / Create account tabs, email and password fields (16px, no zoom on focus), a full-width Sign in button, and a Forgot password link. Wrong credentials render the actual error text in an inline red panel plus a toast; a stalled request surfaces "Login timed out" after 8 seconds rather than spinning forever. Password reset sends to `/reset-password`, which is public. There is no OTP or magic-link path in this app — sign-in is password-only — so no OTP delivery step exists to fail silently.

### Fiber lead access (Brendan Pillar)
- Public `/industries/fiber`, the Industries hub, the fiber Stack View, and the fiber Manager Picker deck all show him as Fiber lead (name only; no photo uploaded, intro blank until he writes it). Fixed `get_public_industry`, whose lead lookup compared `runs_vertical` against a vertical name and returned no leads; it now matches `runs_vertical = true AND vertical = <vertical>`.
- New `is_vertical_lead_of_rep(uid, rep)` helper. RLS now lets a vertical lead: edit and publish their own vertical's `vertical_paths` / `vertical_steps`; read, enter, and correct `fiber_installs` for people in their vertical; and read the profiles of people in their vertical. Other verticals are untouched.
- `/command` now admits a vertical lead into a slim view containing only their industry: the Fiber report (already scoped by `get_fiber_report`), fiber install entry, and the onboarding path builder for their vertical (`AdminIndustriesTab restrictToVertical`). Ladder settings, cross-industry enrollments, revenue targets, leaders, stack tables, and pay settings remain owner/admin only.

### Verification
- No horizontal overflow at any tested width (public and authenticated).
- Typecheck clean (`tsgo --noEmit`), production build clean apart from the pre-existing large-chunk warning.
- Security linter: 203 findings, unchanged in count and type from Pass 39 (pre-existing SECURITY DEFINER execution warnings, OTP length, RLS-enabled-no-policy info).
- Nothing published; preview only.
