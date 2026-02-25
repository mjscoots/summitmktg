import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TeamTreeNode } from './TeamTreeNode';
import { MemberProfileModal } from './MemberProfileModal';
 import { TeamResources } from './TeamResources';
import { TeamActivityTable } from './TeamActivityTable';
 
import { ManagerTrainingOverview } from '@/components/training/ManagerTrainingOverview';
import type { Pillar, TeamMember } from '@/lib/hierarchyUtils';
import { isManager as checkIsManager, normalizeName, getDisplayName } from '@/lib/hierarchyUtils';
import { cn } from '@/lib/utils';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';

interface PillarTreeViewProps {
  pillar: Pillar;
  tree: TeamMember | null;
  roster: TeamMember[];
  onBack: () => void;
  logoUrl?: string | null;
  onDataChange?: () => void;
}

export function PillarTreeView({ pillar, tree, roster, onBack, logoUrl, onDataChange }: PillarTreeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [dailyTimeMap, setDailyTimeMap] = useState<Map<string, { days: { minutes: number }[]; totalMinutes: number }>>(new Map());

  // Get all user IDs for training progress
  const userIds = useMemo(() => roster.map(m => m.user_id), [roster]);
  const { getProgress } = useTrainingProgress(userIds);

  // Fetch daily training time for team members
  const fetchDailyTime = useCallback(async () => {
    try {
      const pstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
      const day = pstNow.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const monday = new Date(pstNow);
      monday.setDate(pstNow.getDate() + diffToMon);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const start = fmt(monday);
      const end = fmt(sunday);

      const memberIds = roster.map(m => m.user_id);
      if (memberIds.length === 0) return;

      const { data } = await supabase
        .from('daily_training_time')
        .select('user_id, date, total_minutes')
        .gte('date', start)
        .lte('date', end)
        .in('user_id', memberIds);

      if (data) {
        const byUser = new Map<string, typeof data>();
        data.forEach(r => {
          if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
          byUser.get(r.user_id)!.push(r);
        });

        const map = new Map<string, { days: { minutes: number }[]; totalMinutes: number }>();
        byUser.forEach((rows, userId) => {
          const days: { minutes: number }[] = [];
          let total = 0;
          for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = fmt(d);
            const match = rows.find(r => r.date === dateStr);
            const mins = match?.total_minutes ?? 0;
            days.push({ minutes: mins });
            total += mins;
          }
          map.set(userId, { days, totalMinutes: total });
        });
        setDailyTimeMap(map);
      }
    } catch {
      // Silent fail
    }
  }, [roster]);

  useEffect(() => {
    fetchDailyTime();
  }, [fetchDailyTime]);

  // Filter tree based on search
  const filterTree = (node: TeamMember, query: string): TeamMember | null => {
    if (!query) return node;
    
    const normalizedQuery = normalizeName(query);
    const matchesSelf = normalizeName(node.full_name).includes(normalizedQuery);
    
    const filteredChildren = node.children
      ?.map(child => filterTree(child, query))
      .filter((child): child is TeamMember => child !== null) || [];
    
    if (matchesSelf || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      };
    }
    
    return null;
  };

  const displayTree = searchQuery && tree ? filterTree(tree, searchQuery) : tree;




  // Handle member click for profile modal
  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
  };

  // Count NLC members
  const nlcCount = pillar.members.filter(m => m.status === 'nlc' || m.isNLC).length;
  const activeCount = pillar.totalCount - nlcCount;

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 -mt-4 pt-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">{pillar.name}</h2>
            <p className="text-sm text-muted-foreground">
              {activeCount} active members
              {nlcCount > 0 && (
                <span className="text-muted-foreground/60"> · {nlcCount} NLC</span>
              )}
            </p>
          </div>
          
          {/* Team Logo in top right */}
          {logoUrl ? (
            <div className="w-14 h-14 rounded-xl border border-border/50 overflow-hidden bg-muted/30 flex-shrink-0">
              <img 
                src={logoUrl} 
                alt={`${pillar.name} logo`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-muted-foreground">
                {pillar.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tree View */}
      <div className="bg-card rounded-xl border border-border/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">Organization Tree</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary/30" />
              <span className="text-muted-foreground">Manager</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-success/30" />
              <span className="text-muted-foreground">Rookie</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-muted" />
              <span className="text-muted-foreground">NLC</span>
            </div>
          </div>
        </div>

        {displayTree ? (
          <TeamTreeNode
            member={displayTree}
            isManager={true}
            isRoot={true}
            getProgress={getProgress}
            onMemberClick={handleMemberClick}
            teamName={pillar.name}
          />
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No members match your search' : 'Pillar owner not found in roster'}
            </p>
          </div>
        )}
      </div>

      {/* Member Profile Modal */}
      <MemberProfileModal
        member={selectedMember}
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        roster={roster}
        onMemberClick={handleMemberClick}
        onStatusChange={() => {
          setSelectedMember(null);
          onDataChange?.();
        }}
      />




      {/* Rep Training Progress */}
      <ManagerTrainingOverview teamId={pillar.id} />

      {/* Team Resources Section */}
      <TeamResources teamId={pillar.id} teamSlug={pillar.slug} />
 
      {/* Team Activity — Day-by-day breakdown */}
      <TeamActivityTable
        roster={roster}
        dailyTimeMap={dailyTimeMap}
        onMemberClick={handleMemberClick}
      />
    </div>
  );
}
