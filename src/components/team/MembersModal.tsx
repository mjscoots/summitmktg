import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Search, User, Mail, Phone, Building2, UserCheck } from 'lucide-react';
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

interface MembersModalProps {
  open: boolean;
  onClose: () => void;
}

export function MembersModal({ open, onClose }: MembersModalProps) {
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [pillars, setPillars] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

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

          {/* Members List */}
          <div className="flex-1 overflow-y-auto py-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No members match your search
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredMembers.map(member => {
                  const isMgr = isManager(enrichedRoster, member.full_name);
                  
                  return (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors text-left"
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
                    </button>
                  );
                })}
              </div>
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