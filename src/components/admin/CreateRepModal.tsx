import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface CreateRepModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  managers: { user_id: string; full_name: string }[];
  teams: { id: string; name: string }[];
  onSuccess: () => void;
}

function generatePassword(length = 12): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
  let pw = '';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) {
    pw += chars[arr[i] % chars.length];
  }
  return pw;
}

export function CreateRepModal({ open, onOpenChange, managers, teams, onSuccess }: CreateRepModalProps) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [managerId, setManagerId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [password, setPassword] = useState('summit2026');
  const [showPassword, setShowPassword] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const selectedManager = managers.find(m => m.user_id === managerId);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setManagerId('');
    setTeamId('');
    setPassword('summit2026');
    setSendEmail(true);
    setCreatedPassword(null);
  };

  const handleAutoGenerate = () => {
    const pw = generatePassword();
    setPassword(pw);
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({ title: 'Missing fields', description: 'First name, last name, and email are required.', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Weak password', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: email.trim().toLowerCase(),
          password,
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim() || undefined,
          role: 'rookie',
          team_id: teamId || undefined,
          direct_manager: selectedManager?.full_name || undefined,
          status: 'active',
          send_welcome: sendEmail,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCreatedPassword(password);
      toast({ title: '✅ Account Created', description: `${firstName} ${lastName} has been added.` });
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Failed to create account', description: err.message, variant: 'destructive' });
    }

    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-black border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black tracking-tight">
            {createdPassword ? 'Account Created' : 'CREATE REP ACCOUNT'}
          </DialogTitle>
        </DialogHeader>

        {createdPassword ? (
          <div className="space-y-4 pt-2">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="text-sm text-white/60 mb-2">Login Credentials</p>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-white/40">Email</span>
                  <p className="text-sm font-medium">{email}</p>
                </div>
                <div>
                  <span className="text-xs text-white/40">Password</span>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-medium">{createdPassword}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(createdPassword); toast({ title: 'Copied!' }); }}
                      className="text-white/40 hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {sendEmail && (
              <p className="text-xs text-white/40">✉️ Login credentials have been emailed to the rep.</p>
            )}
            <Button onClick={handleClose} className="w-full bg-white text-black hover:bg-white/90 font-bold">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">First Name *</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Last Name *</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-white/60 text-xs">Email *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" className="bg-white/5 border-white/10 text-white mt-1" />
            </div>

            <div>
              <Label className="text-white/60 text-xs">Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555" className="bg-white/5 border-white/10 text-white mt-1" />
            </div>

            <div>
              <Label className="text-white/60 text-xs">Assigned Manager</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  {managers.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id} className="text-white">
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/60 text-xs">Team</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-white">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-white/60 text-xs">Password</Label>
                <button onClick={handleAutoGenerate} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80">
                  <RefreshCw className="w-3 h-3" /> Auto-generate
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white pr-10"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Email toggle */}
            <div className="flex items-center justify-between py-2">
              <Label className="text-white/60 text-xs">Send login credentials via email</Label>
              <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
            </div>

            <div className="text-[10px] text-white/30 bg-white/[0.02] rounded p-2">
              Role: <span className="text-white/50">Rep (Rookie)</span> · Boot Camp will be auto-enforced on first login.
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !firstName.trim() || !lastName.trim() || !email.trim()}
              className="w-full bg-white text-black hover:bg-white/90 font-black h-11 disabled:opacity-30"
            >
              {submitting ? 'Creating...' : 'CREATE ACCOUNT'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
