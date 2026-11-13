import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { PORTAL_DOCS } from '@/data/portal/documents';

export function DocLinks() {
  return (
    <ul className="space-y-3">
      {Object.values(PORTAL_DOCS).map((d) => (
        <li key={d.path}>
          <Link to={d.path} className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary transition-colors">
            <FileText className="w-5 h-5 text-primary shrink-0" /><span className="font-medium">{d.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
