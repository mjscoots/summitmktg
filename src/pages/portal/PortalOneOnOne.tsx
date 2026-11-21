import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import OneOnOneForm from '@/components/portal/OneOnOneForm';
import type { OneOnOneKind } from '@/data/portal/oneOnOnes';

export default function PortalOneOnOne({ kind }: { kind: OneOnOneKind }) {
  const { role, profile } = useAuth();
  if (kind === 'pillar' && !isManagerOrAbove(role)) return <Navigate to="/portal/one-on-ones" replace />;
  return <OneOnOneForm key={kind} kind={kind} fullName={profile?.full_name || ''} />;
}