import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, MessageSquare, Mail, CalendarClock, Bot, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EventCard, type EventCardMeta } from '@/components/chat/EventCard';
import { cn } from '@/lib/utils';

export interface PersonResult {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  team_name: string | null;
  /** null when the caller is not allowed to see this number. */
  phone: string | null;
  can_dm: boolean;
  view_level: string;
}

interface DirectoryResult {
  id: string;
  name: string;
  phone: string;
  label: string | null;
}

interface EmailResult {
  id: string;
  name: string;
  email: string;
  label: string | null;
}

interface EventResult {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  event_kind: string | null;
}

interface Results {
  people: PersonResult[];
  directory: DirectoryResult[];
  emails: EmailResult[];
  events: EventResult[];
}

const EMPTY: Results = { people: [], directory: [], emails: [], events: [] };

const ROW = 'flex w-full min-h-[56px] items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40';
const TAP = 'flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 text-[12px] text-muted-foreground transition-colors hover:border-primary/40';

const telHref = (raw: string) => `tel:${raw.replace(/[^\d+]/g, '')}`;
const smsHref = (raw: string) => `sms:${raw.replace(/[^\d+]/g, '')}`;

/** Contact card: how to reach one person, and a way into the DM. */
function ContactCard({
  person,
  onOpenDm,
  onClose,
}: {
  person: PersonResult;
  onOpenDm: (slug: string) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const message = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('start_dm', { _other: person.user_id });
    setBusy(false);
    if (error) { toast.error('That did not work. Try again.'); return; }
    if (data?.error) { toast.error(String(data.error)); return; }
    if (data?.slug) { onClose(); onOpenDm(String(data.slug)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <UserAvatar avatarUrl={person.avatar_url} fullName={person.full_name || ''} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">{person.full_name}</p>
          <p className="truncate text-[12px] capitalize text-muted-foreground">
            {[person.role, person.team_name].filter(Boolean).join(' · ') || 'Roster'}
          </p>
        </div>
      </div>

      {person.phone ? (
        <div className="flex flex-wrap gap-2">
          <a href={telHref(person.phone)} className={TAP}>
            <Phone className="h-3.5 w-3.5" /> Call
          </a>
          <a href={smsHref(person.phone)} className={TAP}>
            <MessageSquare className="h-3.5 w-3.5" /> Text
          </a>
          <span className="flex min-h-[44px] items-center text-[12px] tabular-nums text-muted-foreground">
            {person.phone}
          </span>
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground">
          This person keeps their number private.
        </p>
      )}

      <button onClick={message} disabled={busy} className={cn(TAP, 'w-full disabled:opacity-50')}>
        <MessageSquare className="h-3.5 w-3.5" /> Message
      </button>
      {!person.can_dm && (
        <p className="text-[12px] text-muted-foreground">
          Direct messages are between you and your leaders.
        </p>
      )}
    </div>
  );
}

/**
 * Search field on the chat home. People, saved numbers and emails, upcoming
 * events, and Ask Summit last. Every rule about who may see a number or start
 * a direct message is decided by `search_people` and `start_dm` on the server.
 */
export function PeopleSearch({
  onOpenDm,
  openPersonId,
  onPersonHandled,
}: {
  onOpenDm: (slug: string) => void;
  openPersonId?: string | null;
  onPersonHandled?: () => void;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [person, setPerson] = useState<PersonResult | null>(null);
  const [event, setEvent] = useState<EventResult | null>(null);
  const reqRef = useRef(0);

  const run = useCallback(async (term: string) => {
    const t = term.trim();
    if (t.length < 2) { setResults(EMPTY); setLoading(false); return; }
    const id = ++reqRef.current;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc('search_people', { _q: t });
    if (id !== reqRef.current) return;
    setLoading(false);
    if (error || !data || data.error) { setResults(EMPTY); return; }
    setResults({
      people: data.people || [],
      directory: data.directory || [],
      emails: data.emails || [],
      events: data.events || [],
    });
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void run(q), 200);
    return () => window.clearTimeout(id);
  }, [q, run]);

  // Deep link from global search: open one person's contact card.
  useEffect(() => {
    if (!openPersonId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc('search_people', { _q: '' });
      if (cancelled) return;
      void data;
      const { data: rows } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name')
        .eq('user_id', openPersonId)
        .maybeSingle();
      if (cancelled || !rows?.full_name) { onPersonHandled?.(); return; }
      const { data: found } = await (supabase as any).rpc('search_people', { _q: rows.full_name });
      if (cancelled) return;
      const hit = ((found?.people || []) as PersonResult[]).find((p) => p.user_id === openPersonId);
      if (hit) setPerson(hit);
      onPersonHandled?.();
    })();
    return () => { cancelled = true; };
  }, [openPersonId, onPersonHandled]);

  const hasQuery = q.trim().length >= 2;
  const nothing =
    hasQuery && !loading &&
    results.people.length === 0 && results.directory.length === 0 &&
    results.emails.length === 0 && results.events.length === 0;

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="People, events, answers"
          aria-label="Search people, events and answers"
          className="min-h-[44px] w-full rounded-xl border border-border/60 bg-card pl-9 pr-9 text-[14px] text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {hasQuery && (
        <ul className="mt-3 space-y-2">
          {results.people.map((p) => (
            <li key={p.user_id}>
              <div className={ROW}>
                <button onClick={() => setPerson(p)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <UserAvatar avatarUrl={p.avatar_url} fullName={p.full_name || ''} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.full_name}</span>
                    <span className="block truncate text-[12px] capitalize text-muted-foreground">
                      {[p.role, p.team_name].filter(Boolean).join(' · ') || 'Roster'}
                    </span>
                  </span>
                </button>
                {p.phone && (
                  <>
                    <a href={telHref(p.phone)} aria-label={`Call ${p.full_name}`} className={TAP}>
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                    <a href={smsHref(p.phone)} aria-label={`Text ${p.full_name}`} className={TAP}>
                      <MessageSquare className="h-3.5 w-3.5" />
                    </a>
                  </>
                )}
              </div>
            </li>
          ))}

          {results.directory.map((d) => (
            <li key={d.id}>
              <div className={ROW}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{d.name}</span>
                  <span className="block truncate text-[12px] tabular-nums text-muted-foreground">
                    {d.phone}{d.label ? ` · ${d.label}` : ''}
                  </span>
                </span>
                <a href={telHref(d.phone)} aria-label={`Call ${d.name}`} className={TAP}>
                  <Phone className="h-3.5 w-3.5" />
                </a>
                <a href={smsHref(d.phone)} aria-label={`Text ${d.name}`} className={TAP}>
                  <MessageSquare className="h-3.5 w-3.5" />
                </a>
              </div>
            </li>
          ))}

          {results.emails.map((e) => (
            <li key={e.id}>
              <a href={`mailto:${e.email}`} className={ROW}>
                <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.name}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">{e.email}</span>
                </span>
              </a>
            </li>
          ))}

          {results.events.map((ev) => (
            <li key={ev.id}>
              <button onClick={() => setEvent(ev)} className={ROW}>
                <CalendarClock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{ev.title}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {new Date(ev.event_date).toLocaleString([], {
                      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </span>
                </span>
              </button>
            </li>
          ))}

          <li>
            <button onClick={() => navigate(`/app/ask?q=${encodeURIComponent(q.trim())}`)} className={ROW}>
              <Bot className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">Ask Summit: {q.trim()}</span>
            </button>
          </li>
        </ul>
      )}

      {nothing && (
        <p className="mt-3 text-[13px] text-muted-foreground">No people, numbers or events match that.</p>
      )}

      <Sheet open={!!person} onOpenChange={(o) => { if (!o) setPerson(null); }}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-[14px]">Contact</SheetTitle>
          </SheetHeader>
          {person && (
            <div className="mt-3">
              <ContactCard person={person} onOpenDm={onOpenDm} onClose={() => setPerson(null)} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!event} onOpenChange={(o) => { if (!o) setEvent(null); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-[14px]">Event</SheetTitle>
          </SheetHeader>
          {event && (
            <div className="mt-3">
              <EventCard
                eventId={event.id}
                title={event.title}
                meta={{
                  title: event.title,
                  event_date: event.event_date,
                  location: event.location,
                  event_kind: event.event_kind || undefined,
                } as EventCardMeta}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
