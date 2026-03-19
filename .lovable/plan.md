

## Problem

The approval gate (`profile.approved === false`) applies to ALL users, including managers. But only rookies/reps should need approval. Managers, admins, and owners should skip the approval check entirely — same as they skip the Summer Checklist.

The `isBypassed` flag from `useBootcamp` already handles this for the checklist, and line 54 of `BootcampGate.tsx` uses it for approval too. However, there's a timing issue: `isBypassed` depends on the role loading correctly, and the role can momentarily be `'rookie'` during auth hydration — causing managers to briefly hit the approval gate.

## Plan

### 1. Harden the approval check in BootcampGate.tsx (line 54)

Add a direct role check from `useAuth` alongside `isBypassed` so approval is only enforced for actual rookies:

```tsx
const { profile, signOut, isLoading: authLoading, role } = useAuth();

// Step 2: Only require approval for rookies
const needsApproval = role === 'rookie' && !isBypassed && profile && profile.approved === false;
if (needsApproval) {
  return <Navigate to="/pending-approval" replace />;
}
```

### 2. Update PendingApproval page to auto-redirect non-rookies

Add a role check so if a manager/admin/owner somehow lands on `/pending-approval`, they get redirected to `/app` immediately:

```tsx
const { role } = useAuth();
// If user is manager/admin/owner, skip approval entirely
if (!isLoading && role !== 'rookie') {
  navigate("/app", { replace: true });
}
```

### Files to modify
- `src/components/BootcampGate.tsx` — add `role` from useAuth, only gate rookies
- `src/pages/app/PendingApproval.tsx` — redirect non-rookies away

