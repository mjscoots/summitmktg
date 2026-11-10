# Public recruiting conversion and dormant Meta hooks

## Public site changes
- Keep the existing HTML boot-cover and delayed Apply fallback in the production entry; do not publish.
- Add an immediately visible first-screen Apply button; change the statement action to Apply without changing burst/motion.
- Keep the header Apply, add See the role and a homepage mobile bottom Apply bar after a short scroll.
- Add For parents above the footer and one linked proof line in the bottom Apply band using only the two existing Pest earnings figures.
- Preserve all pages, names, compensation values, and signed-in /app and /admin behavior. Keep COVER_STATS=false.

## Dormant Meta support
- Configure an optional VITE_META_PIXEL_ID; missing/invalid ID means no Meta script, cookies or events.
- Add PageView on public navigation, Lead only after submit-application success, and a custom SchedulingClick on the existing call buttons (not a claimed completed booking).
- Do not add other analytics, server tracking, or contact matching.
- Since no consent choice or pixel is provided, keep activation gated pending an advertising consent decision; document this clearly. No banner or data transmission is added in this pass.
- Put the commented example in .env.example rather than changing the managed .env file.

## Technical details
- Reuse public header route visibility and existing Button components; isolate CSS to public recruiting elements.
- Add a small public-only Meta module with tests for missing-ID behavior, permission gates, public path eligibility and event semantics.
- Record architecture and activation requirements in AGENTS.md and a short tracking document.

## Verification
- Check first-screen and scrolled mobile Apply hit targets, statement Apply, See the role, parents and proof destinations at phone and desktop widths.
- Check slow/no-JavaScript HTML fallback and confirm no Meta network requests with the placeholder configuration.
- Exercise the existing application success/failure branches using mocked responses (no production test applicants or emails), checking hook placement and scheduling behavior.
- Run focused tests and check preview errors. Live Meta receipt stays unverified without an ID, consent setup and a later authorized publish.

## Existing security findings
The three shared season-results/pay-band/badge findings remain blocked on the owner's access decision: restricting them would change signed-in behavior, which this request explicitly forbids.
