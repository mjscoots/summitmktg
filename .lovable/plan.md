

## Calendar Page Cleanup Plan

### Problems Identified
1. **Too cluttered**: "Today's Events" and "Upcoming This Week" panels above the calendar grid add visual noise
2. **Three tabs** (Calendar, RSVP, Team RSVPs) — user wants Team RSVPs removed
3. **Filters are confusing**: "All" only resets category filter, not location filter. User wants a single "All" that clears everything
4. **Recurring events don't require weekly re-confirmation** — user wants RSVPs to reset each week

### Changes

**1. Remove "Team RSVPs" tab entirely**
- Delete the `responses` tab button and the entire `activeTab === 'responses'` section
- Move the team responses view *inside* the RSVP tab as a toggle (manager-only)

**2. Restructure RSVP tab → "Weekly RSVP"**
- Rename tab label from "RSVP" to "Weekly RSVP"
- Add a "See Responses" toggle button at the top (visible to managers only) that swaps between the Tinder-style RSVP cards and the team responses list
- Add a back button when in "responses" sub-view

**3. Weekly RSVP reset for recurring events**
- Modify `pendingRSVPEvents` logic: for recurring/virtual events, generate a **week-scoped event ID** (e.g., `eventId__2026-W11`) so each week's instance requires a fresh RSVP
- When saving attendance for virtual recurring instances, store with the week-scoped ID
- This means recurring events appear as "pending" each new week

**4. Clean up the calendar view layout**
- Remove the "Today's Events" and "Upcoming This Week" sidebar panels above the grid — they duplicate what's already visible in the grid/list
- Instead, show a slim single-line "today summary" strip (e.g., "3 events today · 2 pending RSVP") that's less visually heavy
- The selected-day detail still shows when you click a date in the grid

**5. Fix "All" filter behavior**
- When user clicks "All" category filter, also reset `locationFilter` to `'all'`
- This makes "All" a true global reset

### File Changes

**`src/pages/app/CalendarPage.tsx`** (single file, all changes):
- Remove Team RSVPs tab button and section (~lines 589-602, 721-790)
- Rename RSVP → "Weekly RSVP"  
- Add `rsvpSubView` state (`'cards' | 'responses'`) inside the RSVP tab
- Move team responses UI into the RSVP tab behind the toggle
- Update `pendingRSVPEvents` memo to scope recurring event IDs by week
- Update `handleRSVP` / `handleAttendanceToggle` to use week-scoped IDs for virtual events
- Remove "Today's Events" and "Upcoming This Week" panels (lines ~793-876), replace with a compact summary strip
- Update "All" filter click handler to also set `setLocationFilter('all')`

### Database Consideration
- Week-scoped attendance IDs (e.g., `event-uuid__2026-03-10`) will be stored as `event_id` strings in `calendar_attendance`. Since recurring virtual events already use the parent event's ID, we'll append a week key. No schema change needed — `event_id` is already text-compatible via the upsert. However, we should verify the column type.

