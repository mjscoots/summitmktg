import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  onMemberAdded: () => void;
  teams: { id: string; name: string; slug: string }[];
}

interface ManagerOption {
  user_id: string;
  full_name: string;
  role: string;
  team_name: string | null;
  team_id: string | null;
}

export function AddMemberModal({ open, onClose, onMemberAdded, teams }: AddMemberModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<'rookie' | 'manager'>('rookie');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [status, setStatus] = useState<'active' | 'nlc'>('active');
  const [sendWelcome, setSendWelcome] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Manager search
  const [reportsTo, setReportsTo] = useState<ManagerOption | null>(null);
  const [managerSearch, setManagerSearch] = useState('');
  const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<ManagerOption[]>([]);
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const managerRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setSelectedRole('rookie');
      setSelectedTeamId('');
      setStatus('active');
      setSendWelcome(true);
      setReportsTo(null);
      setManagerSearch('');
      setErrors({});
    }
  }, [open]);

  // Fetch managers/pillars for Reports To dropdown
  useEffect(() => {
    if (!open || !selectedTeamId) {
      setManagerOptions([]);
      return;
    }

    const fetchManagers = async () => {
      // Get manager/admin user_ids
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['manager', 'admin']);

      const managerUserIds = roleData?.map(r => r.user_id) || [];
      if (managerUserIds.length === 0) return;

      // Get profiles for these managers on the selected team
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, team_id, teams:team_id (name)')
        .in('user_id', managerUserIds)
        .eq('team_id', selectedTeamId)
        .neq('status', 'nlc');

      const roleMap = new Map(roleData?.map(r => [r.user_id, r.role]) || []);

      const options: ManagerOption[] = (profiles || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        role: roleMap.get(p.user_id) || 'manager',
        team_name: (p.teams as any)?.name || null,
        team_id: p.team_id,
      }));

      // If role is rookie, show managers and pillars
      // If role is manager, show only pillars (team leaders)
      options.sort((a, b) => a.full_name.localeCompare(b.full_name));
      setManagerOptions(options);
    };

    fetchManagers();
  }, [open, selectedTeamId, selectedRole]);

  // Filter managers by search
  useEffect(() => {
    if (!managerSearch.trim()) {
      setFilteredManagers(managerOptions);
      return;
    }
    const q = managerSearch.toLowerCase();
    setFilteredManagers(managerOptions.filter(m =>
      m.full_name.toLowerCase().includes(q)
    ));
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

  // Reset Reports To when team changes
  useEffect(() => {
    setReportsTo(null);
    setManagerSearch('');
  }, [selectedTeamId]);

  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email';
    if (!selectedTeamId) newErrors.team = 'Team is required';
    if (!reportsTo) newErrors.reportsTo = 'Reports To is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const teamName = teams.find(t => t.id === selectedTeamId)?.name || '';

      // Call edge function to create user
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: email.trim().toLowerCase(),
          password: 'summit2026',
          full_name: fullName,
          phone: phone.replace(/\D/g, ''),
          role: selectedRole,
          team_id: selectedTeamId,
          direct_manager: reportsTo?.full_name || '',
          status,
          send_welcome: sendWelcome,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`✅ ${fullName} added to ${teamName} under ${reportsTo?.full_name}`);
      onMemberAdded();
      onClose();
    } catch (err: any) {
      console.error('Error adding member:', err);
      if (err.message?.includes('already been registered') || err.message?.includes('already exists')) {
        setErrors(prev => ({ ...prev, email: 'This email is already in use' }));
      }
      toast.error('Failed to add member', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add New Member
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 -mx-6 px-6" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-first-name">First Name *</Label>
              <Input
                id="add-first-name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className={cn(errors.firstName && 'border-destructive')}
                disabled={isSaving}
              />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-last-name">Last Name *</Label>
              <Input
                id="add-last-name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className={cn(errors.lastName && 'border-destructive')}
                disabled={isSaving}
              />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="add-email">Email *</Label>
            <Input
              id="add-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={cn(errors.email && 'border-destructive')}
              disabled={isSaving}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="add-phone">Phone Number</Label>
            <Input
              id="add-phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(formatPhoneNumber(e.target.value))}
              placeholder="(555) 123-4567"
              disabled={isSaving}
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'rookie' | 'manager')} disabled={isSaving}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rookie">Rookie</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Team */}
          <div className="space-y-1.5">
            <Label>Team *</Label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId} disabled={isSaving}>
              <SelectTrigger className={cn(errors.team && 'border-destructive')}>
                <SelectValue placeholder="Select team..." />
              </SelectTrigger>
              <SelectContent>
                {teams.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.team && <p className="text-xs text-destructive">{errors.team}</p>}
          </div>

          {/* Reports To */}
          <div className="space-y-1.5">
            <Label>Reports To *</Label>
            <div ref={managerRef} className="relative">
              {reportsTo ? (
                <div className="flex items-center justify-between px-3 py-2.5 bg-background border border-border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{reportsTo.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{reportsTo.role} — {reportsTo.team_name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportsTo(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                    disabled={isSaving}
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
                    onChange={e => { setManagerSearch(e.target.value); setShowManagerDropdown(true); }}
                    onFocus={() => setShowManagerDropdown(true)}
                    placeholder={selectedTeamId ? "Search managers on this team..." : "Select a team first"}
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50",
                      errors.reportsTo ? "border-destructive" : "border-border"
                    )}
                    disabled={isSaving || !selectedTeamId}
                  />
                </div>
              )}

              {showManagerDropdown && !reportsTo && selectedTeamId && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredManagers.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      {managerSearch ? 'No managers found' : 'No managers on this team'}
                    </div>
                  ) : (
                    <ul className="py-1">
                      {filteredManagers.map(m => (
                        <li key={m.user_id}>
                          <button
                            type="button"
                            onClick={() => { setReportsTo(m); setShowManagerDropdown(false); setManagerSearch(''); }}
                            className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{m.full_name}</span>
                              <span className="text-muted-foreground ml-1 capitalize">({m.role})</span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {errors.reportsTo && <p className="text-xs text-destructive">{errors.reportsTo}</p>}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as 'active' | 'nlc')} disabled={isSaving}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="nlc">NLC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Welcome Email Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">Send welcome email</p>
              <p className="text-xs text-muted-foreground">Creates login account & sends invite</p>
            </div>
            <Switch checked={sendWelcome} onCheckedChange={setSendWelcome} disabled={isSaving} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
            ) : (
              <><UserPlus className="w-4 h-4 mr-2" />Add Member</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
