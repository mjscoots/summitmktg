# Plan: Pass 132 — Structure and Skin

## Navigation

- Replace every workspace-specific phone bar with exactly six destinations: Home, Chat, Events, Money, Training, and More, preserving unread badges, 44px targets, keyboard hiding, and safe-area clearance.
- Add a role-aware More screen that groups all remaining currently reachable app destinations, including leaderboard, team and management tools, scripts, resources, profile, and staff administration. Keep legacy redirects where route names have changed and make the header menu open the same complete destination model.
- Keep desktop navigation compact while ensuring every protected route still has a reachable parent destination or intentional deep-link path.

## Theme and Skin

- Make `system` the true default and apply the resolved phone color scheme to every workspace; retain the existing Dark, Light, and System profile override without forcing Pest/Fiber dark or Life light.
- Define complete semantic light and dark token sets, update browser chrome/wordmark/texture values with the resolved mode, and remove compatibility rules that merely repaint hardcoded dark utilities where the touched screens can use tokens directly.
- Normalize the shared visual language through existing global primitives and high-traffic app shells: one 12px card radius, one semantic hairline border, restrained elevation, coherent spacing/type, workspace accent for primary actions and chips, and destructive red only for destructive states. Preserve working layouts.

## Blitz and Money Scope

- Remove blitz content and imports from rep Money, command Money, and Admin Money surfaces while leaving all import/reconciliation pipeline panels intact.
- Keep blitz planning, official blitz cards, RSVP actions, and all related navigation on Events only.

## Verification and Report

- Confirm read-only baselines remain profiles 535, chat messages 716, people leads 551, calendar events 58, and blitz markets 30.
- At 390px verify six phone destinations, safe-area/content clearance, and no overlap; emulate both light and dark schemes on Home, Chat, Events, Money, and the cover, with screenshots for Home, Events, and cover in both modes saved under `docs/screens/`.
- Verify no blitz component imports remain in money pages, scan new visible copy for em dashes, check console/runtime output, run TypeScript and the production build, then append at most 14 lines under `## Pass 132 — Structure and skin` in `docs/FINAL_REPORT.md`. Do not publish.

