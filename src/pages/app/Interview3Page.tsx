import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TeamAssignmentSection, TeamAssignmentData } from '@/components/interviews/TeamAssignmentSection';

interface FormData {
  recruitName: string;
  interviewerName: string;
  recruitEmail: string;
  recruitPhone: string;
  dreamScenario: string;
  identityQuestion: string;
  futurePacing: string;
  confidenceScale: string;
  commitmentLevel: string;
  notes: string;
  outcome: 'offer' | 'disqualified' | '';
}

export default function Interview3Page() {
  const navigate = useNavigate();
  const { profile, isLoading, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamAssignment, setTeamAssignment] = useState<TeamAssignmentData | null>(null);

  const [formData, setFormData] = useState<FormData>({
    recruitName: '',
    interviewerName: profile?.full_name || '',
    recruitEmail: '',
    recruitPhone: '',
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

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
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

    // Validate team assignment if partially filled
    if (teamAssignment && !teamAssignment.reportsTo) {
      toast.error('Please select who this recruit reports to');
      return;
    }

    if (teamAssignment?.createAccount && !formData.recruitEmail.trim()) {
      toast.error('Email is required to create a Summit account');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save interview to localStorage
      const stored = localStorage.getItem('summit_interview_responses');
      const responses = stored ? JSON.parse(stored) : [];
      
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
          'Final Outcome': formData.outcome === 'offer' ? 'Offer Extended' : 'Disqualified',
          'Notes': formData.notes,
        },
      });
      
      localStorage.setItem('summit_interview_responses', JSON.stringify(responses));

      // Handle team assignment if selected (for "offer" outcome)
      if (formData.outcome === 'offer' && teamAssignment && teamAssignment.reportsTo) {
        // Insert rep signup record
        await supabase.from('rep_signups').insert({
          rep_name: formData.recruitName,
          rep_email: formData.recruitEmail || 'no-email@pending.com',
          rep_phone: formData.recruitPhone || '',
          team_id: teamAssignment.teamId,
          signed_by: user?.id,
          source: 'interview3',
        });

        if (teamAssignment.createAccount && formData.recruitEmail.trim()) {
          // Create account via edge function
          const { data, error } = await supabase.functions.invoke('admin-create-user', {
            body: {
              email: formData.recruitEmail.trim().toLowerCase(),
              password: 'summit2026',
              full_name: formData.recruitName.trim(),
              phone: formData.recruitPhone.replace(/\D/g, ''),
              role: teamAssignment.role,
              team_id: teamAssignment.teamId,
              direct_manager: teamAssignment.reportsTo.full_name,
              status: 'active',
              send_welcome: true,
            },
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);

          toast.success(`✅ ${formData.recruitName} added to ${teamAssignment.teamName} under ${teamAssignment.reportsTo.full_name} and invited to Summit!`);
        } else {
          // No account creation — just record the signup
          toast.success(`✅ ${formData.recruitName} added to ${teamAssignment.teamName}. No login created yet.`);
        }

        // Send notifications to assigned manager
        const notifPromises = [];

        notifPromises.push(
          supabase.from('user_notifications').insert({
            user_id: teamAssignment.reportsTo.user_id,
            title: `New Rep Assigned: ${formData.recruitName}`,
            message: `${formData.interviewerName} has completed Interview 3 and assigned ${formData.recruitName} to your team.`,
            link: '/app/team',
          })
        );

        const managerExpiry = new Date();
        managerExpiry.setHours(managerExpiry.getHours() + 48);
        notifPromises.push(
          supabase.from('team_notifications').insert({
            team_id: teamAssignment.teamId,
            type: 'manager_only',
            signer_user_id: user?.id || '',
            signer_name: formData.interviewerName,
            new_rep_name: formData.recruitName,
            new_rep_email: formData.recruitEmail,
            new_rep_phone: formData.recruitPhone,
            expires_at: managerExpiry.toISOString(),
          })
        );

        const teamWideExpiry = new Date();
        teamWideExpiry.setDate(teamWideExpiry.getDate() + 7);
        notifPromises.push(
          supabase.from('team_notifications').insert({
            team_id: teamAssignment.teamId,
            type: 'team_wide',
            signer_user_id: user?.id || '',
            signer_name: formData.interviewerName,
            new_rep_name: formData.recruitName,
            new_rep_email: formData.recruitEmail,
            new_rep_phone: formData.recruitPhone,
            expires_at: teamWideExpiry.toISOString(),
          })
        );

        await Promise.allSettled(notifPromises);
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
              {/* Basic Info */}
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

              {/* Recruit contact info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Recruit Email
                  </label>
                  <input
                    type="email"
                    value={formData.recruitEmail}
                    onChange={(e) => handleChange('recruitEmail', e.target.value)}
                    placeholder="recruit@example.com"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Recruit Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.recruitPhone}
                    onChange={(e) => handleChange('recruitPhone', formatPhoneNumber(e.target.value))}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
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
                    onClick={() => handleChange('outcome', 'offer')}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-medium transition-all border',
                      formData.outcome === 'offer'
                        ? 'bg-success text-white border-success'
                        : 'bg-background text-muted-foreground border-border hover:border-success/50'
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    Offer Extended
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('outcome', 'disqualified')}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-medium transition-all border',
                      formData.outcome === 'disqualified'
                        ? 'bg-muted text-foreground border-border'
                        : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                    )}
                  >
                    Disqualified
                  </button>
                </div>
              </div>

              {/* Team Assignment Section — only shown when outcome is "offer" */}
              {formData.outcome === 'offer' && (
                <TeamAssignmentSection
                  recruitEmail={formData.recruitEmail}
                  onChange={setTeamAssignment}
                />
              )}

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
