import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, Trash2 } from 'lucide-react';
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const filtered = applications.filter(app => {
    const isVetApp = app.application_type === 'vet' || app.application_type === 'veteran';
    if (typeFilter === 'veteran' ? !isVetApp : app.application_type !== 'rookie') return false;
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

  return (
    <div>
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

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="pl-9 bg-white/5 border-white/10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-3 text-primary/40" />
          <p className="font-medium">No {typeFilter} applications found</p>
        </div>
      ) : (
        <div className="border border-white/10 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Referral</th>
                {typeFilter === 'veteran' && (
                  <>
                    <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Prev. Markets</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Revenue</th>
                  </>
                )}
                <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(app => (
                <tr key={app.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{app.full_name}</td>
                  <td className="px-4 py-3 text-white/60">{app.email}</td>
                  <td className="px-4 py-3 text-white/60">{app.phone}</td>
                  <td className="px-4 py-3 text-white/60">{app.city_state}</td>
                  <td className="px-4 py-3 text-white/60 text-xs">{app.referral_source}</td>
                  {typeFilter === 'veteran' && (
                    <>
                      <td className="px-4 py-3 text-white/60">{app.previous_company || '—'}</td>
                      <td className="px-4 py-3 text-white/60">{app.years_experience ?? '—'}</td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <Badge
                      variant={app.status === 'pending' ? 'secondary' : app.status === 'approved' ? 'default' : 'destructive'}
                      className="text-[10px] capitalize"
                    >
                      {app.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {app.created_at ? format(new Date(app.created_at), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors" disabled={deletingId === app.id}>
                          <Trash2 className="w-3.5 h-3.5" />
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
