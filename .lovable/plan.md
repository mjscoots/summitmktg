

## Add Zoom Trainings to Manager Video Library

A small update to include the "Zoom Trainings" category alongside "Advanced Training" and "Manager Training" in the Manager Videos page.

### Changes

**File: `src/pages/app/ManagerTrainingVideosPage.tsx`**
- Add `'Zoom Trainings'` to the `MANAGER_CATEGORIES` array (line 18)
- Add `'Zoom Trainings'` to the `.in('category', ...)` database query filter (line 41)

**File: `src/components/dashboard/TrainingTiles.tsx`**
- Update the manager video progress calculation to also include `'Zoom Trainings'` videos in the count

Both changes are single-line additions -- no new files or structural changes needed.

