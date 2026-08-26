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

## Pass 41 — Public landing rebuild

**Hero / copy.** Front page no longer uses "recruit". Subline, meta/OG descriptions and `public/llms.txt` all read: "We train and field sales reps in pest control, fiber internet, and life insurance. You close, you get paid on what you close." The three-line block is unchanged.

**Industry toggle.** `IndustrySwitcher.tsx` is a segmented Pest / Fiber / Life control on the landing page. Switching swaps the description, the how-it-works lines, the calculator model, the lead card and the Apply target in place, with no page load. Default Pest, deep-linkable via `#pest` / `#fiber` / `#life` (verified: `#fiber` selects FIBER). Content comes from `vertical_paths` (description, `public_note`, `public_how_it_works`), the same rows the `/industries/*` pages read, so there is one place to edit.

**Pest calculator (rebuilt, rookie only).** Accounts/week slider plus admin-editable chips (5/10/15/20, blank labels show plain numbers), weeks 18–30 default 20, $1,000 average account value. Serviced revenue = accounts × weeks × $1,000; active revenue = serviced − `calc_active_reduction_pct` (25%); tier and earnings compute on active revenue, retroactive across the season. Pay scale stored as `public_pay_scales` / `public_pay_bands` labelled "2027 season — Rookie (ECH-01)" and shown with that label; tapping a tier sets the accounts slider to the weekly count that reaches it. Housing note: "Rent is free at $125,000 active revenue." Rookie/Veteran toggle removed from the public calculator. In-app season pay scales untouched.

Verified at 10 accounts × 20 weeks: $10,000/week, $200,000 serviced, $150,000 active, tier "$125k–$175k · 28%", $42,000 season earnings, plus the line "This is math, not a promise."

**Veteran path.** Small plain text link "Already sold before?" at the bottom of the calculator opens `VetBidForm.tsx` (name, phone, email, company, years in D2D, optional last-season active revenue, markets, best time to call). Submitting writes to `vet_leads` via the `submit-vet-lead` edge function, shows "We'll call you with a bid.", and notifies the owner and admins in-app plus email with a tap-to-call link. Verified end-to-end (test row and notifications removed afterwards). No veteran pay scale anywhere public; `/apply/vet` still works but is not linked from the calculator.

**Fiber public state.** What it is, how it works, rank ladder as names only, "per-install pay rises with rank" with no dollar values, the Fiber Lead card (Brendan Pillar, name and photo, intro shows when written), and `FiberPublicCalculator.tsx`: installs/week slider + chips × weeks (default 12, 8–26) × `public_fiber_starting_rate`. That setting is blank, so the calculator currently shows install counts and "Per-install rate shared when you apply" instead of dollars. Internal stack tables are never read publicly and no carrier names appear. Apply pre-selects Fiber. Vertical leads can edit their own industry's public blocks (audit-logged).

**Life public state.** Seeded description plus "In development — the setup steps and pay are being finalized." Lead card only when a life lead is set; Apply pre-selects Life. No licensing claims.

**Admin.** Admin → Recruiting Content now has calculator settings (account value, defaults, week bounds, cancellation reduction, fiber rate and week bounds) and `PublicCalcPanel.tsx` for preset chips and the public pay bands. Admin → Industries gained the public description / note / how-it-works editors.

**Verification.** No horizontal scroll at 390 / 768 / 820 / 1024 / 1280 (document width equals viewport at every width). Toggle keeps state on scroll and via hash. Typecheck and production build clean (existing large-chunk warning only). Nothing published.

## Pass 42 — Lockdown (security + data integrity), part 1

Preview only. Nothing published.

### Security fixed
- `get_setting` execute revoked from anon and signed-in users. New allowlisted `get_public_setting` (calculator keys, public fiber rate, public counter thresholds) granted to anon/authenticated. Public pages already read through `get_public_calc`, so no frontend change was needed.
- `app_settings` reads: sensitive keys (`summit_stack_*`, `vertical_lead_margin`, `fiber_expense_allowance_per_install`, `fiber_holdback_percent`) are now owner/admin only; other keys stay readable to signed-in users.
- `get_fiber_stack_table` now mirrors My Money visibility: rookies get null values while `show_stacks_to_rookies` is off, `stack_visibility = self` hides values from non-staff, unconfirmed drafts stay null for non-staff, holdback percent is staff only.
- Anonymous execute removed from every non-public routine, including ones that were only reachable through the default PUBLIC grant (`get_hall_of_fame`, `get_team_battles`, `get_incentive_progress`, `get_badges_for_users`, trigger helpers). Remaining anon-callable routines are the intentional public surface: counters, public industry, public fiber stacks, recruiting content and proof, ticket config and series status, access code check, source code lookup, current season, public calculator, public settings, and the role/lead predicates used inside policies.
- `team_resources` select policy moved from `public` to `authenticated`.
- Profiles: managers now read their own industry plus their own downline (up and down) instead of the whole company; owners, admins, vertical leads (own vertical) and region leads (own region) keep their wider scope. Added `get_manager_directory()` returning only picker fields (name, nickname, photo, intro, capacity, office, industry, rank, accepting-new-reps) for signed-in users. First version of this policy used a self-subquery on `profiles` and returned zero rows in Command; replaced with the `my_vertical()` definer helper and verified Total Reps back at 535.
- Replaced the initial `manager_directory` view (flagged as a security definer view) with the routine above.

### Data integrity
- Backfilled ranks for the 8 active people who had none (manager role to Manager, veterans to Rep, otherwise Rookie) with an audit entry per person.
- `recompute_missing_ranks()` (owner/admin only) repeats that derivation idempotently and writes audit rows.
- `get_data_health()` (owner/admin only) reports active people with no rank, no manager, no industry, duplicate names, profile/enrollment industry mismatch, and manager-picker gaps.
- New Data Health section on `/command` with live counts, deep links into the roster, and a "Set missing ranks" action. Verified live: 0 no-rank, 5 no-manager, 0 no-industry, 0 duplicates, 0 mismatches, 1 picker gap.

### Performance
- Indexes added: `profiles(status, archived)`, `profiles(vertical)`, `profiles(team_id)`, `profiles(rank_id)`, `profiles(region_id)`, `fiber_installs(user_id, week_start)`, `rep_revenue(user_id, month)`, `chat_messages(channel, created_at desc)`, `rep_vertical_enrollments(user_id, vertical)`.

### Verified
- `tsgo --noEmit` clean; production build clean (main chunk 668 kB, pre-existing large-chunk warning).
- Public landing loads (title "Summit Marketing"); `/command` loads as owner with live counts.

### Not done in this pass
- `chat-uploads` is still a public bucket; signed member-only reads not yet implemented.
- Public form hardening (validation limits, rate limits, dedupe) for applications, vet leads and tickets.
- Full role matrix, offline/timezone/concurrency stress tests, Lighthouse run, main chunk under 350 kB, and Ask Summit server-side gating review.
- Auth OTP length is a project auth setting and still below the recommended length; it is not changeable from here.
- Pass 43 design work has not started.

## Pass 43 — dial it in (design and feel)

Preview only. Nothing published. `bunx tsgo --noEmit` clean, production build clean
(pre-existing 666 kB main chunk warning only, unchanged from Pass 42).

### Token system
- `src/index.css` reduced to one register: six named color roles, one radius (0.5rem),
  one shadow, motion tokens (120 ms / 180 ms, ease-out), 8px spacing grid, type scale
  12/14/16/20/24/32/48, tabular numerals on money, counts, percentages and totals.
- Global enforcement layer flattens any leftover one-off gradient, glow shadow and
  decorative blur in component markup, and disables ambient animation.
- Skeleton shimmer gradient replaced with a flat opacity fade — no `linear-gradient`
  or `radial-gradient` remains in the stylesheet.
- Tokens written to `docs/DESIGN_TOKENS.md`.

### Signature element
- `src/components/shared/PayLadderTrack.tsx`: tiers on a horizontal rail, current
  position marked, next tier plus exactly what is missing labelled, numbers move with a
  single 180 ms ease. Three homes: public calculator (tier reached by the numbers
  entered), My money (the rep's real position per industry), Command leader scorecards.

### Public landing
- Hero is the thesis line plus the industry toggle; calculator second with the ladder
  inside it; live counters below, from `get_public_counters` only.
- Removed: decorative radial/linear backgrounds, blur halo, drop shadows, accent
  dividers, gold accents, uppercase display copy, hover lift on non-interactive cards.
- Lead cards use real photos; no photo renders a plain initial block.

### App
- New `src/components/layout/PageHeader.tsx` — title, one line of context, primary
  action right, current vertical badge. Applied to Forms and My money, replacing the
  bespoke icon-badge heroes.
- `ui/table.tsx`: sticky header, uppercase micro-label header row, tighter cells,
  row hover, zebra off.
- `EmptyState` flattened to the token set.

### Copy sweep
- "Oops" and "Something went wrong" removed everywhere. Errors now say what happened
  and what to do ("That change did not save. Try again.", "That page does not exist",
  "This screen failed to load").
- Exclamation marks and emoji removed from toasts, headings and empty states across
  training, pitch, bootcamp, 1:1, calendar, video and points surfaces. Toasts name the
  action ("Sent for approval", "Video uploaded", "Password updated", "Copied").

### Verify
- Landing screenshotted and reviewed at 390 / 820 / 1280: no horizontal overflow
  (`scrollWidth` equals viewport at all three), no gradients or glow visible, ladder
  legible on a phone.
- Console shows only the pre-existing React forwardRef warning.

### Not done in this pass
- Full role-matrix re-run and Lighthouse comparison (Pass 42 items still open).
- `PageHeader` applied to two screens so far; remaining app pages keep their existing
  headers until they are converted.
- Main chunk size unchanged.

## Pass 44 — Cover: two owner fixes
- Subhead now "We train and field door-to-door sales reps. You knock, you close, you get paid on what you close."; applied to index.html description/og/twitter, public/llms.txt, and the Recruiting page meta.
- Public calculator is rookie-only: Rookie/Veteran switch and VetCalculator mount removed from the landing page; section heading and gold styling unchanged; /apply/veteran still routes.
- "Ready to start?" copy now reads "Applications take a few minutes."
- Verified no horizontal overflow at 390/820/1280; typecheck clean; nothing published.

## Pass 45 — Workspaces: one account, one workspace per industry, dual approval, presidents

### Data model
- `verticals` (keyed by existing capitalized `vertical`, plus lowercase `slug`): name, short_name, unit, accent token, status, public, `president_user_id`, `required_approver_ids`, display_order, public_title.
  - Pest — president Mathew Rubino; approvers: owner + Rubino.
  - Fiber — president Brendan Pillar; approvers: owner + Pillar.
  - Life — coming_soon, no president; approvers: owner + Pillar.
- `rep_vertical_enrollments` gained `applied_at`, `approved_at`, `rejected_at`, `reject_reason` and a status constraint.
- New `vertical_applications` and `vertical_application_approvals` (unique per approver), both with RLS.
- `profiles.active_vertical` added; every non-archived Pest profile backfilled as an active Pest member.
- `join_vertical` removed. Applications only.

### Membership state machine
```text
(none) --apply_to_vertical--> applied
applied --any approver rejects--> rejected
applied --all required approvers approve--> approved
approved --setup path configured--> onboarding --steps complete--> active
active --season off--> paused --> active
```
Approval is evaluated server-side in `decide_vertical_application`: the membership only becomes `approved` when every id in `verticals.required_approver_ids` has an `approved` row; any rejection rejects. Every decision is audit-logged and notifies the applicant; full approval sends a switch-workspace link.

### President permission matrix (inside own workspace only)
| Capability | President | Owner/Admin |
| --- | --- | --- |
| Read/edit workspace profiles | yes | yes |
| Approve/reject applications (own row) | yes | yes |
| Pair/re-pair managers, regions, region leads | yes | yes |
| Edit and publish setup path | yes | yes |
| Enter/correct production (installs, accounts) | yes | yes |
| Edit pay ladder rows | yes | yes |
| Set `confirmed` on ladders | no | yes |
| Summit cut settings, holdback, expense allowance | no | yes |
| Cross-workspace production, stacks, applications, roster | no | yes |
| Owner/admin role assignment, publishing | no | owner |

### Front end
- `WorkspaceProvider` / `useWorkspace()` with membership list, active workspace, president flag, and `switchWorkspace()` writing `profiles.active_vertical` without a reload.
- Desktop: workspace switcher in the sidebar header; the top bar shows the active workspace name. Sidebar role label reads `PRESIDENT · FIBER`.
- Mobile: bottom navigation (Home, Training, Chat, Money, Industries) below 1024px with 44px targets, safe-area padding and a chat badge; Industries opens the workspace sheet with membership status, per-approver checklist, rejection reason and coming-soon state.
- `/app/industries` keeps the long-form hub and now carries the application form and status per industry.
- `BootcampGate` (summer checklist) only applies when the active workspace is Pest.
- My Money orders the active workspace's card first.
- Approvals page gained a "Workspace applications" tab for owner, admin and president (presidents scoped to their own workspace by RPC). Command shows the count of applications waiting on the signed-in approver.

### Verification
- `bunx tsgo --noEmit` clean; production build clean apart from the known ~661 kB main-chunk warning.
- Regression widths 390 / 820 / 1280: 0 overflowing route/width combinations.
- Nothing published.
- Outstanding: the Supabase linter still reports the pre-existing "signed-in users can execute SECURITY DEFINER function" warnings across the function surface; the new workspace routines follow the same pattern as the existing ones and check authorization internally.

## Pass 46 — workspace-scoped content

### Tables carrying the `vertical` scope column (NULL = company-wide)
`training_courses`, `training_videos`, `training_drills`, `scripts`, `team_scripts`, `team_resources`, `chat_channels`, `calendar_events`, `announcements`, `announcement_posts`, `season_checklist_items`, `recruiting_leads`.

Backfill: all existing rows set to `Pest`, except general chat channels (`general`, `announcements`, `random`, `company`, `summit`), calendar events with `scope = company`, and announcements with no team target — those stay company-wide.

### Per-screen filter rule
Every rep-facing read uses `verticalFilter(activeVertical)` from `src/lib/workspaceScope.ts`, i.e. `vertical IS NULL OR vertical = <active workspace>`.

- Home: Pest keeps today's dashboard; non-Pest workspaces render `WorkspaceHome` (installs this week/season, rank and next tier, setup progress, pinned announcement, next event, unread chat, president first-run checklist; Life shows "Opening soon").
- Training: courses, videos, required/bonus progress, and the daily drill (`get_daily_drill` now scopes on `my_active_vertical()`).
- Scripts, Resources, global search: scoped reads; writes stamp the active workspace, with an "All industries" scope control for admins.
- Chat: `get_chat_channel_state()` returns company plus active-workspace channels; `@` mentions come from `get_workspace_mentionables()`, so non-members cannot be mentioned in.
- Events and Calendar: `get_events_feed()` and the direct calendar query are scoped; event writes carry the workspace.
- Leaderboard: Pest keeps the existing tabs, banners, battles, and incentives; Fiber ranks installs via `get_fiber_leaderboard()`; other workspaces show "No data yet."
- Season hub: hidden outside Pest.
- Recruits: the referral link carries `industry=<active workspace>`; `/ticket` records it on the lead.
- Ask Summit: grounding and practice mode load only company plus active-workspace events, announcements, courses, scripts, and drills.

### Roles
Presidents reach the admin surfaces (sidebar entry and `/admin/*`), which are filtered by workspace scope and RLS; `/command` stays owner/admin.

### Public apply
`enroll_vertical_on_approval` now enrolls a newly active account in the industry from its application (Pest only when the application names none) and sets that as the starting workspace, so a Fiber applicant never receives a Pest workspace.

### Verification
`bunx tsgo --noEmit` clean; production build clean apart from the known >500 kB chunk warning; width regression at 390/768/820/1280 showed no horizontal overflow. Not published.

## Pass 47 — Fiber opening day + proof

### 1. Winter plan prompt (built)
- New table `winter_plans` (user_id, season_year, answer) with RLS: own read/write, admin/owner read all, Fiber president reads only `answer = 'Fiber'` rows.
- RPCs: `get_my_winter_plan`, `set_my_winter_plan` (four allowed answers only), `get_winter_plan_summary` (owner/admin, counts plus names), `get_fiber_winter_interest` (owner/admin/Fiber president, names plus fiber application status), `reopen_winter_plan` (owner/admin clears the answer so the prompt shows again). Anon execute revoked on all five.
- `WinterPlanCard` shows once on the Pest home for active pest members: four plain buttons (Fiber / Life / Off this winter / Not sure yet), no pressure copy.
  - Fiber: records the answer, then opens the fiber application inline with phone, experience and markets pre-filled from the profile; the rep adds why and markets.
  - Life: records the answer, creates an `interested` Life enrollment, shows "Summit Life is opening soon".
  - Off this winter / Not sure yet: record only.
- `WinterPlanPanel` on Command (owner section "Winter Plan"): counts by answer, expandable names, per-person Re-open, plus fiber application status list. The fiber lead Command view renders the same panel in `fiberOnly` mode (fiber choosers and their application status only).
- Verified at 390px on the owner session: card renders above the hero on Pest home, no horizontal overflow, panel present on /command.

### 2. President day one (partly verified)
- Fixed in this pass: presidents can now edit their industry's pay ladder values and tier-up rules (RLS policies scoped by `is_president_of_vertical`), while a `guard_confirm_flag()` trigger blocks any non-owner/admin from changing `confirmed`. In the UI the confirm buttons render greyed with the label "Owner confirms".
- Admin, Command (fiber view), stack view, region sheet, roster sweep, leader scorecards, production entry/CSV and setup path were already president-accessible from Pass 46 and are filtered by workspace scope.
- Open item: a president session could not be minted in this environment (minting for a specific user requires interactive approval), so the step-by-step 390px walkthrough of Pillar's first day was not captured. It needs one run on the preview with Pillar signed in.

### 3. Rep day one in Fiber (open item)
- Same limitation: no fiber-only member session could be minted here. Code paths were reviewed — `WorkspaceHome` handles the fiber home (installs this week and season, rank and next tier, setup path, pinned announcement, next event, unread chat), training/scripts/chat/events/leaderboard reads are filtered to company-wide plus the active vertical, and the Pest bootcamp and season hub are Pest-only, so no pest artifacts should render. Needs one signed-in fiber pass on the preview to confirm visually.

### 4. Role matrix (from policies and predicates)

| Surface | Owner | Admin | Fiber president | Two-workspace rep | Pest-only rep |
| --- | --- | --- | --- | --- | --- |
| Pest production / imports | yes | yes | no | own only | own only |
| Fiber production / installs | yes | yes | yes (fiber) | own fiber | no |
| Pest applications | yes | yes | no | own | own |
| Fiber applications | yes | yes | yes | own | no |
| Pest stacks | yes | yes | no | confirmed only | confirmed only |
| Fiber stacks | yes | yes | yes (edit, no confirm) | confirmed only | no |
| Summit cut settings | yes | yes | no | no | no |
| Confirm ladder rows | yes | yes | no (trigger blocks, button greyed) | no | no |
| Winter plan answers | all | all | Fiber answers only | own | own |
| Fiber training/scripts/chat/events | yes | yes | yes (edit) | read when in Fiber | no |

### 5. Performance
- `WorkspaceProvider` issues exactly one `get_my_workspaces` call per session (measured: 1 per full page load, 0 during in-app navigation) and updates only on switch or explicit refresh.
- Page load (390px, dev server, owner session): /app 3.2s, /app/training 3.0s, /app/money 3.0s, /app/industries 3.1s, /app/leaderboard 3.1s.
- Open item: Lighthouse mobile scores were not captured — the runs require an authenticated session that Lighthouse cannot restore here. Production build is clean with the known 668 kB main-chunk warning.

### 6. What Pillar should do first on the preview
1. Sign in and confirm he lands in Summit Fiber.
2. Open Admin → Fiber and approve the pending fiber application (then reverse it).
3. Add the first fiber training course and one script.
4. Create a fiber chat channel and post the pinned announcement.
5. Create the first fiber event.
6. Enter this week's installs for one rep.
7. Edit one ladder value; confirm the confirm button reads "Owner confirms".
8. Open the fiber stack view, run the roster sweep, open a leader scorecard, export the production CSV.
9. Check the Winter plan panel for who chose Fiber.

Nothing published.

## Pass 48 — Season reset support, admin reorganization, cover mention

- Locked-out experience: `get_my_access_state()` RPC + `useAccessState` + `LockedOutScreen`, gated in `ProtectedRoute`. Signed-in people with `approved = false` and no role see one plain screen with a reactivation request button; no rep data loads.
- Restore flow: Admin -> People -> Restore access reads `access_reset_2027` (532 rows) via `get_access_reset_rows()`; `restore_access()` restores approval, role, manager and team in one call and writes to the audit log. Bulk select supported.
- Reactivation requests: `reactivation_requests` table with RLS (own insert/read, admin/owner review) surfaced in Admin -> Inbox.
- New sign-ups: unchanged; the Pass 45 apply -> dual-approval flow remains the only front door.
- Admin reorganization: five sections — Inbox, People, Money, Content, Settings — defined in `src/lib/adminSections.ts`, routed at `/admin/:section`. Legacy `/admin/team?tab=...` links redirect to the owning section. Labels use plain words; "hub", "manage", "queue" removed.
- Cover: gold pest cover unchanged; one muted line under the hero buttons links to the fiber and life pages.
- Public copy: parents and recruiting pages each carry one plain sentence noting fiber in winter and life insurance starting. No dollar figures, no invented claims.
- Verification: typecheck clean, production build clean, admin sections walked at 390 / 820 / 1280 with no horizontal overflow and no runtime console errors (only React dev ref warnings).

## Pass 51 — Phone navigation + staff access rule

### Phone (below 1024px)
- Bottom bar has exactly three items: Home, Chat (unread badge), Training. It floats: `bottom: calc(env(safe-area-inset-bottom, 0px) + 10px)`, rounded card, 44px targets, 12px labels. Verified at 390x844: bar bottom edge at 834px of 844 (visible gap), 3 items.
- No sidebar and no hamburger on phone. Everything else is behind the top-left "Summit Pest" pill (`WorkspaceSheet`): Workspaces (switch / apply / opening soon, plus "See all industries" link to `/app/industries`) and Go to (My money, Schedule, Leaderboard, Leads, Team, Forms, Approvals, Admin, Profile, Log out), tier-filtered. Ask stays a header button.
- Home shows My money and Schedule cards (`HomeQuickCards`) on both the Pest home and workspace homes, so both are one tap from Home.

### Desktop (1024px and up)
- Sidebar unchanged in function, now driven by the same definition as the phone sheet (`src/lib/appNav.ts`): workspace pill, Home / Learn / Chat / My money / Schedule / Leaderboard, then Manage (Manager+), then Admin (Admin+).

### Staff access rule (server-side)
- `sync_staff_workspace_access(uuid)` (SECURITY DEFINER, `search_path = public`, execute limited to service_role) gives owners and admins active enrollment in every vertical including `coming_soon`, and a president active enrollment in their own vertical; existing rows are promoted to active and rejection data cleared.
- Triggers: on `user_roles` (role changes) and on `verticals` (insert / president change), so it survives role changes and new workspaces. Existing staff were backfilled.
- Verified: Mathew Joyce (owner), Brendan Pillar (admin), Liam Gardner (admin) are active in Pest, Fiber and Life; the switcher shows all three as Active with no apply prompts.

### Verification
- `bunx tsgo --noEmit` clean; `bun run build` succeeds (pre-existing chunk-size warning only).
- Supabase linter remains at its pre-existing 255 issues (security-definer execution warnings, one RLS-without-policy, one OTP expiry) — unchanged by this pass, not introduced by it.
- Preview only; not published.

## Pass 52 — Person profile, passive questions, simplification

### Person profile
- New route `/app/person/:userId` (`src/pages/app/PersonProfilePage.tsx`), phone-first, sections: header/identity, workspaces, what they've told us (every submitted form and answer), engagement (last login, last active, minutes today, 14-day average, days active in 30, streak, training, chat, events, tracking started), production (revenue months, fiber install weeks), leads/outreach with call history, staff-only private notes and collapsed season history, and a merged timeline.
- Data comes from `get_person_profile(uuid)` (security definer, authenticated only). Access via `can_view_person`: self, owner/admin (staff scope), direct manager, downline manager. Public application answers are matched by email or phone because `applications` has no user column.
- Entry points: names in Admin → People roster link to the profile; team member modal has a "Full profile" button.

### Activity tracking
- `activity_days` (per user, per day: minutes, sessions, screens) plus `profiles.last_login_at`.
- `useActivityTracking` now calls `record_activity_ping` each active minute; `useAuth` calls `touch_last_login` once on sign-in.
- Profiles with no history show "Tracking started <date>" rather than implying older data exists.

### Questions engine
- `home_questions` / `home_question_answers`, with answer types (choices, short text, number, date), audience (everyone, workspace, tier), cadence (ask once, ask weekly), active dates and ordering.
- Admin → Content → Questions creates, activates/deactivates and shows per-question answer summaries.
- `HomeQuestionCard` shows at most one open question on Home; "Skip for now" hides it for the session and it returns on the next login. The seeded winter question is linked to the winter plan so Pest members are not asked twice.

### Simplification (fields removed from default views, still available)
- Roster gap counters removed from Dashboard and Team; roster sweep now lives under Admin → Reports → Tools.
- Region sheet default table and CSV no longer show departure type, departure reason, committed last day, next-season status or showed-up date. All remain in the person profile's collapsed season history for owner/admin.
- "Finishing soon" committed-last-day banner removed from Team.

### Verification
- `bunx tsgo --noEmit` clean; `bun run build` succeeded (existing chunk-size warning only).
- Checked at 390 px with a real owner session: profile renders real data; Admin → Content → Questions renders and lists the winter question.
- Database linter remains at 262 pre-existing issues (1 RLS-without-policy, 260 security-definer execute warnings, 1 short OTP). Not introduced by this pass and not resolved here.
- Preview only; nothing published.

## Pass 53 — Walkthrough, consolidation, bug hunt (partial)

Scope actually verified: an authenticated owner crawl of 49 app/admin/public routes at 390x844, plus targeted re-checks after each fix. The requested throwaway sessions for admin-president, manager and sales tiers, and the full 1280 second walk, were NOT performed — do not read this pass as a complete multi-tier walkthrough.

Findings and fixes:
- Two video libraries existed (`/app/videos`, 97 videos, and `/app/training/videos`, 79). `/app/videos` and `/app/videos/:id` now redirect into the training library, so there is one video destination. Verified: `/app/videos` -> `/app/training/videos`, `/app/videos/abc` -> `/app/training/videos/abc`.
- Schedule was split between `/app/events` and `/app/calendar`. Events is now titled "Schedule" and links to "Month view"; the calendar page is a sub-screen with a back link to Schedule and lost its gradient hero and Operations breadcrumb.
- `/app/war-room` presented itself as a separate "STATS" product with a red gradient hero. It is now "Team stats" with a plain header and a back link to Team.
- `/app/alumni` rendered "your account is set to alumni status" for any signed-in user via direct URL. Non-alumni accounts now redirect to `/app`.
- Route timings at 390 were consistently 2.5-2.7s to interactive on a cold client; no fix attempted in this pass.
- Known outstanding: `/admin/reports` logs a 403 resource, `useStreak` logs "Failed to fetch" on fast admin navigation, `/app/season` still shows "No season is configured yet".

## Pass 54 — A theme per workspace

Model:
- `verticals.theme` (jsonb) holds `mode`, six token roles (`background`, `surface`, `foreground`, `muted`, `border`, `accent`), and `texture` / `texture_opacity`.
- Seeded: Pest = existing dark blue; Fiber = dark green with a 5% camo texture; Life = light.
- `set_vertical_theme(text, jsonb)` is authenticated-only and allows owner, admin, or the president of that workspace.

Application:
- `WorkspaceThemeProvider` (mounted inside `WorkspaceProvider` in `AppLayout`) writes the active theme onto `<html>` as CSS variables, including `--surface*`, `--text-*` and the sidebar tokens, updates the PWA `theme-color` meta, and toggles a `light-workspace` class. Switching workspaces re-themes with no reload.
- The camo texture is a fixed, pointer-transparent body layer at the stored opacity. Colour transition is disabled under `prefers-reduced-motion`.
- Two hardcoded surfaces were tokenized: the dashboard header stat tiles (gradient + glow removed) and the calendar hero.

Editor: Admin -> Settings -> Themes lists each workspace with mode, six colour pickers, texture and strength, a live preview, computed contrast ratios, and a save button that is disabled until text/secondary reach 4.5:1 and accent reaches 3:1 against the background.

Verified at 390 by switching workspaces live: Pest `--background: 216 60% 5%`, accent `217 90% 53%`, texture 0; Fiber `150 30% 5%`, accent `152 55% 42%`, texture 0.05; Life `0 0% 100%`, accent `220 65% 45%`. Light-mode readability checked at 390 and 1280 after the surface/sidebar token fixes. Active workspace restored to Pest afterwards. `bunx tsgo --noEmit` and `bun run build` pass. Preview only; not published. The database linter still reports 263 pre-existing issues (security is not clean).

### Pass 54 addendum — token cleanup, texture scope, editor reset

- Texture is no longer a full-page layer. `.workspace-texture` is opt-in and is applied to exactly two surfaces: the Home header band and the workspace pill. It is flat, multi-tone, pointer-transparent, never animated, and never behind body text or forms.
- Gradients are gone from the app: 77 `bg-gradient-to-*` utilities across 46 files were replaced with flat token backgrounds, the two decorative blur blobs on the Home header band were deleted, `gradient-text` on the greeting became `text-primary`, and the leaderboard podium / Forms badge gradients became `bg-primary/*` and `bg-muted/*`. `rg "bg-gradient-to-" src -g'!*.css'` returns nothing. The public site (`src/pages/Index.tsx` and the public routes) keeps its gold-on-black identity and its two intentional overlay gradients.
- Hardcoded blue palette utilities inside the app (`text-blue-400`, `bg-blue-500/10`, `border-blue-500/40`, etc.) were mapped onto the accent token across 38 files, along with the `rgba(59,130,246,...)` glow shadows, which were removed. Blue-as-accent no longer leaks into Fiber or Life. Status colors (red, amber, emerald) are intentionally left as semantic status signals.
- `.light-workspace` overrides now cover `text-white/80|70`, `bg-black`, `bg-black/40`, `bg-white/5` and `border-white/5` in addition to the earlier set, and the sidebar tokens (`--sidebar-*`) follow the workspace so the Life sidebar is light.
- Crossfade is 180ms on `html, body` for background and color, instant under `prefers-reduced-motion`.
- The editor gained "Reset to default" per workspace, restoring the seeded Pest / Fiber / Life token sets. Saving is still blocked below 4.5:1 text and 4.5:1 secondary on the surface, and 3:1 for the accent.

Token sets as seeded (H S% L%):

| Role | Pest (dark) | Fiber (dark) | Life (light) |
| --- | --- | --- | --- |
| background | 216 60% 5% | 150 30% 5% | 0 0% 100% |
| surface | 218 46% 10% | 152 24% 10% | 40 12% 97% |
| border | 217 44% 15% | 145 18% 18% | 40 10% 88% |
| text | 0 0% 98% | 80 12% 96% | 220 20% 12% |
| muted text | 215 20% 65% | 110 12% 68% | 220 10% 40% |
| accent | 217 90% 53% | 152 55% 42% | 220 65% 45% |
| texture | none | camo @ 5% | none |

Verified: Home, Learn, Chat, My money and Admin -> People captured in all three themes at 390 (`/tmp/browser/p54b/*_390.png`) and at 1280 (`*_1280.png`), plus a post-cleanup Pest Home at 1280 confirming the baseline is unchanged. Runtime tokens read back per theme, including the PWA `theme-color` meta: Pest `#050b14`, Fiber `#09110d`, Life `#ffffff`. Typecheck and build pass. Not verified: a per-pair AA audit of every screen in Life was done by eye on the captured screenshots, not programmatically; the person profile and workspace sheet were captured in earlier runs only. Preview only, not published. The database linter still reports its 263 pre-existing issues.

## Pass 55 / 56 — leads meaning, workspace switcher, approvers who cannot approve

**Leads (bucket = 'lead' only).** `leads_list`, `leads_callbacks_due`, `lead_claim`, `lead_detail` and
`get_off_season_report` are bucket-scoped, so roster people never render as leads. Ordering puts
out-for-good rows before `not-on-2026-roster` rows. Rows now show name, former manager, last outcome,
next callback and (on All leads) the designated owner — revenue is on the lead profile only.
Owner/admin All leads adds filter chips (All / Designated / Free / Not on 2026 roster / Josh's system /
Out for good), row selection and bulk "Designate to…" backed by `leads_designate_bulk`, with a manager
picker from the new `leads_manager_options` (shows designated counts and flags approvers with no access).
Lead rows open only on departure: the old access-loss trigger was dropped and `open_lead_on_departure`
is called from `set_person_lifecycle` for `departed` only.

**Workspace switcher.** One compact component, `WorkspaceMenu` — a single 14px line ("Summit Pest ▾")
at the top of the desktop sidebar and at the top of the phone drawer; no banner anywhere. The phone
top-left control is now a 44px icon-only button that slides in the drawer (workspace line, then the
navigation list, then Log out). The bottom bar is unchanged: Home · Chat · Training. Switching sets the
workspace, records `set_active_vertical`, navigates to Home, scrolls to top, bumps a workspace epoch that
remounts the whole screen so no list keeps data from the previous workspace, plays the Pass 54 theme swap
and shows a one-line "Now in …" confirmation.

**Approvers who cannot approve.** `vertical_effective_approvers` drops null and no-access approvers;
`vertical_approver_state` reports each as `required`, `skipped_no_access` or `unset`;
`decide_vertical_application` counts only effective approvals, lets the owner finish alone and logs the
override reason. The applications list shows waiting / skipped, no access / not set yet per approver.

Typecheck and build clean. Preview only. Security is not clean: the Supabase linter still reports 275
issues, almost all pre-existing broad SECURITY DEFINER execute grants plus a short OTP length setting.

### Pass 56 verification

Leads (bucket = 'lead'): 504 rows — 416 tagged `not-on-2026-roster` (all free), 88 out for good
(82 designated to former managers, 6 free). Roster rows (42) are excluded from every leads surface.
The parked bucket is empty and has no tab. All leads adds single-row assign next to bulk designate.

Approvers: Pest = owner required, Mathew Rubino `skipped_no_access` → effective approvers is the owner
alone, so the owner can approve a Pest application today. Life = owner + Brendan Pillar required, the
unset Life president shows `unset` and is skipped. Fiber = owner + Pillar, both required.
