import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { Markdown } from '@/components/portal/Markdown';
import { PORTAL_DOCS, PortalDocKey } from '@/data/portal/documents';

export default function PortalDoc({ doc }: { doc: PortalDocKey }) {
  const { role } = useAuth();
  if (PORTAL_DOCS[doc].managerOnly && !isManagerOrAbove(role)) return <Navigate to="/portal/training" replace />;
  return (
    <article className="min-w-0 break-words">
      <Link to="/portal/training" className="text-sm text-primary min-h-11 inline-flex items-center">← Training</Link>
      <Markdown source={PORTAL_DOCS[doc].source} />
    </article>
  );
}
