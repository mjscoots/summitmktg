

## Roster & Assign Redesign

### Problem
The current "Roster & Assign" section has three confusing sub-tabs (Roster/Sync, Mass Import, Assignments) with overlapping functionality. The "Sync" tab references an external roster hardcoded in `externalRoster.ts` with match-scoring logic that is confusing. The Assignments tab shows checkboxes and bulk-assign UIs that are hard to parse. Mathew Joyce (admin) shows up in lists where he shouldn't.

### Proposed Redesign

Replace the three sub-tabs with a single, clean unified view:

**Two sub-tabs only: "Roster" and "Import"**

#### Roster Tab (default)
A single clean table of ALL reps (excluding admins like Mathew Joyce) with:
- **Status filter tabs** across the top (All, Pending, Info Added, Contract Signed, Onboarded, Summer Ready) with counts — reusing what `RosterStatusView` already does
- **Search bar** for name/email/manager
- **Sort dropdown** (Name, Team, Role, Date Added)
- **Each row shows**: Avatar, Name, Role badge, Team, Manager, Onboarding Status badge, chevron to open detail
- **Click a row** → opens a detail modal where you can:
  - Update onboarding status
  - Assign/change manager (with search)
  - Assign/change team
  - View contact info (email, phone)

This merges RosterStatusView + AssignmentsTab into one place. No more "Sync" concept, no checkboxes, no "Sync All" buttons. Just a clean roster where you click someone and update their info.

#### Import Tab
Mass Import stays as-is — it's the bulk CSV/paste import tool.

### Technical Changes

1. **`AdminTeamPage.tsx`**: Remove the `'sync' | 'import' | 'assign'` sub-tab system. Replace with just `'roster' | 'import'`. Remove lazy loading of `AssignmentsTab` and `RosterSyncTab`.

2. **`RosterStatusView.tsx`**: Enhance to be the single roster management view. Add:
   - Manager assignment with search (merge from AssignmentsTab)
   - Team assignment in the detail modal
   - Filter out admin/owner roles from the list
   - Sort options (name, team, role, date)

3. **Delete `RosterSyncTab.tsx`** — the external roster sync concept is removed entirely. Status updates happen through the roster detail modal or mass import.

4. **`AssignmentsTab.tsx`** — no longer lazy-loaded from the Roster tab. Can remain for potential future use or be deleted.

### Key UX Improvements
- One place to see everyone and their status
- Click to edit — no confusing "sync" buttons or checkboxes
- Admin users filtered out automatically
- Clean status pipeline (Pending → Info Added → Contract Signed → Onboarded → Summer Ready)
- Sort and search work across the whole roster

