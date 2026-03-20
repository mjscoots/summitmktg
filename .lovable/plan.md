

## Plan: Merge Duplicate Profiles + Fix Checklist Videos View

### Problem 1: Duplicate Profiles (Alex Canescu / Alexander Canescu)
The existing `matchNames` function in `externalRoster.ts` already knows `alex` and `alexander` are nicknames, but the **import and audit flows never run a deduplication merge** on existing profiles. Duplicates created during import persist as separate rows in `profiles`.

### Problem 2: Checklist Videos showing non-completers and managers
The `AdminSubmittedVideosTab` already filters out managers (lines 50-58), but it shows **all rookies who have any video** — including those who haven't completed all 3 checklist items. The user wants to only see people who **have** completed checklist videos, not empty rows or incomplete ones listed alongside complete ones.

---

### Changes

#### 1. Database: Merge Alex/Alexander Canescu + mark NLC
- Run a data query to find both profiles for "Canescu"
- Merge the secondary profile's data (progress, edges, bootcamp) into the primary one
- Delete the duplicate profile
- Set the remaining profile's `status` to `nlc`
- Scan for all other duplicate name pairs using the `matchNames` nickname logic and produce a report; auto-merge where safe (same last name + nickname first name, one has no login activity)

#### 2. Database: Add a deduplication check to mass import
- In `MassImportTab.tsx`, during the parse phase, after matching against existing profiles, also check if the incoming name matches **multiple** existing profiles via nickname logic. If so, flag a "Potential Duplicate" warning instead of creating a new entry.

#### 3. Admin Audit Panel: Add "Merge Duplicates" action
- Enhance the existing `AdminAuditPanel.tsx` duplicate detection (line 80-88) to use `matchNames` from `externalRoster.ts` instead of exact normalized name matching, so it catches nickname variants like Alex/Alexander.
- Add a one-click "Merge" button for each duplicate pair that transfers all child data (edges, lesson_progress, video_progress, bootcamp_progress) to the primary profile and deletes the secondary.

#### 4. Checklist Videos: Only show completers, exclude managers
- In `AdminSubmittedVideosTab.tsx`, change the filtering logic so that:
  - Managers are already excluded (confirmed working)
  - Only show people who have **at least one** checklist video submitted (already working)
  - Remove rows where the person has **zero** bootcamp videos when the "bootcamp" type filter is active
  - When displaying the checklist column, **hide** the uncompleted checklist items — only show green checkmarks for completed ones, don't show empty circles for missing ones

#### 5. NLC users excluded from Checklist Videos
- Add a filter to exclude profiles with `status = 'nlc'` from the checklist videos view, since NLC users are no longer active.

---

### Technical Details

**File changes:**
- `src/components/admin/AdminSubmittedVideosTab.tsx` — filter to only show reps with ≥1 submitted video; hide incomplete checklist circles; exclude NLC profiles
- `src/components/admin/AdminAuditPanel.tsx` — upgrade duplicate detection to use nickname-aware `matchNames`; add merge action button
- `src/components/admin/MassImportTab.tsx` — add duplicate warning during parse
- Database migration — merge Alex/Alexander Canescu, mark NLC, scan and merge other duplicates

**Merge safety rule:** Only auto-merge when one profile has never logged in (placeholder). If both have real activity, flag for manual review.

