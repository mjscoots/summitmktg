
# Fix Signup - Add Access Code

## Problem
The signup edge function is failing because there's no active access code in the database. Every signup attempt gets rejected with "Invalid access code" which shows as "Edge Function returned a non-2xx status code".

## Solution
Add the default access code to the database so users can sign up.

---

## Implementation

### Step 1: Add Default Access Code
Run a database migration to insert the default access code "summit2025" into the `access_codes` table using the secure `set_access_code` function.

```sql
-- Add the default access code (stores as hash, not plain text)
SELECT public.set_access_code('summit2025', 'Default Summit access code');
```

This uses the existing `set_access_code` database function which:
- Deactivates any existing codes
- Stores the new code as a SHA-256 hash (secure)
- Makes it the active code

---

## After Implementation

Once the access code is added, users can sign up by entering **"summit2025"** (case-insensitive) in the Access Code field.

To change the access code in the future, you can run:
```sql
SELECT public.set_access_code('your-new-code', 'Description');
```

---

## Files Changed
- New migration file to insert the access code

No code changes needed - the signup form and edge function are working correctly; they just need an access code to validate against.
