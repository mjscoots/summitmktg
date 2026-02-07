import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserSuggestion {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  team_name: string | null;
}

interface UserAutocompleteProps {
  value: string;
  selectedUserId: string | null;
  onChange: (name: string, userId: string | null) => void;
  placeholder?: string;
  filterRole?: 'rookie' | 'manager' | 'all';
  id?: string;
  required?: boolean;
}

export function UserAutocomplete({
  value,
  selectedUserId,
  onChange,
  placeholder = "Start typing a name...",
  filterRole = 'all',
  id,
  required
}: UserAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<UserSuggestion[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [filterRole]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get profiles with roles
      let query = supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          avatar_url,
          team_id,
          teams!left(name)
        `)
        .neq('status', 'nlc')
        .order('full_name');

      const { data: profiles, error } = await query;
      if (error) throw error;

      // Get user roles
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const users: UserSuggestion[] = (profiles || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        role: roleMap.get(p.user_id) || 'rookie',
        team_name: (p.teams as any)?.name || null
      }));

      // Filter by role if specified
      let filtered = users;
      if (filterRole === 'rookie') {
        filtered = users.filter(u => u.role === 'rookie');
      } else if (filterRole === 'manager') {
        filtered = users.filter(u => u.role === 'manager' || u.role === 'admin');
      }

      setAllUsers(filtered);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue, null); // Clear selected user when typing

    if (inputValue.length >= 2) {
      const filtered = allUsers.filter(user =>
        user.full_name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectUser = (user: UserSuggestion) => {
    onChange(user.full_name, user.user_id);
    setShowSuggestions(false);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      default: return 'Rookie';
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => value.length >= 2 && setShowSuggestions(true)}
          placeholder={placeholder}
          required={required}
          className={cn(
            selectedUserId && "pr-10 border-success focus-visible:ring-success"
          )}
        />
        {selectedUserId && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Check className="w-4 h-4 text-success" />
          </div>
        )}
      </div>

      {/* Selected confirmation */}
      {selectedUserId && (
        <p className="text-xs text-success mt-1 flex items-center gap-1">
          <Check className="w-3 h-3" />
          Selected: {value}
        </p>
      )}

      {/* Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map(user => (
              <button
                key={user.user_id}
                type="button"
                onClick={() => selectUser(user)}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
              >
                <UserAvatar
                  avatarUrl={user.avatar_url}
                  fullName={user.full_name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getRoleLabel(user.role)}
                    {user.team_name && ` • ${user.team_name}`}
                  </p>
                </div>
              </button>
            ))
          ) : value.length >= 2 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No users found matching "{value}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
