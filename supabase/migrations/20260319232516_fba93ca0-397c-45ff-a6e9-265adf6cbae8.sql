-- Fix: Reset approved to null for imported placeholder reps who never truly logged in.
-- These were incorrectly set to approved=true by the mass import missing the is_import flag.
-- Criteria: approved=true, onboarding_status='pending', and last_active_at within 5 seconds of created_at (import artifact)
UPDATE profiles
SET approved = NULL
WHERE approved = true
  AND onboarding_status = 'pending'
  AND (
    last_active_at IS NULL
    OR ABS(EXTRACT(EPOCH FROM (last_active_at - created_at))) < 5
  );