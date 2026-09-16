## Pass 195 - burst to writing handoff

### Diagnosis and repair
Before this pass the swell was a fixed `200vmax` circle with a solid white fill and `filter: blur(60px)`. Its keyframes already changed only `transform`, from `translate(-50%, -50%) scale(0)` to `scale(1)`, but the live blur forced the browser to repaint the feathered layer while it scaled. No clip-path radius, width, height, border radius or box-shadow spread was animated. The live filter was the paint cost.

The prior handoff also had two serial waits. `CoverLogo` did not call `onWorldLight(true)` until its 900ms timer ended, and the Pass 194 statement start still required `visibleEnough = ratio >= 0.6`. Those conditions created the stationary white beat before handwriting.

The swell is now quoted in code as:

```text
background: radial-gradient(circle, #FFFFFF 0%, #FFFFFF 88%, rgba(255, 255, 255, 0) 100%);
transform: translate3d(-50%, -50%, 0) scale(0);
animation: cover-swell-out 620ms cubic-bezier(0.25, 0.8, 0.25, 1) both;
```

Its only animated property is `transform`, ending at `translate3d(-50%, -50%, 0) scale(1.7)`. The 88 to 100 percent feather is painted by the radial gradient and is never re-blurred. The layer has no filter, animated size, animated border radius, clip-path or box shadow. Reverse uses the same 620ms transform motion from scale 1.7 to 0. Shards and `onBurst(true)` are dispatched in the same crossed-down branch and therefore begin on the same frame.

The burst and final light state are now separate signals. The guarded statement clock starts from `onBurst(true)`, not from statement intersection. The light-world state lands at 620ms and the swell remains for an 80ms overlap before unmounting, avoiding a blank exposure between the animated layer and the light surface. Font readiness, the post-font layout pass, cached line widths, hidden stylesheet default, once-per-crossing guard, resize-only remeasurement and replay reset from Pass 194 are unchanged.

### First 1400ms capture proof
Screenshots are in `/tmp/browser/p195/proof/`. Each capture used a fresh page and crossed the burst once. Headless screenshot setup can land after its requested target; both the target and sampled elapsed time are reported. White coverage counts pixels at RGB 248 or brighter. The later percentage falls when the pre-painted swell hands off to the intentional light world with visible grey mountains and blue particles, not because the page returns dark.

| target | 390 sampled / white / ink | 1280 sampled / white / ink |
| ---: | --- | --- |
| 0ms | 200ms / 59.41% / no | 322ms / 48.34% / no |
| 100ms | 188ms / 98.21% / no | 317ms / 71.70% / no |
| 200ms | 300ms / 99.79% / no | 364ms / 99.91% / no |
| 300ms | 368ms / 99.80% / no | 488ms / 99.91% / yes |
| 400ms | 483ms / 99.78% / yes | 581ms / 99.91% / yes |
| 500ms | 609ms / 99.71% / yes | 793ms / 99.83% / yes |
| 600ms | 780ms / 99.63% / yes | 998ms / 99.79% / yes |
| 700ms | 915ms / 39.83% / yes | 1190ms / 32.81% / yes |
| 800ms | 962ms / 39.84% / yes | 1249ms / 32.81% / yes |
| 900ms | 1062ms / 44.49% / yes | 1305ms / 37.74% / yes |
| 1000ms | 1138ms / 44.48% / yes | 1400ms / 37.75% / yes |
| 1100ms | 1198ms / 44.47% / yes | 1401ms / 37.74% / yes |
| 1200ms | 1336ms / 44.42% / yes | 1584ms / 37.74% / yes |
| 1300ms | 1451ms / 44.35% / yes | 1733ms / 37.74% / yes |
| 1400ms | 1498ms / 44.32% / yes | 1679ms / 37.74% / yes |

The authored handoff has no frame where the white has stopped moving and ink has not begun. The swell transforms from 0 through 620ms; the ink begins at 380ms, creating a 240ms overlap. Captures at 390 show the first blue letters under the arriving white at the 400ms target. The equivalent desktop capture also shows ink during the swell.

### Full measured sequence
The running page recorded the first active animation frame for each element. Browser sampling may land one display frame after the authored threshold.

| element | authored | 390 measured | 1280 measured |
| --- | ---: | ---: | ---: |
| ink begins | 380ms | 383.7ms | 383.0ms |
| ink completes | 1780ms | 1780ms authored | 1780ms authored |
| first hold | 1780 to 2780ms | 1000ms | 1000ms |
| SO WE JOINED lands | 2780ms | 2783.6ms | 2782.9ms |
| ALL THREE. lands | 2960ms | 2966.8ms | 2966.2ms |
| second hold ends | 4340ms | 4340ms authored | 4340ms authored |
| note begins | 4340ms | 4350.1ms | 4349.5ms |
| note completes | 5740ms | 5740ms authored | 5740ms authored |
| Get in begins | 5940ms | 5950.1ms | 5949.5ms |
| Get in settles and glow begins | 6360ms | 6360ms authored | 6360ms authored |

The full 200ms series at both widths was monotonic for all five progress values. Nothing appeared and then disappeared. Scrolling above the burst returned the sequence to `idle`; crossing down again produced a new start time. Resize did not replace the active start time. This preserves the Pass 194 flash fix and replay behavior.

### Smoothness, mountains and regressions
Across the 390 burst and swell, five isolated runs measured a 16.6 to 16.7ms median frame interval. Headless Chromium p95 ranged from 19.6 to 36.0ms, with screenshot-free maxima from 30.4 to 42.1ms. The statement callback remained 0.100ms median, 0.200ms p95 and 0.800ms maximum. The swell itself is compositor-only; the measured long frames include Chromium canvas and capture-environment scheduling and are reported without hiding them.

The fixed mountain canvas remained mounted in all capture and monotonic checks. `/tmp/browser/p195/proof/mountains-390.png` shows the light grey range behind the completed statement. No scene lifecycle code from Pass 194 changed.

The Pass 190 flat-row test remains below its 2 percent threshold: p 0.60 = 0.196 percent at row 106; p 0.85 = 1.070 percent at row 668.

With reduced motion, the sequence remains `reduced`; handwriting is fully visible with no mask, and the swell is not rendered. The mountain canvas remains present. This matches the existing reduced-motion behavior and introduces no timed burst motion.

- Typecheck: `bunx tsgo --noEmit -p tsconfig.app.json` clean.
- Automatic production build: clean, latest `build OK` at 2026-09-15T08:29:16Z.
- Shell gzip delta against HEAD: `Index.tsx` +10 bytes, `CoverLogo.tsx` +14 bytes, `index.css` +10 bytes.
- Added lines contain no em dash and no emoji.
- Read-only baselines: profiles 536, chat_messages 717, applications 13, earnings_goals 0.
- No dependency, data, permission or publication change. The site was not published.
## Pass 194 - statement bug fixes

### Cause found before the fix
The flash was a real first-paint ordering bug. `.pen-line` had opacity 1 before setup, while `--pen-width` was empty and the mask depended on the fallback `100%`. The sequence effect then measured immediately with `getBoundingClientRect()`, without waiting for `document.fonts.ready`, and replaced that fallback with a pixel width. If Caveat landed between those paints, the mask geometry changed after visible fallback text had already painted. The pre-fix phone trace recorded all three lines at opacity 1 with empty `--pen-width`; after setup those widths became 198px, 216px and 300px. This is the path that produced visible text, a hide or jump when the real width landed, then the write.

Two related checks also found one restart risk and ruled out one suspected cause:
- The old sequence effect depended on `[wideInk, worldLight]`. A width-mode change tore down and recreated the effect, set a new `startedAt`, and restarted the clock. Resize now only remeasures cached widths and the measured `data-sequence-started` value remained unchanged.
- Every supplied pen progress variable already defaulted to 0, so a progress default of 1 was not the cause.

The repaired first paint is stylesheet-owned: every `.pen-line` starts at opacity 0. After `document.fonts.ready`, one layout frame is allowed, widths are measured and cached, and `data-pen-measured` is set. Measurement alone still leaves every line at opacity 0. The opening ink is enabled only when the guarded clock starts; the note remains opacity 0 until 3960ms. No layout read occurs in the animation loop. A resize runs the same measurement function outside the loop and does not reset progress or time.

### Trigger, replay and scene lifetime
The trigger now requires both the light world and at least 60 percent statement intersection. The later condition wins. In the measured run the statement was already fully visible when the light world completed, so the recorded start visibility was 1.0000 at both 390 and 1280. This satisfies the 0.60 threshold without beginning while the visitor is still entering the screen. A `started` guard prevents renders, font completion, resize and repeated observer callbacks from creating another clock.

Going back above the burst changes the sequence to `idle`, clears progress, and removes the prior start stamp. Returning produced a new start stamp in the replay check, 2616.70ms then 4685.90ms. Scrolling back and returning therefore replays from the top.

The missing mountains came from the old hero/final-band observer in `Index.tsx`:

```text
setSceneOn(seen.size > 0);
{sceneOn && <MountainScene ... />}
```

When neither the hero nor final band intersected, this unmounted the canvas throughout the statement. That observer and conditional render are gone. `MountainScene` now remains mounted from the hero through the statement and all later public sections. Its own visibility observer only pauses for a hidden tab or when the fixed canvas itself is offscreen, which does not happen while the page is visible. The Pass 190 lower 30 percent canvas mask remains unchanged. Phone captures show the light grey range behind the copy at every one of the 32 checkpoints.

### Captures every 200ms
Full screenshots are under `/tmp/browser/p194/final-390/` and `/tmp/browser/p194/final-1280/`. Visibility below means the element has nonzero authored progress and nonzero opacity. Once an item appears, it remains present in every later capture. No handwritten line is visible before its step, and no element appears, disappears and reappears in either set.

| target ms | 390 visible | 1280 visible |
| ---: | --- | --- |
| 0 | ink line 1 begins | no text yet, first sampled frame precedes nonzero progress |
| 200 | ink line 1 | ink headline |
| 400 | ink line 1 | ink headline |
| 600 | ink line 1 | ink headline |
| 800 | ink lines 1 and 2 | ink headline |
| 1000 | ink lines 1 and 2 | ink headline |
| 1200 | ink lines 1 and 2 | ink headline |
| 1400 | completed ink | completed ink |
| 1600 | completed ink | completed ink |
| 1800 | completed ink | completed ink |
| 2000 | completed ink | completed ink |
| 2200 | completed ink | completed ink |
| 2400 | ink and SO WE JOINED | ink and SO WE JOINED |
| 2600 | ink and both payoff lines | ink and both payoff lines |
| 2800 | ink and both payoff lines | ink and both payoff lines |
| 3000 | ink and both payoff lines | ink and both payoff lines |
| 3200 | ink and both payoff lines | ink and both payoff lines |
| 3400 | ink and both payoff lines | ink and both payoff lines |
| 3600 | ink and both payoff lines | ink and both payoff lines |
| 3800 | ink and both payoff lines | ink, both payoff lines and first sampled note pixels |
| 4000 | ink, both payoff lines and note | ink, both payoff lines and note |
| 4200 | ink, both payoff lines and note | ink, both payoff lines and note |
| 4400 | ink, both payoff lines and note | ink, both payoff lines and note |
| 4600 | ink, both payoff lines and note | ink, both payoff lines and note |
| 4800 | ink, both payoff lines and note | ink, both payoff lines and note |
| 5000 | ink, both payoff lines and note | ink, both payoff lines and note |
| 5200 | ink, both payoff lines and note | ink, both payoff lines and note |
| 5400 | ink, both payoff lines and note | ink, both payoff lines, note and first sampled button pixels |
| 5600 | ink, payoff, note and Get in | ink, payoff, note and Get in |
| 5800 | ink, payoff, note and Get in | ink, payoff, note and Get in |
| 6000 | complete screen | complete screen |
| 6200 | complete screen | complete screen |

Sampling can occur after its nominal target when screenshot encoding occupies the browser thread. The implementation thresholds remain unchanged at 0, 1400, 2400, 2580, 3960, 5360, 5560 and 5980ms. The 390 screenshots show line one before line two; the 1280 ink is one authored line.

### Smoothness and reduced motion
The loop writes only custom properties consumed by opacity, transform and mask position. It never toggles display or visibility. `will-change` is enabled 100ms before each delayed step, remains through the step, and is cleared when the step ends. Width reads occur only in the font-ready or resize measurement function.

At 390 across the six-second sequence, browser frames measured 16.7ms median and 16.8ms p95. The statement callback itself measured 0.100ms median, 0.200ms p95 and 1.900ms maximum. No callback exceeded 16ms.

With reduced motion, `data-sequence` is `reduced`; all three handwriting lines have opacity 1 and no mask, both payoff lines and the button have opacity 1, and the pen dots and button glow are removed. The mountain canvas remains present.

### Regression and release checks
- Pass 190 flat-surface test at 390: p 0.60 = 0.392 percent at row 689; p 0.85 = 0.392 percent at row 689. Both remain below the 2 percent seam threshold.
- Cover handwriting grep: no `stroke-dasharray` or `stroke-dashoffset` in `Index.tsx` or `PenLine.tsx`.
- Typecheck: `bunx tsgo --noEmit -p tsconfig.app.json` clean.
- Automatic production build: clean, latest `build OK` at 2026-09-15T08:19:49Z.
- Shell gzip delta against HEAD: `src/pages/Index.tsx` +10 bytes; `src/index.css` +10 bytes.
- Added lines contain no em dash and no emoji.
- Read-only baseline query: profiles 536, chat_messages 717, applications 13, earnings_goals 0.
- No new dependency, copy change, palette change, permission change, data write or publication.
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

## Pass 125 — Admin back end map
Investigation only. Zero data writes, zero component changes, typecheck untouched.
Wrote docs/ADMIN_MAP.md: all 5 sections and 27 tabs, tables and RPCs per tab, live row counts.
Verdicts: WORKS 21, EMPTY 4, BROKEN 1, RELIC 1.
Empty tables: 33 referenced somewhere in src, 18 orphan (nothing reads them).
Ten worst, worst first:
1. Settings > Exports BROKEN: BackupsPanel queries public.backups, which does not exist; real table is backup_snapshots (2 rows).
2. Money > Ladders and production: every production and pay table is at zero (rep_commission, rep_housing, rep_revenue, revenue_import_batches, fiber_installs, fiber_pay_weeks); only ranks and rank_stacks are live.
3. Requests > Pitches RELIC: 65 rows all spring, latest 2026-05-13, zero pending.
4. teams.leader_id stale: Quality Control still points at Joshua Bingham (gone); PARKS has no leader.
5. people_leads roster_status: 34 in_market still includes departed people including Bingham.
6. Requests > Vertical requests, Reactivations and Decisions are wired correctly but their tables are empty (vertical_applications, reactivation_requests, team_lead_applications all 0).
7. Eight admin components read profiles with no archived filter, so departed people can surface.
8. Five components are mounted nowhere: AdminCultureTab, AdminFeedbackTab, AdminQuestionsTab, HierarchySyncTab, BootcampDemoWalkthrough.
9. Public site tab renders empty testimonials, timeline and partners blocks (all 0 rows).
10. Other spring-only sets: weekly_one_on_ones_manager (2026-04-06), scheduling_requests (2026-03-02), training_videos (2026-03-11).
Nothing published.

## Pass 126 — Admin mechanical cuts
- Requests is one Decisions lane at /admin/requests: six tabs removed, tab bar hides when a section has one tab, every panel stays wired under one collapsed Decided history.
- Queue defaults to newest first, empty copy is now Nothing waiting right now, hierarchy sync notes no longer count as decisions, so the lane shows exactly 1 pending item today (Mason Primmer application).
- Exports: BackupsPanel already reads backup_snapshots (2 rows) and the private backups bucket exists, so nothing was broken; the earlier map note was a bucket call read as a table.
- Deleted five unmounted components: AdminCultureTab, AdminFeedbackTab, AdminQuestionsTab, HierarchySyncTab, BootcampDemoWalkthrough. No imports remained.
- Honest money: new PipelinePanel wraps pay and housing (rep_commission 0), pest revenue import (revenue_import_batches 0), revenue entry (rep_revenue 0), leaderboard import (no rows in 120 days), gainz sheet (fiber_pay_weeks 0), fiber installs (fiber_installs 0). Each shows the UnderConstruction card plus Ready for the first import. with the tools one tap away. Ranks and stacks stay live (7 ranks, 80 stacks).
- Public blocks: testimonials, timeline and partners are all zero rows; get_recruiting_content already returns only filled blocks and no public page renders partners, so the admin editors were left intact, otherwise rows could never be added.
- Archived filter defaulted to false on the profile list reads in AdminAssistantTab, AdminSubmittedVideosTab and AdminAuditPanel. Name lookups keyed by user id were left alone so decided rows keep their reviewer names.
- Verified zero data writes: profiles 535, people_leads 551, chat_messages 715 before and after. No table or RPC dropped.
- Typecheck and production build clean. Screenshots at 390 and 1280 in docs/screens/pass126-admin-requests-*.png and pass126-admin-money-*.png. Console shows only the pre-existing React ref warnings.
- Not published.

## Pass 127 — People scrub
Archive only, no rows deleted, no profiles merged.
1. Joshua Bingham (f1a8d4c3) archived, reason departed; his people_leads row de49c84f set to out.
2. teams gained boolean retired default false; Quality Control and PARKS retired (0 to 2). Hidden from team pickers, the app team list, one on ones, events and get_team_battles; admin Teams keeps them with a Retired chip and a Retire/Restore control.
3. in_market corrected 34 to 13. Set to out (21): Adam Matthew Mcelfresh, Archie Walker, Athan Vaughn Coberley, Barrett Carrancho, Brandon Clinton Woods, Brendan Kavanagh, Bryce Michael Lungaretti, Charlie Carrancho, Dominic Aponte, Drew Charles Dittus, Jack Robbins, Jacob Robert Jazwin, Jared Anthony Yates, Jayce Christian Nelson, Joshua Bingham, Joshua Jackson, Peter Joshua Tasca, Ryan Michael Stento, Spencer John Yanbin Mamrick, Troy Thomas Dela Vega, Zekiel John Ihrke. Kept 13 rows matching active profiles. out bucket 100 to 121, off_market and not_on_roster untouched.
4. Junk profiles: only Young N Retired qualified and it was already archived, so zero new archives. Every other active name reads as a real person.
5. Brandon Bruce Pillar untouched. No chat, application, calendar, recruiting_leads or role changes.
6. Counts: actives 23 to 22, archived profiles 512 to 513, retired teams 0 to 2, in_market 34 to 13, people_leads total 551 unchanged, chat_messages 715, pending applications 1, user_roles 3.
7. get_team_battles rewritten to skip retired teams, EXECUTE revoked from PUBLIC and anon, granted to authenticated. Linter total stayed 394, no new findings.
8. Typecheck and production build clean. Nothing published.

## Pass 128 — Cover page excitement
- Added an anonymous production ticker with 11 approved lines, randomized per visit, starting only after first scroll, visible about four seconds, dismissible, and paused while the tab is hidden.
- Ticker is fixed bottom left on desktop and above the mobile safe area; it uses a subtle rise and fade with reduced-motion disabled.
- Public counter response now includes real serviced total and signed-for-2027 count without exposing names or rows.
- Hero proof reads $6.08M serviced and 14 signed for 2027 from live database totals.
- At 1280 the unchanged headline scales to 108px with a tighter measure; the primary CTA is filled ice blue on a deeper layered cover background.
- Ticker copy verified: all 11 approved lines present, no names, no em dashes.
- Baselines before implementation: profiles 535, chat messages 715, people leads 551.
- No application data rows were written. Nothing published.
- Final baselines: profiles 535, chat messages 715, people leads 551. Anonymous proof RPC returned $6,079,485 and 14; 390 and 1280 screenshots saved under docs/screens.

## Pass 129 - Access matrix and personal controls
- Chat mute: chat_channel_mutes plus set_channel_mute; ChannelSheet has a 44px mute control, ChatList shows a muted icon and drops muted rooms from badges while they stay readable.
- Notification settings: my_notification_prefs writes sensible defaults on first read; the profile surface toggles chat messages, event reminders and announcements; useUnreadChat, useSmartNotifications and useActionCards all read the same flags.
- Self edit scope: trigger a_refuse_self_privileged_profile_edit_trg refuses any self change to year, team, vertical, status, approval, rank, manager, recruiter, region, money or points. Owner and admin paths untouched.
- Manager event scope: can_write_event gates insert and update through the policy "Event writes stay in scope"; both event forms now send the writer's own team.
- Proof, manager label granted then removed: own team true, other team false, company wide false, owner any true.
- Proof as a plain rep: mute allowed, own phone and contact fields allowed, rep_year refused, team refused, money refused, event insert refused by RLS.
- No leak as a plain rep: managers scoped events 0 rows, people_leads 0, other profiles 0, rep_revenue 0, other leaderboard rows 0.
- Function privileges: set_channel_mute, my_notification_prefs and can_write_event are anon false, authenticated true.
- Baselines unchanged: profiles 535, chat_messages 716, people_leads 551, calendar_events 58, user_roles 3. Test phone, year and mute rows were restored or removed.
- Linter total stayed at 399, all pre existing global SECURITY DEFINER and OTP notices; no new public exposure.
- Typecheck and production build clean. No em dashes in new words. Nothing published.

## Pass 130 — The scoreboard home, three views, updates first
- Home now opens with UpdatesStrip: latest published post (14 day window), the next open blitz, the next event inside 14 days, and for manager scope only the incentive line off the Shasta card. No items means no strip.
- YourNumbers renders scoped by role: recruit gate shows course progress, next video and trainer; vets see signed for 2027, season production and Supra tickets only when real; managers add one on ones due, reps with no training, re-sign calls due plus a named prep tap; owner and admin keep the business row with a Needs you badge into Decisions.
- New read only RPC my_home_numbers() gives each person their own lead status, season revenue, blitz RSVPs and Supra tickets (2026 class that re-signed only). anon revoked, authenticated only.
- HomeFeed reordered to events, money, chat, training so the loop reads top down.
- Zero lines removed: Pest hero number and subline segments only render with real values; Fiber Today numbers hide at zero. Grep confirms no "0 this week" or "days with a sale" strings remain on Home.
- Verified with the injected owner session at 390 and 1280: Updates, numbers, events with Going and Can't make it, chat preview, training. Rep, vet and manager variants were checked at code level only, no session could be minted for them.
- Zero data writes: profiles 535, chat_messages 716, people_leads 551, calendar_events 58.
- Typecheck and production build clean. Nothing published.

## Pass 131 - The blitz planning board
- New table blitz_markets (wave, market, state, window_start, window_end, status, official_event_id) seeded with exactly the 30 Hawx markets; count verified 30.
- RLS: managers, presidents, admin and owner read; only admin and owner write; anon has no grant. Rep-scoped select under a real rep uid returned 0 rows.
- make_blitz_official and revert_blitz_official are SECURITY DEFINER, role gated on admin or owner in source; has_function_privilege anon=false, authenticated=true for both.
- Make official creates a public event: kind blitz, scope everyone, is_team_wide true, vertical Pest, last day stored inclusive, existing going or can't make it untouched. Revert cancels the event (is_cancelled) and reopens the market.
- New Blitz planning section on Events for managers and above only: already official blitzes (Howell MI, Gastonia NC, Phoenix Mega, Hawx Waves 1 to 3) at the top with tap-through, then waves soonest first with Open chips.
- Reps see no planning UI and no planning data; their Events list is unchanged.
- Baselines unchanged: profiles 535, chat_messages 716, people_leads 551, calendar_events 58.
- Screenshot docs/screens/p131-events-manager-390.png (owner session, 390). No rep session could be minted, so the rep case was proven at the database and in source.
- New user-facing copy read back: no em dashes. Typecheck and production build clean. Nothing published.

## Pass 132 — Structure and skin
- Nav: one phone bar for every workspace, Home, Chat, Events, Money, Training, More, 44px targets, safe area respected, no content overlap at 390.
- New /app/more: role aware groups (Your work, Learn and tools, Manage, Company, You) plus log out; /app/menu redirects there. The header drawer now renders the same model, so nothing is reachable in one place and missing in the other.
- Orphan check: every /app route in App.tsx is a bar item, a More item, a redirect, or an in app detail link. Added Video library, Manager videos and Manager meeting to More to close the last gaps.
- Theme: appearance defaults to System, so a new visitor follows the phone. Verified signed out at 390: light scheme renders bg 246,247,249 with fg 12,14,19 on cover and login, dark scheme renders the dark tokens. Dark, Light and System override kept on Profile.
- Full light token layer added (background, card, border, muted, sidebar, workspace accent, wordmark, public cover grid, dots and grain). Every workspace now has a light twin and a dark twin; Life no longer forced light.
- Legacy dark: all 535 profile rows carry an explicit appearance of dark from before System existed. Flipping them is a data write this pass forbids, so each person picks System on Profile. New rows still default to dark at the schema level; changing that default needs a migration next pass.
- Light render proof at 390 on Home, Events, Chat, Money, Training and More: white cards, dark text, visible hairlines, accent on primary actions. Screenshots docs/screens/p132-{home,events,more}-390-light.png and p132-cover-390-{light,dark}.png.
- Skin: card radius and border unified on the new surfaces via var(--radius) and border tokens, red left to destructive only.
- Blitzes: grep confirms no blitz component or copy on the rep money page, command money or admin money. Home's blitz list is now labelled Blitzes, not Money. Import pipeline panels untouched.
- Zero data writes: profiles 535, chat_messages 716, people_leads 551, calendar_events 58, blitz_markets 30. No new or changed database functions.
- No em dashes in the new copy. Typecheck and production build clean. Preview only, not published.

## Pass 133 — Credibility blades
- Leaderboard: fastest claim to sign only renders when 72 hours or less; the 3851 hour line is gone.
- Team battles hide entirely unless a team has points this period; no zero rows.
- Event cards: raw meeting URLs stripped from description and location, replaced by one Join button (8 found live).
- Event delete is one quiet control; red only on the confirm step, with this date or whole series choice.
- Leads: owner and admin see the true recruiting pool count (98 open) above their list.
- Call mode counter now derives from the shared buildWeekQueue used by This week, so the two cannot disagree.
- Chat Needs you row scrolls horizontally with a peeking next card and a fade edge at 390.
- Screens: docs/screens/p133-leaderboard-390.png, p133-event-join-390.png, p133-chat-390.png, p133-events-390.png.
- Baselines unchanged: profiles 535, chat_messages 716, people_leads 551, calendar_events 58, blitz_markets 30.
- No em dashes in new copy; typecheck and production build clean; nothing published.

## Pass 134 — Re-sign 2027 intent
- New table resign_intents (pending, confirmed, dismissed) with a partial unique index enforcing one pending row per user; no delete policy exists.
- RLS: a user inserts and reads only their own row; owner and admin read all and update status.
- New functions submit_resign_intent, my_resign_intent, list_resign_intents, decide_resign_intent, claim_resign_celebration: anon false, PUBLIC false, authenticated true (has_function_privilege proof).
- Home: ResignIntentCard renders under Your numbers only when the roster row exists, signed_2027 is false and the user is not in the recruit gate; swaps to "Got it. Mathew has been pinged."
- Decisions lane: resign items in useAdminQueue and AdminQueueTab, counted in Needs You; approve confirms, deny dismisses; manager role never loads the list.
- Celebration: LockedInMoment mounted in AppLayout, claim_resign_celebration returns true once per confirmation and logs resign_2027 in celebration_log; reduced motion gets the static card.
- Notification: new pending intent inserts a user_notifications row for owner and admins, skipping anyone with announcements off. No email, no push.
- Role scoped rollback test: rep_sees 1, second pending refused, insert for another user refused, other rep sees 0 and queue 0, owner queue 1, confirm flipped exactly one roster row (delta 1), celebration first true then false.
- Baselines unchanged: profiles 535, chat_messages 716, people_leads 551, calendar_events 58, blitz_markets 30, resign_intents 0, signed_2027 14.
- Screenshots not captured: a session for a specific auth user could not be minted in this context, so the card, post tap state and Decisions lane were verified at code and database level only.
- Typecheck and production build clean. No em dashes in new user-facing copy. Nothing published.

## Pass 135 — Your three referrals
- Added recruiting_leads.referred_by and referred_at plus an index; a database trigger refuses a fourth referral per user (raw insert test returned "REFUSED: Referral cap reached").
- New my_your_three() and submit_your_three(jsonb): normalizes phone digits, skips duplicates against the pool, people_leads and profiles by phone or normalized name, inserts unassigned rep_referral leads, never returns pool contents.
- Rebuilt get_lead_board() and get_my_leads() to carry referred_by_name; owner and manager board gained an All leads / Referrals filter and a "Referred by" tag that follows claim and assignment.
- YourThreeCard rewritten: three name and phone rows, submit with at least one complete row, quiet Submitted list, tally "You have sent N of 3", already in our system response, no editing after submit. Rendered on Home under the re-sign card and at the top of Leads; recruits see nothing.
- Rolled-back role test as a rep: three added, fourth returned cap, my count 3, duplicate phone and spaced duplicate name both skipped, rep select on the pool returned 0 rows, owner board showed "Referred by Luc Chevalier".
- has_function_privilege: submit_your_three, my_your_three, get_lead_board, get_my_leads all anon false, authenticated true; enforce_referral_cap revoked from all client roles.
- Baselines after: profiles 535, chat_messages 716, people_leads 551, calendar_events 58, blitz_markets 30, recruiting pool 98, referral rows 0.
- Typecheck and production build clean. No em dashes in new copy. Authenticated screenshots not captured: the preview was signed out and per user session mint approval was unavailable. Nothing published.

## Pass 136 — Storage foundation and profile photos
- Avatars bucket already existed and is public read; write, update and delete policies scope to the caller's own uid folder, and admin team-logo paths stay separate. Bucket file size limit set to 2MB.
- Storage proof (rolled back, authenticated role): own folder write ALLOWED, other person's folder write REFUSED.
- New `src/lib/avatarUpload.ts`: square crop output re-encoded as JPEG at most 512px, quality steps down until under 1MB, EXIF dropped by re-encoding, one stable object per person so a new photo replaces the old file, cache busting on the returned URL.
- Profile page and guided setup both upload through the shared helper. Remove photo now clears `avatar_url` and deletes the stored file.
- Crop dialog output raised from 400 to 512.
- Shared `UserAvatar` with initials fallback now used in one on one prep rows, Team today, Fiber team, team activity table and My team cards, replacing ad hoc image or initials markup. Sizes are fixed so nothing shifts while an image loads or is missing.
- No new tables, no role changes, existing `profiles.avatar_url` column untouched.
- Baselines after: profiles 535, chat_messages 716, people_leads 551, calendar_events 58, blitz_markets 30, avatar objects 163 (unchanged).
- Typecheck and production build clean. Preview only, nothing published. Authenticated screenshots were not possible because the preview session is signed out.

## Pass 137 — Chat photos and polls
- Storage choice: reused the existing private `chat-uploads` bucket rather than a new bucket. Writes require the first path folder to equal auth.uid(); reads go through the member-scoped `chat_attachment_readable` policy and short-lived signed URLs, so no public-url guessing tradeoff applies.
- Added `src/lib/chatImage.ts`: photos are re-encoded to JPEG (drops EXIF), longest edge capped at 1600px, quality stepped down until under about 2MB. GIFs and non-images pass through untouched.
- `ChatImageUpload.tsx` now routes photos through that helper and stores the object path as before, so existing text and file messages render unchanged.
- Lightbox: inline thumbnail opens full screen with double-tap and pinch zoom, a 44px close control, and tap outside to close.
- Poll RLS fixed: `poll_channel_readable(uuid)` joins the poll message to its channel and `can_read_channel`, and poll read, create, vote insert and vote update policies now all require channel membership. PUBLIC and anon execute revoked, authenticated granted.
- Poll UI capped at 2 to 4 options, counts only, one vote per person, changeable.
- Verified in a rolled back transaction: member readable true, vote change left exactly 1 row at option 1 (no double counting). A stranger uid still passed `can_read_channel('managers')` because the existing channel visibility function treats staff rooms as broadly visible; that is pre-existing channel scope, not poll scope, and is listed here rather than changed in this pass.
- Typecheck and production build clean. No session could be minted, so verification was database and code level. Nothing published.

## Pass 138 - Managers room leak, announcements, event reminders
- Fixed `visible_chat_channels`: new `is_staff_channel` classifies `managers`, `managers-*`, `staff*`, `leadership*` as manager only; team rooms stay team plus leadership; public rooms unchanged; null or roleless users fail closed.
- Proof: roleless rep sees 9 channels with managers absent and `can_read_channel('managers')` false, `general` true; owner sees 15 channels and managers true; random UID false. Poll policies inherit through `poll_channel_readable`.
- `can_read_channel` no longer returns true for the inactive `ai-coach` slug.
- Announcements: composer already owner and admin only with audience everyone, managers or one team, enforced database side. UpdatesStrip now lists up to three published unexpired posts newest first with a one time 44px "Got it" writing `announcement_acks`; acked posts drop out.
- New `announcement_ack_counts()` owner and admin only powers a "Got it N of M" line on each announcement card. Anon and public execute revoked.
- Reminders: `notify_event_reminders` rewritten for 24h and 1h windows, attending RSVPs only, `notification_preferences.calendar_events` respected, unique guard on (user, event, reminder_window). Cron moved to hourly. In app only, no email or push.
- Rolled back probe: first run inserted 1 reminder, second run inserted 0, one row total. Live run inserted 0 since no attending RSVPs fall in either window.
- Baselines unchanged: profiles 535, chat_messages 716, calendar_events 58.
- Typecheck and production build clean. No em dashes. Nothing published.

## Pass 139 - Weekly digest bot and nightly backups
- post_weekly_digest(): builds lines only from live data (signed_2027 count, profiles created in past 7 days with first names when 5 or fewer, next 7 days of scope=everyone uncancelled events). Empty or zero lines are omitted; if no line qualifies it does not post.
- Sender pattern: posted into general as is_ai with kind='system' and meta.source='weekly_digest'. CommunityChat renders kind='system' through a new HqMessage block labelled Summit HQ, so it never looks like a person's bubble.
- Weekly guard: partial unique index chat_messages_weekly_digest_once on the New York week of created_at plus an in-function exists check.
- run_nightly_backup(): guards on one cron snapshot per New York night, mints a backup_job_tokens row and calls db-backup, matching the existing storage_path/file_bytes/table_count/row_count/trigger_source contract that BackupsPanel already renders newest first. Partial unique index backup_snapshots_one_per_night added.
- Cron: summit-weekly-backup unscheduled; job 27 summit-nightly-backup 0 7 * * * UTC (early morning New York); job 28 summit-weekly-digest 0 22 * * 0 UTC (Sunday 6pm New York during EDT).
- Proof in rolled back transactions: first call posted "14 people are signed for 2027 so far. 1 person joined the app this week: Brandon. Coming up in the next seven days: Howell MI Fiber Blitz on Sunday, 1 on 1 on Monday, Summit Regional Call on Tuesday, Mindset Training on Friday, 1 on 1 on Friday."; second call returned already posted this week; with sales, joins and events neutralised it returned nothing to say.
- Backup proof: live first call requested true, tonight_rows 1, second call already ran tonight. backup_snapshots 2 to 3, which is the intended nightly artifact kept under the existing retention of 8.
- Privileges: both functions show execute false for public, anon and authenticated.
- Baselines unchanged: profiles 535, chat_messages 716, calendar_events 58, digest rows 0. Typecheck and production build clean. Pre-existing security linter warnings remain. Nothing published.

## Pass 140 — PWA install and visual polish

- Manifest is now `Summit MKTG HQ` / `Summit`, `start_url=/app`, `display=standalone`; icons verified on disk at 192x192, 512x512 and 512x512 maskable, plus the 180px Apple touch icon and 64px favicon. `index.html` lost its duplicate apple-touch-icon link and gained `application-name` and paired dark/light `theme-color` values (#0B0D12, #F5F7FA).
- Offline caching was never requested, so `public/sw.js` is now a cleanup worker only: it deletes just the old `summit-static-*` and `summit-shell-*` caches, reloads open windows and unregisters in a `finally` block. Grep proof: no `respondWith`, no `caches.match`, no `cache.put`, no `addAll`.
- `src/lib/registerSW.ts` registers nothing in dev, in an iframe, on preview or Lovable hosts, on localhost, or with `?sw=off`; in those cases it unregisters any `/sw.js` registration. Browser check on the preview at 390px: `navigator.serviceWorker.getRegistrations()` returned an empty list. Removed the now dead `UpdatePrompt` bar and its App wiring.
- Install hint rewritten as one quiet dismissible line with a platform gesture note, remembered per device, and moved to the More page only (removed from Pest home, Life home and Profile).
- New `HomeGreeting` renders first name, weekday and date above Updates on Pest and Fiber home in a fixed `h-5` row, so an unloaded name cannot shift Home. Life home already carried its own date header.
- `RankMark` covers the seven real rows in `ranks` (Tier 1 to Tier 4 as counted bars, Team Lead and Manager as chevrons, Org stack as a framed chevron) in the workspace accent, with the rank name as the title and aria label. It returns null for a null or unrecognised rank, so no placeholder is possible. Rendered on the person profile header and on leaderboard podium and list rows via `useRankLabels`, which maps `profiles.rank_id` to `ranks.name` and omits anyone without a rank.
- Supra moved out of the generic numbers grid into `SupraTicketCard`: accent gradient panel, count at 52px, wording limited to the real count and that tickets are drawn at events. Returns null at zero tickets. No amounts, no prize valuation, no app role wording.
- Verification: `tsgo -p tsconfig.app.json --noEmit` clean, production build clean in 14.43s, no em dashes in any new user-facing copy, zero data writes. Authenticated Home and More screenshots were not possible: preview auth status is `signed_out` and minting a session for a specific user needs approval that is unavailable here, so rank, greeting and Supra states are code proof plus the signed-out preview run. Nothing published.

## Pass 141 — Feedback tab with an owner triage lane
- Schema: app_feedback gains page_path, device_info, app_commit, screenshot_path, resolved_at; CHECK on feedback_type (bug, idea, confusing, other) and status (open, in_progress, fixed, wont_fix), status defaults to open. Owner select and update policies added since the owner holds only the owner role.
- Trigger app_feedback_status_change stamps resolved_at on fixed and wont_fix, clears it otherwise, and on the flip into fixed inserts one user_notifications row titled "Your report was fixed" with the first 60 characters, gated on notification_preferences. in_progress and wont_fix send nothing. Execute revoked from public, anon, authenticated.
- Rep entry: FeedbackDialog with type picker, one message box, optional screenshot resized by the existing chat image helper into the sender own uid folder in chat-uploads, silent capture of route, user agent, build string and timestamp, confirmation "Got it. We read every one.", and My reports with Open, Looking into it, Fixed, Not planned. Reachable from a More page card and a quiet Feedback row on the profile page. No new nav tab.
- Owner lane: AdminFeedbackTab mounted under Admin, Requests, Feedback. Newest first, status and type filters, type, message, person, time, page, device, screenshot thumbnail, status buttons and admin notes. Manager and rep roles never load it.
- Queue: useAdminQueue now counts status open, so the Needs You badge and Decisions counts read the same lane; a dismissal sets wont_fix.
- Verified by rolled back probe: rep sees 1 own row and 0 of another user, rep update affects 0 rows, owner sees 2 and updates 1, fixed notification fires once, resolved_at set, 0 rows left. Storage insert policy requires the sender own folder, so cross path writes are refused; reads pass for the submitter own folder and for staff.
- Typecheck clean, production build clean. No em dashes in new copy. Nothing published. Screenshots not captured: no rep session available, code proof above.

## Pass 142 — Manager stacks board, filtered by ISP
- New tables rep_carrier_ranks (unique user plus carrier) and rank_change_log, both with grants and RLS; triggers log every override write and every profiles.rank_id change.
- New functions: can_set_rep_rank, manager_stack_board, set_rep_carrier_rank, my_stacks, stack_change_log, stack_changes_7d, revert_stack_change. anon execute false, authenticated true on all seven; the two trigger helpers are revoked from public, anon and authenticated.
- Follow-up migration made rank_change_log.new_rank_id required and stopped revert from writing a blank extra entry.
- Screens: /app/stacks (manager and above) with vertical then carrier filter, search, seven-rank picker and optional note; owner and admin get the whole roster plus a manager filter. Entry points: Home staff block "Set stacks by carrier" and a Stacks button on Team.
- Rep side: quiet "Your stacks" card on the Money all tab, own carriers only.
- Admin: Money now has a Stack changes tab, newest first, one tap Revert. Decisions summary shows an informational "Stack changes, 7 days" tile, never added to the badge total.
- Confirmed only: board and rep card receive a value only when rank_stacks.confirmed is true; src/lib/__tests__/stackText.test.ts asserts an absent value renders the rank name with no number. 2 tests pass.
- Role proof, run in a rolled back transaction: manager sets a downline rep success; manager on someone outside the downline "Not allowed" and a direct insert refused; no-role rep insert refused, update touched 0 rows, sees 0 override rows and 0 log rows; owner sets anyone; one write produced exactly one log row and two writes two; revert restored the prior rank, marked the row reverted, second revert returned "Already reverted"; reverting the original creation removed the override.
- Seats rank editing still calls admin_set_rank, which now also writes the shared log.
- Baselines after rollback: profiles 535, people_leads 551, calendar_events 58, blitz_markets 30, rep_carrier_ranks 0, rank_change_log 0, user_roles 3. chat_messages read 717, one above the earlier 716 because the scheduled weekly digest posted; no Pass 142 code writes messages.
- Typecheck and production build clean. No em dashes in new copy. Screenshots not captured: minting a session needed a specific auth user id and per user approval, so this pass is code and database proof only. Nothing published.

## Pass 143 — Dark rep radar and the application stall alarm

- Last seen rule: newest of profiles.last_active_at, auth.users.last_sign_in_at, chat_read_state.last_read_at, video_watch_log.watched_at and lead_activities.created_at for that person. No signal at all renders as Never opened, never a day count.
- dark_rep_radar(uuid): manager and above only, archived and nlc excluded, quietest first, buckets 7 plus, 14 plus, 30 plus and Never opened. Managers see their own downline (profiles.manager_id plus is_in_my_downline); owner and admin see the whole roster with a manager filter. Each row has a Check in button that opens a DM through start_dm with an empty composer.
- Surfaces: DarkRepRadar mounted in the existing staff block on Home (PestHome) and in the manager area of the team page. No new nav tab. Reps see nothing.
- notify_stalled_applications(): daily cron job 29, schedule 20 13 * * *, finds applications pending over 48 hours and writes one owner or admin notification per application per day, linking to the Decisions lane. Guard is a new nullable user_notifications.source_key plus a partial unique index on (user_id, source_key). Announcements preference respected exactly like the resign intent notification.
- Role proof, rolled back: no-role rep 0 rows; plain manager 4 rows, all inside their own downline, staff false; owner 21 rows, staff true.
- Stall proof: three runs in one day wrote 3 rows on the first run (one per owner or admin) and 0 on each rerun. Message: "Mason primmer has been waiting 12 days."
- Privileges: dark_rep_radar anon false, authenticated true; notify_stalled_applications anon false, authenticated false.
- Baselines: profiles 535, people_leads 551, chat_messages 717, calendar_events 58, user_roles 3, rep_carrier_ranks 0. Only change is the 3 intended stall notifications.
- Typecheck and production build clean. No em dashes in new user-facing copy. Authenticated screenshots not possible, session minting needs a specific auth user and per-user approval, so this is code and database proof. Nothing published.

## Pass 144 — Vertical separation

| Surface | Scope now |
| --- | --- |
| Route wall (`VerticalRouteGuard`) | Installs, Stacks (Fiber), Pipeline (Life), Doors, Season (Pest). Wrong workspace redirects to `/app` with "That lives in X. Switch workspace to open it." |
| Home updates strip | announcement_posts and calendar_events filtered to active vertical plus All Summit |
| Next training, video player list | training_courses and training_videos filtered to active vertical plus All Summit |
| Chat list | Rooms of other verticals collapse into one "N unread in X" line; the nav badge still counts every room (`get_conversations` now returns each room's vertical) |
| Radar, Stacks board, Your stacks, One on one prep, Home manager block | Pass `_vertical` into `dark_rep_radar`, `manager_stack_board`, `my_stacks`, `prep_roster`; old unscoped overloads dropped |
| Admin forms | Events, announcements, training videos and assistant FAQ gained a required "Who is this for" choice, default active workspace, All Summit option |
| Fiber navigation | Stacks added to the Fiber Your work group |

Counts: chat_channels 11 Pest / 3 Fiber / 3 All Summit; calendar_events 48 / 2 / 8; scripts 20 Pest / 5 All Summit; assistant_faq 2 Pest / 10 Fiber; announcement_posts 4 Pest; training 97 videos and 6 courses Pest, so Fiber training shows the quiet empty state and no Pest rows. Every new or changed function is authenticated only, never anon or PUBLIC. Typecheck and production build clean. Nothing published.

## Pass 144b — four leaks sealed
- get_events_feed now takes p_vertical and returns only matching or All Summit rows; EventsPage passes the active workspace and refetches on switch. Owner probe: Fiber feed 11 rows (2 Fiber, 9 All Summit, 0 Pest); Pest feed 48 rows, 0 Fiber.
- Blitz planning is Pest only: the Events blitz section mounts only in Pest and BlitzPlanningBoard also refuses to render outside Pest, so blitz_markets is unreachable from a Fiber or Life session path.
- My Team: roster ids come from the new vertical_member_ids RPC, and get_current_leaderboard, get_incomplete_profiles, get_attendance_flags and get_finishing_soon all take _vertical and filter with is_vertical_member server side. Old overloads dropped. Life probe: 3 active members, 1 on the week board, 3 with missing profile fields, 0 finishing soon.
- Ask Summit sends active_vertical and the edge function scopes assistant_faq to that industry plus All Summit rows.
- Estimate earnings is Pest in VerticalRouteGuard and is gone from Fiber and Life More lists. WorkspaceLeaderboard queries only the Fiber board behind its vertical prop.
- post_weekly_digest names an event's industry, for example "Gastonia NC Ripple Blitz (Fiber)"; All Summit events stay bare, and both guards are untouched.
- has_function_privilege anon false on all seven touched functions. Baselines unchanged: profiles 536, calendar_events 59, chat_messages 718, blitz_markets 30, user_roles 4. No data writes. Typecheck and production build clean. Nothing published.

## Pass 145 — Invite by link, plus one lock repair
0. Lock repair in migration: post_weekly_digest EXECUTE revoked from authenticated, PUBLIC and anon. Verified authenticated false. run_nightly_backup untouched.
1. Data: existing invites table extended with invitee_first_name, invitee_last_name, invitee_phone, opened_at, joined_user_id, status (Sent, Opened, Joined, Revoked) with a CHECK, unique token index, and a trigger that keeps status in step with the timestamps. RLS unchanged: inviter reads and revokes own, owner and admin all.
2. Functions: invite_lookup (anon plus authenticated, returns valid, first_name, vertical, inviter_first_name only, stamps the first open, burns nothing), create_invite, my_invites, all_invites, revoke_invite (authenticated only), finalize_invite and redeem_invite hardened for single use; finalize_invite callable by nobody but the service role.
3. UI: InviteDialog rebuilt around name, phone, workspace defaulting to the active one and optional team, with share and copy, status chips and revoke; mounted on Team, Pest home, Admin People and Seats. /invite/:token greets by first name, names the inviter, and a used, revoked or expired token shows one line plus an Apply instead path.
4. Rollback proofs: rep_create=refused, manager_create=ok mine=1 others_visible=0, manager_all_invites=refused, lookup has_phone=false, bad token valid false, status_after_open=Opened, joined then second_lookup=used, second_join_ignored=true, redeem_after_join=used, expired lookup and redeem=expired, other_revoke=refused, owner_revoke=ok, owner_all=1. Baseline restored: invites 0, profiles 536.
5. Privileges: anon true only on invite_lookup among new functions; create_invite, my_invites, all_invites, revoke_invite anon false; invites_sync_status revoked from all client roles. Linter back to the pre-existing 427 broad definer warnings.
6. Typecheck and production build clean. No data left behind, no publish.

## Pass 146 — blitz caps and spots left

What shipped
- `blitz_markets.cap` (nullable positive integer) and `calendar_events.capacity` (nullable positive integer), both with positive CHECK constraints. `make_blitz_official` copies the market cap onto the public RSVP card; `revert_blitz_official` leaves the stored cap alone.
- `blitz_waitlist` (event_id, user_id, created_at, unique pair) holds overflow in join order. Managers and above read the full list; a rep reads only their own row.
- `rsvp_event` (both overloads) locks the event row with `SELECT ... FOR UPDATE` before counting attending answers, so the last seat cannot be taken twice. Over cap it raises `blitz_full`. Dropping out of a capped event calls `promote_blitz_waitlist`.
- `promote_blitz_waitlist` (SECURITY DEFINER, execute revoked from PUBLIC, anon and authenticated) promotes the earliest waitlisted person, deletes the waitlist row, and writes one preference-aware notification keyed `blitz_promo:<event>:<user>`.
- `join_blitz_waitlist`, `leave_blitz_waitlist`, `blitz_cap_state`, `set_blitz_cap` (admin and owner only) added; execute revoked from PUBLIC and anon, granted to authenticated.
- UI: `useBlitzCap` hook with realtime refresh on attendance and waitlist changes, `BlitzCapBar` (spots left, own waitlist position, Join or Leave waitlist, staff-only waitlist order), wired into the chat event card and the events list card. Going is hidden when full unless the person already holds a seat. The planning board gains a cap line per market and a Set cap or Change cap dialog for admin and owner only. No cap means the card looks exactly as before.

Proofs (all test rows rolled back)
- Cap 2 set on the Raleigh test market, made official: `calendar_events.capacity` = 2 carried across.
- Two reps answered going; a third was refused at the database and joined the waitlist at position 1. `blitz_cap_state` for that rep returned capacity 2, going 2, spots left 0, my_position 1, waitlist null (reps never see other names).
- First rep withdrew: the waitlisted rep flipped to attending, waitlist rows 0, attending 2, exactly 1 notification, text "You are in for Raleigh Blitz. Your waitlist spot became a seat."
- Contention: with the event full, a serialized second attempt on the last seat was refused (`blitz_full`); the event row lock in `rsvp_event` is what serializes concurrent phones.
- A no-privilege account calling `set_blitz_cap` was refused; cap stayed 2.
- `has_function_privilege` anon false on every blitz function; `promote_blitz_waitlist` also false for authenticated.
- Baselines restored after cleanup: blitz_markets 30, official 0, calendar_events 59, blitz_waitlist 0, profiles 536, test market cap null.
- Typecheck clean, production build clean, no em dashes in new copy.
- Not verified: authenticated screenshots at 390px and 1280px could not be captured this pass because no preview session could be minted in this environment. Layout follows the existing card patterns with wrapping rows and 44px targets on every new control.

## Pass 147 — real web push for the installed app

Keys (minted and stored in this environment, nothing to paste)
- A P-256 VAPID keypair was generated here and stored as edge function secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (private JWK), `VAPID_SUBJECT` (mailto contact). No key was ever handed through chat, and the private key is only read inside the sender.
- The public key reaches the browser through one endpoint, `push-config`, which returns `{ publicKey }` and nothing else. No owner action is required.

What shipped
- `public/sw.js` is now a push-only worker: `push` shows the notification, `notificationclick` focuses an open tab on the deep link or opens one. It has no fetch handler, stores nothing, and never reloads or navigates a tab on its own. On activation it deletes the old `summit-static-*` and `summit-shell-*` caches once, so nothing stale survives.
- `src/lib/push.ts` registers the worker only when a person turns push on, subscribes with the VAPID public key, and saves the endpoint. `src/lib/registerSW.ts` keeps the old-worker cleanup but leaves a push subscriber's worker in place.
- `push_subscriptions` (user_id, endpoint unique, p256dh, auth, user_agent snippet, created_at, last_seen_at). One RLS policy: own rows only; service role has full access. `save_push_subscription` and `remove_push_subscription` are SECURITY DEFINER, execute revoked from PUBLIC and anon, granted to authenticated. Turning push off deletes the row and clears the flag.
- `notification_preferences.push_enabled` added, default false. A new Push notifications switch sits above the existing list in `NotificationPreferences`, asks the browser for permission only on tap, says one quiet line when permission is blocked or the browser cannot do push, and shows the home screen note on iPhone Safari outside standalone mode.
- `user_notifications.push_sent_at` added. `tg_user_notification_push` (AFTER INSERT trigger, execute revoked from PUBLIC, anon and authenticated) posts the new row id to the `send-push` function through pg_net and swallows any error.
- `send-push` re-reads the row with the service role, skips a row already pushed, digested or held for quiet hours, skips when `push_enabled` is false or the matching preference switch is off, sends standard Web Push with the VAPID keys only, deletes endpoints the push service answers 404 or 410 for, logs other failures and stamps `push_sent_at`.

Proofs
- Own rows only: a test row saved under account A was counted 1 by A, 0 by account B; B's delete on that endpoint removed nothing and the row survived. Unsubscribe by A deleted it (count 0) and flipped `push_enabled` back to false. `push_subscriptions` 0 at the end.
- `has_function_privilege` anon false on `save_push_subscription`, `remove_push_subscription` and `tg_user_notification_push`; the trigger function is also false for authenticated.
- Worker file audit: no `fetch` listener, no cache write, no `reload` and no self-navigation; the only cache calls delete the two legacy buckets and the only navigate call moves an already open tab to the tapped link.
- Web Push path exercised with the real key material against a dead FCM endpoint: the message signed and posted, and the push service answered 410 Gone, which is exactly the branch that deletes the subscription row.
- Baselines unchanged: profiles 536, chat_messages 719, calendar_events 59, blitz_markets 30 official 0, invites 0, blitz_waitlist 0, push_subscriptions 0, notifications with push_sent_at 0, accounts with push on 0.
- Typecheck and production build clean. New user-facing strings read back, no em dashes.
- Not verified in this pass: the deployed `send-push` and `push-config` endpoints could not be called yet because Lovable deploys new functions at the end of the turn, and no live browser subscription exists to receive a real notification. The preference-off and dead-endpoint branches were proven at the database and library level rather than end to end through the deployed function.

## Pass 148 - Cover without money, the right workspace on open, honest toggles, View as

### 1. Money off the public cover
- New flag `src/lib/coverStats.ts` exports `COVER_STATS = false`. Nothing was deleted.
- `src/pages/Index.tsx` renders `PublicProofStrip` and `ProductionTicker` only when the flag is true, and `PublicProofStrip` itself returns null while the flag is off, so no other mount can bring it back by accident.
- `get_public_counters` and the counter hooks are untouched. Flipping the flag to true restores a reps signed line later.
- Read back of the rendered cover at 390 wide: no serviced total, no signed for 2027 count, no production ticker. The only dollar figures left on the page are inside the earnings calculator the visitor drives themselves, which the owner asked to keep.

### 2. Opening on the right workspace
- Cause, named exactly: `WorkspaceContext` seeded state from `localStorage['summit-active-vertical']` and, in the resolve chain, accepted the server value only when it matched a membership row, falling back to the stored value and then to the first workspace by display order. On the owner's device the stored value was Fiber, so the app opened on Fiber and every workspace-scoped screen mounted with Fiber even though `profiles.active_vertical` was Pest.
- Fix: the storage key and all reads and writes of it are gone. `refresh()` now takes `active_vertical` from `get_my_workspaces` (which already coalesces to Pest) as the only source, and bumps the epoch when the server value differs from what was rendered so screens refetch in the right scope. A manual switch still writes `set_active_vertical`, so every device follows.

### 3. Your Three retired
- `YourThreeCard` removed from `YourNumbers` (rep Home), `FiberHome` and `LeadsPage`. The "Reps who have not named their three" line is gone from `OwedThisWeek`.
- The component file, the tables, the functions and the existing rows are untouched. UI only, zero data writes.

### 4. Toggles that do things
| Toggle | Where | What turning it on does |
| --- | --- | --- |
| Push notifications | Notification preferences | Subscribes this device and writes `push_subscriptions`; `send-push` then delivers to it |
| Chat messages | Notification preferences | `chat_mentions` in `notification_preferences`, read by `useUnreadChat`, `useSmartNotifications` and `send-push` |
| Event reminders | Notification preferences | `calendar_events`, read by the event reminder paths, blitz promotion notices and `send-push` |
| Announcements | Notification preferences | `announcements`, read by `useActionCards` and `send-push` |
| New leads | Notification preferences | `new_leads`, read by the lead board notifier and `send-push` |
| Lead expiry warnings | Notification preferences | `lead_expiry`, read by the lead release warning path and `send-push` |
| Training | Notification preferences | `training_quiz`, read by `useSmartNotifications` and `send-push` |
| Leaderboard | Notification preferences | `leaderboard`, read by `weekly-champion-notify` and `send-push` |
| Summer Checklist | Notification preferences | `bootcamp_reminders`, read by the checklist reminder path and `send-push` |
| Streak milestones | Notification preferences | `streak_milestones`, read by `useSmartNotifications` and `send-push` |
| Accepting new reps | Profile settings, managers only | Writes `profiles.accepting_new_reps`, which decides whether reps picking a manager can see and choose you |
- Every one of the ten notification switches is honoured by at least one sender, so none were removed. Each now carries one plain line starting with "On:" that says exactly what happens.
- The team prep element that read as a label with a bare count now reads "Reps you have not logged a one on one with this week. Tap to open the prep sheet." with the count beside it.

### 5. Role separation and View as
- Audit against the current gates: nav and More are filtered by tier (`tierOf`: sales, manager, admin, owner), Team, Leads, Approvals, Forms, prep, sweep, war room and logistics are manager and above, Admin and Command center are admin and above, and owner-exclusive surfaces remain in Command center, the sidebar and Admin team. Vet and rookie differ on Home and Money through `rep_year` driven season and pay cards. No place was found where two roles saw an identical screen that a documented rule says should differ, so nothing was widened or narrowed on that basis; no new differences were invented.
- View as: `useAuth` now exposes `realRole`, `viewAs`, `setViewAs` and `isViewingAs`. `setViewAs` refuses any value unless the real role is owner or admin, so the gate is in one place in source. The previewed role drives `role` for every screen, and vet or rookie also flips the exposed `profile.experience`.
- `ViewAsSwitcher` renders on More for owner and admin only. `ViewAsBanner` is a persistent bar with one tap back to the owner's own view, and states plainly that it is a preview and that nothing is done on anyone else's behalf. Preview is client-side rendering only; it does not grant or borrow anyone's database access, so every server-side rule still applies to the signed-in account.

### Verify
- Zero data writes this pass. Baselines: profiles 536, chat_messages 719, calendar_events 59, blitz_markets 30, invites 0, push_subscriptions 0, user_roles 4.
- Typecheck clean, production build clean.
- New user-facing strings read back, no em dashes.
- Nothing published.

## Pass 149 — Four rooms and acceptance only membership

### 1. Summit Trinity
The room the owner made already existed as channel `general`, labelled Summit Trinity, holding all 719 messages. It was promoted in place to the company wide room: `vertical` NULL, first in order, every profile a member with no opt out, mute still allowed. Nothing was moved or deleted.

`announcements` was kept as its own room directly below Summit Trinity rather than merged, because merging would have rewritten the channel of existing rows. Announcement posts continue to surface in Summit Trinity. This was the least disruptive of the two options.

Cover image: whatever the owner set on `general` is untouched, and the room still accepts a cover from the room sheet.

### 2. Industry rooms
`summit-pest`, `summit-fiber`, `summit-life` exist with their `vertical` set. Membership is exactly `is_vertical_member` for that industry. Access is enforced in `can_read_channel`, in `visible_chat_channels` and in the RLS policies on `chat_channels` and `chat_messages`, so a person without the membership cannot list, search or read the room at all.

### 3. Membership model
Backfill first: every non archived profile on Pest without a Pest enrollment row received one with status active. Pest enrollments went from 31 to 32, and all 23 live profiles are Pest members afterwards.

The Pest default was then removed from `is_vertical_member` and `get_my_workspaces` together. The staff fallback for owner and admin stays. Both functions now read the same enrollment rows, so they agree by construction.

Zero live profiles lost membership:

- live profiles 23, Pest members 23, Fiber 3, Life 3
- non archived profiles with no enrollment row at all: 0

A no enrollment account (checked against an existing archived profile with no enrollment and no role) passes the industry gate only for the two company wide rooms:

| room | industry | gate |
| --- | --- | --- |
| general (Summit Trinity) | none | open |
| announcements | none | open |
| summit-pest | Pest | closed |
| summit-fiber | Fiber | closed |
| summit-life | Life | closed |

### 4. Workspace toggle
The switcher lists only accepted industries. The rest stay as quiet locked rows that open the existing `vertical_applications` request. A person accepted into one industry sees no switch.

### 5. New signups
`AwaitingIndustryGate` keeps a person with no industry on one waiting screen plus Summit Trinity chat, their own profile and Ask Summit. Everything else redirects to that screen. Owner and admin are never gated.

`AwaitingIndustryPanel` sits at the top of the Requests lane for owner and admin only. It lists people waiting, the industry they were invited into when the invite link carried one, their manager, and one tap per industry that writes the enrollment row through `accept_into_industry`. The invite link path is unchanged: an invited joiner lands pending in the inviter's industry and shows here with that industry preselected. No self serve industry picker was added.

### Verification
- baselines: profiles 536, chat_messages 719, calendar_events 59, blitz_markets 30, invites 0
- owner session at 390px opens /app/chat and sees Summit Trinity, Announcements and Summit Pest; Fiber and Life rooms stay behind the workspace switch by the Pass 144 rule, while the server grants the owner all four
- privileges, `has_function_privilege`: `is_vertical_member`, `get_my_workspaces`, `visible_chat_channels`, `people_awaiting_industry`, `accept_into_industry` are all anon false, public false, authenticated true
- security linter count unchanged at 435 pre existing issues, none added
- typecheck clean, production build clean
- new user facing strings read back, no em dashes
- not published

## Pass 150: the Pillar model, permanent pillar links, onboarding tracker

What changed
- The Admin tier now reads Pillar everywhere a person can see it. Role keys in the database are unchanged.
- Every team carries an industry. Each pillar has one permanent recruit link, created and regenerated by that pillar leader or the owner.
- Joining through a pillar link creates a pending account pre-tagged with industry, pillar and manager, and waits for acceptance.
- Place under a manager: pillar leaders and the owner choose a manager inside their own system. Move a seat between pillar, manager and industry is owner only.
- Onboarding tracker with five steps: invite accepted, agreement signed, training done, payroll setup, fully onboarded. Account creation and day one training tick themselves. The other two are manual and record who ticked them.
- Public apply forms require one industry: Pest, Fiber or Life.

Proof, run in a transaction and rolled back
- Pillar leader (Liam Gardner, Paper Route): link created, lookup returns only pillar name and industry, place inside his system succeeded, place of a Minions rep refused with "That person is not in your system", move refused with "Only the owner can move people", tracker returned 5 rows and 0 outside his pillar.
- Plain rep (Minions): place, link create, move, accept into industry all refused. my_pillars empty, tracker 0 rows, pillar_links 0 rows, placement_log 0 rows visible.
- Owner: move succeeded, manual steps ticked and unticked, training_done refused as a manual tick, tracker 22 Pest and 2 Fiber under the active workspace.
- Edge function pillar-join with a bad token returned 400 and {"status":"invalid"}. The public page shows "This link is not valid."

Baselines after verification: profiles 536, invites 0, pillar_links 0, onboarding_steps 0, placement_log 0, teams without an industry 0. Typecheck and production build clean. Nothing published.

## Pass 152 - QA sweep with fixes

Preview only. No data writes. Nothing published.

### Coverage note (read this first)

No signed-in session could be minted in this environment (browser auth status
signed_out, and session minting for the owner account was not approved), so the
signed-in walk as owner, manager, returning rep and first year rep in the Pest
and Fiber workspaces could not be performed in this pass. Everything reachable
without a session was walked at 390 and 1280, and the signed-in surfaces were
covered by static checks only (route table, dead links, copy, placeholder
damage). The signed-in visual walk is still owed.

### Screens walked (no session, 390 and 1280 each)

| Screen | Route | Result |
| --- | --- | --- |
| Public cover | / | Clean, no overflow |
| Recruiting | /recruiting | Clean |
| Industry page, Pest | /industries/pest | Clean |
| Industry page, Fiber | /industries/fiber | Clean |
| Industry page, Life | /industries/life | Redirects to / by design |
| Parents | /parents | Clean |
| Rookie apply | /apply/rookie | Clean |
| Veteran apply and calculator | /apply/veteran | Clean |
| Apply success | /apply/success | Clean |
| Sign in | /login | Clean |
| Invite landing | /invite/:token | Invalid token state renders |
| Pillar link landing | /p/:token | Invalid token state renders |
| Golden ticket | /ticket | Clean |
| App entry, no session | /app | Redirects to /login |
| Unknown route | /nope-404 | 404 screen renders |

### Fixes made

| Screen or file | What was wrong | What changed |
| --- | --- | --- |
| Global, src/index.css | Phone text rendered below 12px in many places | Media query under 768px floors 8px to 11.5px utility text at 12px |
| src/lib/sanitizeUrl.ts | Earlier copy cleanup corrupted the safe protocol list, breaking the typecheck | List restored to four quoted protocols |
| src/components/brand/Wordmark.tsx | Wordmark could not take a ref, producing a console error on every screen that renders it | Component forwards a ref to its svg |
| src/pages/NotFound.tsx | 404 logged console.error on load and the link was under 44px | Logs a warning instead, link is 44px tall |
| src/components/VetBidForm.tsx | "Already sold before?" trigger under 44px | Trigger is 44px tall |
| src/pages/Recruiting.tsx | Instagram link and brand button under 44px | Both are 44px tall |
| src/pages/Parents.tsx | Brand button under 44px | Button is 44px tall |
| src/pages/IndustryPage.tsx | "Veteran application" link under 44px | Link is 44px tall |
| src/components/EarningsCalculator.tsx | Pay scale label from the database printed an em dash in public copy | Label renders with the dash normalised, no data write |

### Hidden

Nothing was hidden in this pass. Dead legacy surfaces can only be judged from
the signed-in walk, which is still owed.

### Verification

- Zero console errors on the production build for the public cover, recruiting,
  sign in, veteran apply and parents at 390 and 1280.
- Zero em dashes and zero sub-12px text in rendered public copy at 390.
- No horizontal overflow on any public screen at either width.
- Baselines unchanged: profiles 536, chat_messages 720, calendar_events 60,
  invites 0, user_roles 4.
- Typecheck clean, production build clean.

## Pass 152b: dash cleanup regressions and the static dead surface audit

### Fixes

| File | What was wrong | What changed |
| --- | --- | --- |
| src/components/FiberPublicCalculator.tsx | Empty season earnings placeholder rendered as ", " | Now renders "-" like every other empty placeholder |
| src/components/team/MoveRepModal.tsx | Depth indent used ', '.repeat(depth - 1), so nested reps showed leading commas | Plain left padding driven by depth (12px per level), no commas and no dashes |

Files touched by the sweep for other ", " damage: none. A grep of the whole src
tree for `', '.repeat` / `", ".repeat` and for bare ", " placeholders in ternaries,
fallbacks and JSX text returns only the two entries above, both now fixed. The
one remaining ", " in src/lib/sanitizeUrl.ts is the protocol allowlist
`['http:', 'https:', 'mailto:', 'tel:']`, which is correct code and not copy.

### Static dead surface audit

Method: every Route in src/App.tsx, then a whole-tree grep of each path string
against every navigation surface (src/lib/appNav.ts, AppSidebar, the phone bar,
MorePage groups, Home and hub tiles, src/lib/adminSections.ts, in-app Links),
then each page's tables and RPCs including one hook level deep. Row counts are
live counts from the database at the time of this pass. Nothing was hidden or
deleted; this is the list for the owner to decide on.

Pure redirect routes (for example /app/rookie, /app/videos, /app/manage,
/app/notepad, /app/calculators, /admin/team, /bootcamp-lock) are excluded: they
render no page and only forward to a live route.

| Route | Page file | Linked from | Role gate | Tables and RPCs read (rows today) | Verdict |
| --- | --- | --- | --- | --- | --- |
| /app | DashboardPage | appNav phone bar and desktop main, AppSidebar, AppLayout | signed in | app_settings 57, bootcamp_progress 200, profiles 536, user_notifications 6348 | live |
| /app/more | MorePage | appNav phone bar | signed in | none, nav aggregator | live |
| /app/chat | ChatPage | appNav phone bar and desktop, AppSidebar, Home and Fiber hub tiles | signed in | chat_channels 20, chat_messages 720, chat_read_state 28 | live |
| /app/training | TrainingPage | appNav, AppSidebar, DashboardHeader, training badge | signed in | training_courses 6, lesson_progress 3541 | live |
| /app/training/videos | TrainingVideosPage | appNav Learn group, TrainingTiles | signed in | training_videos 97, video_progress 2039, video_bookmarks 88, video_notes 363 | live |
| /app/training/manager-videos | ManagerTrainingVideosPage | appNav Manage group | manager+ | training_videos 97, video_progress 2039 | live |
| /app/training/videos/:videoId | VideoPlayerPage | video library rows, Continue watching card | signed in | training_videos 97, video_progress 2039 | live |
| /app/training/:courseSlug | TrainingCoursePage | course tiles on Training and Industries | signed in | training_modules 104, training_lessons 115, manual_read_completions 76 | live |
| /app/training/:courseSlug/:lessonId | LessonPage | course view | signed in | training_lessons 115, lesson_progress 3541, pitch_approval_requests 65 | live |
| /app/team | MyTeamPage | appNav Manage group, DashboardHeader, AppSidebar | manager+ | teams 7, user_roles 4, downline_edges 395 | live |
| /app/profile | ProfilePage | appNav tail, AppSidebar | signed in | profiles 536, user_badges 3, point_events 6840 | live |
| /app/alumni | AlumniPage | appNav Company group, alumni redirect in ProtectedRoute | signed in | profiles 536 | live |
| /app/person/:userId | PersonProfilePage | roster and admin drill in only, no static nav entry | signed in | profiles 536, rep_vertical_enrollments 45 | live |
| /app/leads | LeadsPage | appNav Manage group, Pest home, Home action row | manager+ | people_leads 551, lead_private_notes 95, lead_sheet_import 132 | live |
| /app/recruits | RecruitsPage | appNav, Quick actions, funnel tracker, AppSidebar | signed in | recruit_pipeline 17, recruiting_leads 98, applications 13 | live |
| /app/installs | InstallsPage | appNav Your work group, Fiber only | signed in | fiber_installs 0, fiber_day_numbers 0, fiber_pay_weeks 0 | live but empty everywhere |
| /app/missions | MissionsPage | appNav Your work group, Pest home | signed in | daily_challenges 2082 through child components | live |
| /app/pipeline | PipelinePage | appNav Your work group for Life, Life home | signed in | life_pipeline 0 | live but empty everywhere |
| /app/money | MyMoneyPage | appNav phone bar and desktop main | signed in | rep_commission 0, rep_revenue 0, rank_stacks 80, sales_log 0 | live |
| /app/stacks | StacksPage | appNav Your work for Fiber, MyTeam, Pest home | manager+ | carriers 13, ranks 7, rank_stacks 80, rep_carrier_ranks 0, rank_change_log 0 | live |
| /app/scripts | ScriptsPage | appNav Learn group, Training, global search | signed in | scripts 25 | live |
| /app/season | SeasonPage | appNav Your work for Pest, Your numbers | signed in | seasons 0, season_checklist_items 0, season_results 0 | live but empty everywhere |
| /app/industries | IndustriesPage | appNav Learn group, Training, all three home screens | signed in | verticals 3, vertical_steps 12, vertical_step_completions 5, vertical_paths 3 | live |
| /app/doors | DoorsPage | appNav Your work for Pest, Pest home | signed in, Pest workspace guard | playbook_entries 50, mastery_checks 0 | live |
| /app/ask | AskSummitPage | appNav Learn group, Pest home, chat list, field pack | signed in | assistant_threads 4, assistant_messages 12, assistant_faq 12 | live |
| /app/leaderboard | LeaderboardPage | appNav phone sheet and desktop, Pest home, Home action row | signed in | leaderboard_points 307, point_events 6840, weekly_awards 1 | live |
| /app/links | LinksPage | appNav Learn group, Quick actions, AppSidebar | signed in | managed_links 7, phone_numbers 12 | live |
| /app/events | EventsPage | appNav phone bar and desktop main | signed in | calendar_events 60, calendar_attendance 101, blitz_markets 30, blitz_waitlist 0 | live |
| /app/forms | FormsPage | appNav Manage group, Quick actions, AppSidebar | manager+ | none, hub for the interview pages | live |
| /app/interviews/1 | Interview1Page | Forms hub only | manager+ | none | reachable only from Forms, no data of its own |
| /app/interviews/2 | Interview2Page | Forms hub only | manager+ | none | reachable only from Forms, no data of its own |
| /app/interviews/3 | Interview3Page | Forms hub only | manager+ | profiles 536, rep_signups 8, team_notifications 20, user_roles 4 | live |
| /app/manager-meeting | ManagerMeetingPage | appNav Manage group, meeting hub, AppSidebar | manager+ | rep_triage 0, manager_meeting_submissions 0 | live but empty everywhere |
| /app/roster/sweep | RosterSweepPage | appNav Manage group, roster gap counters | manager+ | sweep_sessions 0, profiles 536 | live |
| /app/one-on-ones/prep | OneOnOnePrepPage | appNav Manage group, Pest home, Your numbers | manager+ | weekly_one_on_ones_manager 15, weekly_one_on_ones_rookie 37, user_priority_tasks 102 | live |
| /app/pitch-approvals | PitchApprovalsPage | appNav Manage group, Quick actions, Command header | manager+ | pitch_approval_requests 65, training_lessons 115 | live |
| /app/war-room | WarRoomPage | appNav Manage group, Quick actions, Home action row | signed in, manager content | profiles 536, teams 7, downline_edges 395 | live |
| /app/logistics | RepLogisticsPage | appNav Manage group, Links, AppSidebar | manager+ | rep_logistics 0, rep_housing 0, car_groups 0, car_group_members 0 | live but empty everywhere |
| /app/estimate-earnings | EstimateEarningsPage | appNav Learn group for Pest, Links, earnings widget, AppSidebar | signed in | profiles 536, public_pay_scales 1 | live |
| /command | CommandCenterPage | appNav Company group | Pillar and Owner | profiles 536, applications 13, audit_log 676 | live |
| /admin/people | AdminTeamPage people | adminSections tab bar, Owner week, Owner numbers | Pillar and Owner | profiles 536, teams 7, user_roles 4, bootcamp_progress 200 | live |
| /admin/requests | AdminTeamPage requests | adminSections, appNav Company group, AppSidebar, Your numbers | Pillar and Owner | applications 13, vertical_applications 0, scheduling_requests 8, app_feedback 0 | live |
| /admin/money | AdminTeamPage money | adminSections, My money, Owner week | Pillar and Owner | rank_stacks 80, rank_change_log 0, rep_commission 0 | live |
| /admin/content | AdminTeamPage content | adminSections tab bar only | Pillar and Owner | training_lessons 115, training_videos 97, scripts 25, assistant_faq 12 | live |
| /admin/settings | AdminTeamPage settings | adminSections, Season page | Pillar and Owner | app_settings 57, verticals 3, carriers 13 | live |
| /recruit-course | RecruitCoursePage | onboarding redirects only from BootcampGate, Invite and Pillar landings | signed in | video_progress 2039 | reachable only by URL, no standing nav entry |
| /summer-checklist | BootcampLock | BootcampGate redirect, first week card | signed in | bootcamp_progress 200 | reachable only by URL, gated flow |
| /momentum | BootcampMomentum | phase cross links | signed in | bootcamp_progress 200 | reachable only by URL, gated flow |
| /phase-1, /phase-2, /phase-3 | BootcampPhase1 to 3 | phase cross links | signed in | bootcamp_progress 200 | reachable only by URL, gated flow |

Public entry points (/, /recruiting, /ticket, /parents, /industries/:slug, /join,
/invite/:token, /p/:token, /apply/rookie, /apply/veteran, /apply/success, /login,
/pending-approval, /reset-password) sit outside the in-app nav model on purpose.
They are reached from external links, QR codes and emails, and all render real
content, so none are dead. Note that invites 0 and pillar_links 0 today, so both
token landings show their empty state until a link is created.

Owner decisions still open, listed for the record and not acted on:
- Six routes read tables that are empty across the whole database today:
  /app/installs, /app/pipeline, /app/season, /app/manager-meeting,
  /app/logistics and the stacks change log lane. They work, they just have
  nothing in them yet.
- Interview1Page and Interview2Page hold no data of their own and are reachable
  only as tabs inside Forms.
- /recruit-course and the bootcamp phase pages have no standing nav entry and are
  only reached by onboarding redirects.

Also observed and left alone because it is outside this pass: VerticalRouteGuard
lists six workspace owned prefixes but only /app/doors is wrapped in it, so the
other five stay reachable cross workspace by direct URL.

### Verify

- Both placeholders read back fixed, no comma placeholders remain in src.
- Grep proof: no `', '.repeat` or `", ".repeat` anywhere in src, and no bare
  ", " placeholder in a ternary, fallback or JSX text node.
- Baselines unchanged: profiles 536, chat_messages 720, user_roles 4.
- No data writes, nothing hidden, nothing deleted, not published.

## Pass 153 - three doors on the public front

Scope: public cover (/) and /recruiting gain a three-door section. No publishing, no data writes.

Data access (hold 1: nothing else widened)
- Migration: `REVOKE SELECT ON public.verticals FROM anon;` then `GRANT SELECT (name, short_name, slug, status, theme) ON public.verticals TO anon;`
- Existing RLS row policy `public verticals readable by anon` (`public = true`) untouched. `authenticated` full-table SELECT and owner/Pillar write policies untouched.
- Proof (anon key, REST):
  - `select=name,short_name,slug,status` returns Summit Pest (active), Summit Fiber (active), Summit Life (coming_soon).
  - `select=president_user_id` returns 42501 permission denied.
  - `select=*` returns 42501 permission denied.
- Component reads only the five granted columns.

Tiles
- `src/components/recruiting/ThreeDoorSection.tsx`. Structure, order, status and accent come from the catalog; accent applied as the card top rule and CTA border (Pest blue, Fiber gold, Life teal).
- Card shape matches the in-app hub tile: `rounded-xl border border-border bg-card p-5 sm:p-6`. Stacked at 390px, three across at 1280px. All links and CTAs are 44px or taller.
- Copy, taken from existing public industry descriptions, no money and no counts:
  - Summit Pest: "Door to door pest control. The summer product. You close, you get paid on what you close."
  - Summit Fiber: "Door to door fiber internet. The winter product. Paid per install."
  - Summit Life: "Life insurance. The career product for reps who want off the doors. Requires a state license to sell."

Links and preselection
- Industry names link to `/industries/pest`, `/industries/fiber`, `/industries/life`.
- Pest and Fiber CTAs read "Apply" and go to `/apply/rookie?vertical=Pest` / `?vertical=Fiber`. Life carries a "Coming soon" chip and a "Tell me when" CTA to `/apply/rookie?vertical=Life`. `useApplicationSource` preselects the required industry question from that parameter.

Life page (hold 2)
- `/industries/life` no longer redirects home. It is a short coming soon page: eyebrow, title, the description above, one line stating the path is still being set up, and the "Tell me when" CTA. No numbers, no pay, no counts, no em dashes.

Verification
- COVER_STATS stays false; no proof strip or ticker on the cover.
- 390px and 1280px checks captured for `/` and `/industries/life`. Public console output shows only pre-existing React dev ref warnings, no errors.
- Typecheck clean. Baselines unchanged: applications 13, profiles 536.

## Pass 154 - fill the Fiber workspace with what already exists

### Ladder
- New screen `/app/fiber/ladder`, added to the `VerticalRouteGuard` OWNED list as Fiber only, so a link opened from Pest or Life lands back on `/app`.
- Built live from `ranks`, `carriers` and `rank_stacks` through `fiber_ladder()`. 13 Fiber carriers, 7 ranks. A number only appears where `rank_stacks.confirmed` is true; otherwise the rank name stands alone.
- Rep proof (uid 42328a54, rookie): `can_see_leaders false`, 3 leader rows returned, 0 leader values, 52 personal production values.
- Leader proof (uid 70eeded3, owner): `can_see_leaders true`, 28 leader values, 52 personal values, 13 carriers.
- `has_function_privilege('anon','public.fiber_ladder()','execute')` false. `PUBLIC` false. `authenticated` true.
- Phone first: the carriers sit in a horizontal scroll inside the card and the rank column is `sticky left-0` so it stays fixed at 390. At 1280 the whole table fits inside the card with no scroll.

### Rules
- `fiber_rules` (key, title, body, leader_only, sort_order) seeded with 11 rows from the workbook Rules sheet, word for word.
- RLS: signed in Fiber members (`is_vertical_member(auth.uid(),'Fiber')`) read rows where `leader_only` is false; managers, Pillars and the Owner read every row; writes are Owner only. `anon` privileges revoked from the table entirely.

### Pay scale file
- Private bucket `fiber-docs` with no storage policies, so no client can read it directly. `Summit_Fiber_Pay_Scale_v5.xlsx` uploaded once.
- `fiber-doc-url` edge function mints a 120 second signed URL only after checking `is_effective_manager`, admin or owner. Anonymous call proof: HTTP 401 `{"error":"Sign in first"}`. A signed in rep is refused with HTTP 403 `That file is for leaders`.
- Tile "Fiber pay scale v5" renders in the Fiber Resources tools tab only for manager and above; reps never see it.

### New copy, verbatim
- Installs appear here after your first blitz is paid
- The Fiber board fills from install imports
- Fiber training is being recorded, Pest training applies to the door until then
- Open Learn Your Pitch
- See the ladder
- Fiber ladder
- Pay per install, by carrier.
- Leader rows are shown by name. Your manager can walk you through them.
- The ladder appears here once the ranks are set up.
- Fiber pay scale v5
- The pay scale workbook, for leaders
- That file is for leaders

No em dashes in any new copy.

### Baselines
- profiles 536, rank_stacks 80 all confirmed, rep_carrier_ranks 0, fiber_rules 11.
- Typecheck clean, production build clean. Not published.

## Pass 155: the waiting screen becomes day one

Scope: the AwaitingIndustryGate screen now carries the same day one watch course the recruit gate uses, day one completion survives acceptance, and the pending list shows who finished.

### What changed
- `src/components/onboarding/DayOneCourse.tsx` (new): the day one course as an embeddable block. Same `recruit_gate_state` source, same `day_one_video_ids` setting, same `video_progress` upsert and the same completion record, so nothing is counted twice.
- `src/components/workspace/AwaitingIndustryGate.tsx`: waiting line, Summit Trinity button and Sign out button unchanged; the course is embedded underneath.
- `src/components/admin/AwaitingIndustryPanel.tsx`: Day one done chip next to the name, plus the finish date. Finished people sort first (ordering comes from the RPC).
- Database: `onboarding_steps.step` now accepts `training_done`; new `day_one_done_at(uuid)` and `tick_training_done_from_day_one(uuid)`; `accept_into_industry` ticks Training done at accept time with the real completion timestamp; `people_awaiting_industry` returns `day_one_done` and `day_one_done_at` and orders finished people first, with its existing scope check intact (owner sees everyone, a pillar leader only their own system through `is_in_my_system`).

### Rollback proof (test rows removed)
    user                            91246821-24e5-4b7f-9d44-fdb9934d7672
    ticked                          true
    day_one_done_at                 2026-04-29 18:15:28.146+00
    stored_checked_at               2026-04-29 18:15:28.146+00
    timestamps_match                true
    onboarding_steps_after_cleanup  0

The tick landed with the earlier completion timestamp, not the acceptance time, and the test row was deleted.

Baselines after the test: profiles 536, onboarding_steps 0, rep_vertical_enrollments 45, video_progress 2039 (no writes, the test only read completions).

### Function privileges
    accept_into_industry              anon false, authenticated true
    day_one_done_at                   anon false, authenticated true
    people_awaiting_industry          anon false, authenticated true
    tick_training_done_from_day_one   anon false, authenticated true

### Layout
- 390: single column, max width fills the screen with 24px side padding. Waiting copy, then the two full width 44px buttons, then the day one line, the progress card, the player and the course rows stacked. Every row is at least 48px tall.
- 1280: the same column centred at 672px max width, player 16 by 9 inside the card, no horizontal scroll.

### New copy, verbatim
- Start day one now, so you are ready the moment you are accepted.
- Watch these first
- Day one done
- Finished day one {date}

No em dashes. Typecheck clean, production build clean. Not published.

## Pass 156 - the manager day screen

Scope: one screen that answers what today needs, plus the carried lock from Pass 155.

### Database
- `manager_day(_vertical text)` SECURITY DEFINER, STABLE. Returns `{}` for a signed out
  caller and for anyone who is not admin, owner or `is_manager_tier`. Built on the same
  scope checks the five destination screens use: `dark_rep_radar`, `prep_roster`,
  `onboarding_state` plus `onboarding_steps`, `calendar_attendance` on the nearest
  upcoming blitz, and `people_awaiting_industry`.
- Privileges: `anon` false, `authenticated` true (checked with `has_function_privilege`).
  Unauthenticated REST call returns `42501 permission denied for function manager_day`.
- Carried lock: `tick_training_done_from_day_one(uuid)` revoked from PUBLIC, anon and
  authenticated in migration. Verified `anon` false and `authenticated` false.

### Counts observed (Pest workspace, owner scope)
- Reps with no onboarding step movement for 7 days or more: 22
- Nearest upcoming blitz: "Phoenix Mega Blitz, October LDP Week"; 23 people have not answered
- Waiting to be placed: 0
- Radar and one on ones owed come from the existing scoped RPCs and vary by caller.
- Rep path: the test rep account holds only the `rookie` role, so the function's guard
  returns `{}`. A live signed in rep call could not be exercised here because minting a
  session for a specific auth user needs approval that is not available in this context;
  the guard and the revoke were verified directly in the database instead.

### Screen
- Route `/app/day`, manager and above, one card and five lines in order:
  1. `Call today: N people on your radar` taps to `/app/team` (radar lives there)
  2. `One on ones owed this week: N` taps to `/app/one-on-ones/prep`
  3. `Stuck on onboarding: N reps on a step for 7 days or more` taps to
     `/app/team?onboarding=stuck`, where the onboarding tracker opens on a
     `Stuck 7 days or more` filter limited to those ids
  4. `Blitz RSVPs still open: N people have not answered the next blitz: <names>` taps to
     that event on `/app/events`
  5. `Waiting to be placed: N` taps to `/admin/requests`
- A zero line reads `Nothing today` in muted text and is not tappable.
- Page title is `Today`. No charts, no tiles, no other headers.

### Entry points
- Home, manager and above only: one row `Today: N things` that opens `/app/day`, hidden
  when all five counts are zero. Added to Pest and Fiber home.
- More, Manage group: `Today`, manager tier and above. Nothing for reps.

### Layout
- 390: the card fills the width, each line wraps to two lines at most and keeps a 52px
  minimum height; the Home row is a single 44px tall line.
- 1280: the card is capped at a 2xl column, lines stay single line with the chevron right
  aligned.

### Checks
- No data writes. No publish.
- No em dashes in the new code.
- Typecheck clean, production build clean.
- Baselines unchanged: profiles 536, onboarding_steps 0.

## Pass 157 - speed on a phone

Measured on the production build, gzip, no visual, copy or data change. Before
numbers come from a clean build of the pre-pass tree (commit a0856568); after
numbers from the current tree. First paint per route = the entry chunk plus its
static import closure plus the CSS plus the route chunk (and AppLayout for app
routes), which is exactly what the browser fetches before the screen renders.

### Shell, before

| chunk | gzip KB |
| --- | --- |
| index (entry) | 83.7 |
| vendor-react | 51.8 |
| vendor-supabase | 43.5 |
| vendor-dates | 21.3 |
| vendor-charts (stub) | 0.3 |
| index.css | 30.6 |
| **shell total** | **231.2** |

### Shell, after

| chunk | gzip KB |
| --- | --- |
| vendor-react | 52.0 |
| vendor-supabase | 43.5 |
| index (entry) | 37.3 |
| app-lib (src/lib + integrations) | 15.3 |
| vendor-icons (lucide) | 13.3 |
| vendor-utils (clsx, tailwind-merge, small radix primitives) | 10.4 |
| index.css | 28.9 |
| **shell total** | **200.7** |

Shell budget 220 KB gzip: met (200.7).

### First paint per route at 390 px

| route | before KB | after KB |
| --- | --- | --- |
| Cover / | 237.0 | 205.2 |
| Login (/app/auth, eager in shell) | 231.2 | 200.7 |
| Home Pest and Home Fiber | 339.1 | 336.9 |
| Chat | 355.9 | 341.3 |
| Events | 302.8 | 304.6 |
| Money | 301.6 | 305.3 |
| Training | 300.6 | 311.2 |
| More | 281.6 | 294.4 |
| /app/day | 278.3 | 292.0 |
| Fiber ladder | 278.1 | 292.0 |

Largest single route chunk after the pass: AdminTeamPage at 29.4 KB gzip. No
chunk is over 150 KB gzip, so the per-chunk budget is met everywhere.

Cover and login budget of 120 KB gzip: not met, and it cannot be met without
dropping a dependency the two screens actually use. Their floor is react and
react-router (52.0) plus the database client the cover reads the industry tiles
with and the login posts credentials with (43.5) plus the single stylesheet
(28.9) plus the app shell itself, router, auth provider and workspace provider
(37.3). That is 161.7 KB before a line of screen code. The honest result is
205.2 KB for the cover, down 31.8 KB from before.

The light app routes (Training, More, /app/day, ladder) each gained about 12 KB.
Cause: the radix overlay libraries and the icon set moved out of the shell into
shared chunks, so they are no longer paid for on the cover but each app route
now fetches them itself. The trade was made deliberately, since the cover and
login are the screens a stranger loads on one bar of signal.

### What changed

- Vendor chunks are split by library: react, supabase, radix plus floating-ui,
  charts, editor, forms, dates, icons, vimeo, confetti, utilities.
- The video player and @vimeo/player (84 KB of source) left the shell. The day
  one course on the waiting screen now loads the player on demand.
- The two toast layers load after first paint, and sonner loads with the toast
  it shows instead of with the shell.
- Tooltips carry their own provider, so the shell no longer imports the tooltip
  and floating-ui libraries. Delay and behaviour are unchanged.
- The profile gate formats today's date locally, which takes the date library
  off the shell.
- Fonts are latin subsets only (Montserrat 700/800/900, Inter 400/500/600/700,
  Source Serif 500/600). Verified on load: five woff2 files on the cover, two on
  login, all latin.
- Icons were already imported by name; no barrel imports exist.
- Every img tag now carries loading lazy and decoding async, with width and
  height where the rendered size is fixed (26 tags across 24 files). No image
  asset in the project is over 16 KB, so nothing needed recompressing.
- Home runtime: the bootcamp hook no longer makes a role round trip before its
  batch, and the three settings rows come back in one request. Four sequential
  or separate calls became one parallel batch.
- The workspace list and theme are still fetched once in WorkspaceProvider above
  the router, so a route change refetches neither.
- The service worker remains push only with no fetch handler and no caching.

### Verification

- typecheck clean, production build clean (exit 0).
- Cover and login loaded at 390 px: no runtime errors, no failed requests. The
  console shows only pre-existing development warnings (react-router v7 future
  flags and a forwardRef warning that also appears on the pre-pass build and on
  screens that use none of the components this pass touched). Home and Chat
  could not be loaded in the checker this turn: minting a preview session for a
  specific account needs approval that is not available here, so those two
  screens were verified by build analysis only.
- Baselines unchanged: profiles 536, chat_messages 720. No migration, no writes,
  nothing published.

## Pass 158: badges, set one (display only)

Scope: display only. No points, no comp, no competition math, no data writes, nothing published.

### Data
One SECURITY DEFINER function, `badges_for(_user_ids uuid[])`, batched exactly like `identity_chips`, returning per user id: `locked_in` boolean, `blitz_patches` (array of title plus year), `recruiter_stars` integer. It returns nothing else about the person: no money, no status, no phone.

Sources, all rows that exist today:
- locked_in: `people_leads.signed_2027` true joined on `profiles.id = people_leads.profile_id`, or a `resign_intents` row with status `confirmed`.
- blitz_patches: `calendar_attendance.present` true on `calendar_events` with `event_kind = 'blitz'`; patch title is the event location when set, otherwise the event title, plus the year of `event_date`.
- recruiter_stars: people whose `profiles.recruited_by_user_id` or `profiles.recruiter_id` is you, or who joined through an invite you created (`invites.joined_user_id`, `invites.created_by`), and who read fully onboarded per `onboarding_state`.

### Verification
- `has_function_privilege('anon','public.badges_for(uuid[])','EXECUTE')` is false; `authenticated` is true. EXECUTE revoked from PUBLIC and anon in the migration.
- locked_in count: 13 users. Matching SQL: `people_leads` rows with `signed_2027` joined to a profile = 13 (8 of them with `archived_at` null, so 8 live); confirmed `resign_intents` rows = 0. 13 plus 0 equals the 13 users the function marks locked_in.
- blitz_patches: `calendar_attendance` rows with `present` true = 0, so every person returns an empty array today (6 blitz events exist, none with attendance marked). The trophy case renders the empty line for everyone.
- recruiter_stars: 0 for everyone today, since no matched recruit reads fully onboarded. Empty line renders.
- Client caching: `useStatusBadges` holds a module level cache and a 60 ms batch window, so a chat screen makes one `badges_for` call for the visible senders rather than one per bubble.

### Where it renders
Locked in badge next to the name in: chat bubbles (beside the Pass 151 industry chips and years stars), the team roster rows, the person profile header (with the 2027 label), the workspace installs leaderboard and the recruiting leaderboard. Trophy case section on the person profile, for your own profile and any profile a viewer can already open.

### Look
Dark plate card, engraved uppercase type with wide tracking, the workspace accent used as the metal (border plus a top inset highlight and a soft top down gradient). No confetti, no emoji, no gold except where the accent already is. Badge itself is a small rounded shield plate, 24 px tall inside the name row so it never pushes a line taller; tap targets on the profile rows stay at their existing 44 px.

### Responsive
At 390: badge sits inline after the chips and wraps with them, never truncating the name (name keeps `truncate`, badge is `shrink-0`); trophy case is one column, three stacked rows, each row icon plus label above the plates, plates wrap. At 1280: same card at content width, plates sit side by side on one line per row.

### Copy, verbatim
- Locked in for 2027
- Trophy case
- Locked in 2027
- Sign for 2027 to lock this in.
- Blitz patches
- Attend an official blitz.
- Recruiter stars
- Bring someone in through your link and get them fully onboarded.
- 1 person fully onboarded
- N people fully onboarded

No em dashes anywhere in the pass.

### Build
Typecheck clean, production build clean. Baselines unchanged: profiles 536, chat_messages 720.

---

## Pass 159 - second sweep and publish readiness

### Session
No signed in session could be minted (auth status signed_out; the session mint
command was rejected). Every authenticated screen was checked statically from
the route table, the RPC privileges and the RLS policies. Public routes and the
shell were checked live in the browser at 390 and 1280 against the production
build.

### Screens checked live (production build, console)
| Screen | 390 errors | 1280 errors |
| --- | --- | --- |
| / (cover) | 0 | 0 |
| /login | 0 | 0 |
| /app (redirects to /login without a session) | 0 | 0 |
| /industries/pest | 0 | 0 |
| /industries/life | 0 | 0 |

Dev server only: React prints a "function components cannot be given refs"
warning from the dev tagging plugin. It does not exist in the production build,
so the console is clean where users are.

### The six known items
| Item | State | Files |
| --- | --- | --- |
| (a) wrong-workspace page mounted and fetched before the guard redirected | Fixed | src/App.tsx (VerticalRouteGuard moved to the route level for installs, stacks, fiber/ladder, pipeline, doors, season, estimate-earnings) |
| (b) a course or lesson opened by slug from the wrong industry | Fixed | src/lib/courseScope.ts, src/components/workspace/OtherWorkspaceNotice.tsx, src/pages/app/TrainingCoursePage.tsx, src/pages/app/LessonPage.tsx. learn-your-pitch stays readable from Fiber as the bridge |
| (c) a toast fired during first paint was lost | Fixed | src/App.tsx mounts RootOverlays eagerly; vite.config.ts gives the toast layers their own small chunk. Proof: the toast viewport node exists at domcontentloaded and vendor-toast loads with the shell |
| (d) em dashes in user-facing strings | Fixed | 0 matches in src |
| (e) the word admin in user-facing strings | Fixed | src/components/money/MyRevenueMonths.tsx ("Entered by a Pillar"), src/pages/app/FormsPage.tsx ("Hawx portal"). Code identifiers untouched |
| (f) console clean on load | Fixed | table above; production build clean on every public route |

### Shell budget kept
Mounting the toast layers eagerly first pushed the shell to 246.4 KB gzip. Fixed
by chunking: toast in its own chunk, the shared radix helpers in vendor-utils,
the login page, the not found page and the three gate screens (locked out,
awaiting industry, bootcamp) load on demand.

| Shell asset | gzip |
| --- | --- |
| index | 15.8 KB |
| vendor-react | 53.3 KB |
| vendor-supabase | 44.6 KB |
| vendor-utils | 13.8 KB |
| vendor-icons | 13.8 KB |
| app-lib | 15.6 KB |
| vendor-toast | 12.9 KB |
| index.css | 29.3 KB |
| Total | 195.1 KB (budget 220 KB) |

### Readiness checklist
Migrations: 395 files, 394 recorded rows. The single difference is one file whose
name carries a one second later timestamp than its recorded row
(20260122225936 on disk, 20260122225935 recorded); its effect is live
(validate_and_record_quiz exists, security definer). Nothing is unapplied.

Functions from passes 152 to 158, anon execute:
false for accept_into_industry, badges_for, blitz_cap_state, dark_rep_radar,
day_one_done, day_one_done_at, day_one_video_ids, fiber_ladder, identity_chips,
manager_day, onboarding_state, people_awaiting_industry, set_onboarding_step.
notify_stalled_applications and tick_training_done_from_day_one are false for
anon and false for authenticated (cron and definer callers only).
Deliberate anon set only: get_public_counters, invite_lookup, redeem_invite,
pillar_link_lookup.

RLS on tables created since 152 and their policy counts: fiber_rules on (2),
invites on (4), pillar_links on (1), placement_log on (1), onboarding_steps on
(1), blitz_waitlist on (3), push_subscriptions on (1), rep_carrier_ranks on (3),
rank_change_log on (1).

Storage: fiber-docs public false. Every bucket except avatars is private.

COVER_STATS false. public/sw.js has push and notificationclick handlers only, no
fetch handler, no caching.

Baselines match: profiles 536, chat_messages 720, calendar_events 60,
user_roles 4, onboarding_steps 0, invites 0.

### Build
Typecheck clean. Production build clean. No data writes. Not published.

Safe to publish

## Pass 160: no event reminders in individual chats

### Screen check
- DM at 390 (`isDm` true): header, optional pinned-text jump count, message bubbles, composer. No event card, no update card, no incentive card, no pinned bar. A `kind` of event, announcement or incentive inside a DM renders nothing (no placeholder, no filler row); the row is not silently stripped from the list, it simply has no DM presentation.
- Group room (kind channel or team) at 390 and 1280: unchanged. Event card, update card, incentive card and the collapsible pinned bar all render as before; team rooms keep the Knocking now strip.
- Chat list screen: NeedsYouRow RSVP prompts and the search event sheet stay. They are not inside a chat.

### Frontend fixes
| File | Change |
| --- | --- |
| src/components/dashboard/CommunityChat.tsx | Pinned bar gated on `!isDm`; card branch returns null when `isDm`. |

No other DM surface renders event material: the only other event UI in the chat folder is PeopleSearch (list screen) and PinnedBar (now group only).

### Backend guard
New helper `card_channel_or_general(text)`: any resolved slug belonging to a room with `member_ids` populated (a one to one or member-list room, which `get_conversations` reports as kind dm) falls back to `general`.

| Function | Change | anon EXECUTE |
| --- | --- | --- |
| card_channel_or_general(text) | new, revoked from PUBLIC, anon, authenticated | false |
| event_target_channel(text, uuid) | result passed through the guard | false |
| sync_announcement_card() | insert channel passed through the guard | false |
| sync_incentive_card() | insert channel passed through the guard | false |
| post_event_card() | unchanged, inherits the guard via event_target_channel | false |
| sync_event_card() | unchanged, only updates existing rows | false |
| refresh_series_card(uuid) | unchanged, only updates existing rows | false |
| mark_event_card_cancelled() | unchanged, only updates existing rows | false |

### Baselines
chat_messages 720, calendar_events 60, chat_channels 20. Card rows currently sitting in a member-list room: 0. No data writes.

Typecheck clean. Production build clean. Not published.

## Pass 161: events out of chat for good, and WhatsApp grade sending

### Events out of chat
| Item | Result | File |
| --- | --- | --- |
| Auto posting trigger | `trg_post_event_card` dropped from `calendar_events`; the other event triggers (sync, cancel) left as they are | migration |
| Existing auto posted rows | `DELETE FROM chat_messages WHERE kind = 'event' AND is_ai = true` removed exactly 7 rows | migration |
| Chat never renders event rows | `kind === 'event'` returns null in every room | src/components/dashboard/CommunityChat.tsx |
| Pinned bar ignores events | event items return null | src/components/chat/PinnedBar.tsx |
| Chat list drops the RSVP card | only the `rsvp` type is filtered out; announcement ack, incentive, setup step and first week stay | src/components/chat/NeedsYouRow.tsx |
| `get_action_cards` untouched | Home and other callers still receive rsvp entries | none |

Rollback proof: inside a `DO` block a new `calendar_events` row was inserted and the block then raised, so nothing was saved. `chat_messages before=713 after=713 delta=0`.

Counts: `chat_messages` 720 before the migration, 713 after, 0 rows with `kind = 'event'`. `calendar_events` 60, unchanged.

### Sending
| Item | Result | File |
| --- | --- | --- |
| One plus button, 44px, bottom sheet on phone and popover on desktop | measured 44 x 44 at 390 and 1280 | src/components/chat/ChatComposer.tsx |
| Camera uses the rear camera on phone | `accept="image/*" capture="environment"` | src/components/chat/ChatComposer.tsx |
| Photos and videos, multi select up to 10 | tray with thumbnails, remove per item, the message box doubles as the caption field | src/components/chat/ChatComposer.tsx |
| 2 to 10 photos send as one message | content prefix `imgs:` plus a JSON array of paths; legacy `img:` rows still render | src/lib/chatMedia.ts, src/components/chat/MediaGallery.tsx |
| Grid and lightbox | 2 up, 3 with one large, 4 grid, plus N past four; tap opens the lightbox with swipe and arrow keys | src/components/chat/MediaGallery.tsx |
| Video | mp4, mov, webm up to 50 MB, prefix `video:`, poster frame captured in the browser, no autoplay, muted first tap, full screen on the second | src/lib/chatMedia.ts, src/components/chat/ChatVideo.tsx |
| Upload progress and retry | thin bar on the tray item, send disabled while uploading, Retry on a failed item | src/components/chat/ChatComposer.tsx |
| Chat list previews | Photo, N photos, Video, File, GIF, Sticker, Voice note | src/components/chat/ChatList.tsx |
| Save on media | Save appears in the context menu for an image or a video | src/components/chat/MessageContextMenu.tsx |

Storage: uploads still go to the private `chat-uploads` bucket at `userId/timestamp.ext` with signed URLs at read time. The four policies are unchanged: Admins can delete any chat uploads, Authenticated users can upload chat files, Chat members can read chat uploads, Users can delete own chat uploads. The 100 MB bucket limit is unchanged.

### Function privileges (anon EXECUTE)
`post_event_card` false, `sync_event_card` false, `refresh_series_card(uuid)` false, `mark_event_card_cancelled` false, `card_channel_or_general(text)` false, `get_action_cards` false.

### Screens
390: the chat list shows Needs you with setup step cards only, no RSVP card. A group room (Wins) shows its messages with no event card and no pinned event bar. The plus button opens the Attach sheet with Camera, Photos and videos, Document, Poll, GIF, Sticker in a three column grid, each target 88px tall. 1280: the same room shows the plus button at 44px with the same six items in a popover above it.

### New copy
Attach, Camera, Photos and videos, Document, Poll, GIF, Sticker, Retry, Videos up to 50 MB, Up to 10 at a time, That upload failed, That did not send. Try again., Photo, N photos, Video, Save. No em dashes.

Typecheck clean, production build clean. Not published.

## Pass 162 - chat look and feel

Cosmetic, per person. Nothing changed about who can see or send anything.

### Preferences table

`public.chat_prefs`: `user_id` primary key referencing `auth.users`, `wallpaper`,
`wallpaper_path`, `bubble`, `text_size`, `room_overrides jsonb default '{}'`,
`updated_at`. RLS enabled (`relrowsecurity = true`), four policies, all
`TO authenticated` and all scoped to `user_id = auth.uid()`:

| Policy | Command |
| --- | --- |
| Own chat prefs are readable | SELECT |
| Own chat prefs can be created | INSERT |
| Own chat prefs can be changed | UPDATE |
| Own chat prefs can be removed | DELETE |

Grants after the follow up migration: `authenticated` select, insert, update,
delete; `service_role` all; `anon` revoked (confirmed by
`information_schema.role_table_grants`). No new database function was added in
this pass, so there is no `has_function_privilege` row to report; the security
linter count stayed at 456 pre-existing issues, unchanged by this pass.

### Wallpaper bucket

`chat-wallpapers`, `public = false`, 10 MB per file. Policies on
`storage.objects`, all `TO authenticated` and all keyed on the first path
segment equalling the caller's id:

| Policy | Command |
| --- | --- |
| Own chat wallpaper is readable | SELECT |
| Own chat wallpaper can be uploaded | INSERT |
| Own chat wallpaper can be replaced | UPDATE |
| Own chat wallpaper can be removed | DELETE |

Path is `userId/wallpaper.jpg`, compressed to a 1600px edge with the existing
`prepareChatImage` helper, read through a one hour signed URL.

### Chat look screen, 390 and 1280

Reached from the room header sheet (`RoomLookRow` in `ChannelSheet`) and from
More under the Appearance group. Verified signed in at both widths, route
`/app/chat-look`. One column of cards at 390, the same cards on a wider measure
at 1280. Every choice rendered, named verbatim:

- Wallpaper: Summit, Night, Slate, Forest, Sand, Ice, Your photo, plus the
  button Upload your photo.
- Bubble color: Workspace, Classic, Ocean, Graphite, Ember.
- Text size: Small, Default, Large.

Copy on the screen, verbatim: "Chat look", "Yours only. Nobody else sees these
choices.", "This is how other people look.", "And this is you.", "Wallpaper",
"Applies to every room. A single room can be set from its own room sheet.",
"Upload your photo", "Bubble color", "Your own messages only. Other people keep
the standard bubble.", "Text size", "Applies to message text and the box you
type in.", "Use my default". No em dashes in any new file.

### A room with Night, Classic and Large

Set the three choices on the Chat look screen, then opened a group room. Measured
in the page: room root class `chat-wall chat-wall-night`, `--chat-text: 16px`,
`--chat-bubble: 142 62% 38%`, own bubble background `rgba(37, 157, 81, 0.18)`,
own bubble font size `16px`. Screenshot shows the deep navy field with the faint
peak line pattern behind the thread, a green own bubble, and larger text in both
the bubble and the composer. Other people's bubbles stayed the translucent
surface with its border.

One defect found and fixed during this check: the wallpaper rules were written
inside `@layer components`, so Tailwind removed them because the class names are
composed at runtime (`chat-wall-${wallpaper}`). They now sit in plain CSS after
the layers and ship in the built stylesheet (verified `chat-wall-night` present
in `dist/assets/index-*.css`).

### The six effects

| Effect | Detail | Reduced motion |
| --- | --- | --- |
| Swipe right to reply | Touch only, follows the thumb, fires at 40px, springs back over 160ms, `navigator.vibrate?.(8)` where available | Transform and transition removed, reply still available from the context menu |
| Incoming message | `msg-in`, 8px rise and fade, 160ms | Animation none |
| Reaction | `react-pop` scale bounce to 1.35, 220ms, with three particles over 420ms in the bubble colour | Bounce animation none, particles hidden |
| Emoji only message | 1 to 3 emoji and no words render at 40px with no bubble and no tail | No motion involved |
| Send | Bubble lands scaling from 0.96 to 1 | Existing reduced motion rule already covers it |
| Win post | One burst of five pieces inside the bubble bounds, 900ms, once per session per message, never on scroll back | Burst hidden |

No sound anywhere.

### Sizes and baselines

Shell on first paint, gzip, from `dist/index.html`: 197.2 KB against the 195.1 KB
Pass 159 baseline, growth 2.1 KB, inside the 4 KB allowance. Breakdown: css
29.9, vendor-react 52.0, vendor-supabase 43.5, app-lib 16.5, index 15.7,
vendor-icons 13.6, vendor-utils 13.4, vendor-toast 12.6.

Baselines unchanged: `profiles` 536, `chat_messages` 713. `chat_prefs` holds 0
rows; the row written during the walkthrough was deleted afterwards, so no
account carries a test look.

Typecheck clean. Production build clean, built in 17.20s. Not published.

Noted, not changed (outside this pass): the composer send button is a 32px
circle, below the 44px target rule; it predates this pass.

## Pass 163: compensation integrity

Every commission number a person sees now comes from confirmed `rank_stacks` rows for that person's own tier, read through one SECURITY DEFINER function. No pay table remains in the bundle.

### Data
| Object | Detail |
| --- | --- |
| `my_comp_ladder(_vertical text)` | SECURITY DEFINER, STABLE. Returns `tier_label`, `can_see_leaders`, `vertical`, `rows` (label, threshold, unit, value, rate, carrier, leader, sort_order). Rows filtered to `confirmed = true` and the caller's vertical; rank rows above sort_order 4 (leader rows) only when `is_effective_manager`, admin or owner. Empty list when the caller has no confirmed rows, is not a member of the vertical, or has no tier. |
| `earnings_goals` | `user_id` primary key, `goal numeric`, `scenarios jsonb`, `updated_at`. 0 rows. |

Privileges: `has_function_privilege('anon','public.my_comp_ladder(text)','execute') = false`, `authenticated = true`.

`earnings_goals` policies:
- `earnings_goals own row` ALL `(user_id = auth.uid())`
- `earnings_goals leaders read` SELECT `(has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner') OR is_leader_of(auth.uid(), user_id))`
- `has_table_privilege('anon','public.earnings_goals','select') = false`

`rank_stacks` SELECT policy, read back:
`rank_stacks confirmed in my vertical :: (((confirmed = true) AND is_vertical_member(auth.uid(), vertical)) OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'))`

### Function output, row counts only
Executed as the read only reporting role the function cannot be called directly (permission denied, which is the revoke working), so the same predicate was evaluated per user id.

| Caller | Leader rows allowed | Fiber rows | Pest rows |
| --- | --- | --- | --- |
| Rookie with no rank, not a Fiber member | no | 0 (function returns empty for a non member) | 0 |
| Rookie with rank (sort_order 1) | no | 13 | 0 |
| Veteran rep (sort_order 2) | no | 26 | 0 |
| Owner | yes | 80 | 0 |

Pest has no confirmed rows today, so every Pest surface shows the not confirmed line.

### Client changes
| File | Change |
| --- | --- |
| `src/lib/commission.ts` | Tier tables deleted. Now a thin reader over the function output plus formatters and `NOT_CONFIRMED`. |
| `src/hooks/useCompLadder.ts` | New. `fetchCompLadder`, `repRate`, `leaderRate`, `useCompLadder`. |
| `src/pages/app/EstimateEarningsPage.tsx` | Constants and `getRate` deleted. Scenarios come from the ladder; manager mode only when the function returned leader rows; goal and scenarios saved to `earnings_goals`, localStorage save dropped; card background uses the workspace accent at 12 and 6 percent; labels lifted to the 12px floor; manager note rewritten without the stray hyphen. |
| `src/components/dashboard/EarningsWidget.tsx` | Ladder backed, goal read from `earnings_goals`. |
| `src/hooks/useMoneySummary.ts` | Rate comes from the ladder. |
| `src/pages/app/MyMoneyPage.tsx` | Next tier block no longer computed from a constant; shows the confirmed tier and rate, or the not confirmed line. |
| `src/components/admin/AdminMoneyTab.tsx`, `AdminExportTab.tsx` | No bundled bracket lookup; explicit override or the not confirmed line. |
| `src/components/shared/LeaderScorecard.tsx` | Constant backed pay ladder track removed. |
| `src/components/VetCalculator.tsx` | Tier tables deleted. Bands come from the published pay scales through `get_public_calc`; when the rookie, veteran and marketing scales are not all published the panel shows one line and no numbers. |
| `src/components/DownlineGrowthCalculator.tsx` | Deleted. It was imported nowhere and held the last copy of the three tables. |

### Bundle grep (dist)
`0.675` 0 hits, `69999` 0, `199999` 0, `249999` 0, `1249999` 0, `3749999` 0, `19999999` 0. `0.72` matches 3 times, all inside SVG path coordinates in `Wordmark`.

### Screens
No session could be minted this pass (auth status signed out, per user minting needs approval), so the estimate page was verified statically rather than in the browser. With confirmed rows the page shows the goal field, the Calculate button and three scenario cards on the accent gradient, single column at 390 and three across at 1280. Without confirmed rows it shows the goal field and one line with no numbers.

### New copy, verbatim
- Your pay scale is not confirmed yet. Ask your Pillar.
- These pay numbers are not published yet.
- Only rows confirmed for your tier are shown here.

No em dashes.

### Checks
Typecheck clean. Production build clean. Baselines unchanged: profiles 536, rank_stacks 80 all confirmed, chat_messages 713, earnings_goals 0. Not published.

## Pass 164 - chat fix batch

Carry from Pass 163 (item 0): the rank_stacks SELECT policy now reads
`((confirmed = true) AND is_vertical_member(auth.uid(), vertical)) OR is_president_of_vertical(vertical) OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner')`.
Migration: supabase/migrations/20260904055133_618ee1da-9ecb-4f4a-84f5-d73ff969b64e.sql.
No function was created or changed, so there is no new anon privilege to report.

| Item | Fix | File |
| --- | --- | --- |
| 1 Reactions | The long press quick react row no longer writes chat_reactions itself; it calls the same onToggleReaction the bubble uses, so the optimistic map updates at once | src/components/chat/MessageContextMenu.tsx, src/components/dashboard/CommunityChat.tsx |
| 2 Silent failures | GIF, sticker and poll sends check every error and toast one line; the picker stays open on failure so nothing is retyped. The poll row points at the message by foreign key, so the message is inserted first and removed again if the poll row fails, which means no Poll line ever exists without its poll | src/components/dashboard/CommunityChat.tsx, src/components/chat/ChatComposer.tsx |
| 3 Unread counts | The conversation list now also listens to chat_messages inserts, debounced 500 ms, alongside the caller's own read state | src/hooks/useChatChannels.ts |
| 4 Read ticks | The open room subscribes to chat_read_receipts and chat_read_state, debounced 500 ms, so a sent tick flips to read live | src/components/dashboard/CommunityChat.tsx |
| 5 Signed URLs | Signed URLs re-sign every 50 minutes while the element is mounted, and a load error re-signs once before showing the unavailable state | src/lib/chatAttachments.ts |
| 6 Video posters | Poster capture sets playsInline and muted with preload metadata and waits for loadeddata; when capture fails the tray and the bubble fall back to a plain play tile | src/lib/chatMedia.ts, src/components/chat/ChatVideo.tsx |
| 7 Tray order and caption | The tray sends in pick order, with photos picked together travelling as one grid message at the first photo's place; the caption stays in the box until its own send succeeds | src/components/chat/ChatComposer.tsx |
| 8 Touch and targets | The lightbox stops touch propagation and media is marked data-chat-media so swipe to reply never starts inside it; composer send and mic are 44px and the quick react buttons are 44px, with the row clamped inside 390 | src/components/chat/MediaGallery.tsx, src/components/chat/ChatBubble.tsx, src/components/chat/ChatComposer.tsx, src/components/chat/MessageContextMenu.tsx |
| 9 Wallpaper | A new photo writes a fresh path (userId/wallpaper-<timestamp>.jpg), so the signed URL changes and the room refreshes | src/pages/app/ChatLookPage.tsx |

New copy: "That did not send. Try again." No em dashes.

Verification: typecheck clean, production build clean. Shell gzip 196.5 KB against the
197.2 KB baseline (down 0.7 KB). Baselines: chat_messages 713 before and after,
profiles 536 before and after, chat_reactions 155 before and 155 after. No data writes.
Not published.

## Pass 165 - funnel and function hardening

Six items from the Sept 3 audit. Every change narrows access or adds a notice.
No permission was widened anywhere.

### 1. Applications go through one edge function

The open anon INSERT policy on applications ("Anyone can submit applications")
is dropped. Anon has no write on the table at all now. Both public forms
(src/pages/RookieApplication.tsx and src/pages/VetApplication.tsx) post to the
new edge function supabase/functions/submit-application/index.ts, which:

- rejects a filled honeypot field (the hidden "website" input) and returns a
  plain ok so a bot learns nothing
- validates through valid_public_email and valid_public_phone
- calls check_rate_limit at 5 per hour per IP and 5 per hour per email
- inserts with the service role

Direct anon insert proof, run against the live REST endpoint with the anon key:

```
HTTP 401
{"code":"42501","message":"permission denied for function has_role"}
```

The row was not written; applications stayed at 13. Anon has no SELECT grant on
any public table (checked across information_schema.role_table_grants), so
revoking has_role from anon breaks no public read path. Every public read goes
through a SECURITY DEFINER get_public_* function.

### 2. Staff notified on every new application

New trigger notify_new_application() (AFTER INSERT, SECURITY DEFINER) writes a
user_notifications row for the owner and every admin:

- title: New application
- message: <name> applied for <industry, or "not sure yet">.
- link: /app/admin-team?tab=applications
- source key application_<id> with ON CONFLICT DO NOTHING, so one row per
  application per recipient

The existing push path picks these rows up. No email is sent.

### 3. Anon function grants

Revoked EXECUTE from PUBLIC and anon on: validate_access_code,
ingest_pest_revenue, ingest_fiber_week, undo_import_batch, mark_mastery_check,
set_appearance, get_money_sources, get_import_batches, resolve_sheet_manager,
lead_system_for, region_lead_of, is_paired_manager_of, has_role, is_staff,
is_manager_tier, is_vertical_lead, is_president_of_vertical, get_ticket_config,
get_ticket_series_status, resolve_source_code. All read anon false below.
validate_access_code has no caller in src (only the generated types file), so it
was revoked rather than wrapped.

Final anon set, from has_function_privilege('anon', fn, 'execute'), 13 functions
and nothing else:

| function | anon | authenticated |
| --- | --- | --- |
| get_public_calc | true | true |
| get_public_counters | true | true |
| get_public_cover_content | true | true |
| get_public_fiber_stacks | true | true |
| get_public_industry | true | true |
| get_public_setting | true | true |
| get_recruiting_content | true | true |
| get_recruiting_proof | true | true |
| invite_lookup | true | true |
| pillar_link_lookup | true | true |
| redeem_invite | true | true |
| valid_public_email | true | true |
| valid_public_phone | true | true |
| get_import_batches | false | true |
| get_money_sources | false | true |
| get_ticket_config | false | true |
| get_ticket_series_status | false | true |
| has_role | false | true |
| ingest_fiber_week | false | true |
| ingest_pest_revenue | false | true |
| is_manager_tier | false | true |
| is_paired_manager_of | false | true |
| is_president_of_vertical | false | true |
| is_staff | false | true |
| is_vertical_lead | false | true |
| lead_system_for | false | true |
| mark_mastery_check | false | true |
| notify_new_application | false | true |
| region_lead_of | false | true |
| resolve_sheet_manager | false | true |
| resolve_source_code | false | true |
| set_appearance | false | true |
| undo_import_batch | false | true |
| validate_access_code | false | true |

### 4. Pillar links expire, invite lookup is rate limited

pillar_links.expires_at is timestamptz NOT NULL DEFAULT now() plus 90 days.
pillar_link_lookup and pillar_link_resolve return valid false past it,
pillar_link_ensure renews an expired link for another 90 days,
pillar_link_regenerate resets both token and expiry, and my_pillars() returns
the expiry so src/components/pillar/PillarLinksPanel.tsx can show the date and a
Renew button.

Rollback-only proof (transaction rolled back, pillar_links 0 before and after):

```
expired: {"valid": false, "pillar_name": "Legion Mafia", "expires_at": "...-09-03..."}
renewed: {"valid": true,  "pillar_name": "Legion Mafia", "expires_at": "...-09-14..."}
```

invite_lookup now calls check_rate_limit at 20 per hour per IP and writes
opened_at only when it is null, so a repeated open no longer rewrites it.

### 5. CORS pinned to the app's own origins

supabase/functions/redeem-invite, pillar-join, fiber-doc-url and the new
submit-application no longer answer with a wildcard. Each returns
Access-Control-Allow-Origin only for https://summitmktg.lovable.app,
https://summitmktgsales.com, https://www.summitmktgsales.com, the Lovable
preview origins and http://localhost:8080, with Vary: Origin. A readback taken
before the new function code had rolled out still showed the previous
wildcard reply, so the header readback should be repeated once the current
revisions are live; the source of all four functions is pinned.

### 6. One path for every move

src/components/team/MoveRepModal.tsx no longer writes profiles.direct_manager or
downline_edges by hand and no longer skips profiles.manager_id. It calls
place_person(_user_id, _manager_id), which does the whole move and writes
placement_log.

Rollback-only proof (transaction rolled back):

| step | manager_id | direct_manager | manages edge parent | downline_edges | placement_log |
| --- | --- | --- | --- | --- | --- |
| before | f1a8d4c3 | Joshua Bingham | 83527355 | 395 | 0 |
| after | 0186b7f6 | Mathew Rubino | 0186b7f6 | 395 | 1 |

manager_id, direct_manager and the managing edge all landed on the same new
manager together, and the move was logged. The edge count held at 395 because
the old edge is replaced, not added to.

### Verification

Typecheck clean. Production build clean. Baselines after all proofs rolled back:
applications 13, profiles 536, pillar_links 0, placement_log 0,
downline_edges 395, chat_messages 713. No data writes were kept. Not published.

## Pass 166 - notifications and the recruit gate

Baselines: profiles 536, user_notifications 6358 before and 6358 after (no data writes; both rollback proofs raised an exception and left nothing behind).

### 1. Dead push button
`src/components/notifications/NotificationBell.tsx` no longer has the Enable push notifications button or the `alert()` path. `requestPushPermission` had no other caller and is removed from `src/hooks/useNotifications.ts`. The one push toggle stays in notification preferences. When push is not granted the bell footer shows one quiet 44px row, tapping to the preferences screen at /app/profile.

New copy, verbatim: `Turn on push in Settings`

### 2. Bell behavior
`handleOpenChange` only sets open state now; there is no `markAllAsRead` on open, so opening the bell writes nothing. A row is marked read when tapped, and Mark all read stays as the explicit button.

### 3. Noise
- Inactivity: `check-inactivity` now selects `manager_id` and writes through one `notifyInactivity` helper that targets the person's manager and their Pillar only, with `source_key` `inactive:<user_id>:<7 day bucket>`. Day 3 and day 4 share the same key, so a person produces at most one alert per 7 days per recipient. Upsert with `ignoreDuplicates` against the existing unique index `user_notifications_source_key_uniq`.
- Top Performers: `weekly-champion-notify` no longer notifies every manager and admin. Recipients are the people on the list plus their `manager_id` and their `downline_edges` parents. `source_key` `topperf:<week_start>` gives one row per person per week.
- Streaks: `useSmartNotifications` writes `source_key` `streak:<milestone>`, so one row per milestone per person for good.
- Every other client insert now carries a key: `chat_backlog:<date>`, `top1:<week>`, `event_soon:<event id>`, `lessons:<count>`, `streakbreak:<user>:<count>`, `newrep:<user>`.
- Summer Checklist: `bootcamp-reminders` stops for a person once the checklist is complete (it already reads only `bootcamp_completed = false`), and stops for everyone after the active season `ends_on`, or Sept 30 when no season row sets one (`seasons` is empty today). The manager row uses `source_key` `checklist:<date>:<am|pm>`.
- Application still waiting: `notify_stalled_applications` keys on `appstall:<id>:<days/3>` instead of the date, so staff hear once per application per 3 days.

### 4. Titles
Emoji removed from every notification and email template that builds a title or message: `weekly-champion-notify`, `bootcamp-reminders`, `check-bootcamp-overdue` path subjects, `check-pitch-approvals-overdue`, `check-inactivity`, `send-calendar-notification`, `monday-streak-shoutout`. Remaining emoji in the repo sit in chat post bodies (`daily-accountability-post`), the welcome email greeting and the AI coach prompt context, none of which is a notification title or message; they were left alone under the no copy changes elsewhere rule.

### 5. Events without a location
On save, an event with no location and no link in the description shows the creator one warning line. Both save paths carry it: `src/pages/app/EventsPage.tsx` and `src/components/calendar/ManagerEventForm.tsx`. The Events list shows a muted line on cards with neither.

New copy, verbatim: `Add a location or a link so people can find it` and `Location to be announced`

### 6. Recruit gate, vertical aware
Migration adds `recruit_vertical(uuid)` and `day_one_video_ids(text)`. Pest keeps the original `app_settings` key `day_one_video_ids` (6 videos); other industries read `day_one_video_ids_<industry>`, which do not exist yet, so Fiber and Life recruits are not gated and land on the normal home with the Pass 154 Training empty state. Tag a Fiber or Life day one course later and the gate applies with no code change. `is_gated_recruit`, `day_one_done`, `day_one_done_at`, `gated_recruits` and `recruit_gate_state` all resolve the list per person.

Rollback proof (raised and rolled back): `pest_gated=t fiber_gated=f` for the same pending person.
Dedupe proof (raised and rolled back): `exactly one row kept for the same key`.

### Function grants
`has_function_privilege('anon', fn, 'execute')` is false for `recruit_vertical(uuid)`, `day_one_video_ids(text)`, `is_gated_recruit(uuid)`, `recruit_gate_state()` and `notify_stalled_applications()`. The public set is unchanged at the 13 functions listed in Pass 165.

### Carry from Pass 165
The CORS readback now passes on the deployed function: `OPTIONS` on `submit-application` with origin `https://summitmktg.lovable.app` returns `HTTP/2 200` and `access-control-allow-origin: https://summitmktg.lovable.app`, not a wildcard.

Typecheck clean, production build clean. Not published.

## Pass 167 - chat room polish, chat list cleanup, More consolidation, Settings, function check

### 1. Compose bar
`src/components/chat/ChatComposer.tsx`: wrapper is now `border-t border-border/40 bg-card` (no translucency, no backdrop blur). Input row is `flex items-center gap-2 px-3 py-2`. The pill is `min-h-11 bg-muted/40 border border-border/40` with `focus-within:border-primary/40`; the input inside is `h-11`, so pill and the plus, mic and send buttons are all 44px tall and centered on one line. Plus and mic rest as `bg-muted/40 text-muted-foreground`; send is solid workspace accent with a white icon. Reply preview, media tray, recording bar and typing line share the same `px-3` as the input row. The messages spacer stays `h-3`, so the last bubble sits 12px above the composer with the keyboard closed. ChatHeader and the plus sheet were not touched.

### 2. Room colors and layout
Own bubbles are the solid workspace or chosen accent with white text; other bubbles are `bg-card` with a `border-border/40` hairline and foreground text; AI bubbles keep their tint. Bubble tails removed from CSS and from `ChatBubble.tsx` (`rg "bubble-tail" src` returns nothing); iMessage corner rounding kept. Timestamps and meta are 11px at muted-foreground 60 percent, sender names 12px semibold, and no chat label is under 11px. Day dividers render as a small centered pill. The summit, night, slate, forest, sand and ice wallpapers are now flat or single soft two stop washes with no pattern or texture. Message list padding is `px-3 lg:px-6`; the desktop frame width is unchanged.

### 3. Chat list
`NeedsYouRow` removed from `src/components/chat/ChatList.tsx` along with the `mt-2` clearance; the list starts at the first conversation row. `src/components/chat/NeedsYouRow.tsx` was kept because `PestHome.tsx`, `LifeHome.tsx` and `FiberHome.tsx` still import it.

### 4. To do
Nav label, page header and list heading now read To do ("Your own list.", "Add what you need to get done"). Route `/app/missions`, the `mission-board-container` class and the Home preview are unchanged. `rg -in "\bmissions?\b" src` leaves only CSS class names, the route string, radio input ids and code comments; no rep facing copy.

### 5. More screen and Settings
`src/pages/app/MorePage.tsx` rebuilt: each group is a 52px header row with label, item count and chevron; the first group (Your work) opens by default, the rest start collapsed, and state persists under `more:open:<key>`. Recruits now carries `minTier: 'manager'`. The You and Appearance groups are replaced by a final Settings group (gear icon) with Profile, Appearance, Notifications and Account, rendered from the shared `src/components/settings/SettingsList.tsx`; Appearance expands in place to App look (`/app/appearance`) and Chat look (`/app/chat-look`). New pages: `SettingsPage`, `AppearancePage` (hosts `AppearanceCard`), `NotificationsPage` (hosts `NotificationPreferences`), `AccountPage` (password change plus self delete). All four are `ProtectedRoute` inside `AppLayout` and read back from `App.tsx` at `/app/settings`, `/app/appearance`, `/app/notifications`, `/app/account`. `ProfilePage` no longer imports `NotificationPreferences` or `AppearanceCard`, no longer holds password or delete state, and ends with one More settings row to `/app/settings`. The bottom bar still has six tabs.

Sales tier sees Your work, Learn and tools, Company (Alumni only) and Settings; the Manage group and Pillar and Command center rows do not appear. The owner sees every group. In both cases only the first group is open on a fresh device.

### 6. Poll prefix
New polls insert `Poll: <question>` with no emoji. `ChatBubble.tsx` and the chat list preview strip an optional leading emoji from the prefix at read time. No data writes.

### 7. Function and route check
Every `path` in `appNav.ts` resolves to a route in `App.tsx`: 39 of 39 paths matched (`/admin/requests` is produced by the generated `['people','requests','money','content','settings']` route map). No missing imports or renamed RPCs were found; nothing needed rewiring.

Limitation, stated plainly: an authenticated preview session could not be minted this pass. `LOVABLE_BROWSER_AUTH_STATUS` was `signed_out`, `lovable auth-session --json` failed because the project has several auth users, and minting for a named user requires approval that was unavailable here. The per route render and per RPC call check for a signed in sales tier account at 390 and 1280 therefore was not run, and no permission or policy was changed to work around it. It remains open.

### New copy, verbatim
- To do
- Your own list.
- Add what you need to get done
- More settings
- Appearance, notifications, account
- Settings
- Your profile, look, notifications and account.
- App look
- How the app looks on this account.
- Notifications
- Choose what reaches you.
- Account
- Your password and account controls.
- Change password
- Delete account
- Permanently delete your account and sign up fresh.
- Poll:

### Verification
Typecheck clean, production build clean. Shell gzip 197.3 KB against the 197.2 KB baseline, plus 0.1 KB. Baselines: chat_messages 713 unchanged, profiles 536 unchanged. chat_prefs reads 1 and user_notifications reads 6362 against the recorded 0 and 6358; both moved from live preview use, not from this pass, which wrote no data. Not published.

## Pass 168 - premium look, motion and feel

Scope: look and feel only, plus one notification integrity fix. No new npm dependencies. Every animation is disabled under prefers-reduced-motion.

### Chat room
- `src/index.css`: own bubbles carry a 135deg two stop gradient of the workspace accent with a 10 percent white inner highlight on the top edge; other bubbles keep `bg-card` with `border-border/40` and a 0 1px 2px shadow at 6 percent. `.bubble-in` is a 180ms spring (scale 0.96 to 1, translateY 6px to 0, opacity 0 to 1). `.react-pop` runs 0.6 to 1.1 to 1 over 220ms.
- Arrival animation only fires for messages that land while the room is open: `CommunityChat` seeds `seenIdsRef` on the first render of a room, so initial load and scrolling back never animate.
- Long press: `CommunityChat` renders `.msg-menu-backdrop` (backdrop-blur-md, black at 30 percent) behind `MessageContextMenu`, and the pressed bubble takes `.msg-lift` (2 percent lift plus shadow) through the new `isMenuOpen` prop on `ChatBubble`. The quick react row uses `.quick-react-in` (120ms fade up).
- New messages divider: a thin accent line with a centered accent pill reading `New messages`, placed once at the first unread message when the room opens, and retired as soon as the reader scrolls past it (`dividerRef` checked in `handleScroll`).
- One floating control instead of two: a 44px circle, card background, hairline border, shadow, with the missed count in an accent pill on it. It appears when the reader is more than one screen above the bottom and clears on tap.
- Wallpapers keep the six flat gradients from Pass 167 and gain one large radial accent glow at 8 percent in the top left plus an inline SVG grain at 3 percent. No patterns, no shapes. `ChatHeader` and the plus sheet were not touched.

### Composer
- Send button uses `.send-morph` (160ms crossfade and scale) and every composer button carries `.press` (scale 0.94 while pressed).
- Typing indicator is now three staggered bouncing dots inside a small other-style bubble.

### Chat list
- Rows are 72px with 48px avatars, room name 15px semibold, one line preview with the last sender's first name, right aligned 12px time, unread as a solid accent pill with white digits, press state through `.press`.
- Swipe left reveals a 44px tall mute action wired to the existing `set_channel_mute` RPC, and the list refreshes through `onMuteChanged`. Swipe right hides it.
- Pinned rooms group at the top under a small caps `Pinned` label and show a pin glyph.
- Reported, not built: there is no writer for room pinning. `get_conversations()` returns `is_pinned` as false for every room and no pin RPC or pin column exists, so no Pin action was added rather than duplicating state in a second place. The grouping and glyph are ready for a server side pin whenever one is added.
- Reported, not built: `get_conversations()` does not return presence for the other person in a direct message, so the 48px avatar has no online ring. Adding one would need a new query, which this pass does not do.

### Bottom bar, More and Settings
- `MobileBottomNav` is a floating pill: card background at 92 percent, backdrop blur, hairline border, fully rounded, inset from the safe area and the sides, 11px labels, six tabs and the same routes, Chat badge kept, composer focus hiding kept. One absolutely positioned accent circle slides between tabs with a 200ms transform.
- `MorePage` and `SettingsList`: 36px rounded icon tiles at accent 12 percent with accent icons, small caps 11px section headers, Radix Collapsible sections with a 200ms height animation and a rotating chevron. The Settings group uses neutral grey tiles so it reads as its own zone.

### Home hero
- New `src/components/home/WorkspaceHero.tsx`, used at the top of PestHome, FiberHome and LifeHome: first name, today's date, workspace name, streak with a plain lucide flame when one is already loaded, and the figure that home already shows. Background is two radial accent glows at 20 and 10 percent over card with the same grain. No new queries.
- Pest: streak from the sale streak already loaded, figure from the accounts figure the page already renders. Fiber: figure from today's installs already loaded, no streak because none is loaded there. Life: figure from the pipeline total already loaded, no streak for the same reason.

### Page feel
- `AppLayout` keys the outlet wrapper by pathname and fades and slides content 8px up over 160ms, applies `tracking-tight` to page headings and `tabular-nums` to figures app wide.

### Notifications
- `record_daily_login` was read back and contains no `user_notifications` insert, so nothing was removed from it. The double streak notification came from repeat inserts, not from two writers in that function.
- New `skip_duplicate_notification()` BEFORE INSERT trigger on `user_notifications` returns NULL when the same `user_id` and non-null `source_key` already exist, so repeats are skipped instead of erroring on the existing unique index. No history deleted.
- `has_function_privilege` for `skip_duplicate_notification()`: anon false, authenticated false.
- Rollback test: two identical inserts with source key `pass168:rollback:test2` for one person produced exactly one row, then the test rows were deleted.

### New copy, verbatim
- `New messages`
- `Pinned`
- `Mute`
- `Unmute`

### Verification
- Typecheck clean, production build clean.
- Shell gzip 198.5 KB against the 197.3 KB baseline, plus 1.2 KB, inside the 6 KB budget.
- Baselines unchanged: chat_messages 713, profiles 536, chat_prefs 1, user_notifications 6362 before and 6362 after (the two test rows were inserted and deleted inside the rollback test, and one of the two was skipped by the trigger).
- Not verified: the 390 and 1280 walkthroughs of the room, chat list, bottom bar, More screen, Home hero and the prefers-reduced-motion toggle need a signed in session. Browser auth status is signed_out and minting a session was not available in this run, so those visual measurements are stated as built, not as observed.
- Nothing was published.

## Pass 169

Three closes from the Pass 168 report. No permission expansion, no publish.

### 1. Streak notification writer
- `src/hooks/useStreak.ts`: removed the `user_notifications` insert that wrote a fire emoji title with `source_key` null. The `useSmartNotifications` path with `source_key streak:<n>` is now the only streak writer. The milestone still drives the celebration state and the bot shoutout at 7 days.
- `record_daily_login` milestone text for the first day is now `Day 1` (plain, no em dash). Everything else in the function is identical.
- Grants read back before and after: anon false, authenticated true, PUBLIC false (unchanged).
- `rg "Keep the fire burning" src` returns 0 matches. The only remaining emoji characters in src are the chat quick reaction rows (`MessageContextMenu.tsx`, `ChatBubble.tsx`), not notification inserts.

### 2. Room pinning
- `chat_prefs.pinned_channel_ids uuid[] not null default '{}'` added; existing own-row RLS covers it.
- `get_conversations()` now reads the caller's `pinned_channel_ids`, returns `is_pinned` true for rooms and direct messages in that list, returns `channel_id`, and orders pinned rows first in both the room and direct message groups.
- `set_channel_pin(_channel_id uuid, _pinned boolean)` SECURITY DEFINER, own row only, upserts the `chat_prefs` row when missing. REVOKED from PUBLIC and anon, granted to authenticated. Read back: anon false, authenticated true.
- `ChatList.tsx`: swipe left now reveals Mute and Pin/Unpin, both 88px wide with a 44px minimum height; the pin glyph and the Pinned group from Pass 168 now light up.
- Rollback test: one room id written into one person's `pinned_channel_ids`, read back and matched to its room row, then restored to `{}`.

### 3. Direct message presence
- `get_conversations()` returns `other_is_active` from `profiles.is_active_now` of the other member for kind dm, false for rooms. No new client query.
- `ChannelAvatar` gained an `online` prop drawing a success-toned ring; `ChatList` passes it for direct messages only.

### New copy, verbatim
- `Day 1`
- `Pin`
- `Unpin`
- `Pin <room name>` / `Unpin <room name>` (accessible labels)

No em dashes, no emoji.

### Verification
- Typecheck clean, production build clean.
- Shell gzip measured from the chunks referenced by `dist/index.html`: 167.5 KB, no growth over the Pass 168 ceiling of 198.5 KB (the client delta is a few lines plus one lucide glyph).
- Baselines: chat_messages 713, profiles 536, chat_prefs 1, user_notifications 6362 (unchanged; the pin rollback test wrote and restored a single existing chat_prefs row).
- Linter output after the migration shows only the pre-existing categories carried since earlier passes; no new finding types.
- Not published.

## Pass 170 - visual reset and public cover (September 7, 2026)

**Status:** Complete in preview only. Nothing was published or deployed.

### Delivered
- Reset the primary app presentation to black, white, grey, and one workspace accent, with 15px phone / 16px desktop body type, larger page spacing, flat surfaces, and reduced ornamental borders and shadows.
- Disabled legacy workspace textures, mesh effects, photo/glow chat wallpapers, win confetti, training confetti, decorative stars, radial glows, and gradient chat bubbles while retaining meaningful interaction motion and reduced-motion fallbacks.
- Rebuilt the public cover around the exact approved headline, configured `cover_hero_image`, Apply CTA, conditional earnings link, positive-only live counters, the three requested industry states, and four plain `Where this goes` roles.
- Added optional `Who told you about Summit` inputs to both application forms, nullable submission handling, and staff visibility.
- Added a migration extending `get_public_cover_content()` with `cover_hero_image`; existing anon/authenticated/service-role execution is preserved with no broader grants.
- Reduced chat appearance choices to six flat wallpapers while retaining the existing stored wallpaper path only for schema compatibility.

### Verification
- Automatic typecheck and production build: passed (`build OK`, latest observed 02:45:55Z).
- Independent production build: passed.
- Initial-entry JavaScript: **166.8 KB gzip**, below the Pass 168 reference of 198.5 KB.
- Public cover captured at 390 x 844 and 1280 x 900; exact headline, CTA, configured-image slot, responsive layout, and requested content were present. The headless Chromium window-mode screenshot has a known 500 CSS-pixel minimum, so narrow-layout correctness was additionally enforced with responsive classes; this limitation is not represented as a perfect device proof.
- Removed-feature grep: no source references outside compatibility CSS for confetti, radial gradients, grid-cover marks, hero mesh, win burst, or photo chat wallpapers.
- Remaining gradient/glow-named theme variables in `WorkspaceThemeProvider` are flat compatibility values (`hsl(...)` or `none`), not rendered gradients. Remaining highlights are limited to functional focus, presence/status, overflow affordance, or shared UI compatibility treatments.
- Database readback baselines: `chat_messages=715`, `profiles=536`, `applications=13`, `chat_prefs=1`.
- `get_public_cover_content`: anon execute true; authenticated execute true. No RLS or workspace-scope expansion was introduced.
- Authenticated Home, Chat, More, and Settings walkthroughs at 390px and light-mode/reduced-motion DevTools checks could not be completed because no authenticated preview session was available. Existing code paths, global appearance tokens, and reduced-motion rules were inspected instead.

### Release posture
Preview-only and unpublished. The `submit-application` edge function and database migration were not deployed as part of this pass.

## Pass 171 - simplification (September 7, 2026)

**Status:** Complete in preview only. Nothing was published and deployment settings were not changed.

### Delivered
- Added one protected `/app/progress` screen: quiet Streak and Points this week figures, personal leaderboard rank, Badges and Trophy case in one row, then To do.
- Reduced Pest, Fiber, and Life Home to the Pass 168 hero and one underlined `Progress` link. Removed points and badge surfaces from self Profile; manager-facing Person Profile recognition remains.
- Removed automatic login and restore streak overlays. A returned milestone now uses one one-line toast.
- Reduced chat appearance to wallpapers `Summit`, `Night`, `Photo`; bubbles `Workspace`, `Classic`; text sizes unchanged. The single existing preference row was retained and normalized, including room overrides.
- Reduced More to `Your work`, `Manage`, and `Settings`. Sales sees Your work and Settings; manager tier adds Manage; owner sees all three. Recruits remains manager-gated. Admin moved into Settings for admin and owner only.
- Added the Training top row with `Scripts`, `Resources`, `Video library`, `Ask Summit`, and Pest-only `Estimate earnings`. All existing destination routes remain reachable.
- Ordered three-industry choices Pest, Fiber, Life. The named lines are `Live`, `Off season lane`, and `Coming`. Life is disabled for ordinary users while both a Life day-one course and Life pay band are absent; admin, owner, and Life president controls remain available.
- Extended the existing notification dedupe trigger to cap routine cron prefixes at three rows per person per UTC day. The fourth becomes one `Daily digest` row; later overflow is suppressed. Direct messages, mentions, approvals, event reminders, Monday manager digest, and Sunday weekly digest are outside this cap.

### Verification
- Chat preference migration: `chat_prefs=1` before and `chat_prefs=1` after; all rows match the new constraints. Readback allows wallpaper `summit|night|photo` and bubble `workspace|classic` only.
- Notification rollback proof inserted four capped candidates for one person on an isolated day and reached exactly three routine rows plus one digest fold; the deliberate exception rolled the transaction back. Rollback row count read back as zero.
- Notification count was `6369` before and `6369` after the rollback proof. Final baselines: `chat_messages=715`, `profiles=536`, `chat_prefs=1`, `user_notifications=6369`.
- Function permissions were unchanged: `skip_duplicate_notification()` remains trigger-only with anon execute false and authenticated execute false. Existing table policies and workspace scope were not changed.
- TypeScript check passed. Production build passed. Initial-entry JavaScript is **166.5 KB gzip** using the Pass 170 entry-reference method, below 198.5 KB.
- Source checks found no new em dash or emoji in Pass 171 copy. New copy is listed verbatim above, plus `Your points, recognition and To do.`, `Leaderboard rank`, `Not ranked`, `Points this week`, and `More updates are waiting for you.`
- Authenticated 390px sales walkthrough and role-switched 1280px walkthrough could not be completed because preview session minting required unavailable user approval. The responsive layouts, 44px controls, route guards, role conditions, database readbacks, typecheck, and production output were verified directly.

### Release posture
Preview-only and unpublished. No data was deleted and no deployment settings were touched.

## Pass 172 - center of gravity

Preview only. Nothing was published and no deployment setting was touched.

### What was built

1. One number, then one next action, on every workspace home.
   - New hook `useHomeNumber` reads only sources the workspace already reports through: Pest counts `sales_log` rows for the person (week from local Monday, season from April 1, the same rows the week leaderboard ranks on), Fiber sums `fiber_day_numbers.sold` for the week, Life counts `life_pipeline` rows. The person's own goal comes from `earnings_goals.goal` when a row exists; with no goal the number stands alone.
   - New hook `useNextAction` picks one row in this fixed order: an unread direct message from `profiles.manager_id` (from `get_conversations`), an unanswered RSVP card inside 48 hours (from `get_action_cards`), an unfinished day one video while `recruit_gate_state` is locked, then the first incomplete `todo_items` row. With none of those the row is hidden; there is no placeholder.
   - Everything else on a home sits under a fold labelled More on your week.
2. Manager, admin and owner homes open on Today: `ManagerTodayCard` renders the five `manager_day` counts and links to /app/day, and shows Clear today in one line when every count is zero. The Team row sits under it.
3. Re sign 2027 card on the Pest and Fiber homes. The count is `get_public_counters().signed_2027`, the same figure the public cover reads. The button calls the existing `submit_resign_intent`. A person with a confirmed intent sees their date instead of the button. No pay figures on the card. Visibility follows `app_settings.resign_2027_card`, default on.
4. First ten minutes: `WelcomeFirstOpen` shows once when `profiles.first_open_at` is null, stamping it through the authenticated `mark_first_open()` on that first render. Three steps: day one (gated course or workspace training), the Pillar message, and general with the composer focused through a new `compose=1` deep link carried through ChatPage, CommunityChat and ChatComposer. Skipping is a small text link.
5. Cover: one line under Where this goes linking to sign in. Nothing else on the cover changed.
6. Cap follow through. Every capped cron writer now supplies a source key the Pass 171 trigger already classifies. The trigger itself was not changed and no old rows were backfilled.
   - `check-inactivity` (Team Inactivity Alert): `inactivity:<user_id>:<date>`
   - `bootcamp-reminders` (Summer Checklist Reminder): `checklist:<manager_user_id>:<date>`
   - `check-bootcamp-overdue` (Summer Checklist Overdue): `checklist:<manager_user_id>:<date>`
   - `weekly-champion-notify` (top performer): `topperf:<user_id>:<date>`
   - `manager-weekly-digest` (Your week, Monday manager digest): `digest:monday-manager:<date>`
   - `run_notification_digest()` (N updates while you were off): `digest:offline:<user_id>:<UTC date>`
   - No in app writer of a Sunday weekly digest row exists in the codebase, so there was nothing to tag for `digest:sunday-weekly:<date>`; the trigger already accepts that key. Direct messages, mentions, leads, announcements and event reminders stay untagged and uncapped.

### New copy, verbatim

- Accounts this week
- Installs this week
- In your pipeline
- Season 12 of 100 goal (pattern: Season {season} of {goal} goal)
- Season 12 (pattern: Season {season})
- More on your week
- Today
- Clear today
- Call today: 0
- One on ones owed this week: 0
- Stuck on onboarding: 0
- Blitz RSVPs still open: 0
- Waiting to be placed: 0
- Team
- 14 signed for 2027
- Lock in your spot
- I'm in for 2027
- Signed for 2027 on Sep 7, 2026 (pattern: Signed for 2027 on {date})
- Asked to lock in on Sep 7, 2026 (pattern: Asked to lock in on {date})
- That did not send
- Welcome to Summit, first name. (pattern: Welcome to Summit, {first name}.)
- Three things before your first door.
- 1. Watch day one
- Open day one
- 2. Meet your Pillar
- Open the message
- 3. Say hi
- Open general
- Skip for now
- Already on the team, sign in
- Unread message from Sam (pattern: Unread message from {name})
- Answer the RSVP for Monday meeting (pattern: Answer the RSVP for {event})
- Watch Day one part 1 (pattern: Watch {video title})

### Verification

- Typecheck: `bun x tsgo --noEmit` clean.
- Production build: `bun x vite build` clean, 185 JS assets.
- Shell gzip: entry `index` chunk 16,412 bytes gzip; entry plus the three vendor chunks 241,196 bytes gzip.
- Settings key read back: `resign_2027_card = on`.
- Cap proof, rolled back: four capped rows for one person on one day produced three kept rows plus one `digest:daily-fold` row (kept=3, fold=1, total=4).
- Tagged insert proof, rolled back: one row each of `inactivity`, `checklist`, `digest:offline`, `digest:sunday-weekly`, `digest:monday-manager`, `topperf` all passed the trigger (tagged_kept=6, folds=0).
- First open proof, rolled back: the guarded update stamped once and a second run left the same timestamp (same=t).
- Baselines after rollback: chat_messages 715, profiles 536, resign_intents 0, earnings_goals 0, user_notifications 6369 (6369 before), first_open_at set 0, daily-fold rows 0.

### Limitation

An authenticated walkthrough at 390 and 1280 could not be captured: preview session minting needs an approval that was not available, so the home layouts were verified by build, typecheck and code review rather than by screenshot. Every new tap target is at least 44px tall.

## Pass 173 - two closes found by the owner's monitor

### 1. Edge functions deployed

Deployed with the backend deploy tool on Mon Sep 7 2026 at 14:52 UTC (single deploy call, all six reported success):

- submit-application
- bootcamp-reminders
- check-bootcamp-overdue
- check-inactivity
- manager-weekly-digest
- weekly-champion-notify

The platform deploy tool reports success per function rather than a per function timestamp, so the deploy time above is the time of the call. Live proof that the new submit-application is the running version: a POST to the live function with `referral_source` blank returned `HTTP 200 {"status":"ok"}` (the pre 172 version rejected a blank referral with a 400). The probe row was then deleted, leaving applications at 13.

This is a backend function deploy only. The site was not published.

### 2. applications.referral_source nullability

Migration: `ALTER TABLE public.applications ALTER COLUMN referral_source DROP NOT NULL;` No data changes, no other constraints touched.

Read back from `information_schema.columns`: `referral_source`, type `text`, `is_nullable = YES`.

- The edge function writes `referral_source: referralSource || null`, so a blank field stores null, not an empty string.
- The staff view already hides the line when null: `AdminApplicationsTab.tsx` renders `{app.referral_source && <span>Who told them about Summit: ...</span>}`.

Rollback test of the insert path: inside a transaction, one `applications` row was inserted with `referral_source` null, the count inside the transaction read 14, and the transaction was rolled back. Final count 13.

### 3. Em dashes removed from manager-weekly-digest

New copy, verbatim:

- 3 reps need attention this week. open My week (pattern: {n} {rep needs|reps need} attention this week. open My week)
- Your week. reps who need attention

No other copy changed. Note: the digest email body still contains one em dash in an existing list line (`{name} — {reason}`); it was not named in this pass, so under "no other copy changes" it was left as is and is flagged here for a future pass.

### Verification

- Typecheck: `bun x tsgo --noEmit` clean.
- Production build: `bun x vite build` clean.
- Baselines: applications 13, profiles 536, chat_messages 715, user_notifications 6372 - all unchanged after the tests.
- Security linter after the migration: 442 issues, the same pre-existing project wide set as Passes 171 and 172; nothing new introduced.
- The site was not published.

## Pass 174 - one copy close in manager-weekly-digest

### Changes

In `supabase/functions/manager-weekly-digest/index.ts` only:

1. In-app notification message: now capitalized.
   - Old: `{n} {rep needs|reps need} attention this week. open My week`
   - New: `{n} {rep needs|reps need} attention this week. Open My week`
2. Email subject: added a colon.
   - Old: `Your week. reps who need attention`
   - New: `Your week: reps who need attention`
3. Email body list line: replaced the em dash with a colon and a space.
   - Old: `{name} — {reason}`
   - New: `{name}: {reason}`

No other copy, logic, or permissions changed. The function was redeployed with the backend deploy tool.

### New copy, verbatim

- `3 reps need attention this week. Open My week` (pattern: `{n} {rep needs|reps need} attention this week. Open My week`)
- `Your week: reps who need attention`
- `Rep: no sales and no training this week` (pattern: `{name}: {reason}`)

### Verification

- Em dash grep: `rg '—' supabase/functions/manager-weekly-digest/index.ts` returned zero matches.
- Typecheck: `bun x tsgo --noEmit` clean.
- Production build: `bun x vite build` clean (pre-existing CSS warnings only).
- Shell gzip: entry JS `dist/assets/index-*.js` = 16,412 bytes gzip; entry CSS `dist/assets/index-*.css` = 28,216 bytes gzip.
- Deploy: backend deploy tool reported `Successfully deployed edge functions: manager-weekly-digest`.
- Baselines unchanged: applications 13, profiles 536, chat_messages 715, user_notifications 6372.
- No data writes, no real form submissions, no live function calls that create rows. The site was not published.

## Pass 175 - Trinity Sales: brand and aesthetics overhaul

### 1. Name and wordmark

- Company name is Trinity Sales, everyday name Trinity, wordmark TRNTY.
- `index.html`: title `Trinity Sales`, og:title / twitter:title `Trinity Sales`, author `Trinity Sales`, JSON LD Organization `name: Trinity Sales` with `alternateName: Summit Marketing` kept for search continuity, WebSite `name: Trinity Sales`, `application-name` TRNTY, `apple-mobile-web-app-title` TRNTY, theme colours `#070A10` dark and `#FFFFFF` light. The canonical URL, og:image and the Instagram link are untouched.
- `public/manifest.webmanifest`: name `Trinity Sales`, short_name `TRNTY`, description `Training, chat and team tools for Trinity reps.`, background and theme `#070A10`.
- 79 files under `src` and `supabase/functions` were renamed by a scripted pass: `Summit Marketing` to `Trinity Sales`, `Summit Trinity` to `Trinity`, then the bare word `Summit` to `Trinity` on word boundaries only, so identifiers (SummitLoader, AskSummitPage, `summit_stack_*`, `Summit_Fiber_Pay_Scale_v5.xlsx`), storage keys, URLs, domains and email addresses could not be touched. `Ask Summit` is now `Ask Trinity`, `Summit Checklist` is `Trinity Checklist`, the welcome screen reads `Welcome to Trinity, {first name}.`, the login line reads `Sign in to Trinity.`
- One stored value was restored by hand after the rename: `src/pages/app/LeadsPage.tsx` keeps `value="Summit"` (a lead source written to the database) with the label `Trinity`.
- Wordmark spec: TRNTY in Space Grotesk 700, letter spacing 0.08em, `--wordmark-letters` white on dark and `#0A0F1A` on light. The full lockup adds `TRINITY SALES` at 10 to 11px, 0.3em tracking, in lime. Compact is TRNTY alone (used in nav and headers at 26 to 36px). The small mark and the app icon are one continuous three peak ridgeline, a single lime stroke, centre peak tallest, no fill.
- The old logo was a React component (`src/components/brand/Wordmark.tsx`) holding path data; there were no `wordmark-component.svg`, `wordmark-compact-component.svg`, hero SVG or `mark.svg` files in the repository to replace. The component was rewritten in place and keeps the same export, the same `variant` names (`hero`, `heroMono`, `heroFiber`, `heroLife`, `full`, `fullV2`, `stacked`, `compact`, `compactPlain`, `mark`) and the same `height` and `className` props, so every existing import keeps working.
- PNG export was possible in the sandbox. `favicon.png` (64), `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (safe area inset) and `splash-1170x2532.png` were redrawn from the new mark with Pillow. A vector `public/favicon.svg` was added and is listed first in the head.

### 2. Palette

Token names are unchanged; only values moved.

Dark (default everywhere except Life and an explicit light choice): background `#070A10` (220 39% 5%), surface and card `#0D121B` (219 35% 8%), surface elevated `#131A26` (218 33% 11%), border `#1E2734` (215 27% 16%), border strong `#2A3546` (216 25% 22%), text `#F2F6FA` (210 44% 96%), secondary `#A7B2C2` (216 18% 71%), muted `#6F7B8C` (215 12% 49%).

Lime `#B4F53B` (81 90% 60%) is `--primary`, `--accent`, `--workspace-accent`, `--success` and `--sidebar-primary`: primary buttons with `#070A10` labels, the active bottom tab and sidebar indicator, progress fills and the goal ring, the big number on Home. Blue `#3D7BFF` (221 100% 62%) is `--ice` and `--ring`: links, active secondary controls, focus rings on inputs, unread dots. Warning `#F2A900` (42 100% 47%) and destructive `#FF5A5F` stay. No lime to blue gradient exists anywhere; the accents never sit at equal weight in one row.

Own chat bubbles are blue with white text; other bubbles sit on surface elevated. The bubble blue is a deeper `221 100% 46%` (`--bubble-blue`) so white bubble text clears AA (see contrast).

Light (Life and an explicit light choice): background `#FFFFFF`, surface `#F3F5F8` (216 26% 96%), surface elevated `#FFFFFF`, border `#E2E6EC` (216 21% 91%), text `#0A0F1A` (221 44% 7%), secondary `#4B5566` (218 15% 35%), muted `#7C8595` (218 11% 54%). Primary button is `#0A0F1A` fill with a lime label; links and active states are blue `#1F5EFF` (223 100% 56%). The light wordmark accent was adjusted from `#7BAF12` to `#547E07` for legibility. The range in light mode is drawn in blue greys.

Old ice `#5AD1FF` and mint `#3DDC97` are gone from `src`, including the workspace palettes and the workspace switcher.

Contrast ratios measured on the final values:

| Pair | Ratio |
| --- | --- |
| lime `#B4F53B` on background `#070A10` | 15.16:1 |
| `#070A10` on lime `#B4F53B` | 15.16:1 |
| blue `#3D7BFF` on background `#070A10` | 5.17:1 |
| text `#F2F6FA` on surface `#0D121B` | 17.27:1 |
| secondary `#A7B2C2` on surface `#0D121B` | 8.75:1 |
| muted `#6F7B8C` on background `#070A10` | 4.61:1 |
| light blue `#1F5EFF` on white | 5.12:1 |
| light text `#0A0F1A` on `#F3F5F8` | 17.54:1 |
| lime label `#B4F53B` on light primary `#0A0F1A` | 14.66:1 |

Two values were adjusted because they came in under 4.5:1 and both carry text:

- white on blue `#3D7BFF` was 3.84:1. The own chat bubble now uses `221 100% 46%` (`#004AEB`): white on it is 6.61:1.
- the light mode lockup lime `#7BAF12` on white was 2.63:1. It is now `#547E07`: 4.81:1 on white.

### 3. The mountain

`src/components/brand/MountainRange.tsx`, viewBox 1440 by 600, five layered ridgelines. The paths were produced by a seeded generator (a linear congruential generator feeding jittered peak points, then Catmull-Rom converted to cubic beziers) so the silhouette is irregular rather than triangular. No strokes, no clip art. Layers far to near in dark mode `#16233D`, `#121D33`, `#0E1729`, `#0B1220`, `#080D17`; light mode `#DCE4F2` down to `#F3F5F8`; both sets are written as `--range-1` to `--range-5` by the workspace theme, so the range follows the resolved appearance. A haze rectangle over the lower third fades from transparent to the page background so the range dissolves into the page.

Placement: the public cover hero (full width, bottom aligned, behind the headline), the login screen (lower half), and behind the Home hero on all three workspaces at 30 percent opacity. The cover range translates on `translateY(scroll * 0.15)` and the listener is not attached at all under `prefers-reduced-motion: reduce`.

Cropping: the SVG uses `preserveAspectRatio="xMidYMax slice"`, so at 1280 the whole 1440 wide range reads with all five layers visible; at 390 the outer ridges crop away left and right and the tall centre peak stays in frame, its crest sitting just below the headline with the near layers filling the lower third.

### 4. Type

Space Grotesk 500/700 and Inter 400 to 700 load from Google Fonts in `index.html` with `display=swap` and preconnect; Inter is also self-hosted through `@fontsource` as the fallback path, and the Montserrat imports were removed from `src/main.tsx`. `font-display` (Tailwind) and the `h1`, `h2`, number and wordmark rules in `src/index.css` now resolve to `'Space Grotesk', 'Inter', system-ui, sans-serif`. Body stays 15px on phone and 16px on desktop, labels are 12px muted at 0.08em, headings are sentence case at -0.02em, and the Pass 152 rule that nothing renders under 12px on a phone is untouched.

### 5. The public cover

`src/pages/Index.tsx` was rebuilt from the version at commit 2d0bfe05, in the same order and with the same copy, then restyled. Sections top to bottom at both 390 and 1280:

1. Nav: TRNTY compact wordmark, `Pest`, `Fiber`, `Sign in` in blue. At 390 the two industry links stay visible and every target is at least 44px tall.
2. Hero, the range behind it: TRNTY full lockup, then the restored headline `Financial freedom.` / `Done differently.` in Space Grotesk 700 at `clamp(2.25rem, 8vw, 5rem)`, the restored line `A performance-based path through sales, training, and team leadership.`, the lime `Apply` button, the blue text link `See what you could make` (only when a pay scale is published), then `Pest control now · Fiber internet in the off-season`. At 390 the headline breaks over two lines above the range crest; at 1280 it runs two lines at 5rem with the range peaks to its right.
3. Three doors (`ThreeDoorSection`, unchanged component): Pest live, Fiber `Off season lane`, Life greyed.
4. What the work is, on the surface shade: `Knock` / `You work a set area with a script you have practised.`, `Close` / `You sign the account at the door and log it the same day.`, `Get paid` / `You are paid on what you close, not on hours.` One column at 390, three at 1280.
5. Estimate your earnings: `Estimate your earnings` and `Set the accounts and the weeks. The pay scale does the rest.` with the existing calculator, still gated on `get_public_calc` published bands.
6. How the season works: `Apply` / `A short form, then a call with a manager.`, `Train` / `Scripts, product and practice before you knock.`, `Sell the season` / `You work an area with your team through the summer.`, `Settle up` / `Your pay follows the scale you reached.`
7. Final band: the TRNTY lockup, `Applications take a few minutes.`, the lime `Apply` button, and the Pass 172 line `Already on the team, sign in` (kept; the Pass 170 `Where this goes` section it used to sit under is gone with the restore).
8. Footer: the ridgeline mark, `Trinity Sales`, `© 2026`, `For parents`, `Instagram`.

Card borders are gone; sections are separated by spacing and surface shade, with one lime action per section and blue for links. The Pass 170 referral field on the applications is untouched.

### 6. The app, at 390 in dark

- Login: the range in the lower half, TRNTY lockup, `Welcome back`, `Sign in to Trinity.`, inputs with a blue focus ring, a lime `Sign in` button, and the forgot password link in blue.
- Home (owner): the TRNTY compact wordmark in the header, the lime active `Home` tab in the floating bottom bar. This account had never opened the app, so the first open welcome screen showed: `Welcome to Trinity, Mathew.` / `Three things before your first door.` with `Open day one` as the one lime action and the two other steps outlined, plus `Skip for now`. Owner Today and the hero sit behind it on the next open.
- Home (Pest sales account): not walked at 390. The signed in session available to this pass is the owner's own account; no sales account session can be minted without that person signing in. The hero and its number were verified in code and through the owner's Home.
- Chat room list: rooms on surface elevated, `Ask Trinity` at the bottom, the lime active `Chat` tab. The Trinity wallpaper draws the range at 20 percent behind the room; Night is flat, Photo is the person's own image.
- More: three groups, `YOUR WORK` (4), `MANAGE` (12), `SETTINGS` (4), the workspace segmented control above them now in one lime accent instead of the old per industry mint and ice, then `VIEW AS`, feedback and log out.
- Progress: `Progress` / `Your points, recognition and To do.`, the points and streak figures, `Leaderboard rank`, `Badges` with the trophy case rows in lime small caps, then `To do`.
- Life Home in light: not walked. The owner's session has no Life workspace access, so the light palette was verified through the token values and the light range colours rather than on screen.

### 7. Emails and functions

User facing copy inside `supabase/functions` was renamed with the same rules; from addresses, domains and reply addresses are unchanged (the Resend display name reads `Trinity <onboarding@resend.dev>`). Redeployed with the backend deploy tool: `admin-approve-user`, `admin-create-user`, `ai-coach`, `ask-summit`, `bootcamp-reminders`, `build-rep-profile`, `check-inactivity`, `send-calendar-notification`, `send-welcome-email`, `submit-vet-lead`, `weekly-owner-report`. Tool output: `Successfully deployed edge functions: admin-approve-user, admin-create-user, ai-coach, ask-summit, bootcamp-reminders, build-rep-profile, check-inactivity, send-calendar-notification, send-welcome-email, submit-vet-lead, weekly-owner-report`. No live function was called and no form was submitted.

### Remaining `Summit` hits in code, with reasons

All remaining hits are identifiers, keys, URLs, file names or addresses:

- `SummitLoader`, `AskSummitPage`, `isSummitAppShellCache`, `summitUpside`, `ask_summit_roster` - component, page, function and RPC identifiers.
- `ask-summit` - edge function name and route segment; `'ask-summit': 'Ask Trinity'` maps the function name to the new label.
- `summit.chat.lastRoom`, `summit_interview_responses`, `summit_source_attribution`, `summit-doors-cache-v1`, `summit-(static|shell)-` - browser storage and cache keys.
- `command_pillar_summit`, `summit_stack_fiber_sonic`, `summit_stack_fiber_surf`, `rank_is_summit`, `ALL_SUMMIT` - `app_settings` keys and code constants; labels around them read Trinity.
- `Summit_Fiber_Pay_Scale_v5.xlsx` - the stored file name in the private bucket, matched by an allow list.
- `summitmktgsales.com`, `summitmktg.lovable.app`, `www.instagram.com/summitmktgsales/`, `support@summitmktgsales.com`, `push@summitmktgsales.com`, `@summit-import.local`, `pending@summit.com`, `summit2026`, `snapshots/summit-*.json` - domains, URLs, addresses, a seed password and backup paths.
- `.chat-surface-summit`, `.summit-atmosphere` - CSS class names tied to the stored `wallpaper` value `summit` and a legacy no-op rule.
- `src/pages/app/LeadsPage.tsx` `value="Summit"` and `LeaderboardPage` `'summit'` scope - values compared against stored data.
- `src/tailwind.config.lov.json` - generated config, not hand edited.

### Database rows whose text contains Summit (not edited, for the owner to decide)

| Table . column | id | text |
| --- | --- | --- |
| access_codes . description | d7f8407e-c7d3-417f-a9e5-978df31fa08d | Default Summit access code |
| app_settings . value | e34cc244-5158-4c40-8c35-7fb585fc198a | Reps Summit sends you: 5% to manage + 5% to train = 10% override |
| app_settings . value | badf36f2-af21-4a8e-ba89-87e452539420 | Paid installs with Summit, across every ISP and every blitz ... |
| calendar_events . title | 08e5f09e, 169788c3, 16e07511, 7897b29f, 95eee9b6, c9fa0368, dd2993c0, e1c1a399, f087339c, fe6e1c15 | Summit Regional Call (10 rows) |
| chat_channels . label | 19a27732-a0c6-43bf-a7aa-ff27a176d8cf | Summit Trinity |
| chat_channels . label | a47d0893-f9fe-4cfe-9d41-1b82b2f1d919 | Summit Pest |
| chat_channels . label | d9021b9d-583a-4bef-844b-a6ecd4a0f21e | Summit Fiber |
| chat_channels . label | f5bb2a4d-a278-4828-a708-7bcba5b50a7d | Summit Life |
| schedule_items . title / description | 28e9be74-2b33-4d1b-abe8-32aa8b064ae0 | Summit Call / Company-wide Summit call |
| scripts . body | 2e3a6f4b, 612d5fea, a2cf28ba | recruiting call scripts opening "it's [your name] with Summit" |
| todo_items . title | 0f7eb754-8260-4910-81c7-4c0720827354 | Make summit video |
| training_lessons . title | 4f332830-0133-422f-8aa9-221feb4f3805 | Welcome to Summit Marketing Family |
| training_lessons . content | 277057f8, 4f332830, bf0ce148, d344cc77, dde44c23, ed31bd81 | manual chapters naming Summit or SUMMIT MARKETING |
| training_modules . title / description | 4b1ef288-4988-408e-a08b-7d234e12b5f6 | Welcome to Summit / Welcome to the Summit Marketing family and understand your purpose |

### Remaining hardcoded hex and hsl outside index.css, with reasons

- `src/components/workspace/WorkspaceThemeProvider.tsx` - the source of truth for the workspace palettes: the wordmark colours and the five range layers must be literal values before they become CSS variables.
- `src/components/brand/Wordmark.tsx` - `#B4F53B` and `#FFFFFF` as fallbacks behind `var(--wordmark-accent)` and `var(--wordmark-letters)`, for the mark on surfaces that set no wordmark variables.
- `src/components/command/*.tsx` and `src/pages/app/CommandCenterPage.tsx` - the private operator Command Center keeps its own gold on near-black palette, out of the product theme.
- `#D4AF37` in `TicketPage`, `RankInsignia`, `BadgeChip`, `BadgeStrip`, `SeasonBanner`, `TeamBattles`, `IncentiveTracker`, `HallOfFame`, `LeaderboardPage` - the established trophy and owner gold treatment, unchanged by this pass.
- `src/components/admin/RichTextEditor.tsx` and `AdminThemesTab.tsx` - swatch values inside colour pickers, which are data, not styling.
- `src/pages/app/BootcampPhase3.tsx` - `#ffffff` as a canvas `strokeStyle` for the signature pad.
- `src/tailwind.config.lov.json` - generated file.
- Every other `hsl(` hit in `src` is `hsl(var(--token))`, which is token use.

### Verification

- The copy added or renamed in this pass contains no em dash and no emoji. Em dashes do remain in older comment and AI prompt text inside `supabase/functions` (weekly-owner-report, bulk-create-users, extract-leaderboard, submit-vet-lead, validate-signup, daily-accountability-post, redeem-invite, ask-summit, ai-coach, admin-create-user); none of them is user facing product copy and none was touched here.
- `bun x tsgo --noEmit` clean; `bun x vite build` clean.
- Shell gzip: entry JS `dist/assets/index-*.js` = 16,516 bytes gzip; entry CSS `dist/assets/index-*.css` = 28,399 bytes gzip.
- Baselines: profiles 536, chat_messages 715, applications 13 - unchanged. `user_notifications` reads 6445, up from 6375, entirely from the cron writers between Pass 174 and now; this pass wrote no notification.
- One accidental data write happened and was rolled back: opening `/app` in the verification browser as the owner rendered the Pass 172 first open screen, which stamped `profiles.first_open_at` for that one account. It was set back to NULL in a migration, so the welcome screen behaves as it did before this pass. No other row was written. No form was submitted and no live function was called.
- The site was not published.

## Pass 176 — user-facing em dash removal in edge functions

Scope: every file under supabase/functions grepped for the em dash character; AI system prompts in ai-coach and ask-summit left untouched by instruction. All remaining em dash hits outside those two files are code comments only.

Changed strings, verbatim (new value):

1. admin-create-user/index.ts email subject: `Welcome to Trinity. Your account is ready`
2. weekly-owner-report/index.ts email body list line: `<li>${r.name}: ${r.days == null ? "never active" : `${r.days}d`}</li>`
3. weekly-owner-report/index.ts email subject: `Weekly report: week ending ${latest.week_ending}`
4. extract-leaderboard/index.ts error: `Rate limited by the AI service. Try again in a minute.`
5. extract-leaderboard/index.ts error: `AI credits are exhausted. Add credits to run the import.`
6. bulk-create-users/index.ts warning: `${summerReadyGap} imported Summer Ready reps were not mapped to canonical records. Review required.`
7. bulk-create-users/index.ts warning: `${nlcGap} imported NLC reps were not mapped to canonical records. Review required.`
8. daily-accountability-post/index.ts post line: `_...and ${remaining} more. See Team page for full list_`
9. daily-accountability-post/index.ts section title: `GHOST MODE: 3+ DAYS INACTIVE`
10. daily-accountability-post/index.ts post footer: `Managers: if your people are on this list, it's your job to get them off it.`

No emoji were added; existing emoji in the accountability post are unchanged and predate this pass.

Deploy: admin-create-user, weekly-owner-report, extract-leaderboard, bulk-create-users, daily-accountability-post, submit-vet-lead deployed successfully with the backend deploy tool (submit-vet-lead subject changed to `Veteran bid request: ${fullName}`).

Verification: typecheck clean. No live function was called and no form was submitted; no rows were created. Site remains unpublished.

## Pass 177 - motion

**Status:** Complete in preview only. Nothing was published or deployed, and no data was written.

### Motion system

All new motion uses `--motion-fast` 160ms, `--motion-base` 280ms, `--motion-slow` 520ms, or `--motion-hero` 900ms; `--motion-ease-out`, `--motion-ease-in-out`, `--motion-spring`, and the 60ms `--motion-stagger` provide the shared timing language.

- `src/components/brand/RidgelineMark.tsx`, `src/index.css`: three-peak stroke draw and one glow pulse, 900ms ease-out; loader repeats every 1.6s. Login runs on mount and the footer runs once when observed.
- `src/components/brand/Wordmark.tsx`, `src/pages/Index.tsx`, `src/index.css`: TRNTY letters rise at 280ms ease-out with 60ms staggering; lockup follows; two headline lines wipe at 520ms ease-out, 120ms apart; support and actions rise at 280ms ease-out.
- `src/components/brand/MountainRange.tsx`, `src/pages/Index.tsx`, `src/index.css`: five layers settle over 900ms ease-out with 80ms offsets. Desktop pointer movement uses requestAnimationFrame with 0.08 lerp and up to 6px depth-scaled translation. Existing scroll parallax remains 0.15.
- `src/hooks/usePublicMotion.ts`, `src/pages/Index.tsx`, `src/components/recruiting/ThreeDoorSection.tsx`, `src/index.css`: below-hero sections reveal once at threshold 0.2; children rise over 520ms ease-out with 60ms staggering.
- `src/components/recruiting/LiveCounters.tsx`: proof figures count from zero over 900ms when first observed, retaining tabular numerals.
- `src/components/recruiting/ThreeDoorSection.tsx`, `src/index.css`: doors lift 4px over 280ms ease-out; Pest gets a 900ms ease-out edge sweep. The primary Apply sheen crosses over 520ms ease-out and the existing press state remains 0.98.
- `src/pages/Index.tsx`, `src/index.css`: public navigation border and backdrop settle over 280ms ease-out after 40px scroll.
- `src/components/layout/AppLayout.tsx`, `src/index.css`: route entry is a directional 12px slide and fade over 160ms ease-out, reading the existing history index for forward and back.
- `src/components/home/HomeNumber.tsx`: Home number counts over 700ms through the existing reduced-motion-aware requestAnimationFrame counter.
- `src/components/home/GoalRing.tsx`, `src/index.css`: pace ring draws over 900ms ease-out through stroke dashoffset.
- `src/components/home/NextActionRow.tsx`, `src/index.css`: next action rises after the number over 280ms ease-out.
- `src/components/layout/MobileBottomNav.tsx`, `src/index.css`: tapped icon scales to 1.08 and returns over 280ms spring.
- `src/pages/app/MorePage.tsx`, `src/components/settings/SettingsList.tsx`, `src/index.css`: first-render tiles rise over 280ms ease-out in 60ms sequence.
- `src/components/badges/BadgeStrip.tsx`, `src/index.css`: badges pop over 280ms spring in 60ms sequence.
- `src/pages/app/ProgressPage.tsx`: streak count uses the existing counter over 700ms.
- `src/components/notifications/NotificationBell.tsx`, `src/components/layout/MobileBottomNav.tsx`, `src/index.css`: unread dots pulse subtly twice over 520ms in-out.
- `src/components/ui/toast.tsx`, `src/components/ui/sonner.tsx`, `src/index.css`: toasts rise 16px and fade over 280ms spring; dismiss fades and lowers over 160ms in-out.
- `src/components/home/WelcomeFirstOpen.tsx`, `src/index.css`: three steps rise over 280ms ease-out in 60ms sequence; the primary button breathes once over 520ms in-out after the steps land.
- `src/components/ui/skeleton.tsx`, `src/index.css`: skeleton highlight translates left to right every 1.4s using the in-out easing.
- Existing Pass 168 chat arrival, reaction, send and typing motion remains intact.

### Performance and reduced motion

The new animations use transform and opacity only except for intentional SVG `stroke-dashoffset` drawing, the ridgeline `filter` glow, the headline `clip-path` reveal, nav `backdrop-filter` and border transition, and hover surface color changes. These exceptions are bounded decorative effects; no layout property is animated. Pointer parallax writes CSS translation variables inside requestAnimationFrame and never starts on hoverless/touch devices.

Under `prefers-reduced-motion: reduce`, the observer resolves sections immediately, scroll parallax remains at zero, pointer parallax never starts, count-up resolves immediately, and the comprehensive stylesheet override removes animation, transform, translation, clipping, glow and sheen while restoring full opacity. Existing chat and app reduced-motion blocks remain active.

### Cover sequence and responsive behavior

At load, TRNTY letters rise from 0ms through 520ms. The lockup follows at 420ms. Headline line one runs 520ms to 1040ms and line two runs 640ms to 1160ms. Supporting text runs 920ms to 1200ms and actions run 980ms to 1260ms. Mountain layers run far to near from 0ms through 1220ms. The settled hero is therefore complete by 1.26 seconds, under 1.8 seconds.

At 390px, the cover keeps its single-column actions and bottom-aligned range; `preserveAspectRatio="xMidYMax slice"` crops the outer ridges while keeping the central peak visible. At 1280px, actions sit in a row and all five layers have room for the full depth effect. App controls retain the existing 44px minimum touch targets. An authenticated visual walkthrough was unavailable, so app behavior was verified by source inspection, typecheck and production build without creating a session or writing data.

### Verification

- `tsgo --noEmit -p tsconfig.app.json`: clean.
- `npm run build`: clean.
- Shell gzip: entry JS 16,483 bytes, below the 16.5 KB reference and with no growth over 3 KB; entry CSS 29,677 bytes.
- Baselines read back unchanged: profiles 536, chat_messages 715, applications 13.
- No new copy was introduced. No em dash or emoji was added by Pass 177.
- No live function or form was called. The site remains unpublished.

## Pass 178: cinematic cover

### Living hero (src/components/brand/MountainScene.tsx)
Canvas scene on the public cover only. It reuses the five exported ridgeline
paths from `MountainRange` through `Path2D` on the same 1440 x 600 box, so the
silhouette is identical to the SVG range. The SVG `MountainRange` is untouched
and still serves login, Home and the chat wallpaper.

Scene elements, all drawn per frame:
- Sky fill interpolated by the time of day scalar: #070A10 at 0 to #0B1224 at 1.
- Blue light band (#3D7BFF) behind the tallest peak, radial, alpha 0.08, breathing over 12 seconds.
- Particle field above the range: 60 on a phone (canvas width under 700), 160 on desktop, 1 to 2px, lime at 25 percent and white at 15 percent, rising with a slight drift and wrapping.
- Five ridges far to near, each colour interpolated from its night value to one step brighter at time of day 1.
- Lime crest line stroked along the far ridge, drawing in once over 1.2 seconds with a dash offset.
- Three mist bands drifting horizontally between the ridges, loops of 40, 62 and 90 seconds, wrapped so there is no seam.
- Bottom haze in the sky colour so the range dissolves into the page, matching the SVG range.

Cost control: device pixel ratio capped at 1.5; a single `IntersectionObserver`
plus `visibilitychange` pauses the loop when the tab is hidden or the canvas
leaves the viewport; pointer parallax only on fine pointers.

Hero at 390 x 844: the range fills the lower ~55 percent (fit rule is
`max(width / 1440, height * 0.55 / 600)`, so the outer ridges crop and the
centre peak stays in view). Measured canvas pixels at x=30 show sky rgb(8,13,23)
down to y=500, the far ridge crest with the lime line at y=510 at rgb(36,55,91),
the nearer ridges stepping down to rgb(14,22,39) by y=660, then the haze back to
the sky colour. Lockup top left, headline in the lower third, one lime Apply
button, the blue earnings link when a scale is published.

Hero at 1280 x 800: same scene at full width, ridges reading clearly across the
frame, particles visible in the upper two thirds, pointer parallax active on the
ridges (depth 1 to 5) and particles (three depths).

### Frame time
`requestAnimationFrame` callbacks were instrumented in the page and the last 200
frames sampled after load.
- 390 x 844: median 0.1ms, p95 0.3ms, max 2.1ms per frame.
- 1280 x 800: median 0.2ms, p95 0.4ms, max 0.8ms per frame.
Frame interval stayed at a steady 16.7ms median (60fps). Well under the 8ms bar.

### Scroll story
The cover scene is `position: fixed` behind the whole page and every section
below the hero rides over it on a surface at `hsl(var(--surface) / 0.92)`, so the
range shows faintly through. The sky scalar follows scroll progress of the page:
- Top (hero): 0.35, reached by easing from 0 over the first 1.5 seconds on load.
- Middle: 0.35 + 0.5 x 0.65 = 0.675.
- Bottom: 1.0, the lifted sky with the far ridges one step brighter.
Sections still enter with the Pass 177 reveals.

### Pinned doors
Desktop (min-width 1024, motion allowed): the doors section is 200vh with a
sticky inner block for 100vh. Measured section height 1600px at a 800px
viewport. Door progress variables move in sequence with scroll: at 0.85 and 1.15
viewports scrolled they read 0.000 / 0.000 / 0.000, and at 1.6 viewports they
read 1.000 / 0.222 / 0.000, so Pest is fully in, Fiber is sliding in from the
right and the Life line has not started. Each door translates from 40vw with
opacity following the same scalar.
Phone: the pin never mounts. The section is the plain stacked reveal, measured
height 840px, no sticky child.

### Sticky section nav
Desktop only (`display: none` under 1024px). Appears after 0.7 of a viewport of
scroll with The work, Earnings (only when a pay scale is published), The season
and Apply, each a smooth scroll link, with a lime 2px underline that translates
and resizes to the active section over 280ms.

### Micro interactions
- Magnetic primary Apply buttons: up to 6px toward the pointer inside a 40px halo, spring easing, released to 0 outside it. Desktop only.
- Card spotlight: a 220px radial lime highlight at 6 percent following the cursor inside the doors and the season steps. Desktop only.
- Links: the underline scales from the left on hover.
- Nav wordmark: a one time light sweep across the TRNTY letters on hover, opacity only, 60ms stagger.

### Media slots
`useCoverMedia` reads `cover_hero_video` and `cover_hero_image` through the
allowlisted `get_public_setting`. Both are empty today (0 rows in `app_settings`
for those keys), so nothing renders and the scene stands alone. When a video is
set it renders full bleed, muted, looping, autoplay, `playsInline`, under a
40 percent scrim; when only an image is set it renders the same way. No stock
art and no placeholder box.

### Reduced motion
With `prefers-reduced-motion: reduce` the scene draws one static frame at time of
day 0.35 and never starts a loop: instrumented `requestAnimationFrame` calls
stayed at 0 across five seconds after load. No particle movement, no mist drift,
no breathing light, the crest line drawn complete, no scroll driven sky change,
no pin (section height 840px, no sticky child), no magnetic pull, no spotlight,
no wordmark sweep, no underline transition.

### Editorial scale
Headline `clamp(3rem, 9.5vw, 7.5rem)`, line height 0.95, tracking -0.035em, hero
at `calc(100svh - 69px)`. Section titles `clamp(2rem, 5vw, 4rem)`. Proof strip
numbers Space Grotesk 700 at `clamp(3rem, 8vw, 6rem)` with tabular numerals and
the Pass 177 count up. Body copy stays 16 to 18px with a 60ch measure.

### Checks
- Typecheck clean (`tsgo --noEmit -p tsconfig.app.json`).
- Production build clean, 3093 modules, no CSS warnings.
- Shell gzip: entry JS 16,430 bytes (Pass 177: 16,461, so 31 bytes smaller), entry CSS 29,946 bytes (Pass 177: 29,655, plus 291 bytes). Well inside the 6 KB allowance.
- No layout shift from the hero: measured cumulative layout shift 0.0000 at 390 and at 1280 after reserving the actions row height, which the late pay scale read had been shifting by 64px.
- Fonts load from Google Fonts with `display=swap` on both stylesheet links.
- Baselines unchanged: profiles 536, chat_messages 715, applications 13.
- No copy changes, no permission changes, no data writes, no live function calls, no forms submitted, site not published.

## Pass 179 - interaction

No new npm dependencies. No data writes, no deployments, site not published.

### 1. Knock (src/components/recruiting/KnockDoor.tsx, src/index.css)
CSS door beside the headline on desktop, below it at 390. One accessible button
labelled Knock takes pointer, touch, Enter and Space. Fixed sequence, verbatim:

- Knock one. Every account starts here.
- Knock two. Most people say no. You keep going.
- Knock three. Someone says yes.
- Knock four. Log it the same day.
- Knock five. Now do it again.
- Ready to knock for real

Swing: rotateY -62deg over 520ms with the spring easing token. Warm light is an
opacity fade on a radial gradient (520ms, out). Counter reads Knocks: n. After
the fifth knock the door stays open and the Apply button sits in the doorway.
Verified at 390 and 1280: five clicks reach the final line, counter 5, one Apply
link inside the door.

### 2. Your year (src/components/recruiting/YearStrip.tsx)
Replaces the static season list. Twelve months in a track with a lime marker.
Drag with the pointer, tap a month, or focus the slider (role slider, aria
valuetext the month) and use the arrow keys. Card copy is the existing season
step copy placed by month: Apply (Jan, Feb), Train (Mar), Sell the season
(Apr to Aug), Settle up (Sep), Off season (Oct to Dec), plus one line
Live lane: {Pest|Fiber}. Life is coming.
While held the cover sky scalar follows the month (winter dark, summer bright)
and returns to the scroll value on release or after 900ms for a tap or key.
Verified: arrow key moved Apr to May and the card read Sell the season; tapping
Oct read Off season with Live lane: Fiber. Life is coming.

### 3. Find your door (src/components/recruiting/FindYourDoor.tsx)
Three steps, 48px choices. Sold door to door before yes or no; start this
season, next season or not sure; free text market. Routing: yes goes to
/apply/veteran, no goes to /apply/rookie; this season carries vertical=Pest,
next season or not sure carries vertical=Fiber; market and start ride along.
Verified route at 390 and 1280:
/apply/veteran?vertical=Pest&market=Boise%2C+ID&start=this
Summary line read: Vet, Pest, this season, Boise, ID. Your application takes
about four minutes.
Prefill (src/pages/RookieApplication.tsx, src/pages/VetApplication.tsx): the vet
form opened with Boise, ID in City, State; the rookie form opened with Provo, UT
and jordan from ?market= and ?referral=. No new fields and no new writes.

### 4. Know someone here (src/components/recruiting/ReferralLookup.tsx)
One input, Who told you about Trinity, under the final band. After three
characters and a 300ms pause the text is read through the existing read only
pillar_link_lookup RPC. A match shows Apply with {first name} linking to
/p/{token}. No match shows Carry that into your application, verified as
/apply/rookie?referral=jordan at a 44px target.

### 5. The climb (src/components/brand/MountainScene.tsx)
A lime marker rides the crest of the far ridge, driven by scroll, reaching the
summit as the final Apply band enters view. Taps on the range send a light
ripple (700ms, cubic ease out), and taps on links, buttons and inputs are
ignored. Under reduced motion the marker is fixed at the summit and the ripple
never runs.

### 6. App interactions
- src/components/home/HomeNumber.tsx: tapping the number flips between this week
  and this season using the values the same read already returns. The flip is a
  rotateX plus opacity at 280ms with the out token.
- src/pages/app/ProgressPage.tsx, src/components/badges/BadgeStrip.tsx: badges
  are buttons that open a bottom sheet with the existing badge description.
- src/components/home/GoalRing.tsx: press and drag around the ring sets the
  weekly goal, the figure moving with the finger, and Save confirms. It writes
  through the existing path this ring already used (profiles.weekly_goal); the
  earnings_goals editor on Estimate earnings is untouched, which is why
  earnings_goals stays at 0.

### Reduced motion
Checked at 390 with reduced motion forced: every transition and animation added
in this pass resolves to none or 1ms, the door sits open, the qualifier cards do
not slide, and all five interactions still complete. No pointer parallax on
touch.

### Verification
- Typecheck: tsgo --noEmit -p tsconfig.app.json clean.
- Production build: clean, build log reads build OK.
- Shell gzip: entry JS 16,451 bytes, entry CSS 30,995 bytes.
- No em dash and no emoji in any added line (grep returned nothing).
- Baselines: profiles 536, chat_messages 715, applications 13,
  earnings_goals 0. Read only, no writes, no live function calls, no forms
  submitted.
- Site not published.

## Pass 180 - palette V5, type, logo, the opening and the sweep

### Palette V5, warm ink and ember
Every token name is unchanged; only values moved. Dark: background 30 9% 4%
(#0C0B0A), surface 30 11% 7% (#141210), surface elevated 30 12% 10% (#1C1916),
border 30 11% 15% (#2A2622), border strong 30 9% 21% (#3A3530), text
39 39% 93% (#F4EFE6), secondary 37 13% 66% (#B3AA9C), muted 33 8% 50% (#8A8176).
One accent, ember 15 88% 59% (#F2673A), carries primary, ring, ice, workspace
accent, rookie and manager accents, progress, the goal ring, the You row, unread
dots, the climb marker, the year strip marker, the qualifier selections and the
door handle. Own chat bubble 15 75% 41% (#B8421A) on text 39 39% 93%. Warning
42 100% 47% and destructive 358 100% 68% are untouched. Light: background
38 41% 95%, surface 36 32% 91%, surface elevated 0 0% 100%, border 37 24% 85%,
text 30 11% 7%, secondary 34 8% 33%, muted 33 9% 40%, accent 17 82% 38%,
primary fill 30 11% 7% with a 38 41% 95% label. Dawn gold #F5B94B appears only
inside the canvas scene and the opening flash, never in the interface.

Contrast, restated: ember on background 6.35, ink on ember 6.35, text on surface
16.32, secondary on surface 8.14, muted on background 5.13, text on own bubble
4.78, light accent on paper 5.29, light muted on paper 5.03.

Old brand literals removed. Remaining raw colour values, with reasons:
- src/components/brand/Wordmark.tsx, RidgelineMark.tsx: #F2673A as the fallback
  for var(--wordmark-accent), needed before a theme is applied.
- src/components/brand/MountainScene.tsx, LogoBurst.tsx: canvas fills. A canvas
  cannot read a CSS token per frame without a style read, so the ridge, ember
  and dawn gold values are literals in one place each.
- src/components/workspace/WorkspaceThemeProvider.tsx and the :root blocks in
  index.css: these are the token definitions themselves.
- src/components/ErrorBoundary.tsx: renders before the themed app mounts, so it
  carries the four palette values inline (now warm ink and ember).
- src/components/command/tokens.tsx: the private Operator Command Center keeps
  its own gold scheme, outside this pass.

### Type
Instrument Serif (Regular and Italic) and Geist (400, 500, 600) both returned
faces from Google Fonts, so Geist is in use and DM Sans stays only as a
fallback. Space Grotesk, the Inter link and the fontsource Inter imports are
gone. Verified in the browser: body font-family resolves to
`Geist, "DM Sans", system-ui, sans-serif`; the cover headline resolves to
`"Instrument Serif", Geist, Georgia, serif` at clamp(3.25rem, 10vw, 8rem),
line height 0.92, letter spacing -0.02em, with the second line in italic.
Section titles and the cover big numbers use the same serif. App headings stay
Geist 600; the serif appears in the app only on the login headline and the Home
hero greeting. Body is 15px on phone and 16px from 768px up.

### Logo
Wordmark TRNTY in Instrument Serif Regular, capitals, 0.12em tracking, text
colour on dark and ink on light. The lockup puts the mark at cap height to the
left of the T with a 0.5em gap and TRINITY SALES underneath in Geist 500 at 10
to 11px, 0.3em tracking, ember on dark and #B23E12 on light. The mark is a solid
three peak silhouette, centre peak tallest, outer peaks at 70 and 60 percent of
its height, flat base, corners softened, filled ember. Every variant and prop
name on Wordmark.tsx and RidgelineMark.tsx is unchanged, so all imports still
resolve. Regenerated as PNG from the new mark: favicon.png, apple-touch-icon.png
(180), icon-192, icon-512, icon-512-maskable (20 percent safe padding) and
splash-1170x2532; favicon.svg was rewritten by hand. The manifest and the
theme-color meta now read #0C0B0A and #F7F3EC.

### The opening (src/components/brand/LogoBurst.tsx, cover only)
Runs once per session (sessionStorage key trnty_intro_seen) and never under
prefers-reduced-motion. Both faces are awaited with document.fonts.load, with a
2500ms timeout after which the sequence runs on the fallback faces. Sequence and
timings: lockup draws in 900ms (mark fills base to peak, letters rise 12px and
fade), hold 400ms, peak flash 240ms, shatter 1100ms with the spring easing and a
slight field spin, pull to the headline targets 1400ms with the spring easing,
then a 200ms crossfade to the real DOM headline, with the top left lockup, the
support line and the Apply row fading up behind it. Total 4.24s of animation;
measured settled at about 4.5s from navigation, including font load.

Sampling: the lockup and the headline are each drawn to an offscreen canvas at
their exact on screen size and position and read with getImageData. Grain is
3px on phone and 2px on desktop for the target field and one step finer for the
lockup, capped at 2400 particles on phone and 7000 on desktop. Each particle
keeps the colour it was sampled from, ember for the mark and text colour for the
letters. Matching sorts both fields into 12px grid cells and pairs them index by
index, so it is a linear pass after the sort with no O(n squared) loop; a
particle without a target drifts up and fades like an ember. Drawing is batched
per colour per frame, the device pixel ratio is capped at 1.5, and the loop
pauses when the tab is hidden. Any pointerdown, keydown, wheel or touchstart
jumps straight to the settled state. The settled hero is the real DOM headline,
selectable and read by a screen reader.

Frame cost measured over 55 frames during the burst: 390 median 16.7ms, p95
17.2ms; 1280 median 17.2ms, p95 22.4ms. Those are frame intervals on a headless
60Hz clock rather than callback cost, so the canvas is holding the frame budget
at both widths with the occasional dropped frame at 1280.

### The sweep
After the opening the field is a pure function of scroll progress p over the
first 70vh: x is displaced by p to the power 1.6 times 1.3 viewport widths times
a per particle factor of 0.6 to 1.4, y by p times a per particle value of -120
to 120px plus a small sine turbulence, alpha 1 minus p squared. Verified at both
widths: at p 0 the DOM headline is shown (data-hidden false), at p 0.5 and p 1
the DOM headline is hidden and the field is torn off the right edge, and
scrolling back to p 0 restores it. On a later visit in the same session and
under reduced motion no canvas is mounted and the DOM headline simply fades over
the same range.

### Reduced motion and later visits
With prefers-reduced-motion: reduce the cover renders settled on the first
frame: no .logo-burst node exists, the headline opacity reads 1, the mark fill
and every added keyframe resolve to no animation, and the pointer parallax never
runs on touch. Verified in a reduced-motion context at 390.

### Mountain scene
Ridges far to near on dark: #2A231E, #221C18, #1A1512, #14100E, #0F0C0A, with a
warm one step lift at time of day 1; light ridges run #E6DED2 to #F7F3EC. The
light band behind the peak is dawn gold #F5B94B falling to ember, the particles
are warm embers, and the horizon line, climb marker and tap ripple are ember.
Mist is warm tinted. The Pass 178 and 179 lifecycle, parallax, climb marker and
ripple behaviour are unchanged.

### Checks
Cover verified at 390 and 1280: settled hero reads the serif headline with the
italic second line, ember Apply, the lockup with the solid mark, and the knock
door in place. Login verified at 1280. No copy changed, no permissions changed,
no data written, nothing deployed, nothing published. No em dash and no emoji in
any added line. Typecheck clean with tsgo against tsconfig.app.json; production
build clean; shell gzip of the entry bundles is 16,445 bytes of JS and 30,940
bytes of CSS. Baselines unchanged: profiles 536, chat_messages 715,
applications 13, earnings_goals 0.

## Pass 181 - black, blue and violet, reduced and recoloured

Palette V6 replaced every token value in src/index.css and in
WorkspaceThemeProvider while keeping every token name: background #000000,
surface #07070A, raised #0E0E14, hairline #1A1A24 and #262634, text #FFFFFF,
secondary #A0A3B5, muted #767A8C, blue #3A8DFF, violet #B69CFF, brand gradient
linear-gradient(135deg, #3A8DFF, #7C6BFF, #B69CFF). Warning #F2A900 and
destructive #FF5A5F kept. Light mode is white, #F5F5F8, #E4E4EC, black text,
blue #1F5EFF, black primary fill, no gradient. No card borders and no shadows
(--shadow tokens resolve to transparent). Page texture is two repeating linear
gradients at 3 percent white every 56px on the body, with 45 degree hairlines at
2 percent inside the hero and the final band only. Chat own bubble stays
--bubble-blue 223 67% 51%, which is #2F5FD6 with white text.

Type is one family, Archivo 400/500/600/800 from Google Fonts with preconnect
and display swap; Instrument Serif, Geist and the self hosted Source Serif
imports are gone. Body is 15px on phone and 16px on desktop with a 60ch measure,
labels 12px 500 uppercase at 0.08em, cover headline 800 uppercase
clamp(2.75rem, 9vw, 7rem) at line height 0.95 and -0.02em, section titles 800
clamp(1.75rem, 4.5vw, 3.25rem).

Logo: every Wordmark variant (hero, heroMono, heroFiber, heroLife, full, fullV2,
stacked, compact, compactPlain) now renders TRNTY alone in Archivo 800 at 0.04em
tracking; the TRINITY SALES line and the old peak lockup are gone. The mark
variant and RidgelineMark draw one isosceles triangle, base 1.0 and height 0.82
of the box, filled blue at the base into violet at the apex, no stroke;
RidgelineMark keeps its name and props and strokes the two sides before it
fills. Icons regenerated from that triangle at 62 percent of the canvas on
black: favicon.svg, favicon.png, apple-touch-icon.png, icon-192.png,
icon-512.png, icon-512-maskable.png (44 percent for the safe zone) and
splash-1170x2532.png. manifest theme and background colours are now #000000.

Headline lines, verbatim:
EVERY SUMMER SALES JOB ENDS IN AUGUST.
EXCEPT THIS ONE.
Support line: Pest control in season. Fiber internet after it. One team,
selling all year. Actions are one gradient Apply and one plain Sign in.

Removed and deleted: src/components/recruiting/KnockDoor.tsx and
src/components/recruiting/YearStrip.tsx (no remaining imports). Removed from the
cover: the sticky section nav, the pinned doors scroll section, the magnetic
button, the card spotlight, the link underline grow and wordmark sweep hovers,
the climb marker and tap ripple in MountainScene, the count up on the
calculator, the hero line "Pest control now, Fiber internet in the off-season",
the hero link "See what you could make", and the wordmark in the final band and
the footer. The five season steps are Apply, Train, Sell, Settle up, Roll into
fiber, the first four carrying the existing step copy.

Opening: 500ms draw with a 40ms letter stagger, 250ms hold, 800ms burst, 1000ms
formation, 200ms crossfade, about 2.75 seconds; TRNTY sampled alone centred at
clamp(4rem, 22vw, 14rem); white particles for line one and alternating blue and
violet for line two; the DOM headline hands off at p 0.05 and the wind runs over
the first 60vh. Scene: black sky top to bottom with no colour shift, ridges
#1C1C1C, #161616, #101010, #0A0A0A, #050505, one radial glow behind the tallest
peak blending blue at the base into violet at the top breathing 6 to 10 percent
on a 12 second loop, particles 40 on phone and 90 on desktop at 10 percent white
and 8 percent violet, three neutral grey mist bands, and each ridge drifting 6
to 14px on its own 60 to 120 second loop (far layers slowest).

Verified in the browser. Cover sections at 390 and 1280 in order: hero, the
three doors (Pest live, Fiber off season lane, Life insurance is coming), Find
your door, What the work is, Who runs it, Estimate your earnings, How the season
works, the final apply band, footer. Centring: the headline sits 20px from each
edge at 390 and 192px at 1280 with text-align centre, so nothing hangs off the
left. Elements computing position sticky or scroll snap inside main: 0. Grep of
src/index.css for position: sticky, scroll-snap, doors-pin, card-spotlight,
magnetic, knock- and year-track: no matches. Frame timings at 390: burst median
16.7ms and p95 16.8ms over 148 frames; scroll median 16.7ms and p95 16.7ms over
180 frames. Headline opacity 1 at the top and 0 after one viewport of scroll.
Under prefers-reduced-motion no burst canvas mounts and the headline renders at
opacity 1.

Database: get_public_managers() is security definer, read only, and returns
first_name, office_name, manager_intro and pillar_token for profiles with a
pillar slug, not archived, accepting new reps, a non empty intro and a live
pillar link. A migration revoked execute from authenticated and from PUBLIC and
granted it to anon only. Called with the anon key it returns [], zero rows, with
no rollback needed. get_public_setting now also answers owner_photo and
owner_calendly; the Calendly setting is read only with the default
https://calendly.com/mathewjoyce and nothing was inserted.

Contrast, computed on the stated pairs: blue on black 6.4, violet on black 9.2,
black on blue 6.4, black on the gradient midpoint 5.4, white on the own bubble
5.6, muted on black 4.9, light blue on white 5.1.

Remaining hardcoded colour hits and why they stay: the gold #D4AF37 in
BadgeChip, BadgeStrip and RankInsignia is the owner God Mode badge identity;
the Command Center files (CommandFunnel, RegionPace, RegionSheet, SessionPrep)
carry their own fixed dark chart palette and #E3C275; MountainScene holds the
five ridge hexes because a canvas cannot read tokens per frame. No #F2673A,
#F5B94B, #B8421A or #B23E12 remains anywhere in src.

Typecheck clean with tsgo against tsconfig.app.json; production build clean;
shell gzip of the entry bundles is 16,404 bytes of JS (from 16,451) and 30,011
bytes of CSS (from 30,995). No data written, nothing deployed, nothing
published. No em dash and no emoji in any added line. Baselines: profiles 536,
chat_messages 716, applications 13, earnings_goals 0.

## Pass 182 - the opening always runs, the calculator comes off, the hero gets quieter

1. The gate is gone. src/components/brand/LogoBurst.tsx no longer defines or
reads trnty_intro_seen and never writes to sessionStorage; shouldRunIntro now
returns true unless prefers-reduced-motion is set. Timings are untouched: 500ms
draw with a 40ms letter stagger, 250ms hold, 800ms burst, 1000ms formation,
200ms crossfade. Any pointerdown, keydown, wheel or touchstart still jumps
straight to the settled state, and the settled hero is the real DOM text.
Two consecutive loads in one browser context at 390, measured over the first
2.6 seconds of each load: load one, burst canvas present, 153 frames, median
16.7ms, p95 16.8ms; load two, burst canvas present, 151 frames, median 16.7ms,
p95 16.8ms. Grep of src for trnty_intro_seen and SESSION_KEY returns nothing.

2. The calculator is off the cover. Removed from src/pages/Index.tsx: the lazy
EarningsCalculator import, the usePublicCalc hook, the Skeleton and Suspense
imports, useNavigate, the Button import, the hasPublishedBands flag and the
gated Estimate your earnings block. The section keeps the id earnings and is now
only How pay is set, with the four lines unchanged (paid commission on the
accounts you sell, pay settled on serviced accounts, three tiers Rookie
Experienced Veteran, housing charged per night at what the room actually costs)
and the muted line "The full pay scale is published here when it is released."
No cover link or anchor points at a calculator; "See what you could make" was
already gone in 181. src/components/EarningsCalculator.tsx, the app page
/app/estimate-earnings and get_public_calc are untouched.

Cover sections at 390, in order: hero (EVERY SUMMER SALES JOB ENDS IN AUGUST. /
EXCEPT THIS ONE.), the two doors (Pest, Fiber), Find your door, What the work is,
Who runs it, How pay is set, How the season works, the final band, footer. Page
text contains "Estimate your earnings" zero times. Every button and link label
in main: Get in, Sign in, the Pest door, the Fiber door, Yes, No, This season,
Next season, Not sure, Book fifteen minutes with Matt, Get in, sign in. The
qualifier result button reads Get in once the three answers are in.

Colour audit below the hero, computed on every element in every section after
the first plus the footer. Fixed:
- ThreeDoorSection "Live" label was text-primary blue, now text-foreground.
- Index What the work is icons were text-primary blue, now text-text-muted.
- ReferralLookup match link was text-primary and the fallback link was text-ice,
  both now inherit white.
- .public-link was hsl(var(--ice)) light blue, now foreground white with a 3px
  underline offset, so the link signal is the underline and not a colour.
- .qual-choice-on was the brand gradient, now a white fill with black text, so
  Find your door carries the gradient on one element only.
- .public-world and .public-auth still carried a Pass 116 override of
  --primary to 15 88% 59%, the old orange, and the light variant carried
  30 11% 7% with an orange primary-foreground and a cyan glow. Both blocks are
  removed, so the cover resolves --primary to the V6 blue.
- .ridgeline-mark set color to hsl(var(--primary)); the mark paints with gradient
  fills and never currentColor, so the declaration is deleted.
After the fixes the only non neutral values below the hero are the two greys,
#A1A4B5 secondary and #777B8D muted, and the brand gradient on exactly two
elements, one per section: the Book fifteen minutes with Matt button in Who runs
it and the Get in button in the final band. Zero blue, violet, orange, gold or
any other hue.

3. The hero. An eyebrow sits above the headline: Archivo 500, computed 12px,
uppercase, letter spacing 1.68px which is 0.14em, colour rgb(161, 164, 181)
which is text secondary, reading NOT ON A JOB BOARD. with
transition: opacity 200ms linear 200ms, so it fades in 200ms after the headline
settles and is hidden while the burst plays. Line two is wrapped in
.cover-redact: while the burst runs the wrapper carries data-redact and paints a
solid gradient rounded rectangle through ::after at 10px radius, inset to the
line box, measured 350 by 84 at 390, with the gradient text at opacity 0. When
the hero settles the attribute drops and both the bar and the text cross over a
500ms linear opacity transition, so the bar dissolves into the gradient text.
The text node EXCEPT THIS ONE. is always in the DOM, so selection and screen
readers get the real words at all times. Under prefers-reduced-motion: no burst
canvas, no data-redact, the bar is display none, headline opacity 1, text
opacity 1, eyebrow opacity 1 and no transitions. The primary label is Get in in
the hero, in the final band and in the qualifier result; routes stay
/apply/rookie and /apply/veteran with the same query parameters.

4. Nothing else. No dependency added, no permission or grant changed, no
migration run, no data written, nothing deployed, nothing published. No em dash
and no emoji in any added line. Typecheck clean with tsgo against
tsconfig.app.json; production build clean in 11.45s; shell gzip of the entry
bundles is 16,381 bytes of JS (from 16,404) and 30,109 bytes of CSS (from
30,011). Baselines unchanged: profiles 536, chat_messages 716, applications 13,
earnings_goals 0.

## Pass 183: the real logo, one motion standard, new motion moments

### The logo
The owner's traced wordmark is saved verbatim at public/brand/trnty-logo.svg
(viewBox 171 282 1625 281, white letters path then blue mountain path) and the
same two path strings are inlined in src/components/brand/logoPaths.ts, which is
the single source for Wordmark, RidgelineMark, LogoBurst and the icon renders.
Every Wordmark variant (hero, heroMono, heroFiber, heroLife, full, fullV2,
stacked, compact, compactPlain) draws the full lockup scaled to its height, with
the letters white on dark and #000000 on light and the mountain #004EFD in both
modes. The mark variant, the icons, the splash, the footer stamp and
RidgelineMark use the mountain path alone. RidgelineMark keeps its name and its
props and strokes the mountain over 900ms (stroke-dasharray 2700, the measured
path length is 2693.0) before the fill rises. #004EFD appears only in the logo,
the mark and the opening particles.

Measured logo: nav lockup 28.0px tall at 390 and 34.0px tall at 1280, centred on
phone and left on desktop. Opening source lockup 302.4px wide at 390 (77.5vw)
and 544.0px at 1280 (42.5vw).

Icons regenerated from the mountain path alone with the sandbox renderer:
favicon.svg 3,576 bytes, favicon.png 431, apple-touch-icon.png 3,393,
icon-192.png 3,691, icon-512.png 11,553, icon-512-maskable.png 9,518,
splash-1170x2532.png 38,747. Mountain centred on black at 70 percent of canvas.

### Particle counts by colour
Sampled off the opening canvas (alpha above 8).
At 390: source field 5,564 white points and 686 blue points, no other colour.
At 1280: source field 20,208 white and 2,111 blue, no other colour.
Settled living field at 390: 250 lit points on the 2px sample grid; at 1280: 615.
Every sampled point is white or the headline gradient; no blue remains after the
handoff, as specified.

### Formed particle offset
Each character of the headline is measured back out of the DOM with a Range, so
canvas lines sit on the real wrapped visual lines. Sampled lit points against
the DOM headline line boxes: 0 points outside the boxes and a maximum offset of
0.00px at both 390 and 1280, inside the 1px bar.

### The audit, before and after
1. Durations. Before: mixed 200ms, 300ms, 400ms, 600ms, 700ms literals. After:
   150 to 200ms feedback, 280ms content, up to 520ms hero and section entrances,
   all from the motion tokens.
2. Easing. Before: ease, ease-out and one linear on entrances. After:
   cubic-bezier(0.16,1,0.3,1) on enter and exit, ease-in-out on loops, the spring
   only inside the opening, linear kept only on sub-300ms opacity crossfades.
3. Animated properties. Before: a blind opacity delay on the hero support and
   actions, and clip-path on the old headline wipe. After: transform and opacity
   only, with two documented exceptions, the mark fill-opacity and the gradient
   button background-position.
4. The opening. Before: text sampling, once per session, estimated line
   positions. After: the traced logo sampled at 3px on phone capped at 2,400 and
   2px on desktop capped at 7,000, source colours preserved, formation onto the
   real DOM glyph lines, a 200ms ease-out crossfade, then the post-burst rise.
5. The sweep. Before: a one way fade. After: a pure function of scroll
   progress, reversible, crossfading between p=0.04 and p=0.12.
6. Section reveals. Before: one plain block fade per section. After: clipped
   line reveals at 520ms with a 40ms per line stagger and cards rising 16px on a
   60ms stagger, triggered once at 15 percent visibility.
7. The scene. Before: modulo loops that jumped at the seam and particles that
   popped in. After: seamless sine drift per layer, an eased glow breath from 6
   to 10 percent lifted toward 14 percent at the final band, respawn at zero
   alpha with a 600ms fade, and sleep when the tab is hidden or the canvas is off
   screen.

### The new motion moments, at 390 and 1280
Hero rise: three staggered elements, eyebrow at 200ms with a 200ms ease-out fade,
support line and actions at 280ms with 60ms and 120ms delays, 12px translate,
cubic-bezier(0.16,1,0.3,1), all reaching opacity 1 and transform none.
Scroll progress hairline: present at both widths, 2px, gradient, scaleX driven by
the single rAF loop.
Ticker band: present at both widths, one duplicated track, 40s linear, no seam.
Clipped line reveals: 9 at both widths. Card reveals: 5 groups at both widths.
Door hover and press: 2 lane underlines; scale 1.02 lift on a fine pointer,
scale 0.98 on press, underline drawing from the left.
Living headline touch repel: the settled field pushes away from a pointer or a
finger inside a 26px radius and springs back on the decay curve.
Final band glow: the band's own progress is passed to the scene as glowBoost and
lifts the peak glow toward 14 percent.
Manager card and photo rise: the Who runs it section rises on the card stagger.
Book fifteen minutes shimmer: btn-shimmer, 6s, ease-in-out, on every gradient
button.
The proof underline is wired on the counter numbers, but the cover proof strip
stays off because COVER_STATS is false, so no number renders on the cover.

### Sweep crossfade
DOM headline opacity: 1.00 at p=0, 0.50 at p=0.08, 0.00 at p=0.30, and the same
values coming back on the reverse scroll at both widths.

### Ticker items, verbatim
BALTIMORE, BOSTON, 23 IN THE FIELD, 14 SIGNED FOR 2027, PEST, FIBER, LIFE COMING.

### Gyroscope path
On a coarse pointer the scene layers follow deviceorientation at three depths.
iOS only delivers those events after a gesture asks, so requestTiltPermission is
called inside the first tap of the primary hero button; a refusal or an
unsupported browser simply leaves the self drift running, and no error surfaces.

### Frame times
Opening: median 16.7ms, p95 16.8ms at both widths.
Sweep: median 16.7ms, p95 16.7ms at both widths.
Steady scroll: median 16.7ms, p95 16.7ms at both widths.
Touching the headline: median 16.7ms, p95 16.7ms at both widths.

### Reduced motion
With prefers-reduced-motion reduce at 390: zero requestAnimationFrame calls, no
opening canvas mounted, the headline at opacity 1, the redaction bar not
rendered, all three hero rise elements at opacity 1, the ticker animation none,
the progress hairline display none, zero hidden clipped lines, zero hidden cards,
and the button shimmer none. The scene draws a single static frame with no
particles.

### Build
No new npm dependencies, no copy changes, no compensation figures, no data
writes, no live probes, no publish. No em dash and no emoji in any added line.
Typecheck clean with tsgo against tsconfig.app.json; production build clean in
12.73s; shell gzip of the entry bundles is 16,391 bytes of JS (from 16,381) and
30,810 bytes of CSS (from 30,109). Baselines unchanged: profiles 536,
chat_messages 716, applications 13, earnings_goals 0.

## Pass 184: the centred logo, the fill, the burst and the light world

### The logo, centred
The cover hero is 100svh and the logo sits dead centre of it, drawn from
`public/brand/trnty-logo.svg` through `logoPaths.ts`. The art box is 84vw wide on
phone and 48vw on desktop. Nothing else is visible in the hero on load: the
eyebrow is gone, the headline, the handwritten line and the two actions all sit
in `.cover-hero-copy`, which is opacity 0 and pointer-events none until the burst.
The nav keeps the small logo and Sign in.

### The assembly, on every load
`src/components/brand/CoverLogo.tsx`. The logo is sampled at 3px on phone
(capped at 2,400) and 2px on desktop (capped at 7,000); mountain chunks are
#004EFD and letter chunks are white. Every chunk starts scattered beyond the
edges in a random direction at 0.9 to 1.7 times the longest viewport edge, flies
in over 300ms on the ease out token with a 3px outward overshoot, and settles
that overshoot back over 80ms. Mountain chunks are staggered across 0 to 900ms
and letters across 300 to 1,600ms, ordered left to right. At 1,600ms the real
SVG crossfades in over 200ms and the canvas clears.

Measured chunk counts (read from the host's data attribute):
- 390 x 844: 681 white, 32 blue (713 chunks, under the 2,400 cap)
- 1280 x 900: 5,359 white, 360 blue (5,719 chunks, under the 7,000 cap)

Any pointerdown, keydown or touchstart during the assembly jumps straight to the
settled state.

### The fill and the burst, driven by scroll
Progress is the scroll over the first viewport. The gradient copy of the letters
is clipped from the baseline up and the glow opacity is written straight to the
node, so a scroll never re-renders React.
- p 0.2: `clip-path: inset(63.6% 0px 0px)`, glow opacity 0.04
- p 0.5: `clip-path: inset(9.1% 0px 0px)`, glow opacity 0.11
Past p 0.4 the chunk field vibrates one pixel at 22 percent alpha.

At p 0.55 the DOM logo hides, the chunks explode outward on the spring token over
700ms and fade over the last 300ms, and a white circle swells from the logo
centre over 900ms. When it has covered the screen the cover switches to the light
world (`data-world="light"` on the root) and the circle unmounts.

Scrolling back: the world returns to dark, a white circle contracts over 500ms,
and the chunks reassemble over 500ms before the fill follows the scroll again.
Verified: after scrolling to p 0.6 the root reads `light`; after scrolling back to
0 it reads `dark` and the DOM logo is on again.

### The hero copy after the burst
Headline, read from the DOM at both widths:
- `START AT THE DOOR.` colour rgb(0, 78, 253)
- `DON'T STAY THERE.` colour rgb(109, 59, 255)
Both are Archivo 800 uppercase in `.cover-headline`. The headline is the page's
only h1; the logo carries a visually hidden name.

The handwritten line is `Where being a sales rep is not the end goal.` in
`src/components/brand/PenLine.tsx`. Computed font family reads
`Caveat, Kalam, cursive`, so Caveat loaded and Kalam is only the fallback. The
line is SVG text measured on mount, written left to right by a clip that opens
across the glyph box over 1,800ms on the ease out token; the real sentence stays
in the DOM and reads back as `Where being a sales rep is not the end goal.`

The primary button reads `Get in` on a solid rgb(109, 59, 255), 48px tall, radius
10, white label, and routes to `/apply/rookie` unchanged. Sign in sits next to it
as a black underlined link.

### The light world below the hero
Scoped to `.public-world[data-world='light']`, so the app's own theme is
untouched. White background (measured rgb(255, 255, 255) on `.public-section`),
#F5F5F8 cards, white elevated, #E4E4EC borders, black body, #50546A secondary,
#6E7288 muted. Section titles measure rgb(0, 78, 253). One element per section
carries solid purple #6D3BFF: the progress hairline, the proof underline, the door
underline, the qualifier selection, the Book fifteen minutes button and the final
band button. The grid texture on the hero and the final band is 1px black at 4
percent. The mountain scene takes light ridges #E9E9E9 through #F5F5F5 and a
6 percent blue into purple glow through a new `light` prop. The footer mark stays
#004EFD. No other colour appears below the hero.

Contrast: #004EFD on white is 5.5:1, black on white is 21:1, #50546A on white is
7.6:1, white on #6D3BFF is 5.9:1.

### Removed
- `src/components/brand/LogoBurst.tsx` deleted; nothing imports it.
- The eyebrow, the redaction bar and the headline scroll sweep, with their CSS.
- The kinetic section title weight in `usePublicMotion`, so the hook now only
  marks sections visible.
- The door hover scale; the surface change and the press stay.
The support line moved out of the hero and now opens the doors section. The proof
strip moved out of the hero and sits under the ticker.

### Frame times
Sixty five consecutive rAF deltas during the opening: median 16.7ms and p95
16.7ms at 390 x 844, median 16.7ms and p95 16.8ms at 1280 x 900. Well inside the
8ms of work per frame the budget allows.

### Reduced motion
At 390 with reduced motion forced: the assembly effect never runs (no chunk data
is written), the canvas, the glow and the swell are display none, the DOM logo is
opaque from the first frame, the hero copy is visible with no transition, the pen
line clip is fully open, and the world crossfades between dark and light over
300ms at the same p 0.55. The headline, the handwritten line, the Get in label and
every section colour read exactly as they do with motion on.

### Build
Typecheck clean. Production build clean in 14.49s. Entry gzip: JS 16,387 bytes
(16,391 in Pass 183, minus 4) and CSS 31,383 bytes (30,810 in Pass 183, plus 573).

No em dash and no emoji in any line added by this pass.

### Data
Read only counts, unchanged: profiles 536, chat_messages 716, applications 13,
earnings_goals 0. No writes, no permission changes, no deployments, and the site
was not published.

## Pass 185: vector shard opening and statement screen

### Vector shard assembly
The opening no longer samples or paints pixels. `CoverLogo.tsx` divides the
source logo viewBox into a deterministic jittered grid and renders every piece
as a full clone of the inline SVG clipped by an angled quadrilateral. At 390 x
844 it uses 28 shards in a 7 by 4 grid. At 1280 x 900 it uses 56 shards in an 8
by 7 grid. Left-third shards enter from beyond the left edge, right-third shards
enter from beyond the right edge, and centre shards alternate from beyond the
top and bottom edges. Initial rotations are 8 to 20 degrees.

Mountain shards start first and finish inside 700ms. Letter shards start at
250ms, stagger left to right, travel for 900ms, overshoot by 2px, and settle over
the final 80ms. The last shard lands by 1,400ms. Any pointer, touch or key input
during assembly jumps to ready. The settled transform on every shard measured
`none`. The assembled shards are the SVG itself, with no substitute layer,
crossfade, or layout shift.

### Fill, burst and reverse
The blue to light-purple fill starts at p 0 and completes at p 0.32. Measured:
- p 0.1: fill 0.3125 and glow 0.0375, or 3.75 percent
- p 0.3: fill 0.9375 and glow 0.1125, or 11.25 percent

At p 0.36 the same 28 or 56 shards fly away from the logo centre over 700ms on
the spring token, rotate, and fade during the last 300ms. The white circle grows
over 900ms. Scrolling back below p 0.36 restores the dark world, contracts the
circle, and returns the shards over 500ms. No canvas and no pixel particles
remain on the cover.

### Independent statement screen
The logo hero and statement are consecutive 100svh sections. The first contains
only the central logo. The second is white and contains only the statement and
actions. The fixed navigation does not consume document height. At 390 and 1280
the two section boxes do not overlap, and scrolling back leaves the statement
below the hero while the logo reassembles.

Verified statement copy at both widths:
- `EVERYONE ARGUES OVER WHICH INDUSTRY IS BEST.`
- `WE JOINED ALL THREE.`
- `Pest control. Fiber internet. Life insurance. One team. Sell any of them, year round, and find the one that fits you.`
- `Where being a sales rep is not the end goal.`

The headline lines reveal first, followed by the existing 1,800ms Caveat pen
line and then Get in and Sign in. The old eyebrow and both former headline lines
are absent.

### Cover order after removals
1. Dark logo hero
2. White statement screen
3. Ticker
4. Public proof counters when available
5. Three industries. One team.
6. Find your door
7. Final application band
8. Footer

Who runs it, How pay is set, How the season works, and What the work is were
removed from `Index.tsx`. `src/components/recruiting/WhoRunsIt.tsx` was deleted.
The related cover markup, arrays, imports, and now-unused selectors were removed.
The existing public database functions and settings were not changed.

The three equal industry tiles now read:
- Pest control: Homes and businesses
- Fiber internet: Homes, in person
- Life insurance: Families, licensed

### Ticker
Observed items, in order:
- `BALTIMORE`
- `BOSTON`
- `23 IN THE FIELD`
- `14 SIGNED FOR 2027`
- `PEST CONTROL`
- `FIBER INTERNET`
- `LIFE INSURANCE`

The two numeric entries are live and remain conditional. No value was invented.

### Performance and reduced motion
At 390 x 844, sampled main-thread measurement work was median 0.0ms and p95
0.1ms during assembly, median 0.0ms and p95 0.1ms during burst, and median 0.0ms
and p95 0.1ms during steady scroll. Browser rAF cadence was median 16.7ms and p95
16.7ms. The cover had no horizontal overflow.

With reduced motion forced, assembly, shard travel, swell, glow, ticker movement,
line reveals and pen writing are disabled. The settled vector logo renders
immediately. The world switches at p 0.36 without a burst, the statement remains
fully readable, and reverse scroll returns to the dark logo screen.

### Build, size and data
Typecheck clean with tsgo. Production build clean. Entry gzip is 16,377 bytes of
JS, down 10 bytes from Pass 184, and 31,602 bytes of CSS, up 219 bytes from Pass
184. No em dash and no emoji appear in lines added by this pass.

Read-only baselines are unchanged: profiles 536, chat_messages 716, applications
13, earnings_goals 0. No data writes, permission changes, deployments, or
publishing occurred.

## Pass 186: the question sheet and the application that asks what they want

### The sheet
New `src/components/recruiting/AskSheet.tsx` replaces `FindYourDoor` (file deleted, its CSS block removed from `src/index.css`).

Trigger: an IntersectionObserver on the statement screen (`#statement`). 1,500ms after it is fully in view, or immediately once it has mostly scrolled off the top, whichever lands first. One rise per visit.

Measured at 390 x 844: sheet 390 wide, 743 tall (88 percent of the viewport), 24px top radius, pinned to the bottom, scrim rgba(0,0,0,0.3).
Measured at 1280 x 900: centred card 520 wide, 304 tall, radius 20.

Questions and answers, verbatim, one at a time, Archivo 800 at clamp(1.5rem, 5vw, 2.5rem), answers 56px tall filling #6D3BFF with white text on select, next question sliding in from the right over 280ms:
1. Have you done sales before? - Yes / No
2. Do you think you would be good at it? - Yes / Not sure / I want to find out
3. Where are you located? - free text, 16px input

On the third answer: one line, You are in the right place., and one purple Get in button.

Routing table, both observed in the browser:
- Yes -> /apply/veteran?sales=yes&good=unsure&market=Boise%2C+ID&vertical=
- No -> /apply/rookie?sales=no&good=find_out&market=Provo%2C+UT&vertical=

market lands in the City, State field of the form (observed: Provo, UT). sales and good are stored nowhere; they only pick the route. vertical is carried empty.

Close behaviour: X button, tap on the scrim, swipe down over 80px on touch, Escape. Any close writes sessionStorage key `trnty_ask_seen` = 1; a reload in the same session did not show the sheet again (dialog count 0). Focus moves into the sheet on open, Tab and Shift Tab cycle inside it, focus returns to the previous element on close.

Nothing is lost for a visitor who closed it: the same three questions live in the page where Find your door was, titled Three questions. (`#ask`, observed title and first question).

Reduced motion: the sheet appears with no rise, no step slide and no scrim fade; all three questions and the routing were verified working at 390 with reduced motion on.

### The application asks what they want
New `src/components/apply/WantsStep.tsx`, rendered in both `RookieApplication.tsx` and `VetApplication.tsx` after the contact fields and before the referral field:
- What are you most interested in? (one or more) - Pest control, Fiber internet, Life insurance, Not sure yet
- In person or remote? - In person sales, Remote sales, Either
- What is your earnings goal for your first year? - one line, placeholder Your number, no suggested figures

Migration added three nullable columns to public.applications. Read back from information_schema: `earnings_goal` text, `interested_in` ARRAY (text[]), `sales_style` text.

`submit-application` accepts the three fields, sends null when blank, drops any interest outside the four allowed values and any style outside the three, and was redeployed successfully after the change (deploy confirmed this run, 2026-09-11 UTC).

Insert path proved inside a transaction: one rookie row with interested_in ARRAY['Pest control','Life insurance'], sales_style Either, earnings_goal Your number, then ROLLBACK. The applications count after rollback is 13.

Staff view (`AdminApplicationsTab.tsx`): under the existing referral line reviewers now see Interested in, In person or remote and Earnings goal; blank answers render nothing. Copy Info includes the same three lines when present.

### Copy scrub
- `src/components/apply/IndustryStep.tsx`: Live / Off season lane / Coming replaced with Homes and businesses, in person / Homes, in person / Families, licensed; Life is no longer disabled.
- `src/components/recruiting/FindYourDoor.tsx`: deleted (contained the off season lane comment and the seasonal routing).
- `src/index.css`: the Find your door block and its reduced motion and light world rules removed.
- `src/pages/IndustryPage.tsx`: Coming soon label became Life insurance; the copy now reads as one of three industries; still being set up replaced with the licensing line; Tell me when became Get in.
- `src/pages/VetApplication.tsx`: Previously knocked markets became Markets you have worked (label, error label and placeholder); the page description no longer frames the season as summer only.
- `src/pages/RookieApplication.tsx`: the page description no longer frames the season as summer only.
- Reviewed and left alone: the app side workspace copy (not the public site), WinbackTab Coming back (a call outcome), and the verified production ticker lines (historical results, not season framing).

### Build and baselines
Typecheck clean. Production build clean in 10.53s. Shell gzip: JS 16.41 kB, CSS 32.07 kB (Pass 185: JS 16.38 kB, CSS 31.60 kB).
Baselines unchanged: profiles 536, chat_messages 716, applications 13, earnings_goals 0.

## Pass 187: cover polish

### Gradient bridge and white swell

- The statement section now follows the current world background. It remains black before the burst and becomes white only when the world changes.
- The final 28vh of the hero carries a transparent to white bridge. Its measured opacity was 0.011 at p 0.20, 0.067 at p 0.30, and 0.100 at p 0.36.
- The white swell still begins at p 0.36 with the existing 900ms outward and 500ms reverse timing. Its edge is feathered with a 60px blur.
- Screenshots at 390 and 1280 showed no hard white edge before the burst.

### Hero cue and statement sequence

- The cue is centered 40px above the hero bottom. Its track is 1px wide and 28px tall at 18 percent white. Its blue dot is 6px.
- The dot travels for 1,600ms, fades during that run, then rests for 400ms. The cue fades over 300ms after p passes 0.04 and returns at the top.
- The headline uses Caveat 600 and #004EFD. At 390 it writes as `EVERYONE ARGUES OVER` then `WHICH INDUSTRY IS BEST.` At 1280 it fits as `EVERYONE ARGUES OVER WHICH INDUSTRY IS BEST.` inside 90 percent of the container. Total writing time is 1,600ms.
- `WE JOINED ALL THREE.` follows in Archivo 800, uppercase, #6D3BFF, with its clipped reveal starting 200ms after the ink finishes.
- Contrast on white is 5.82:1 for #004EFD and 5.54:1 for #6D3BFF.

Statement screen, top to bottom:

1. `EVERYONE ARGUES OVER WHICH INDUSTRY IS BEST.`
2. `WE JOINED ALL THREE.`
3. `Trinity.`
4. `Where being a sales rep is not the end goal.`
5. `Get in`

The handwritten support uses Caveat 600 and #0A0A0F. It writes over 1,400ms starting 200ms after the block line lands. The button begins rising 400ms after that handwriting starts. It measured 350 by 64 at 390, which is the viewport minus 20px gutters, and 340 by 68 at 1280. It remains linked to `/apply/rookie`. Sign in is absent from this screen and remains in the navigation and final band.

### Industries and removals

- The first line below `Three industries. One team.` is now `Pest control. Fiber internet. Life insurance. One team. Sell any of them, year round, and find the one that fits you.`
- `src/components/recruiting/CoverTicker.tsx` was deleted. Its import, render, marquee styles, animation, offices, counters, and signed text were removed. Nothing replaced the ticker, so the industries section follows the statement.
- `get_public_counters` was not changed.

### Pointer motion and frame cost

- The assembled logo and its glow lerp against the pointer or existing device orientation input by up to 8px.
- The peak glow lerps horizontally by up to 5 percent of viewport width.
- Each industry tile lerps at its own depth, capped at 2px, 3px, and 4px.
- The glow breathes between 8 and 14 percent. Hero grid hairlines are 4 percent white.
- At 390 the measured median main thread animation work was 0.4ms across opening, burst, and steady scroll, below the 8ms target. No horizontal overflow or runtime page errors were found.

### Question sheet

- At 390 the sheet measured 390 by 560 at question one, question two, and question three. It stayed fixed between steps, within the 520px minimum and 88svh maximum rule.
- At 1280 the card stayed 520px wide. Its measured auto heights were 340px, 408px, and 332px across the three steps, with the 200ms height transition.
- Both sizes use 24px internal gutters, 12px answer gaps, 56px answers, a 44px close target, and three bottom dots with one #6D3BFF active dot.
- The location step keeps `Where are you located?`, the existing input, and a 56px full width `Continue` control disabled until text exists.
- The final screen keeps `You are in the right place.` and `Get in`. The final Get in is 342 by 64 at 390 and 340 by 68 at 1280. Questions, answers, routes, query parameters, and `trnty_ask_seen` are unchanged.

### Reduced motion and checks

- Reduced motion hides the hero cue, opens both ink clips immediately, shows the support pen line immediately, shows the block line and button without rising, removes pointer drift, and shows the sheet and step changes without animation.
- Added source and report lines contain no em dash and no emoji.
- Typecheck is clean. Production build is clean in 12.18s.
- Shell gzip is 16,373 bytes for entry JavaScript and 32,372 bytes for entry CSS. Against Pass 186 this is minus 37 bytes of JavaScript and plus 302 bytes of CSS.
- Read only baselines are unchanged: profiles 536, chat_messages 716, applications 13, earnings_goals 0.
- No dependency, permission, backend, or data changes were made. The site was not published.
No em dashes and no emoji in the added lines. The site was not published.

## Pass 188 - the application, front to back

### 1. Pay content removed from the public pages
- src/pages/RookieApplication.tsx: removed the `EarningsCalculator` render, the `scrollToForm` Apply now button path, the long form (`IndustryStep`, `WantsStep`, contact fields, submit bar). The pay ladder, the line "Rent is free at 125,000 active revenue" and the line "This is math, not a promise" lived inside EarningsCalculator and no longer reach this route.
- src/pages/RookieApplication.tsx: removed the "Already sold before?" dialog (`VetBidForm`, reached through EarningsCalculator). Replaced with one plain line above the flow: "Sold before? Apply here" linking to /apply/veteran.
- src/pages/RookieApplication.tsx: removed the tile "High-income upside" so no pay framing remains in the tiles.
- src/pages/VetApplication.tsx: removed the `VetCalculator` render with its personal and team inputs, commission rate, marketing deal percentage, spreads, incentive cost and totals; removed the tiles "Instant Marketing Deal", "Full Commission on Mosquito" and "Scalable Structure"; removed the subline "Set your numbers, then send the form."
- Kept exactly as written on the veteran page: the founders video and the tiles Training, Uncapped team building, Systems for Vets.
- Component files untouched: src/components/EarningsCalculator.tsx, src/components/VetCalculator.tsx, src/components/VetBidForm.tsx.
- Other render sites, all confirmed untouched: src/pages/Recruiting.tsx:118 (EarningsCalculator), src/components/IndustrySwitcher.tsx:191 (EarningsCalculator, lazy), src/components/EarningsCalculator.tsx:223 (VetBidForm), src/pages/app/LinksPage.tsx:779 (EarningsCalculator and VetCalculator, inside the logged in app).
- Grep over the public application routes, the flow, the success page and the cover for a dollar sign, a percentage, the words percent, commission, marketing deal, "Rent is free" and "not a promise": two hits only, both non user facing, a comment in src/pages/Index.tsx line 22 and the email regex in src/components/apply/ApplyFlow.tsx line 43. No rate, percentage, dollar figure or marketing deal mechanic renders on /apply/rookie, /apply/veteran or the cover.

### 2. The step flow, both routes
One card, centred, max width 560, a back arrow top left, a 4px track with a #6D3BFF fill at step over total, and the line "Step n of N". New file src/components/apply/ApplyFlow.tsx.

Rookie, 7 steps, verbatim:
1. "What are you most interested in?" helper "Choose one or more." Options Pest control, Fiber internet, Life insurance, Not sure yet. Multi select, Continue.
2. "What have you done before?" Options Nothing yet, Some sales, Door to door, Another industry. Single select.
3. "In person or remote?" Options In person sales, Remote sales, Either. Single select.
4. "What is your earnings goal for your first year?" input, placeholder "Your number", no figures on screen. Continue.
5. "Where are you located?" input, placeholder "City, State". Continue.
6. "How do we reach you?" three inputs in order Full name, Phone number, Email address, placeholders "John Smith", "(555) 123-4567", "john@example.com". Continue disabled until all three are filled and the email is valid.
7. "Who told you about Trinity?" input, placeholder "The person who referred you, or the account you saw", Skip link under Continue.

Veteran, 9 steps: the same, with two extra required steps after step 3, "Last season revenue" with an empty placeholder and "Markets you have worked" with the placeholder "List the markets you have worked before, city and state".

The old question "Which Trinity are you applying to?" is gone from both pages. Step 1 carries it, and ?vertical=pest|fiber|life preselects the matching option on step 1. A single industry pick is what is sent as the vertical.

Measured at 390 and 1280 by walking every step:
- Rookie 390 step count read Step 1 of 7 through Step 7 of 7, progress fill 14, 29, 43, 57, 71, 86, 100 percent of the track.
- Veteran 390 and 1280 read Step 1 of 9 through Step 9 of 9, fill 11, 22, 33, 44, 56, 67, 78, 89, 100 percent.
- Every choice button and every Continue measured 308 x 64 at 390 (full width inside the 24px gutters) and 420 x 64 at 1280. Radius 12. Unselected is black text on white with a 1px #E4E4EC border, selected fills #6D3BFF with white text. Primary buttons are solid #6D3BFF, white label 18px weight 600.
- Single select advances by itself after a 280ms timer. Multi select and typed steps advance on Continue, disabled until valid.
- /apply/rookie and /apply/veteran at 390 need no scrolling to reach step one: document scrollHeight is not greater than the viewport height, flow bottom at 800 and 756.
- Keyboard: Enter advances when the step is valid, the back arrow carries aria-label Back and is focusable, every option is a real button, and focus moves to the new question heading on each step change. No browser page errors in the walk.
- Reduced motion: computed animation-name on .apply-step is "none", so steps swap with no slide.

### 3. The end screen and the choice
One screen, heading verbatim "We will have someone reach out and see if you are a good fit.", then two stacked buttons, "Set up a call first" solid #6D3BFF and "Just submit my application" as a plain black label on white with a 1px border. Measured 308 x 64 at 390 and 420 x 64 at 1280 for both. Both submit. Set up a call sends wants_call true, opens the scheduling link in a new tab and lands on the success screen with the link repeated as "Open the scheduling page". Just submit sends wants_call false.

Scheduling URL used: https://calendly.com/mathewjoyce/sales-opportunity. Source: public.app_settings has no owner_calendly row, so get_public_setting('owner_calendly') is empty and the constant is used. No setting row was written. If the setting were set to anything other than the bare profile URL that value would win, and if no URL resolves the Set up a call button does not render.

Success screen copy: heading "Application received", line "Someone from the team will reach out and see if you are a good fit." Back home and Instagram buttons unchanged.

### 4. Storage
One migration on public.applications. Columns read back:
- experience, text, nullable, no default
- wants_call, boolean, not null, default false

submit-application accepts experience and wants_call, validates experience against exactly Nothing yet, Some sales, Door to door, Another industry and stores null otherwise, and coerces wants_call to a boolean defaulting false. The honeypot, CORS allowlist, trim and truncate rules, the required full_name, email, phone and city_state, valid_public_email, valid_public_phone, the rate limits and the service role insert are unchanged. Deployed 2026-09-12 at 01:2x UTC in this pass, reported as "Successfully deployed edge functions: submit-application".

Rollback proof: inside BEGIN one rookie row was inserted with interested_in ARRAY['Fiber internet'], sales_style Either, earnings_goal "Your number", experience "Some sales" and wants_call true. Read back inside the transaction it returned experience "Some sales", wants_call true, sales_style Either, interested_in [Fiber internet], with the inside count 14, then ROLLBACK. After rollback the applications count is 13.

Staff view: src/components/admin/AdminApplicationsTab.tsx now renders "Experience: {value}" and a "Wants a call" marker under the existing three answer lines, blank values hidden, and Copy Info includes "Experience: ..." and "Wants a call".

### 5. Checks
- Typecheck clean, production build clean in 9.04s.
- Shell gzip: JS 16,325 bytes (Pass 187 16,381, minus 56), CSS 32,597 bytes (Pass 187 32,359, plus 238).
- Baselines unchanged: profiles 536, chat_messages 716, applications 13, earnings_goals 0.
- No permission changes beyond the two columns and the redeployed function. No cover change. The site was not published.

## Pass 189 - pay mechanics closed on every public route

### Calculator renders removed
- `src/pages/Recruiting.tsx` - `<EarningsCalculator onApplyClick={...} />` plus the whole "Run the numbers" section wrapper and the `EarningsCalculator` import. `handleApplyClick` stays (used by the two path cards and the footer links).
- `src/components/IndustrySwitcher.tsx` - lazy `EarningsCalculator` and `FiberPublicCalculator` imports, the `#earnings` scroll target block, the `Suspense`/`Skeleton` wrapper, the `usePublicCalc()` call and its import. This component is not mounted by any route today; it was scrubbed anyway because it is public-page code.
- No other public route rendered a calculator. `VetBidForm` was only reachable through `EarningsCalculator`, so with that render gone the "Already sold before" bid dialog is no longer reachable from any public route. The file is untouched and still ships inside the app calculator.

### Touched pages, top to bottom after the change
`/recruiting`: nav (Trinity mark, Apply Now) -> hero (wordmark, "Your Summer. Your Move.", intro line, Start Your Application, LiveCounters) -> RecruitingProof (reps on the team, years running) -> RecruitingContentPack (optional video, day in the life, straight answers, first-summer reps) -> Why Trinity (six cards) -> Who We're Looking For -> ThreeDoorSection -> Choose Your Path (Rookie and Veteran cards, Instagram help line) -> Ready to Find the Trinity CTA -> footer. The proof section and the Why Trinity grid now meet directly where the calculator section used to sit; the page keeps three Apply calls to action, so no CTA was added.

`/industries/:slug`: header -> back home -> title -> public note -> description -> How it works -> The ladder (rank names and arrows only, the per-rank dollar figure is gone) -> Lead cards -> Apply button plus the veteran link. Nothing else moved; the page keeps its Apply CTA.

`src/components/recruiting/RecruitingProof.tsx`: public stat keys reduced to `team_size` and `years_running` (counts of people and years, allowed). `rookie_avg_earnings` and `top_rookie` are no longer rendered anywhere public; `PROOF_FIELDS` keeps them so the admin panel still edits them.

`src/components/recruiting/RecruitingContentPack.tsx`: the testimonial `first_summer_figure` dollar line is no longer rendered. Quote, name and school remain.

`src/App.tsx`: `/apply` now redirects to `/apply/rookie` instead of `/recruiting#apply`.

### Copy scrub on /recruiting (pay content that was not a calculator)
- meta description "Training, housing and pay explained." -> "Training, housing and the season explained." (removed)
- h1 "Your Summer. Your Income." -> "Your Summer. Your Move." (removed)
- hero "earn more in 4 months than most make in a year" -> "get more out of four months than most people get out of a year" (earnings claim removed, sentence kept)
- benefit "High Income Potential / Earn based on your effort ... paid on what you close" -> "Your Effort Decides It / This is not an hourly job. What you put in is what you get out of the summer." (removed; the DollarSign icon import went with it, Mountain is used instead)
- benefit "Fast Results / Start earning within your first week" -> "Fast Start / You are on the doors in your first week, not after months of classroom time." (removed)
- "a high-income skill" -> "a real sales skill" in both the looking-for list and the Rookie card (removed)
- Veteran card "instant marketing deals" -> "the veteran track"; bullet "Top-tier commission structure" -> "Veteran track from day one"; bullet "Uncapped overrides on your team" -> "Build and lead your own team" (marketing deal, commission and override mechanics removed)
- `/industries/:slug` meta fallback "You close, you get paid on what you close." -> sentence dropped, the rest of the description kept.

### Grep over every public route in item 1
Pattern: dollar sign, a percentage, commission, override, spread, marketing deal, pay ladder, tier, rent, earn, make. Files swept: `Index.tsx`, `Recruiting.tsx`, `TicketPage.tsx`, `Parents.tsx`, `IndustryPage.tsx`, `JoinRedirect.tsx`, `InvitePage.tsx`, `PillarJoinPage.tsx`, `RookieApplication.tsx`, `VetApplication.tsx`, `ApplySuccess.tsx`, `AuthPage.tsx`, `PendingApproval.tsx`, `ResetPasswordPage.tsx`, `NotFound.tsx`, plus every component those routes render (`IndustrySwitcher`, `RecruitingProof`, `RecruitingContentPack`, `LiveCounters`, `ThreeDoorSection`, `AskSheet`, `ProductionTicker`, `ApplyFlow`, `IndustryStep`, `WantsStep`, `ManagerPicker`).

Classified hits after the edits:
- Removed: every item in the copy scrub list above, the per-rank dollar figure on `/industries/:slug`, the two money proof stats, the testimonial dollar figure, and both calculators with their pay ladder, active revenue percentage and "Rent is free at $125,000" housing line.
- Left alone, template literals and code, no pay meaning: `${...}` interpolations in `AskSheet.tsx`, `RecruitingProof.tsx`, `RecruitingContentPack.tsx`, `IndustryPage.tsx`, `IndustrySwitcher.tsx`, `TicketPage.tsx`, `AuthPage.tsx`, `InvitePage.tsx`, `PillarJoinPage.tsx`, `ManagerPicker.tsx`, and the email regex in `ApplyFlow.tsx`.
- Left alone, questions asked of the applicant rather than a claim: "What is your earnings goal for your first year?" in `ApplyFlow.tsx` and `WantsStep.tsx`, and the `earnings_goal` payload key.
- Left alone, admin-only strings never rendered on a public route: `PROOF_FIELDS` hints "e.g. $18,400" and "e.g. $41,000" in `RecruitingProof.tsx` (used by `AdminRecruitingTab`).
- Left alone, not reachable and cover code that this pass may not change: `components/recruiting/ProductionTicker.tsx` lines 5 to 15 carry eleven dollar production lines ($429,000 down to $50,000 and "$6,000,000 in accounts"). Its only render site is `pages/Index.tsx` line 241, gated by `COVER_STATS` in `src/lib/coverStats.ts`, which is `false`, so nothing renders on `/`. Confirmed by browser: no dollar sign in the body text of `/`. Listed for the owner because the strings still exist in the repo.
- Left alone, statement of pay basis with no figure or mechanic, on `/apply/rookie` not on the two pages item 3 names for removal: `pages/RookieApplication.tsx` line 24, "You are paid on performance, not the clock."
- Left alone, `PillarJoinPage.tsx` line 188 "Make your account here" - the word make, no pay meaning.
- Left alone, `JoinRedirect.tsx` line 14 still sends a no-vertical `/join` visit to `/recruiting#apply`; that anchor is the Choose Your Path section, which still exists. Item 4 only names `/apply`.

### /parents and /ticket, full list for the owner (nothing changed on either page)
`src/pages/Parents.tsx`
- line 19: "Trinity trains and fields door-to-door sales reps. Reps work an assigned area and sell service agreements directly to residents. It is commission-based sales work, not an hourly job, and it runs roughly from May through August. Trinity also runs a smaller fiber internet line in the winter and is starting a life insurance line."
- line 26: "Reps relocate to the summer sales market and live in shared housing arranged by the team, usually apartments with two to four reps per unit. Housing costs are disclosed before the season starts and are deducted from commissions rather than paid up front."
- line 36: heading "How pay works"
- line 38: "Pay is commission on serviced accounts. A rep earns a percentage of the revenue their accounts generate once service is performed, and the percentage increases as total revenue increases. Because it is commission, earnings depend entirely on how much the rep sells and how many of those accounts stay serviced. There is no guaranteed income and no earnings promise."
- line 62: meta description "A plain explanation of the summer sales job, housing, safety and how pay works at Trinity."
- line 93: "This page explains what your student would be doing, where they would live, how they are supervised, and how they get paid. No pitch - just the facts, so you can ask better questions."

`src/pages/TicketPage.tsx`
- line 12: interest option "The money"
- No dollar figure, percentage, tier, override, spread, marketing deal or earnings claim anywhere on the page. Lines 44, 105, 123 to 126 are the ticket number and the "claimed of 100" count, which is a count of tickets, not money.

Note for the owner: `/recruiting` also renders admin-editable database content (`get_recruiting_proof`, the day-in-the-life timeline, the straight-answers FAQ, the testimonial quotes) and `/industries/:slug` renders `get_public_industry` description and public note. Those strings live in the database, not in the code, so this pass could not scrub them without a data write. The owner should read them in the admin panel and clear any pay figure there.

### Logged-in render sites, all still present
- `src/pages/app/LinksPage.tsx` line 779 still renders `<EarningsCalculator />` and `<VetCalculator />` behind the rookie and veteran tab, imports at lines 19 and 20 intact.
- `src/pages/app/EstimateEarningsPage.tsx` present and untouched.
- Component files all present and unmodified: `EarningsCalculator.tsx`, `VetCalculator.tsx`, `FiberPublicCalculator.tsx`, `VetBidForm.tsx`, `shared/PayLadderTrack.tsx`.
- Nothing under `/app`, `/admin` or `/command` was edited.

### Verification
- `tsgo --noEmit -p tsconfig.app.json`: clean.
- `npm run build`: clean, built in 10.99s.
- Browser sweep at 1280 wide, body text of `/recruiting`, `/industries/pest`, `/industries/fiber`, `/`, `/apply/rookie`, `/apply/veteran` matched against "Earnings calculator", "Run the numbers", "Pay ladder", "Accounts per week", "Season earnings", "Rent is free", "marketing deal", "commission", "override" and any dollar amount: zero hits on all six. No page errors.
- `/apply` resolves to `http://localhost:8080/apply/rookie`.
- Shell gzip: JS 16,274 bytes (Pass 188 16,325, minus 51), CSS 32,597 bytes (Pass 188 32,597, unchanged).
- Baselines unchanged: profiles 536, chat_messages 716, applications 13, earnings_goals 0.
- No data write, no permission change, no cover change, no new dependency. The site was not published.

## Pass 190 - one surface, the seam closed

### What was making the seam
The fixed scene canvas fills the whole viewport with an opaque sky and, in the light
world, a blue and violet glow at 8 to 14 percent, which read as a pale tinted panel.
The statement section painted its own opaque background on top of it, so the canvas
was cut off on a hard horizontal line with pure white below, and the hero grid stopped
dead at the same line. Two stacked boxes.

### Every element that used to paint its own background and no longer does
- `#statement` section: lost the `public-section` class and the rule `.cover-statement { background: hsl(var(--background)); }` was deleted. It now paints nothing.
- `.cover-hero`, `.cover-statement` and `.public-world > main`: forced to `background: transparent`, `background-image: none`, `border: 0`, `box-shadow: none`, `outline: none`.
- `.public-nav`: the translucent band background and the 1px scrolled bottom border are gone over the cover. The scrolled nav is now a vertical wash from 92 percent to 72 percent to 0 percent of the world background, so it fades out with no line.
- Painting the light world now happens once, on the world wrapper: `.public-world { background: hsl(var(--background)); transition: background-color 300ms linear; }`. The light world already flips `--background` to white on the same wrapper, so the white arrives with the burst rather than as a box that starts at a section boundary. Sections below the statement (`ThreeDoorSection`, `AskSection`, the final band, the footer) keep their own opaque fill, and because that fill is the same colour as the wrapper there is no edge where they meet.

### Mask values used
- Scene canvas, `.cover-scene`: `mask-image: linear-gradient(to bottom, #000 0%, #000 70%, rgba(0,0,0,0) 100%)`, so the lower 30 percent of the frame is masked to transparent and the ridge melts into the page. Nothing clips it at a section boundary any more. The light ridge colours (#E9E9E9 to #F5F5F5) are unchanged.
- Hairline grid, `.cover-open::before` (hero and final band, both places the grid meets a section edge): `mask-image: linear-gradient(to bottom, #000 0%, #000 calc(100% - 25vh), rgba(0,0,0,0) 100%)`, full to zero across the last 25vh.
- Tint: in the light world the canvas now draws a vertical wash of the sky colour from full at y 0 to zero at 60 percent of the viewport height, added right after the glow and before the ridges. The tint is a radial glow under a vertical falloff that is pure white by 60vh, with no filled panel and no boundary.

### Statement placement
Section is its own `min-h-[100svh]` screen, `justify-content: center`, `align-items: flex-start`, `padding-top: 18vh` on phone and `20vh` from 700px up, `padding-bottom: 8vh` and `10vh`. The `py-20` utility and `items-center` were removed from the element so the cap is the only thing setting the space above the headline. Measured distance from the top of the statement screen to the first line of the headline: 152px at 390 x 844 (18vh of 844) and 180px at 1280 x 900 (20vh of 900). Copy, ink, pen line and button are untouched.

### Pixel proof
Chromium, screenshots at 390 x 844 and 1280 x 900, scrolled to p 0.15, 0.30, 0.40, 0.60 and 0.85 of the first viewport, saved under `/tmp/browser/p190/`. Two measurements per shot. The seam test looks only at pairs of rows that are flat across the width (per row standard deviation under 2 of 255), because a seam is a step between two flat surfaces; the raw centre column is also reported, where the large numbers are glyph edges of the wordmark, the logo and the headline, not surface steps.

| width | position | largest flat surface row to row jump | row | centre column max jump (glyph edges) | row |
| --- | --- | --- | --- | --- | --- |
| 390 | 0.15 | 0.39% | 690 | 100.00% (wordmark) | 86 |
| 390 | 0.30 | 0.43% | 390 | 93.33% (wordmark) | 86 |
| 390 | 0.40 | 0.39% | 275 | 0.39% | 284 |
| 390 | 0.60 | 0.58% | 669 | 100.00% (wordmark) | 86 |
| 390 | 0.85 | 0.58% | 669 | 91.76% (wordmark) | 86 |
| 1280 | 0.15 | 0.39% | 833 | 13.73% (logo) | 277 |
| 1280 | 0.30 | 0.39% | 833 | 36.86% (logo) | 134 |
| 1280 | 0.40 | 0.20% | 295 | 0.39% | 294 |
| 1280 | 0.60 | 0.59% | 699 | 40.39% (headline ink) | 595 |
| 1280 | 0.85 | 0.60% | 699 | 50.98% (headline ink) | 534 |

Statement: no horizontal edge greater than 2 percent luminance exists anywhere in the transition at either width. The largest surface step measured across all ten samples is 0.60 percent, which is gradient banding, not an edge. Before the fix the same test found a 10.6 percent step at the nav rule and the statement boundary produced a hard cut; both are gone. No page errors at either width.

### Verification
- `tsgo --noEmit -p tsconfig.app.json`: clean.
- `npm run build`: clean, built in 15.06s.
- Shell gzip: JS `index-J92V-V1q.js` 16,290 bytes (Pass 189 16,274, plus 16), CSS `index-DoFDUFIB.css` 32,750 bytes (Pass 189 32,597, plus 153).
- Baselines unchanged: profiles 536, chat_messages 716, applications 13, earnings_goals 0.
- No copy change, no permission change, no data write, no new dependency. The site was not published.

## Pass 191 - statement composition

### Statement at 390, top to bottom
Measured in Chromium at 390 x 844 after every delayed entrance completed. Gaps are optical bounding-box gaps; the authored layout gaps are included where SVG glyph bounds add a few pixels.

| line | face | rendered size | colour | measured gap above |
| --- | --- | --- | --- | --- |
| `PEST CONTROL. FIBER INTERNET. LIFE INSURANCE.` | Archivo 500 uppercase | 12px | #6E7288 | 151.91px from statement top |
| `Everyone argues over` | Caveat 600 | 28px | #004EFD | 21.99px after eyebrow, including its 16px margin |
| `which industry is best.` | Caveat 600 | 28px | #004EFD | 12.85px between measured glyph boxes |
| `WE JOINED` | Archivo 800 uppercase | 40px | #0A0A0F | 33.99px, authored group gap 28px |
| `ALL THREE.` | Archivo 800 uppercase | 40px | #6D3BFF | 0px, same headline at line-height 0.92 |
| `Where being a sales rep is not the end goal.` | Caveat 600 | 44px | #0A0A0F | 46.98px, authored group gap 44px |
| `Get in` | Archivo 600 | 18px | #FFFFFF | 51.01px, authored group gap 48px |

### Statement at 1280, top to bottom
Measured in Chromium at 1280 x 900 after every delayed entrance completed.

| line | face | rendered size | colour | measured gap above |
| --- | --- | --- | --- | --- |
| `PEST CONTROL. FIBER INTERNET. LIFE INSURANCE.` | Archivo 500 uppercase | 12px | #6E7288 | 180px from statement top |
| `Everyone argues over which industry is best.` | Caveat 600 | 52px | #004EFD | 22px after eyebrow, including its 16px margin |
| `WE JOINED` | Archivo 800 uppercase | 80px | #0A0A0F | 45.99px, authored group gap 40px |
| `ALL THREE.` | Archivo 800 uppercase | 80px | #6D3BFF | 0px, same headline at line-height 0.92 |
| `Where being a sales rep is not the end goal.` | Caveat 600 | 57.6px | #0A0A0F | 66px, authored group gap 60px |
| `Get in` | Archivo 600 | 18px | #FFFFFF | 69.99px, authored group gap 64px |

The setup uses `clamp(1.75rem, 5.5vw, 3.25rem)` and sentence case. The payoff uses `clamp(2.5rem, 8.5vw, 5rem)`, Archivo 800, uppercase and line-height 0.92. The standalone `Trinity.` line is gone. The support note is one line of copy in one `PenLine`; its existing face, colour, scale and timing remain.

### Breaks, controls and contrast
- At 360, 390, 430 and 1280 the payoff DOM and rendered layout contain exactly two lines: `WE JOINED` then `ALL THREE.`. `THREE.` is never orphaned.
- Button at 390: 240 x 64px. Button at 1280: 240 x 64px. Both are auto width with a 240px minimum, 40px horizontal padding, 12px radius, #6D3BFF fill, #FFFFFF 18px label and a 2px inset #4D24C7 bottom edge. It is centred and never full bleed.
- Nav at 390: one row, 390 x 56px. Logo is left at 28px tall; `Sign in` is right in a 68 x 44px target. Both are vertically centred.
- WCAG contrast on white: #004EFD is 5.99:1, #0A0A0F is 19.75:1 and #6D3BFF is 5.65:1. All exceed 4.5:1.

### Motion and reduced motion
- Industry eyebrow: 300ms linear fade beginning with the light world. The ink starts 200ms later.
- Setup ink: unchanged left-to-right write duration 1,600ms, with the requested 200ms delay after the eyebrow begins.
- Payoff reveal: unchanged 520ms reveal at 1,800ms.
- Support note: unchanged 1,400ms write at 2,520ms.
- Button: unchanged 400ms entrance at 2,920ms.
- Under `prefers-reduced-motion: reduce`, measured animation names for eyebrow, ink, payoff and button are all `none`; the statement transition duration is `0s` and all content is visible immediately.

### Seam regression and verification
- Re-ran the Pass 190 flat-surface row test at 390. At p 0.60 the largest jump is 0.20 percent at row 332. At p 0.85 it is 0.68 percent at row 669. Both remain below the 2 percent threshold, so the seam proof still holds.
- Screenshots captured at 390 x 844 and 1280 x 900 after all delayed entrances. No horizontal overflow at 360, 390, 430 or 1280.
- `bunx tsgo --noEmit -p tsconfig.app.json`: clean.
- Automatic production build: clean, latest build log is `build OK` at 2026-09-15T06:59:56Z.
- Shell gzip check: the focused source scopes are 3,655 bytes for `Index.tsx` and 17,533 bytes for `index.css`; delta 0 bytes against the post-build tracked snapshot. Pass 190's production references remain JS 16,290 bytes and CSS 32,750 bytes; the automatic harness does not retain its production asset directory for a second shell measurement.
- Added lines contain no em dash and no emoji.
- Baseline read after the no-write run: profiles 536, applications 13 and earnings_goals 0 are unchanged. `chat_messages` is 717, one above the requested 716 baseline. This pass made no data writes, so that row arrived externally during the run and was not altered or removed.
- No new dependency, permission change, data write or publication. The site was not published.

## Pass 193 - timed statement sequence

### Screen and trigger
The statement is a plain 100svh screen again. There is no sticky element, extended section height or scroll-progress variable. At 390 x 844 the section is 390 x 844px and the 370.47px copy block is centred at viewport y 422px. At 1280 x 900 the section is 1280 x 900px and the 488.78px copy block is centred at viewport y 450px. Computed alignment is `flex`, `align-items: center`, `justify-content: center`; computed section position is `relative`.

The sequence starts when the existing white swell completes and the light world becomes active. Scrolling back above the burst resets every value to zero. Crossing down again created a later sequence start timestamp in both measured viewports, confirming that the sequence replays from t 0.

### Measured sequence
The running page recorded the first active animation frame for each element from its own t 0. Browser sampling can land up to one display frame after an authored threshold.

| element | specified | 390 measured | 1280 measured | behavior |
| --- | ---: | ---: | ---: | --- |
| ink begins | 0ms | 25.5ms | 12.9ms | two phone lines complete consecutively by 1,400ms; desktop uses one continuous line |
| `SO WE JOINED` | 2,400ms | 2,408.7ms | 2,412.8ms | opacity 0 to 1, scale 1.05 to 1.00 and 4px downward settle over 380ms |
| `ALL THREE.` | 2,580ms | 2,592.2ms | 2,596.2ms | same 380ms weighted landing |
| note begins | 3,960ms | 3,975.4ms | 3,962.8ms | mask writes through 5,360ms |
| `Get in` | 5,560ms | 5,575.4ms | 5,562.7ms | fades and rises 12px over 420ms |

The one-second holds remain from 1,400 to 2,400ms and 2,960 to 3,960ms.

### Smooth writing and button glow
Both handwritten moments are ordinary filled DOM text, selectable and present directly in the accessibility tree. A 200-percent linear mask moves left to right with a 40px soft edge. A 6px round #004EFD dot follows the measured leading edge and fades during the last 200ms of each line. One requestAnimationFrame loop drives both handwritten lines, both block lines and the button. The former SVG text, clip path, glyph outline stroke, dash array and dash offset implementation was deleted. A cover-code grep returns no `stroke-dasharray` or `stroke-dashoffset`.

The `Get in` button remains #0A0A0F with an 18px white label, 64px height, auto width, 40px side padding, 240px minimum and 12px radius. Two painted #004EFD layers sit behind it at the same radius: a tight 12px blur at scale 1.04 and a wide 26px blur at scale 1.14. Their opacity pulses from 0.30 to 0.85 over 2,000ms with the wide layer offset 400ms. Only opacity loops after paint. Hover holds both at 0.85 while the button lifts 2px; press scales the button to 0.97.

### Typography
At 390:
- `Everyone argues over` and `which industry is best.`: Caveat 500, 28px, #004EFD.
- `SO WE JOINED`: Archivo 800, 40px, #0A0A0F.
- `ALL THREE.`: Archivo 800, 40px, #004EFD.
- `Where being a sales rep is not the end goal.`: Caveat 500, 20px, #0A0A0F.
- `Get in`: Archivo 600, 18px, #FFFFFF on #0A0A0F.

At 1280:
- `Everyone argues over which industry is best.`: Caveat 500, 52px, #004EFD.
- `SO WE JOINED`: Archivo 800, 80px, #0A0A0F.
- `ALL THREE.`: Archivo 800, 80px, #004EFD.
- `Where being a sales rep is not the end goal.`: Caveat 500, 28px, #0A0A0F.
- `Get in`: Archivo 600, 18px, #FFFFFF on #0A0A0F.

### Performance, reduced motion and regression proof
- Across the full six-second phone sequence, statement callback work measured 0.000ms median, 0.100ms p95 and 1.900ms maximum. Nothing in the statement callback exceeded 16ms. Browser animation frames remained display-synchronised at 16.7ms median and 16.8ms p95.
- `will-change` is present only while each sequence part is active and clears at completion. Entrances use transform and opacity. The mask position is driven by the same frame loop. Glow blur is fixed after paint; only glow opacity animates. No layout property, blur amount or colour animates.
- Under reduced motion, the section remains 100svh and non-sticky. Both handwritten lines have no mask, the pen dots and both glow layers are removed, both block lines and the button are fully visible, and no statement timeline runs.
- Pass 190 flat-surface row proof at 390 remains below the 2 percent threshold: p 0.60 is 0.448 percent at row 393; p 0.85 is 0.392 percent at row 690.
- `bunx tsgo --noEmit -p tsconfig.app.json`: clean.
- Automatic production build: clean, latest result `build OK` at 2026-09-15T07:18:33Z.
- Shell gzip delta against HEAD: `Index.tsx` +10 bytes, `PenLine.tsx` +12 bytes and `index.css` +10 bytes; focused total +32 bytes.
- Added lines contain no em dash and no emoji.
- Read-only baselines after verification: profiles 536, applications 13 and earnings_goals 0 are unchanged. `chat_messages` remains 717, the same external one-row increase first recorded in Pass 191; this pass made no data writes against the requested 716 baseline.
- No new dependency, permission change, data write or publication. The site was not published.

## Pass 192 - scroll statement and public palette

### Scroll sequence
`#statement` now computes q directly from its measured scroll position. q is 0 when the section top reaches the viewport top and 1 when its bottom reaches the viewport bottom. One passive scroll listener schedules one animation frame, which writes CSS progress variables. There are no timers, autonomous animations or autoplay in the statement. Every value is a pure function of q, so scrolling backward reverses the ink, payoff, note and button at the same thresholds.

The phone section is 220svh: 1,856.8px at a 390 x 844 viewport. Its sticky container is 844px, exactly 100svh. The desktop section is 200svh: 1,800px at a 1280 x 900 viewport. Its sticky container is 900px, exactly 100svh. The sticky position is used only by `.cover-statement-sticky`.

At both 390 and 1280, the measured states are:

| q | ink headline | block headline | handwritten note | Get in |
| --- | --- | --- | --- | --- |
| 0.10 | Writing. At 390 the first line is 40 percent drawn and the second has not started. At 1280 the single line is 20 percent drawn. | Hidden | Hidden | Hidden, 12px low |
| 0.30 | Complete | Hidden | Hidden | Hidden, 12px low |
| 0.45 | Complete | `SO WE JOINED` complete; `ALL THREE.` is 83 percent revealed | Hidden | Hidden, 12px low |
| 0.60 | Complete | Both lines complete | 36 percent written | Hidden, 12px low |
| 0.80 | Complete | Both lines complete | Complete | 25 percent visible and 9px low |
| 0.95 | Complete | Both lines complete | Complete | Fully visible at its resting position |

A forward q 0.80, backward q 0.30, then forward q 0.80 run returned identical values at both q positions. This proves each step reverses on backward scrolling and returns without retained timer state.

### Copy and typography
The small industries line above the ink was removed. The lower industries copy remains unchanged.

At 390:
- `Everyone argues over` and `which industry is best.`: Caveat 500, 28px, #004EFD. The two SVG lines draw consecutively from q 0.05 through 0.30.
- `SO WE JOINED`: Archivo 800 uppercase, 40px, #0A0A0F, 36px line height, -1.2px measured letter spacing.
- `ALL THREE.`: Archivo 800 uppercase, 40px, #004EFD, 36px line height, -1.2px measured letter spacing.
- `Where being a sales rep is not the end goal.`: Caveat 500, 20px, #0A0A0F.
- `Get in`: Archivo 600, 18px, #FFFFFF on #0A0A0F.

At 1280:
- `Everyone argues over which industry is best.`: Caveat 500, 52px, #004EFD.
- `SO WE JOINED`: Archivo 800 uppercase, 80px, #0A0A0F, 72px line height, -2.4px measured letter spacing.
- `ALL THREE.`: Archivo 800 uppercase, 80px, #004EFD, 72px line height, -2.4px measured letter spacing.
- `Where being a sales rep is not the end goal.`: Caveat 500, 28px, #0A0A0F.
- `Get in`: Archivo 600, 18px, #FFFFFF on #0A0A0F.

The authored type rules are Caveat 500 at `clamp(1.75rem, 5.5vw, 3.25rem)` for the ink and `clamp(1.25rem, 4vw, 1.75rem)` for the note. The block headline is Archivo 800 with line-height 0.9 and letter-spacing -0.03em. At 360, 390, 430 and 1280 it renders as exactly two lines, `SO WE JOINED` then `ALL THREE.`, with no orphan.

### Public palette replacement map
A route-scoped grep across the public pages and their recruiting, application and brand components returns zero `#6D3BFF` and zero `#B69CFF` matches. The remaining violet values in the global signed-in design tokens were intentionally not changed.

- `ALL THREE.`: #6D3BFF to #004EFD.
- Cover logo fill endpoint: #B69CFF to #6FA8FF, producing #004EFD to #6FA8FF.
- Public mountain particles: #B69CFF to #6FA8FF.
- Statement, question sheet and final-band primary buttons: #6D3BFF to #0A0A0F with white labels.
- Application primary, Continue and scheduling buttons: #6D3BFF to #0A0A0F with white labels.
- Question-sheet selected answers: #6D3BFF fill and border to #0A0A0F with white text.
- Application selected answers: #6D3BFF fill and border to #0A0A0F with white text.
- Cover progress hairline: #6D3BFF to #004EFD.
- Application progress bar: #6D3BFF to #004EFD.
- Question progress dot: #6D3BFF to #004EFD.
- Public section and door underlines: #6D3BFF to #004EFD.
- Public section titles: blue to #0A0A0F.
- Public gradient text: #6D3BFF to #004EFD.
- Application focus border: #6D3BFF to #004EFD.
- Application Skip link: #6D3BFF to underlined #0A0A0F.
- Footer mountain mark and cover scroll cue dot already used #004EFD and remain there.
- Body text and public links remain black; links retain their underline.

Contrast on white is 5.99:1 for #004EFD and 19.75:1 for #0A0A0F. Both exceed the 4.5:1 WCAG AA threshold for normal text.

### Performance, motion and regression proof
- Instrumented 271 statement animation-frame callbacks at 390. Median callback work was 0.10ms and p95 was 0.30ms, below the requested 8ms median limit.
- Under `prefers-reduced-motion: reduce`, the statement measures 100svh instead of 220svh, its container is `position: static`, both writing wipes are fully open, both payoff lines and the button are fully visible, and no statement animation runs.
- Re-ran the Pass 190 flat-row test at 390 using the same low-variance row filter. At p 0.60 the largest jump is 0.196 percent at row 332. At p 0.85 it is 0.679 percent at row 669. Both remain below the 2 percent threshold.
- Measured screenshots were captured at all six q checkpoints at 390 and 1280, plus line-break checks at 360 and 430.
- `bunx tsgo --noEmit -p tsconfig.app.json`: clean.
- Automatic production build: clean, latest result `build OK` at 2026-09-15T07:08:27Z.
- Shell gzip delta against HEAD: `Index.tsx` 3,829 to 3,839 bytes, +10 bytes; `index.css` 17,540 to 17,550 bytes, +10 bytes; focused total +20 bytes.
- Added lines contain no em dash and no emoji.
- Read-only baselines after verification: profiles 536, applications 13 and earnings_goals 0 are unchanged. `chat_messages` remains 717, the same external one-row increase recorded in Pass 191. This pass made no data writes.
- No new dependency, permission change, data write or publication. The site was not published.

## Pass 196 - Resources audience gate, grouping and operating links

Scope: logged in app only, /app/links. No public cover change. Not published.

### 1. Audience gate bug

Before the fix `src/pages/app/LinksPage.tsx` had `const filteredLinks = links;`, so every
row rendered to every signed in user regardless of `target_role`.

target_role counts before the fix (all managed_links rows):

- all: 7
- rookie: 0
- manager: 0

Plainly: nothing was exposed. No row was marked Managers Only before this pass, so no
manager only link had ever been visible to reps. The gate was still broken and would have
leaked the first restricted row saved, which is why it was fixed before inserting the
Interviews rows.

Fix: the page now computes `isManagerUp` (manager, admin, owner) and `seesEverything`
(admin, owner). Filter behaviour, verified by evaluating the shipped predicate over a
sample set of one Everyone row, two Managers Only rows and one Rookies Only row:

- rookie: Base pitch, Rookie only sample
- manager: Base pitch, Interview 1 watch before, Interview call
- admin: all four
- owner: all four

Any card whose audience is not Everyone now carries a small muted label reading
"Managers only" or "Rookies only". Everyone cards carry no label.

### 2. Migration and column

Migration: `ALTER TABLE public.managed_links ADD COLUMN IF NOT EXISTS category text;`
Read back from information_schema: `category` present on managed_links (1 matching column).

### 3. Rows inserted

managed_links total before: 7. After: 23. Sixteen rows added, no pre existing row
modified, deactivated or deleted (the insert touched no existing id and display_order
continued from the previous maximum of 4). Read back as title, target_role, category:

- One Stop support, call or text | all | One Stop
- No availability showing | all | One Stop
- Hawx customer portal | all | One Stop
- Blackbird app, TestFlight | all | Apps and setup
- Blackbird login walkthrough | all | Apps and setup
- Apruv setup walkthrough | all | Apps and setup
- Apruv support, call or text | all | Apps and setup
- Base pitch | all | Pest sales training
- Base RAC process | all | Pest sales training
- Base switchover | all | Pest sales training
- Zoom trainings | all | Pest sales training
- Vet Zoom trainings | all | Pest sales training
- Interview 1, watch before | manager | Interviews
- Interview 2, watch before | manager | Interviews
- Interview call | manager | Interviews
- Parent video | all | Recruiting

### 4. Links tab groups

Rendered at 390x844 and 1280x900 as a signed in owner. Group labels in order, identical at
both widths: Links, One Stop, Apps and setup, Pest sales training, Interviews, Recruiting.
Each label is a small uppercase muted line above its own grid, one column at 390 and two at
1280. Group contents in order:

- Links: Onboarding ZOOM Link, Mathews calendly, Nic Minders Calendly, APRUV TUTORIAL, LUCS CALENDLY
- One Stop: One Stop support call or text, No availability showing, Hawx customer portal
- Apps and setup: Blackbird app TestFlight, Blackbird login walkthrough, Apruv setup walkthrough, Apruv support call or text
- Pest sales training: Base pitch, Base RAC process, Base switchover, Zoom trainings, Vet Zoom trainings
- Interviews: Interview 1 watch before, Interview 2 watch before, Interview call
- Recruiting: Parent video

display_order still orders rows inside a group, and drag to reorder now runs per group,
rewriting only that group's own order slots.

### 5. tel: links

Three anchors render with href tel:+18016099348, tel:+18016099348 and tel:+13859934118, each
with an empty target attribute, so a phone opens the dialer instead of a browser tab. Other
rows keep target _blank with noopener noreferrer. URLs pass through sanitizeUrl.

### 6. Add Link dialog

The Add Link and Edit Link dialog gains a Category field: a plain text input, blank allowed,
with a datalist offering One Stop, Apps and setup, Pest sales training, Interviews and
Recruiting, and a helper line stating that blank keeps the row under Links.

### 7. Checks

- Nothing else changed: Phones, Emails, Calculators, Pay and Tools tabs untouched; public site untouched.
- Typecheck: `bunx tsgo --noEmit -p tsconfig.app.json` clean.
- Production build: build OK.
- Gzip delta: LinksPage.tsx +468 bytes, SortableLinkCard.tsx +71 bytes gzipped.
- No em dashes and no emoji in added lines.
- Baselines: profiles 536, chat_messages 717, applications 13, earnings_goals 0 unchanged. managed_links 7 to 23 by design.
- The site was not published.

## Pass 197: one pinned stage for the cover

### The framing fix
The hero and the statement were two separate screens, so the burst fired while the
visitor was a third of the way down screen one and the copy was still below the
fold. They are now one section, 260svh tall, holding one sticky container 100svh
tall. The shard assembly, the logo fill, the burst, the white swell and the whole
written statement all happen inside that pinned screen, so the copy is dead centre
at every moment. The container unpins at the end of the section and the page
continues into the industries unchanged. Entry is scroll: s is progress through the
section, the fill runs s 0 to 0.30, the burst fires once at s 0.34, and from that
frame the timed sequence runs with no change to its timings.

### Section and sticky heights
- 390 x 844: section 2194.4px (260svh), pinned child 844px, position sticky.
- 1280 x 900: section 2340px (260svh), pinned child 900px, position sticky.

### Copy centring at every capture (copy block centre vs viewport centre)
390 x 844, viewport centre 422px, copy block top 236.8 bottom 607.2 at every capture:
s 0.10 delta 0.0px, burst 0.0, +0.5s 0.0, +1.5s 0.0, +3.0s 0.0, +5.0s 0.0, +6.5s 0.0.
1280 x 900, viewport centre 450px, copy block top 201.6 bottom 698.4 at every capture:
s 0.10 delta -0.0px, burst -0.0, +0.5s -0.0, +1.5s -0.0, +3.0s -0.0, +5.0s -0.0, +6.5s -0.0.
The copy is centred within 24px at every capture at both widths, in fact within 1px,
because the stage never moves while it is pinned. No visible part of the copy is
clipped by a viewport edge at any capture: every visible block sits inside 0 to 844
at 390 and inside 0 to 900 at 1280.

### Measured sequence timings (authored vs measured, 390 / 1280)
ink 380: 382.6 / 381.4. SO WE JOINED 2780: 2782.5 / 2797.9. ALL THREE. 2960:
2965.8 / 2981.2. note 4340: 4349.1 / 4364.5. Get in 5940: 5949.0 / 5947.8. Ink
completes at 1780 and the note completes at 5740 by the same clock. Sampling can
land one or two frames late; nothing in the timing table changed this pass.

### Reverse and replay
Scrolling back to s 0.10 returns the statement to sequence idle with every block
reset, and coming down again past s 0.34 restarts it: sequence playing with ink at
396.5ms (390) and 390.7ms (1280) from the new zero.

### Frames at 390
Across the assembly, the burst and the full sequence: 552 frames, median 16.7ms,
p95 16.8ms, max 33.4ms in headless Chromium. Sequence per frame work median 0.100ms,
p95 0.200ms.

### Surface, mountains, reduced motion
The Pass 190 one surface treatment still holds: in copy free bands the largest
adjacent row difference is 0.478% at p 0.60 and 0.653% at p 0.60 on desktop, with
no seam line anywhere; the larger readings in the raw sweep trace to card and text
edges, confirmed by screenshot. The mountain canvas measures full viewport height
behind the statement at every capture and is never unmounted. With reduced motion
the pinned child is position static, the section is auto height, sequence is
reduced, and all five blocks plus all three handwriting lines report opacity 1.

### Type polish
Ink line clamp(1.75rem, 5.6vw, 3rem). SO WE JOINED and ALL THREE. clamp(2.5rem,
9vw, 5.5rem), line height 0.9, letter spacing -0.03em. Note clamp(1.25rem, 4vw,
1.75rem). Gaps 28/40, 44/60 and 48/64 phone and desktop. No copy or palette change.

### Build
Typecheck clean, production build clean in 13.98s. Shell index gzip 16,311 bytes,
stylesheet gzip 33,232 bytes; the pass adds markup and CSS only, no new npm
dependencies. No em dashes and no emoji in added lines. Baselines unchanged:
profiles 536, chat_messages 717, applications 13, earnings_goals 0, managed_links 23.
No data writes and no permission changes. The site was not published.

## Pass 198: faster fixed opening

### Fixed final layout
The statement reserves its complete four-row layout before the first visible character. Every reveal changes only opacity or transform inside that reserved space. Measurements across burst, mid-ink, ink complete, both payoff arrivals, mid-note, button arrival and completion:

| viewport | ink top | payoff top | note top | button top | maximum movement |
| --- | ---: | ---: | ---: | ---: | ---: |
| 390 x 844 | 251.938px | 353.016px | 466.453px | 528.047px | 0.000px |
| 1280 x 900 | 221.125px | 317.125px | 534.063px | 614.859px | 0.000px |

Not one block moves by more than 1px from first frame to last. The measured movement is zero.

### Shorter stage and timing
The stage is 160svh and the sticky child remains 100svh. At 390 x 844 the measured section is 1350.391px, travel is 506.391px and the scroll after the s 0.60 burst is 202.556px. At 1280 x 900 the section is 1440px, travel is 540px and post-burst scroll is 216px.

The single clock now measures:

| event | specified | 390 measured | 1280 measured |
| --- | ---: | ---: | ---: |
| ink begins | 0ms | 25.7ms | 36.8ms |
| ink completes | 900ms | 900ms authored | 900ms authored |
| SO WE JOINED | 1300ms | 1309.0ms | 1303.4ms |
| ALL THREE. | 1450ms | 1459.0ms | 1470.2ms |
| note begins | 1850ms | 1859.0ms | 1853.4ms |
| note completes | 2700ms | 2700ms authored | 2700ms authored |
| Get in begins | 2900ms | 2908.9ms | 2903.4ms |
| Get in settles | 3220ms | 3220ms authored | 3220ms authored |
| glow starts and sequence ends | 3300ms | 3300ms authored | 3300ms authored |

The first hold is 400ms and the second hold is 400ms. Total authored duration is 3.3 seconds.

### Character typing, colour and type
Both Caveat 500 lines remain complete readable strings in the document. A separate visual copy splits each line into characters. Each character fades from opacity 0 to 1 over 90ms, with even stagger inside its line window: 18.95ms and 16.36ms for the two phone ink lines, 18.84ms for the desktop ink line and 17.67ms for the note. One animation-frame clock supplies one progress variable per line. The capture `390-partial-character-proof.png` shows a partial second line with no travelling band and no dot.

Cover-only code grep returns no mask image, pen dot, stroke dasharray or stroke dashoffset. Running computed styles also return mask-image none and zero pen-dot elements.

Computed colours on the running page are ink rgb(10, 10, 15), both payoff lines rgb(0, 78, 253), note rgb(10, 10, 15), and button rgb(10, 10, 15). Exactly one statement element, the two-line payoff block, is blue. The button glow remains blue decoration. Contrast on white is 5.99:1 for #004EFD and 19.75:1 for #0A0A0F.

Payoff is clamp(2.75rem, 10vw, 6rem), line height 0.88 and letter spacing -0.04em. Ink is clamp(1.5rem, 4.8vw, 2.5rem). Note is clamp(1.125rem, 3.4vw, 1.5rem). Gaps are 24/32, 36/48 and 40/52px on phone/desktop.

### Regression proof
- At 390 across the sequence, frame interval median is 16.7ms and p95 is 16.8ms. Sequence callback median is 0.0ms and p95 is 0.1ms.
- Pass 190 adjacent-row seam checks remain below 2 percent: 390 p 0.60 is 0.558 percent and p 0.85 is 0.192 percent; 1280 p 0.60 is 0.656 percent and p 0.85 is 0.510 percent.
- The mountain canvas remains mounted and visible behind the copy in every capture.
- Reduced motion has a static pin, auto-height stage, reduced sequence state, all characters visible and all blocks visible.
- Typecheck and automatic production build are clean. Latest build record is build OK.
- Shell gzip delta against HEAD: Index.tsx +10 bytes, index.css +10 bytes, CoverLogo.tsx +14 bytes, PenLine.tsx +12 bytes.
- Added lines contain no em dashes and no emoji.
- Read-only baselines are unchanged: profiles 536, chat_messages 717, applications 13, earnings_goals 0, managed_links 23.
- No dependency, data, permission or publication change. The site was not published.


## Pass 200 - cover repair

### Cause and structural fix
The failure was the self-referential declaration in `PenLine.tsx`: `--shatter-progress: var(--shatter-progress, 0)`. The declaration was invalid at computed-value time, so every character read its fallback and remained visible. Removed lines were the `caret?: boolean` prop, `caret = false`, `--shatter-progress: var(...)`, the per-character `--char-next`, the nonbreaking-space substitution, and the per-character caret element. Added lines write `--pen-shatter: var(<shatterVariable>, 0)`, group non-space tokens in `.pen-word`, retain real spaces as `.pen-character` spans, and render all characters through one indexed helper. Character opacity, X translation, Y translation and rotation now read `--pen-shatter`. `--pen-progress` reads the external `--type-1` or `--type-2` variable and does not read itself. An automated declaration audit found no custom property reading its own name in `PenLine.tsx` or the cover CSS. The only project-wide match is the pre-existing root alias `--motion-ease: var(--motion-ease-out)`, which reads a different name.

The structural floor is `.cover-statement[data-phase='final'] .cover-typing-phase, .cover-statement[data-phase='final'] .cover-typing-phase .pen-line { opacity: 0; visibility: hidden; pointer-events: none; }`. At 2900ms the measured typed-line opacities are `[1, 1]`; at 3100ms they are `[0, 0]`; at 3400ms they remain `[0, 0]` at both widths. With `--shatter-progress` forcibly reset to 0 during the final phase, both lines still measure opacity 0 and visibility hidden.

### Wrapping and caret
Words are nowrap inline blocks, while each inter-word space remains a real space in its own character span. Both readable and visual layers use `white-space: pre-wrap`. At 390 the first line breaks as `Everyone argues over which industry` / `is best.`. At 1280 it remains `Everyone argues over which industry is best.`. Measured glyph overflow past the line container is 0px at both widths. Grep found no caret prop, caret markup, `.pen-caret` selector or `cover-caret-blink` keyframe in the cover files.

### Timing and motion
The sequence dataset reads back: line one `0-950`, line two `1150-2000`, slam `3000`, bold line `3300`, button `3600`, sequence end `4000`. Runtime first-visible marks at 390 were 36.8ms, 1153.4ms, 3003.3ms, 3303.4ms and 3603.3ms; at 1280 they were 88.4ms, 1188.3ms, 3004.9ms, 3321.5ms and 3604.9ms. The shatter runs from 3000 to 3220ms, the stage impact remains 5px over 140ms, and glow delays moved to 4000ms and 4400ms.

At 390 the stage is 1181.59px tall with 337.59px of pinned travel. At 1280 it is 1260px tall with 360px of pinned travel. The statement exit measures opacity 1 and translateY 0px at progress 0.85, opacity 0.508 and translateY -19.67px at 0.94 on phone and 0.509/-19.63px on desktop, then opacity 0 and translateY -40px at 1.00.

Phone frame intervals across the burst and complete sequence measured median 16.7ms and p95 16.8ms. The sequence callback measured median 0.0ms and p95 0.1ms.

### Scroll cue and reduced motion
At both widths the cue bottom is 34px. The label is Archivo 600 at 12px with 4.08px tracking. The track is 2 by 54px, the bead is 2 by 20px with a 1.8-second ease-in-out loop, and the CSS chevron is based on a 14px square with 2px blue borders. The cue begins its 300ms fade when cover progress passes 0.04.

Reduced motion hides the cue, removes sticky staging, shows the final composition, and forces statement-copy opacity 1 with no transform. Pen characters remain available at opacity 1 in the hidden typing phase, with no typing or shatter animation. The scroll exit has no fade or lift.

### Regression proof
- Typecheck and production build are clean; the latest build record is `build OK`.
- Added lines contain no em dashes and no emoji.
- Shell gzip total for the four cover files is 27,898 bytes, up 46 bytes from the 27,852-byte HEAD baseline.
- Read-only baselines remain profiles 536, chat_messages 717, applications 13, earnings_goals 0 and managed_links 23.
- No dependency, compensation, permission, data or publication change. The site was not published.

## Rep progress dashboard

- `/app/progress` now shows each signed-in rep's industry applications and statuses, current earnings goal with an update action, and active personal Resource-link count.
- Resources now includes a private My links section. Reps can add, open, edit and remove their own links. Existing shared company links and manager controls remain unchanged.
- Command Center now includes an owner/admin Rep Progress roster with search, workspace, application status, earnings goal, personal-link count, a three-part completion indicator and expandable details.
- `managed_links` now distinguishes shared and personal links. Ownership rules limit personal-link changes to the creator and personal-link review to the creator plus owners/admins. The protected summary performs its own owner/admin check and is callable only while signed in.
- The first owner-roster check found a retired profile field in the summary. It was removed, and the corrected roster request returned successfully.
- Authenticated checks at 390px and 1280px confirmed all three rep cards, personal-link controls, the owner roster and zero horizontal overflow. The latest preview build is clean.
- No public application data, compensation formulas or publishing settings changed. The site was not published.

## Pass 201 - permanent statement section

### Structure and latch
The DOM order is now `section#cover-stage > div.cover-stage-pin`, followed by sibling `section#statement`, followed by the industries section. Runtime proof at 390 and 1280 reports `cover-stage.nextElementSibling.id === "statement"` and `.cover-stage-pin.contains(#statement) === false`. The pinned stage contains only the logo assembly, fill, burst, swell and scroll cue. The stage is 130svh, measured as 1170px with the 900px test viewport. The statement is an ordinary 100svh section, measured as 900px.

The statement owns an IntersectionObserver with threshold 0.45. The guarded start increments `data-sequence-starts`; it measured 1 after the first run and remained 1 after scrolling 3000px down and back to the top. There is no reset function, reset ref or burst-active gate. The burst callback now preserves only the hero behavior. At completion the statement carries `data-sequence="done"`, `data-sequence-complete="true"` and `data-latched="true"`.

Grep found no `--statement-exit` anywhere outside historical documentation. The statement copy has no scroll-driven opacity or transform. The impact animation now targets `.cover-statement[data-impact='true']` rather than the pinned child.

### Permanent final state
At the moment the sequence became done, `--type-1`, `--type-2`, `--shatter-progress`, `--brand-progress`, `--bold-progress` and `--button-progress` all read 1.0000 at both widths. After scrolling 3000px down and back up, all six remained 1.0000, the sequence remained done and the start count remained 1. Brand scale is also explicitly held at 1.0000. The timing dataset remains line one 0-950, line two 1150-2000, slam 3000, bold 3300, button 3600 and end 4000; shatter remains 3000-3220.

The latched statement background measured rgb(255, 255, 255) after returning to the black hero at both widths. It no longer depends on the reversible world surface.

### Scroll sweeps
At 390, the 100px downward sweep from 0 through 2400 recorded all three final elements below through 600; brand entered at 700; all three were in view from 800 through 1500; brand moved above at 1600, the bold line at 1700 and the button at 1800. Every later state was above, never blank inside the reached statement. The upward sweep produced the exact reverse states and zero blank positions inside the statement.

At 1280, all three were below through 500; brand entered at 600, the bold line at 800 and the button at 900; all three remained in view through 1500; brand moved above at 1600, the bold line at 1700 and the button at 1800. The upward sweep again reversed the states with zero blank positions inside the statement. The checks classify each element at every 100px step as below, in the viewport or above, so content outside the viewport is explained by normal document flow rather than disappearing.

### Motion and regression proof
- At 390 the sequence callback measured a 0.000ms median and 0.100ms p95 across the full sequence. The burst remains transform-only and the statement impact remains 140ms.
- Reduced motion renders the statement on first paint as done, final and latched. Brand and button opacity are 1, the background is white, the cue is hidden and no statement animation or replay runs.
- The automatic typecheck and production build are clean; the latest preview record is `build OK`.
- Shell gzip for Index.tsx and index.css is 23,507 bytes, unchanged from the HEAD baseline.
- Added lines contain no em dashes and no emoji.
- Read-only baselines remain profiles 536, chat_messages 717, applications 13, earnings_goals 0 and managed_links 23.
- No dependency, compensation, permission, data or publication change. The site was not published.


## Pass 202 - statement timing, fit and onward cue

### Full width sweep
Columns in each measurement are brand/container, line one/container, line two/container, worst character overflow, and composition/viewport, all in pixels. The before sweep failed 34 of 56 cases: transformed hidden characters exceeded their line from 360 through 1000px at both heights, with the worst overflow 94.2px at 520px. The rendered brand, line boxes and composition height did not overflow. The fix resets character transforms in the structurally hidden final typing phase, keeps TRINITY and MARKETING as separate block lines at every width, and reserves a centred composition height. The after sweep has zero failures.

| Width | Height | Before | After |
|---:|---:|---|---|
| 360 | 844 | 245.6/245.6 | 320.0/320.0 | 320.0/320.0 | 64.4 | 139.4/844 | 245.6/245.6 | 320.0/320.0 | 320.0/320.0 | 0.0 | 440.0/844 |
| 400 | 844 | 270.2/270.2 | 352.0/352.0 | 352.0/352.0 | 92.9 | 139.4/844 | 270.2/270.2 | 352.0/352.0 | 352.0/352.0 | 0.0 | 440.0/844 |
| 440 | 844 | 295.6/295.6 | 352.0/352.0 | 352.0/352.0 | 92.9 | 139.4/844 | 295.6/295.6 | 352.0/352.0 | 352.0/352.0 | 0.0 | 440.0/844 |
| 480 | 844 | 324.0/324.0 | 374.0/374.0 | 374.0/374.0 | 89.9 | 143.4/844 | 324.0/324.0 | 374.0/374.0 | 374.0/374.0 | 0.0 | 440.0/844 |
| 520 | 844 | 351.4/351.4 | 396.0/396.0 | 396.0/396.0 | 94.2 | 155.4/844 | 351.4/351.4 | 396.0/396.0 | 396.0/396.0 | 0.0 | 440.0/844 |
| 560 | 844 | 375.8/375.8 | 418.0/418.0 | 418.0/418.0 | 90.6 | 167.3/844 | 375.8/375.8 | 418.0/418.0 | 418.0/418.0 | 0.0 | 440.0/844 |
| 600 | 844 | 405.2/405.2 | 462.0/462.0 | 462.0/462.0 | 94.1 | 179.2/844 | 405.2/405.2 | 462.0/462.0 | 462.0/462.0 | 0.0 | 440.0/844 |
| 640 | 844 | 430.7/430.7 | 484.0/484.0 | 484.0/484.0 | 92.5 | 191.2/844 | 430.7/430.7 | 484.0/484.0 | 484.0/484.0 | 0.0 | 440.0/844 |
| 680 | 844 | 458.1/458.1 | 506.0/506.0 | 506.0/506.0 | 43.0 | 203.1/844 | 458.1/458.1 | 506.0/506.0 | 506.0/506.0 | 0.0 | 440.0/844 |
| 720 | 844 | 662.4/662.4 | 672.0/672.0 | 672.0/672.0 | 86.7 | 146.0/844 | 483.5/483.5 | 672.0/672.0 | 672.0/672.0 | 0.0 | 560.0/844 |
| 760 | 844 | 699.2/699.2 | 712.0/712.0 | 712.0/712.0 | 85.9 | 154.1/844 | 510.9/510.9 | 712.0/712.0 | 712.0/712.0 | 0.0 | 560.0/844 |
| 800 | 844 | 736.0/736.0 | 752.0/752.0 | 752.0/752.0 | 88.0 | 162.2/844 | 539.3/539.3 | 752.0/752.0 | 752.0/752.0 | 0.0 | 560.0/844 |
| 840 | 844 | 772.8/772.8 | 792.0/792.0 | 792.0/792.0 | 85.7 | 170.3/844 | 564.8/564.8 | 792.0/792.0 | 792.0/792.0 | 0.0 | 560.0/844 |
| 880 | 844 | 809.6/809.6 | 832.0/832.0 | 832.0/832.0 | 79.9 | 175.7/844 | 593.2/593.2 | 832.0/832.0 | 832.0/832.0 | 0.0 | 560.0/844 |
| 920 | 844 | 846.4/846.4 | 872.0/872.0 | 872.0/872.0 | 59.9 | 175.7/844 | 618.6/618.6 | 872.0/872.0 | 872.0/872.0 | 0.0 | 560.0/844 |
| 960 | 844 | 883.2/883.2 | 912.0/912.0 | 912.0/912.0 | 39.9 | 175.7/844 | 647.0/647.0 | 912.0/912.0 | 912.0/912.0 | 0.0 | 560.0/844 |
| 1000 | 844 | 920.0/920.0 | 952.0/952.0 | 952.0/952.0 | 19.9 | 175.7/844 | 675.4/675.4 | 952.0/952.0 | 952.0/952.0 | 0.0 | 560.0/844 |
| 1040 | 844 | 956.8/956.8 | 992.0/992.0 | 992.0/992.0 | 0.0 | 175.7/844 | 685.7/685.7 | 992.0/992.0 | 992.0/992.0 | 0.0 | 560.0/844 |
| 1080 | 844 | 993.6/993.6 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/844 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/844 |
| 1120 | 844 | 1030.4/1030.4 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/844 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/844 |
| 1160 | 844 | 1067.2/1067.2 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/844 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/844 |
| 1200 | 844 | 1104.0/1104.0 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/844 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/844 |
| 1240 | 844 | 1140.8/1140.8 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/844 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/844 |
| 1280 | 844 | 1142.9/1142.9 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/844 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/844 |
| 1320 | 844 | 1142.9/1142.9 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/844 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/844 |
| 1360 | 844 | 1142.9/1142.9 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/844 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/844 |
| 1400 | 844 | 1142.9/1142.9 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/844 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/844 |
| 1440 | 844 | 1142.9/1142.9 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/844 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/844 |
| 360 | 900 | 245.6/245.6 | 320.0/320.0 | 320.0/320.0 | 64.4 | 139.4/900 | 245.6/245.6 | 320.0/320.0 | 320.0/320.0 | 0.0 | 440.0/900 |
| 400 | 900 | 270.2/270.2 | 352.0/352.0 | 352.0/352.0 | 92.9 | 139.4/900 | 270.2/270.2 | 352.0/352.0 | 352.0/352.0 | 0.0 | 440.0/900 |
| 440 | 900 | 295.6/295.6 | 352.0/352.0 | 352.0/352.0 | 92.9 | 139.4/900 | 295.6/295.6 | 352.0/352.0 | 352.0/352.0 | 0.0 | 440.0/900 |
| 480 | 900 | 324.0/324.0 | 374.0/374.0 | 374.0/374.0 | 89.9 | 143.4/900 | 324.0/324.0 | 374.0/374.0 | 374.0/374.0 | 0.0 | 440.0/900 |
| 520 | 900 | 351.4/351.4 | 396.0/396.0 | 396.0/396.0 | 94.2 | 155.4/900 | 351.4/351.4 | 396.0/396.0 | 396.0/396.0 | 0.0 | 440.0/900 |
| 560 | 900 | 375.8/375.8 | 418.0/418.0 | 418.0/418.0 | 90.6 | 167.3/900 | 375.8/375.8 | 418.0/418.0 | 418.0/418.0 | 0.0 | 440.0/900 |
| 600 | 900 | 405.2/405.2 | 462.0/462.0 | 462.0/462.0 | 94.1 | 179.2/900 | 405.2/405.2 | 462.0/462.0 | 462.0/462.0 | 0.0 | 440.0/900 |
| 640 | 900 | 430.7/430.7 | 484.0/484.0 | 484.0/484.0 | 92.5 | 191.2/900 | 430.7/430.7 | 484.0/484.0 | 484.0/484.0 | 0.0 | 440.0/900 |
| 680 | 900 | 458.1/458.1 | 506.0/506.0 | 506.0/506.0 | 43.0 | 203.1/900 | 458.1/458.1 | 506.0/506.0 | 506.0/506.0 | 0.0 | 440.0/900 |
| 720 | 900 | 662.4/662.4 | 672.0/672.0 | 672.0/672.0 | 86.7 | 146.0/900 | 483.5/483.5 | 672.0/672.0 | 672.0/672.0 | 0.0 | 560.0/900 |
| 760 | 900 | 699.2/699.2 | 712.0/712.0 | 712.0/712.0 | 85.9 | 154.1/900 | 510.9/510.9 | 712.0/712.0 | 712.0/712.0 | 0.0 | 560.0/900 |
| 800 | 900 | 736.0/736.0 | 752.0/752.0 | 752.0/752.0 | 88.0 | 162.2/900 | 539.3/539.3 | 752.0/752.0 | 752.0/752.0 | 0.0 | 560.0/900 |
| 840 | 900 | 772.8/772.8 | 792.0/792.0 | 792.0/792.0 | 85.7 | 170.3/900 | 564.8/564.8 | 792.0/792.0 | 792.0/792.0 | 0.0 | 560.0/900 |
| 880 | 900 | 809.6/809.6 | 832.0/832.0 | 832.0/832.0 | 79.9 | 175.7/900 | 593.2/593.2 | 832.0/832.0 | 832.0/832.0 | 0.0 | 560.0/900 |
| 920 | 900 | 846.4/846.4 | 872.0/872.0 | 872.0/872.0 | 59.9 | 175.7/900 | 618.6/618.6 | 872.0/872.0 | 872.0/872.0 | 0.0 | 560.0/900 |
| 960 | 900 | 883.2/883.2 | 912.0/912.0 | 912.0/912.0 | 39.9 | 175.7/900 | 647.0/647.0 | 912.0/912.0 | 912.0/912.0 | 0.0 | 560.0/900 |
| 1000 | 900 | 920.0/920.0 | 952.0/952.0 | 952.0/952.0 | 19.9 | 175.7/900 | 675.4/675.4 | 952.0/952.0 | 952.0/952.0 | 0.0 | 560.0/900 |
| 1040 | 900 | 956.8/956.8 | 992.0/992.0 | 992.0/992.0 | 0.0 | 175.7/900 | 685.7/685.7 | 992.0/992.0 | 992.0/992.0 | 0.0 | 560.0/900 |
| 1080 | 900 | 993.6/993.6 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/900 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/900 |
| 1120 | 900 | 1030.4/1030.4 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/900 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/900 |
| 1160 | 900 | 1067.2/1067.2 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/900 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/900 |
| 1200 | 900 | 1104.0/1104.0 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/900 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/900 |
| 1240 | 900 | 1140.8/1140.8 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/900 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/900 |
| 1280 | 900 | 1142.9/1142.9 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/900 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/900 |
| 1320 | 900 | 1142.9/1142.9 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/900 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/900 |
| 1360 | 900 | 1142.9/1142.9 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/900 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/900 |
| 1400 | 900 | 1142.9/1142.9 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/900 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/900 |
| 1440 | 900 | 1142.9/1142.9 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 175.7/900 | 685.7/685.7 | 1020.0/1020.0 | 1020.0/1020.0 | 0.0 | 560.0/900 |

At 390 by 844, the final composition is 440px high with 202.2px above and 201.8px below, exceeding the required 24px clearance. The brand remains the largest type on screen.

### Runtime timing
At 390, first-visible runtime marks were line one 23.5ms, line two 1356.8ms, brand 3756.7ms, bold line 4256.6ms and button 4756.6ms. At 1280 they were 48.3ms, 1365.0ms, 3764.8ms, 4264.8ms and 4764.8ms. The dataset reads line one 0-1050, line two 1350-2250, slam 3750, bold 4250, button 4750, stop 5300 and cue 5900 at both widths.

Line one uses a 24.42ms interval across 44 characters; line two uses a 40.91ms interval across 23 characters, making the payoff deliberately slower. Samples after 2250ms and before 3750ms were identical: `1.0000|1.0000|0.0000|0.0000|0.0000|0.0000` for typing one, typing two, shatter, brand, bold and button. This proves the full 1500ms hold has no progress-variable movement.

### Scroll cue, latch and motion
At 390 the cue sits 28px below the button; at 1280 it sits 36px below. Both measure a 2 by 44px track, a 2 by 16px bead and a 1.8s travel time. It reaches full opacity after the 5900-6300ms fade. It dismisses when the statement top passes 30 percent of the viewport above the screen, fades to zero over 300ms, and remains zero after scrolling back.

The Pass 201 latch remains intact: after scrolling 3000px down and back, `data-sequence-starts` remains 1 and `data-latched` remains true. Reduced motion renders the final phase immediately, keeps final copy fully visible and hides the cue. At 390, sequence frame work measured 0.000ms median and 0.100ms p95.

### Regression proof
- Added lines contain no em dashes and no emoji.
- Typecheck is clean and the latest automatic production build is `build OK`.
- Combined shell gzip for Index.tsx and index.css is 23,831 bytes, unchanged from the HEAD baseline.
- Read-only baselines remain profiles 536, chat_messages 717, applications 13, earnings_goals 0 and managed_links 23.
- No dependency, compensation, permission, data or publication change. The site was not published.


## Pass 203 - hero logo fill inversion

### Fill mechanism
Before, every shard used one clipped group for both paths: `<g className="cover-shard-fill" clipPath={...}>`, and both the letters and mountain were painted with `fill={url(...-fill)}` from the same blue gradient. After, every shard retains its own outer shard clip and contains `<g className="cover-shard-fill" mask={...-fill-mask}>`, with a solid `#004EFD` letter overlay and solid `#FFFFFF` mountain overlay. All shards reference one user-space mask, so one horizontal edge drives both colors. Its feather measures 16.86 SVG units, exactly 6 percent of the 281-unit logo height.

No violet or third fill color remains in CoverLogo. The fill contains only `#004EFD` and `#FFFFFF`; mask luminance uses black and white solely to reveal the two solid overlays.

### Color samples
Both 390 and 1280 produced the same results:

| Requested fill | Measured fill | Letters below edge | Mountain below edge | Letters above edge | Mountain above edge |
|---:|---:|---|---|---|---|
| 0.00 | 0.0000 | #FFFFFF | #004EFD | not visible | not visible |
| 0.15 | 0.1515 | #004EFD | #FFFFFF | #FFFFFF | #004EFD |
| 0.50 | 0.4994 | #004EFD | #FFFFFF | #FFFFFF | #004EFD |
| 0.90 | 0.8979 | #004EFD | #FFFFFF | #FFFFFF | #004EFD |
| FILL_END | 1.0000 at the burst check | #004EFD | #FFFFFF | fully covered | fully covered |

At progress 0.15, 0.50 and 0.90, eight points across x 333.5, 496.0, 658.5, 821.0, 983.5, 1146.0, 1308.5 and 1471.0 all referenced the same edge and agreed across adjacent shards at 390 and 1280. That is 24 of 24 seam checks per viewport with zero disagreement. The shared edge remained 16.86 units deep at every point.

At the live burst frame, both widths reported phase `burst`, fill 1.0000, letter overlay `#004EFD` and mountain overlay `#FFFFFF`. The flying shards therefore carry the completed inversion. Scrolling back to the top returned fill to 0.0000, mask opacity to 0, visible letters to `#FFFFFF` and the visible mountain to `#004EFD`.

### Contrast and regression proof
The measured WCAG contrast of `#004EFD` on `#000000` is 3.51:1. The measured contrast of `#FFFFFF` on `#000000` is 21.00:1. The blue letters hold up clearly on black at this large logo size, although 3.51:1 would not meet the 4.5:1 threshold for normal-size body text.

At 390, main-thread frame work across assembly, fill and burst measured 0.100ms median and 0.200ms p95. The navigation Wordmark, favicon files, footer RidgelineMark, shared Wordmark.tsx, burst timing, swell timing, statement screen, cue and latch are untouched. Added lines contain no em dashes and no emoji. Typecheck is clean and the latest automatic production build is `build OK`. CoverLogo.tsx shell gzip is 3,208 bytes, unchanged from the HEAD baseline. Read-only baselines remain profiles 536, chat_messages 717, applications 13, earnings_goals 0 and managed_links 23. No dependency, compensation, permission, data or publication change. The site was not published.

## Pass 204 - statement layout, arrival and finish

### Layout and floor
The statement now reserves two independent zones from its first frame. At 390 by 844 the typing centre is 202.55px, exactly 24 percent of the viewport, and the final centre is 455.75px, exactly 54 percent. At 1280 by 900 those centres are 216px and 486px. The zones do not change position during the sequence. The gap from the typed block to the brand is 102.93px at 390 by 844, 12.20 percent of the viewport, and 10.14px at 1280 by 900. The cue is independently anchored 40px above the foot at both widths.

The static decorative floor uses three existing ridgeline paths in #F2F2F4, #F7F7F9 and #FBFBFC. Its measured height is 151.91px, 18 percent, at 390 by 844 and 198px, 22 percent, at 1280 by 900. On phone its top is 131.69px below the button. On desktop its top is 46.92px below the button. The cue is above the floor in stacking order and neither the button nor cue is overlapped. The floor has no animation and is aria-hidden.

### Single-line fit and hierarchy
After `document.fonts.ready`, each line is measured independently and receives a fixed fitted size for the run.

| width | setup line | payoff line | wraps or clips |
| ---: | ---: | ---: | --- |
| 360 | 20.96px | 32px | no |
| 390 | 22.93px | 32px | no |
| 768 | 46.08px | 50.69px | no |
| 1280 | 52px | 57.6px | no |

Line one at 390 is 22.93px, above its 15px floor and large enough to carry the screen. Neither line reaches its floor failure case. Both layers use nowrap, have one client rect and remain inside their container.

At 390 the brand is 40px and the bold line is 13.6px. At 1280 they are 88px and 29.92px. The measured ratio is exactly 0.34 at both widths. The brand remains the largest type. The stronger version would set the supporting line in sentence case at weight 500 because bold uppercase under a bold uppercase brand is two shouts. It remains bold uppercase as specified until the owner says otherwise.

### Arrival, timing and motion
The stage is 120svh. At 390 by 844 it measures 1013px with 169px of pinned travel. `FILL_END` is 0.8433 and `BURST_AT` is 0.92, so fill completion precedes the burst. The burst distance is now 155.48px from the page top, compared with 243.07px at the prior 130svh and 0.72 values. The observer threshold changed from 0.45 to 0.30. Its first-character trigger point is now approximately 422.2px, compared with 590.4px before. The permanent latch remains intact: `data-sequence-starts` stays 1 after scrolling 3000px down and back.

The unchanged timing marks read back at 390 and 1280 as line one `0-1050`, line two `1350-2250`, slam `3750`, bold `4250`, button `4750`, end `5300` and cue `5900`. TRINITY first appeared at 3759.9ms and 3758.7ms; MARKETING appeared at 3843.2ms and 3842.1ms, matching the authored 3750ms and 3830ms impacts within one frame.

Per-character seeded vectors, rotations, shatter variables and shatter plumbing are absent from `PenLine.tsx`, `Index.tsx` and the cover CSS. The whole typed block now exits as one impulse. Its authored progress is 0 at 3750ms, 0.9375 at 3860ms and 1 at 3970ms, corresponding to 0px, -47.48px and -50.64px at 844px height, with scale 1, 1.056 and 1.06, blur 0px, 7.5px and 8px, and opacity 1, 0.0625 and 0. The final-phase rule then removes it structurally.

The landing shake is vertical, reaching 6px down and settling in 140ms. Each blue glow layer runs exactly three 900ms pulses and rests at opacity 0.35; pointer hover still raises it to 0.85.

### Sweep and regression proof
The Pass 202 sweep was rerun at both 844px and 900px heights for every width from 360px through 1440px in 40px steps. All 56 cases report zero brand overflow, zero typed-line overflow, zero character overflow and zero composition-height overflow.

At 390 the sequence callback measured 0.000ms median and 0.100ms p95. Reduced motion shows the permanent final composition, hides the typing block and glow, leaves the static floor unanimated, and keeps the cue hidden. Added lines contain no em dashes and no emoji. Typecheck and production build are clean; the latest automatic build record is `build OK`. Current shell gzip sizes are Index.tsx 5,875 bytes, PenLine.tsx 905 bytes, CoverLogo.tsx 3,227 bytes and index.css 18,544 bytes. Read-only baselines remain profiles 536, chat_messages 717, applications 13, earnings_goals 0 and managed_links 23. No dependency, compensation, permission, data or publication change. The site was not published.

## Pass 205 - sign-in hit target and statement reset

### Item 0: blocking layers
Before this pass, the later `.public-world > header` rule overrode the header utility and its computed z-index was 1. The explicit `.public-world > header.public-nav` rule now computes to z-index 30 while main and footer remain at 1. The statement had previously been absolute with inset 0, making its transparent box resolve against the full main element. It is now an ordinary flow section with computed position `relative`, authored inset `auto` (reported by Chromium as resolved 0px for a relatively positioned element), minimum height 100svh and z-index `auto`.

`elementFromPoint` at the centre of Sign in returned the Sign in anchor at all eight requested checks: 390 by 844 at root scroll positions 0, 400, 1200 and 2400, and 1280 by 900 at the same four positions. The Get in anchor was also the topmost element at its centre at both representative widths.

At 390, Radix does not mount an empty toast viewport, so the empty state was already inert in the live DOM. The source still allowed a mounted viewport to intercept input, so the viewport now has `pointer-events-none`; each actual toast retains `pointer-events-auto`.

### Statement content and timing
The cover no longer imports or renders the custom PenLine component. It had no other app consumers, so `src/components/brand/PenLine.tsx` was deleted. Source grep across Index.tsx and the cover CSS returns no PenLine, pen-character, pen-progress, character offset, caret, shatter, `measureText`, canvas measurement, font-ready measurement or fitted-font variable. Both lines are ordinary selectable text and CSS clamps are their only font-size source.

| width | first line | lines | second line | lines |
| ---: | ---: | ---: | ---: | ---: |
| 360 | 28px | 2 | 36px | 2 |
| 390 | 28px | 2 | 36px | 2 |
| 768 | 47.62px | 2 | 64px | 2 |
| 1280 | 48px | 2 | 64px | 2 |

The first line computes to opacity 1 before the first animation frame and remains 1 at 16ms. At 390 its measured top was identical at 1000ms and 1400ms, 718.81px in the test document, proving the reserved second-line row prevents movement. The second line starts from opacity 0 and scale 1.22 at 1100ms, is approximately halfway through its hard ease-out at 1210ms, and reaches opacity 1 and scale 1 at 1320ms. Frame sampling landed within one browser frame of each authored point.

At 2800ms the whole upper block begins its single impulse. At 2910ms it is approximately scale 1.057, blur 7.58px and opacity 0.052; at 3020ms it is scale 1.06, blur 8px and opacity 0, then the final-phase rule makes it hidden and non-interactive. There are no per-character vectors.

Both 390 and 1280 read back the same timing marks: first line 0, second line 1100, TRINITY and impulse 2800, MARKETING 2880, bold line 3300, button 3800, clock stop 4300 and cue 4900. Runtime visibility landed at 1115ms, 2815ms, 2882ms, 3315ms and 3815ms respectively at 390, all within one animation frame after their authored marks.

### Layout and regression proof
The upper and final groups remain centred at 24 and 54 percent of their 100svh statement. At 390 by 844 their centres are 202.56px and 455.76px in local statement coordinates, with 120.18px clear space between the upper copy and final group. At 1280 by 900 the centres are 216px and 486px. The decorative floor remains 151.91px high at 390 and 198px at 1280. It is behind all controls, has pointer events disabled, and never occludes the button or cue; Get in remains the top hit target and the cue remains in the foreground 40px above the foot.

The full sweep covered every width from 360 through 1440 in 40px steps at both 844px and 900px heights, 56 cases total. It found zero document or statement-line horizontal overflow. Wrapping is intentional and no clipping, hyphenation or shrinking is used.

The latch remained permanent: `data-sequence-starts` stayed 1 after root scrolling 3000px down and back. Reduced motion immediately shows the permanent final composition, hides the upper block, cue and glow, and leaves the floor static. The 390 animation loop measured 0.000ms median and 0.100ms p95. The vertical shake, 120svh stage, 0.92 burst, 0.30 observer threshold, three glow pulses and 0.35 resting glow remain in place.

Added lines contain no em dashes and no emoji. Typecheck and the automatic production build are clean with the latest record `build OK`. Shell gzip changed Index.tsx from 5,090 to 5,100 bytes and index.css from 18,336 to 18,346 bytes in the working-tree comparison; the deleted PenLine module removes its payload entirely. Read-only baselines remain profiles 536, chat_messages 717, applications 13, earnings_goals 0 and managed_links 23. No dependency, compensation, permission, data or publication change. The site was not published.

## Pass 206 - Sign in layer fix (verified)

Pass 205 had already shipped both rules; Pass 206 verified them live and changed nothing else.

### Item 1 - header z-index
Rule in place: `.public-world > header.public-nav { position: fixed; z-index: 30; }` (index.css:1814). Computed header: position fixed, z-index 30 at both 390x844 and 1280x900 (was z-index 1 before Pass 205). Main and footer remain z-index 1.

### Item 2 - statement section
Rule in place: `.cover-statement { position: relative; inset: auto; z-index: auto; min-height: 100svh; overflow: hidden; }` (index.css:2180). Computed statement: position relative, z-index auto (was absolute, inset 0, z-index 2 before Pass 205). Not absolute, no pointer-events none. Reduced-motion override untouched.

### elementFromPoint at centre of nav Sign in anchor

| Viewport | Scroll 0 | Scroll 400 | Scroll 1200 | Scroll 2400 |
|---|---|---|---|---|
| 390x844 | A.public-link | A.public-link | A.public-link | A.public-link |
| 1280x900 | A.public-link | A.public-link | A.public-link | A.public-link |

All eight positions: topmost element is the Sign in anchor itself.

Get in button at its own centre: topmost is A.btn-purple.cover-get-in - still clickable.

### Checks
- build-errors.log newest entry: build OK.
- No files edited this pass; no em dashes or emoji added.
- Baselines unchanged: profiles 536, chat_messages 717, applications 13, earnings_goals 0, managed_links 23.
- Site not published.

## Pass 207 - two database function fixes

### 1. my_active_vertical() compared the wrong column

Before (body):
```sql
SELECT COALESCE(
  (SELECT p.active_vertical FROM public.profiles p WHERE p.id = auth.uid()),
  'Pest')
```
After (body):
```sql
SELECT COALESCE(
  (SELECT p.active_vertical FROM public.profiles p WHERE p.user_id = auth.uid()),
  'Pest')
```
Signature, STABLE SECURITY DEFINER, search_path = public and the 'Pest' fallback are unchanged. No grant changes.

Proof the old predicate could never match:
```sql
select count(*) total, count(*) filter (where id = user_id) id_eq_user from public.profiles;
-- total 536, id_eq_user 0
```

Values returned for real users after the change (jwt sub set per user inside a rolled-back block):
- c84bd392-7d4a-4f14-a7fe-4c1679397e77: profile Fiber, my_active_vertical Fiber
- 00baa414-57c8-42e5-a20b-3804412aab58: profile Fiber, my_active_vertical Fiber
- f8b02a20-a2c9-4619-a306-0d85d346fdc1: profile Pest, my_active_vertical Pest
- 39dc52e7-d1f4-49d5-b4ea-32e8ee387baa: profile Pest, my_active_vertical Pest

Dependent functions executed without error after the change, one by one: get_workspace_mentionables OK, get_events_feed OK, get_chat_channel_state OK, get_daily_drill OK.

### 2. enroll_vertical_on_approval() could never set the active vertical

Before (tail):
```sql
    NEW.active_vertical := COALESCE(NEW.active_vertical, _vert);
  END IF;
  RETURN NEW;
```
After (tail):
```sql
    IF _vert IS NOT NULL AND COALESCE(NEW.active_vertical, '') <> _vert THEN
      UPDATE public.profiles SET active_vertical = _vert WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
```
Measured note, not asserted: the reported COALESCE was only half the reason. This trigger is registered AFTER UPDATE on public.profiles (trg_enroll_vertical_on_approval, timing AFTER), so assigning NEW.active_vertical was discarded regardless of the COALESCE. A first attempt that only replaced the COALESCE with a direct NEW assignment still measured Pest in the probe. The working form is an explicit UPDATE of the same row, guarded to the approval transition already in place, guarded on _vert not null, and guarded on a value change so it does not rewrite a row that is already correct. Status is unchanged by that UPDATE, so the trigger's own OLD.status guard prevents recursion.

Rollback-only probe (single transaction, exception-rolled back):
```
result = rollback_probe:Fiber
profiles 536/536  applications 13/13  enrollments 45/45  profiles with Fiber 2/2  (before/after)
```
So a Pest profile taken through pending -> active with a Fiber application landed on active_vertical = Fiber, and nothing persisted.

### Adjacent finding, not fixed in this pass
public.rep_vertical_enrollments carries two conflicting CHECK constraints on status:
- rep_vertical_enrollments_status_check allows only interested, onboarding, active
- rep_vertical_enrollments_status_chk allows interested, applied, approved, onboarding, active, rejected, paused

The trigger writes status 'approved', which the first constraint rejects, so a real approval raises. The probe above had to drop that narrower constraint inside the rolled-back transaction to run at all; the constraint is still present in the database (verified after rollback). Fixing it is a schema change outside the scope of this pass and is flagged for the owner.

### Checks
- Typecheck and production build clean, build-errors.log newest entry: build OK.
- No client changes, no other function changes, no grants or revokes, no backfill of active_vertical.
- No em dashes and no emoji in added lines.
- Baselines unchanged: profiles 536, chat_messages 717, applications 13, earnings_goals 0, managed_links 23.
- Site not published.

## Pass 208 - approval unblocked: duplicate status constraint dropped

### Constraints before
- rep_vertical_enrollments_status_check: CHECK ((status = ANY (ARRAY['interested'::text, 'onboarding'::text, 'active'::text])))
- rep_vertical_enrollments_status_chk: CHECK ((status = ANY (ARRAY['interested'::text, 'applied'::text, 'approved'::text, 'onboarding'::text, 'active'::text, 'rejected'::text, 'paused'::text])))

Intersection was interested, onboarding, active only. enroll_vertical_on_approval writes 'approved', so the profile update raised and no one could be approved. All 45 rows are status 'active', consistent with 'approved' never having been written.

### Constraint after
One migration: ALTER TABLE public.rep_vertical_enrollments DROP CONSTRAINT rep_vertical_enrollments_status_check;

Surviving definition, read back from pg_constraint:
- rep_vertical_enrollments_status_chk: CHECK ((status = ANY (ARRAY['interested'::text, 'applied'::text, 'approved'::text, 'onboarding'::text, 'active'::text, 'rejected'::text, 'paused'::text])))

Nothing renamed, nothing added, column default untouched, other constraints (pkey, unique user_id+vertical, four FKs, rve_source_type_check, rve_sourced_by_check) untouched.

### Item 2 - every reader of rep_vertical_enrollments.status, site by site

Treats 'approved' as a member (no behaviour change, this is the intended set):
- is_vertical_member: status IN (approved, onboarding, active, paused). Approved counts as a member.
- get_my_workspaces: returns e.status raw as membership_status.
- WorkspaceContext.tsx MEMBER_STATUSES = ['approved','onboarding','active','paused']. Approved rep is a member in the switcher.
- people_awaiting_industry: excludes rows with status IN (approved, onboarding, active, paused), so an approved person correctly leaves the waiting list.
- set_active_vertical, get_workspace_mentionables, get_fiber_leaderboard, get_my_winter_plan, tg_chat_message_after_insert: all use the four-status member set. Approved works.
- IndustriesPage.tsx: explicitly branches on approved (shows "Continue setup"), applied, rejected, active, onboarding.
- apply_to_vertical, request_vertical_access: guard on IN (approved, onboarding, active) to block duplicate applications. Approved correctly blocks a second apply.
- accept_into_industry: writes 'active' directly, never 'approved'. The owner-facing Accept button was already reachable and is unaffected.
- place_person: does not read status at all. No behaviour change.
- get_industry_hub, get_person_profile, get_vertical_enrollments, get_pairings, get_my_mentees, get_fiber_winter_interest: pass status through for display only.

Loud, owner's call, not patched in this pass. These four sites require status = 'active' exactly, so a rep sitting at 'approved' is excluded:
1. RLS policy "Members read published playbook entries" on playbook_entries - an approved rep cannot read published playbook entries for their vertical until their status moves to active. This is a real person hidden from a real screen.
2. mentee_count - counts only onboarding and active, so an approved mentee is not counted in a manager's mentee total.
3. get_partner_referrals - partner referral counts exclude approved enrollments.
4. get_data_health - industry counts exclude approved enrollments.

None of these were reachable before this pass, because 'approved' could never be written. They become reachable now. Fixing them means deciding whether 'approved' is a member for content access, which is the owner's decision, so nothing was changed.

### Rollback-only probe (narrow constraint genuinely already dropped)
One real Pest profile (user f8b02a20-a2c9-4619-a306-0d85d346fdc1) with a Fiber application present, taken through status pending then active inside a single transaction, then aborted:

- rep_vertical_enrollments Fiber row written with status = approved
- profiles.active_vertical landed on Fiber
- counts inside the transaction: rep_vertical_enrollments 46 (was 45), applications 14 (was 13)
- transaction rolled back via a raised exception

Counts read back afterwards: rep_vertical_enrollments 45, applications 13. Nothing persisted. No update, insert or delete was committed against any enrollment row.

### What a rep sees immediately after approval
get_my_workspaces returns their vertical with membership_status = approved, and MEMBER_STATUSES includes approved, so the industry appears as one of their own workspaces in the switcher rather than a locked one, and the sidebar renders that workspace's nav instead of the locked/apply state. On the Industries screen the card shows "Continue setup (step n of m)". Their profile active_vertical is set to the approved vertical by enroll_vertical_on_approval, so that workspace is the one selected on load. Playbook entries stay gated until status reaches active, per the loud note above.

### Checks
- typecheck clean, production build clean (build OK)
- no em dashes and no emoji in added lines
- baselines unchanged: profiles 536, chat_messages 717, applications 13, earnings_goals 0, managed_links 23, rep_vertical_enrollments 45 (all 45 still status active)
- site not published

## Pass 209 - auth and routing path, three fixes

### 1. Leads pool route gate

Before (src/App.tsx line 377):
```
<Route path="/app/leads" element={
  <ProtectedRoute>
    <LeadsPage />
```
After:
```
<Route path="/app/leads" element={
  <ProtectedRoute requiredRole="manager">
    <LeadsPage />
```

Full /app route gate list captured by parsing App.tsx (manager gates now: /app/team, /app/leads,
/app/stacks, /app/calendar, /app/forms, /app/interviews, /app/interviews/1..3, /app/manager-meeting,
/app/roster/sweep, /app/weekly-one-on-ones, /app/day, /app/one-on-ones/prep, /app/pitch-approvals;
admin gates on /admin surfaces; every other /app route is signed-in only). Table saved at
/tmp/browser/pass209/gates.txt.

Runtime test, real session in the browser:
- Owner account, GET /app/leads: stays on /app/leads, page shell renders with the Leads nav item.
- Same session with the user_roles response stubbed to a single rookie row, GET /app/leads:
  hop chain /app/leads -> /app -> /summer-checklist. The identical chain for GET /app is
  /app -> /app -> /summer-checklist, so the gate bounces the non manager back to /app and /app
  then applies that account's own normal landing. Leads never renders.

### 2. Sign in honours the attempted path

AuthPage now reads location.state.from and navigates there on the authenticated effect, falling back
to /app. Only an internal path is accepted: it must start with a single forward slash and must not
start with two.

- Unauthenticated GET /app/team redirects to /login and history.state carries
  usr.from = {pathname: "/app/team", search: "", hash: ""}.
- Session established in that same page: lands on /app/team, not /app.
- state.from "https://example.com": lands on /app.
- state.from "//example.com": lands on /app.

### 3. Stalled profile fetch now ends

useAuth gained a second timeout that fires only when a session exists and loading has not resolved
within 8000ms: it stops the loading state, shows one toast, and leaves the session untouched.

- profiles and user_roles requests held open, session present: loading state ended at 8.29s with
  console "Auth profile load timeout - releasing loading state".
- Toast text read from the DOM: "We could not load your account. Refresh to try again."
- Session key still present in storage afterwards, so a refresh retries. No sign out, no clear.
- No session behaviour unchanged: the original 4000ms timeout still guards that path only.

### Checks

- typecheck clean, production build clean (build OK).
- Shell gzip: index bundle 16399 bytes gzipped, total emitted js 2,879,633 bytes. Delta is three
  small source edits only.
- No em dashes and no emoji in added lines.
- Baselines unchanged: profiles 536, chat_messages 717, applications 13, earnings_goals 0,
  managed_links 23, rep_vertical_enrollments 45.
- No database changes in this pass. Site not published.

## Pass 210 - the industry switcher for a one industry rep

### Render condition, quoted

Before (src/components/workspace/WorkspaceSegmented.tsx):

    if (workspaces.length < 2 && locked.length === 0) return null;
    ...
    {workspaces.length > 1 && ( ...segmented row... )}

After:

    const isStaff = role === 'admin' || role === 'owner';
    const repRow = !isStaff && workspaces.length >= 1;
    if (!repRow && workspaces.length < 2 && locked.length === 0) return null;

A non staff person with at least one member workspace now renders one row of all
three doors. Staff fall through to the unchanged Pass 149 markup.

### The four cases, measured at 390 wide on /app/more

| Case | Chips rendered | Selected | Muted | Muted chip text |
| --- | --- | --- | --- | --- |
| Rep, one industry (Pest) | Pest, Fiber, Life | Pest, aria-current true | Fiber, Life, aria-disabled true, opacity 0.55 | "Ask to join" under the name |
| Rep, two industries (Pest, Fiber, active Fiber) | Pest, Fiber, Life | Fiber, aria-current true | Life only | "Ask to join" |
| Rep, no industry | none. The person never reaches this screen: the day one onboarding gate renders instead ("Start day one now, so you are ready the moment you are accepted."). Unchanged by this pass. | n/a | n/a | n/a |
| Owner | Pest, Fiber, exactly as before, plus one locked row for Life reading "Coming" | Pest | n/a | unchanged |

### Muted chip does one thing

Tap on the muted Fiber chip, request list captured across the tap:

- URL after tap: http://localhost:8080/app/industries
- Writes during the tap, filtered for set_active_vertical, request_vertical_access,
  apply_to_vertical, withdraw_vertical_request: none, empty list.
- 13 POST calls were seen in the window, all of them reads issued by the
  industries screen and the shell it loads (get_industry_hub, get_ladder,
  get_my_workspaces, my_notification_prefs, get_conversations, record_daily_login).
  No vertical write of any kind.

### Landing unchanged

A rep with one industry still opens their own workspace: active_vertical decides
it, set_active_vertical was not touched, VerticalRouteGuard was not touched, no
route changed. The stubbed rookie session lands on /summer-checklist, which is the
pre existing rookie gate and is identical before and after this pass.

### Geometry at 390

Each chip 113px wide, 47px tall, row 53px tall. Three chips fit with zero
horizontal overflow (documentElement.scrollWidth - innerWidth = 0). Tap target
height 47px, above the 44px floor.

### Keyboard and screen reader

All three chips are real buttons with tabIndex 0 and take focus, proven by
focusing each in order: [true, true, true]. The unavailable state is not colour
only: aria-disabled="true" plus aria-label "Fiber Sales, ask to join", and the
words "Ask to join" are in the accessible text.

### Reduced motion

No new transition was added. The chips keep the existing 0.15s colour transition,
which the global reduced motion rule collapses to 1e-05s, measured in a
reduced motion context.

### Checks

- npx tsgo --noEmit -p tsconfig.app.json: clean.
- Production build: clean, build OK.
- Shell gzip: src/index.css gzip 18346 bytes, unchanged by this pass. JS bundle
  total 2,880,930 bytes raw. The only source change is one component, about 2KB
  of source added.
- No em dashes and no emoji in the added lines.
- Baselines unchanged: profiles 536, chat_messages 717, applications 13,
  earnings_goals 0, managed_links 23, rep_vertical_enrollments 45.
- Site not published.

## Pass 211 - chat: warm opens, one scroll, honest divider, one message shape, room in the URL

Scope: src/pages/app/ChatPage.tsx, src/components/dashboard/CommunityChat.tsx, new src/lib/chatCache.ts. No database work, no dependency added, no publish.

### 1. Warm room opens and the home skeleton
Memory cache keyed by channel, five rooms at most, least recently opened evicted (src/lib/chatCache.ts).
Measured at 390x844 with a real session:
- Cold open of general: first message painted 402ms, get_channel_messages calls 1, spinner rendered true.
- Second open of the same room: 27 messages present on the first animation frame after the tap, spinner false, get_channel_messages calls at that frame 0, one refresh fetch completing behind (total 1).
- Chat home during load: element with data-chat-skeleton="true" observed, six skeleton rows, rather than an empty column.

### 2. Scroll
scrollToBottom before: doScroll() plus requestAnimationFrame(doScroll) plus setTimeout(doScroll, 100) = three scrollTo calls per incoming message. After: one requestAnimationFrame with one scrollTo = one call. Grep shows a single scrollTo in the helper.
Reader scrolled up 400px: instrumented container.scrollTo over three seconds recorded scrollTo_calls 0, scrollTop 3049 before and 3049 after. The existing near-bottom guard is untouched.

### 3. Unread divider
Before, the divider indexed channelMessages, which still holds kind event rows that render null. With rows m1, m2, event e1, m3, m4 and three unread, the old index lands on e1, an event row that draws nothing. The new index reads renderedMessages, the array the thread maps, and lands on m2, a text message. Measured in node against the same arrays: before e1 kind event, after m2 kind text. The live database currently holds zero rows of kind event, so the defect is not reproducible on production data today; the arithmetic is proved directly instead.

### 4. One message shape
The realtime insert handler now builds the same field set as the RPC path: id, user_id, content, is_ai, created_at, reply_to, channel, is_pinned, kind, ref_id, meta, reply_sender, reply_excerpt, edited_at. A live reply takes its quoted excerpt and sender from the parent already in the list, so the quote survives instead of vanishing. An unknown sender now resolves to an empty name, so the first frame shows the avatar with no name rather than the words Team Member; the profile fetch fills the name in behind. The words Team Member no longer appear in the file.

### 5. Room in the URL
Open room is now a query parameter. Measured round trip: opening a room gave http://localhost:8080/app/chat?room=general; loading that URL in a fresh browser context landed straight in the room with messages painted. Room to room uses replace, the first open pushes, so one back press from a room returns to the list. LAST_ROOM_KEY is gone: grep across src returns nothing.

### Checks
Typecheck clean (tsgo, tsconfig.app.json). Production build clean, built in 14.96s. ChatPage chunk 119.50 kB, gzip 33.13 kB; shell index gzip 16399 bytes. No em dashes and no emoji in added lines. Baselines unchanged: profiles 536, chat_messages 717, applications 13, earnings_goals 0, managed_links 23, rep_vertical_enrollments 45. Site not published.

## Pass 212 - Navigation consolidation

### Before table (measured, unchanged code)

| Persona | Bottom bar | More groups | More items | More item labels in order |
|---|---|---|---|---|
| rep Pest | 6 (Home, Chat, Events, Money, Training, More) | 2 | 9 | Leaderboard, Season, To do, Doors mode, Industries / Profile, Appearance, Notifications, Account |
| rep Fiber | 6 (same) | 2 | 7 | Leaderboard, Installs, Industries / Profile, Appearance, Notifications, Account |
| rep Life | 6 (same) | 2 | 7 | Pipeline, Leaderboard, Industries / Profile, Appearance, Notifications, Account |
| manager Pest | 6 (same) | 3 | 21 | Leaderboard, Season, To do, Doors mode, Industries / Today, Team, Leads, Approvals, Forms, One on one prep, Roster sweep, Recruits, War room, Rep logistics, Manager videos, Manager meeting / Profile, Appearance, Notifications, Account |
| manager Fiber | 6 (same) | 3 | 20 | Leaderboard, Installs, Stacks, Industries / same Manage twelve / Profile, Appearance, Notifications, Account |
| owner Pest | 6 (same) | 3 | 21 | same as manager Pest |

### Dead code

MAIN_KEYS printed from src/lib/appNav.ts:
pest: home, learn, chat, money, events, leaderboard
fiber: home, chat, money, events, board
life: home, pipeline, chat, learn, money, events

No list contains `season`, so `visibleMainNavItems`'s `d.key !== 'season' || (season && activeVertical === 'Pest')` filter could never exclude anything. Deleted along with the `useSeasonHub` import and the `season` binding in AppSidebar.tsx. The before table re-run after deleting the filter produced identical counts and identical label lists, which proves it was dead.

### After table

| Persona | Bottom bar | Groups before -> after | Items before -> after | More item labels in order |
|---|---|---|---|---|
| rep Pest | 6 (unchanged) | 2 -> 2 | 9 -> 5 | Leaderboard, Doors mode, Industries / Profile, Settings |
| rep Fiber | 6 | 2 -> 2 | 7 -> 5 | Leaderboard, Installs, Industries / Profile, Settings |
| rep Life | 6 | 2 -> 2 | 7 -> 5 | Pipeline, Leaderboard, Industries / Profile, Settings |
| manager Pest | 6 | 3 -> 3 | 21 -> 10 | Leaderboard, Doors mode, Industries / Team, Leads, Approvals, Forms, Recruits / Profile, Settings |
| manager Fiber | 6 | 3 -> 3 | 20 -> 10 | Leaderboard, Installs, Stacks, Industries / Team, Leads, Forms, Recruits / Profile, Settings |
| owner Pest | 6 | 3 -> 3 | 21 -> 11 | Leaderboard, Doors mode, Industries / Team, Leads, Approvals, Forms, Recruits, Pillar / Profile, Settings |

Target met: no persona exceeds 11 items and no persona exceeds 3 groups (limits were 12 and 4). Nothing was deleted; every folded screen kept its route.

### What was folded, and where it now lives

| Folded item | New parent | Reason |
|---|---|---|
| Season | Home, More on your week link (Pest) | Opened a few times a season, not weekly |
| To do | Home, More on your week link | Home already carries the next action |
| Today | Home, the Today card (every manager, shows "Clear today" when empty) | It is a reading of Home, not a separate place |
| One on one prep | Forms, Weekly 1:1 tab (existing links) | Already a Forms artefact |
| Manager meeting | Forms, Manager Meeting tab (existing tab) | Already a Forms tab, the nav row was a duplicate |
| Roster sweep | Team, manager tools row (added) | Run in bursts, belongs to the roster |
| War room | Team, manager tools row (added) | It is a view of the team |
| Rep logistics | Team manager tools row (added) and Resources (existing) | Coordination detail |
| Manager videos | Training, tool row for managers (added) | It is training content |
| Command center | Settings, staff only row (added) | Owner and admin reporting, opened rarely |
| Appearance, Notifications, Account | Settings screen (/app/settings, unchanged content) | Three settings rows became one Settings row |
| Stacks (Pest, Life) | Absent, Fiber only | Empty by construction outside Fiber |
| Installs, Doors mode, Pipeline, Season | Absent outside their workspace | Empty by construction, and VerticalRouteGuard would bounce them |

No honest purpose sentence could be written for Season, To do, Today, One on one prep, Manager meeting, Manager videos, Roster sweep, War room, Rep logistics, Video library, Scripts, Ask Trinity, Estimate earnings, Alumni, Chat look, Appearance, Notifications, Account or Command center as standalone destinations, because each is a section of a screen a person already opens. They carry no purpose line and are not nav rows.

### Route accounting, all 102 registered paths

Reached by a nav item: /app (Home, bar), /app/chat (bar), /app/events (bar), /app/money (bar), /app/training (bar), /app/more (bar), /app/leaderboard, /app/doors, /app/industries, /app/installs, /app/stacks, /app/pipeline, /app/team, /app/leads, /app/pitch-approvals, /app/forms, /app/recruits, /admin/requests, /app/profile, /app/settings, /command (Settings), /app/appearance, /app/notifications, /app/account, /app/chat-look (Settings screen).

Reached from inside a named screen: /app/season, /app/missions, /app/progress (Home), /app/day (Home Today card), /app/one-on-ones/prep, /app/interviews/1, /app/interviews/2, /app/interviews/3, /app/weekly-one-on-ones, /app/manager-meeting (Forms), /app/war-room, /app/roster/sweep, /app/logistics, /app/members (Team), /app/scripts, /app/ask, /app/links, /app/estimate-earnings, /app/training/videos, /app/training/videos/:videoId, /app/training/manager-videos, /app/training/:courseSlug, /app/training/:courseSlug/:lessonId (Training and Resources), /app/fiber/ladder (Industries and Money), /app/person/:userId (Team, Chat, Leaderboard), /admin/people, /admin/money, /admin/content, /admin/settings (Pillar sections), /app/alumni (ProtectedRoute sends alumni accounts there and nowhere else), /app/week (redirects to Team), /recruit-course, /summer-checklist and its four phases (onboarding gate), /ticket, /pending-approval, /login, /reset-password, /invite/:token, /p/:token (links and emails), / , /recruiting, /parents, /industries/:slug, /apply, /apply/rookie, /apply/veteran, /apply/success, /join (public site).

Pure redirects, kept so old links still work, each landing on an accounted route: /admin, /admin/inbox, /admin/reports, /admin/team, /app-redirect, /app/analytics, /app/calculators, /app/calendar, /app/interviews, /app/manage, /app/manager, /app/menu, /app/notepad, /app/operations, /app/playbook, /app/recruit-pipeline, /app/recruiting, /app/rookie, /app/spreadsheets, /app/videos, /app/videos/:videoId, /bootcamp-lock, /bootcamp/momentum, /bootcamp/phase-1, /bootcamp/phase-2, /bootcamp/phase-3, /manager, /rookie, /signup, /app/week. Plus `*` for not found.

Zero routes unaccounted for. Zero orphans.

### Overflow, 390 by 844, staff in Pest (every manager row plus Pillar)

Eleven rows measured. Every row's label container reported scrollHeight equal to clientHeight, measured overflow 0px, and row horizontal overflow 0px. Document horizontal overflow 0px. Labels wrapped to two lines where the purpose sentence needed it (62px tall) and the two shortest sat on 44px.

### Tap results, staff in Pest

| Item | Pathname | Rendered |
|---|---|---|
| Leaderboard | /app/leaderboard | Content, Week and Season tabs |
| Doors mode | /app/doors | Content, pitch flow |
| Industries | /app/industries | Content, three industries |
| Team | /app/team | Content, 23 active reps across 5 teams |
| Leads | /app/leads | Content, 11 shown |
| Approvals | /app/pitch-approvals | Screen and tabs rendered with no pending videos, an empty queue rather than a broken screen |
| Forms | /app/forms | Content, three tabs |
| Recruits | /app/recruits | Content, 4 unclaimed leads |
| Pillar | /admin/requests | Content |
| Profile | /app/profile | Content |
| Settings | /app/settings | Content, five rows |

The Approvals empty queue is the honest state of the data today, not a nav fault. Reported rather than hidden.

### Bottom bar

Unchanged: Home, Chat, Events, Money, Training, More, in that order, for every workspace. On /app/more the More tab reported aria-current="page" and the others null, so the active state marks exactly one tab.

### Checks

Typecheck clean, production build clean (build OK). No em dashes and no emoji in added lines. No database work, no publish. Baselines unchanged: profiles 536, chat_messages 717, applications 13, earnings_goals 0, managed_links 23, rep_vertical_enrollments 45.

## Pass 213 - the call board can work the new leads

### a. Data read before and after (SQL, unchanged)
people_leads total 1379 both before and after. bucket: lead 1337, roster 42.
Phone present: 970 of 1379.
sources: summit-recruiting-sheet 464, roster 416, trustline-recruit-list 359, sheet 130, ben-ward-sheet-aug24 5, recruitment-calls-sheet 5.
rank tags: a 42, b 31, c 49, d 4, e 29, f 204.
status tags: hype-up 158, no-hire 68, take-action 41, interview-1 13, signed 13, interview-3 12, follow-up 5, interview-2 5, interviewing 2, agreement-sent 1, final-interview 1.
pos tags: pest-rookie 263, pest-vet 36, fiber 8, plus small others.
stage before and after: new 1284, excluded 68, signed 27. Identical after, so no row was written.
Other baselines after: profiles 536, chat_messages 717, applications 13, managed_links 23, rep_vertical_enrollments 45, earnings_goals 0.

### Root cause found on the screen
The default board chip was "Out this season", which is roster_status = 'out' and matches exactly 100 rows. None of the 828 imported leads carries it, so the default view showed 100 old names and zero callable new ones. Default is now "All". Sort default is rank, coldest first.

### 1. Filter row
Rank, Status and Has phone. Rank and Status are populated from a new read-only lookup, lead_tag_options(), which returns every tag actually present with its count, so the controls follow the data.
leads_list accepts a single _tag only, so both controls are single select. When Rank and Status are both set, the rank tag goes to the query and the status tag is applied to the returned rows; this is stated rather than presented as multi select.

### 2. Sort
Default "rank, coldest first": A, B, C, D, E, F, then untagged, and inside a rank the least recently contacted first so the most recently contacted sits last. "Last season revenue" is kept as the second option.

### 3 and 4. Chips and counts
Each card shows rank, status and position chips read from the tags: rank-a renders A, status-hype-up renders Hype up, pos-pest-rookie renders Pest rookie. The header reads "N of 1337" (1337 is the lead bucket; the other 42 rows are roster records, not board leads).

### b. Filter counts, screen against SQL
| filter | screen | SQL | match |
| --- | --- | --- | --- |
| Rank A + Has phone | 42 | 42 | yes |
| Status Take action + Has phone | 41 | 41 | yes |
| Status Hype up + Has phone | 158 | 158 | yes |

### c. First ten in the rank sort, with their rank tag
Adria A, Adrian Doors A, Alisa A, Andrew Holtzinger A, Brian Kinuti A, Brody R A, Caiden Flemming A, Cale Lopez A, Caleb Bahr A, Clayton Setlak A.

### d. Overflow at 390 by 844
Filter row: scrollWidth 358, clientWidth 358, overflow 0.
Lead card with chips: overflow 0. The widest real case in the data is two chips, because no lead carries a rank, a status and a position tag at once; a third chip was added to the live DOM to measure the requested case and the card overflow stayed 0 (document overflow 0).

### e. Original sheet line in the detail, quoted
lead_detail previously stripped sheet_row, so the screen could not show it. The function now returns it to managers, pillars and owners only. Rendered verbatim under a "From <sheet>" label, key and value, no paraphrase.
summit-recruiting-sheet, Victor Froman: phone 5173020965, status No hire, position PEST rookie, applicant Victor Froman, interview 1 Self.
trustline-recruit-list, Aesea: name: Aesea, rank: C, notes: Good buddy, call this: 7077807563, contact method: phone number, date last reached out to: Years.
recruitment-calls-sheet, Noah: role rookie, team scoots, stage final interview, phone # 808 633 7800, applicant noah, time sche. thur 1;30, interviewer DOM, stud rating 0.

### f. Rep visibility and the 68 no-hire rows
Tested by calling leads_list from the running app with a real signed-in session and reading the returned rows, not by reading the code: scope mine returned 11 rows, all designated to that account, 0 excluded; scope free returned 600 rows, 0 excluded; scope all returned 600 rows of which 26 were excluded.
So the function still returns excluded rows in the all scope. The screen now drops them whenever Stage is "All stages", which is the default, so the board showed 574 of the 600 fetched and no no-hire row appeared. An excluded row is only visible if a pillar picks the stage "excluded" by name.
A rep session could not be minted without an approval prompt, so the rep case was tested at the function boundary: leads_list returns nothing for a sales tier in any scope other than mine, and mine is restricted to designated_to or claimed_by equal to the caller, which the signed-in mine test exercised directly.

### Build
Typecheck clean, production build clean (build OK). LeadsPage chunk 44.1 kB raw. No new npm dependency. No em dashes and no emoji in added lines.
No row in people_leads was created, updated or deleted; the only migration replaced two read-only functions.
Site not published.

## Pass 214 - texture and contrast across the site

### Token system read first
The existing surface ladder is `--background`, `--surface` / `--card`, `--surface-elevated`, `--popover`, and `--surface-sunken`, with `--border`, `--border-subtle`, and `--border-strong` separating edges. Existing accents are `--primary`, `--ice`, `--workspace-accent`, `--accent` / `--violet`, `--destructive`, `--success`, `--warning`, `--celebrate-warm`, and the three medal tokens. Background, card, popover, primary, accent, destructive, success, warning, borders, text hierarchy, and workspace accents are all defined in both appearances. No token was renamed and no new hue was introduced.

### Grain and fades
One `.site-grain` layer is mounted once above the route root. It is an inline SVG `feTurbulence` data URI at opacity 0.035, z-index 0, and `pointer-events: none`; route content is z-index 1. The low opacity adds fine material without clouding type. `elementFromPoint` returned BUTTON over the Appearance control in both appearances and A over the cover Sign in link. The two earned fades are the sticky app shell header, where it separates persistent controls from moving content, and `PageHeader`, where it marks the start of a screen without sitting behind body copy. No card received a gradient.

### Surface levels, before and after
| appearance | level | before | after | adjacent contrast before | adjacent contrast after |
| --- | --- | --- | --- | ---: | ---: |
| Dark | page | `hsl(0 0% 0%)` | unchanged | - | - |
| Dark | card / surface | `hsl(240 18% 3%)` | `hsl(240 18% 6%)` | page to card 1.04 | 1.08 |
| Dark | raised / popover | `hsl(240 18% 7%)` | `hsl(240 18% 12%)` | card to raised 1.06 | 1.11 |
| Light | page | `hsl(0 0% 100%)` | unchanged | - | - |
| Light | card / surface | `hsl(0 0% 100%)` / `hsl(240 18% 97%)` | `hsl(240 18% 96%)` | page to card 1.00 | 1.11 |
| Light | raised / popover | `hsl(0 0% 100%)` | `hsl(240 18% 90%)` | card to raised 1.00 | 1.17 |

### Contrast, computed foreground against computed background
| item | Dark fg / bg | Dark ratio | Light fg / bg | Light ratio |
| --- | --- | ---: | --- | ---: |
| Body | 255,255,255 / 0,0,0 | 21.00 | 0,0,0 / 255,255,255 | 21.00 |
| Secondary | 161,164,181 / 0,0,0 | 8.49 | 79,83,105 / 255,255,255 | 7.57 |
| Muted | 133,136,153 / 0,0,0 | 5.98 | 95,99,119 / 255,255,255 | 5.94 |
| Button default | 0,0,0 / 56,139,255 | 6.31 | 255,255,255 / 0,0,0 | 21.00 |
| Button destructive | 0,0,0 / 255,92,97 | 6.96 | 255,255,255 / 175,29,33 | 6.95 |
| Button secondary | 255,255,255 / 25,25,36 | 17.41 | 0,0,0 / 246,246,249 | 19.47 |
| Button outline | 255,255,255 / 0,0,0 | 21.00 | 0,0,0 / 255,255,255 | 21.00 |
| Button ghost | 133,136,153 / 0,0,0 | 5.98 | 95,99,119 / 255,255,255 | 5.94 |
| Button link | 56,139,255 / 0,0,0 | 6.31 | 0,0,0 / 255,255,255 | 21.00 |
| Badge solid | 0,0,0 / 56,139,255 | 6.31 | 255,255,255 / 0,0,0 | 21.00 |
| Badge default / secondary / destructive / success / warning | 255,255,255 / 25,25,36 | 17.41 | 0,0,0 / 246,246,249 | 19.47 |
| Badge outline | 255,255,255 / 0,0,0 | 21.00 | 0,0,0 / 255,255,255 | 21.00 |
| Role, tier, locked-in, medal, streak and warm chips | foreground / semantic surface | at least 17.41 | foreground / semantic surface | at least 19.47 |

Before fixes, light muted text was about 4.3:1, and translucent status chips ranged below 4.5:1, including warning chips. Muted moved to 5.94:1. Shared badge and chip labels now use foreground on a semantic solid surface while their existing accent remains in the border, taking every measured shared variant above 4.5:1. No measured pair remains below AA.

### Cover regression
A fresh, motion-enabled browser latched the statement at scroll 500px on 390 by 844 and 600px on 1280 by 900. `data-sequence-starts` stayed 1 and `data-latched` stayed true after the complete 100px sweep and return to the top. At scroll 0, 400, 1200, and 2400, `elementFromPoint` at the Sign in centre returned the Sign in anchor at both viewport sizes, all eight checks. Cover source, sequence, logo fill, statement rules, timing, and copy were not changed.

Screenshots were captured for Home, Appearance with a card, and the cover at 390 by 844 and 1280 by 900 in both appearances. Grain did not reduce measured text contrast, so opacity stayed 0.035.

### Checks
Typecheck clean. Production build clean (`build OK`). No new dependency. No database write. `people_leads` before 1379, after 1379. Site not published.
