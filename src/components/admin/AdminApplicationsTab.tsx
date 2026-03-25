import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, Trash2, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
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
  previous_company: string | null;
  years_experience: number | null;
  application_type: string;
  status: string;
  notes: string | null;
  created_at: string | null;
}

export default function AdminApplicationsTab() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'rookie' | 'veteran'>('rookie');
  const [statusFilter, setStatusFilter] = useState<'new' | 'reviewed' | 'all'>('new');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const fetchApplications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setApplications(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const markAsReviewed = async (id: string) => {
    const { error } = await supabase.from('applications').update({ status: 'reviewed' }).eq('id', id);
    if (!error) {
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'reviewed' } : a));
    }
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

    // Auto-mark as reviewed on copy
    if (app.status === 'pending') {
      await markAsReviewed(app.id);
    }

    toast({ title: 'Copied', description: `${app.full_name}'s info copied` });
  };

  const filtered = applications.filter(app => {
    const isVetApp = app.application_type === 'vet' || app.application_type === 'veteran';
    if (typeFilter === 'veteran' ? !isVetApp : app.application_type !== 'rookie') return false;

    // Status filter: "new" = pending, "reviewed" = reviewed
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
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="rookie" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Rookies <span className="ml-1.5 text-[10px] opacity-60">({rookieCount})</span>
          </TabsTrigger>
          <TabsTrigger value="veteran" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Veterans <span className="ml-1.5 text-[10px] opacity-60">({vetCount})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + New/Reviewed toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="pl-9 bg-white/5 border-white/10"
          />
        </div>
        <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 shrink-0">
          {(['new', 'reviewed', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
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

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-3 text-primary/40" />
          <p className="font-medium">No {statusFilter === 'all' ? '' : statusFilter + ' '}{typeFilter} applications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(app => (
            <div
              key={app.id}
              className={`group relative border rounded-lg p-4 transition-colors ${
                app.status === 'pending'
                  ? 'border-primary/30 bg-primary/[0.03]'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: Name + details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground truncate">{app.full_name}</h4>
                    {app.status === 'pending' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/20 text-primary shrink-0">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>{app.phone}</span>
                    <span className="truncate max-w-[200px]" title={app.email}>{app.email}</span>
                    <span>{app.city_state}</span>
                  </div>
                  {(app.referral_source || (typeFilter === 'veteran' && app.previous_company)) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/60 mt-1">
                      {app.referral_source && <span>Referral: {app.referral_source}</span>}
                      {typeFilter === 'veteran' && app.previous_company && <span>Prev: {app.previous_company}</span>}
                      {typeFilter === 'veteran' && app.years_experience != null && <span>Rev: {app.years_experience}</span>}
                    </div>
                  )}
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
          ))}
        </div>
      )}
    </div>
  );
}
