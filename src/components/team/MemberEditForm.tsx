import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Save, X, Search, User, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { TeamMember } from '@/lib/hierarchyUtils';
import { hasDirectReports, getDisplayName } from '@/lib/hierarchyUtils';

interface Manager {
  user_id: string;
  full_name: string;
  email: string;
  team_name: string | null;
}

interface MemberEditFormProps {
  member: TeamMember;
  roster: TeamMember[];
  onSave: () => void;
  onCancel: () => void;
  teams: { id: string; name: string; slug: string }[];
  canEditHierarchy?: boolean;
}

interface FormData {
  full_name: string;
  phone: string;
  email: string;
  status: 'active' | 'nlc';
  direct_manager: Manager | null;
  pillar_slug: string;
}

export function MemberEditForm({
  member,
  roster,
  onSave,
  onCancel,
  teams,
  canEditHierarchy = false,
}: MemberEditFormProps) {
  const [formData, setFormData] = useState<FormData>({
    full_name: member.full_name || '',
    phone: member.phone || '',
    email: member.email || '',
    status: (member.status === 'nlc' ? 'nlc' : 'active') as 'active' | 'nlc',
    direct_manager: null,
    pillar_slug: member.pillar || '',
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ open: false, title: '', description: '', action: () => {} });

  // Manager search state
  const [managerSearch, setManagerSearch] = useState('');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
  const [isLoadingManagers, setIsLoadingManagers] = useState(false);
  const managerWrapperRef = useRef<HTMLDivElement>(null);

  // Fetch managers on mount
  useEffect(() => {
    const fetchManagers = async () => {
      setIsLoadingManagers(true);
      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('role', ['manager', 'admin']);

        const managerIds = roleData?.map(r => r.user_id) || [];
        if (managerIds.length === 0) {
          setManagers([]);
          return;
        }

        // Fetch ALL active managers/pillars across ALL teams - no team filter
        const { data: profileData } = await supabase
          .from('profiles')
          .select(`user_id, full_name, email, team_id, teams:team_id (name)`)
          .in('user_id', managerIds)
          .neq('status', 'nlc');

        // Also get team leaders (pillars) from teams table
        const { data: teamsData } = await supabase.from('teams').select('leader_id');
        const pillarIds = new Set(teamsData?.map(t => t.leader_id).filter(Boolean) || []);
        const roleMap = new Map(roleData?.map(r => [r.user_id, r.role]) || []);

        const managerList: Manager[] = (profileData || []).map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          team_name: (p.teams as any)?.name || null
        }));

        // Sort pillars first, then by name
        managerList.sort((a, b) => {
          const aIsPillar = pillarIds.has(a.user_id) ? 0 : 1;
          const bIsPillar = pillarIds.has(b.user_id) ? 0 : 1;
          if (aIsPillar !== bIsPillar) return aIsPillar - bIsPillar;
          return a.full_name.localeCompare(b.full_name);
        });
        setManagers(managerList);

        // Set initial manager if exists
        if (member.direct_manager) {
          const currentManager = managerList.find(m => 
            m.full_name.toLowerCase().includes(member.direct_manager?.toLowerCase() || '') ||
            member.direct_manager?.toLowerCase().includes(m.full_name.toLowerCase())
          );
          if (currentManager) {
            setFormData(prev => ({ ...prev, direct_manager: currentManager }));
          }
        }
      } catch (err) {
        console.error('Error fetching managers:', err);
      } finally {
        setIsLoadingManagers(false);
      }
    };

    fetchManagers();
  }, [member.direct_manager]);

  // Filter managers based on search
  useEffect(() => {
    if (!managerSearch.trim()) {
      setFilteredManagers(managers);
      return;
    }
    const search = managerSearch.toLowerCase();
    setFilteredManagers(managers.filter(m => 
      m.full_name.toLowerCase().includes(search) ||
      m.email.toLowerCase().includes(search) ||
      (m.team_name && m.team_name.toLowerCase().includes(search))
    ));
  }, [managerSearch, managers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (managerWrapperRef.current && !managerWrapperRef.current.contains(event.target as Node)) {
        setIsManagerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format phone number as user types
  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 3) {
      newErrors.full_name = 'Name must be at least 3 characters';
    }

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (!phoneDigits) {
      newErrors.phone = 'Phone number is required';
    } else if (phoneDigits.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (canEditHierarchy && !formData.direct_manager) {
      newErrors.direct_manager = 'Please select a direct manager';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStatusChange = (newStatus: 'active' | 'nlc') => {
    if (newStatus === 'nlc') {
      const memberHasReports = hasDirectReports(roster, member.full_name);
      if (memberHasReports) {
        toast.error('Cannot mark as NLC', {
          description: 'This member has direct reports. Please reassign them first.',
        });
        return;
      }

      setConfirmDialog({
        open: true,
        title: 'Mark as No Longer Coming?',
        description: `${getDisplayName(member.full_name)} will be excluded from all team stats and rankings. This action can be undone.`,
        action: () => {
          setFormData(prev => ({ ...prev, status: newStatus }));
          setConfirmDialog(prev => ({ ...prev, open: false }));
        },
      });
    } else {
      setFormData(prev => ({ ...prev, status: newStatus }));
    }
  };

  const handleManagerSelect = (manager: Manager) => {
    const oldManagerName = formData.direct_manager?.full_name || member.direct_manager;
    if (manager.full_name !== oldManagerName) {
      setConfirmDialog({
        open: true,
        title: 'Change Manager Assignment?',
        description: `Reassign ${getDisplayName(member.full_name)} to ${getDisplayName(manager.full_name)}? Their previous manager will no longer have access to edit their information.`,
        action: () => {
          setFormData(prev => ({ ...prev, direct_manager: manager }));
          setManagerSearch('');
          setIsManagerDropdownOpen(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        },
      });
    } else {
      setFormData(prev => ({ ...prev, direct_manager: manager }));
      setManagerSearch('');
      setIsManagerDropdownOpen(false);
    }
  };

  const handleTeamChange = (newSlug: string) => {
    if (newSlug !== member.pillar) {
      const oldTeam = teams.find(t => t.slug === member.pillar)?.name || 'current team';
      const newTeam = teams.find(t => t.slug === newSlug)?.name || 'new team';
      
      setConfirmDialog({
        open: true,
        title: 'Move to Different Team?',
        description: `Move ${getDisplayName(member.full_name)} from ${oldTeam} to ${newTeam}? This will update all associated team stats.`,
        action: () => {
          setFormData(prev => ({ ...prev, pillar_slug: newSlug }));
          setConfirmDialog(prev => ({ ...prev, open: false }));
        },
      });
    } else {
      setFormData(prev => ({ ...prev, pillar_slug: newSlug }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setIsSaving(true);

    try {
      const teamId = canEditHierarchy 
        ? (teams.find(t => t.slug === formData.pillar_slug)?.id || null)
        : undefined;
      
      const updateData: Record<string, any> = {
        full_name: formData.full_name.trim(),
        phone: formData.phone,
        email: formData.email.trim().toLowerCase(),
        status: formData.status,
        updated_at: new Date().toISOString(),
      };

      // Only include hierarchy fields if user has permission
      if (canEditHierarchy) {
        updateData.direct_manager = formData.direct_manager?.full_name || '';
        updateData.pillar_slug = formData.pillar_slug;
        updateData.team_id = teamId;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', member.user_id);

      if (error) throw error;

      const changes: string[] = [];
      if (formData.full_name !== member.full_name) changes.push(`Name: ${member.full_name} → ${formData.full_name}`);
      if (formData.phone !== member.phone) changes.push(`Phone: ${member.phone || '—'} → ${formData.phone}`);
      if (formData.email !== member.email) changes.push(`Email: ${member.email} → ${formData.email}`);
      if (formData.status !== (member.status === 'nlc' ? 'nlc' : 'active')) changes.push(`Status: ${member.status} → ${formData.status}`);
      if (formData.direct_manager?.full_name !== member.direct_manager) changes.push(`Manager: ${member.direct_manager || '—'} → ${formData.direct_manager?.full_name}`);

      if (changes.length > 0) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        await supabase.from('user_notifications').insert({
          user_id: member.user_id,
          title: 'Your profile was updated',
          message: `${getDisplayName(currentProfile?.full_name || 'A manager')} updated your profile:\n${changes.join('\n')}`,
          link: '/app/profile',
        });
      }

      toast.success('Profile updated successfully!');
      onSave();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      if (error.message?.includes('duplicate') || error.code === '23505') {
        setErrors(prev => ({ ...prev, email: 'This email is already associated with another account' }));
        toast.error('Email already in use');
      } else {
        toast.error('Failed to update profile', {
          description: error.message || 'Please try again',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="bg-primary/5 px-4 py-2 -mx-6 mb-4 border-b border-primary/20">
        <p className="text-sm font-medium text-primary">
          Editing {getDisplayName(member.full_name)}'s Profile
        </p>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="full_name">Full Name</Label>
        <Input
          id="full_name"
          value={formData.full_name}
          onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
          className={cn(errors.full_name && 'border-destructive')}
          disabled={isSaving}
        />
        {errors.full_name && (
          <p className="text-xs text-destructive">{errors.full_name}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            phone: formatPhoneNumber(e.target.value) 
          }))}
          placeholder="(555) 123-4567"
          className={cn(errors.phone && 'border-destructive')}
          disabled={isSaving}
        />
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className={cn(errors.email && 'border-destructive')}
          disabled={isSaving}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email}</p>
        )}
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => handleStatusChange(value as 'active' | 'nlc')}
          disabled={isSaving}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="nlc">NLC (No Longer Coming)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Direct Manager */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Direct Manager</Label>
          {!canEditHierarchy && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Only Pillars and Admins can change reporting structure</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {canEditHierarchy ? (
          /* Editable manager search dropdown */
          <div ref={managerWrapperRef} className="relative">
            {formData.direct_manager ? (
              <div className={cn(
                "flex items-center justify-between px-4 py-2.5 bg-background border rounded-lg",
                errors.direct_manager ? "border-destructive" : "border-border"
              )}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{formData.direct_manager.full_name}</p>
                    {formData.direct_manager.team_name && (
                      <p className="text-xs text-muted-foreground">{formData.direct_manager.team_name}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, direct_manager: null }))}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                  onChange={(e) => {
                    setManagerSearch(e.target.value);
                    setIsManagerDropdownOpen(true);
                  }}
                  onFocus={() => setIsManagerDropdownOpen(true)}
                  placeholder="Search for a manager..."
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all",
                    errors.direct_manager ? "border-destructive" : "border-border"
                  )}
                  disabled={isSaving}
                />
              </div>
            )}

            {isManagerDropdownOpen && !formData.direct_manager && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {isLoadingManagers ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                ) : filteredManagers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {managerSearch ? 'No managers found' : 'No managers available'}
                  </div>
                ) : (
                  <ul className="py-1">
                    {filteredManagers.map((manager) => (
                      <li key={manager.user_id}>
                        <button
                          type="button"
                          onClick={() => handleManagerSelect(manager)}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{manager.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              Manager • {manager.team_name || manager.email}
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
        ) : (
          /* Read-only display for non-pillar/admin users */
          <div className="flex items-center px-4 py-2.5 bg-muted/30 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {member.direct_manager || 'Unassigned'}
              </p>
            </div>
          </div>
        )}
        {errors.direct_manager && (
          <p className="text-xs text-destructive">{errors.direct_manager}</p>
        )}
      </div>

      {/* Team Assignment */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Team Assignment</Label>
          {!canEditHierarchy && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Only Pillars and Admins can change team assignment</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {canEditHierarchy ? (
          <Select
            value={formData.pillar_slug}
            onValueChange={handleTeamChange}
            disabled={isSaving}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select team..." />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.slug}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="px-4 py-2.5 bg-muted/30 border border-border rounded-lg">
            <p className="text-sm font-medium text-foreground">
              {teams.find(t => t.slug === formData.pillar_slug)?.name || 'Unassigned'}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, open: false }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.action}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
