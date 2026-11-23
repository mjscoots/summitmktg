import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import raw from '@/data/portal/training-library.json?raw';
import { portalDisplayName } from '@/lib/portalSanitize';

type LibraryItem = {
  title: string;
  type: string;
  audience: 'rep' | 'manager';
  group: string;
  href: string;
  linkKind: 'portal' | 'app' | 'drive';
  source?: string;
  managerOnly: boolean;
};

const ITEMS = JSON.parse(raw) as LibraryItem[];

const KIND_LABEL: Record<LibraryItem['linkKind'], string> = {
  portal: 'Portal page',
  app: 'TRNTY app',
  drive: 'Google Drive',
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

function Card({ item }: { item: LibraryItem }) {
  const title = portalDisplayName(item.title).replace(/_/g, ' ');
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      {item.linkKind === 'drive' ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 break-words font-medium transition-colors hover:text-primary"
        >
          {title}
          <ExternalLink className="h-4 w-4 shrink-0" />
        </a>
      ) : (
        <Link
          to={item.href}
          className="inline-flex min-h-11 items-center break-words font-medium transition-colors hover:text-primary"
        >
          {title}
        </Link>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Badge>{item.type}</Badge>
        <Badge>{item.audience === 'manager' ? 'Manager' : 'Rep'}</Badge>
        <Badge>{KIND_LABEL[item.linkKind]}</Badge>
      </div>
    </li>
  );
}

export default function PortalLibrary() {
  const { role } = useAuth();
  const manager = isManagerOrAbove(role);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const visible = useMemo(() => ITEMS.filter((i) => manager || !i.managerOnly), [manager]);
  const types = useMemo(() => [...new Set(visible.map((i) => i.type))], [visible]);
  const filtered = useMemo(
    () =>
      visible.filter(
        (i) =>
          (typeFilter === 'all' || i.type === typeFilter) &&
          portalDisplayName(i.title).replace(/_/g, ' ').toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [visible, typeFilter, query],
  );
  const groups = useMemo(() => {
    const map = new Map<string, LibraryItem[]>();
    for (const item of filtered) {
      const list = map.get(item.group);
      if (list) list.push(item);
      else map.set(item.group, [item]);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Materials library</h1>
        <p className="text-muted-foreground">
          Every training material on file, in one place. Each item shows its type, who it is for,
          where it lives, and where it came from.
        </p>
        {manager && (
          <p className="text-sm text-muted-foreground">
            Drive links open only if the file is shared with you.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by title"
          aria-label="Filter by title"
          className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {['all', ...types].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`min-h-11 rounded-full border px-4 text-sm transition-colors ${
                typeFilter === t
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary'
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{filtered.length} materials</p>
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground">No materials match.</p>
      ) : (
        groups.map(([group, items]) => (
          <section key={group} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </h2>
            <ul className="space-y-3">
              {items.map((item) => (
                <Card key={`${item.group}:${item.title}`} item={item} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
