import { useEffect, useMemo, useState, useCallback } from 'react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Users,
  Search,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingList } from '@/components/shared/LoadingList';
import { AddMemberModal } from '@/components/team/AddMemberModal';
import { PageHeader } from '@/components/layout/PageHeader';
import { InviteDialog } from '@/components/invites/InviteDialog';
import { MemberProfileModal } from '@/components/team/MemberProfileModal';
import { RepScorecard } from '@/components/shared/RepScorecard';
import { RankInsignia } from '@/components/badges/RankInsignia';
import { MyMenteesPanel } from '@/components/team/MyMenteesPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useManagerNotifications } from '@/hooks/useManagerNotifications';
import { TeamMember, getDisplayName, getEffectiveManager } from '@/lib/hierarchyUtils';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { FiberTeam } from '@/components/team/FiberTeam';
import { ThisWeekStrip } from '@/components/team/ThisWeekStrip';
import { RollToFiberDialog } from '@/components/team/RollToFiberDialog';
import { GoingColdCard } from '@/components/team/GoingColdCard';
import { NewRepsPanel } from '@/components/team/NewRepsPanel';
import { GatedRecruitsPanel } from '@/components/team/GatedRecruitsPanel';
import { DarkRepRadar } from '@/components/team/DarkRepRadar';
import PillarLinksPanel from '@/components/pillar/PillarLinksPanel';
import OnboardingTrackerPanel from '@/components/onboarding/OnboardingTrackerPanel';
import { OwedThisWeek } from '@/components/team/OwedThisWeek';
import { useRollover } from '@/hooks/useRollover';
import { daysUntil, formatStart } from '@/lib/rollover';


const CARD = 'rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-sm';

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  experience: string;
  team_id: string | null;
  direct_manager: string | null;
  last_active_at: string | null;
  is_active_now: boolean | null;
}

interface TeamRow {
  id: string;
  name: string;
  slug: string;
  leader_id: string | null;
  logo_url?: string | null;
}

export default function MyTeamPage() {
  const { role, profile, isLoading: authLoading } = useAuth();
  const { activeVertical } = useWorkspace();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();


  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [managerIds, setManagerIds] = useState<Set<string>>(new Set());
  const [weekPoints, setWeekPoints] = useState<Map<string, number>>(new Map());
  const [incompleteProfiles, setIncompleteProfiles] = useState<Map<string, string[]>>(new Map());
  const [missedMeetings, setMissedMeetings] = useState<Map<string, number>>(new Map());
  const [finishingSoon, setFinishingSoon] = useState<
    { user_id: string; full_name: string | null; committed_last_day: string }[]
  >([]);

  const [viewMode, setViewMode] = useState<'teams' | 'members' | 'mentees'>(() => {
    const t = searchParams.get('tab');
    if (t === 'members' || t === 'mentees') return t;
    return 'teams';
  });
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>(() => {
    try {
      return sessionStorage.getItem('team-filter') || 'all';
    } catch {
      return 'all';
    }
  });

  const [sheetMember, setSheetMember] = useState<ProfileRow | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [profileModalMember, setProfileModalMember] = useState<TeamMember | null>(null);

  const isAdmin = role === 'admin' || role === 'owner';
  const isManagerRole = role === 'manager' || isAdmin;

  // Manager-only tabs: reps landing on ?tab=triage fall back to Teams
  useEffect(() => {
    if (authLoading) return;
    if (!isManagerRole && viewMode === 'mentees') setViewMode('teams');
  }, [authLoading, isManagerRole, viewMode]);

  useManagerNotifications();

  // Off-season rollover: pest reps into fiber before the season ends.
  const rollover = useRollover();
  const [rollOpen, setRollOpen] = useState(false);
  const seasonDays = rollover.seasonEnd ? daysUntil(rollover.seasonEnd) : null;
  const showSeasonLine = seasonDays !== null && seasonDays >= 0 && seasonDays <= 21;
  const withFiber = rollover.reps.filter(r => r.hasFiber).length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // The workspace is the wall: only people who belong to the active
      // industry appear on this roster.
      const { data: memberRows } = await (supabase as any).rpc('vertical_member_ids', {
        _vertical: activeVertical,
      });
      const memberIds = ((memberRows as { user_id: string }[]) ?? []).map((m) => m.user_id);

      const [p, t, r] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'id, user_id, full_name, email, phone, avatar_url, status, experience, team_id, direct_manager, last_active_at, is_active_now'
          )
          .eq('archived', false)
          .in('user_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'])
          .order('full_name'),
        supabase.from('teams').select('*').eq('retired', false).order('name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      setProfiles(((p.data as ProfileRow[]) ?? []).filter(x => x.status !== 'nlc'));
      setTeams((t.data as TeamRow[]) ?? []);
      setManagerIds(
        new Set(
          (r.data ?? [])
            .filter((row: any) => row.role === 'manager' || row.role === 'admin' || row.role === 'owner')
            .map((row: any) => row.user_id)
        )
      );

      // Points this week for team cards
      try {
        const { data: lb } = await supabase.rpc('get_current_leaderboard', { _vertical: activeVertical } as never);
        const map = new Map<string, number>();
        for (const row of (lb as any[]) ?? []) {
          map.set(row.user_id, row.total_points ?? 0);
        }
        setWeekPoints(map);
      } catch {
        // points are optional
      }

      // Incomplete profile flags — manager/admin/owner only
      try {
        const { data: incomplete } = await supabase.rpc('get_incomplete_profiles' as never, { _vertical: activeVertical } as never);
        const incMap = new Map<string, string[]>();
        for (const row of (incomplete as any[]) ?? []) {
          incMap.set(row.user_id, row.missing ?? []);
        }
        setIncompleteProfiles(incMap);
      } catch {
        // optional, only visible to managers+
      }

      // Missed-meeting flags — manager/admin/owner only
      try {
        const { data: flags } = await (supabase as any).rpc('get_attendance_flags', { _vertical: activeVertical });
        const fMap = new Map<string, number>();
        for (const row of (flags as any[]) ?? []) {
          if ((row.missed_streak ?? 0) >= 2) fMap.set(row.user_id, row.missed_streak);
        }
        setMissedMeetings(fMap);
      } catch {
        // optional, only visible to managers+
      }

      // Finishing soon (committed last day within 14 days) — manager/admin/owner only
      try {
        const { data: fs } = await (supabase as any).rpc('get_finishing_soon', { _days: 14, _vertical: activeVertical });
        setFinishingSoon((fs?.soon as any[]) ?? []);
      } catch {
        // optional, only visible to managers+
      }
    } catch (err) {
      console.error('Error loading team data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeVertical]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  useEffect(() => {
    try {
      sessionStorage.setItem('team-filter', teamFilter);
    } catch {
      /* ignore */
    }
  }, [teamFilter]);

  const teamName = useCallback(
    (id: string | null) => (id ? teams.find(t => t.id === id)?.name ?? 'Unassigned' : 'Unassigned'),
    [teams]
  );

  const teamCards = useMemo(() => {
    return teams
      .map(t => {
        const members = profiles.filter(p => p.team_id === t.id);
        const managers = members.filter(m => managerIds.has(m.user_id));
        const leader = t.leader_id ? profiles.find(p => p.user_id === t.leader_id) : undefined;
        const points = members.reduce((sum, m) => sum + (weekPoints.get(m.user_id) ?? 0), 0);
        return {
          ...t,
          members,
          managerName: leader?.full_name ?? managers[0]?.full_name ?? null,
          repCount: members.length,
          points,
        };
      })
      .sort((a, b) => b.repCount - a.repCount);
  }, [teams, profiles, managerIds, weekPoints]);

  const directory = useMemo(() => {
    let list = profiles;
    if (teamFilter !== 'all') list = list.filter(p => p.team_id === teamFilter);
    const q = memberSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        p =>
          p.full_name?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          (p.phone ?? '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [profiles, teamFilter, memberSearch]);

  const roleLabel = (userId: string) => (managerIds.has(userId) ? 'Manager' : 'Rookie');

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'contract_signed':
        return 'Signed';
      case 'onboarded':
        return 'Onboarded';
      case 'info_added':
        return 'Info added';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const openProfileModal = (p: ProfileRow) => {
    const member: TeamMember = {
      id: p.id,
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      status: p.status as any,
      experience: p.experience as any,
      direct_manager: getEffectiveManager(p.direct_manager),
      role: managerIds.has(p.user_id) ? 'manager' : 'rookie',
    };
    setSheetMember(null);
    setProfileModalMember(member);
  };

  const canAddMembers = isAdmin || teams.some(t => t.leader_id === profile?.user_id);

  // Fiber runs on regions and installs, not the pest downline structure.
  if (activeVertical === 'Fiber') {
    return (
      <AppLayout>
        <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
          <PageHeader
            title="Team"
            context="Your region, by installs this week."
            action={isManagerRole ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate('/app/stacks')}>
                  Stacks
                </Button>
                <InviteDialog managerLocked={!isAdmin} />
              </div>
            ) : undefined}
          />


          <OwedThisWeek />

          {isManagerRole && <PillarLinksPanel />}

          {isManagerRole && <OnboardingTrackerPanel canPlace={canAddMembers} />}

          {isManagerRole && <DarkRepRadar />}

          <FiberTeam />

        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <header className="mb-5">
          <PageHeader
            title="Team"
            context={`${profiles.length} active ${profiles.length === 1 ? 'rep' : 'reps'} across ${teams.length} ${teams.length === 1 ? 'team' : 'teams'}`}
            className="border-none pb-0"
            action={
              <div className="flex items-center gap-2">
                {/* Pass 89 — the bulk roll is owner and admin only. A manager's
                    path is telling reps to request Fiber access. */}
                {isAdmin && activeVertical === 'Pest' && (
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setRollOpen(true)}>
                    Roll into Fiber
                  </Button>
                )}

                {isManagerRole && (
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate('/app/stacks')}>
                    Stacks
                  </Button>
                )}

                {isManagerRole && <InviteDialog managerLocked={!isAdmin} />}
                {canAddMembers ? (
                  <Button onClick={() => setAddMemberOpen(true)} size="sm" className="gap-1.5 rounded-xl flex-shrink-0">
                    <UserPlus className="w-3.5 h-3.5" />
                    Add
                  </Button>
                ) : null}
              </div>
            }
          />

          <div className="mt-4">
            <OwedThisWeek />
          </div>

          {/* View toggle */}
          <div className="mt-4 inline-flex items-center gap-0.5 p-1 rounded-xl bg-card/40 border border-white/[0.06]">
            {(isManagerRole
              ? (['teams', 'members', 'mentees'] as const)
              : (['teams', 'members'] as const)
            ).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </header>

        {isManagerRole && showSeasonLine && rollover.seasonEnd && (
          <p className="mb-4 text-[13px] text-muted-foreground">
            Season ends {formatStart(rollover.seasonEnd)}. {withFiber} of your {rollover.reps.length} active reps
            have a Fiber start.
          </p>
        )}

        {isManagerRole && (
          <div className="mb-5">
            <ThisWeekStrip />
          </div>
        )}

        {isManagerRole && (
          <div className="mb-5">
            <PillarLinksPanel />
          </div>
        )}

        {isManagerRole && (
          <div className="mb-5">
            <OnboardingTrackerPanel canPlace={canAddMembers} />
          </div>
        )}

        {isManagerRole && (
          <div className="mb-5">
            <DarkRepRadar />
          </div>
        )}

        {isManagerRole && (
          <div className="mb-5">
            <GatedRecruitsPanel />
          </div>
        )}

        {isManagerRole && (
          <div className="mb-5">
            <NewRepsPanel />
          </div>
        )}

        {isAdmin && !rollover.loading && (
          <div className="mb-5">
            <GoingColdCard
              reps={rollover.reps}
              carriers={rollover.carriers}
              seasonEnd={rollover.seasonEnd}
              onDone={() => void rollover.refresh()}
            />
          </div>
        )}

        {rollOpen && (
          <RollToFiberDialog
            open={rollOpen}
            onOpenChange={setRollOpen}
            reps={rollover.reps}
            carriers={rollover.carriers}
            seasonEnd={rollover.seasonEnd}
            onDone={() => void rollover.refresh()}
          />
        )}


        {loading ? (
          <LoadingList rows={6} />
        ) : viewMode === 'teams' ? (
          /* ===== TEAMS ===== */
          <div className="space-y-3">
            {teamCards.map(team => {
              const isOpen = expandedTeam === team.id;
              return (
                <div key={team.id} className={cn(CARD, 'overflow-hidden')}>
                  <button
                    onClick={() => setExpandedTeam(isOpen ? null : team.id)}
                    className="w-full text-left px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/30 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{team.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {team.managerName ? `Manager: ${getDisplayName(team.managerName)}` : 'No manager set'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-foreground tabular-nums">{team.repCount}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">reps</p>
                      </div>
                      <div className="text-right flex-shrink-0 w-16">
                        <p className="text-sm font-bold text-primary tabular-nums">{team.points}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">pts/wk</p>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/[0.06] p-3">
                      {team.members.length === 0 && (
                        <p className="px-1 py-4 text-sm text-muted-foreground">No reps on this team yet.</p>
                      )}
                      <div className="grid gap-2 stagger sm:grid-cols-2">
                        {team.members.map(m => (
                          <button
                            key={m.user_id}
                            onClick={() => setSheetMember(m)}
                            className="card-ice flex items-center gap-3 px-3 py-3 text-left"
                          >
                            <UserAvatar avatarUrl={m.avatar_url} fullName={m.full_name || 'Unnamed'} size="lg" className="avatar-ring h-14 w-14 text-base" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-semibold text-foreground">
                                {getDisplayName(m.full_name)}
                              </span>
                              <span className="mt-1 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                {roleLabel(m.user_id)}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
            {teamCards.length === 0 && (
              <p className={cn(CARD, 'px-4 py-10 text-center text-sm text-muted-foreground')}>No teams yet.</p>
            )}
          </div>
        ) : (
          /* ===== MEMBERS DIRECTORY ===== */
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search name, email, or phone..."
                  className="pl-9 bg-card/50 border-white/[0.08]"
                />
              </div>
              <div className="relative">
                <select
                  value={teamFilter}
                  onChange={e => setTeamFilter(e.target.value)}
                  className="appearance-none w-full sm:w-auto pl-3 pr-9 py-2 text-sm rounded-md bg-card/50 border border-white/[0.08] text-foreground"
                >
                  <option value="all">All teams</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              {teamFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTeamFilter('all')}
                  className="h-9 w-9 flex-shrink-0 text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {directory.length} {directory.length === 1 ? 'person' : 'people'}
            </p>

            <div className={cn(CARD, 'divide-y divide-white/[0.05] overflow-hidden')}>
              {directory.map(m => (
                <button
                  key={m.user_id}
                  onClick={() => setSheetMember(m)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/[0.03] transition-colors"
                >
                  <UserAvatar avatarUrl={m.avatar_url} fullName={m.full_name || 'Unnamed'} size="md" className="w-9 h-9 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">{getDisplayName(m.full_name)}</p>
                      <RankInsignia role={managerIds.has(m.user_id) ? 'manager' : 'rookie'} size="sm" />
                      {isManagerRole && incompleteProfiles.has(m.user_id) && (
                        <span
                          title={`Missing: ${(incompleteProfiles.get(m.user_id) ?? []).join(', ')}`}
                          className="flex-shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground/80"
                        >
                          Profile incomplete
                        </span>
                      )}
                      {isManagerRole && missedMeetings.has(m.user_id) && (
                        <span
                          title={`Missed ${missedMeetings.get(m.user_id)} meetings in a row`}
                          className="flex-shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground/80"
                        >
                          Missed {missedMeetings.get(m.user_id)} meetings
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{teamName(m.team_id)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {roleLabel(m.user_id)}
                    </span>
                    <span className="hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground">
                      {statusLabel(m.status)}
                    </span>
                  </div>
                </button>
              ))}
              {directory.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">No one found</p>
              )}
            </div>
          </div>
        )}

        {!loading && viewMode === 'mentees' && isManagerRole && <MyMenteesPanel />}


        {/* Member detail sheet */}
        <Sheet open={!!sheetMember} onOpenChange={open => !open && setSheetMember(null)}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
            {sheetMember && (
              <>
                <SheetHeader className="text-left">
                  <SheetTitle className="sr-only">{sheetMember.full_name}</SheetTitle>
                </SheetHeader>
                <div className="flex items-center gap-3 mb-5">
                  {sheetMember.avatar_url ? (
                    <img
                      src={sheetMember.avatar_url}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-primary">
                        {sheetMember.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-foreground truncate">
                      {getDisplayName(sheetMember.full_name)}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {roleLabel(sheetMember.user_id)} · {teamName(sheetMember.team_id)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-5">
                  <a
                    href={sheetMember.phone ? `tel:${sheetMember.phone}` : undefined}
                    className={cn(
                      'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-white/[0.08] bg-background/40',
                      sheetMember.phone
                        ? 'text-foreground hover:bg-background/70'
                        : 'text-muted-foreground pointer-events-none opacity-60'
                    )}
                  >
                    <Phone className="w-4 h-4" />
                    {sheetMember.phone ? 'Call' : 'No phone'}
                  </a>
                  <a
                    href={sheetMember.email ? `mailto:${sheetMember.email}` : undefined}
                    className={cn(
                      'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-white/[0.08] bg-background/40',
                      sheetMember.email
                        ? 'text-foreground hover:bg-background/70'
                        : 'text-muted-foreground pointer-events-none opacity-60'
                    )}
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </a>
                </div>

                {isManagerRole && (
                  <div className="space-y-3">
                    <RepScorecard userId={sheetMember.user_id} />
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => openProfileModal(sheetMember)}
                    >
                      Open full profile
                    </Button>
                  </div>
                )}
              </>
            )}
          </SheetContent>
        </Sheet>

        <AddMemberModal
          open={addMemberOpen}
          onClose={() => setAddMemberOpen(false)}
          onMemberAdded={fetchData}
          teams={teams.map(t => ({ id: t.id, name: t.name, slug: t.slug }))}
        />

        <MemberProfileModal
          member={profileModalMember}
          open={!!profileModalMember}
          onClose={() => setProfileModalMember(null)}
          roster={profiles.map(p => ({
            id: p.id,
            user_id: p.user_id,
            full_name: p.full_name,
            email: p.email,
            phone: p.phone,
            status: p.status as any,
            experience: p.experience as any,
            direct_manager: getEffectiveManager(p.direct_manager),
            role: managerIds.has(p.user_id) ? 'manager' : 'rookie',
          }))}
          pillars={teams.map(t => ({ id: t.id, name: t.name, slug: t.slug }))}
          onMemberClick={m => setProfileModalMember(m)}
          onStatusChange={fetchData}
        />
      </main>
    </AppLayout>
  );
}
