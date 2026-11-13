import { Link } from 'react-router-dom';
import { Markdown } from '@/components/portal/Markdown';
import { PORTAL_DOCS, PortalDocKey } from '@/data/portal/documents';

export default function PortalDoc({ doc }: { doc: PortalDocKey }) {
  return (
    <article>
      <Link to="/portal/training" className="text-sm text-primary min-h-11 inline-flex items-center">← Training</Link>
      <Markdown source={PORTAL_DOCS[doc].source} />
    </article>
  );
}
