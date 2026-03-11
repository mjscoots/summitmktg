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
  Pencil,
  Shield,
  Sun,
  Trash2,
  Flame,
  Trophy,
  Clock,
  Star,
  BookOpen,
  Video,
  MessageSquare,
  Zap,
  FileText,
  Target,
  ChevronDown,
  ChevronUp,
  Rocket,
} from 'lucide-react';
import { getTeamColor } from '@/lib/teamColors';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { DailyTimeBreakdown } from './DailyTimeBreakdown';
import { toast } from 'sonner';

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
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pointsBreakdown, setPointsBreakdown] = useState<any>(null);
  const [allTimeBreakdown, setAllTimeBreakdown] = useState<any>(null);
  const [pointsExpanded, setPointsExpanded] = useState(false);
  const [allTimeExpanded, setAllTimeExpanded] = useState(false);
  const [propsSent, setPropsSent] = useState(false);

  // Fetch pillars if not provided
  useEffect(() => {
    if (pillars.length === 0 && open) {
      const fetchPillars = async () => {
        const { data } = await supabase.from('teams').select('id, name, slug').order('name');
        setLocalPillars(data || []);
      };
      fetchPillars();
    }
  }, [pillars, open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setIsEditMode(false);
      setOnboardingStatus(null);
      setStreakDays(0);
      setTeamName(null);
      setAvatarUrl(null);
      setPointsBreakdown(null);
      setAllTimeBreakdown(null);
      setPointsExpanded(false);
      setAllTimeExpanded(false);
      setPropsSent(false);
    }
  }, [open, member?.user_id]);

  // Fetch extra profile data
  useEffect(() => {
    if (!open || !member) return;
    const fetchExtra = async () => {
      const { data: pData } = await supabase
        .from('profiles')
        .select('onboarding_status, team_id, avatar_url')
        .eq('user_id', member.user_id)
        .single();
      if (pData) {
        setOnboardingStatus(pData.onboarding_status);
        setAvatarUrl(pData.avatar_url);
        if (pData.team_id) {
          const { data: tData } = await supabase.from('teams').select('name').eq('id', pData.team_id).single();
          if (tData) setTeamName(tData.name);
        }
      }
      const { data: sData } = await supabase
        .from('daily_login_streaks')
        .select('current_streak')
        .eq('user_id', member.user_id)
        .single();
      if (sData) setStreakDays(sData.current_streak || 0);

      // Weekly points
      try {
        const { data: lbData } = await (supabase as any).rpc('get_current_leaderboard');
        if (lbData) {
          const myEntry = (lbData as any[]).find((r: any) => r.user_id === member.user_id);
          if (myEntry) {
            setPointsBreakdown({
              total: myEntry.total_points || 0,
              hours: myEntry.hours_points || 0,
              threshold: myEntry.threshold_bonus || 0,
              login: myEntry.login_points || 0,
              streak: myEntry.streak_points || 0,
              chat: myEntry.chat_points || 0,
              lessons: myEntry.lesson_points || 0,
              video: myEntry.video_points || 0,
              manual: myEntry.manual_points || 0,
              reactions: myEntry.reaction_points || 0,
              oneOnOne: myEntry.one_on_one_points || 0,
              rank: myEntry.rank || 0,
            });
          }
        }
      } catch {}

      // All-time points
      try {
        const { data: atData } = await (supabase as any).rpc('get_all_time_leaderboard', { _limit: 100 });
        if (atData) {
          const atEntry = (atData as any[]).find((r: any) => r.user_id === member.user_id);
          if (atEntry) {
            const atRank = (atData as any[]).findIndex((r: any) => r.user_id === member.user_id) + 1;
            setAllTimeBreakdown({
              total: atEntry.total_points || 0,
              hours: atEntry.new_hours_points || 0,
              threshold: atEntry.threshold_bonus || 0,
              login: atEntry.login_points || 0,
              streak: atEntry.streak_points || 0,
              chat: atEntry.chat_points || 0,
              lessons: atEntry.lesson_points || 0,
              video: atEntry.video_points || 0,
              manual: atEntry.manual_points || 0,
              reactions: atEntry.reaction_points || 0,
              oneOnOne: atEntry.one_on_one_points || 0,
              totalTimeMinutes: atEntry.total_time_minutes || 0,
              lessonsCompleted: Number(atEntry.lessons_completed) || 0,
              videosWatched: Number(atEntry.videos_watched) || 0,
              rank: atRank,
            });
          }
        }
      } catch {}
    };
    fetchExtra();
  }, [open, member?.user_id]);

  const effectivePillars = pillars.length > 0 ? pillars : localPillars;

  const userIds = useMemo(() => member ? [member.user_id] : [], [member]);
  const { getProgress } = useTrainingProgress(userIds);

  const directReports = useMemo(() => {
    if (!member) return [];
    return roster.filter(m => {
      if (m.id === member.id) return false;
      const effectiveManager = getCanonicalName(m.direct_manager);
      return namesMatch(effectiveManager, member.full_name);
    }).filter(m => m.status !== 'nlc');
  }, [member, roster]);

  const editPermission = useMemo(() => {
    if (!member || !profile) {
      return { canEdit: false, canEditAll: false, canEditBasic: false, canEditHierarchy: false, allowedFields: [], reason: '' };
    }
    return canEditMemberProfile(roster, profile.full_name || '', currentUserRole, user?.id || '', member);
  }, [member, roster, profile, currentUserRole, user?.id]);

  const getPillarName = (slug: string | undefined) => {
    if (!slug) return teamName || 'Unassigned';
    const pillar = effectivePillars.find(p => p.slug === slug);
    return pillar?.name || teamName || 'Unassigned';
  };

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return '—';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    return phone;
  };

  const handleEditSave = () => { setIsEditMode(false); onStatusChange?.(); };

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';
  const isManagerRole = currentUserRole === 'manager' || isAdminOrOwner;

  const handleDeleteUser = async () => {
    if (!member || !isAdminOrOwner) return;
    setIsDeleting(true);
    try {
      const uid = member.user_id;
      await Promise.all([
        supabase.from('chat_messages').delete().eq('user_id', uid),
        supabase.from('chat_reactions').delete().eq('user_id', uid),
        supabase.from('chat_read_receipts').delete().eq('user_id', uid),
        supabase.from('lesson_progress').delete().eq('user_id', uid),
        supabase.from('daily_login_streaks').delete().eq('user_id', uid),
        supabase.from('daily_training_time').delete().eq('user_id', uid),
        supabase.from('notification_preferences').delete().eq('user_id', uid),
        supabase.from('bootcamp_progress').delete().eq('user_id', uid),
        supabase.from('ai_coach_conversations').delete().eq('user_id', uid),
        supabase.from('video_progress').delete().eq('user_id', uid),
        supabase.from('user_training_achievements').delete().eq('user_id', uid),
        supabase.from('calendar_attendance').delete().eq('user_id', uid),
        supabase.from('downline_edges').delete().eq('child_user_id', uid),
        supabase.from('downline_edges').delete().eq('parent_user_id', uid),
        supabase.from('user_roles').delete().eq('user_id', uid),
      ]);
      await supabase.from('profiles').delete().eq('user_id', uid);
      toast.success(`${member.full_name} has been removed`);
      setDeleteConfirmOpen(false);
      onStatusChange?.();
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!member) return null;

  const isMgr = isManager(roster, member.full_name) || member.role === 'manager';
  const isNLC = member.status === 'nlc' || member.isNLC;
  const progress = getProgress(member.user_id);
  const isSelf = user?.id === member.user_id;
  const teamColor = getTeamColor(getPillarName(member.pillar));

  // Point breakdown items helper (no "Legacy Points" label)
  const makeBreakdownItems = (bd: any, isAllTime = false) => {
    const items = [
      { label: 'Hours Logged', value: bd.hours, icon: Clock, color: 'text-blue-400' },
      { label: 'Time Bonuses', value: bd.threshold, icon: Target, color: 'text-primary' },
      { label: 'Daily Login', value: bd.login, icon: Zap, color: 'text-primary' },
      { label: 'Streak', value: bd.streak, icon: Flame, color: 'text-orange-400' },
      { label: 'Lessons', value: bd.lessons, icon: BookOpen, color: 'text-primary' },
      { label: 'Videos', value: bd.video, icon: Video, color: 'text-primary' },
      { label: 'Chat', value: bd.chat, icon: MessageSquare, color: 'text-emerald-400' },
      { label: 'Reactions', value: bd.reactions, icon: Star, color: 'text-primary' },
      { label: 'Manual', value: bd.manual, icon: FileText, color: 'text-primary' },
      { label: '1:1 Sessions', value: bd.oneOnOne, icon: Users, color: 'text-primary' },
    ];
    return items.filter(i => i.value > 0).sort((a, b) => b.value - a.value);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-card border-border">
        {/* Team color accent bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-1.5 rounded-t-lg"
          style={{ background: `linear-gradient(90deg, hsl(${teamColor.hsl}), hsl(${teamColor.hsl} / 0.3))` }}
        />
        <DialogHeader>
          <DialogTitle className="sr-only">{getDisplayName(member.full_name)}</DialogTitle>
          {/* Centered avatar + name layout */}
          <div className="flex flex-col items-center text-center pt-2">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center border-3 mb-3 overflow-hidden",
              isNLC ? "bg-muted border-muted-foreground/20" : cn(teamColor.bgTint, "border-current/10")
            )} style={!isNLC ? { borderColor: `hsl(${teamColor.hsl} / 0.3)` } : undefined}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={member.full_name} className="w-full h-full object-cover" />
              ) : (
                <User className={cn("w-10 h-10", isNLC ? "text-muted-foreground" : teamColor.text)} />
              )}
            </div>
            <h2 className={cn("text-lg font-black", isNLC ? "text-destructive" : teamColor.text)}>
              {getDisplayName(member.full_name)}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                isNLC ? "bg-destructive/15 text-destructive"
                  : cn(teamColor.bgBadge, teamColor.text)
              )}>
                {isNLC ? 'NLC' : isMgr ? 'Manager' : 'Rookie'}
              </span>
              {isSelf && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">You</span>}
            </div>
            {editPermission.canEdit && !isEditMode && (
              <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)} className="mt-2">
                <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
              </Button>
            )}
            {/* Allow managers to enter edit mode too */}
            {!editPermission.canEdit && isManagerRole && !isSelf && !isEditMode && (
              <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)} className="mt-2">
                <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit Info
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6" style={{ maxHeight: 'calc(85vh - 180px)' }}>
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
            <div className="space-y-3 py-4">

              {/* Quick Stats Row */}
              {!isNLC && (
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2.5 bg-muted/30 rounded-lg">
                    <Flame className="w-3.5 h-3.5 text-orange-400 mx-auto mb-0.5" />
                    <p className="text-lg font-black text-foreground tabular-nums">{streakDays}</p>
                    <p className="text-[9px] text-muted-foreground font-medium">Streak</p>
                  </div>
                  <div className="text-center p-2.5 bg-muted/30 rounded-lg">
                    <Trophy className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                    <p className="text-lg font-black text-foreground tabular-nums">{pointsBreakdown?.total?.toLocaleString() || 0}</p>
                    <p className="text-[9px] text-muted-foreground font-medium">Weekly</p>
                  </div>
                  <div className="text-center p-2.5 bg-muted/30 rounded-lg">
                    <Star className="w-3.5 h-3.5 text-yellow-500 mx-auto mb-0.5" />
                    <p className="text-lg font-black text-foreground tabular-nums">{allTimeBreakdown?.total?.toLocaleString() || 0}</p>
                    <p className="text-[9px] text-muted-foreground font-medium">All-Time</p>
                  </div>
                  <div className="text-center p-2.5 bg-muted/30 rounded-lg">
                    <GraduationCap className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                    <p className="text-lg font-black text-foreground tabular-nums">{progress.percentage}%</p>
                    <p className="text-[9px] text-muted-foreground font-medium">Training</p>
                  </div>
                </div>
              )}

              {/* Training Progress bar */}
              {!isNLC && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-foreground">Training Progress</p>
                    <span className="text-xs text-muted-foreground">{progress.completed}/{progress.total} lessons</span>
                  </div>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
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

              {/* Weekly Points Breakdown */}
              {!isNLC && pointsBreakdown && pointsBreakdown.total > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <button onClick={() => setPointsExpanded(!pointsExpanded)} className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <p className="text-xs font-semibold text-foreground">Weekly Points</p>
                      {pointsBreakdown.rank > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">#{pointsBreakdown.rank}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-primary tabular-nums">{pointsBreakdown.total.toLocaleString()} pts</span>
                      {pointsExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {pointsExpanded && (
                    <div className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
                      {makeBreakdownItems(pointsBreakdown).map(item => (
                        <div key={item.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <item.icon className={cn("w-3.5 h-3.5", item.color)} />
                            <span className="text-xs text-muted-foreground">{item.label}</span>
                          </div>
                          <span className="text-xs font-bold text-foreground tabular-nums">+{item.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* All-Time Points Breakdown */}
              {!isNLC && allTimeBreakdown && allTimeBreakdown.total > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <button onClick={() => setAllTimeExpanded(!allTimeExpanded)} className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <p className="text-xs font-semibold text-foreground">All-Time Points</p>
                      {allTimeBreakdown.rank > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500">#{allTimeBreakdown.rank}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-foreground tabular-nums">{allTimeBreakdown.total.toLocaleString()} pts</span>
                      {allTimeExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {allTimeExpanded && (
                    <div className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
                      <div className="flex gap-2 mb-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          {Math.round(allTimeBreakdown.totalTimeMinutes / 60)}h logged
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          {allTimeBreakdown.lessonsCompleted} lessons
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          {allTimeBreakdown.videosWatched} videos
                        </span>
                      </div>
                      {makeBreakdownItems(allTimeBreakdown, true).map(item => (
                        <div key={item.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <item.icon className={cn("w-3.5 h-3.5", item.color)} />
                            <span className="text-xs text-muted-foreground">{item.label}</span>
                          </div>
                          <span className="text-xs font-bold text-foreground tabular-nums">+{item.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Activity Status — most important for managers */}
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
                    <p className="text-xs text-muted-foreground">Last Active</p>
                    <p className={cn(
                      "text-sm font-semibold",
                      (member as any).is_active_now ? "text-success" : "text-foreground"
                    )}>
                      {formatLastActive((member as any).last_active_at)}
                    </p>
                  </div>
                </div>
              )}

              {/* Onboarding Status */}
              {!isNLC && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Sun className={cn(
                    "w-5 h-5 flex-shrink-0",
                    progress.percentage >= 100 ? "text-warning" :
                    onboardingStatus === 'onboarded' ? "text-primary" :
                    "text-muted-foreground"
                  )} />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Onboarding</p>
                    <p className={cn(
                      "text-sm font-semibold",
                      progress.percentage >= 100 ? "text-warning" :
                      onboardingStatus === 'onboarded' || onboardingStatus === 'summer_ready' ? "text-primary" :
                      "text-destructive"
                    )}>
                      {progress.percentage >= 100 ? '☀️ Summer Ready' 
                        : onboardingStatus === 'onboarded' || onboardingStatus === 'summer_ready' ? 'Onboarded'
                        : 'Not Onboarded'}
                    </p>
                  </div>
                </div>
              )}

              {/* Daily Training Time Breakdown */}
              {!isNLC && (currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'owner') && (
                <DailyTimeBreakdown userId={member.user_id} />
              )}

              {/* Contact Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm text-foreground">{formatPhone(member.phone)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm text-foreground break-all">{member.email}</p>
                </div>
              </div>

              {/* Team */}
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: `hsl(${teamColor.hsl} / 0.06)` }}>
                <Building2 className={cn("w-5 h-5 flex-shrink-0", teamColor.text)} />
                <div>
                  <p className="text-xs text-muted-foreground">Team</p>
                  <p className={cn("text-sm font-semibold", teamColor.text)}>{getPillarName(member.pillar)}</p>
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
                        if (manager && onMemberClick) onMemberClick(manager);
                      }}
                      className={cn("text-sm hover:underline text-left font-semibold", teamColor.text)}
                    >
                      {getDisplayName(member.direct_manager)}
                    </button>
                  ) : (
                    <p className="text-sm text-muted-foreground">Unassigned</p>
                  )}
                </div>
              </div>

              {/* Direct Reports */}
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
                        className={cn("text-xs px-2 py-1 rounded-full transition-colors", teamColor.bgTint, teamColor.text, "hover:opacity-80")}
                      >
                        {getDisplayName(report.full_name)}
                      </button>
                    ))}
                    {directReports.length > 10 && (
                      <span className="text-xs px-2 py-1 text-muted-foreground">+{directReports.length - 10} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* Status Toggle */}
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
                  canEdit={editPermission.canEdit || isManagerRole}
                  disabledReason={editPermission.reason}
                  onStatusChange={() => { onStatusChange?.(); onClose(); }}
                  size="md"
                />
              </div>

              {/* Admin Actions — Delete */}
              {isAdminOrOwner && !isSelf && (
                <div className="pt-2 border-t border-border/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> Admin Actions
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Delete Account
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation */}
    <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently Delete User?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Are you sure you want to permanently delete <strong className="text-foreground">{member?.full_name}</strong>?</p>
              <p>This will remove their account entirely including chat history, training progress, streaks, and their profile. This action cannot be undone.</p>
              <p>If they need access again later, consider marking them as <strong className="text-foreground">'Inactive'</strong> instead.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (!member) return;
              try {
                const { error } = await supabase.from('profiles').update({ status: 'nlc' }).eq('user_id', member.user_id);
                if (error) throw error;
                toast.success(`${member.full_name} marked as inactive`);
                setDeleteConfirmOpen(false);
                onStatusChange?.();
                onClose();
              } catch (err) {
                toast.error('Failed to update status');
              }
            }}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            Mark Inactive
          </AlertDialogAction>
          <AlertDialogAction
            onClick={handleDeleteUser}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Permanently Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
