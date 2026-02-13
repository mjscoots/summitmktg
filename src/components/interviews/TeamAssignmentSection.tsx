import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronRight, Building2, Search, User, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ManagerOption {
  user_id: string;
  full_name: string;
  role: string;
  team_name: string | null;
  team_id: string | null;
}

export interface TeamAssignmentData {
  teamId: string;
  teamName: string;
  reportsTo: ManagerOption | null;
  role: 'rookie' | 'manager';
  createAccount: boolean;
}

interface TeamAssignmentSectionProps {
  recruitEmail: string;
  onChange: (data: TeamAssignmentData | null) => void;
}

export function TeamAssignmentSection({ recruitEmail, onChange }: TeamAssignmentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('__none__');
  const [selectedRole, setSelectedRole] = useState<'rookie' | 'manager'>('rookie');
  const [createAccount, setCreateAccount] = useState(true);
  const [reportsTo, setReportsTo] = useState<ManagerOption | null>(null);
  const [managerSearch, setManagerSearch] = useState('');
  const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<ManagerOption[]>([]);
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const managerRef = useRef<HTMLDivElement>(null);

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase.from('teams').select('id, name').order('name');
      setTeams(data || []);
    };
    fetchTeams();
  }, []);

  // Fetch managers/pillars
  useEffect(() => {
    const fetchManagers = async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['manager', 'admin']);

      const managerUserIds = roleData?.map(r => r.user_id) || [];
      if (managerUserIds.length === 0) { setManagerOptions([]); return; }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, team_id, teams:team_id (name)')
        .in('user_id', managerUserIds)
        .neq('status', 'nlc');

      const roleMap = new Map(roleData?.map(r => [r.user_id, r.role]) || []);
      const { data: teamsData } = await supabase.from('teams').select('leader_id');
      const pillarIds = new Set(teamsData?.map(t => t.leader_id).filter(Boolean) || []);

      let options: ManagerOption[] = (profiles || []).map(p => {
        const dbRole = roleMap.get(p.user_id) || 'manager';
        const isPillar = pillarIds.has(p.user_id);
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          role: isPillar ? 'pillar' : dbRole,
          team_name: (p.teams as any)?.name || null,
          team_id: p.team_id,
        };
      });

      if (selectedRole === 'manager') {
        options = options.filter(o => o.role === 'pillar' || o.role === 'admin');
      }

      options.sort((a, b) => {
        const roleOrder = (r: string) => r === 'pillar' ? 0 : r === 'admin' ? 1 : 2;
        const diff = roleOrder(a.role) - roleOrder(b.role);
        return diff !== 0 ? diff : a.full_name.localeCompare(b.full_name);
      });

      setManagerOptions(options);
    };
    fetchManagers();
  }, [selectedRole]);

  // Filter managers by search
  useEffect(() => {
    if (!managerSearch.trim()) {
      setFilteredManagers(managerOptions);
      return;
    }
    const q = managerSearch.toLowerCase();
    setFilteredManagers(managerOptions.filter(m =>
      m.full_name.toLowerCase().includes(q) ||
      (m.team_name && m.team_name.toLowerCase().includes(q))
    ).slice(0, 20));
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

  // Emit changes
  useEffect(() => {
    if (selectedTeamId === '__none__') {
      onChange(null);
      return;
    }
    const teamName = teams.find(t => t.id === selectedTeamId)?.name || '';
    onChange({
      teamId: selectedTeamId,
      teamName,
      reportsTo,
      role: selectedRole,
      createAccount,
    });
  }, [selectedTeamId, reportsTo, selectedRole, createAccount, teams]);

  // Validate
  const hasTeam = selectedTeamId !== '__none__';
  const needsReportsTo = hasTeam && !reportsTo;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header - toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-medium text-foreground">Team Assignment</span>
          <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
        </div>
        {hasTeam && reportsTo && (
          <span className="flex items-center gap-1 text-xs text-success">
            <Check className="w-3 h-3" />
            Assigned
          </span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Assign this recruit to a team and manager in the system
          </p>

          {/* Team Dropdown */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Assign to Team
            </label>
            <Select value={selectedTeamId} onValueChange={(v) => { setSelectedTeamId(v); if (v === '__none__') { setReportsTo(null); } }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Don't assign yet</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reports To - only when team selected */}
          {hasTeam && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Reports To
              </label>
              <div ref={managerRef} className="relative">
                {reportsTo ? (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-background border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{reportsTo.full_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{reportsTo.role} • {reportsTo.team_name}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReportsTo(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
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
                      onChange={(e) => { setManagerSearch(e.target.value); setShowManagerDropdown(true); }}
                      onFocus={() => setShowManagerDropdown(true)}
                      placeholder="Search all managers and pillars..."
                      className={cn(
                        "w-full pl-10 pr-4 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50",
                        needsReportsTo ? "border-destructive/50" : "border-border"
                      )}
                    />
                  </div>
                )}

                {showManagerDropdown && !reportsTo && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {filteredManagers.length === 0 ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        {managerSearch ? `No managers found for '${managerSearch}'` : 'No managers available'}
                      </div>
                    ) : (
                      <ul className="py-1">
                        {filteredManagers.map(m => (
                          <li key={m.user_id}>
                            <button
                              type="button"
                              onClick={() => { setReportsTo(m); setShowManagerDropdown(false); setManagerSearch(''); }}
                              className="w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-center gap-3 text-sm"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{m.full_name}</p>
                                <p className="text-xs text-muted-foreground capitalize truncate">
                                  {m.role} • {m.team_name || 'No team'}
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
              {needsReportsTo && (
                <p className="text-xs text-destructive mt-1">Please select who this recruit reports to</p>
              )}
            </div>
          )}

          {/* Role */}
          {hasTeam && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Role</label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'rookie' | 'manager')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rookie">Rookie</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Create Account Toggle */}
          {hasTeam && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm font-medium">Create Summit account for this recruit</p>
                <p className="text-xs text-muted-foreground">
                  {recruitEmail
                    ? `Sends a welcome email with login instructions to ${recruitEmail}`
                    : 'No email found. Account invite cannot be sent.'}
                </p>
              </div>
              <Switch
                checked={createAccount}
                onCheckedChange={setCreateAccount}
                disabled={!recruitEmail}
              />
            </div>
          )}

          {/* Confirmation */}
          {hasTeam && reportsTo && (
            <div className="flex items-center gap-2 p-2 bg-success/10 rounded-lg">
              <Check className="w-4 h-4 text-success" />
              <p className="text-xs text-success">
                Reports to: {reportsTo.full_name} ({reportsTo.role} - {reportsTo.team_name}) ✓
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
