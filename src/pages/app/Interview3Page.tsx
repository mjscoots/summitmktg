import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ArrowLeft, UserPlus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ManagerAutocomplete } from '@/components/interviews/ManagerAutocomplete';

interface FormData {
  recruitName: string;
  interviewerName: string;
  dreamScenario: string;
  identityQuestion: string;
  futurePacing: string;
  confidenceScale: string;
  commitmentLevel: string;
  notes: string;
  outcome: 'offer' | 'disqualified' | '';
}

interface SelectedManager {
  user_id: string;
  full_name: string;
  email: string;
  team_name: string | null;
}

interface RepFormData {
  fullName: string;
  email: string;
  phone: string;
  teamId: string;
  directManager: SelectedManager | null;
}

export default function Interview3Page() {
  const navigate = useNavigate();
  const { profile, isLoading, user } = useAuth();
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [showRepForm, setShowRepForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    recruitName: '',
    interviewerName: profile?.full_name || '',
    dreamScenario: '',
    identityQuestion: '',
    futurePacing: '',
    confidenceScale: '',
    commitmentLevel: '',
    notes: '',
    outcome: '',
  });

  const [repFormData, setRepFormData] = useState<RepFormData>({
    fullName: '',
    email: '',
    phone: '',
    teamId: '',
    directManager: null,
  });

  useEffect(() => {
    if (profile?.full_name) {
      setFormData(prev => ({ ...prev, interviewerName: profile.full_name }));
    }
  }, [profile]);

  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase.from('teams').select('id, name').order('name');
      setTeams(data || []);
    };
    fetchTeams();
  }, []);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRepChange = (field: keyof RepFormData, value: string | SelectedManager | null) => {
    setRepFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handleSubmit = () => {
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
    
    if (formData.outcome === 'offer') {
      // Pre-fill rep form with recruit name
      setRepFormData(prev => ({ ...prev, fullName: formData.recruitName }));
      setShowRepForm(true);
    } else {
      toast.success('Interview submitted');
      navigate('/app/interviews');
    }
  };

  const handleAddRep = async () => {
    if (!repFormData.fullName.trim()) {
      toast.error('Please enter the rep\'s full name');
      return;
    }
    if (!repFormData.email.trim()) {
      toast.error('Please enter the rep\'s email');
      return;
    }
    if (!repFormData.phone.trim()) {
      toast.error('Please enter the rep\'s phone number');
      return;
    }
    if (!repFormData.directManager) {
      toast.error('Please select a direct manager from the list');
      return;
    }
    if (!repFormData.teamId) {
      toast.error('Please select a team');
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert into rep_signups table
      const { error: signupError } = await supabase.from('rep_signups').insert({
        rep_name: repFormData.fullName,
        rep_email: repFormData.email,
        rep_phone: repFormData.phone,
        team_id: repFormData.teamId,
        signed_by: user?.id,
        source: 'interview3',
      });

      if (signupError) throw signupError;

      // Create notification for the assigned manager
      const interviewData = {
        interview3: {
          recruitName: formData.recruitName,
          interviewer: formData.interviewerName,
          dreamScenario: formData.dreamScenario,
          identityQuestion: formData.identityQuestion,
          futurePacing: formData.futurePacing,
          confidenceScale: formData.confidenceScale,
          commitmentLevel: formData.commitmentLevel,
          notes: formData.notes,
          outcome: 'Offer Extended',
          submittedAt: new Date().toISOString(),
        },
        repInfo: {
          fullName: repFormData.fullName,
          email: repFormData.email,
          phone: repFormData.phone,
        }
      };

      const { error: notificationError } = await supabase.from('user_notifications').insert({
        user_id: repFormData.directManager.user_id,
        title: `New Rep Assigned: ${repFormData.fullName}`,
        message: `${formData.interviewerName} has completed Interview 3 and assigned ${repFormData.fullName} to your team. The rep is ready to begin training.`,
        link: '/app/team',
      });

      if (notificationError) {
        console.error('Notification error:', notificationError);
        // Don't block the flow for notification errors
      }

      toast.success('Rep signed successfully!', {
        description: `${repFormData.fullName} has been added and ${repFormData.directManager.full_name} has been notified`,
      });
      navigate('/app/interviews');
    } catch (err) {
      console.error('Error adding rep:', err);
      toast.error('Failed to add rep');
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

              {/* Psychology-Driven Questions */}
              <div className="space-y-5">
                {/* Easy opener - builds confidence */}
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

                {/* Identity question - goes deeper */}
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

                {/* Anticipation builder */}
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

                {/* Commitment checks */}
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

              {/* Submit */}
              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
              >
                Submit Interview
              </button>
            </div>
          </main>
        </div>
      </SidebarProvider>

      {/* Add Rep Modal */}
      <Dialog open={showRepForm} onOpenChange={setShowRepForm}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Add Rep to Team
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Complete the rep's information to add them to a team.
            </p>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={repFormData.fullName}
                onChange={(e) => handleRepChange('fullName', e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={repFormData.email}
                onChange={(e) => handleRepChange('email', e.target.value)}
                placeholder="rep@example.com"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={repFormData.phone}
                onChange={(e) => handleRepChange('phone', formatPhoneNumber(e.target.value))}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Who is their direct manager? *
              </label>
              <ManagerAutocomplete
                value={repFormData.directManager}
                onChange={(manager) => handleRepChange('directManager', manager)}
                placeholder="Search for a manager..."
                error={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Assign to Team *
              </label>
              <Select value={repFormData.teamId} onValueChange={(v) => handleRepChange('teamId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowRepForm(false);
                  toast.success('Interview submitted');
                  navigate('/app/interviews');
                }}
                className="flex-1 py-2.5 border border-border rounded-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for Now
              </button>
              <button
                onClick={handleAddRep}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-success text-white rounded-lg font-semibold hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Rep'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
}