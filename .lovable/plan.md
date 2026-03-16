

# Mass Import Fix Plan

## Root Cause Analysis

I traced through the full import pipeline (client parser → edge function → DB) and found **three confirmed bugs** causing statuses and managers to not sync:

### Bug 1: Manager-role people are completely skipped (Client-side)
In `AdminMassImport.tsx` (lines 534-542), if a person's name matches a known manager AND they already have a profile, the entire row is **skipped** and never sent to the backend. This is exactly why James Harjak's manager never updates — he has role "manager" in the DB, so the parser drops his row entirely.

### Bug 2: `strongestPipeline` only upgrades, never overwrites (Edge function)
In `bulk-create-users/index.ts` `buildUpdatesFromImport()` (lines 466-471), the function uses `strongestPipeline()` which only moves status **forward** (e.g., pending → onboarded → summer_ready). It never allows a correction downward. You confirmed you want "Always overwrite" — if the import says "summer_ready", it should be "summer_ready" regardless of what's currently in the DB.

### Bug 3: Hardcoded `role: 'rookie'` for all import rows (Client-side)
In `AdminMassImport.tsx` (line 654), every import row is sent with `role: 'rookie'`. When the edge function processes a manager-role person, it upserts their role as "rookie", potentially demoting them.

### Bug 4: Name matching weakness for shortened DB names
DB stores shortened names like "nic minder" while import has "Nicolas Minder". The `matchNames` function doesn't map "nic" → "nicolas" (only "nicholas" → "nick"). When matching fails, the system tries to create a duplicate instead of updating, and the status gets lost.

## Fix Plan

### File 1: `src/components/admin/AdminMassImport.tsx`
- **Remove manager skip logic** (lines 534-542): Stop skipping manager-role people. All rows should be sent to the edge function for processing.
- **Preserve existing role**: Instead of hardcoding `role: 'rookie'`, detect if the person already has a role in the profiles data and send that role instead.
- **Add "nic" → "nicolas" nickname mapping** in the local matching logic.

### File 2: `supabase/functions/bulk-create-users/index.ts`
- **Always overwrite onboarding_status**: In `buildUpdatesFromImport()`, when `pipelineProvided` is true, always set the imported value directly instead of using `strongestPipeline()`. Same change on the create path (line 888-890).
- **Always overwrite rep_status**: Same treatment — if provided, always apply.
- **Preserve role on re-import**: When matching an existing user, don't overwrite their role if they're already manager/admin/owner.
- **Improve name matching**: Add "nic" → "nicolas" and similar short-form mappings to the edge function's fuzzy matching.

### File 3: `src/lib/externalRoster.ts`
- Add nickname mappings: `nic` ↔ `nicholas`/`nicolas`, and any other known short forms causing mismatches in this org.

## Expected Outcome
After these fixes:
- James Harjak and all managers will get their `direct_manager`, `onboarding_status`, and other fields updated on import
- "Summer Ready" imports will actually set "summer_ready" even if the DB currently says "onboarded"
- No one's role gets accidentally demoted from manager to rookie
- Better name matching prevents duplicate creation

