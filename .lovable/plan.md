# Plan: Pass 140 — PWA Install and Visual Polish

## Installable App
- Keep the existing manifest-only install path: rename it to Summit MKTG HQ, preserve the correct `/app` launch scope, standalone display, and required 192px, 512px, maskable, Apple touch, and favicon assets rendered from the existing three-peak brand mark.
- Match manifest and browser chrome to the current semantic dark/light palette, keep the mobile install hint only on More, and make it a quiet one-line, platform-aware, dismissible per-device prompt.
- Remove the existing app-shell caching worker and registration because offline behavior was not requested. Ship the same-path cleanup worker for one release so returning browsers unregister stale caches safely without registering in preview.

## Daily Surface Polish
- Add a compact shared greeting showing the signed-in user’s first name, weekday, and date immediately above Updates on each active workspace Home, with reserved line height so loading does not shift the layout.
- Redesign the existing rank insignia around the seven database ranks and render it only when a real rank id/name exists on profile headers and person leaderboard rows. Use accessible title/label text and no placeholder for null ranks.
- Extract a token-based Supra ticket poster card shown only for positive ticket counts, preserving the real ticket count and existing Supra label without inventing prize or role claims.

## Technical Details
- Extend existing leaderboard data loading with profile rank joins/queries rather than changing ranking formulas or routes.
- Use semantic CSS tokens and existing controls; preserve navigation, routes, data, and permissions.
- Keep install metadata valid in both color schemes through manifest defaults plus runtime theme-color synchronization.

## Verification and Report
- Validate manifest fields and PNG dimensions, confirm no app service worker registers in preview, and verify the cleanup worker contains no offline caching.
- Verify null ranks render no mark and zero Supra tickets render no card through code checks; test Home and More at 390px with an authenticated session when available, otherwise record code proof.
- Check console/runtime telemetry, TypeScript, production build, responsive layout, user-facing em dashes, and append a concise `## Pass 140 — PWA install and visual polish` entry to `docs/FINAL_REPORT.md`. Do not publish.
