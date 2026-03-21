

## Fix: Fake Approvals, All-Time Leaderboard, Calendar Polish

### ISSUE 1 — Fake/Test Users in Approvals Queue

**Root cause**: Security scans created auth accounts via the signup flow. The `handle_new_user` trigger automatically sets `approved: false` for each, putting them in the pending approvals queue. All 32 records share identical patterns: name "New User", emails ending in `@example.invalid`, null phones.

**Fix (3 parts)**:

1. **Database migration**: Auto-reject all existing fake records by setting `approved = NULL, status = 'rejected'` for profiles matching test patterns:
   - `full_name = 'New User'`
   - email containing `example.invalid`, `poc-`, `test-`, `inject`, `xss`, `sqli`, `rce`, `bypass`
   - null phone with `@example.invalid` domain

2. **Frontend filter** in `AdminTeamPage.tsx`: Add a client-side filter so even if new test records appear before the next cleanup, they're excluded from the live approvals tab. Detection rules:
   - Name is generic ("New User", "Test User")
   - Email domain is `example.invalid` or contains test/security keywords
   - Phone is null AND email contains suspicious patterns

3. **Admin counts** in `useAdminCounts.ts`: Apply the same filter so the badge count excludes fake entries.

### ISSUE 2 — All-Time Leaderboard Empty State

**Root cause**: The DB function returns `bigint` columns, but the frontend code at line 211-217 of `TrainingLeaderboard.tsx` shows "No activity yet this period" for ALL modes when `entries.length === 0`. The actual RPC works (verified: Hewitt has 10445 pts). The problem is likely a **race condition or type casting issue** — the `(supabase as any)` cast works, but the empty state text is misleading.

**Fix**:
- Change empty state text to differentiate: for `overall` mode show "Loading all-time data..." or "No all-time activity recorded" vs the generic "No activity yet this period"  
- Add `console.warn` when all-time mode returns empty data so we can catch it in logs
- Ensure the `totalPoints` mapping handles BigInt → Number correctly (JS `Number()` cast on bigint values)

### ISSUE 3 — Calendar Redesign (Closer to Google Calendar)

**Current state**: Already has Month/Week/Day/Agenda views with filters. But needs significant polish.

**Changes to `CalendarPage.tsx`**:

1. **Top toolbar**: Move view mode toggles and filter pills into a unified toolbar bar (like Google Calendar's top bar: `< Today >  Month  Week  Day  Agenda`)
2. **"Today" button**: Add a quick-jump "Today" button between nav arrows
3. **Month view cells**: Increase min-height, show more events per cell (5 instead of 3), better event chip styling with rounded pill look
4. **Week view**: Add current-time red line indicator, better column borders, tighter hour labels
5. **Day view**: Add current-time indicator, better event card rendering with duration-based height
6. **Mini calendar sidebar**: Add a small month calendar in the side panel for quick date navigation (on wider screens only)
7. **Better empty states**: Show subtle "No events" instead of blank cells
8. **Event chips**: More Google Calendar-like pill shape with colored left border and subtle background
9. **Mobile**: Stack filters into collapsible drawer, maintain touch-friendly spacing

### Files Modified

| File | Changes |
|------|---------|
| New migration SQL | Auto-reject 32 fake test profiles |
| `src/pages/app/AdminTeamPage.tsx` | Add `isFakeTestRecord()` filter to exclude test entries from pending approvals |
| `src/hooks/useAdminCounts.ts` | Apply same fake-record filter to badge count |
| `src/components/leaderboard/TrainingLeaderboard.tsx` | Fix empty state text for all-time; add debug logging; ensure BigInt handling |
| `src/pages/app/CalendarPage.tsx` | Full redesign: toolbar, today button, time indicators, better grid, mini calendar |

### Execution Order
1. Database migration to auto-reject fake records (immediate fix)
2. Frontend approvals filter (prevents recurrence)  
3. Leaderboard empty state fix
4. Calendar redesign

