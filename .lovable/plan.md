
# Major Revisions: Calendar Fix, Cross-Referencing, Profile Pictures, Notifications & Toggle View

## Status: ✅ IMPLEMENTED

All major features have been implemented:

## Completed Items

### 1. Calendar Fix ✅
- Created `get_pillar_team_members` database function for team_id based queries
- Updated `ManagerEventForm.tsx` with new assignment options (Entire Team, Managers Only, Rookies Only, Select Specific)
- Added searchable multi-select with role indicators

### 2. Cross-Referencing ✅
- Created `usePillarCheck.ts` hook for pillar owner detection
- All team features now use consistent team_id/direct_manager fields

### 3. Profile Pictures ✅
- Created `UserAvatar.tsx` utility component with initials fallback
- Added to TeamTreeNode, TeamSnapshot, TodaysPriorities, StreakLeaderboard

### 4. Toggle Rookie View ✅
- Created `RookieViewContext.tsx` provider
- Created `RookieViewToggle.tsx` and `RookieViewBanner.tsx` components
- Wrapped app in `RookieViewProvider`

### 5. Team Resources ✅
- Created `TeamResources.tsx` with full CRUD for pillars
- Added to PillarTreeView below Organization Tree

### 6. Enhanced Components ✅
- `TodaysPriorities.tsx`: Always shows 3 lowest performers with avatars
- `TeamSnapshot.tsx`: Enhanced with avatars and clickable profiles
- `StreakLeaderboard.tsx`: Top 3 featured display with medals, animated flames
- `TrainingPage.tsx`: Hero background headers for Rookie/Manager training

### 7. Database Updates ✅
- Created `streak_breaks` table for tracking broken streaks
- Moved Corey Morgan to PAPER ROUTE team
- Created `get_pillar_team_members` function
---

## 1. Calendar - Fix "No Rookies in Downline" Issue

### Current Problem
The `get_user_downline` database function only finds team members via the `direct_manager` name field chain. For Pillar owners like Liam Gardner, if their direct reports don't have `direct_manager = 'Liam Gardner'` exactly (some use 'William James Gardner'), the query returns empty.

### Solution
Create a new database function that queries by `team_id` for pillars, ensuring ALL team members appear:

**Database Changes:**
- Create new function `get_pillar_team_members(pillar_user_id)` that:
  1. Finds the team where `leader_id = pillar_user_id`
  2. Returns ALL profiles with that `team_id` (status != 'nlc')
- Update `get_user_downline` to also handle name aliases (using hierarchyUtils logic)

**Frontend Changes:**
- Update `ManagerEventForm.tsx`:
  - Check if user is a pillar owner first
  - If pillar: use team_id query instead of downline query
  - Rename "Select Rookies" to "Select Team Members"
  - Add new assignment options: Entire Team, All Managers, All Rookies, Select Specific Members
  - Add searchable multi-select with role filters

---

## 2. Universal Cross-Referencing System

### Principle
All team-based features must use the same source of truth: `team_id`, `direct_manager`, `role`, and `status` fields.

**Components to Update:**
- `useTeamData.ts` - Already uses team_id for pillars (verified)
- `TeamSnapshot.tsx` - Already uses useTeamData (verified)
- `TodaysPriorities.tsx` - Already uses useTeamData (verified)
- `ManagerEventForm.tsx` - Needs update to use team_id
- `get_user_downline` - Needs alias resolution

**Create new hook: `usePillarCheck.ts`**
- Check if current user is a pillar owner (their `user_id` matches a team's `leader_id`)
- Return `isPillar`, `teamId`, `teamName`
- Use this hook consistently across all team-related components

---

## 3. Profile Pictures - Universal Display

### Current State
- Profile upload works (ProfilePage.tsx)
- Sidebar shows avatar (AppSidebar.tsx)
- Some components show avatars (StreakLeaderboard)

### Components to Add Profile Pictures:
1. **Organization Tree nodes** (PillarTreeView.tsx, TeamTreeNode.tsx)
2. **Team member lists** (MembersModal, TeamCard)
3. **Calendar attendees** (CalendarPage.tsx)
4. **Notifications** (NotificationBell.tsx)
5. **Today's Priorities rep names** (TodaysPriorities.tsx)
6. **Team Snapshot performers** (TeamSnapshot.tsx)

**Create utility: `UserAvatar.tsx`**
```tsx
// Renders avatar or initials fallback with consistent styling
interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```
- Shows image if `avatarUrl` exists
- Falls back to initials in colored circle (color from name hash)

---

## 4. Today's Priorities - Enhanced Team-Specific Logic

### Current Issues
- Sometimes shows "Reach out to 0 reps"
- Missing broken streak notifications

### Fixes
**Update `TodaysPriorities.tsx`:**
- Always show at least 3 members (or all if fewer than 3)
- Query lowest performers by training progress
- Never show 0

**Add "Broken Streaks" Section:**
- Create new database table: `streak_breaks`
  - `user_id`, `manager_user_id`, `streak_count`, `broke_at`, `acknowledged`
- Track when streaks break (in useStreak hook)
- Show broken streaks in priorities for 48 hours
- Filter by pillar's team only

**Update `useTeamData.ts`:**
- Always return at least 3 members for `needsAttention`
- Add `lastActivity` field to track inactive members
- Add `brokenStreaks` to return data

---

## 5. Teams Tab - Streak Leaderboard Enhancement

### Update `StreakLeaderboard.tsx`:
- Make more prominent (larger card, visual fire icons)
- Top 3 with gold/silver/bronze styling
- Add team filtering (for team pages, only show that team's members)
- Animated fire emojis for top performers
- Clickable names to profile

### Update Team Page (`MyTeamPage.tsx`):
- Add prominent "Team Streak Leaderboard" section below Team Structure
- Team-specific filtering

---

## 6. Training Tabs - Background Image Placeholders

### Update `TrainingPage.tsx`:
- Add hero section at top of Rookie Training view
- Add hero section at top of Manager Training view
- Semi-transparent overlay with large title text
- Placeholder div for future image upload

**Structure:**
```tsx
<div className="relative h-48 rounded-xl overflow-hidden mb-6">
  <div className="absolute inset-0 bg-gradient-to-r from-success/20 to-success/5" />
  <div className="absolute inset-0 flex items-center justify-center">
    <h1 className="text-4xl font-bold text-white drop-shadow-lg">ROOKIE TRAINING</h1>
  </div>
</div>
```

---

## 7. Database Update - Move Corey Morgan to PAPER ROUTE

### SQL Migration:
```sql
-- Get Paper Route team ID and Liam Gardner user ID
-- Update Corey Morgan's team_id and direct_manager
UPDATE profiles
SET team_id = (SELECT id FROM teams WHERE slug = 'paper-route'),
    direct_manager = 'Liam Gardner'
WHERE full_name = 'Corey John Haden Morgan';

-- Update Corey's direct reports to Paper Route team
UPDATE profiles
SET team_id = (SELECT id FROM teams WHERE slug = 'paper-route')
WHERE direct_manager = 'Corey John Haden Morgan'
   OR direct_manager ILIKE '%corey%morgan%';
```

---

## 8. Teams Tab - Team Resources Page

### Already Implemented
The `team_resources` table was created in a previous migration. Need to add UI.

### Create `TeamResources.tsx`:
- Display below Organization Tree on team pages
- Add/Edit/Delete buttons for pillar only
- Modal form: Resource Name, Type (video/doc/link/script), URL, Description
- Grid/list view of resources
- Click to open in new tab

### Update `PillarTreeView.tsx`:
- Add TeamResources component at bottom of tree view

---

## 9. Toggle Rookie View (Manager Feature)

### Create `RookieViewToggle.tsx`:
- Button in top-right of app pages: "View as Rookie"
- When active: shows banner "Viewing as Rookie - [Back to Manager View]"
- Stored in session/context (not persistent)

### Create `useRookieView.ts` hook:
- `isRookieView`: boolean
- `toggleRookieView()`: function
- Stored in React context or sessionStorage

### Create `RookieViewProvider.tsx`:
- Context provider wrapping the app
- Provides `isRookieView` state

### Components to Update:
- All edit buttons: hide when `isRookieView`
- Calendar: hide "Add Event" when `isRookieView`
- Team pages: hide edit/deactivate actions
- Training: hide admin controls

### Banner Component:
```tsx
// Show at top of page when in rookie view
<div className="bg-primary/10 border-b border-primary/30 px-4 py-2 flex items-center justify-between">
  <div className="flex items-center gap-2">
    <Eye className="w-4 h-4" />
    <span>You are viewing this page as a Rookie</span>
  </div>
  <Button size="sm" onClick={toggleRookieView}>Switch Back to Manager View</Button>
</div>
```

---

## Implementation Summary

### Database Migrations:
1. Create `get_pillar_team_members` function
2. Create `streak_breaks` table for tracking broken streaks
3. Update Corey Morgan to Paper Route team
4. Update existing alias-matching in downline query

### New Files:
- `src/components/shared/UserAvatar.tsx`
- `src/components/team/TeamResources.tsx`
- `src/components/layout/RookieViewBanner.tsx`
- `src/components/layout/RookieViewToggle.tsx`
- `src/contexts/RookieViewContext.tsx`
- `src/hooks/usePillarCheck.ts`

### Updated Files:
- `src/components/calendar/ManagerEventForm.tsx` - Team member selection
- `src/components/dashboard/TodaysPriorities.tsx` - Always show 3, broken streaks
- `src/components/dashboard/TeamSnapshot.tsx` - Profile pics
- `src/components/leaderboard/StreakLeaderboard.tsx` - Enhanced display
- `src/components/team/PillarTreeView.tsx` - Profile pics, resources
- `src/components/team/TeamTreeNode.tsx` - Profile pics
- `src/pages/app/TrainingPage.tsx` - Background headers
- `src/pages/app/MyTeamPage.tsx` - Resources section
- `src/pages/app/CalendarPage.tsx` - Profile pics on attendees
- `src/hooks/useTeamData.ts` - Last activity tracking
- `src/hooks/useStreak.ts` - Track streak breaks

---

## Technical Priorities

1. **Calendar Fix** - Critical usability issue
2. **Database migration for Corey Morgan** - Data integrity
3. **Profile pictures utility** - Foundation for universal display
4. **Cross-referencing hook** - Foundation for consistency
5. **Toggle Rookie View** - Manager testing capability
6. **Enhanced priorities & streaks** - User engagement
7. **Training backgrounds** - Visual polish
8. **Team resources** - Content management
