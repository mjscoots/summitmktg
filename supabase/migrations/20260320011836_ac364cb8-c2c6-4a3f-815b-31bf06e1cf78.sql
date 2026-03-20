-- Fix remaining 28 false in-app users: import artifacts with approved=true who never truly logged in
-- These have last_active_at within 60 seconds of created_at (import artifact pattern)
UPDATE profiles
SET approved = NULL
WHERE approved = true
  AND last_active_at IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (last_active_at - created_at))) < 60;