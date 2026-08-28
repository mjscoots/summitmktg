import { Search, Check, Loader2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PrepRosterGroup, PrepRosterPerson, nextYearLabel } from '@/hooks/usePrepRoster';

interface Props {
  groups: PrepRosterGroup[];
  loggedIds: Set<string>;
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  onSelect: (person: PrepRosterPerson) => void;
}

/** Roster grouped by manager. Nobody is preselected. */
export function PrepRosterView({ groups, loggedIds, loading, search, setSearch, onSelect }: Props) {
  return (
    <div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search a name, team or manager"
          className="h-11 pl-9"
          aria-label="Search the roster"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the roster
        </div>
      ) : groups.length === 0 ? (
        <p className="py-10 text-sm text-muted-foreground">
          No one to prep here. Only a manager, admin or owner sees people on this screen.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <div className="mb-2 flex items-baseline gap-2">
                <h2 className="text-[13px] font-semibold uppercase tracking-wide text-foreground">{g.label}</h2>
                {g.team ? <span className="text-[11px] text-muted-foreground">{g.team}</span> : null}
                <span className="ml-auto text-[11px] text-muted-foreground">{g.people.length}</span>
              </div>
              <div className="overflow-hidden rounded-[10px] border border-border">
                {g.people.map((p, i) => {
                  const done = loggedIds.has(p.user_id);
                  return (
                    <button
                      key={p.user_id}
                      onClick={() => onSelect(p)}
                      className={cn(
                        'flex min-h-[52px] w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/50',
                        i > 0 && 'border-t border-border/50'
                      )}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{p.full_name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {p.is_vet ? 'Vet' : 'Rookie'} · {nextYearLabel(p.rep_year)} for 2027
                          {p.team_name ? ` · ${p.team_name}` : ''}
                        </span>
                      </span>
                      {done ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                          <Check className="h-3.5 w-3.5" /> Logged
                        </span>
                      ) : null}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
