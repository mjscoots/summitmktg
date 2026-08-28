import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, Trash2, Copy, Check, Phone, MessageSquare, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

interface Application {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city_state: string;
  referral_source: string;
  source_type: string | null;
  previous_company: string | null;
  years_experience: number | null;
  application_type: string;
  status: string;
  notes: string | null;
  created_at: string | null;
  reviewed_by: string | null;
  first_touch_at: string | null;
}

interface SourceCount { label: string; count: number }

const hoursSince = (iso: string | null) =>
  iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)) : 0;

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
const smsHref = (phone: string) => `sms:${phone.replace(/[^\d+]/g, '')}`;

export default function AdminApplicationsTab() {
  const { user, isAdmin, isOwner } = useAuth() as unknown as {
    user: { id: string } | null; isAdmin?: boolean; isOwner?: boolean;
  };
  const canReassign = Boolean(isAdmin || isOwner);

  const [applications, setApplications] = useState<Application[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<SourceCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'rookie' | 'veteran'>('rookie');
  const [statusFilter, setStatusFilter] = useState<'new' | 'reviewed' | 'all'>('new');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, pulse] = await Promise.all([
      supabase.from('applications').select('*').order('created_at', { ascending: false }),
      supabase.rpc('applications_pulse' as never),
    ]);

    if (!error && data) {
      const rows = data as unknown as Application[];
      setApplications(rows);
      const ids = Array.from(new Set(rows.map(r => r.reviewed_by).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
        const map: Record<string, string> = {};
        (profs || []).forEach(p => { map[p.user_id] = p.full_name || 'Reviewer'; });
        setNames(map);
      } else {
        setNames({});
      }
    }
    const p = pulse.data as unknown as { sources?: SourceCount[] } | null;
    setSources(p?.sources || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('applications').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete application', variant: 'destructive' });
    } else {
      setApplications(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Deleted', description: 'Application removed' });
    }
    setDeletingId(null);
  };

  const markAsReviewed = async (id: string) => {
    const { error } = await supabase.from('applications').update({ status: 'reviewed' }).eq('id', id);
    if (!error) {
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'reviewed' } : a));
    }
  };

  const claim = async (app: Application, assignee: string | null) => {
    setBusyId(app.id);
    const { data, error } = await supabase.rpc('claim_application' as never, {
      _id: app.id, _assignee: assignee,
    } as never);
    setBusyId(null);
    const res = data as unknown as { ok: boolean; error?: string; reviewed_by?: string } | null;
    if (error || !res?.ok) {
      toast({ title: 'Could not claim', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    const owner = res.reviewed_by || null;
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, reviewed_by: owner } : a));
    if (owner && !names[owner]) {
      const { data: prof } = await supabase.from('profiles').select('full_name').eq('user_id', owner).maybeSingle();
      setNames(n => ({ ...n, [owner]: prof?.full_name || 'Reviewer' }));
    }
    toast({ title: 'Claimed', description: `${app.full_name} is yours` });
  };

  const logTouch = async (app: Application) => {
    setBusyId(app.id);
    const { data, error } = await supabase.rpc('log_application_first_touch' as never, { _id: app.id } as never);
    setBusyId(null);
    const res = data as unknown as { ok: boolean; error?: string } | null;
    if (error || !res?.ok) {
      toast({ title: 'Could not log', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    const stamp = new Date().toISOString();
    setApplications(prev => prev.map(a => a.id === app.id
      ? { ...a, first_touch_at: a.first_touch_at || stamp, reviewed_by: a.reviewed_by || user?.id || null }
      : a));
    toast({ title: 'First touch logged' });
  };

  const handleCopyInfo = async (app: Application) => {
    const lines = [
      `Name: ${app.full_name}`,
      `Phone: ${app.phone}`,
      `Email: ${app.email}`,
      `Location: ${app.city_state}`,
      `Referral: ${app.referral_source}`,
      app.notes ? `Notes: ${app.notes}` : '',
    ].filter(Boolean).join('\n');
    await navigator.clipboard.writeText(lines);

    setCopiedId(app.id);
    setTimeout(() => setCopiedId(null), 2000);

    if (app.status === 'pending') {
      await markAsReviewed(app.id);
    }

    toast({ title: 'Copied', description: `${app.full_name}'s info copied` });
  };

  const filtered = applications.filter(app => {
    const isVetApp = app.application_type === 'vet' || app.application_type === 'veteran';
    if (typeFilter === 'veteran' ? !isVetApp : app.application_type !== 'rookie') return false;

    if (statusFilter === 'new' && app.status !== 'pending') return false;
    if (statusFilter === 'reviewed' && app.status !== 'reviewed') return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        app.full_name.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        app.phone.includes(q)
      );
    }
    return true;
  });

  const rookieCount = applications.filter(a => a.application_type === 'rookie').length;
  const vetCount = applications.filter(a => a.application_type === 'vet' || a.application_type === 'veteran').length;
  const currentTypeApps = applications.filter(app => {
    const isVetApp = app.application_type === 'vet' || app.application_type === 'veteran';
    return typeFilter === 'veteran' ? isVetApp : app.application_type === 'rookie';
  });
  const newCount = currentTypeApps.filter(a => a.status === 'pending').length;
  const reviewedCount = currentTypeApps.filter(a => a.status === 'reviewed').length;

  return (
    <div>
      {/* Type tabs */}
      <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'rookie' | 'veteran')} className="mb-4">
        <TabsList className="border border-border/40 bg-card/60">
          <TabsTrigger value="rookie" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Rookies <span className="ml-1.5 text-[10px] opacity-60">({rookieCount})</span>
          </TabsTrigger>
          <TabsTrigger value="veteran" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Veterans <span className="ml-1.5 text-[10px] opacity-60">({vetCount})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + New/Reviewed toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="pl-9 bg-card/60 border-border/40"
          />
        </div>
        <div className="flex items-center rounded-lg border border-border/40 bg-card/60 p-0.5 shrink-0">
          {(['new', 'reviewed', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors capitalize min-h-[44px] sm:min-h-0 ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'new' ? `New (${newCount})` : s === 'reviewed' ? `Reviewed (${reviewedCount})` : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* This month by source */}
      {sources.length > 0 && (
        <p className="mb-4 text-[13px] text-muted-foreground">
          This month by source:{' '}
          {sources.map((s, i) => (
            <span key={s.label}>
              {i > 0 ? ' · ' : ''}
              <span className="text-foreground/90">{s.label}</span> {s.count}
            </span>
          ))}
        </p>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-3 text-primary/40" />
          <p className="font-medium">No {statusFilter === 'all' ? '' : statusFilter + ' '}{typeFilter} applications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(app => {
            const hrs = hoursSince(app.created_at);
            const stale = app.status === 'pending' && !app.reviewed_by && hrs >= 24;
            const ownerName = app.reviewed_by ? (names[app.reviewed_by] || 'Reviewer') : null;
            const mine = app.reviewed_by && app.reviewed_by === user?.id;
            return (
              <div
                key={app.id}
                className={`group relative border rounded-lg p-4 transition-colors ${
                  app.status === 'pending'
                    ? 'border-primary/30 bg-primary/[0.03]'
                    : 'border-border/40 bg-card/40'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Name + details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground truncate">{app.full_name}</h4>
                      {app.status === 'pending' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/20 text-primary shrink-0">
                          NEW
                        </span>
                      )}
                      <span className={stale ? 'chip-warm' : 'text-[11px] text-muted-foreground/70 tabular-nums'}>
                        {hrs}h old
                      </span>
                      {app.first_touch_at && (
                        <span className="text-[11px] text-muted-foreground/70">
                          touched {format(new Date(app.first_touch_at), 'MMM d')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-muted-foreground">
                      <a href={telHref(app.phone)} className="text-foreground/90 underline-offset-2 hover:underline">
                        {app.phone}
                      </a>
                      <span className="truncate max-w-[200px]" title={app.email}>{app.email}</span>
                      <span>{app.city_state}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/60 mt-1">
                      {app.referral_source && <span>Referral: {app.referral_source}</span>}
                      {app.source_type && <span>Source: {app.source_type}</span>}
                      {typeFilter === 'veteran' && app.previous_company && <span>Prev: {app.previous_company}</span>}
                      {typeFilter === 'veteran' && app.years_experience != null && <span>Rev: {app.years_experience}</span>}
                    </div>

                    {/* Owner + first touch actions */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {ownerName ? `Owner: ${ownerName}` : 'No owner yet'}
                      </span>
                      {(!app.reviewed_by || (canReassign && !mine)) && (
                        <button
                          onClick={() => claim(app, null)}
                          disabled={busyId === app.id}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border/50 bg-card/60 px-3 text-xs font-medium text-foreground hover:bg-secondary"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {app.reviewed_by ? 'Take over' : 'Claim'}
                        </button>
                      )}
                      <a
                        href={telHref(app.phone)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border/50 bg-card/60 px-3 text-xs font-medium text-foreground hover:bg-secondary"
                      >
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                      <a
                        href={smsHref(app.phone)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border/50 bg-card/60 px-3 text-xs font-medium text-foreground hover:bg-secondary"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Text
                      </a>
                      {!app.first_touch_at && (
                        <button
                          onClick={() => logTouch(app)}
                          disabled={busyId === app.id}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          <Check className="h-3.5 w-3.5" /> Logged first touch
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: Date + actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground/50 hidden sm:block">
                      {app.created_at ? format(new Date(app.created_at), 'MMM d') : ''}
                    </span>
                    <button
                      onClick={() => handleCopyInfo(app)}
                      className="p-1.5 rounded-md hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                      title="Copy info (marks as reviewed)"
                    >
                      {copiedId === app.id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                          disabled={deletingId === app.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete application?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remove <span className="font-medium text-foreground">{app.full_name}</span>'s application. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(app.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
