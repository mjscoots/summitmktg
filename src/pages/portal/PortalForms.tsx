import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';

const FORMS = [
  { title: 'Weekly 1:1 Checklist', url: 'https://docs.google.com/forms/d/1Pjr1HcVSK7rWCVGBVUHOmUcDKO6R9sPgDlgsPGQf9JM/viewform', managerOnly: false },
  { title: 'Recruit Interview Form', url: 'https://docs.google.com/forms/d/12tpqBBHu-23M9I1FvQX0OuOK16AY2fHzqbzQZ2kiaMQ/viewform', managerOnly: false },
  { title: 'Weekly Manager Report', url: 'https://docs.google.com/forms/d/1z23iSec8J1HJOFAX-9fXoHalpRaaliv-A4df9lrZbYk/viewform', managerOnly: true },
];

export default function PortalForms() {
  const { role } = useAuth();
  const mgr = isManagerOrAbove(role);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Forms</h1>
      <p className="text-sm text-muted-foreground">These Google Forms are not published yet, so they may not accept responses. The links are the standard /viewform respondent URLs.</p>
      <ul className="space-y-3">
        {FORMS.filter((f) => !f.managerOnly || mgr).map((f) => (
          <li key={f.url}>
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary transition-colors">
              <span className="font-medium">{f.title}</span><ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
