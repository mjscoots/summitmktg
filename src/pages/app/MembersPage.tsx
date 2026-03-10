import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Users, Search, User, X, Mail, Phone, Building2, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  PILLAR_OWNERS,
  normalizeName,
  findPersonByName,
  isManager,
  getStatusInfo,
  assignPillarsToRoster,
} from '@/lib/hierarchyUtils';

export default function MembersPage() {
  const { isLoading: authLoading } = useAuth();
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [pillars, setPillars] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    const fetchData = async () => {
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

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  const { enrichedRoster } = useMemo(() => {
    if (allMembers.length === 0 || pillars.length === 0) {
      return { enrichedRoster: [], dataIssues: [] };
    }
    return assignPillarsToRoster(allMembers, pillars);
  }, [allMembers, pillars]);

  // Filter members
  const filteredMembers = useMemo(() => {
    const filtered = enrichedRoster.filter(member => {
      if (searchQuery) {
        const query = normalizeName(searchQuery);
        if (!normalizeName(member.full_name).includes(query) &&
            !normalizeName(member.email).includes(query)) {
          return false;
        }
      }
      if (pillarFilter !== 'all' && member.pillar !== pillarFilter) return false;
      if (roleFilter !== 'all') {
        const isMgr = isManager(enrichedRoster, member.full_name);
        if (roleFilter === 'manager' && !isMgr) return false;
        if (roleFilter === 'rookie' && isMgr) return false;
      }
      if (statusFilter !== 'all' && member.status !== statusFilter) return false;
      return true;
    });
    // Sort: disabled/NLC users at the bottom
    return filtered.sort((a, b) => {
      const aDisabled = a.status === 'nlc' ? 1 : 0;
      const bDisabled = b.status === 'nlc' ? 1 : 0;
      if (aDisabled !== bDisabled) return aDisabled - bDisabled;
      return a.full_name.localeCompare(b.full_name);
    });
  }, [enrichedRoster, searchQuery, pillarFilter, roleFilter, statusFilter]);

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

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <AppLayout>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/15">
              <Users className="w-5 h-5 text-primary" />
            </div>
            Members Directory
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse all organization members ({enrichedRoster.length} total)
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={pillarFilter} onValueChange={setPillarFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Pillars" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pillars</SelectItem>
                {pillars.map(p => (
                  <SelectItem key={p.id} value={p.slug}>{p.name}</SelectItem>
                ))}
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="manager">Managers</SelectItem>
                <SelectItem value="rookie">Rookies</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="onboarded">Onboarded</SelectItem>
                <SelectItem value="contract_signed">Contract Signed</SelectItem>
                <SelectItem value="info_added">Info Added</SelectItem>
              </SelectContent>
            </Select>

            {(pillarFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setPillarFilter('all');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredMembers.length} of {enrichedRoster.length} members
        </p>

        {/* Members Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map(member => {
            const isMgr = isManager(enrichedRoster, member.full_name);
            const statusInfo = getStatusInfo(member.status);
            
            return (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border/50 hover:border-primary/50 transition-all text-left group"
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  isMgr ? "bg-primary/20" : "bg-success/20"
                )}>
                  <User className={cn("w-5 h-5", isMgr ? "text-primary" : "text-success")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    isMgr ? "text-primary" : "text-success"
                  )}>
                    {member.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getPillarName(member.pillar)}
                  </p>
                </div>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0", statusInfo.className)}>
                  {statusInfo.label}
                </span>
              </button>
            );
          })}
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12 bg-card rounded-xl border border-border/50">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No members match your filters</p>
          </div>
        )}

        {/* Member Profile Drawer */}
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
                    <div>
                      <span className={cn(
                        isManager(enrichedRoster, selectedMember.full_name) ? "text-primary" : "text-success"
                      )}>
                        {selectedMember.full_name}
                      </span>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm text-foreground">
                        {selectedMember.phone ? formatPhone(selectedMember.phone) : '—'}
                      </p>
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
                      <p className="text-xs text-muted-foreground">Pillar</p>
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

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Role</p>
                      <p className={cn(
                        "text-sm font-medium",
                        isManager(enrichedRoster, selectedMember.full_name) ? "text-primary" : "text-success"
                      )}>
                        {isManager(enrichedRoster, selectedMember.full_name) ? 'Manager' : 'Rookie'}
                      </p>
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
      </main>
    </AppLayout>
  );
}
