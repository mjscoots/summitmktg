import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import LeadFormSlot from '@/components/recruiting/LeadFormSlot';

export default function PortalClaimLeads() {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
    );
  }

  if (!isManagerOrAbove(role)) {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Claim leads</h1>
      <div className="mx-0 my-0">
        <LeadFormSlot />
      </div>
    </div>
  );
}
