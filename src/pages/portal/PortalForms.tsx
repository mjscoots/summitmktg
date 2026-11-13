import { ExternalLink } from 'lucide-react';

const FORMS: { title: string; url?: string }[] = [
  { title: 'Weekly 1:1 Checklist', url: 'https://docs.google.com/forms/d/1Pjr1HcVSK7rWCVGBVUHOmUcDKO6R9sPgDlgsPGQf9JM/viewform' },
  { title: 'Rookie Interview 1', url: 'https://docs.google.com/forms/d/12tpqBBHu-23M9I1FvQX0OuOK16AY2fHzqbzQZ2kiaMQ/viewform' },
  { title: 'Rookie Interview 2' },
  { title: 'Rookie Interview 3' },
];

export default function PortalForms() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Forms</h1>
      <p className="text-sm text-muted-foreground">These Google Forms are not published yet, so they may not accept responses. The links are the standard /viewform respondent URLs.</p>
      <ul className="space-y-3">
        {FORMS.map((f) => (
          <li key={f.title}>
            {f.url ? (
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary transition-colors">
                <span className="font-medium">{f.title}</span><ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            ) : (
              <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
                <span className="font-medium">{f.title}</span><span className="text-sm text-muted-foreground">Coming</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
