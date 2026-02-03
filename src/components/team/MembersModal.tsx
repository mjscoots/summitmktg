import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Search, User, Mail, Phone, Building2, UserCheck, ChevronDown, ChevronRight, GraduationCap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  TeamMember,
  normalizeName,
  isManager,
  getStatusInfo,
  assignPillarsToRoster,
} from '@/lib/hierarchyUtils';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';
import { TrainingProgressBadge } from './TrainingProgressBadge';

interface MembersModalProps {
  open: boolean;
  onClose: () => void;
}

interface ManagerGroup {
  manager: TeamMember;
  teamSize: number;
  directReports: TeamMember[];
}

export function MembersModal({ open, onClose }: MembersModalProps) {
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [pillars, setPillars] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .neq('status', 'nlc')
          .order('full_name');

        const { data: teamsData } = await supabase
          .from('teams')
          .select('*')
          .order('name');

        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id, role');

        const managerUserIds = new Set(
          (rolesData || [])
            .filter(r => r.role === 'manager' || r.role === 'admin')
            .map(r => r.user_id)
        );

        const members: TeamMember[] = (profiles || []).map(p => ({
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          status: p.status,
          experience: p.experience,
          direct_manager: p.direct_manager,
          role: managerUserIds.has(p.user_id) ? 'manager' : 'rookie',
        }));

        setAllMembers(members);
        setPillars(teamsData || []);
      } catch (err) {
        console.error('Error fetching members:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open]);

  const { enrichedRoster } = useMemo(() => {
    if (allMembers.length === 0 || pillars.length === 0) {
      return { enrichedRoster: [], dataIssues: [] };
    }
    return assignPillarsToRoster(allMembers, pillars);
  }, [allMembers, pillars]);

  // Get all user IDs for training progress
  const userIds = useMemo(() => enrichedRoster.map(m => m.user_id), [enrichedRoster]);
  const { getProgress, isLoading: progressLoading } = useTrainingProgress(userIds);

  // Apply filters
  const filteredMembers = useMemo(() => {
    return enrichedRoster.filter(member => {
      if (searchQuery) {
        const query = normalizeName(searchQuery);
        if (!normalizeName(member.full_name).includes(query) &&
            !normalizeName(member.email).includes(query) &&
            !(member.phone && normalizeName(member.phone).includes(query))) {
          return false;
        }
      }

      if (pillarFilter !== 'all' && member.pillar !== pillarFilter) {
        return false;
      }

      if (roleFilter !== 'all') {
        const isMgr = isManager(enrichedRoster, member.full_name);
        if (roleFilter === 'manager' && !isMgr) return false;
        if (roleFilter === 'rookie' && isMgr) return false;
      }

      return true;
    });
  }, [enrichedRoster, searchQuery, pillarFilter, roleFilter]);

  // Build hierarchical structure: managers -> their direct reports -> unassigned
  const { managerGroups, unassignedMembers } = useMemo(() => {
    const managers: ManagerGroup[] = [];
    const assignedMemberIds = new Set<string>();

    // Find all managers and their direct reports
    const managerMembers = filteredMembers.filter(m => 
      isManager(enrichedRoster, m.full_name) || m.role === 'manager'
    );

    managerMembers.forEach(manager => {
      const directReports = filteredMembers.filter(m => {
        if (m.id === manager.id) return false;
        const managerName = normalizeName(manager.full_name);
        const reportManager = normalizeName(m.direct_manager || '');
        return reportManager.includes(managerName) || managerName.includes(reportManager);
      });

      // Sort direct reports by training progress (highest first)
      directReports.sort((a, b) => {
        const aProgress = getProgress(a.user_id).percentage;
        const bProgress = getProgress(b.user_id).percentage;
        if (bProgress !== aProgress) return bProgress - aProgress;
        return a.full_name.localeCompare(b.full_name);
      });

      managers.push({
        manager,
        teamSize: directReports.length,
        directReports,
      });

      // Mark as assigned
      assignedMemberIds.add(manager.id);
      directReports.forEach(r => assignedMemberIds.add(r.id));
    });

    // Sort managers by team size (largest first)
    managers.sort((a, b) => b.teamSize - a.teamSize);

    // Get unassigned members (not a manager and not under a manager)
    const unassigned = filteredMembers
      .filter(m => !assignedMemberIds.has(m.id))
      .sort((a, b) => {
        const aProgress = getProgress(a.user_id).percentage;
        const bProgress = getProgress(b.user_id).percentage;
        if (bProgress !== aProgress) return bProgress - aProgress;
        return a.full_name.localeCompare(b.full_name);
      });

    return { managerGroups: managers, unassignedMembers: unassigned };
  }, [filteredMembers, enrichedRoster, getProgress]);

  const toggleManager = (managerId: string) => {
    setExpandedManagers(prev => {
      const next = new Set(prev);
      if (next.has(managerId)) {
        next.delete(managerId);
      } else {
        next.add(managerId);
      }
      return next;
    });
  };

  // Expand all managers by default when data loads
  useEffect(() => {
    if (managerGroups.length > 0 && expandedManagers.size === 0) {
      setExpandedManagers(new Set(managerGroups.map(g => g.manager.id)));
    }
  }, [managerGroups]);

  const getPillarName = (slug: string | undefined) => {
    if (!slug) return 'Unassigned';
    const pillar = pillars.find(p => p.slug === slug);
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

  const MemberCard = ({ member, indented = false }: { member: TeamMember; indented?: boolean }) => {
    const isMgr = isManager(enrichedRoster, member.full_name) || member.role === 'manager';
    const progress = getProgress(member.user_id);
    
    return (
      <button
        onClick={() => setSelectedMember(member)}
        className={cn(
          "flex items-center gap-3 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left w-full",
          indented && "ml-6 border-l-2 border-muted"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
          isMgr ? "bg-primary/20" : "bg-success/20"
        )}>
          <User className={cn("w-5 h-5", isMgr ? "text-primary" : "text-success")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium truncate text-sm",
            isMgr ? "text-primary" : "text-success"
          )}>
            {member.full_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {formatPhone(member.phone)}
          </p>
        </div>
        <TrainingProgressBadge percentage={progress.percentage} showBar />
      </button>
    );
  };

  return (
    <>
      <Dialog open={open && !selectedMember} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/15">
                <User className="w-5 h-5 text-primary" />
              </div>
              Members Directory
              <span className="text-sm font-normal text-muted-foreground">
                ({enrichedRoster.length} total)
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Search and Filters */}
          <div className="space-y-3 pb-3 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={pillarFilter} onValueChange={setPillarFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {pillars.map(p => (
                    <SelectItem key={p.id} value={p.slug}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="manager">Managers</SelectItem>
                  <SelectItem value="rookie">Rookies</SelectItem>
                </SelectContent>
              </Select>

              {(pillarFilter !== 'all' || roleFilter !== 'all' || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPillarFilter('all');
                    setRoleFilter('all');
                    setSearchQuery('');
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Hierarchical Members List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No members match your search
              </div>
            ) : (
              <>
                {/* Manager Groups */}
                {managerGroups.map(({ manager, teamSize, directReports }) => {
                  const isExpanded = expandedManagers.has(manager.id);
                  const managerProgress = getProgress(manager.user_id);
                  
                  return (
                    <div key={manager.id} className="space-y-2">
                      {/* Manager Header */}
                      <button
                        onClick={() => toggleManager(manager.id)}
                        className="w-full flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-primary truncate">
                              {manager.full_name}
                            </p>
                            <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                              {teamSize} {teamSize === 1 ? 'member' : 'members'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {formatPhone(manager.phone)}
                          </p>
                        </div>
                        <TrainingProgressBadge percentage={managerProgress.percentage} showBar />
                        {directReports.length > 0 && (
                          isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )
                        )}
                      </button>

                      {/* Direct Reports */}
                      {isExpanded && directReports.length > 0 && (
                        <div className="space-y-2 animate-fade-in">
                          {directReports.map(report => (
                            <MemberCard key={report.id} member={report} indented />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unassigned Members Section */}
                {unassignedMembers.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground px-3">
                      <span>Unassigned Members</span>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {unassignedMembers.length}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {unassignedMembers.map(member => (
                        <MemberCard key={member.id} member={member} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Detail Sheet */}
      <Sheet open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <SheetContent className="bg-card border-border">
          {selectedMember && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    isManager(enrichedRoster, selectedMember.full_name) ? "bg-primary/20" : "bg-success/20"
                  )}>
                    <User className={cn(
                      "w-6 h-6",
                      isManager(enrichedRoster, selectedMember.full_name) ? "text-primary" : "text-success"
                    )} />
                  </div>
                  <span className={cn(
                    isManager(enrichedRoster, selectedMember.full_name) ? "text-primary" : "text-success"
                  )}>
                    {selectedMember.full_name}
                  </span>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {/* Training Progress */}
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <GraduationCap className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Training Progress</p>
                    <div className="flex items-center gap-2">
                      <TrainingProgressBadge 
                        percentage={getProgress(selectedMember.user_id).percentage} 
                        size="md"
                      />
                      <span className="text-sm text-muted-foreground">
                        ({getProgress(selectedMember.user_id).completed}/{getProgress(selectedMember.user_id).total} lessons)
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        getProgress(selectedMember.user_id).percentage === 100 ? "bg-success" :
                        getProgress(selectedMember.user_id).percentage >= 67 ? "bg-primary" :
                        getProgress(selectedMember.user_id).percentage >= 34 ? "bg-yellow-500" :
                        "bg-destructive"
                      )}
                      style={{ width: `${getProgress(selectedMember.user_id).percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm text-foreground">{formatPhone(selectedMember.phone)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground">{selectedMember.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Team</p>
                    <p className="text-sm text-foreground">{getPillarName(selectedMember.pillar)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Direct Manager</p>
                    <p className="text-sm text-foreground">{selectedMember.direct_manager || 'None'}</p>
                  </div>
                </div>

                <div className="pt-4">
                  <span className={cn(
                    "text-sm font-medium px-3 py-1.5 rounded-full",
                    getStatusInfo(selectedMember.status).className
                  )}>
                    {getStatusInfo(selectedMember.status).label}
                  </span>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
