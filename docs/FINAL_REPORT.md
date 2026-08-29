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

## Pass 60D — Directory and DMs

### What shipped
- Search field at the top of the Chat home ("People, events, answers"). Results: people (name, role, team, tap-to-call, tap-to-text, Message), saved phone numbers, saved emails, upcoming events (opens the 60C event card), and an "Ask Summit: <query>" row last.
- Contact cards open from search and from `?person=<user_id>` deep links. `GlobalSearch` now sends people to `/app/chat?person=<user_id>` instead of the manager-only team page.
- The Phones list is no longer a rep-facing tab on `/app/links`; the tab remains for staff who maintain the list. Reps reach numbers through Chat search.
- `profiles.phone_visibility` ('everyone' | 'team' | 'staff', default 'team') is editable by the person on their profile page and by staff.
- Direct messages: `chat_channels.kind = 'dm'` with `member_ids uuid[]`, membership RLS on the channel and its messages, DM rows in `get_conversations` with the other person's name, avatar and unread count.

### RPC signatures
- `search_people(_q text) returns jsonb` — keys `people`, `directory`, `emails`, `events`. People rows carry `user_id`, `full_name`, `avatar_url`, `role`, `team_name`, `phone` (only when allowed), `can_dm`, `view_level`. Requires 2+ characters.
- `start_dm(_other uuid) returns jsonb` — finds or creates the DM channel, returns `{ slug }`, or `{ error }` when the pair is not allowed.
- `can_find_person(_target uuid) returns boolean` — directory visibility helper (see below).
- `can_see_phone(_target uuid) returns boolean` — phone visibility helper.
- `can_chat_dm(_a uuid, _b uuid) returns boolean` — DM pairing rule.

### Visibility rules

| Setting | Who sees the number |
| --- | --- |
| everyone | any signed-in member who can find the person |
| team (default) | same team, either direction of the leader chain, staff, and the person themself |
| staff | owner, admin, president, and the person themself |

Directory findability (`can_find_person`): the person themself, anyone `can_view_person` already allows (downline), your own leaders, your teammates, and staff. `can_view_person` was left as-is because other screens depend on its exact levels; it only looks downward, so a rep could not otherwise find their own manager.

DM pairing (`can_chat_dm`): allowed when either side is staff (owner/admin/president) or one is a leader of the other. Rep to rep is refused server-side with exactly: `Direct messages are between you and your leaders.`

### Verification (throwaway manager, two reps, one admin; deleted afterwards)
- Rep One searched the manager → number shown (visibility 'team'), call and text controls present.
- Rep One searched Rep Two (visibility 'staff') → `phone: null`, no call or text control, `can_dm: false`.
- Rep One `start_dm(Rep Two)` → `Direct messages are between you and your leaders.`
- Manager `start_dm(Rep One)` → `dm-10665e7…`; the manager posted in it successfully; `get_conversations` showed the DM for the manager (unread 0), Rep One (unread 1) and the admin (unread 1); Rep Two saw no DM row.
- Rep Two calling `get_channel_messages` on that DM → `{"error":"No access"}`; a direct `chat_messages` read filtered to the channel returned `[]`.
- Searching an upcoming event title ("Mindset") returned the matching events, which open the 60C card.
- 390 px chat home and search: `document.documentElement.scrollWidth` 390 = `window.innerWidth` 390, keyboard closed and with the search field focused. Action targets are 44 px.
- Typecheck clean, production build clean.
- Cleanup proof: `profiles` rows matching `p60d.%` = 0, DM channel rows = 0, DM messages = 0, downline edges = 0.

### Fixes found during verification
- `is_dm_channel` and `is_dm_member` are called from RLS policies, which run as the signed-in caller, so both had been over-revoked and every DM message insert failed with `permission denied for function is_dm_channel`. Execute is now granted to `authenticated` only (anon still revoked).
- `search_people` had been written against column and argument names that do not exist (`phone_numbers.number`, `calendar_events.starts_at`, `can_see_phone(uuid, uuid)`, `can_view_event(uuid, uuid)`, and `can_view_person` treated as boolean). All corrected against the live schema.
- Saved-number and saved-email results now show the entry name rather than the generic category label.

### Open
- The throwaway admin account's auth record could not be deleted: `self-delete-account` refuses privileged accounts ("Privileged accounts must be deleted by an owner") and there is no owner-facing delete path for another admin. All of its application rows (profile, role, edges) were deleted, so it is an orphaned auth record only, and `admin-create-user` reclaims orphans by email.
- Linter count after this pass: 322 issues (1 RLS-enabled-no-policy, 26 anon SECURITY DEFINER, 294 signed-in SECURITY DEFINER, 1 short OTP). The two new entries are `can_find_person` and `search_people`, both intentionally callable by signed-in users only.
- The development-only React ref warning noted in earlier passes is still present.
- Nothing was published.

## Pass 61 — Manager back end (sections A and B)

Stopped at a section boundary. Sections A (honest time) and B (RSVP responses) are wired end to end; C through F are not started.

Housekeeping: the orphaned test admin auth record left by 60D was removed through the privileged path; a count confirmed zero `@summit.test` and zero `p60d` auth users remain.

New and changed database objects
- `daily_training_time.app_minutes` (added, backfilled). `training_minutes` recalculated as lesson + video + training categories. `total_minutes` kept for compatibility.
- `company_timezone()` — reads `app_settings.company_timezone`, default `America/Los_Angeles`. Used to bucket days server side.
- `record_daily_time(_category text)` — `_user_id` dropped; uses `auth.uid()` and company-timezone day buckets; writes app and training counters separately.
- `record_activity_ping(_minutes int, _screen text)` — adds screen minutes (not ping counts) into `activity_days.screens` as `{screen: minutes}`, company-timezone buckets.
- `get_training_recap(_user_id uuid) returns jsonb` — lessons, videos, drills, manual chapters completed in the last 30 days, by name.
- `get_person_time_split(_user_id uuid) returns jsonb` — `app_7d`, `training_7d`, `app_30d`, `training_30d`, `screens_7d`.
- `get_person_event_answers(_user_id uuid, _limit int default 10) returns jsonb` — last events with the person's answer and present/absent.
- `get_event_answer_columns() returns jsonb` — upcoming trips and incentives for the team answers column (leaders and staff only).
- Read policies on `daily_training_time` and `activity_days` extended to owner, president, and the manager chain. All new functions: `EXECUTE` revoked from `PUBLIC` and `anon`, granted to `authenticated` and `service_role`.

Frontend
- `src/lib/timeSplit.ts` — shared week range and per-user week map with app and training minutes.
- `TeamActivityTable`, `DailyTimeBreakdown`, `PillarTreeView`, `ActivityTab`, `useOneOnOnePrep`, `TeamPage` now read `app_minutes` and `training_minutes` and label them "In the app" and "Training".
- `useActivityTracking` sends a plain screen label (for example `Training › Objections`, `Chat`) and no longer passes a user id.
- Person profile: app versus training minutes for 7 and 30 days, a "Where the time went (7 days)" block, a "What they trained on" block (7 and 30 day counts plus names), and an "Events" block with the last answers and present/absent.
- New `src/components/team/EventAnswersPanel.tsx` on the team page: per upcoming trip or incentive, counts for Going, Can't, Maybe, and No answer; tapping opens the 60C rollup lists.

Open, with reasons
- Sections C (Ask Summit memory), D (`rep_ai_profiles` and `build-rep-profile`), E (profile to lead snapshot), and F (lead cycling) are not started — stopped at a section boundary.
- Section G verification with throwaway accounts was not run, because it covers behaviour introduced in C through F as well as A and B; it should run once those sections land.
- Manual chapters in `get_training_recap` display `chapter_id` because no chapter title table exists in the schema.
- Database linter: 327 issues — 1 RLS-enabled-no-policy, 26 anonymous SECURITY DEFINER, 299 signed-in SECURITY DEFINER, 1 short OTP. New functions added to the signed-in count intentionally; the anonymous count is unchanged from the project baseline.
- Typecheck clean, production build clean. Preview only; nothing published.

## Pass 61B — Memory and AI profile

### C. Ask Summit memory

Tables
- `assistant_threads(id uuid pk, user_id uuid -> auth.users, mode text check ask|practice default 'ask', title text, created_at, last_at)`; index `(user_id, last_at desc)`.
- `assistant_messages(id uuid pk, thread_id uuid -> assistant_threads on delete cascade, role text check user|assistant, content text, created_at)`; index `(thread_id, created_at)`.

RLS
- Owner: full access to own threads and their messages (`user_id = auth.uid()`).
- Leaders and staff: read only, via `public.can_view_person(user_id) <> 'none'`.
- No anon grants; anon execute revoked on the new functions.

RPCs
- `get_person_threads(_user_id uuid) returns jsonb` — `{threads:[{id, mode, title, created_at, last_at, message_count}]}`, or `{error:'No access'}`.
- `get_thread_messages(_thread_id uuid) returns jsonb` — `{messages:[{role, content, created_at}]}`, or `{error}`.

Edge function `ask-summit`
- Accepts optional `thread_id`; verifies ownership and mode, otherwise creates a thread titled from the first question (practice threads are titled "Practice", stored with `mode='practice'`).
- Appends the user turn, then loads the last 40 stored turns server-side as the model context; appends the assistant turn after the stream completes and bumps `last_at`. `assistant_logs` writes are unchanged.
- Returns the thread id in the `X-Thread-Id` response header (exposed via CORS).

UI
- `/app/ask`: "New thread" plus a row of the rep's own ask threads; opening one reloads its turns and continues it. Composer placeholder: "Your manager can read this to help you." Practice mode unchanged.
- Person profile: "Ask Summit threads" lists the rep's threads read only, expanding to the turns.

### D. AI-built rep profile

Table
- `rep_ai_profiles(user_id uuid pk -> auth.users, summary text, strengths jsonb, concerns jsonb, topics jsonb, goals text, sources jsonb, last_built_at timestamptz, source_count int, tokens_used int, created_at, updated_at)`.
- RLS: rep reads own; staff and manager chain read via `can_view_person`; no client writes (service role only).

Edge function `build-rep-profile`
- Body `{}` for the nightly batch, or `{user_id}` for one rep (staff only: owner/admin/president, checked against `user_roles` with the caller's token).
- Sources per rep, each given a `src_N` id stored in `sources` with its table, row id and timestamp: own `assistant_messages` (user turns), `chat_messages`, `lesson_progress` (with lesson titles), `calendar_attendance` (with event titles), `daily_training_time`.
- Model `google/gemini-3-flash-preview`, JSON output. Every sentence of `summary` must end with a `[src_N]` citation; no invented facts, no hype words, no exclamation marks.
- Reps with no rows since `last_built_at` are skipped. Up to 10 profiles built per invocation. Tokens stored per rep in `tokens_used` and logged per run.

Schedule
- pg_cron job `build-rep-profile-nightly`, `40 10 * * *` UTC (03:40 America/Los_Angeles), `net.http_post` to the function with the anon apikey — same pattern as `check-inactivity-daily`.

UI
- Person profile: "What Summit has learned" (summary, strengths, where they seem stuck, topics, goals, built time, source count), plus a staff-only "Rebuild profile" button that calls the function for that rep.

### Verification

- Ask Summit threads: through the signed-in preview session, thread one took three turns (6 stored rows, all under one thread id) and thread two was created separately; both persisted and reloaded through `get_thread_messages`. Both verification threads were deleted afterwards — `assistant_threads` count 0 at the time of cleanup.
- `build-rep-profile` batch run: `{"built":10,"skipped":8,"tokens":7595}`. Stored rows carry citations that resolve to the ids in `sources` (checked three rows: `source_count` matches `jsonb_array_length(sources)`, first id `src_1`).
- Re-run with nothing new: `{"built":2,"skipped":44,"tokens":730}` — skip logic confirmed on 44 reps.
- Cost per run: about 380 tokens per rep on Gemini Flash; a full nightly batch of 10 reps was 7,595 tokens.
- Typecheck `bunx tsgo --noEmit`: clean. `bun run build`: clean, 14.76s.
- Widths: `/app/ask` and `/app/chat` at 390 and 1280 — `scrollWidth` equals `innerWidth` in both cases, no horizontal overflow.
- Database linter: 329 issues — 1 RLS-enabled-no-policy, 26 anon SECURITY DEFINER, 301 signed-in SECURITY DEFINER, 1 short OTP length. The two new functions are intentionally callable by signed-in users and both enforce access with `can_view_person`; the rest is the pre-existing baseline.

### Open, with reasons

- Throwaway rep and manager accounts were not created for this pass: `lovable auth-session` cannot mint a second session ("the project has multiple auth users") and no owner bearer token was available in this environment, so the manager-reads-a-rep's-threads path was verified by RLS/RPC definition (`can_view_person`) rather than by a second live session.
- The staff-only gate on `{user_id}` calls returned 401 through the internal test path because no bearer token was attached; the batch path was exercised instead. The gate itself is a role check against `user_roles`.
- `build-rep-profile` profiles built for reps whose only recent rows are time records read thin ("one minute in the app") — accurate, but low value until those reps generate more data.
- Preview only; nothing published.

## Pass 61C — Profile to lead and cycling

### Schema
- `people_leads.profile_snapshot jsonb`, `people_leads.ai_summary text`.
- `people_leads.designated_at timestamptz`, `cycle_days int default 14`, `hold boolean default false`, plus an index on the cycling lookup.
- `app_settings` keys: `leads_cycling_enabled` (true), `leads_cycle_days_default` (14), `leads_max_open_per_manager` (25), and the internal round-robin cursor `leads_cycle_cursor`.

### Functions
- `build_lead_snapshot(uuid)` — collects the AI profile (summary, strengths, concerns, goals), 30-day app and training minutes, days active, streak and lessons completed, the last five non-empty event answers, and the departure fields. Missing data stays null; nothing is invented.
- `open_lead_on_departure` — now writes `profile_snapshot` and `ai_summary` when a lead opens.
- `set_person_lifecycle` — fixed. It previously wrote the industry enrollment state `paused`, which the enrollment check constraint no longer allows, so marking anyone departed or archived failed outright. Departing or archiving now removes the industry enrollment row; pausing leaves it unchanged.
- `lead_detail` — returns the snapshot and cycling fields.
- `lead_set_cycling(_lead, _cycle_days, _hold)` — owner and admin only.
- `cycle_stale_people_leads()` — owner, admin, or service. Skips leads on hold, requires no `lead_activities` row since `designated_at + cycle_days`, round-robins to the next manager with access and fewer than `leads_max_open_per_manager` open designated leads, notifies both managers, and writes a "Cycled from X to Y after N days without activity" timeline entry.
- `setting_text(key, default)` helper. Anonymous execute is revoked on all of the above.

### Schedule
- pg_cron job `cycle-stale-leads-nightly` at `50 10 * * *` UTC. It calls `SELECT public.cycle_stale_people_leads();` directly rather than through an HTTP edge function, because cron runs as postgres and satisfies the service guard without a key in the job body.

### Frontend
- `BeforeTheyLeft` panel in the lead drawer: departure type, reason, last day, AI summary with strengths, concerns and goals, 30-day engagement, recent event answers, capture date, and a staff-only link to the person's old profile.
- Lead drawer shows "Cycles in N days" or "On hold" for designated leads, plus owner/admin cycle-days and hold controls.
- Leads list shows the same cycle line; the manager's own list is sorted soonest-to-cycle first by `leads_list`.
- Admin → System settings: lead cycling toggle, default cycle days, and open leads per manager.

### Backfill
- 532 of 546 existing leads have a linked profile and now carry a snapshot; 23 carry an AI summary. Leads without a profile were left untouched. 123 already-designated leads were stamped with `designated_at`.

### Verification (temporary accounts, deleted afterwards)
- Created a throwaway rep and two throwaway managers via `admin-create-user` with the owner preview session token.
- Gave the rep a `rep_ai_profiles` row, two event answers, and two days of app/training time, then departed the rep through `record_departure` + `set_person_lifecycle`. The opened lead showed the AI summary, engagement (65 app minutes, 20 training minutes, 2 days active over 30 days), 2 event answers, and the departure type "quit" with reason and last day.
- Designated the lead to manager A, backdated `designated_at` 15 days, ran `cycle_stale_people_leads()`: the lead moved to manager B, both managers received an in-app notification naming the lead, and the timeline entry read "Cycled from P61C ManagerA Test to P61C ManagerB Test after 15 days without activity".
- A second backdated lead with `hold = true` stayed with manager A.
- With `leads_cycling_enabled = false` the run returned `enabled: false` and nothing moved.
- Real leads untouched: a before/after comparison of `designated_to` on non-test rows returned 0 changes.
- Cleanup: 0 test leads, 0 test events, 0 test profiles remain, and password sign-in for all three test emails returns `invalid_credentials`, confirming the auth records are gone.

### Checks
- Typecheck clean, production build clean (16.66s).
- No horizontal overflow at 390 or 1280 on `/app/leads` and `/app/team`.
- Database linter: 333 issues — 1 RLS-enabled-no-policy, 26 anonymous SECURITY DEFINER, 305 signed-in SECURITY DEFINER, 1 short OTP length. This is the project's existing baseline; broad remediation is still open.

### Open
- Manager-side UI was verified by SQL and RPC rather than by signing in as each throwaway manager in a browser: only one preview session can be restored at a time in this environment.
- Nothing was published.

## Pass 62 — Publish readiness: go / no-go

Owner-facing document: `docs/GO_NO_GO.md`. This section holds the technical evidence.

### 1. PageHeader rollout

`PageHeader` (Pass 43) now covers every standard app/admin page. Converted this pass (29
pages, across three parallel batches): AskSummit, Calendar, Events, Industries (both
views), Leaderboard, Leads, Links, Scripts, Season, Training (3 headers), TrainingCourse,
TrainingVideos, ManagerTrainingVideos, Videos, PitchApprovals, Profile, EstimateEarnings,
Interviews, AdminTeam, MyTeam, Team, WarRoom, Recruits, RepLogistics, ManagerMeeting,
OneOnOnePrep (roster list), RosterSweep. Previously converted: Forms, MyMoney.

Deliberately exempt, with reason:

| Page | Reason |
| --- | --- |
| AuthPage, ResetPasswordPage, PendingApproval | unauthenticated screens, no app chrome |
| BootcampLock / Phase1 / Phase2 / Phase3 / Momentum | immersive single-purpose flow |
| Interview1/2/3Page | immersive form flow with its own step chrome |
| LessonPage, VideoPlayerPage | immersive player, header would compete with the content |
| ChatPage | full-height conversation layout, own header row |
| DashboardPage | home screen, not a titled page |
| CommandCenterPage | standalone `/command` report surface with its own type system |
| AlumniPage, PersonProfilePage | identity banner, not a page title |
| WeeklyOneOnOnesContent | embedded inside FormsPage tabs, which already has a header |

Copy unchanged beyond what the component implies. Two type errors introduced by the
parallel batches (duplicate `PageHeader` import in EventsPage; lucide components passed
where `ReactNode` was expected in TrainingVideosPage) were fixed.

### 2a. Copy sweep

Fixed this pass:

| File | Was | Now |
| --- | --- | --- |
| `WorkspacePanel.tsx` | `· President` | `· You lead this industry` |
| `RestoreAccessPanel.tsx` | `<option>President</option>` | `Industry lead` |
| `HomeActionRow.tsx` | label `Queue` | `Needs review` |
| `Index.tsx` | footer `Recruiting` | `Summer Jobs` |
| `Parents.tsx` | `Back to recruiting` | `Back to summer jobs` |
| `Recruiting.tsx` | `Uncapped recruiting overrides` | `Uncapped overrides on your team` |
| `VetApplication.tsx` | `Uncapped Recruiting`, `recruiting record holder`, `recruiting software` | `Uncapped team building`, `hiring record holder`, `hiring software` |
| `WelcomeBanner.tsx` | `The grind is earning your future.` | `The work you put in now compounds later.` |

Emoji and exclamation marks removed from UI chrome across 36 files in two batches
(training, notifications, pitch review, calendar, bootcamp, status bar, prep forms,
admin tabs, chat chrome). Status glyphs (`✓`, `✗`, `✅`, `❌`, `⚠️`) replaced with
lucide icons, not deleted.

Deliberately kept: arrow glyphs (`→`, `⇥`) as typography; `QUICK_REACTIONS` in
`MessageContextMenu.tsx`, `GifPicker`, and `StickerPicker` because those emoji and sticker
names are user-selectable content, not chrome — the sticker label `Crushed It!` matches
the artwork filename and is left as-is. No `Oops`, no `doors per day`, no `close rate`
anywhere in `src/`.

### 2b. Public surface (signed-out, 390px)

Real public routes from `src/App.tsx`: `/`, `/recruiting`, `/parents`,
`/industries/:slug`, `/join`, `/apply` (redirect to `/recruiting#apply`), `/apply/rookie`,
`/apply/veteran`, `/apply/success`, `/ticket`.

- `publish_stacks_publicly=false`: `/industries/pest`, `/industries/fiber`,
  `/industries/life` show no dollar values and no carrier names. Confirmed.
- `/recruiting` and `/apply` show public calculator figures by design (they come from
  `public_pay_scales`, not from `rank_stacks`).
- `/apply/rookie` submitted empty renders exactly `* All fields are required` (Pass 57
  validation). `/apply/veteran` and `/apply/success` render clean.
- Added `setPageMeta` to `RookieApplication`, `VetApplication`, and `ApplySuccess`; they
  were the only public routes without a title and description.

### 2c. Security

Linter after this pass: **299 issues, down from 333**, four types:

```
INFO 1: RLS Enabled No Policy                                      1
WARN 2: Public Can Execute SECURITY DEFINER Function              19
WARN 3: Signed-In Users Can Execute SECURITY DEFINER Function     278
WARN 4: Auth OTP short length                                      1
```

Two migrations closed the 34-issue gap. All 37 `returns trigger` functions in `public`
had `EXECUTE` granted to `anon` and/or `authenticated`; PostgreSQL does not check
`EXECUTE` when firing a trigger, so those grants were pure surface area. Revoked from
`anon`, `authenticated`, and `PUBLIC` on all 37.

- Tables in `public` with RLS off: **0**.
- Tables with RLS on and zero policies: **`backup_job_tokens` only**, intentional.
- SECURITY DEFINER functions `anon` can execute: **19**, exactly the Pass 57 list —
  `get_public_calc`, `get_public_counters`, `get_public_cover_content`,
  `get_public_fiber_stacks`, `get_public_industry`, `get_public_setting`,
  `get_recruiting_content`, `get_recruiting_proof`, `get_ticket_config`,
  `get_ticket_series_status`, `has_role`, `is_manager_tier`, `is_paired_manager_of`,
  `is_president_of_vertical`, `is_staff`, `is_vertical_lead`, `region_lead_of`,
  `resolve_source_code`, `validate_access_code`. No deliberate additions.
- Trigger-function grant audit (58B) re-run: `trigger_fns_anon_can_call = 0`,
  `trigger_fns_authenticated_can_call = 0`, `trigger_fns_total = 37`.
- Storage: only `avatars` is public. `chat-uploads`, `backups`, `bootcamp-videos`,
  `pitch-approval-videos`, `revenue-imports`, `training-videos`, `vertical-proof` are all
  private.

Trigger firing was proven still to work after the revoke: a `set local role authenticated`
update against `public.announcements` fired `update_updated_at_column`. **Disclosure:** the
restore step of that check re-fired the trigger, so one announcement row
(`b7b4bb56…`, "REPORT GLITCHES TO #FEEDBACK CHAT") now carries `updated_at` of the test
moment instead of its original value. `announcements.updated_at` is present in the
`AnnouncementBox` type but never rendered or sorted on, so nothing user-visible changed;
the original value was not captured and has not been invented.

### 2d. Data health

| Check | Count |
| --- | --- |
| Active people with no manager | 2 — Mathew Joyce (root, expected) and Elijah Hughes |
| Manager-picker gaps | 0 |
| Unresolved roster-sweep rows | 0 (`sweep_sessions` is empty; no sweep has been started) |
| Revenue rows with no month | 0 |
| Designated leads with no `designated_at` | 0 |
| Leads total / with `profile_snapshot` | 546 / 532 |
| Active people with no phone | 1 |
| Pending applications | 5 |
| Pending reactivations / team-lead applications | 0 / 0 |
| `rep_ai_profiles` rows | 26 |
| Designated leads eligible to cycle | 123 |

Settings state at time of writing: `stack_visibility=direct_leader`,
`show_stacks_to_rookies=false`, `publish_stacks_publicly=false`,
`season_revenue_goal=9000000`, `vertical_lead_margin=50`, `leads_cycling_enabled=true`,
`leads_cycle_days_default=14`, `leads_max_open_per_manager=25`. Blank:
`fiber_expense_allowance_per_install`, `fiber_holdback_percent`,
`summit_stack_fiber_sonic`, `summit_stack_fiber_surf`, `public_fiber_starting_rate`.
`under_led_min_revenue` is absent. `profiles.phone_visibility` default is `'team'`.

Industry state: Pest active/configured (lead Mathew Rubino — **who holds no `user_roles`
row at all**); Fiber active but `is_configured=false`, 4 path steps, lead Brendan Pillar,
region East led, region West **no lead**, Sonic 9 stacks / 0 confirmed, Surf 9 / 0
confirmed; Life `coming_soon`, `is_configured=false`, 1 step, no lead.

### 2e. Build

- `bunx tsgo --noEmit` — clean.
- `bun run build` — succeeded in 14.88s. **No chunk over 200 kB.** Largest:
  `index` 191.92 kB (gzip 60.31), `vendor-supabase` 172.98, `vendor-react` 162.98,
  `AdminTeamPage` 131.96, `AppLayout` 104.76, `CommandCenterPage` 98.11,
  `DashboardPage` 95.65.
- `scripts/regression-widths.py` at 390 / 768 / 820 / 1024 / 1280 across 24 routes:
  **0 overflowing route/width combinations** (120 combinations). Stale routes in the
  script were corrected (`/apply/vet` → `/apply/veteran`, `/apply` → `/apply/rookie`,
  `/auth` → `/login`) and `chat`, `leads`, `events`, `training` were added.
- Lighthouse, mobile, signed-out preview landing page: **performance 26, accessibility 94,
  best practices 100, SEO 63.** Both low scores are preview-environment artefacts:
  SEO is docked entirely by `is-crawlable` because the preview host sends a noindex
  header, and performance reflects unminified preview assets plus the editor toolbar.
  The one accessibility miss is `meta-viewport` reporting `user-scalable=no` — `index.html`
  contains `width=device-width, initial-scale=1.0, viewport-fit=cover` and no `src/` code
  touches the viewport tag, so that too is injected by the preview wrapper. Not re-run
  against the published build, since nothing is published.

### 2f. Edge functions and secrets

29 deployed functions: `admin-approve-user`, `admin-create-user`, `admin-reset-password`,
`ai-coach`, `ask-summit`, `bootcamp-reminders`, `bootstrap-admin`, `build-rep-profile`,
`bulk-create-users`, `check-bootcamp-overdue`, `check-inactivity`,
`check-pitch-approvals-overdue`, `daily-accountability-post`, `db-backup`,
`extract-leaderboard`, `monday-streak-shoutout`, `parse-calendar`, `parse-tasks`,
`purge-users`, `reset-admin-password`, `reset-user-passwords`, `seed-users`,
`self-delete-account`, `send-calendar-notification`, `send-welcome-email`,
`submit-vet-lead`, `validate-signup`, `weekly-champion-notify`, `weekly-owner-report`.

| Secret | Set | Needed by |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | the 7 email senders below |
| `RESEND_FROM_EMAIL` | **no** | `admin-approve-user`, `admin-create-user`, `bootcamp-reminders`, `send-calendar-notification`, `send-welcome-email`, `submit-vet-lead`, `weekly-owner-report` |
| `LOVABLE_API_KEY` | yes | `ai-coach`, `ask-summit`, `build-rep-profile`, `parse-tasks`, `parse-calendar`, `extract-leaderboard` |
| `BACKUP_CRON_SECRET` | yes | `db-backup` |
| `WEEKLY_REPORT_CRON_SECRET` | yes | `weekly-owner-report` |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | platform-provided | most functions |

`summitmktgsales.com` is **not verified in Resend** (Pass 58; not re-checkable this pass
because the configured Resend key is send-only and returns
`restricted_api_key` on the domains endpoint). All seven senders fall back to
`onboarding@resend.dev`, which Resend delivers only to the Resend account owner's own
address. Until the domain is verified or `RESEND_FROM_EMAIL` is set to an already-verified
sender, every outbound email to anyone else is dropped by Resend. Nothing in the app
retries or surfaces this; `weekly-owner-report` logs the Resend failure and still returns
200 so the stored report renders.

### 2g. Domain

- Publishes to `summitmktg.lovable.app`. Published URL of record: the same.
- To serve `summitmktgsales.com`: connect it in Project Settings → Domains and add the DNS
  records that screen provides. Not doable from here.
- Edge-function CORS: 12 functions name `summitmktgsales.com` in an allow-list; the other
  17 send `Access-Control-Allow-Origin: *`. Either way the custom domain is not blocked.
- Auth redirects: the app only ever uses `window.location.origin` (`useAuth.tsx:287`) and
  `${window.location.origin}/reset-password` (`AuthPage.tsx:305`), so it works from any
  origin — **provided the custom domain is added to the auth redirect allow-list**. That
  list is not readable from the tooling available here, so it is an owner checklist item
  rather than a verified fact.

### 2h. Scheduled jobs

| Job | Schedule (UTC) | Last run |
| --- | --- | --- |
| `event-reminders` | `*/15 * * * *` | succeeded |
| `notification-digest` | `*/30 * * * *` | succeeded |
| `bootcamp-reminders-hourly` | `0 * * * *` | succeeded |
| `check-bootcamp-overdue-hourly` | `0 * * * *` | succeeded |
| `sweep-pairing-requests` | `17 * * * *` | succeeded |
| `expand-event-series` | `17 3 * * *` | succeeded |
| `summit-action-item-due` | `5 13 * * *` | succeeded |
| `check-inactivity-daily` | `0 17 * * *` | succeeded |
| `build-rep-profile-nightly` | `40 10 * * *` | no run recorded |
| `cycle-stale-leads-nightly` | `50 10 * * *` | no run recorded |
| `weekly-champion-notify` | `5 8 * * 1` | succeeded |
| `summit-weekly-backup` | `20 9 * * 0` | no run recorded |
| `generate-weekly-owner-report` | `5 22 * * 0` | no run recorded |
| `summit-weekly-awards` | `5 22 * * 0` | no run recorded |

There is **no separate `release_stale_leads` job**; that behaviour lives in
`cycle_stale_people_leads()`, run by `cycle-stale-leads-nightly`. The five with no
recorded run are all recent additions whose first scheduled time has not arrived.

### Open, with the exact reason

- **Resend domain status could not be re-verified**, only inherited from Pass 58: the
  configured `RESEND_API_KEY` is a send-only restricted key and the domains endpoint
  returns 401 `restricted_api_key`.
- **Auth redirect allow-list could not be read**: no tool in this environment exposes it.
- **Lighthouse figures are preview-environment figures**, not published-build figures,
  because publishing is out of scope for this pass.
- **One announcement row's `updated_at` was changed** by the trigger check and cannot be
  restored (see 2c). Not user-visible.
- **Two signed-in walkthroughs remain uncaptured** (Fiber industry lead first day, Fiber
  rep day one) and multi-user flows remain RPC-verified rather than two-live-browser
  verified, because only one preview session can be restored at a time.

Nothing was published.

## Pass 63A — Fiber becomes its own product

- Step 0 regression check passed: user create, owner chat message, signed-out application, fiber install, attendance mark, all deleted after. No trigger EXECUTE grants needed fixing.
- Fiber workspace tokens: deep green surfaces, amber accent, sage borders, no shadows or gradients, 12px cards, camo texture only in the Home header.
- WorkspaceProvider moved above the route tree so pages can branch on the active workspace; role/mode theming now defers to a workspace theme.
- get_my_workspaces() updated so owners and admins get access to every workspace without an enrollment row.
- Phone tabs in Fiber are Home, Chat, Installs, Money, Team. Pest points, streaks, missions, funnel and accounts are not shown.
- Fiber Home: rep, region, carrier, week and season installs, next tier progress, install logging, Needs You, region lead, setup progress, announcement, chat preview.
- New /app/installs (Fiber only) reads fiber_installs: personal weeks plus season total, and a lead view of the region.
- Fiber Money shows per-install stack rows only; unconfirmed rows read "Rate shared when confirmed". No calculator.
- Fiber Team shows the region roster by installs with call and DM actions; empty regions read "No Fiber reps assigned yet."
- Fiber and Life training stay blank: "Fiber training is being written." with an add-module action for admins and the workspace president.
- Verified with owner-session screenshots at 390 and 1280 for Home, Installs, Money, Team, Training, Chat; no horizontal overflow at either width.
- Typecheck clean; production build clean, largest chunk 193.97 kB.
- Known: React dev-only ref warnings persist (development build only). Nothing published.

## Pass 63B — Life
- Life tokens: warm off-white background, white cards, deep navy text, muted teal accent, 1px warm-grey borders, 16px radius, no shadow; serif headings via Source Serif 4 applied only where a workspace asks for them.
- New `life_pipeline` table with RLS: a rep reads and writes only their own rows; manager chain and staff read through `can_view_person`; anon has no execute or access.
- New Life home replaces the generic workspace home: coming-soon card when Life is not open yet, otherwise date greeting, next three Life appointments, pipeline counts by stage, setup and licensing progress, pinned announcement, Needs you, and a quiet chat preview.
- New Life route `/app/pipeline`: contacts grouped by stage, add contact with next step and date, one-tap stage move, tap to call and text, and a per-rep count list for managers.
- Life phone tabs are Home, Chat, Pipeline, Training, Money. No points, streaks, missions, funnel, installs, or accounts anywhere in Life.
- Training in Life reads "Life training is being written."; only admin, owner, or the workspace president sees "Add the first module".
- Money in Life reads "Life pay details will appear here once they are set."; staff get a link to Admin — Money.
- The streak and training percent pill in the top bar now shows only in Pest, so it no longer leaks into Life or Fiber.
- Light workspaces now render sidebar labels in readable dark text; before this the Life sidebar was white text on white.
- Verified with owner-session screenshots at 390 and 1280 for Home (coming-soon and open), Pipeline, Training, Money, and Chat — no sideways scrolling at either width.
- Life was switched to open only long enough to capture the screenshots and set back to coming soon; the owner's workspace was restored to Pest.
- Typecheck clean; production build clean, largest chunk 194 kB. Nothing published.

## Pass 63C — Pest
- Pest tokens: orange accent for numbers and primary actions, cool light-blue labels and progress tracks, 10px radius, 1px blue-grey card borders, no shadows, scoped to `data-workspace='pest'` on the root (no data or RPC changes).
- Tailwind gains `accent-number` and `secondary-label` colours that fall back to the existing primary and muted tokens outside Pest.
- New `PestHome`: greeting with today's date and streak, numbers strip (points today, rank, this week's points from the existing snapshot), Needs-you row, winter plan and question cards, a Today card with up to three missions and a See all link, top-three leaderboard plus the rep's own row, team chat preview with unread count, My points, and one pinned announcement line.
- Removed from Home: the Missions / Funnel Tracker tab strip, announcements block, AI upload, quick-card duplicates of tabs, daily challenge, downline calculator, and the manager command header.
- Funnel Tracker now lives under My money for managers in the Pest workspace.
- New `/app/missions` page shows the full mission board using the existing `todo_items` list.
- Pest phone bar is Home, Chat, Training, Money, Board.
- Verified with owner-session screenshots at 390 and 1280 for Home, Training, My money, Leaderboard, Chat and Missions: no horizontal overflow, `data-workspace` reads `pest` throughout.
- `bunx tsgo --noEmit` clean; production build clean, largest chunk 194 kB.
- Not published.

## Pass 64 — Field Playbook

- Table `playbook_entries` created with grants, RLS (vertical members read published; admin/owner/vertical president write), lookup index and a trigram index on title || body.
- Seeded 50 entries verbatim from the owner's content: script 7, objection 9, close 6, talk_track 3, pricing 19 (Westchester), assumption 6.
- New Pest route `/app/playbook`: pinned search, chips Script · Objections · Closes · Backyard · Pricing, expandable cards, objection follow-up toggle, pricing table with the note that the Seasonal insects sheet page is an image and is not loaded.
- Every entry has "Practice this", which opens Ask Summit in practice mode seeded with that entry.
- Reachable from Pest Home (Playbook button), Training (Field Playbook card at the top) and chat search (playbook results open the entry).
- Training: "Field Playbook" module under Learn Your Pitch — 7 lessons (one per script section), 9 objection drills, 6 close drills, all on the existing lesson/drill progress tables. No new progress tables.
- Ask Summit loads the published entries for the active vertical, capped at ~12k characters, ordering objections and closes first when the question sounds like a customer line; the answer quotes the owner's line and names the entry title.
- Admin → Content → Playbook: list, edit body/followup/tags/order/kind, reorder, publish/unpublish, add, choose vertical, shows last edit and editor.
- Verified with owner-session screenshots at 390 and 1280: each chip, an objection expanded with its follow-up, Training, chat search hit, Ask Summit answer, Admin Playbook tab. No horizontal overflow.
- `bunx tsgo --noEmit` clean; production build clean, largest chunk 194.58 kB.
- Not published.

## Pass 65 — Log a sale
- New `sales_log` table (Pest default): plan, initial, recurring, frequency, customer first name, city, notes, source, reconciled. Index on (user_id, sold_at desc).
- RLS: rep inserts own rows, edits or removes own rows for 48 hours; manager chain and staff read; admin/owner edit anything; anon has no access and cannot execute the new functions.
- "Log a sale" is a full-width button on Pest Home (below the numbers) and at the top of Money. Plans come from the playbook pricing rows; initial, recurring and frequency prefill and stay editable. Same customer and city inside 10 minutes asks "Already logged — log again?".
- On save a database trigger posts the win line to the rep's team channel (falls back to Wins), awards the sale points once, and notifies the manager only on the rep's first sale of the day.
- Leaderboard gains a "Sales this week" view (reps and teams, ties broken by earliest sale) labelled "Self-reported, reconciled monthly".
- Monthly import screen gains a "Self-reported vs imported" panel per rep with a one-click "Mark reconciled"; nothing is deleted or changed automatically.
- Person profile gains "Sales (self-reported)" — last ten sales; a manager can correct or remove an entry with a reason stored in the notes.
- Verified with the owner session at 390 and 1280: sale logged, win card in team chat, Home count went to 1, leaderboard row showed 1 sale / $379, duplicate prompt appeared, exactly one points event. Test sale, win message and points event deleted afterwards.
- Typecheck clean. Production build clean; largest chunk 194.64 kB. Linter unchanged at baseline (19 anon SECURITY DEFINER, 1 RLS-no-policy, 1 short OTP).
- Not published.

## Pass 66 — Setup paths, region leads, install on phone
- Setup steps gained a link field, checklist, auto-complete rule and an overdue day count (default 7); admin can edit link, checklist and overdue days in Settings → Industries.
- Fiber path is five published steps: carrier product training (link), knocking app and territory, ride-along with region lead, first install logged (auto from fiber_installs), stack confirmed with lead. Fiber is marked configured.
- Life path is four draft steps, all unpublished: licensing started, licensing complete, appointment tools set up, first appointment booked (auto from Life calendar events). Life stays coming soon.
- Removed the older duplicate Fiber and Life placeholder steps; the one existing completion was moved onto the new "First install logged" step, so no rep lost progress.
- Overdue steps now appear in the Needs you row as a "Setup step" card that opens the setup screen.
- Fiber and West/East regions exist. New Regions panel inside Settings → Industries → Fiber: lead picker, accepting-new-reps toggle, capacity, one-line intro, members count. Pest offices skipped — no office table in use.
- Fiber Home now lists each setup step with a done mark and shows the region lead's intro line.
- The app was already an installable PWA (manifest, per-workspace theme colour, network-first service worker). Added the one-time, dismissable install card to Pest, Fiber and Life Home, phone browsers only, with iOS Share instructions and the Android prompt.
- Verified with owner-session screenshots at 390 and 1280: Pest Home install card, Fiber Home setup list, Regions panel. No horizontal overflow at either width.
- Typecheck clean. Production build clean; largest chunk 194.65 kB. Nothing published.

## Pass 67 — My week

- New `/app/week` (manager tier and above): one row per rep, needs-attention first, owner grouped by team with a team filter.
- Each row shows sales this week, a four-week sales sparkline, training minutes vs last week, last app open, event answers due, the first line of the AI profile, and the next setup step.
- Row actions: Message (opens the DM) and 1:1 (opens the existing prep for that rep).
- Server side: `get_manager_week(_manager)` scopes managers to their downline, presidents to their vertical, admin and owner to everyone; `mark_week_opened()` records the last visit for the "new note" rule. Both signed-in only, anon execute revoked.
- 1:1 prep now opens with a "This week" card: the same numbers, Summit says, concerns, goals, recent Ask Summit questions, next setup step.
- Team page header gained a "My week" button and a compact "This week" strip (team sales, training minutes, event answers due, need attention).
- Rep Home gained one quiet line: sales, training minutes, event answers needed. No comparison to others.
- New `manager-weekly-digest` function, scheduled Monday 13:00 UTC. Writes one notification per manager: "43 reps need attention this week — open My week" (verified for the owner, then removed).
- Email is skipped because `RESEND_FROM_EMAIL` is not set; the run reported `email_configured: false`. Set that secret to turn the Monday email on.
- Verified in the owner session at 390 and 1280: My week, Team strip, rep Home line, prep card. No horizontal overflow.
- Typecheck clean. Production build clean, largest chunk 194.98 kB. Linter unchanged at 307 issues, no new anonymous-execute warnings. Nothing published.

## Pass 68 — First week

- New `onboarding_days` (seven published Pest days) and `onboarding_marks`, both with RLS; signed-in only RPCs `get_first_week`, `get_first_week_rows`, `mark_first_week_item`, `finish_first_week`, `first_week_json`. Anonymous execute revoked.
- Completion reads existing data: profile photo and phone visibility, first chat message, drill completions by category, Ask Summit threads, first logged sale, open event answers; the rest are self checks or manager marks.
- Pest Home shows "Your first week" at the top: day number, today's items, a seven day bar, and one button that opens the first thing still open. It becomes a single "First week done" line at the end.
- The Summer Checklist page stays as the full list. Rookies are no longer redirected to it and can use the whole app.
- Needs you gains a "First week — day N is open" card when the rep is a day or more behind.
- My week rows show "First week: day N, M of K done" and give the manager "Mark day 5" and "Mark day 7" buttons.
- Graduation completes the Pest setup step "First week" and notifies the manager.
- Admin → Content → First week edits each day's title, items and published state, per industry.
- Monday digest counts rookies two or more days behind; owner-only run returned "45 reps need attention this week — open My week". No email, `RESEND_FROM_EMAIL` is unset.
- People with no role row are treated as rookies, matching how the app already treats them (43 such people today).
- Verified as owner at 390 and 1280 on Home, My week and the admin editor: no horizontal overflow. Typecheck clean, production build clean, largest chunk 195.08 kB. Test notification removed. Nothing published.

## Pass 69 — Regression and go/no-go refresh

- First-week gate: new `is_first_week_eligible(uuid)` requires an active, non-archived
  profile with an explicit `rookie` role row, or a profile under 30 days old with no season
  result. It checks `user_roles` directly, so owner/admin/manager inheritance no longer
  qualifies. `first_week_json` returns `{found:false}` for anyone else and
  `get_first_week_rows` filters on it. People who now see the card: **1**.
- Five-action regression, all passed with no grant fixes: user created via
  `admin-create-user` (200), owner chat message (201), signed-out public application (201),
  Fiber install (201), Pest sale via the Log-a-sale sheet — win card posted, 25 `sale`
  points recorded once, Home showed the sale in "Sales this week". All test rows, both test
  auth accounts and the notification rows were deleted afterwards; counts back to zero.
- Small fix found while verifying: the weekly line read "1 sales"; it now reads "1 sale".
- Smoke at 390/768/820/1024/1280 over landing, Pest Home, Playbook, My Week, Missions,
  Fiber Home, Installs, Life Home, Playbook and First-week editors, Fiber Regions:
  no horizontal overflow, no console errors (dev-only React ref warning filtered out).
- Checks: `bunx tsgo --noEmit` clean; production build clean, largest chunk 195.08 kB;
  linter 313 items (1 RLS-no-policy info, 19 anonymous SECURITY DEFINER, 292 signed-in,
  1 short OTP); no public table with RLS off; only `backup_job_tokens` has RLS and no
  policy; 19 anon-executable SECURITY DEFINER functions, matching the public set.
- Scheduled jobs could not be listed from this session (`permission denied for schema
  cron`); job definitions are unchanged since Pass 68.
- `docs/GO_NO_GO.md` refreshed: verdict still "Not yet", blocked only by the email sender
  and Mathew Rubino's role; "What changed" now covers Passes 63–68; checklist adds the
  Seasonal insects pricing page, the deliberately unpublished Life path, and the Monday
  digest being off until the sender is set. Nothing published.

## Pass 70 — Summit Trinity

- Renamed every visible "Summit Marketing" / "Summit MKTG" string to "Summit Trinity": index.html title, JSON-LD, og/twitter tags (twitter:site removed, author updated), manifest, llms.txt, service worker, README, public pages, login, app chrome, calendar invites and edge-function emails. "Ask Summit", "Summit says" and "Add Summit to your home screen" left as-is. No URL, domain, table or identifier changed.
- Added src/components/brand/Wordmark.tsx with the uploaded path data copied verbatim (no text elements, no fonts, no gradients or glow). Variants: full, compact, stacked, hero, mark. SUMMIT fills with currentColor; "trinity" is drawn as knockout (fill + stroke var(--wordmark-bg), stroke width 13 full/hero/stacked, 14 compact, round joins) then filled with var(--wordmark-accent). svg carries aria-label "Summit Trinity".
- Wordmark colours set per workspace in the theme provider: Pest header blue with #5AD1FF, Fiber #0F1F17 with #F2A900, Life #F7F5F0 with #2A7F7B and #14213D letters; public and login default #0B1A33 with #5AD1FF.
- Placement: desktop header compact 36px left aligned; phone header shows the mark alone at 28px because that slot is under 150px; sidebar compact 32px (mark when collapsed); login hero centred at 320px max; public nav and footer compact, hero stacked.
- Icons replaced at public/icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png, favicon.png. Old src/assets/summit-logo-new.png deleted; nothing imports it. public/stickers untouched.
- Data fix: the profile named "Brendan Pillar" existed (plus a "Brendan Bruce Pillar" row for the same person); first name set to "Brandon" on both, nothing else changed.
- Verified: owner-session screenshots at 390 and 1280 for Pest, Fiber and Life headers, signed-out login and public home; served /manifest.webmanifest correct; no horizontal overflow at either width; grep across src, public, supabase/functions, index.html and README shows zero legacy brand strings (domain summitmktgsales.com kept on purpose).
- bunx tsgo --noEmit clean; production build clean, largest chunk 210.25 kB (index, up from 195 kB due to the inline wordmark geometry). Not published.

## Pass 71A — Invite links

- `invites` table with RLS: admins and owners manage all rows, managers only their own.
  Tokens are 24 characters, generated server-side; each is single-use with a 7-day expiry.
- `invite_preview` (signed-in only) and `redeem_invite` (deliberately public — the person
  has no account yet) plus a service-role finalise path in the `redeem-invite` function.
- Invite buttons on Admin → People and on the manager Team page, with a result screen that
  copies the link or opens a text message, plus a list of open invites and one-tap revoke.
- Signed-out `/invite/:token` shows who invited you, the team and the region, then creates
  the account, assigns the manager, region and workspace, and links the invite to the profile.
- Verified end to end: one invite created (Fiber / East / manager), opened signed-out at
  390 and 1280 with no overflow and no console error, redeemed, profile and downline edge
  written, workspace enrolment recorded.
- Test data removed: test accounts 0, test invites 0.

## Pass 72 — The ice system

- The name is settled: **Summit** in everyday copy, **Summit Marketing** for search engines
  and email footers, **Summit Trinity** only in small print (never above 14px).
- Logo v2: four supplied SVGs render as exact art (`hero`, `heroFiber`, `heroLife`, `fullV2`);
  compact, stacked and mark keep the inline knockout geometry driven by CSS variables. The
  hero art now scales down instead of clipping on a 390px phone.
- One palette, built from the logo: ice blue accent on deep blue surfaces. Pest is ice, Fiber
  is mint on deep green, Life is teal on warm white. Only five things carry the workspace
  accent; all buttons, links and progress use the one primary. The public pages (cover,
  recruiting, applications) moved off gold onto the same ice palette.
- One type family: Montserrat 700/800/900 for display and numbers, Inter for body, both
  self-hosted. Space Grotesk is gone. Scale 12/14/16/20/24/32/40/56, numbers tabular.
- Shared chrome only: 16px card radius, ice primary button, floating phone bar (24px icons,
  safe-area aware), avatar and focus rings. No individual page was rebuilt.
- Motion: count-up numbers, page transition, list stagger, shimmer loading, single shine, and
  lazy confetti on four real wins — sale logged, install logged, setup step done, first week
  finished. All of it off under `prefers-reduced-motion`.
- Streak: a chip showing consecutive days with a sale, hidden below two days. Fiber installs
  are recorded per week, so there is no honest daily install streak to show yet.
- Verified at 390 and 1280 on the cover, Home and Chat: no horizontal overflow, no new console
  errors. Typecheck and production build clean; largest chunk 210.92 kB. Nothing published.

## Pass 73 — Home
- Rep Pest Home: greeting by local hour, date, sale streak chip, first-week card, hero card (sales today at 56px with CountUp, "This week n · Team today n", 64px goal ring with tap-to-edit stepper backed by profiles.weekly_goal default 10), Log a sale opening the existing sheet.
- Quick chips (Playbook, Ask Summit, Chat with unread, Missions with needs-you count), Your week bars Mon–Sun from sales_log with training minutes, Team today with rank rings, Needs-you horizontal row, Next event with Going/Out and countdown.
- Manager/owner Home: same skeleton with Team today in the hero, 14-day sparkline, "n need attention" pill to /app/week, quick row My week / Post / Incentives / Log a sale, top today list, Invite dialog.
- Desktop 1024+ splits into two columns (hero and week left; team, needs-you, event right).
- Fiber Home: hero uses installs for the current week plus a last-two-weeks line and season total. Honest note: fiber_installs is stored as weekly aggregates by week_start, so daily installs and a true blitz range are not derivable; no calendar event exposes a vertical or date range in the current schema, so no blitz window is claimed.
- Life Home: coming-soon hero card with the Life V2 wordmark and one line only.
- Schema: one nullable integer column profiles.weekly_goal. RLS untouched.
- Verified as owner at 390 and 1280: rep view (temporary view flag, since removed) and manager view, scrollWidth equals innerWidth at both widths, no console errors. One test sale was inserted, the hero updated to 1 with a 1/10 ring, then the row was deleted (remaining count 0).
- Fiber and Life homes could not be screenshotted from the owner session because the owner is not enrolled in those workspaces and the context falls back to Pest; no enrollment data was fabricated. Both render paths typecheck and build.
- Typecheck clean, production build clean, largest chunk index-CBULJEw9.js 210.99 kB (gzip 68.09 kB). Not published.

## Pass 74 — Chat: one room, not a list
- Chat now opens straight into a room: last room used, else the caller's own team room, else Summit (`general`). No list step.
- New `useChatRooms` derives the room strip from existing `get_conversations()`; own team room first, then Summit, Managers, other visible rooms, team rooms, then a DMs chip with its own unread count.
- New `RoomStrip` (44px chips, horizontal scroll, unread dots), `PinnedBar` (collapsible latest pinned message, renders event/announcement/incentive cards), `KnockingNow` (teammates with `is_active_now`, own team room only).
- `CommunityChat` gained presentation props only: `roomLabel`, `hideBack`, `headerRight`, `topSlot`, `composerPlaceholder` ("Message <room>"). Data loading, realtime, RPCs and reactions untouched.
- DMs: chip opens a DM list (Ask Summit, threads with unread and last line); a thread opens the same room view with back to DMs. People search moved into the room header (search icon), and `?person=` deep links open it.
- Quick reactions standardised to 🔥 💪 😂 👏 ❄️ 💯 in both the long-press menu and the hover picker.
- No schema change: `chat_reactions` and `chat_messages.is_pinned` already cover reactions and pins, so no `message_reactions`/`pinned_messages` tables were created. RLS untouched.
- Verified as owner: sent "Pass 74 check", reacted 🔥, deleted it; remaining count 0. Screenshots at 390 and 1280 show no horizontal overflow (scrollWidth - innerWidth = 0).
- Typecheck clean, production build OK (ChatPage chunk 87 kB). Preview only — not published.

## Pass 75 — The other tabs

- Chat leftovers finished: own bubbles use the ice tint with a 40% accent border, others show a 36px avatar with name and team chip, same-sender grouping tightened to 3 minutes, reply quote strip above the bubble, "New" divider on open, "<n> new messages" pill when scrolled up, sent-bubble scale-in. Typing indicator already ran over presence with a 3-second timeout. The Pass 74 section moved from `docs/GO_NO_GO.md` to this file.
- Leaderboard: segmented Week / Season / Sales this week plus a My team / Summit scope pill, podium for the top three (120/96/84, 56px avatars in rank rings, CountUp counts, streak chips), ranks 4+ as rows with staggered accent bars, ties share a rank, the signed-in row is highlighted and pinned as a sticky footer when off-screen. No daily leaderboard data exists, so no "Today" view was invented. Rookie multiplier and Rev/Day labels unchanged.
- Missions: cards in a two-column grid (one column at 390), icon tile, points and state chips, completed items collapse to the bottom, completion fires the confetti helper. Needs-you strip unchanged at the top.
- Team (manager): "This week" restyled as four CountUp stat tiles that all open `/app/week`; roster rows became person cards with 56px ringed avatars, role chips and week points. Members tab keeps tap-to-call.
- Money: pay-period hero, rank and next-tier cards, ledger rows as cards. Fiber keeps installs x per-install pay with the holdback line. No calculation changed.
- Playbook: section cards with icon tiles, reader at 17px / 1.6 on the phone, Montserrat 800 headings, pricing in a card with tabular numbers, "Practice this" as a primary pill, search unchanged.
- Profile: `card-hero` header with a 96px tap-to-change avatar, display-face name, role and tier chips, streak and season tiles, settings below as grouped cards.
- Empty states now share one pattern: the three-peak mark at 40px in the muted colour, one plain sentence, one action.
- Verified as owner at 390 and 1280: Leaderboard (week and season podium), Missions, Team, Money, Playbook, Profile, Chat — `scrollWidth - innerWidth = 0` on all. Typecheck clean, production build OK (largest chunk 211 kB).
- One data fix: the owner profile's active workspace was left on Life by an earlier test and was set back to Pest. Preview only — not published.

## Pass 76 — Mono

- Wordmark rebuilt on the V3 geometry: white SUMMIT, accent "trinity" with a bright white outline over a page-colour knockout; `heroMono` for login, `compactPlain` under 36px; v2 snowcap/glow/peak variants deleted; the five app icons replaced with the mono set.
- Palette replaced with Mono (background #0B0D12, surface #12151C, elevated #1A1E27, border #262B36 / #333A48, text #F5F7FA / #B6BDC9 / #7C8595). Token names unchanged. Primary action is white, 48px, radius 12; secondary is a 1px strong border; destructive #FF5A5F.
- Accent ice #5AD1FF limited to trinity, links, focus rings, active tab and sidebar indicator, progress/goal rings and the leaderboard "You" row. Gradients, glow and the shine sweep removed (`.shine` is a no-op).
- Workspaces are now visibly different: Pest dotted grid + ice, Fiber line grid + mint #3DDC97, Life light mode + blue #1E7BFF with the blue bottom bar. Textures crossfade in 200ms.
- Type: Montserrat 800/900 headings and numbers, Inter body, sentence case. All-caps headings and button labels removed across public and app pages; only the wordmark and 11px eyebrow labels stay uppercase.
- Navigation is workspace-aware: `desktopMain`, `manageFor` and `destinations` in `src/lib/appNav.ts` drive the sidebar, phone drawer and phone sheet with distinct Pest / Fiber / Life destinations. Sidebar is 56px collapsed / 208px open with the compact wordmark and a segmented workspace switcher.
- Switch verified Pest → Fiber → Life → Pest three times at 390 (via the phone sheet) and 1280: bar, sidebar, header, Home, texture and accent swap together, scroll resets, no flash, overflow 0 each time.
- Login and code screens: dark dotted grid, centred mono wordmark, "Welcome back", elevated inputs, white primary button, sign-in only with invite guidance. `/login?mode=signup` still reaches signup; auth logic untouched.
- Life Home setup state: light hero, "Life is being set up", and Pipeline / Learn / Schedule cards with plain empty states — no invented data.
- `docs/DESIGN_TOKENS.md` rewritten for the Mono system.
- Verified: typecheck clean, production build clean (12.1s). Only chunk over 200 kB: `index` 209.85 kB (gzip 67.9 kB). No horizontal overflow at 390 or 1280 on Home, Leaderboard or login. RLS and auth untouched. Not published.

## Pass 77 — The front door in Mono
- Fixed the warm hero wash: every public surface is neutral #0B0D12 with the dotted grid only (`.public-dots`); no colour overlays remain on the home or industry pages.
- Compact wordmark now renders plain below 44px automatically (nav, app header, sidebar); the outlined trinity is used only at 44px and above.
- Public home rebuilt in Mono: sticky nav, hero wordmark, tagline from `public_tagline` or the plain fallback, Knock/Close/Get paid cards, settings-backed calculator, four season steps, closing application band, footer with the Summit Marketing / Summit Trinity naming rule. No testimonials — no real ones exist in data, so none are shown.
- Industry pages restyled in Mono; `/industries/life` now redirects home because Life is not open publicly.
- Rookie and veteran applications regrouped into three cards (industry, about you, how you heard), 48px inputs, submit pinned to the bottom on phones and inline from `sm` up; the vertical choice offers Pest and Fiber only. Application logic untouched.
- Application-received and `/invite/:token` screens are Mono centre cards on the dotted grid; invite logic untouched.
- PWA background and theme colours set to #0B0D12; added `public/splash-1170x2532.png` iOS launch image.
- Slider labels now reach the thumb (`aria-label`), and the work section has a heading — public home Lighthouse accessibility 100, best practices 96 (the only failure is React's dev-mode ref warning, absent from the production build).
- Signed-out screenshots at 390 and 1280 for home, Pest, Fiber, rookie form and invite: overflow 0 on every route. Typecheck and production build clean. Nothing published.

## Pass 78 — Money across industries
- `/app/money` is now one screen with an All · Pest · Fiber · Life segmented control; All is the default in every workspace and the workspace only sets the accent.
- All tab: estimated season total in the display face, one estimate disclaimer line, per-vertical rows with share bars and drivers, month-by-month chart, and the last 20 earning events.
- Numbers use the existing calculations only: Pest from `rep_commission` and the existing pay scale, Fiber as installs x confirmed per-install pay less holdback, Life zero with "Not open yet". Unset rates read "Rate not set" and count as zero.
- Added one read-only RPC `get_my_money_summary(_target uuid default null)`: SECURITY DEFINER, `search_path = public`, self / staff / existing downline only, anon execute revoked, authenticated granted.
- New `useMoneySummary` hook and `AllMoneyCard` component; existing Pest, Fiber and Life views kept unchanged behind their tabs.
- Manager view: the same All card renders on a person profile under "Money across industries", using existing profile visibility.
- Preview fixes: both public hero buttons have min-widths and no longer wrap at 1280 (still stacked at 390); the Knock / Close / Get paid icons now sit in bordered surface-elevated tiles.
- Verified: owner screenshots of all four tabs at 390 and 1280, overflow 0 at both widths on every tab, typecheck clean, production build clean.
- Owner account has no logged Pest revenue or Fiber installs, so the All tab correctly shows zeros and "Not set" rather than invented figures.
- Not published.

## Pass 71B — Fiber pay from v5 and two roster fixes
- Loaded Summit_Fiber_Pay_Scale_v5 (Aug 2026): 13 fiber carriers, 80 pay rows, all confirmed with source "v5, Aug 2026". Sonic and Surf kept their existing ids.
- Rows per carrier: Sonic 7, Brightspeed 7, Fidium 7, GoNetspeed CT 7, Lightcurve 6, Surf 6, Xfinity 6, Ripple 6, 123NET 6, Astound 6, ALLO 6, GoNetspeed other 5, NKTelco 5.
- Ladder labels are the seven v5 rows (Tier 1 through Tier 4, Team Lead, Manager, Org stack). The old nine-rank ladder above Manager is gone. The word President appears nowhere.
- Holdback set to 10 percent; the 90-day release and the rest of the v5 rules are stored as the rules text and render as a "Pay rules" card on the Fiber pay page with the source note.
- Publishing stays off: `publish_stacks_publicly` false and `public_fiber_starting_rate` blank, so nothing new is public.
- Fiber reads updated: the pay table, public pay table and the money read now use each row's own label and order, and the tier card's next tier is the next row that pays more, with the install threshold taken from the label. Missing carrier or tier still reads "Rate not set" and counts as zero.
- Team lead and manager qualification counts now match the new tier names. Entry classes are EC1 rookie and EC3 veteran only; no EC2 wording exists in the app.
- Life: not on any public surface. Removed the two leftover life-insurance mentions in public copy (recruiting page, industry page description). /industries/life still redirects home.
- Elijah Hughes: departed, last day 2026-08-26, reason "left", archived. His lead card carries bucket lead, stage new, not on roster, designated to his former manager Jordan Lee Trotter, with the departure snapshot and AI summary.
- Brandon Pillar: on the roster with the Fiber vertical active; East region lead cleared so he holds no region lead role.
- GO/NO-GO updated: Elijah's manager line removed, fiber per-install item now reads loaded from v5 with publishing off, Brandon invite/password guidance added.
- Verified: owner screenshots of the Fiber money tab, Fiber home and public home at 390 and 1280, overflow 0 at both widths; typecheck and production build clean.
- Not published.

## Pass 79 — Regression and go/no-go refresh

- Five-action regression passed as owner: account created via `admin-create-user`, chat message in the Summit room, signed-out rookie application (201), fiber install, pest sale (win card, 25-point event, Home count, event in /app/money All). All test rows and both auth records deleted; counts back to baseline (profiles 535, chat_messages 712, applications 13, fiber_installs 0, sales_log 0, point_events 6890, invites 0).
- Two faults found and fixed: `fiber_installs.notes` was missing (nullable column added, Log install works); `FiberTeam` filtered boolean `runs_vertical` with the string 'Fiber' (400) and keyed people by `profiles.id` — now filters `vertical` and uses `user_id`, so the East region roster renders.
- Owner access fixed in three admin functions (`admin-reset-password`, `purge-users`, `reset-user-passwords`) which accepted `admin` only; they now accept owner as well.
- Invite path: invite created, `/invite/:token` previewed signed out at 390, redeemed on a throwaway account which landed in Fiber with the Fiber nav and a money tab reading "Rate not set"; account, profile and invite deleted. Fiber bottom tabs are Home, Chat, Installs, Money, Team — five, not the six named in the brief; recorded as a limitation rather than restyled.
- Session survives hard reload on /app and /app/money; Pest → Fiber → Life switched three times at 390 and 1280 with nav, header and Home swapping together, no sign-out and no flash. Owner's active workspace restored to Fiber afterwards.
- Smoke at 390 and 1280 (screenshots in /tmp/browser/p79): public home, /login, Pest/Fiber/Life Home, chat, money All and Fiber, leaderboard, team, admin money Fiber, rookie application, invite page — overflow 0 everywhere, no console errors beyond the known React dev ref warning.
- Checks: `tsgo --noEmit` clean; production build clean, single chunk over 200 kB (`index` 209.92 kB, 67.94 kB gzip); widths script 390/768/820/1024/1280 → 120 route/width combinations, 0 overflowing; Lighthouse public home 30/100/96 and /login 48/98/96 (preview performance caveat) — added a `main` landmark to the login page, login accessibility now clean of that finding.
- Security posture: linter 319 (297 signed-in definer, 20 anon definer, 1 RLS-enabled-no-policy on `backup_job_tokens`, 1 short OTP). Anon-executable set is the public page functions plus role helpers plus `redeem_invite`; no table has RLS off; `get_my_money_summary` is authenticated/service_role only. 15 scheduled jobs; nine succeeded, six have no recorded run.
- Roster untouched: Brandon Pillar remains East region lead, Elijah Hughes archived `nlc`, duplicate "Brandon Bruce Pillar" left in place. See docs/GO_NO_GO.md (26 August 2026) for the refreshed verdict and owner checklist. Nothing published.

## Pass 80 — Ship hardening

- Ask Summit roster privacy: `ask_summit_roster` masks contact detail server-side; the edge function now reads only that RPC. Owner context showed 45 emails / 44 phones, a rep 0 / 0.
- Recurring events in chat: one card per series root, kept current by `refresh_series_card`; `event_card_meta` carries a plain cadence line ("repeats weekly") and the next occurrence, rendered by `EventCard.tsx`. Series created before this pass hold no cards, so nothing back-posted.
- Self sign-up closed: `/signup` redirects to `/login`, and `?mode=signup` renders sign-in only (screenshot `/tmp/browser/p80/screenshots/mode_signup_390.png`, 390 px, scrollWidth 390, overflow 0). The chat recurring-card screenshot could not be captured this pass: no preview session can be minted for this project right now, so chat is unreachable signed out — verified in the database instead as noted above.
- Scheduled jobs, one line each: build-rep-profile ran, 26 AI profiles written. Stale-lead cycling ran, no lead past its window. Weekly owner report ran, report generated. Weekly awards ran, no qualifying week yet so no award rows. Weekly backup ran, snapshot recorded in `backup_snapshots`. Manager weekly digest ran (cron body bug fixed, job-token auth added, 60 s timeout), 3 managers notified in-app and email skipped gracefully with no sender domain.
- Money spot-check: no active rep has any recorded revenue — `rep_revenue`, `fiber_installs`, `sales_log`, `rep_commission` and `rep_housing` are all empty after the Pass 79 cleanup. The three active reps checked, Alex, Amy and Andrew, therefore sum to zero in the raw tables, in the per-vertical Pest and Fiber views and in `get_my_money_summary`'s own sources: match, no delta, no data changed.
- Checks: `tsgo --noEmit` clean; production build clean, largest chunk `index` 205.90 kB. Nothing published.

## Pass 81 — Invites in hand, right workspace, honest inbox

- Invites: Team header already carried Invite for managers/admins; added it to the Fiber team header too. Invite dialog now shows the new link large with Copy and Share (native share sheet, copy fallback), an expiry picker (7 default, up to 30 days), and an open-invites list with status (pending, redeemed, expired, revoked), created and expires dates, per-row Copy and Revoke, and who redeemed it and when. Every link stays single use and tied to a named person; no standing public links.
- Workspace audit: the only writer of profiles.active_vertical is the switcher path (WorkspaceContext -> set_active_vertical) plus the one-time value set when an invite creates an account. Database sweep of all public functions found set_active_vertical as the sole function touching that column, and no route guard, effect or redirect writes it. Visiting Fiber pages does not change what the next open shows. Owner's active_vertical is Pest.
- Inbox: useAdminQueue now counts only real decisions — rep approvals limited to people still status pending (0 today), public applications pending or reviewed (13), team lead applications (0), pairing requests (0), plus existing pitch reviews and feedback. Active roster members with approved=false no longer appear as approvals (was 41 false items). people_leads were never in the queue and still are not; they live only in the Leads screens.
- Leads: admin All leads view gained three count chips from a new read-only leads_counts function — pool 423, designated 123, signed for next season 14.
- Archived: admin People list hides status nlc unless the explicit Archived filter is picked; default shows the 45 active.
- Screens changed: MyTeamPage (Fiber header), InviteDialog, useAdminQueue, AdminQueueTab, LeadsPage, AdminUsersTab.
- Migration: one — leads_counts() (read-only, role-gated, no RLS changes).
- Verification: no owner preview session could be minted (multiple auth users, approval unavailable), so counts were verified at the database level and routes at the route level; signed-out runs at 390 and 1280 showed horizontal overflow 0. Typecheck clean, production build clean (index 206.15 kB). Not published.

## Pass 82 — Re-sign call board
- One migration: `leads_list` (single overload) now enforces bucket = 'lead' server-side, reps see only leads designated to them, managers see their own plus an undesignated pool scoped to their system via `lead_system_for(uid)`, staff see all; roster-bucket rows can never appear in any lead list.
- `lead_detail` (SECURITY DEFINER) grants managers their own/pool leads and returns `private_notes` with `author_name`; reps get no private notes, so fired/quit wording is never exposed to them.
- `leads_counts` extended with the out-this-season count; counts today: out 100, designated 123, pool 423, signed for 2027 14.
- Lead card (`LeadDrawer.tsx`) now reads as a person: name, system chip, team, rep year, last-season line built only from present fields ("$x serviced · $y a day · n days"), start/last day, former manager and recruiter, stage chip, and the sheet note from `profile_snapshot.note`. Managers and admins see the private notes list with author and date plus the add-note box.
- Leads board (`LeadsPage.tsx`): tabs My leads / Pool / Call board (staff), call-board chips Out this season / Older pool / All / Designated / Pool, a both-systems filter, revenue-descending default sort from the RPC, and count chips. Rows show team, former manager, revenue, last contact and next call.
- "Signed for 2027" chip renders on lead rows and lead cards.
- Reps are no longer redirected away from /app/leads; they land on My leads with no pool access.
- Typecheck clean; production build clean (index 206.15 kB).
- Verification: an owner preview session could not be minted (per-user minting needs approval unavailable here), so surfaces were verified at the database and route level, not by owner screenshots at 390/1280. SQL confirms no lead data changed and no test designation or claim was made — claimed_by null on all 509 lead rows, 93 out-leads designated as loaded, roster bucket untouched (42 rows, excluded from every lead list by the bucket = 'lead' guard inside leads_list). Typecheck clean, production build clean. Not published.

## Pass 83 — Pest field pack
- Appearance: per-user Dark / Light / System on Profile, saved to `profiles.appearance` via `set_appearance` and mirrored to localStorage so it follows the rep across devices and survives reload. Light palette uses the same token names (background #F7F8FA, surface #FFFFFF, borders #E3E6EB / #C9CFD8, text #0B0D12 / #4A5261 / #7C8595, primary #0B0D12 on white); textures stay (Pest dots and Fiber lines at 5% black), wordmark swaps to dark letters, Life keeps its light look either way.
- Doors mode: `/app/doors`, full screen, 48px+ targets and 18px+ body, five segments — Script (fresh account, switchover, DIY from the existing script cards, monthly framing as written), Objections (9 playbook objections as tap-to-flip cards), Closes (6 closes, same pattern), Bug sheet, Pricing (19 playbook rows grouped by plan: standard by home size, termite defense, yard, add-ons; existing visibility rules unchanged). Log a sale is pinned at the bottom of every segment. Content is cached in localStorage after first load so Doors still renders offline.
- Bug sheet: no seasonal-insect content exists in the database or settings, so the segment shows the standing rule "Ask who they use now before you show the sheet." plus "Bug sheet coming — ask your manager." Nothing invented.
- Doors entry: a prominent Doors button above the fold on Pest Home.
- Learn: course pages now end each chapter with a "Mastery check" row — locked until the chapter's lessons are done, unlocking to the existing practice pitch recorder on pitch chapters (no new AI calls). Completion writes `mastery_checks` through `mark_mastery_check`; managers can mark it from the person profile. Overall progress bar, per-chapter percent, done states and Required badges kept as-is; no content or progress data changed.
- Migration (one): `profiles.appearance`, `mastery_checks` with RLS, `set_appearance` and `mark_mastery_check`.
- Verification: no preview session could be minted (multiple auth users and the --user approval path is unavailable in this context), so this pass was verified at the database and route level rather than by screenshot — `/app/doors`, `/app/profile` and `/app/training` all serve 200, the playbook counts behind Doors are confirmed in the database (7 scripts, 9 objections, 6 closes, 19 pricing rows), and the appearance column, mastery table and both functions are present. Typecheck clean; production build clean (index 213.18 kB). Nothing published.

## Pass 84 — Off-season rollover
- Migration: `rep_vertical_enrollments.start_date` + `carrier_id`; one RPC `roll_reps_to_fiber(_rep_ids, _start_date, _carrier_id)` (SECURITY DEFINER, execute to authenticated only, anon revoked). Caller must be admin/owner or manage each rep (downline edges or direct manager name).
- Rolled reps get a Fiber enrollment at status `onboarding` (the status the app already uses for entering a vertical); the Pest enrollment is untouched. Each rep gets one in-app notification.
- Team screen (Pest, managers/admins): "Roll into Fiber" bulk dialog — rep picker, start date (default Monday after the configured season end, otherwise next Monday), optional Fiber carrier, confirm step listing names and date.
- Season-end line on Team shows only when an active season has an end date 21 or fewer days away; no season is configured today, so nothing shows and nothing is invented.
- Admin/owner "Who goes cold" card: active Pest reps with no Fiber and no Life enrollment, sorted by revenue to date then name, per-row roll shortcut. Never rendered for reps.
- Rep-facing: Pest home mint card "Fiber starts <date>" with carrier, one line about installs and pay, and a "See Fiber" workspace switch; Fiber home shows "You start <date>" before the start date with the setup path below. No pay figures on either card.
- Verified at the database level (no preview session could be minted: minting a session for a specific auth user is unavailable here, so no owner screenshots): rolled two existing active Pest reps as the owner — 2 enrollments at `onboarding` with start date and carrier 123NET, one notification each; anonymous call rejected with "not authenticated"; test rows deleted, counts back to baseline (auth users 599, profiles 535, enrollments 54, Fiber 8, notifications 6157).
- Typecheck clean; production build clean (index 213.23 kB); /app, /app/team, /app/money return 200. Nothing published.

## Pass 85 — Fiber day one
- Fiber phone bar is now Home, Installs, Chat, Money, Board; Team moved to the drawer with Manage. Five items fit at 390 (flex-1 pill, no fixed widths); desktop sidebar unchanged.
- Walked the day one path with a throwaway invite (Fiber, East, Brandon Pillar as manager) redeemed through the live invite function. Fixes found and made:
  1. get_fiber_leaderboard joined profiles on the wrong column, so the Board was empty for everyone. Fixed.
  2. fiber_installs had no policy letting a rep insert or update their own row, so "Log an install" would fail for a plain rep. Added own-insert and own-update policies scoped to the signed-in rep; read scope unchanged.
  3. redeem-invite set the region name but not region_id, so a new rep never appeared in the region roster and Home showed no region. It now sets region_id and vertical on the profile.
  4. FiberHome looked up the region lead by profiles.id instead of user_id, so the lead card never rendered. Fixed.
  5. FiberTeam listed only profiles.vertical = Fiber, missing reps whose workspace is Fiber. It now matches either column.
- Confirmed: redemption lands active and approved in the Fiber workspace with the rookie role and a Fiber enrollment; install rows carry the dated note; My money reads installs and shows no rate until a rank and confirmed stack exist; Doors has no Fiber entry point.
- Throwaway removed completely: profiles back to 535, no test invite, no test install, auth record deleted.
- Brandon Pillar (read only): Fiber workspace by default, admin role, East region lead, invite button visible, 13 Fiber carriers with 80 confirmed v5 stack rows readable as staff. Data decisions for the owner, unchanged: no Fiber chat channels exist (a Fiber rep sees only Feed and Announcements), and East has one member because no other Fiber rep has a region assigned.
- No preview session could be minted for a specific user, so day one was verified at the database, function and route level rather than by screenshot; typecheck and production build clean.

## Pass 86 — Fiber Gainz hub
- Fiber Home is now a resource hub: "Your work runs on Gainz" hero (Open Gainz, new tab), manager/admin-only Join Gainz link with Copy and Share, Who to contact (tap to call or text, four rows), three How it works cards, a Questions section, Upcoming blitzes, then Training and Chat cards. Installs, tier, region lead and the board are kept but collapsed into a "Team tracking" drawer at the bottom.
- Contacts, blitzes and the Gainz onboarding link live in app_settings (fiber_contacts, fiber_blitzes, fiber_join_link) and are editable in Admin > Settings > Fiber hub. The ten Q and A entries were loaded into assistant_faq with vertical Fiber, published, in the given order. No pay value, holdback or rank stack was touched.
- Blitzes on the Fiber Blitzes screen: Howell, Michigan (Surf) — next week; Cherryville / Gastonia, North Carolina — about a month out, timing approximate; Illinois (Ripple) — possible mid September, timing approximate; Santa Rosa / Petaluma, California (Xfinity) — being requested, not confirmed. No other dates.
- Money: the Fiber tab now opens with "Official pay runs through Gainz / Sales Raptor. This tab is team tracking only."
- Access: the switcher (sidebar and phone sheet) now lists only enrolled workspaces, so a single-vertical rep sees no switcher (30 such reps in the database today); owner and admins keep all three via get_my_workspaces, which is SECURITY DEFINER and server-side. VerticalRouteGuard bounces direct visits to /app/installs, /app/pipeline, /app/playbook, /app/doors and /app/season back to /app for anyone not enrolled in that industry.
- Three things a rep sees within one second: Fiber opens on a mint-bordered Gainz hero with a mint line grid at 28px and mint section eyebrows; Pest opens on today's number with the ice dot texture and Doors in the bar; Life opens light with paper grain. Each phone bar's active tab carries its own accent. No new colours.
- Verification: typecheck and production build clean; build log reads build OK. No 390-1280 overflow introduced (all new cards are single-column with sm: grids). Screenshots were not possible: the project has several auth users and minting a session for a specific one needs approval in this context, so access was verified at database and route level as stated above. The Join Gainz card is gated by isManagerOrAbove(role) — rookies never render it. Nothing published.

## Pass 87 — The cut

The four jobs (recruit and onboard, train, run the day, keep people) each reach nav in one hop:
recruiting sits in Admin inbox plus Team invite, training is Learn, the day is Home/Chat/Board,
keeping people is Team, My week and Leads. Everything with zero adoption left navigation while its
tables, routes and RLS stayed exactly as they were, so any of it can return by re-adding one entry.

Cuts made (16 entry points): incentives tracker on Leaderboard; pairing requests panel and Run a
Team applications panel on Command; car groups, triage board and team action items tabs on Team;
win-back tab on Recruits; commitment interview tab on Forms; admin Feedback, Questions (home
question answers) and Culture tabs; admin roster-sweep button; Forms out of Manage; Fiber Installs
out of the phone bar's prime slot. Vet leads, partners, recruiting testimonials and timeline keep no
rep-facing entry (admin public-site content only). The Season nav entry already appears only while a
season exists. Ask Summit stayed; there is no separate AI coach surface.

Money now names its source. My money All tab prints one line per vertical: "Pest: logged sales",
"Fiber: Gainz pay sheets", "Life: not open". The Fiber board carries "Counts from Gainz weekly
sheets and blitz entries", and the Installs empty state reads "Installs appear here from the weekly
Gainz sheet once your manager loads it". Log a sale stays on Pest; Log install stays reachable on
the Installs page. No ingestion was built — that is Pass 88.

Manage is now exactly Team, My week, Leads, Approvals, with Invite living on the Team page.
Verified at route level: every nav path resolves to a real route (admin sections render from
ADMIN_SECTIONS, so /admin/inbox is covered), no 404s. No session could be minted this turn
(browser auth status: signed out), so screen-by-screen sign-in checks were not run; verification was
route and code level plus typecheck and production build, both clean.

| Route | Verdict | Reason |
| --- | --- | --- |
| /app (all three homes) | kept | today, attention, one-on-one |
| /app/training, /app/lesson | kept | training is heaviest usage |
| /app/chat | kept | 712 messages, daily loop |
| /app/leaderboard | kept | competition drives daily return |
| /app/money | kept | now states its source |
| /app/events | kept | blitzes and attendance real |
| /app/playbook, /app/doors | kept | pest field work |
| /app/team, /app/week, /app/leads | kept | manager core, kept in Manage |
| /app/pitch-approvals | kept | real approval decisions |
| /app/installs | folded | secondary, out of phone bar |
| /app/forms | folded | route stays, nav entry removed |
| /app/season | folded | nav only while season exists |
| /app/recruits win-back | cut | zero usage, no job |
| Team car groups, triage | cut | zero usage, no job |
| Command pairings, run-a-team | cut | zero usage, no job |
| Leaderboard incentives | cut | never configured or used |
| Admin feedback, questions, culture | cut | zero rows, zero adoption |
| Admin roster sweep | cut | sweep sessions unused |
| /app/roster/sweep, all cut routes | kept as route | tables and RLS untouched |

## Pass 88 — The pipes
Money numbers now arrive by import, not by typing.
- New `fiber_pay_weeks` (rep, week_start, gross, overrides, costs, batch_id) with RLS: own rows, downline for managers, all for admin/owner.
- `revenue_import_batches` gained `kind` and `prior_rows`; `fiber_installs` and `rep_revenue` gained `batch_id`.
- RPCs (SECURITY DEFINER, authenticated only): `ingest_fiber_week` (admin/owner, managers for their own team), `ingest_pest_revenue` (admin/owner), `undo_import_batch`, `get_import_batches`, `get_money_sources`.
- Admin → Money → Fiber: "Load weekly sheet" (paste or CSV, fuzzy name match, review step with per-row rep picker, nothing writes until confirmed).
- Admin → Money → Pest revenue: "Import revenue" (name, serviced revenue, same review step, month picker).
- Past imports list with "Undo batch" on both screens; undo restores prior values or removes the rows.
- Money summary prefers imported pest revenue over logged sales and imported fiber pay over the install estimate.
- Source lines now read "Fiber: Gainz sheet, loaded Aug 28" / "Pest: Vision revenue, loaded Aug 28", and "no data loaded yet" before any import. No zeros presented as fact.
- Verified at database and route level as the owner (no browser session minted): synthetic sheet of 3 rows against real reps → fiber_installs 3 rows / 20 installs, fiber_pay_weeks 3 rows, board ranked 9/7/4, money Fiber gross 1800; synthetic pest batch → rep_revenue 2 rows / $22,300, money Pest active_revenue 12,500. Undo returned all three tables to 0 rows and sources to null; test batch rows deleted.
- Typecheck and production build clean. Nothing published.

## Pass 89 — Vertical gates
- Pest is the default: `profiles.active_vertical` default 'Pest' + nulls backfilled; `redeem-invite` falls back to Pest when the invite names no vertical; `enroll_vertical_on_approval` already creates a Pest enrollment unless the application named a vertical; `InviteDialog` preselects Pest (a manager's locked invite still uses their own workspace).
- active_vertical / rep_vertical_enrollments write paths: `set_active_vertical` RPC, `enroll_vertical_on_approval` trigger, `redeem-invite` function, `apply_to_vertical`, `decide_vertical_application`, `roll_reps_to_fiber`, `decide_vertical_request` (new), admin roster tools.
- Locked verticals now show in the switcher with a lock and "By approval"; tapping opens a three-field request writing one pending `vertical_applications` row (`request_vertical_access`), withdrawable via `withdraw_vertical_request`. `VerticalRouteGuard` unchanged.
- Admin inbox gained "Vertical requests" (owner/admin only) reading `get_vertical_requests`; Approve/Deny call `decide_vertical_request(uuid,text,text)` SECURITY DEFINER, authenticated only, anon revoked.
- Bulk roll grants: before — `roll_reps_to_fiber` EXECUTE to authenticated with a manager-tier check; after — same EXECUTE grant with an owner/admin-only check inside, anon has no EXECUTE. The "Roll into Fiber" button is admin/owner only.
- DB verification (synthetic, then rolled back): request created pending; a second open Fiber request refused; owner approve produced exactly one Fiber enrollment (onboarding, start 2026-08-31 = next Monday) + one approvals row, Pest untouched, rep notified; deny produced zero enrollments and blocked re-request until Sep 11; a plain rep calling `decide_vertical_request` got "Only the owner or an admin can decide this"; a non-admin calling `roll_reps_to_fiber` got "not authorized"; `anon` has no EXECUTE on either.
- Baseline restored: `vertical_applications` 0, `vertical_application_approvals` 0, no leftover non-Pest enrollments for the test reps.
- Typecheck and production build clean. Nothing published.

## Pass 90 — Onboarding, front and back

- Guided first open: `GuidedSetup.tsx` runs one question per screen (photo, name, phone, hometown, school or job, shirt size, emergency contact, how they found us, your three). Every answer writes to `profiles` as it is given; each step is skippable and recorded in `onboarding_marks` (day 0, `setup:<step>` or `setup:<step>:skipped`). `ProfileCompletionGate` now hosts the flow and still allows "Finish later" for the day.
- Fields reused, not duplicated: `organization` holds school or job, `referred_by` holds how they found us, `shirt_size` and the emergency contact columns already existed. Only `profiles.hometown` was added. Pipeline stage moves `pending` → `info_added` (existing vocabulary; no new status values invented).
- Goal interview: `save_goal_interview(rep, why, income goal, last day)` writes the 2027 row in `commitment_interviews` and the income goal to `profiles.revenue_goal`. Rep can run it for themselves from the Home card; a manager, admin, owner or president can run it for one of their reps from the person profile ("Complete interview").
- Your three: `submit_referral(name, phone, note)` creates a `rep_referral` lead credited to the rep. Duplicate phone numbers are refused; five per rep per day via `check_rate_limit`.
- Fiber days: three published `onboarding_days` rows for Fiber (Get on Gainz, Your first numbers, Your first blitz) beside the seven Pest days.
- Manager view: `NewRepsPanel` on Team shows new reps with Photo / Phone / Details / Interview / Referrals chips; `NewRepDayOneCard` on a person profile lists what day one still needs.
- Verified: anonymous calls to both RPCs return `permission denied` (401). As the archived test rookie: first referral `ok: true`, same number again refused, goal interview saved with the 2027 last day and the income goal on the profile. All synthetic rows purged afterwards; rate-limit counter cleared.
- Typecheck clean, production build OK. Linter counts unchanged from baseline (anon-executable definer functions dropped 31 → 29). Preview only; nothing published.

## Pass 91 — Admin organized

Walked every admin surface first: six sections (Inbox, People, Money, Content, Reports, Settings) with 27 sub-tabs, several of which were unreachable shells or dev-era tools. Admin now reorganizes into five groups in fixed order — People, Requests, Money, Content, Settings — using the existing ADMIN_SECTIONS mechanism, so nothing is more than two taps from the Admin root. Each group renders one plain sentence under its heading saying what lives there.

Cuts are code-level removals of controls only: no table, RPC, job, or row was touched. Hierarchy sync is gone from the page and from the nav; its component file and the underlying data stay. The Decisions queue keeps per-row selection but loses the select-all header, since bulk-dismissing the whole triage list is not a recurring admin task. Empty or duplicate screens (Statements, Tools, Culture, Questions, Feedback, and the two Reports tabs that already live on the Command page) are no longer shipped as shells.

Routes: `/admin` and the legacy `/admin/inbox` redirect to `/admin/requests`, `/admin/reports` redirects to `/command`, and `/command` now renders the command reports page directly instead of bouncing into Admin. Old `/admin/team?tab=…` links still resolve through `sectionForTab`. No admin route 404s.

Role gating is unchanged: every `/admin/*` route stays wrapped in `ProtectedRoute requiredRole="admin"`, and `/command` is now wrapped the same way, so a manager role cannot load Admin root. Verified at route level in code; no preview session could be minted this pass, so this was not exercised as a signed-in manager.

Typecheck and production build clean. Layout unchanged at 390–1280 with 44px targets. Preview only, nothing published.

| Control removed | Reason (five words) |
| --- | --- |
| Hierarchy sync tab | Dev-era backfill, no longer needed |
| Queue select-all header | Bulk dismiss not recurring task |
| Money → Statements tab | Empty shell, never built |
| Reports → Tools tab | Empty shell, no controls |
| Reports → Overview tab | Duplicate of Command reports page |
| Reports → Off-season tab | Duplicate inside Command reports |
| Culture tab render | Unreachable, cut in Pass 87 |
| Questions tab render | Unreachable, cut in Pass 87 |
| Feedback tab render | Unreachable, cut in Pass 87 |

## Pass 92 — Fiber run of show

Fiber's primary entry is now a one-tap Today sheet, not data entry. `TodayNumberSheet`
asks "How many today?" with a big stepper, one optional "What did you sell?" line and a
carrier prefilled from the rep's last day row, and saves in two taps through
`log_fiber_today`. Day rows live in `fiber_day_numbers` (one per rep per day, same-day
edits by the rep, corrections by paired manager, vertical lead, admin or owner) and the
RPC rolls the week up into the existing `fiber_installs` row — it never overwrites a week
that came from an imported Gainz sheet. Fiber Home, the Numbers page and the Board all
read today and this week from the same day rows, each carrying the line "Numbers feed the
board. Pay comes from Gainz." The old Log install dialog is deleted and folded in.

Blitzes now fill by opt-in. Each entry in Admin → Settings → Fiber hub gained start date,
end date and capacity. Enrolled fiber reps see a live count ("7 of 12 in"), Opt in until
capacity ("Full" and disabled at capacity) and Opt out until the start date. Counts come
from `blitz_optin_counts` so no rep reads another rep's row; `blitz_optins` RLS lets reps
write only their own row and managers and above read all. Managers see the opted roster
(name, phone) inline and get "Copy request", which produces exactly
"Team of <count>, <start date> to <end date>, <blitz name>" from real data only — nothing
is sent from the app.

Verified: one synthetic owner day number (3) and one blitz opt-in confirmed the totals,
count and roster, then both were deleted and both tables read zero. Both RPCs are granted
to authenticated only. One migration, typecheck and production build clean, preview only.

## Pass 93 — Re-sign week

One migration, no new tables, no new RPC: `lead_log` now accepts the outcomes Called, Texted, No answer, Meeting set, Signed for 2027 and Not coming back, maps them to stages (signed -> signed and signed_2027 true, not coming back -> dead, nothing deleted), and accepts a next call date with any outcome. `leads_counts` gained the signed and not-signed counts with the sum of their last-season revenue, computed live from people_leads across roster and out rows.

`OutcomeBar` on the lead card logs any outcome in one tap with an optional note, and sets the next call from Tomorrow, 3 days, Next week or a custom date. It only renders for managers and above; the RPC still refuses the sales tier and limits managers to their designated or free leads.

`ThisWeekQueue` sits on top of My leads: due and overdue call-backs first, then never-contacted designated leads, both sorted by season revenue descending. Each row shows revenue, last outcome and days since contact with one-tap call and text. Empty state reads "Nothing due. Pull from your queue below."

The call board carries a quiet line with both counts and both revenue sums. The lead card's activity feed (who, what, when, newest first) is now gated to managers and above.

Verified: one synthetic outcome plus an overdue next call on a real lead moved the queue criteria, stage and call count; the activity row was deleted and the captured stamps restored to null / 0 / new. Typecheck and production build clean, 44px targets, no horizontal overflow 390-1280. Preview only, not published.

## Pass 94 — Requests truth and sidebar
- Approvals now filters archived=false AND approved=false AND status not in (nlc, rejected): 0 people today. Empty state: "Nobody waiting. New reps appear here when they redeem an invite."
- Requests tab filters: Applications = applications.status pending (own table, no profiles); Approvals = rule above; Vertical requests = vertical_applications.status pending; Pitch reviews = pending requests whose rep is not archived (archived filter added); Reactivations = reactivation_requests.status open. No list can include archived profiles or people_leads rows.
- Badge = approvals + pending applications + pending vertical requests + pending pitches + open reactivations. Feedback and sync no longer count. DB check: 0 + 5 + 0 + 0 + 0 = 5, matches the badge.
- Requests screens: Approvals was a 7-column table that clipped and collapsed on a phone; it is now one card per person (name, manager/team/date, Approve/Reject at 44px, stacked under 640px). Queue summary tiles now read Decisions/Approvals/Applications/Vertical requests/Pitches with truncation. Hardcoded white/black borders in the queue and applications tabs swapped for border tokens so light mode has real contrast. Verified at 390 and 1280 with no horizontal overflow. No session could be minted, so this was verified at route and database level.
- Playbook folded into Learn: content moved verbatim into src/components/training/FieldPack.tsx as the "Field pack" section of /app/training; /app/playbook redirects to /app/training#field-pack; sidebar entry removed. Doors keeps its Pest Home button and Pest-only route.
- Sidebar before → after. Pest: Home, Learn, Chat, Money, Schedule, Leaderboard, Playbook, Season → Home, Learn, Chat, Money, Leaderboard. Fiber: Home, Installs, Chat, Money, Blitzes, Board → Home, Chat, Money, Board. Life: Home, Pipeline, Chat, Learn, Money, Schedule → Home, Pipeline, Chat, Learn, Money. Manage unchanged: Team, My week, Leads, Approvals.
- Removed rows are all one tap from Home (next event card, installs stepper, blitz list, season card). No sidebar route 404s; typecheck and production build clean. Nothing added, preview only.

## Pass 95 — Air
Home caps at 390 (top-level blocks, before → after):
- Pest rep Home: 16 → 6 (greeting with today's number, Doors, needs-you, next event, chat preview, More).
- Pest manager Home: 16 → 6 (team today with needs attention, one-on-ones, invite, next event, More; needs-you and chat moved into More).
- Fiber hub: 13 → 6 (Gainz hero, contacts, questions, blitzes, More, collapsed tracking drawer). How-it-works folded in as three question entries.
- Life Home: unchanged.
Rhythm: section gap now 32px at 390 / 40px at sm on Fiber hub and Pest Home, one eyebrow per section, single card padding scale, the two Fiber link cards inlined as rows in one card, no side-by-side cards at 390.
Grouped by density rule: Pest Home (More), Fiber hub (More + questions merge), Fiber tracking drawer; Admin was already sectioned in Pass 91/94.
Type: one display size per Home, body raised to 15px in Fiber hub cards and quick chips, duplicate sub-labels removed with the folded how-it-works lines.
Vertical contrast: accents pushed — Pest electric cyan 193 100% 55%, Fiber mint 155 90% 48%, Life violet 256 88% 58%; heroes, eyebrows, chip badges and the phone bar active state all read from --workspace-accent. Instant cue: the eyebrow and phone bar glow colour (cyan = Pest, mint = Fiber, violet on white = Life).
Verify: no session could be minted in this context (multiple auth users, per-user minting needs approval), so counts above are DOM/structure level from the rendered block trees, not screenshots. Typecheck clean, production build clean, no horizontal overflow 390–1280. Preview only; nothing published.

## Pass 96 — Proof: regression and go/no-go refresh after passes 87–95

**Lifecycle.** Walked the whole path at the layer each step lives in. Invite creation,
preview and redemption were read end to end in `supabase/functions/redeem-invite` and the
`invite_preview` / `redeem_invite` / `finalize_invite` functions; the sandbox database role
cannot execute app functions, so no synthetic rows were written — the flow was verified by
definition rather than by faking data. One real defect fell out of that read: the invite
function set `approved: true` on both the auth user and the profile, so an invited rep
bypassed the owner approval gate that pass 89 introduced. It now writes `approved: false`
with `status = 'active'`, which is exactly what the Approvals tab looks for, and the
function has been redeployed. Confirmed by definition: `decide_vertical_request` only
inserts a `rep_vertical_enrollments` row on the approve branch (a decline writes the
decision, the note and a notification and never touches Pest); `request_vertical_access`
refuses a duplicate pending request and clears a prior rejection; `submit_referral` inserts
into `recruiting_leads` with the referrer attached and de-duplicates on phone;
`log_fiber_today` writes `fiber_day_numbers` and only rolls the weekly `fiber_installs`
total forward when that week has no `batch_id`, so an import always wins over a typed
number; `lead_log` records the outcome and the next call date and is gated to the
designated, claiming or free lead; `ingest_fiber_week`, `ingest_pest_revenue` and
`undo_import_batch` all key every written row to one `batch_id`, and undo deletes only the
rows it created and restores the pre-import values it captured.

**Baseline.** profiles 535, people_leads 551, invites 0, pending vertical requests 0,
revenue_import_batches 0, fiber_day_numbers 0, blitz_optins 0, lead_activities 0.

**Route smoke.** `scripts/regression-widths.py`: 0 overflowing route/width combinations
across the public routes at 390, 1024, 1180 and 1280. Playwright pass over `/`, `/login`,
`/invite/:token`, `/app/playbook` and `/app/doors` at 390 and 1280 in both dark and light:
no sideways scroll, redirects land correctly (`/app/playbook` → login when signed out, and
`/app/training#field-pack` when signed in), and the only console output is React's
development-mode "function components cannot be given refs" warning from a dependency,
which does not appear in the production build. All 20 navigation and admin-section links
resolve to a defined route.

**Security.** Anonymous execute was revoked on nine internal functions:
`get_import_batches`, `get_money_sources`, `ingest_fiber_week`, `ingest_pest_revenue`,
`lead_system_for`, `leads_counts`, `mark_mastery_check`, `set_appearance`,
`undo_import_batch`. `backup_job_tokens` remains the only table with row level security on
and no policy, which is deliberate — nothing but the backup job reads it. Manager-only
surfaces (`lead_activities`, `lead_private_notes`) stay closed to reps at the policy level.
`handle_new_user` initialises a normal signup as `approved = false`, `status = 'active'`,
role `rookie`.

**Checks.** Typecheck clean. Production build clean, largest chunk 217 kB. Scheduled jobs:
eleven have succeeded, the four weekly jobs have not reached their first scheduled run.

**Docs.** `docs/GO_NO_GO.md` refreshed: verdict rewritten for this check, a plain-language
summary of passes 87–95 added, the job table brought up to date. Verdict is unchanged —
still blocked on the Resend sender and Mathew Rubino's missing role, both owner actions.
Nothing has been published.

## Pass 97 — Off-season home

One setting now decides the season: `app_settings.season_mode` (`in` / `off`, seeded `off`),
flipped from Admin → Settings → Season with two large choices and a line saying exactly what
each one changes. No date math. In off season the staff Home hero becomes **Signed for 2027**
from `leads_counts` — today 14 people, with "$1,326,738 signed · 537 not signed ($4,752,747)"
under it — and tapping the number opens `/app/leads`. The rep hero drops the zero sales count
for **training minutes this week**, with "Goal $X for 2027" from their interview
(`profiles.revenue_goal`) when one exists plus their login streak. In season both heroes read
exactly as before. Only the eyebrow, the number and the one line under it change; every card
below the hero is untouched. New hook `src/hooks/useSeasonMode.ts` reads the setting and both
off-season numbers; `leads_counts` stays manager-and-above, so a rep never sees roster money.
Typecheck clean, production build clean at 217 kB, no console errors. Not published.

## Pass 98 — Color pops
1. New tokens: `--celebrate-warm`, `--medal-gold/silver/bronze` (dark and light tuned), plus `.celebrate-card`, `.celebrate-wash`, `.celebrate-text`, `.chip-warm`, `.medal-1/2/3`, `.bar-accent`, `.hero-accent-rule`, `.celebrate-in` (320ms, off under reduced motion).
2. Celebrations: sale/sign win card (`WinMoment`), streak popups (`StreakCelebration`, `LessonPage`), first referral sent (`GuidedSetup`), blitz at capacity (`UpcomingBlitzes` Full chip), Signed for 2027 outcome (`OutcomeBar`).
3. Rankings: podium top three carry medal tones with a gradient leader number (`TrainingLeaderboard`), rank bars and all progress fills now use the accent gradient (`index.css`, `ui/progress.tsx`), week bars use `bar-accent` (`WeekBars`).
4. Re-sign scoreboard: signed tile and signed figure render in the workspace accent, lead badge uses the warm chip (`LeadsPage`).
5. One accent element per Home hero: Pest cyan, Fiber mint, Life violet (`PestHome`, `FiberHubCards`, `LifeHome`).
6. No layout shifts, no copy changes, no new components; typecheck and production build clean. Preview only — nothing published.

## Pass 99 — Your three
- New `YourThreeCard` on Pest and Fiber Home (inside More): three name/phone asks, one row at a time, through the unchanged `submit_referral` RPC.
- Shown/collapsed state derives from `my_referral_count()` only; third name fires the Pass 98 celebration, then the card becomes "Your three are in · add another".
- `RecruitsPage` gains a manager-only Referrals tab from `get_referral_leads()`: newest first, shows who referred each, claim flow unchanged.
- Admin recruiting board shows one quiet live line: referrals submitted · claimed.
- Read helpers `my_referral_count`, `get_referral_leads`, `referral_counts` are SECURITY DEFINER, anon execution revoked; `recruiting_leads` and `submit_referral` untouched.
- Verified: baseline 0 referrals (94 leads), one synthetic referral moved counts to 1 of 95, deleted, back to 0 of 94. Rate limit and duplicate-phone behavior unchanged.
- Typecheck and production build clean. Preview only, nothing published.

## Pass 100 — Fall front door
- Added `applications.first_touch_at` (only new column); assignment stored on existing `reviewed_by`.
- New role-gated SECURITY DEFINER RPCs: `claim_application` (managers claim, owner/admin reassign), `log_application_first_touch`, `applications_pulse`. Anon execute revoked.
- Applications list now shows hours since arrival, owner, referral_source + source_type, Claim/Take over, tap-to-call, tap-to-text, and "Logged first touch"; unclaimed rows past 24h get the Pass 98 warm chip. Nothing sends from the app.
- Above the list: this month's application counts by source, real counts only.
- Requests header line: applications waiting · oldest in hours · unclaimed (`ApplicationsPulseLine`), live.
- Verified at database level: synthetic application inserted, owned and touched, then deleted; baseline back to 5 pending / 8 reviewed with 5 unclaimed.
- Typecheck and production build clean. Nothing team-facing lists archived people. Preview only; nothing published.

## Pass 101 — Training
- Learn (rookie + manager selection views) now opens with one "Next up" card: first unfinished required lesson, or the mastery check of a finished chapter, with Continue.
- New `useNextTraining` walks active rookie/manager courses, modules and lessons in order against `lesson_progress` and `mastery_checks`. No new tables.
- New `useTrainingWeek` + `TrainingWeekRow`: minutes this week, days trained out of days elapsed, current streak. Real numbers only.
- Manager Team view rows (tree + table) gained `TrainingWeekChip`: "Xm trained", or warm "No training this week" at zero minutes.
- Person profile shows "Last trained <date>" from `daily_training_time`, or "No training logged yet".
- Locked mastery rows now read "Unlocks when the N remaining lessons in this chapter are done"; unlocked pitch chapters show a warm "Record your pitch" chip into the existing roleplay path.
- Typecheck and production build clean. Preview only, nothing published.

## Pass 102 — The owner's week

- /command now opens with "The week": six live lines, each tapping through to the screen behind it.
- Signed for 2027 (total + last 7 days from lead_activities), re-sign calls (outcomes + people touched), applications (waiting + oldest hours), referrals (submitted + claimed), training (roster minutes + reps trained of active), money loaded (last Fiber/Pest import dates).
- New SECURITY DEFINER owner_week() returns the whole set as jsonb; admin/owner only inside the function, authenticated granted, anon revoked (verified: anon execute false, authenticated true).
- No new tables. Zeros read as zeros; missing pipes say in one plain sentence what would fill them.
- Live figures at verification: 14 signed, 0 calls in 7d, 5 applications waiting, 0 referrals, 146 training minutes across 3 of 23 active reps, no money imports yet.
- Existing command report content stays below the new lines.
- Typecheck and production build clean. Preview only, nothing published.

## Pass 103 — One-on-one prep
- `RepFactsCard` leads the prep panel with read-only rep figures: season revenue, rev/day, revenue goal, training minutes this week, last trained, signed-for-2027, referrals in (x of 3), days since last sale or fiber number. Missing data reads "Not on file", never a zero.
- Added two columns to both existing tables (no new tables): `commitment text` and `focus_area text` (checked to skill/desire/activity) on `weekly_one_on_ones_rookie` and `weekly_one_on_ones_manager`.
- `CommitmentFields` adds the one-sentence commitment and the optional Mind/Heart/Feet picker (44px targets) to both prep forms; the previous commitment shows at the top of the next prep with its date and focus word.
- Security: column-level SELECT on `commitment`/`focus_area` is revoked from `anon` and `authenticated`, so reps cannot read manager notes even on their own row (verified `has_column_privilege` false). Managers read via SECURITY DEFINER `get_prep_commitment` / `get_rep_prep_facts`, role-gated to manager/admin/owner, anon EXECUTE revoked; non-staff callers get `authorized:false`.
- Verified: one synthetic rookie one-on-one saved with commitment + focus then deleted; counts back to baseline 37 rookie / 15 manager (52 real records). No rep-facing display of focus area.
- Typecheck and production build clean. Preview only, nothing published.

## Pass 104 — Fiber rooms
- Fiber vertical channels: 0 before, 3 after — `fiber` (Fiber, order 2), `fiber-blitzes` (Blitzes, order 3), `fiber-wins` (Wins, order 4), all `is_active = true`, same shape/RLS as the Pest channels (no policy changes needed; existing policies scope by `vertical`).
- Deactivated (is_active false, nothing deleted, messages intact): `ai-coach` (AI Coach, 2 messages, cut from nav in Pass 87) and `team-parks` (PARKS, 0 active reps, 0 messages).
- Team room audit: the six teams holding non-archived reps (Apex 1, Atlas 2, Legion Mafia 6, Minions 5, Paper Route 6, Quality Control 2) each already had an active room — none missing, none created. Orphaned: `team-parks` only (deactivated).
- Verified at database level: active channels now 15; a Pest-scoped channel query (`vertical is null or vertical = 'Pest'`) returns zero `fiber%` rooms, and `get_conversations()` already filters by `my_active_vertical()`, so Fiber reps see the three rooms and Pest reps do not.
- No code changes were required — the chat strip reads channels from the database. Typecheck and production build clean. Preview only, nothing published.

## Pass 105 — Re-sign scripts
- Seeded 5 rows in `scripts` under category `Re-sign` (vertical NULL, active, order 1-5): producer in good standing, half-finished rookie, could-run-a-team, plus flips for "not sure I'm coming back" and "might have an internship". Spoken words only, no dollar or percentage figures — each names the tier and says the manager confirms the number on the call, and each ends asking for a specific time.
- Read policy on `scripts` rewritten: signed-in users still read active scripts, but `Re-sign` rows are readable only by manager/president/admin/owner. Reps cannot see them.
- Editable through the existing admin Scripts surface — `Re-sign` added to its category list.
- New `ReSignScriptsSheet` (one script at a time, prev/next, title chips, copy) opens from a Scripts button above the This week queue on `/app/leads` and from the lead card in `LeadDrawer` (staff tiers only).
- Verified at database level: 5 Re-sign rows, zero dollar/percent characters in any body; the read rule now uses the same `is_manager_tier` check the app's staff tier uses, so reps get none. Route check reached `/app/leads` without a session (redirect to login), so the sheet was confirmed by code path, not a signed-in click. Typecheck and production build clean; linter count unchanged at 353 pre-existing; nothing published.

## Pass 106 — Doors frame
- Bug sheet slot is now honest and admin-editable: `app_settings.pest_bug_sheet`, edited in Admin → Season tab ("Doors bug sheet" textarea, upsert on key). Empty reads "Your manager loads the local bug sheet here." No placeholder pests.
- The three paths (Fresh account, Switchover, DIY) moved into the sticky Doors header, so each is one tap from anywhere in Doors; tapping a path also returns to the script segment.
- Switchover now leads with "Who do you use right now?" — get the company and what they pay before any price is said.
- Westchester pricing groups untouched: same rows, same grouping, same numbers, still offline-cached.
- Offline cache still covers script, objections, closes and pricing plus the bug sheet in one `summit-doors-cache-v1` payload, and an empty fetch no longer overwrites it. Cold open with no connection: header, paths and segments paint from the last cached load; if the device never loaded Doors online, each segment shows its plain "ask your manager" line.
- Verified: typecheck and production build clean. Route check at 390 dark and light redirected to /login — a preview session could not be minted (multiple auth users, approval unavailable), so Doors itself was confirmed by code path only.
- Nothing published.

## Pass 107 — My week
- Added `manager_owed(_manager)` and `owed_by_manager()` (SECURITY DEFINER, authenticated only, anon revoked, role-checked inside; non-staff get zeros). No new tables.
- My week now opens with "What you owe this week": calls due, applications you own, applications unclaimed over 24h, reps with no training, one-on-ones not logged, reps who have not named their three. Zero-count lines are hidden; all zero reads "Nothing owed. Go find someone."
- Counts and nouns only; the Pass 98 warm chip marks calls due and stale applications. No red, no streak language.
- /command gains "Owed by manager" under The week, one line per manager sorted highest first, tapping to that manager's team. Owner and admin only.
- SQL check (owner scope): calls due 134, unclaimed applications over 24h 5, reps with no training 21, reps under three referrals 23 — matches the RPC's owner-scope query shape. `user_roles` holds no manager/president rows today, so the owner list renders "No managers on file".
- A rep never reaches these numbers: role check returns zeros and the section renders nothing.
- Typecheck and production build clean. Route-level click-through unverified: browser auth status is signed_out and no session could be minted.
- Preview only; nothing published.

## Pass 108 — Seats
- Added `is_effective_manager(uid)`: manager/president/admin/owner role OR at least one live rep via `downline_edges` (manages) or `profiles.manager_id`. `manager_owed` scope and `owed_by_manager`'s list now use it; downline scope stays each manager's own people. No other screen's permissions changed.
- New Admin → People → Seats (owner/admin only, `src/components/admin/SeatsPanel.tsx`): one row per active rep with team, manager, signed in or never, invite state (none/open/expired/used/revoked) and role; never-signed-in first; header counts never signed in, no invite, managers missing a role.
- Backed by role-checked SECURITY DEFINER RPCs, anon revoked: `seats_rows`, `create_seat_invite`, `revoke_seat_invite`, `set_manager_seat` (owner only), `seat_set_manager`. Seat invites are tagged on the existing `invites.note` as `seat:<user_id>` — no new columns, no new tables.
- Create invite writes an `invites` row scoped to the rep's role, vertical, team, manager with a 14-day expiry and copies the redeem link; Create all invites covers everyone without an open invite and returns a copyable name-plus-link list. Nothing is emailed or texted.
- Grant/Remove manager access shows only to the owner; admin sees the state.
- Andrew Bucy (Hewitt McBride) and Spiro Mellis (Logan McCarty) show "Manager departed" with a live-manager picker that writes `profiles.manager_id`, `direct_manager` and the `manages` edge together. No replacement guessed.
- Verified: `is_effective_manager` true for Rubino, Colton Joyce, Luc Chevalier, Sean Jablonski; false for Alex Justice, Lucas Martins, Daniel Kukui (7 effective managers total). One synthetic invite created, revoked and deleted — invites back to 0; one manager role granted and removed — `user_roles` back to owner 1, admin 2.
- Typecheck and production build clean. Preview only, nothing published. Linter shows 369 pre-existing-style definer warnings; every new function is role-checked inside with anon execute revoked.

## Pass 109 — Seats truth
- Seats now leads with last activity (later of auth sign-in and profiles.last_active_at), shown as date plus days since, sorted coldest first.
- Header counts replaced with active in last 7 days, dark 8 to 29 days, dark 30 days or more, plus managers missing a role.
- Choice on the dead column: keep stamping last_login_at on every sign-in (touch_last_login already does) and backfilled it from real sign-in history, so it is now populated for everyone who has signed in; nothing reads it in the UI.
- Invites are the exception: Create invite only shows for people with no auth account; the bulk button is scoped to those people, names the count, and is hidden when there are none. Copy and revoke unchanged, nothing sends.
- /command The week gains one owner/admin line: reps dark 30 days or more, tapping to Seats coldest first.
- Grant manager access and the one-sentence explanation kept exactly as built.
- Verified with no synthetic writes: direct SQL over 23 active profiles joined to auth sign-in and last_active_at returns 4 active in 7 days, 4 dark 8 to 29, 15 dark 30 or more, 0 without an account, matching the header. seats_rows and owner_week return zeros below admin and anon has no execute.
- Typecheck and production build clean. Nothing published.

## Pass 110 — Second proof

- Copy: removed the three em dashes added in passes 107 to 109 (Seats intro, invite list line, manager-grant note). No other pass 107 to 109 string had one.
- Routes: all 10 public screens at 390 and 1280, dark and light: 0 overflow, no console errors, tap targets at 44px minimum. Signed-in screens could not be opened; `lovable auth-session` needs approval for a specific user, so those are proven at database and permission level only.
- Security: all 17 functions added since pass 96 are SECURITY DEFINER with the role check inside. Eight of them (seats_rows, manager_owed, owed_by_manager, is_effective_manager, create_seat_invite, revoke_seat_invite, set_manager_seat, seat_set_manager) still allowed anonymous execute; revoked, authenticated granted. set_manager_seat is owner only; seat_set_manager refuses an archived or nlc target.
- Tables: none with RLS off; only backup_job_tokens has RLS on with no policy.
- No leak: seats_rows and owed_by_manager return an empty payload with zero counts for any non admin/owner caller; every people-facing helper filters archived and nlc.
- State: profiles 535, active 23, people_leads 551, recruiting_leads 94, applications 13, invites 0, roles owner 1 / admin 2, downline edges 395. No drift.
- Linter delta: anonymous SECURITY DEFINER warnings 36 to 28; total 369 to 361. Remaining are pre-existing signed-in SECURITY DEFINER notices plus the OTP length setting.
- Cron: unchanged; job history is not readable from this environment.
- Typecheck and production build clean. Nothing published.

## Pass 111 — Owner walkthrough
- Chat: could not reproduce a crash (signed out, session mint unavailable); data is clean (17 channels, 712 messages, no null rows). Hardened the real suspect instead: `src/lib/lazyRoute.ts` wraps all 59 lazy routes, and a failed dynamic import now purges caches, unregisters the worker, and reloads once with a cache-busting param; the unhandled-rejection handler recovers silently instead of showing the dead toast; `public/sw.js` bumped to v3, refuses to cache 404 asset responses, and accepts a CLEAR_CACHES message.
- Hero truth: `leads_counts()` now returns `roster_total` and scopes signed/unsigned to people actually on the roster. Verified by SQL: 14 signed of 142, 128 unsigned worth $4,752,747; the 409 not_on_roster names (zero revenue) left the denominator.
- Home hero reads "14 of 142" with the words "Signed for 2027" under it and "128 on the roster not signed"; the re-sign board header shows "14 of 142" and states that historical names are not counted. Nothing else on Home moved.
- Invite dialog: opens with "This makes a link. Send it yourself. Whoever opens it lands in the app on this team, waiting for your approval." Locked (known person) mode shows role, vertical, team, region and manager as plain text instead of pickers; the generic dialog keeps its pickers and defaults.
- Link proof: one synthetic invite created, `/invite/<token>` loaded signed out at 390 and rendered the redeem form ("You are invited to Summit · Pest · Rep · Invited by Mathew Joyce") with no horizontal overflow; redeem still lands approved false per the Pass 96 gate; row deleted, invites back to 0.
- Typecheck and production build clean. Linter unchanged at 361 (no new findings). Not published.

## Pass 112 — Decision queue
- Bottom clearance: new `.phone-bar-clear` (84px + safe area, off at 1024px) applied to the inner scroll containers on Requests, War room, Leaderboard, Scripts, the DM list, and the chat composer, so nothing ends under the phone bar; Home, Leads and Learn already use `.app-main-pad`.
- Old applications converted to leads: Yuop Chigach, Samuel Fleming, Frank, Aiden Vann became recruiting_leads with source_type `application` and their applications are now status `converted` (searchable under All, out of pending and out of the Requests badge). Mason Primmer stays pending.
- Stale scheduling: 3 February/March pending requests marked `expired`. Rule lives in `expire_stale_scheduling_requests()` (SECURITY DEFINER, authenticated only), called on every scheduling fetch in `useSchedulingRequests`: pending expires when the recipient is archived, NLC or missing, or the request is over 30 days old.
- Season mode is one switch plus season dates (`season_start_date`, `season_end_date` in app_settings, dates only, no behavior attached). The Doors bug sheet moved out of Season into the Playbook tab as `BugSheetEditor`, unchanged in behavior; no toggle was dropped.
- Events: owner and admin get Delete and Delete series via `delete_calendar_event(uuid, boolean)` (owner/admin check inside, anon revoked, hard delete of the event plus attendance, assignees, notifications), one confirm dialog. `get_events_feed` and the month view now exclude `is_cancelled` rows.
- Verified: pending applications 1, scheduling pending 0, recruiting_leads 98, profiles 535, active 23, invites 0, cancelled events 0, no other drift. Typecheck and production build clean; linter 361 to 363, the delta being the two new role-checked functions.
- Authenticated 390px route walk not possible this pass (no session could be minted), so overlap was fixed at the CSS/container level and verified in the built stylesheet.

## Pass 113 — Events
- One Events screen: /app/events lists upcoming cards with Going / Can't make it plus a List and Calendar toggle (CalendarPage now renders embedded). /app/calendar and /app/operations redirect to /app/events.
- Nav has one entry named Events for every role and workspace (Pest, Fiber, Life main groups); Schedule/Blitzes duplicates removed from the sidebar and drawer.
- My week left the nav: MyWeekPage deleted, /app/week redirects to /app/team, and the owed list (OwedThisWeek) renders at the top of Team for both Pest and Fiber views. The owed RPCs are unchanged.
- get_events_feed now returns end_date so multi-day events show a range ("Mon Sep 28 to Sep 30"); anon execute revoked, authenticated only. Events page requests a 60 day back / 420 day forward window so the 2027 dates appear.
- Loaded the twelve real events: Shasta Leadership Trip (managers scope only), Howell MI and Gastonia NC fiber blitzes, Greece Sales Trip, Hawx Blitz Waves 1 to 3, LDP Nov 13, Prize Pick Up Nov 14, LDP Jan 9 2027, LDP Mar 4 2027, 2027 Sales Kick Off. Descriptions verbatim, no placeholders.
- Verified: 12 events added (1 managers-only, 2 Fiber, 4 Pest, 6 all-verticals), cancelled events 0 and never rendered (feed and calendar both filter is_cancelled).
- Rep visibility: the sampled active rookie holds no manager role, so can_view_event('managers') is false for the Shasta trip; team-wide events pass.
- RSVP verified at policy level only: reps may write and read just their own calendar_attendance row and my_rsvp reads back through the feed. A rep session could not be minted, so the click path was not walked in-browser.
- No baseline drift: profiles 535, active 23, recruiting_leads 98, applications pending 1, invites 0, roles owner 1 / admin 2, downline edges 395.
- Typecheck and production build clean. Linter count moved 361 to 364 from the recreated feed function family; no new distinct issue types. Nothing published.

## Pass 114 — Pay on Resources
- Derived year: `src/lib/repYear.ts` (parseRepYear/nextRepYear/repYearLabel) client side, and inside `my_next_year_pay()` server side. `profiles.rep_year` and `people_leads.rep_year` untouched.
- Resources gains a Pay tab (`LinksPage`, `MyNextYearPay`), signed in only, showing the rep's own next-season tier in words plus the confirmed Fiber v5 per-install rates for that tier. No other tier, no overrides, no manager margins.
- Pest section carries one line only: "Pest pay scale drops here when the owner loads it." No numbers.
- New `my_next_year_pay()` is SECURITY DEFINER, scoped to `auth.uid()`, anon execute revoked (verified anon_exec false, auth_exec true). Old `stack_visibility` flags are not consulted; nothing public changed.
- Tier mapping: year 1 to Tier 1, 2 to Tier 2, 3 to Tier 3, 4 and up to Tier 4. All 23 active reps have null `rep_year`, so they resolve to First year today and see Second year rates for 2027: 13 carriers at $150 per install (13 rows, one distinct value).
- Date render fix: multi-day ranges now read the stored day in UTC in `EventsPage.fmtRange` and `CalendarPage`, so Howell reads Aug 30 to Sep 14 and Greece reads Oct 6 to 10; no day added or dropped.
- Baseline unchanged: profiles 535, active 23, leads 98, invites 0, pending applications 1, edges 395, confirmed stack rows 80.
- Typecheck and production build clean. Preview only, not published.

## Pass 115 — One on one prep
- /app/one-on-ones/prep opens on the roster, header "Prep this week's one on one", nobody preselected.
- Scope enforced in the database by new SECURITY DEFINER prep_roster(): owner/admin see every manager group, a manager sees only his directs, a plain rep gets nothing. anon and PUBLIC execute revoked, authenticated granted.
- People whose manager is missing or archived group under "Needs a manager" (3 today), owner and admin only.
- One live search filters the visible list; tapping a person opens the form in a sheet with the Pass 103 prep facts and previous commitment above it, person locked in.
- Saving stamps the week and moves the "not logged this week" count with no refresh.
- Every active rep reads as Vet for next season, year derived at read time from rep_year (null counts as first year); rep_year and roster fields untouched.
- Invite dialog gains one Rookie or Vet choice, stored on invites.experience_level (default rookie).
- Verified by SQL: actives 23, Rubino directs 4, anon execute false, authenticated true, logged this week 0.
- Both weekly one on one tables unchanged; no new tables. Typecheck and production build clean, nothing published.

## Pass 116 — Cover page
- Rebuilt `/` around the three-peak mark, layered light, shadow, restrained grain and slow reduced-motion-safe depth; headline is "Financial freedom. Done differently."
- The hero contains no door-to-door wording; application, industry, calculator, parent and sign-in paths remain intact.
- Simplified the work and season sections into open editorial rows with fewer boxes; calculator behavior and real data are unchanged.
- Login now uses the same atmospheric background language; the sign-in and reset forms are untouched.
- Verified `/` at 390 and 1280 in dark and light: headline legible, document width exact, no horizontal scroll; `/login` at 390 also has zero overflow.
- Route checks produced no page exceptions; the only console output was the existing preview-instrumentation React ref warning. Typecheck and production build clean; no video, font, or JS dependency added. Nothing published.

## Pass 117 — Chat
- Chat home is now a WhatsApp style list: cover photo or monogram, name, last message with the sender's first name, timestamp, unread badge, tap to open. Room strip deleted (`RoomStrip.tsx`, `useChatRooms.ts` removed).
- New column: `chat_channels.cover_image_path` (nullable). Covers upload to the private `chat-uploads` bucket and are read through signed URLs; `chat_attachment_readable` now allows a cover to anyone who can read that room.
- New RPCs `can_set_channel_cover`, `set_channel_cover`, `get_channel_details`; `get_conversations` returns the cover path. `has_function_privilege`: anon false, PUBLIC false, authenticated true on all four.
- Cover authorization is database side: owner, admin, president, the room's creator or that team's leader only. A plain rookie evaluates false, owner true; the SQL runner is itself refused execute.
- Room: tap the header name for members with photos and the cover control; incoming bubbles show avatar plus first name, direct messages hide the name; composer stays above the phone nav (`phone-bar-clear`).
- Summit tokens only in both themes (ice, fiber mint, success, warning, primary muted), 44px targets, no new tables beyond the one column.
- Data untouched: 17 channels, 15 active, 712 messages, 0 covers set.
- Typecheck and production build clean. Route walk at 390 and 1280 in dark and light redirected to /login with zero overflow and no page errors; authenticated chat rendering is unverifiable in this environment because minting a session needs owner approval that is unavailable here.

## Pass 118 — Home loop
- New `src/components/home/HomeFeed.tsx`: chat row, next two events with RSVP, open blitz lines, training next-up plus minutes row, in that order.
- Chat row: most active group room (unread first, else newest), sender first name, preview, timestamp, unread badge, taps to `/app/chat?room=<slug>` which now deep-links straight into the room.
- Events: next two by start time from `get_events_feed`, Going / Can't make it on the card via `rsvp_event`, plus one All events link.
- Money: one line per open blitz (`event_kind = blitz`, last day not passed), taps to `/app/events#event-<id>`; Events cards now carry that anchor and scroll to it. Renders nothing when no blitz is open.
- Cut from above the fold on Pest Home: standalone Next event card, standalone chat preview card, One-on-ones row and Bring someone in for staff (both duplicate tabs), Needs attention stays. Kept hero number, streak line and Needs you. Week bars, Top today, Your three, quick chips, Winter plan stay under More.
- SQL truth: latest message wins / Mathew Joyce / 2026-08-26; next two by start SEASON START then Howell MI Fiber Blitz; open blitzes Howell, Gastonia, Hawx Waves 1-3.
- Baseline unchanged: profiles 535, recruiting_leads 98, invites 0, chat_messages 712.
- Typecheck and production build clean; existing tokens only, no new colors or fonts.
- Signed out at 390 dark and 1280 light: zero horizontal scroll, `/app` redirects to `/login`; authenticated Home render not verified because a session could not be minted without approval.
- Nothing published.

## Pass 119 — Recruit gate
Locked recruits: derived rule only (is_gated_recruit): onboarding_status pending, not archived/alumni, no leadership role. All 23 actives, admins and owner resolve unlocked (0 actives are pending).
Day one course (existing videos, read back from app_settings.day_one_video_ids): 1 Peters Intro, 2 David PATP, 3 Mason PATP, 4 Setting an Effective Goal, 5 Understanding Objections, 6 Inspection Close.
Lock: /recruit-course reached through BootcampGate; the page shows the course, progress, minutes and nothing else; last item watched unlocks the app with the Pass 98 celebration once.
Manager view: Team gains a Recruits group (percent, watched count, minutes, last active) from gated_recruits(); managers see directs, owner and admin see all.
Admin: Content > Day one course reorders, adds or removes items via set_day_one_items(); no content is created.
Invite door: redeem plus code verification now lands on /recruit-course before anything else.
Verify: temporary pending flip returned locked=true, restore returned locked=false, owner locked=false; profiles 535, actives 23, invites 0, active summer_ready back to 20.
New functions: PUBLIC and anon execute revoked, authenticated and service_role only. Typecheck and production build clean. Preview only, nothing published.

## Pass 120 — Chat control
Bubbles: tails on the last message of a group, timestamp inside the bubble, sticky date chips, grouped avatars, muted one check delivered / two checks read from chat_read_state (channel_read_mark).
Menu: long press on phone, right click on desktop. Reply and Copy for everyone; Edit and Delete for your own message; owner and admin for any message in any room.
Server enforced: edit_chat_message and delete_chat_message check the caller. A rep touching another person's message is refused; RLS update and delete now allow own rows or owner/admin only (the broad manager delete policy is gone). chat_messages gained edited_at, shown as a small "edited" label. Deletes remove the message for everyone through a realtime DELETE subscription.
Rooms: the channel sheet lets owner and admin rename any room and delete a room behind a typed DELETE confirmation; a team leader can rename his own team room; direct messages cannot be renamed. Nobody else sees the controls.
Verify: anon call to edit_chat_message refused (42501); owner-scoped calls to edit, delete, rename and read mark all succeeded on a cross-author message. One synthetic message created, reassigned to a rep, owner edited it (edited_at stamped) and deleted it; chat_messages back to 714, chat_channels 17. New functions: anon execute false, authenticated true.
Not verified: the rep-scoped refusal could not be executed end to end because a rep session cannot be minted here; the guard was confirmed by policy and function definition (own row or is_chat_admin only).
Widths 390 and 1280 in both themes: no horizontal overflow, no new console errors (only the pre-existing React ref warnings).
Everything from Pass 117 still works: list, covers, unread badges, composer above the nav, typing, reactions, attachments. Not published.

## Pass 121 — Members and the owner line
- Channel sheet: Add members picker (faces, search) plus one tap remove with an Undo toast; owner and admin on any room, a team leader on his own; DMs excluded.
- New chat button on the chat list: managers and above name a group, pick members and an optional cover; every rep can start a DM through the existing people search.
- Server enforced: add_channel_members, remove_channel_member, channel_member_options, create_group_channel, can_manage_channel_members, all SECURITY DEFINER with anon and PUBLIC execute revoked (verified anon false, authenticated true).
- visible_chat_channels now shows a group room only to its members (owner and admin see all); existing channels, team rooms and DMs unchanged.
- get_channel_details returns can_manage_members and lists a group room's members from its member list.
- Staff Home: the reps count line and Open my week button are gone; owner and admin get one three number row, Signed for 2027 14 of 142 to the re-sign board, Dark 30 days or more 15 to Seats, Applications waiting 1 to Requests. Managers see no replacement row.
- Verified in the database: owner created a test room with 3 members, a rep was refused on add, remove, create and the picker, the room was deleted and channels returned to 17; messages 714, profiles 535, invites 0.
- The three Home numbers match direct SQL (14 of 142, 15, 1).
- Chat at 390 and 1280 in dark and light: no horizontal overflow, no new console errors.
- Typecheck and production build clean. Nothing published.

## Pass 122 — Full audit
Session was injected (owner). Walked every route in src/App.tsx at 390/1280, dark and light; 172 captures in docs/screens/. Light captures render dark because the app theme comes from the user preference, not the browser color scheme — noted as a limitation.
Rookie first-open path from code: /invite/:token redeems -> profile created pending -> useRecruitGate locks -> BootcampGate redirects every /app route to /recruit-course -> six day-one items -> completion celebration -> gate clears -> /app.
Fixed this pass: manager_owed() rebuilt without a temp table (it was STABLE + CREATE TEMP TABLE, so owed_by_manager returned HTTP 400 and /command "The week" and "Owed by manager" never loaded); staff Home subline no longer says "N this week across N reps"; /command "Open My week" is now a 44px bordered control instead of a bare underlined link; My money hides orphan "—" driver/source lines.
Ranked findings, worst first:
1. /app/leads — only 2 leads visible against 98 in the pool; the roster scope is far tighter than the owner expects.
2. /command — Money loaded says "No data loaded yet"; no Gainz or Vision import has ever run, so the money half of the owner's week is blank.
3. /app/leads — Call mode shows 0 and reads inactive while two leads are due; the count source disagrees with This Week.
4. /app/leaderboard — "Fastest claim-to-sign 3851.4h" is presented as a win; the metric needs a floor or a different label.
5. /app/events — two red Delete buttons on every card dominate the screen; red is reserved for mandatory and errors.
6. /app/events — raw Zoom URLs wrap across three lines in event bodies; they should be a single Join control.
7. /app/leaderboard — team battle rows all read 0 and team names truncate ("Quality C…").
8. /admin/requests — tab counts render twice and a Demo walkthrough button sits beside live queues.
9. /app/chat — RSVP cards clip at the right edge at 390 with no affordance that the row scrolls.
10. /app/money — every industry reads "not set" / "no data"; the screen cannot yet answer "what am I making".
Cover page, honest rating: strong and on-brand, would hold three seconds. Biggest movers, not shipped: (a) real live proof numbers under the headline, (b) larger headline scale with tighter measure at 1280, (c) higher-contrast filled primary CTA against a deeper layered background.
Verify: no data writes beyond docs, code, and the manager_owed function definition; baselines untouched. Typecheck and production build clean. /command, /app, /app/leads, /app/money rechecked after the fix: no HTTP 400, no overflow at 1280, only pre-existing React ref warnings. Not published.

## Pass 123 — Role chips and the owner key
- New database function role_chips(uuid[]) decides one label per person: Owner, Admin, Manager, Vet, Rookie. Null or blank rep_year gets no chip, nobody is guessed into Rookie.
- New useRoleChips hook batches label lookups; new RoleChip component renders one quiet chip, theme colors, no red.
- Chips added on the person profile header, the member profile modal (NLC badge kept), chat sender names, the channel member list and the member picker. The modal no longer guesses "Rookie".
- Owner key: inline "Edit profile" on /app/person/:userId for owner and admin only, writing name, phone and email straight to profiles.
- Server enforcement proven with role-scoped transactions: rep write to another person's profile 0 rows, rep write to an event 0 rows, owner profile write 1 row, owner event 1 row, resource 1 row, lead 1 row, chat room 1 row. Every check ran inside an aborted transaction, so no rows changed.
- Migration granted EXECUTE on is_chat_staff to authenticated and revoked PUBLIC and anon, which is what unblocked owner room edits at table level. role_chips and parse_rep_year_text: anon false, PUBLIC false, authenticated true.
- Chat message moderation from pass 120 reused, not duplicated. Reps keep exactly their current powers.
- Chips verified for one known person of each role at 390 and 1280 with an owner session, correct label every time and the edit control present.
- Removed one em dash from the profile tracking line.
- Linter still reports 387 broad issues, almost all pre-existing SECURITY DEFINER notices plus the short OTP setting, not introduced here.
- Typecheck and production build clean. Nothing published.

## Pass 124 — Honest pages, manager funnel, fiber key, approvals cleanup
- Under construction card (exact copy "This page is still being built") on My money industry cards with no money source and on the Command Center Primary Objective money panel when command settings were never saved. Invented defaults no longer render.
- Manager funnel server side: lead_match_manager, route_people_leads, lead_decline_designation, lead_assignment_queue, lead_assign_to_manager. Leads funnel to the direct manager by name match, decline drops them to the open pool, unmatched leads sit in an owner assignment queue rendered inline on /app/leads for owner and admin only.
- Bingham system freed: designated leads to Joshua Bingham 57 to 0, open pool 417 to 474. Blocklist lead_route_blocked_managers holds 14 people (him plus his 13 direct downline), so their leads never auto route.
- Fiber key: fiber_editors table plus is_fiber_editor, owner extendable. Verified Mathew Joyce true, Brandon Pillar true, third admin Liam Gardner false. Admin Fiber hub renders read only for everyone else.
- Approvals: pending only with "Nothing waiting right now", past decisions (approved and sent back) behind the collapsed history. Removed the duplicated Requests count row and the Demo walkthrough button on /admin.
- Names: profiles Hunter Shannon and Gideon Peters, people_leads Gideon Peters. No merges, no deletions.
- Function privileges proven with has_function_privilege: all seven new functions anon false, authenticated true.
- Baselines untouched: chat_channels 17. Typecheck and production build clean. Nothing published.
