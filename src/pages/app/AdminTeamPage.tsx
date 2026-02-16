import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreateRepModal } from '@/components/admin/CreateRepModal';
import { UserPlus, Search, RotateCcw, Mail, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface RepRow {
  user_id: string;
  full_name: string;
  email: string;
  direct_manager: string | null;
  status: string | null;
  created_at: string | null;
  bootcamp_completed: boolean;
}

export default function AdminTeamPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [reps, setReps] = useState<RepRow[]>([]);
  const [managers, setManagers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all profiles with bootcamp status
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, direct_manager, status, created_at')
      .order('created_at', { ascending: false });

    // Fetch bootcamp progress for all
    const { data: bootcampData } = await supabase
      .from('bootcamp_progress')
      .select('user_id, bootcamp_completed');

    const bootcampMap = new Map(
      (bootcampData || []).map(b => [b.user_id, b.bootcamp_completed])
    );

    // Fetch managers (users with manager/admin role)
    const { data: managerRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['manager', 'admin']);

    const managerIds = new Set((managerRoles || []).map(r => r.user_id));

    const allReps: RepRow[] = (profiles || []).map(p => ({
      ...p,
      bootcamp_completed: bootcampMap.get(p.user_id) ?? true, // if no record, assume completed (legacy)
    }));

    const mgrs = (profiles || [])
      .filter(p => managerIds.has(p.user_id))
      .map(p => ({ user_id: p.user_id, full_name: p.full_name }));

    setReps(allReps);
    setManagers(mgrs);

    // Fetch teams
    const { data: teamsData } = await supabase.from('teams').select('id, name');
    setTeams(teamsData || []);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleResetPassword = async (userId: string, email: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: userId, new_password: 'summit2026' },
      });
      if (error) throw error;
      toast({ title: 'Password Reset', description: `Password for ${email} reset to default.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string | null) => {
    const newStatus = currentStatus === 'nlc' ? 'active' : 'nlc';
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: newStatus === 'nlc' ? 'Account Deactivated' : 'Account Activated' });
      fetchData();
    }
  };

  const filtered = reps.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-black text-foreground tracking-tight">Admin · Team</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAdmin ? 'Create and manage rep accounts' : 'View team members'}
            </p>
          </div>

          {isAdmin && (
            <Button
              onClick={() => setCreateOpen(true)}
              className="gap-2 bg-white text-black hover:bg-white/90 font-black"
            >
              <UserPlus className="w-4 h-4" />
              CREATE REP ACCOUNT
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9 bg-white/5 border-white/10"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Manager</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Boot Camp</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Created</th>
                    {isAdmin && <th className="text-right px-4 py-3 font-semibold text-white/60 text-xs uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(rep => (
                    <tr key={rep.user_id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{rep.full_name}</td>
                      <td className="px-4 py-3 text-white/60">{rep.email}</td>
                      <td className="px-4 py-3 text-white/60">{rep.direct_manager || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={rep.bootcamp_completed ? 'default' : 'destructive'} className="text-[10px]">
                          {rep.bootcamp_completed ? 'Complete' : 'Incomplete'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge 
                          variant={rep.status === 'nlc' ? 'destructive' : 'outline'} 
                          className="text-[10px]"
                        >
                          {rep.status === 'nlc' ? 'Disabled' : 'Active'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs">
                        {rep.created_at ? format(new Date(rep.created_at), 'MMM d, yyyy') : '—'}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleResetPassword(rep.user_id, rep.email)}
                              className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/5"
                              title="Reset Password"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(rep.user_id, rep.status)}
                              className={`p-1.5 rounded text-xs font-medium ${
                                rep.status === 'nlc'
                                  ? 'text-green-400 hover:bg-green-400/10'
                                  : 'text-red-400 hover:bg-red-400/10'
                              }`}
                              title={rep.status === 'nlc' ? 'Activate' : 'Deactivate'}
                            >
                              {rep.status === 'nlc' ? 'Activate' : 'Disable'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="px-4 py-12 text-center text-white/30">
                        No members found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Rep Modal */}
        <CreateRepModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          managers={managers}
          teams={teams}
          onSuccess={fetchData}
        />
      </div>
    </AppLayout>
  );
}
