import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ArrowLeft, CheckCircle2, Search, User, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ManagerOption {
  user_id: string;
  full_name: string;
  role: string;
  team_name: string | null;
  team_id: string | null;
}

interface FormData {
  recruitName: string;
  interviewerName: string;
  teamId: string;
  reportsTo: ManagerOption | null;
  dreamScenario: string;
  identityQuestion: string;
  futurePacing: string;
  confidenceScale: string;
  commitmentLevel: string;
  notes: string;
  outcome: 'contract_signed' | 'contract_sent_unsigned' | '';
}

export default function Interview3Page() {
  const navigate = useNavigate();
  const { profile, isLoading, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<ManagerOption[]>([]);
  const [managerSearch, setManagerSearch] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const managerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<FormData>({
    recruitName: '',
    interviewerName: profile?.full_name || '',
    teamId: '__none__',
    reportsTo: null,
    dreamScenario: '',
    identityQuestion: '',
    futurePacing: '',
    confidenceScale: '',
    commitmentLevel: '',
    notes: '',
    outcome: '',
  });

  useEffect(() => {
    if (profile?.full_name) {
      setFormData(prev => ({ ...prev, interviewerName: profile.full_name }));
    }
  }, [profile]);

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase.from('teams').select('id, name').order('name');
      setTeams(data || []);
    };
    fetchTeams();
  }, []);

  // Fetch managers/pillars
  useEffect(() => {
    const fetchManagers = async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['manager', 'admin']);

      const managerUserIds = roleData?.map(r => r.user_id) || [];
      if (managerUserIds.length === 0) { setManagerOptions([]); return; }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, team_id, teams:team_id (name)')
        .in('user_id', managerUserIds)
        .neq('status', 'nlc');

      const roleMap = new Map(roleData?.map(r => [r.user_id, r.role]) || []);
      const { data: teamsData } = await supabase.from('teams').select('leader_id');
      const pillarIds = new Set(teamsData?.map(t => t.leader_id).filter(Boolean) || []);

      const options: ManagerOption[] = (profiles || []).map(p => {
        const dbRole = roleMap.get(p.user_id) || 'manager';
        const isPillar = pillarIds.has(p.user_id);
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          role: isPillar ? 'Pillar' : dbRole === 'admin' ? 'Admin' : 'Manager',
          team_name: (p.teams as any)?.name || null,
          team_id: p.team_id,
        };
      });

      options.sort((a, b) => {
        const roleOrder = (r: string) => r === 'Pillar' ? 0 : r === 'Admin' ? 1 : 2;
        const diff = roleOrder(a.role) - roleOrder(b.role);
        return diff !== 0 ? diff : a.full_name.localeCompare(b.full_name);
      });

      setManagerOptions(options);
    };
    fetchManagers();
  }, []);

  // Filter managers by search
  useEffect(() => {
    if (!managerSearch.trim()) {
      setFilteredManagers(managerOptions);
      return;
    }
    const q = managerSearch.toLowerCase();
    setFilteredManagers(managerOptions.filter(m =>
      m.full_name.toLowerCase().includes(q) ||
      (m.team_name && m.team_name.toLowerCase().includes(q))
    ).slice(0, 20));
  }, [managerSearch, managerOptions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (managerRef.current && !managerRef.current.contains(e.target as Node)) {
        setShowManagerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.recruitName.trim()) {
      toast.error('Please enter the recruit name');
      return;
    }
    if (!formData.interviewerName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!formData.outcome) {
      toast.error('Please select an outcome');
      return;
    }

    const hasTeam = formData.teamId !== '__none__';

    // If team selected but no manager, warn
    if (hasTeam && !formData.reportsTo) {
      toast.error('Please select a Direct Manager for this recruit');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save interview to localStorage
      const stored = localStorage.getItem('summit_interview_responses');
      const responses = stored ? JSON.parse(stored) : [];

      const teamName = teams.find(t => t.id === formData.teamId)?.name || '';

      responses.push({
        id: crypto.randomUUID(),
        interviewee: formData.recruitName,
        interview: 3,
        interviewer: formData.interviewerName,
        submitted: new Date().toISOString(),
        data: {
          'Dream Scenario': formData.dreamScenario,
          'Identity Question': formData.identityQuestion,
          'Future Pacing': formData.futurePacing,
          'Confidence Scale (1-10)': formData.confidenceScale,
          'Commitment Level': formData.commitmentLevel,
          'Final Outcome': formData.outcome === 'contract_signed' ? 'Contract Signed' : 'Contract Sent - Unsigned',
          'Team Assignment': hasTeam ? `${teamName} → ${formData.reportsTo?.full_name}` : 'Not assigned',
          'Notes': formData.notes,
        },
      });

      localStorage.setItem('summit_interview_responses', JSON.stringify(responses));

      // Handle team assignment — create profile if team + manager selected
      if (hasTeam && formData.reportsTo) {
        // Insert rep signup record
        await supabase.from('rep_signups').insert({
          rep_name: formData.recruitName,
          rep_email: 'pending@summit.com',
          rep_phone: '',
          team_id: formData.teamId,
          signed_by: user?.id,
          source: 'interview3',
        });

        // Send notifications to assigned manager
        const notifPromises = [];

        notifPromises.push(
          supabase.from('user_notifications').insert({
            user_id: formData.reportsTo.user_id,
            title: `New Rep Assigned: ${formData.recruitName}`,
            message: `${formData.interviewerName} has completed Interview 3 and assigned ${formData.recruitName} to your team.`,
            link: '/app/team',
          })
        );

        const managerExpiry = new Date();
        managerExpiry.setHours(managerExpiry.getHours() + 48);
        notifPromises.push(
          supabase.from('team_notifications').insert({
            team_id: formData.teamId,
            type: 'manager_only',
            signer_user_id: user?.id || '',
            signer_name: formData.interviewerName,
            new_rep_name: formData.recruitName,
            expires_at: managerExpiry.toISOString(),
          })
        );

        const teamWideExpiry = new Date();
        teamWideExpiry.setDate(teamWideExpiry.getDate() + 7);
        notifPromises.push(
          supabase.from('team_notifications').insert({
            team_id: formData.teamId,
            type: 'team_wide',
            signer_user_id: user?.id || '',
            signer_name: formData.interviewerName,
            new_rep_name: formData.recruitName,
            expires_at: teamWideExpiry.toISOString(),
          })
        );

        await Promise.allSettled(notifPromises);

        toast.success(`${formData.recruitName} added to ${teamName} under ${formData.reportsTo.full_name}`);
      } else {
        toast.success('Interview submitted');
      }

      navigate('/app/interviews');
    } catch (err: any) {
      console.error('Error submitting interview:', err);
      toast.error('Failed to submit interview', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const hasTeam = formData.teamId !== '__none__';

  return (
    <ThemeProvider initialRole="manager">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />

          <main className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="mb-6">
              <button
                onClick={() => navigate('/app/interviews')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Interviews</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Interview 3</h1>
                  <p className="text-muted-foreground text-sm">Final decision — closing the deal</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="max-w-2xl space-y-6">
              {/* Row 1: Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Recruit Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.recruitName}
                    onChange={(e) => handleChange('recruitName', e.target.value)}
                    placeholder="Enter recruit name"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Interviewer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.interviewerName}
                    onChange={(e) => handleChange('interviewerName', e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Team + Direct Manager */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Assign to Team
                  </label>
                  <Select
                    value={formData.teamId}
                    onValueChange={(v) => {
                      setFormData(prev => ({
                        ...prev,
                        teamId: v,
                        reportsTo: v === '__none__' ? null : prev.reportsTo,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Assign later</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Direct Manager
                  </label>
                  {!hasTeam ? (
                    <div className="px-4 py-2.5 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground">
                      Select a team first
                    </div>
                  ) : (
                    <div ref={managerRef} className="relative">
                      {formData.reportsTo ? (
                        <div className="flex items-center justify-between px-3 py-2 bg-background border border-border rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{formData.reportsTo.full_name}</p>
                              <p className="text-xs text-muted-foreground">{formData.reportsTo.role} • {formData.reportsTo.team_name}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, reportsTo: null }))}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            value={managerSearch}
                            onChange={(e) => { setManagerSearch(e.target.value); setShowManagerDropdown(true); }}
                            onFocus={() => setShowManagerDropdown(true)}
                            placeholder="Search managers & pillars..."
                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </div>
                      )}

                      {showManagerDropdown && !formData.reportsTo && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                          {filteredManagers.length === 0 ? (
                            <div className="p-3 text-center text-sm text-muted-foreground">
                              {managerSearch ? `No results for '${managerSearch}'` : 'No managers available'}
                            </div>
                          ) : (
                            <ul className="py-1">
                              {filteredManagers.map(m => (
                                <li key={m.user_id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, reportsTo: m }));
                                      setShowManagerDropdown(false);
                                      setManagerSearch('');
                                    }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-center gap-3 text-sm"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-foreground truncate">{m.full_name}</p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {m.role} • {m.team_name || 'No team'}
                                      </p>
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Psychology-Driven Questions */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Imagine you're 3 months into the summer. You've crushed it. What does that version of your life look like?
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Future-pacing: Get them to visualize success
                  </p>
                  <textarea
                    value={formData.dreamScenario}
                    onChange={(e) => handleChange('dreamScenario', e.target.value)}
                    placeholder="Record their vision..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    What type of person do you see yourself becoming? Not just this summer—in life?
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Identity-based: Connect the opportunity to who they want to be
                  </p>
                  <textarea
                    value={formData.identityQuestion}
                    onChange={(e) => handleChange('identityQuestion', e.target.value)}
                    placeholder="Record their response..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    What are you most excited about starting?
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Dopamine trigger: End with anticipation, not doubt
                  </p>
                  <textarea
                    value={formData.futurePacing}
                    onChange={(e) => handleChange('futurePacing', e.target.value)}
                    placeholder="Record their excitement..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Readiness Scale (1-10)
                    </label>
                    <select
                      value={formData.confidenceScale}
                      onChange={(e) => handleChange('confidenceScale', e.target.value)}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    >
                      <option value="">Select...</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Commitment Level
                    </label>
                    <select
                      value={formData.commitmentLevel}
                      onChange={(e) => handleChange('commitmentLevel', e.target.value)}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    >
                      <option value="">Select...</option>
                      <option value="all-in">All-in — ready to go</option>
                      <option value="committed">Committed with minor concerns</option>
                      <option value="interested">Interested but needs more info</option>
                      <option value="hesitant">Hesitant — red flags present</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Any other observations..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Outcome */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Final Outcome *
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange('outcome', 'contract_signed')}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-medium transition-all border',
                      formData.outcome === 'contract_signed'
                        ? 'bg-success text-white border-success'
                        : 'bg-background text-muted-foreground border-border hover:border-success/50'
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    Contract Signed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('outcome', 'contract_sent_unsigned')}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-medium transition-all border',
                      formData.outcome === 'contract_sent_unsigned'
                        ? 'bg-muted text-foreground border-border'
                        : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                    )}
                  >
                    <FileCheck className="w-4 h-4 inline mr-2" />
                    Contract Sent - Unsigned
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Interview'}
              </button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
