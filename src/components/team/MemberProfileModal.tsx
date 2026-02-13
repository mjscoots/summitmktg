import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  UserCheck, 
  GraduationCap, 
  Users,
  Pencil
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  TeamMember,
  isManager,
  getDisplayName,
  getCanonicalName,
  namesMatch,
} from '@/lib/hierarchyUtils';
import { canEditMemberProfile } from '@/lib/editPermissions';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';
import { useAuth } from '@/hooks/useAuth';
 import { formatLastActive, formatTimeMinutes } from '@/hooks/useActivityTracking';
 import { ActivityIndicator } from '@/components/shared/ActivityIndicator';
import { TrainingProgressBadge } from './TrainingProgressBadge';
import { MemberStatusToggle } from './MemberStatusToggle';
import { MemberEditForm } from './MemberEditForm';

interface MemberProfileModalProps {
  member: TeamMember | null;
  open: boolean;
  onClose: () => void;
  roster: TeamMember[];
  pillars?: { id: string; name: string; slug: string }[];
  onMemberClick?: (member: TeamMember) => void;
  onStatusChange?: () => void;
}

export function MemberProfileModal({
  member,
  open,
  onClose,
  roster,
  pillars = [],
  onMemberClick,
  onStatusChange,
}: MemberProfileModalProps) {
  const { profile, role: currentUserRole, user } = useAuth();
  const [localPillars, setLocalPillars] = useState<{ id: string; name: string; slug: string }[]>(pillars);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch pillars if not provided
  useEffect(() => {
    if (pillars.length === 0 && open) {
      const fetchPillars = async () => {
        const { data } = await supabase
          .from('teams')
          .select('id, name, slug')
          .order('name');
        setLocalPillars(data || []);
      };
      fetchPillars();
    }
  }, [pillars, open]);

  // Reset edit mode when modal closes or member changes
  useEffect(() => {
    if (!open) {
      setIsEditMode(false);
    }
  }, [open, member?.user_id]);

  const effectivePillars = pillars.length > 0 ? pillars : localPillars;

  // Get training progress for displayed member
  const userIds = useMemo(() => member ? [member.user_id] : [], [member]);
  const { getProgress } = useTrainingProgress(userIds);

  // Find direct reports
  const directReports = useMemo(() => {
    if (!member) return [];
    return roster.filter(m => {
      if (m.id === member.id) return false;
      const effectiveManager = getCanonicalName(m.direct_manager);
      return namesMatch(effectiveManager, member.full_name);
    }).filter(m => m.status !== 'nlc');
  }, [member, roster]);

  // Check edit permissions
  const editPermission = useMemo(() => {
    if (!member || !profile) {
      return { canEdit: false, canEditAll: false, canEditBasic: false, canEditHierarchy: false, allowedFields: [], reason: '' };
    }
    return canEditMemberProfile(
      roster,
      profile.full_name || '',
      currentUserRole,
      user?.id || '',
      member
    );
  }, [member, roster, profile, currentUserRole, user?.id]);

  const getPillarName = (slug: string | undefined) => {
    if (!slug) return 'Unassigned';
    const pillar = effectivePillars.find(p => p.slug === slug);
    return pillar?.name || 'Unassigned';
  };

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return '—';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const handleEditSave = () => {
    setIsEditMode(false);
    onStatusChange?.();
  };

  if (!member) return null;

  const isMgr = isManager(roster, member.full_name) || member.role === 'manager';
  const isNLC = member.status === 'nlc' || member.isNLC;
  const progress = getProgress(member.user_id);
  const isSelf = user?.id === member.user_id;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              isNLC 
                ? "bg-muted" 
                : isMgr 
                  ? "bg-primary/20" 
                  : "bg-success/20"
            )}>
              <User className={cn(
                "w-6 h-6",
                isNLC 
                  ? "text-muted-foreground" 
                  : isMgr 
                    ? "text-primary" 
                    : "text-success"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <span className={cn(
                "block",
                isNLC 
                  ? "text-destructive" 
                  : isMgr 
                    ? "text-primary" 
                    : "text-success"
              )}>
                {getDisplayName(member.full_name)}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  isNLC 
                    ? "bg-destructive/15 text-destructive"
                    : isMgr 
                      ? "bg-primary/15 text-primary" 
                      : "bg-success/15 text-success"
                )}>
                  {isNLC ? 'NLC' : isMgr ? 'Manager' : 'Rookie'}
                </span>
                {isSelf && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    This is you
                  </span>
                )}
              </div>
            </div>
            {/* Edit Button - only show if can edit and not in edit mode */}
            {editPermission.canEdit && !isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="flex-shrink-0"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

         <div className="flex-1 overflow-y-auto -mx-6 px-6" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {isEditMode ? (
            <MemberEditForm
              member={member}
              roster={roster}
              onSave={handleEditSave}
              onCancel={() => setIsEditMode(false)}
              teams={effectivePillars}
              canEditHierarchy={editPermission.canEditHierarchy}
            />
          ) : (
            <div className="space-y-4 py-4">
              {/* Training Progress */}
              {!isNLC && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Training Progress</p>
                    <div className="flex items-center gap-2">
                      <TrainingProgressBadge 
                        percentage={progress.percentage} 
                        size="md"
                      />
                      <span className="text-sm text-muted-foreground">
                        ({progress.completed}/{progress.total} lessons)
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        progress.percentage === 100 ? "bg-success" :
                        progress.percentage >= 67 ? "bg-primary" :
                        progress.percentage >= 34 ? "bg-warning" :
                        "bg-destructive"
                      )}
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>
              )}

           {/* Activity Status - Show for all non-NLC members */}
           {!isNLC && (
             <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
               <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                 <div className={cn(
                   "w-3 h-3 rounded-full",
                   (member as any).is_active_now 
                     ? "bg-success animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.5)]" 
                     : "bg-muted-foreground/40"
                 )} />
               </div>
               <div className="flex-1">
                 <p className="text-xs text-muted-foreground">Activity Status</p>
                 <p className={cn(
                   "text-sm font-medium",
                   (member as any).is_active_now ? "text-success" : "text-foreground"
                 )}>
                   {formatLastActive((member as any).last_active_at)}
                 </p>
               </div>
               {/* Show time this week for pillars only */}
               {(currentUserRole === 'admin' || currentUserRole === 'manager') && (member as any).time_this_week_minutes !== undefined && (
                 <div className="text-right">
                   <p className="text-xs text-muted-foreground">This week</p>
                   <p className="text-sm font-medium text-foreground">
                     {formatTimeMinutes((member as any).time_this_week_minutes || 0)}
                   </p>
                 </div>
               )}
             </div>
           )}
 
              {/* Phone */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm text-foreground">{formatPhone(member.phone)}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm text-foreground">{member.email}</p>
                </div>
              </div>

              {/* Team */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Building2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Team</p>
                  <p className="text-sm text-foreground">{getPillarName(member.pillar)}</p>
                </div>
              </div>

              {/* Reports To */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <UserCheck className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Reports to</p>
                  {member.direct_manager ? (
                    <button
                      onClick={() => {
                        const manager = roster.find(m => namesMatch(m.full_name, member.direct_manager));
                        if (manager && onMemberClick) {
                          onMemberClick(manager);
                        }
                      }}
                      className="text-sm text-primary hover:underline text-left"
                    >
                      {getDisplayName(member.direct_manager)}
                    </button>
                  ) : (
                    <p className="text-sm text-muted-foreground">Unassigned</p>
                  )}
                </div>
              </div>

              {/* Direct Reports (if any) */}
              {directReports.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Direct Reports</p>
                      <p className="text-sm text-foreground">{directReports.length} members</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-8">
                    {directReports.slice(0, 10).map(report => (
                      <button
                        key={report.id}
                        onClick={() => onMemberClick?.(report)}
                        className={cn(
                          "text-xs px-2 py-1 rounded-full transition-colors",
                          isManager(roster, report.full_name) || report.role === 'manager'
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : "bg-success/10 text-success hover:bg-success/20"
                        )}
                      >
                        {getDisplayName(report.full_name)}
                      </button>
                    ))}
                    {directReports.length > 10 && (
                      <span className="text-xs px-2 py-1 text-muted-foreground">
                        +{directReports.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Status Toggle - only show in view mode */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm text-foreground">Member Status</p>
                  </div>
                </div>
                <MemberStatusToggle
                  member={member}
                  roster={roster}
                  canEdit={editPermission.canEdit}
                  disabledReason={editPermission.reason}
                  onStatusChange={() => {
                    onStatusChange?.();
                    onClose();
                  }}
                  size="md"
                />
              </div>
            </div>
          )}
         </div>
      </DialogContent>
    </Dialog>
  );
}
