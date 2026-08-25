import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/roles';
import { Loader2, ScrollText } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';

const ACTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'role_granted', label: 'Role granted' },
  { value: 'role_changed', label: 'Role changed' },
  { value: 'role_revoked', label: 'Role revoked' },
  { value: 'profile_archived', label: 'Profile archived' },
  { value: 'profile_restored', label: 'Profile restored' },
  { value: 'alumni_set', label: 'Alumni set' },
  { value: 'alumni_cleared', label: 'Alumni cleared' },
  { value: 'profile_deleted', label: 'Profile deleted' },
  { value: 'lead_reassigned', label: 'Lead reassigned' },
  { value: 'lead_deleted', label: 'Lead deleted' },
];

const ENTITIES = [
  { value: 'all', label: 'All entities' },
  { value: 'user_role', label: 'Roles' },
  { value: 'profile', label: 'Profiles' },
  { value: 'lead', label: 'Leads' },
];

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

const ACTION_DESCRIPTIONS: Record<string, string> = {
  role_granted: 'granted a role to',
  role_changed: 'changed the role of',
  role_revoked: 'revoked a role from',
  profile_archived: 'archived',
  profile_restored: 'restored',
  alumni_set: 'marked alumni',
  alumni_cleared: 'cleared alumni status for',
  profile_deleted: 'deleted',
  lead_reassigned: 'reassigned',
  lead_deleted: 'deleted',
};

interface AuditRow {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_label: string;
  field: string | null;
  before_value: string | null;
  after_value: string | null;
  created_at: string;
}

function describe(row: AuditRow): string {
  const verb = ACTION_DESCRIPTIONS[row.action] || row.action;
  return `${row.actor_name} ${verb} ${row.entity_label}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AuditLogPanel() {
  const { role, isLoading: authLoading } = useAuth();
  const [action, setAction] = useState('all');
  const [entity, setEntity] = useState('all');
  const [days, setDays] = useState('30');
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const owner = isOwner(role);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_audit_log' as never, {
      _action: action === 'all' ? null : action,
      _entity: entity === 'all' ? null : entity,
      _days: Number(days),
      _limit: 200,
    } as never);
    if (!error) setRows((data as unknown as AuditRow[]) || []);
    setLoading(false);
  }, [action, entity, days]);

  useEffect(() => {
    if (!authLoading && owner) load();
  }, [authLoading, owner, load]);

  if (authLoading || !owner) return null;

  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 mb-4">
        <ScrollText className="w-4 h-4 text-primary" />
        <h3 className="text-[13px] font-bold text-foreground">Audit Log</h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="h-8 w-[160px] text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ACTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="h-8 w-[140px] text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENTITIES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-8 w-[110px] text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground py-6 text-center">No audit activity in this range.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border/30 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12.5px] text-foreground leading-snug">{describe(row)}</p>
                <span
                  title={new Date(row.created_at).toLocaleString()}
                  className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0"
                >
                  {relativeTime(row.created_at)}
                </span>
              </div>
              {(row.before_value || row.after_value) && (
                <p className="text-[11px] text-muted-foreground mt-1 truncate">
                  {row.field ? `${row.field}: ` : ''}
                  {row.before_value ?? '—'} → {row.after_value ?? '—'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
