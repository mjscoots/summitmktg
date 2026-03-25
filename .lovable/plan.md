

# Plan: Slow Down Learn Your Pitch + Manual Re-Read Tracking

## Problem Summary

1. **Learn Your Pitch rushing**: Reps submit pitch videos and immediately move to the next lesson without waiting for manager approval. The pitch gate currently only blocks the *next module*, not the *next lesson*. Reps blow through the entire pitch course in minutes.

2. **Summer Sales Manual re-reads**: Once the manual is completed, there's no incentive or tracking for re-reading it. You want a visible counter (1x, 2x, 3x...) showing how many times they've read through the manual, with continued point earning on each pass.

---

## Part 1: Slow Down Learn Your Pitch

### What Changes

**Lesson-level pitch blocking**: When a lesson requires pitch approval (`requires_pitch_approval = true`), the lesson itself should NOT be marked complete until the pitch is approved. Currently, the quiz pass marks it complete regardless.

**Specific changes:**

- **`LessonPage.tsx`**: Add a pitch-approval gate to `canProceed`. If the lesson requires a pitch and the pitch is not yet approved, the "Next" button stays disabled even after the quiz is passed. Show a clear message: "Waiting for manager to approve your pitch before you can continue."

- **`TrainingCoursePage.tsx`**: Already blocks next lessons when `quiz_passed` is false, so if we prevent `quiz_passed` from being set until pitch is approved, sequential lesson locking handles the rest automatically.

- **`LessonPage.tsx` completion logic**: Modify `handleMarkComplete` and the quiz pass flow so that if `requiresPitch` is true, the lesson is NOT marked as `completed_at` / `quiz_passed = true` until the pitch status is `'approved'`. Instead, save quiz results but keep the lesson in an "awaiting pitch approval" state.

- **`PitchApprovalCard.tsx`**: When pitch is approved (status changes), trigger lesson completion automatically via a realtime listener or on the next page load.

- **Waiting state UI**: Show a polished "awaiting approval" card with status, submission time, and encouragement. The rep cannot proceed but can re-record if rejected.

### Result
Reps must wait for their manager to review and approve each pitch before the next lesson unlocks. This forces real practice time between submissions.

---

## Part 2: Summer Sales Manual Re-Read Counter

### Database Change

Add a new table `manual_read_completions`:

```sql
CREATE TABLE public.manual_read_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug text NOT NULL DEFAULT 'summer-sales-manual',
  completion_number integer NOT NULL DEFAULT 1,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_slug, completion_number)
);

ALTER TABLE public.manual_read_completions ENABLE ROW LEVEL SECURITY;

-- Users can read/insert their own
CREATE POLICY "Users can view own completions"
  ON public.manual_read_completions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
  ON public.manual_read_completions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
```

### How It Works

1. When a rep completes 100% of the Summer Sales Manual lessons (all `quiz_passed`), record a row with `completion_number = 1`.

2. After completion, reset all `lesson_progress` rows for manual lessons (clear `completed_at` and `quiz_passed`), so the manual re-locks from the beginning.

3. The rep goes through again. On second full completion, record `completion_number = 2`, and so on.

4. Award points on each completion pass (same lesson completion points apply each time since progress is reset).

### UI Changes

- **`TrainingCoursePage.tsx`** (for `summer-sales-manual`): Show a badge at the top: "1x", "2x", "3x" etc. indicating how many times completed. Style as a polished counter badge.

- **`TrainingTiles.tsx`** (dashboard tiles): Show the read count badge on the manual tile so it's visible from the dashboard.

- After each full completion, show a celebration modal: "Manual completed for the Xth time!" with the updated counter.

---

## Files to Edit

| File | Change |
|------|--------|
| `src/pages/app/LessonPage.tsx` | Add pitch-approval gate to `canProceed`; prevent completion until pitch approved; add waiting UI state |
| `src/components/training/PitchApprovalCard.tsx` | Add realtime listener for approval; trigger lesson completion on approval |
| `src/pages/app/TrainingCoursePage.tsx` | Add manual read count badge; handle manual reset on completion |
| `src/components/dashboard/TrainingTiles.tsx` | Show read count badge on manual tile |
| Database migration | Create `manual_read_completions` table |

---

## Technical Details

- **Pitch gate logic**: `canProceed = scrollUnlocked && hasCompletedRequirements && (!requiresPitch || pitchRequest?.status === 'approved')`
- **Manual reset**: On detecting all manual lessons complete + new completion count, run a batch update to clear `completed_at` and `quiz_passed` for all manual lesson IDs for that user
- **Points**: Each manual re-read triggers the same `award_lesson_completion_points` RPC since progress rows are fresh
- **No new edge functions needed**: All logic is client-side with existing Supabase queries

