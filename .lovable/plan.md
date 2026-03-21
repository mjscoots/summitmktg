

## Recommendations: Full Codebase Cleanup

After auditing the project, here are the key issues and a phased plan to clean everything up.

---

### Current Problems Identified

1. **Massive single-file components** — `WarRoomPage.tsx` is 750 lines with 4 inline tab components. `hierarchyUtils.ts` is 887 lines with hundreds of hard-coded name aliases. `DashboardPage.tsx` is 400 lines. These are hard to maintain and prone to bugs.

2. **Duplicated downline-fetch logic** — The same edge-first-then-text-fallback pattern is copy-pasted in 6+ places (WarRoom tabs, BootcampStragglers, ManagerTrainingOverview, CalendarPage, EstimateEarningsPage). One bug fix requires touching all of them.

3. **Hard-coded name aliases in code** — `hierarchyUtils.ts` has 200+ hard-coded name mappings. These should live in the database, not in source code. Every new hire or name change requires a code deploy.

4. **Inconsistent role checks** — `role === 'manager' || role === 'admin' || role === 'owner'` is repeated everywhere instead of using a single helper like `isManagerOrAbove(role)`.

5. **No centralized error handling for data fetches** — Components silently swallow errors or just `console.error`. Users see blank screens with no feedback.

6. **Unused pages and dead routes** — `NotepadPage`, `SpreadsheetsPage`, `OperationsPage`, `AnalyticsPage` are all redirects now but the page files still exist. `AppRedirect.tsx` and `RookieDashboardPage.tsx` appear unused.

7. **Mobile responsiveness gaps** — Tables in WarRoom, Admin, and Downline views use fixed `grid-cols-4` without responsive breakpoints. Buttons overlap on small screens.

8. **No loading/error boundaries per section** — If one dashboard widget fails, the whole page can break or show a spinner forever.

---

### Phase 1: Extract & Consolidate (Biggest Impact)

**A. Create a shared `useDownline` hook**
Extract the duplicated edge-first/text-fallback downline fetching into one hook:
- `src/hooks/useDownline.ts`
- Accepts `userId` and `managerName`
- Returns `{ downline, isLoading, error }`
- Replace all 6+ copy-pasted instances

**B. Break up `WarRoomPage.tsx`**
Extract each tab into its own file:
- `src/components/warroom/DownlineTab.tsx`
- `src/components/warroom/TeamsTab.tsx`
- `src/components/warroom/PulseTab.tsx`
- `src/components/warroom/ActivityTab.tsx`
- Keep `WarRoomPage.tsx` as a thin shell (~50 lines)

**C. Create role helper utilities**
Add to `src/lib/roles.ts`:
```text
isManagerOrAbove(role) → boolean
isAdminOrAbove(role) → boolean
isOwner(role) → boolean
```
Replace all inline `role === 'manager' || role === 'admin' || role === 'owner'` checks across the codebase (~30 occurrences).

---

### Phase 2: Move Hard-Coded Data to Database

**A. Create `name_aliases` table**
Move the 200+ entries from `hierarchyUtils.ts` `NAME_ALIASES` into a database table:
- `normalized_name text PRIMARY KEY`
- `canonical_name text NOT NULL`
- Create an RPC to look up aliases

**B. Create `pillar_owners` mapping in the `teams` table**
The `PILLAR_OWNERS` constant should just reference `teams.leader_id`, which already exists. Remove the hard-coded mapping and use the DB field.

**C. Remove `HARD_CODED_ADMINS`**
These should be managed via `user_roles` table entries, not code arrays. Add proper admin roles in the database for these users and remove the 15-line hard-coded list.

---

### Phase 3: Delete Dead Code

Remove unused files:
- `src/pages/app/NotepadPage.tsx` (redirects to /app/links)
- `src/pages/app/SpreadsheetsPage.tsx` (redirects to /app/recruiting)
- `src/pages/app/OperationsPage.tsx` (redirects to /app/calendar)
- `src/pages/app/AnalyticsPage.tsx` (redirects to /app/manage)
- `src/pages/app/AppRedirect.tsx` (unused)
- `src/pages/app/RookieDashboardPage.tsx` (unused — dashboard is unified)
- `src/pages/app/ManagerDashboardPage.tsx` (unused — dashboard is unified)

---

### Phase 4: Mobile Responsiveness Pass

- Convert all `grid-cols-4` table layouts in WarRoom/Admin to card stacks on mobile (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)
- Add `overflow-x-auto` to all admin data tables
- Ensure sticky headers don't overlap content on small viewports
- Test all views at 375px width

---

### Phase 5: Error Resilience

- Add per-section error boundaries around dashboard widgets so one failing widget doesn't blank the whole page
- Add retry buttons on data fetch failures instead of silent console.error
- Add toast notifications for network failures users should know about

---

### Recommended Execution Order

| Step | Effort | Impact |
|------|--------|--------|
| 1A. `useDownline` hook | Medium | Eliminates 6x duplication, prevents drift bugs |
| 1B. Break up WarRoomPage | Medium | Makes tabs independently maintainable |
| 1C. Role helpers | Small | Cleaner code, fewer typo-bugs |
| 2A-C. DB-ify hard-coded data | Large | Eliminates deploy-on-name-change problem |
| 3. Delete dead files | Small | Reduces confusion and bundle size |
| 4. Mobile pass | Medium | Fixes reported overlapping buttons |
| 5. Error resilience | Medium | Prevents blank screens |

I'd recommend tackling these in 2-3 batches. Want me to start with Phase 1 (the consolidation work), or would you prefer a different priority?

