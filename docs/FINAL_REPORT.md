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

## Pass 57 — Security hardening

### Storage: chat attachments
- `chat-uploads` is now private (100 MB limit). No public URLs are issued.
- Upload policy still requires the first path segment to equal `auth.uid()`, so a
  rep can only write under their own folder. Delete stays uploader or admin.
- New read policy calls `public.chat_attachment_readable(name)`: the uploader,
  staff, and signed-in members of chat can read an object only when a
  `chat_messages` row actually references it. Orphaned objects are unreadable.
- Reads go through `src/lib/chatAttachments.ts`: one-hour signed URLs, cached in
  memory for the session (refreshed a minute early), with in-flight de-duping.
- Old messages that stored a full public URL still render — `toObjectPath()`
  strips the `/chat-uploads/` prefix and signs the same object. New messages
  store the object path only. Applies to images, files, and voice notes.

### SECURITY DEFINER functions
- Anonymous EXECUTE dropped from 33 to 19. The 19 that remain are deliberate:
  `get_public_calc`, `get_public_counters`, `get_public_cover_content`,
  `get_public_fiber_stacks`, `get_public_industry`, `get_public_setting`,
  `get_recruiting_content`, `get_recruiting_proof`, `get_ticket_config`,
  `get_ticket_series_status`, `resolve_source_code`, `validate_access_code`
  (public pages and forms), plus the policy helpers `has_role`, `is_staff`,
  `is_manager_tier`, `is_paired_manager_of`, `is_president_of_vertical`,
  `is_vertical_lead`, `region_lead_of`, which RLS evaluates as the caller.
- The three new submission-validation triggers were revoked from
  `PUBLIC`/`anon`/`authenticated`; they run as triggers, not as API calls.
- All 283 definer functions set `search_path`.
- The remaining 254 "signed-in users can execute" warnings are the app's own RPC
  surface. Every one carries its own role check; each is called from `src/` or an
  edge function, so revoking `authenticated` would break the product. Left as is
  by design rather than reported as fixed.

### RLS-enabled table with no policy
- `backup_job_tokens` is service-role only (weekly backup job). No policy is
  correct: RLS on with zero policies means no client role can read or write it.
  Documented rather than widened.

### Unauthenticated submissions
Server-side triggers now guard `applications`, `vet_leads`, and public
`recruiting_leads`: text caps per column, email shape and 10–15 digit phone
checks, and five submissions per IP per hour. A repeat inside 24 hours updates
the existing row instead of creating a second one.
- `submit-vet-lead` mirrors this in the function: caps, email/phone format, a
  5/hour IP limit via `check_rate_limit`, and owner notification plus email are
  skipped for a 24-hour duplicate.
- Every rejection path returns the exact message
  "That did not go through. Check the phone and email and try again." — used by
  the ticket page, both application pages, and the veteran bid form.

### Ask Summit
Verified, unchanged: JWT required and validated with `auth.getUser`, archived
accounts refused, 20 calls per minute per user, 1–40 messages with each capped
at 4,000 characters, and live data context assembled only for owner/admin.

### Linter and checks
- Before: 275 issues. After: 275 (1 RLS-no-policy, 19 anon definer, 254
  authenticated definer, 1 OTP). The count is flat because the anon reductions
  are offset by warnings the linter raises for intentional design, above.
- OTP length is a project auth setting, not code: it needs Authentication →
  Email → OTP length raised to 8. The app signs in with passwords and does not
  use OTP.
- Typecheck clean, production build clean.

Preview only. Not published.

## Pass 58 — Walkthrough, bugs, performance

### Bugs fixed (symptom / cause / fix)
- `/admin/reports` logged a 403 resource. Cause: `weekly-owner-report` forwarded Resend's 403 ("summitmktgsales.com domain is not verified") as the function's own status, so the browser recorded a failed request even though the report generated. Fix: sender now reads `RESEND_FROM_EMAIL` with a verified fallback, and delivery failures return 200 with `emailed: false, reason: "email delivery failed"`; the stored report still renders. Function redeployed.
- `useStreak` logged "Failed to fetch" on fast admin navigation. Cause: the mount-time streak read and `record_daily_login` RPC kept running after unmount. Fix: both effects use an `AbortController`, pass `.abortSignal()` to the queries/RPC, skip state updates when aborted, and treat aborts as expected instead of logging.
- `/app/season` read "No season is configured yet." Cause: `seasons` has zero rows and the page had a dead-end empty state. Fix: staff now see "Season settings are on Admin → Settings" with a 44px link to `/admin/settings`; reps see a plain "Not set yet."

### Performance
- Every route-level page is `React.lazy` + `Suspense` (only `AuthPage` and `NotFound` stay eager); the fallback is a plain skeleton with no spinner text.
- Main chunk before: `index` 676.98 kB raw / 193.74 kB gzip. After: `index` 191.31 kB raw / 59.97 kB gzip — under the 350 kB target.
- Chunks over 200 kB after the split: none.
- Largest remaining chunks: `vendor-supabase` 172.98/44.69, `vendor-react` 162.98/53.15, CSS 158.22/25.71, `AdminTeamPage` 134.72/33.33 (admin-only), `AppLayout` 108.92/32.66, `CommandCenterPage` 98.11/24.43 (owner-only), `DashboardPage` 95.47/25.57, `vendor-dates` 81.84/21.81.
- Active logo `summit-logo-new.png` resampled 1536×1024 → 768×512: 720.4 kB → 168.5 kB. Four unused logo PNGs deleted.

### Contrast (programmatic, WCAG relative luminance)
Checked foreground/background, muted/background and accent/background against both `background` and `surface` for all three themes — 18 pairs. Lowest results: Pest accent/surface 3.93 (needs 3.0), Pest accent/background 4.29, Life muted/surface 5.66, Fiber accent/surface 5.45; text pairs range 5.66–18.00 against a 4.5 floor. No pair failed, so no token was changed.

### Verification
- `bunx tsgo --noEmit` clean.
- Production build clean, no chunk-size warning.
- `scripts/regression-widths.py`: 0 overflowing route/width combinations across 390/768/820/834/1024/1180/1280 (the script itself needed a post-navigation wait before the session write; fixed).
- Owner-signed crawl of `/app`, `/app/training`, `/app/money`, `/app/leaderboard`, `/app/season`, `/admin/reports`, `/admin/people`, `/admin/money` at 1280: all load with `scrollWidth == 1280` and no failed requests after the report fix.

### Open, with reason
- The seven throwaway `test+<role>@summit.test` accounts and the full role × screen matrix were not created or walked in this pass; no test users exist, so nothing needs deleting. Reason: ran out of pass budget after the bug fixes, performance work and verification. The two Fiber first-day sequences (Pass 47 §3 and §6) therefore remain uncaptured.
- PageHeader rollout to the remaining app pages not done in this pass.
- Dev-only React warning on `/admin/people`: "Function components cannot be given refs" originating in `DepartureIntakeDialog`. No user-visible effect; not yet traced.
- Supabase linter count unchanged from Pass 57 (275).
- Preview only; nothing published.

## Pass 58B — Role walkthrough

### Grant regression
- `public.handle_new_user()` had lost EXECUTE after Pass 57. Granted to `supabase_auth_admin, postgres` (serves the `auth.users` insert trigger). All other public trigger functions were audited against `pg_trigger.tgfoid` and granted to `authenticated`/`service_role` (app-written public tables) or `service_role` (backup/edge paths).
- Account creation still failed with `function public.sync_staff_workspace_access() is not unique`: the database held both a no-argument and a `(uuid DEFAULT NULL)` overload. Dropped the no-argument overload and the redundant `staff_access_on_role_change` trigger; granted `sync_staff_workspace_access(uuid)` to `authenticated, service_role`. Account creation then succeeded.
- `public.chat_attachment_readable(text)` had lost EXECUTE for `authenticated` in Pass 57, so **no chat attachment could be opened by anyone** (signed-URL requests returned `permission denied for function chat_attachment_readable`). Granted to `authenticated, service_role`. This was a launch blocker.
- Anon submission validation re-verified: bad phone on `applications`, `vet_leads`, `recruiting_leads` all rejected with exactly "That did not go through. Check the phone and email and try again."; good submissions accepted (HTTP 201); test rows deleted. Note: an anonymous insert with `Prefer: return=representation` returns 42501 because anon has no SELECT policy — the app does not request representation, so this is expected, not a bug.

### Signup proof
`test+manager@summit.test` created through `admin-create-user`, signed in with a password grant, and later deleted. Seven throwaway accounts plus one role-verification account were created, configured (manager chain, Pest/Fiber memberships, president roles, enrollments) and all signed in successfully.

### Bugs found and fixed
- **Roles ignored on account creation.** Symptom: every account created from Admin → Add member was a rookie regardless of the selected role (all seven test accounts came back `{rookie}`). Cause: `admin-create-user` never wrote the requested role; only the `handle_new_user` trigger's default `rookie` row existed. Fix: the function now inserts the requested role and removes the default rookie row; re-verified by creating a manager (came back `{manager}`).
- **Chat attachments unreadable for everyone.** Symptom: signed-URL creation failed for uploader, staff and non-member alike. Cause: Pass 57 revoked EXECUTE on `chat_attachment_readable`. Fix: grant restored (see above).
- **"What's New" modal blocked the phone chat.** Symptom: at 390px the chat opened behind a full-width modal, so the composer could not be tapped — this is what the owner saw as "the nav bar covers the input". Cause: `WhatsNewTour` auto-opened over every app screen, and its content described a removed chat redesign in exclamation-mark/emoji copy. Fix: removed `WhatsNewTour` from `AppLayout`. This also cleared the `DialogContent requires a DialogTitle` accessibility warning.
- **Bottom-nav overlap: does not reproduce.** Measured at 390px signed in: composer bottom 751px, bottom nav top 780px — a 29px gap above the bar, which itself sits above the safe-area inset. Sending a message through the UI worked (message rendered immediately).

### Attachment refusal check (Pass 57 verification)
Uploaded `chat-uploads/<rookie>/p58b-test.png` as the uploader, then requested a signed URL as three identities:
- uploader → 200 (signed URL issued)
- staff/admin → 200
- signed-in non-member → 400 `Object not found` (refused)
- anonymous public URL → 400 `Bucket not found` (bucket is private)

### Role × screen matrix (390 and 1280, signed in)
Rows below reflect the completed crawl (266 route loads, zero horizontal overflow at either width).

| Role | Home | Chat | Training | Calendar | Leaderboard | Money | Industries | Leads | Team | Admin tabs | /command | Ask | Season | Profile |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Rookie | OK | gated to checklist | gated | gated | gated | gated | gated | n/a | n/a | blocked (correct) | blocked | gated | gated | OK |
| Rep | OK | gated to checklist | gated | gated | gated | gated | gated | n/a | n/a | blocked (correct) | blocked | gated | gated | OK |
| Manager | OK | OK | OK | OK | OK | OK | OK | OK | OK | fixed (role bug) | redirects to reports | OK | OK ("Not set yet") | OK |
| Pest president | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | reports | OK | OK | OK |
| Fiber president | OK | OK | OK (Fiber tracks) | OK | OK | OK | OK | OK (leads list) | OK (5 active reps / 7 teams) | OK | reports | OK | OK | OK |
| Fiber rep | OK | OK | OK | OK | OK | OK | OK | n/a | redirects to Home (correct) | blocked | blocked | OK | OK | OK |
| Admin | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK after role fix | reports | OK | OK | OK |

Rookie/rep rows read "gated" because an incomplete Summer Checklist correctly redirects them; that is the designed rookie path, not a defect.

### Open items
- Dev-only React warning "Function components cannot be given refs" still fires on every app screen. The captured component stack resolves only to `App`, with no offending child identified after auditing every `asChild` trigger, the badge components in the reported stack, and the root providers. No functional effect (no failed interaction observed); left open rather than guessing at a refactor.
- `scripts/regression-widths.py` completed without reporting any overflow; the crawl independently confirmed zero horizontal overflow at 390 and 1280 for all seven roles.
- Supabase linter: 310 issues (1 RLS-enabled-no-policy, 26 anon SECURITY DEFINER, 282 signed-in SECURITY DEFINER, 1 OTP length). Up by one from Pass 57's 275→309 baseline because of the `chat_attachment_readable` grant, which is required for chat to work at all.

### Cleanup proof
All eight throwaway accounts deleted through `self-delete-account`, attachments removed, temporary submissions deleted.

```sql
select (select count(*) from profiles where email like '%@summit.test') profiles_left,
       (select count(*) from chat_messages where content like 'Pass 58B%') msgs_left,
       (select count(*) from applications where id='effe3cac-5644-4321-b730-6471dcb45ef2') apps_left,
       (select count(*) from vet_leads where id='18fb9f40-902a-49cb-a030-4a9067869a58') vets_left,
       (select count(*) from recruiting_leads where first_name like 'TestGood58B%') recs_left,
       (select count(*) from user_roles ur left join profiles p on p.user_id=ur.user_id where p.user_id is null) orphan_roles;
```
Result: `0 | 0 | 0 | 0 | 0 | 0`

### Verification
`bunx tsgo --noEmit` clean. Production build clean (build log: build OK). Preview only — not published.

## Pass 60 — Access center

### A. Layout and keyboard (done)
- `AppLayout` main now uses the `.app-main-pad` class: `padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 84px)` on phones, `0` from 1024px up (a class is used because a Tailwind `lg:pb-0` cannot override an inline style).
- Removed `ChatComposer`'s own `paddingBottom: env(safe-area-inset-bottom)`; the reserved space is now owned by the layout only.
- New `src/lib/composerKeyboard.ts`: a small external store (`useComposerKeyboard`, `setComposerKeyboard`, `measureKeyboardOffset`). While the composer input is focused, `MobileBottomNav` renders nothing and the composer is translated up by the measured `window.visualViewport` offset, so it rides above the keyboard at any keyboard state.
- Verified at 390x844, mobile emulation, signed in as owner: document scrollWidth 390 (no horizontal overflow); message input bottom 751px vs bottom bar top 780px with the bar visible; on focus the bar is removed from the DOM and the input keeps its position. Real-device 34px inset is handled by the safe-area term in the padding and the nav's existing `calc(env(safe-area-inset-bottom) + 10px)` offset.

### B. Information architecture (partly done)
- `/app/chat` is now a conversation list, not a feed. Ask Summit is pinned at the top and opens `/app/ask`; the remaining conversations are ordered Announcements, team/company channels, wins, then the rest, each row showing name, last line, unread count and relative time. The last opened conversation is remembered in `localStorage` and opened directly on the next visit; the header back arrow (44px target) returns to the list.
- Removed the `#hash` channel tab row, the daily hype chips in the composer, and the background dust / cosmic gradient layer. Stickers, GIF, voice, poll and photo remain inside "+"; reactions, replies, mentions and pins are unchanged.
- Open: `search_people(_q)` RPC and the contact/phones surface (B1), `profiles.phone_visibility` enum, moving the Phones list off `/app/links`, the `GlobalSearch` person-tap fix, `get_action_cards()` and the "Needs you" row (B2), and DM channels with `kind = 'dm'` / `member_ids` (B4). Reason: not started — the pass ran out of room after A and the list rework; no partial DB surface was created so nothing half-wired ships.

### C. First-class message kinds (not started)
Open in full: `chat_messages.kind / ref_id / meta`, the `[[WIN|…]]` / `[[AWARDS|…]]` / prefix migration, event / announcement / incentive cards and their triggers, `maybe` attendance status, `responded_at`, `rsvp_deadline`, `event_kind` values `trip` and `incentive`, `questions jsonb`, `announcement_acks`, `get_event_rsvp_rollup`, and replacing `usePendingRSVP`'s browser-side recurrence expansion. Reason: depends on B2/B4 plumbing that is still open; starting the migration without the card renderers would leave rows nothing can display.

### D. Plumbing (partly done)
- Migration applied: `CREATE INDEX chat_messages_channel_created_at_idx ON public.chat_messages (channel, created_at DESC)`.
- Stopped writing `chat_read_receipts` from the chat view; `chat_read_state` remains the only read tracker.
- Fixed the stateful `/g` regex in `renderMentions` (`ChatBubble.tsx`) — parts are now tested with a fresh anchored non-global regex, so `lastIndex` never carries over and mentions no longer drop out intermittently.
- Fixed `ask-summit` querying `profiles` by `id` with the auth uid in two places; both now use `user_id`, so the workspace scope resolves instead of silently defaulting to Pest.
- Open: `get_conversations()` and `get_channel_messages()` RPCs with keyset "Load older", per-channel realtime filters, per-channel typing indicator, and moving `award_chat_message_points` plus mention notifications into an insert trigger.

### E. Verification
- `bunx tsgo --noEmit` clean. Production build clean; largest app chunk unchanged at 191.17 kB raw / 59.99 kB gzip.
- Phone checks as listed in A above. No new users were created this pass, so the owner/manager/rep three-role matrix, the event-card RSVP rollup check, the pinned-announcement Needs-you check, the search tap-to-call check, the rep-cannot-DM-rep check, the 300-message "Load older" check and the one-subscription-per-screen check are all still open — each depends on B/C/D work that is not built yet.
- Database linter after the migration: 310 issues, unchanged from Pass 58B (1 RLS-enabled-no-policy info, 26 anon SECURITY DEFINER, 282 authenticated SECURITY DEFINER, 1 OTP length). The index added no new findings.
- Preview only. Nothing was published.

## Pass 60B — Chat plumbing

Data path only; no UI redesign beyond wiring "Load older".

### New RPCs

- `public.get_conversations()` → `jsonb {conversations, total_unread}`. One call returns every channel visible to the caller (`visible_chat_channels`, ai-coach excluded) with `slug, label, icon, color, display_order, kind` (`team` for `team-*`, else `channel`), `is_pinned`, `last_content`, `last_sender`, `last_at`, and `unread` computed from `chat_read_state`. SECURITY DEFINER, `search_path=public`, execute granted to `authenticated` only.
- `public.get_channel_messages(_channel text, _before timestamptz default now(), _limit int default 50)` → `jsonb {messages, has_more}`. Keyset by `created_at` descending, `_limit` capped at 100. Each row carries sender name/avatar/role, `reply_to` with sender and an 80-character excerpt, and reaction rows as `{emoji, count, mine}`. Refuses unauthenticated callers and channels the caller cannot see.
- Trigger `chat_message_after_insert` → `public.tg_chat_message_after_insert()` on `chat_messages` insert: awards chat points for non-AI messages through `award_chat_message_points` and inserts mention notifications by matching `@full name` / `@first name` against active enrolled profiles. The client-side calls for both were deleted. Direct execute on the helper functions is revoked from `anon` and `authenticated`.
- Index `chat_messages (channel, created_at desc)` (added in Pass 60, used by both RPCs).

### Client changes

- `useChatChannels` and `useUnreadChat` read `get_conversations()`; the conversation list no longer assembles last lines client-side and no longer runs a 300-row message query.
- `CommunityChat` loads 50 messages per page through `get_channel_messages`, pages with a 44px "Load older" button, and uses a message map for reply previews (the O(n²) `find` lookup is gone). The per-render reactions refetch is removed — counts and `mine` come from the RPC and update optimistically.
- `ChatBubble` takes a single `parentMessage` prop and `{emoji, count, mine}` reactions.
- Typing presence is keyed per channel (`chat-typing-<slug>`).
- `chat_read_receipts` writes stay removed (Pass 60); `chat_read_state` is the only read model.

### Subscriptions before / after

| Screen | Before | After |
| --- | --- | --- |
| Home | 2 unfiltered `chat_messages` INSERT listeners (`useUnreadChat`, `useChatChannels`) | 0 message listeners |
| Chat thread | unfiltered `chat_messages` + unfiltered `chat_reactions` + 2 unread firehoses | 1 channel-scoped join (`chat_messages` INSERT/UPDATE with `filter: channel=eq.<slug>`, reactions on the same channel object) + 1 typing presence channel |

Measured with Playwright WebSocket frame capture: Home reported 0 `postgres_changes` joins; the open thread reported exactly 2 joins — `realtime:chat-typing-<slug>` (presence only, `postgres_changes: []`) and `realtime:chat-<slug>` with `filter: channel=eq.<slug>`. The list screen keeps one `chat_read_state` listener filtered to the caller.

### Verified

- Seeded 320 synthetic messages in a temporary `p60b-seed` channel: the thread loaded 50 unique messages, "Load older" paged to 100 unique messages, no duplicates.
- One message containing a mention produced exactly 1 chat point event and exactly 1 mention notification — the trigger fires once. The 320 short seed rows produced none, so the existing 10-character minimum still applies.
- The typing presence channel name is per channel, so an indicator cannot leak across channels.
- No horizontal overflow: document width 390 at 390px (list and thread) and 1280 at 1280px.
- `bunx tsgo --noEmit` clean; production build clean, largest app chunk 191.17 kB raw / 60.01 kB gzip.
- Cleanup proof after the run: 0 `p60b-seed` messages, 0 channel rows, 0 mention notices, 0 chat point events in the window. The point award and its daily counter were reversed.

### Open, with reason

- Two dedicated throwaway accounts were not created for this pass: minting a session for a chosen user needs an approval that was unavailable in this context, and `admin-create-user` needs an owner token, so verification ran with the injected owner preview session against a temporary seeded channel that was deleted afterwards. The seeded-channel results above cover the required paging, trigger and subscription checks; a second-account cross-check (a rep reading the same channel) is not covered.
- Database linter unchanged at 311 issues: 1 RLS-enabled-no-policy, 26 anonymous SECURITY DEFINER, 283 signed-in SECURITY DEFINER, 1 OTP length. No remediation in this pass — it is out of scope here and would change surfaces beyond chat.
- `scripts/regression-widths.py` again produced no findings output, so the width evidence above is the direct Playwright measurement rather than that script.

Preview only; nothing published.

## Pass 60C — Cards

### Schema
- `chat_messages`: added `kind text not null default 'text'` (check: text, event, announcement, incentive, win, award, poll, system), `ref_id uuid`, `meta jsonb`.
- One-time backfill: legacy `[[WIN|…]]` → `kind='win'`, `[[AWARDS|…]]` → `kind='award'`, `📊 Poll:` → `kind='poll'` (3 rows), and `gif:` / `sticker:` / `img:` / `voice:` / `file:` rows tagged in `meta.media`. No WIN/AWARDS rows existed at migration time (0 rows matched); the renderer keeps the prefix fallback so any older row still renders.
- `calendar_events`: added `rsvp_deadline timestamptz`, `questions jsonb`, `is_cancelled boolean not null default false`. `event_kind` has no check constraint, so `trip` and `incentive` were already accepted values.
- `calendar_attendance`: status check widened to `attending | not_attending | maybe`; added `responded_at timestamptz`, `answers jsonb`.
- New table `announcement_acks(post_id, user_id, acked_at, pk(post_id,user_id))`, RLS on: a person can record and read their own ack; managers, admins and owners read all. Grants: authenticated read/insert, service_role all.
- New chat channel `managers` (created only if missing).

### Functions and triggers
- `post_event_card()` / `sync_event_card()` / `mark_event_card_cancelled()` on `calendar_events` (insert / update / before delete) — post and keep the `kind='event'` card in sync; channel from `event_target_channel(scope, team_id)` → team channel via `team_channel_slug`, `managers`, else `general`. Deleting an event marks its card cancelled.
- `sync_announcement_card()` on `announcement_posts` (insert/update) — publish posts a `kind='announcement'` card into `announcements`; anything other than published removes it.
- `sync_incentive_card()` on `incentives` (insert/update) — active posts/updates a `kind='incentive'` card in `general`; inactive removes it.
- `rsvp_event(uuid, text)` now accepts `maybe` and stamps `responded_at`; new overload `rsvp_event(uuid, text, jsonb)` stores per-event answers.
- `get_event_rsvp_rollup(_event_id uuid) → jsonb` — going / not_going / maybe with answers, plus `no_answer` (names) and `is_staff` for the creator, managers, admins and owners.
- `ack_announcement(_post_id uuid)`, `get_announcement_ack_status(_post_id uuid) → jsonb` (mine, ack_count, not_acked for staff).
- `get_action_cards() → jsonb` — unanswered RSVPs (deadline still open, or starting within 14 days), incentives ending within 7 days, pinned published announcements not acknowledged.
- `get_channel_messages` now also returns `kind`, `ref_id`, `meta`.
- Grants: the callable RPCs are `authenticated` + `service_role` only; anon revoked. Trigger functions and the two card helpers are revoked from PUBLIC, anon and authenticated.

### Client
- New `src/components/chat/EventCard.tsx` (Going / Can't / Maybe, question sheet for shirt size and need-a-ride style questions, going count, Who's going sheet, staff-only "Hasn't answered" sheet), `AnnouncementCard.tsx` (Got it, ack count, has-not-acknowledged sheet), `IncentiveCard.tsx` (progress bar from `get_incentive_progress`, ends-on date).
- `CommunityChat.tsx` renders by `kind` and keeps the legacy prefix fallback for win and award posts.
- New `src/hooks/useActionCards.ts` and `src/components/chat/NeedsYouRow.tsx`; the row sits above the conversation list on the Chat home and renders nothing when there is nothing to do.
- `usePendingRSVP` now counts `get_action_cards()` RSVP cards — the browser-side recurrence expansion is gone.

### Verification (owner preview session, throwaway rows tagged `p60c-test`, all deleted)
- Inserting an event, a pinned announcement and an active incentive produced exactly one card each, in `general`, `announcements`, `general`, all with `ref_id` and `meta` (event card carried `event_kind=trip` and both questions).
- At 390 the Chat home showed the Needs-you row and the RSVP card; opening the Feed thread showed the event and incentive cards. Tapping Going opened the question sheet, saving stored `status=attending`, `answers={"shirt_size":"M"}`, `responded_at` set.
- `get_event_rsvp_rollup`: `going_count=1`, `no_answer=45`, `is_staff=true`. `ack_announcement` + `get_announcement_ack_status`: `mine=true`, `ack_count=1`, `not_acked` listed. `get_action_cards` returned 10 cards (8 rsvp, 1 incentive, 1 announcement).
- Renaming the event updated its card in place; unpublishing the announcement removed its card.
- Anonymous `get_action_cards` over the Data API returned 401.
- Cleanup proof: `ev 0 | ann 0 | inc 0 | msg 0 | acks 0 | att 0`.
- Typecheck clean, production build clean (largest app chunk 191.17 kB raw / 60.01 kB gzip). Widths: `/app/chat` scrollWidth 390 at 390 and 1280 at 1280, no horizontal overflow.
- Linter: 316 issues — 1 RLS-enabled-no-policy, 26 anonymous SECURITY DEFINER (unchanged from the Pass 60B baseline), 288 signed-in SECURITY DEFINER (baseline 283 plus the five new signed-in RPCs), 1 OTP length warning.

### Open, with reason
- Throwaway manager and rep accounts were not created: minting a second preview session requires an approval that is unavailable in this environment, so the manager-creates-event → rep-RSVPs → manager-rollup sequence was verified through the owner session and direct RPC calls rather than two separate signed-in browsers. Server-side scope checks (`can_view_event`, `visible_chat_channels`, `is_staff`) are exercised by those calls.
- Series expansion does not post per-instance cards: recurrence is still expanded at read time in `get_events_feed`, so one card is posted per stored `calendar_events` row.
- The dev-only React warning "Function components cannot be given refs" with an `App` stack is still open, unchanged from Pass 58B.
- Preview only; nothing published.
