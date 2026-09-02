# Pass 153: Three Public Doors

## Build
- Add a shared public three-door component used on the cover and recruiting page.
- Load Pest, Fiber, and Life metadata from the backend verticals catalog, using existing industry-page copy and each vertical theme.
- Keep the cards stacked on phones and three across on desktop, matching the in-app hub-card shape, spacing, typography, and 44px controls.
- Route industry names to their public industry pages and route each CTA to the rookie application with `?vertical=` preselection. Keep Life as a small coming-soon page while its catalog status is `coming_soon`.

## Backend access
- Replace anonymous table-wide vertical access with column-level access limited to `name`, `short_name`, `slug`, `status`, and `theme`; retain the existing public-row policy.

## Verification
- Confirm cover stats remain disabled and no numeric proof appears on the cover.
- Verify all three application links preselect the correct required industry question and all industry pages return to the cover.
- Capture 390px and 1280px checks for `/` and `/recruiting`, check public console errors, user-facing copy, em dashes, TypeScript, production build, and unchanged profile/application baselines.
- Append the Pass 153 evidence and exact tile copy to `docs/FINAL_REPORT.md`. Do not publish.
