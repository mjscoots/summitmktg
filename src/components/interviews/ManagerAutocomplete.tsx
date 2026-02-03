import { useState, useEffect, useRef } from 'react';
import { Search, User, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Manager {
  user_id: string;
  full_name: string;
  email: string;
  team_name: string | null;
}

interface ManagerAutocompleteProps {
  value: Manager | null;
  onChange: (manager: Manager | null) => void;
  placeholder?: string;
  error?: boolean;
}

export function ManagerAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Search for a manager...",
  error = false
}: ManagerAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch all managers on mount
  useEffect(() => {
    const fetchManagers = async () => {
      setIsLoading(true);
      try {
        // Get all users with manager or admin role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['manager', 'admin']);

        if (roleError) throw roleError;

        const managerIds = roleData?.map(r => r.user_id) || [];

        if (managerIds.length === 0) {
          setManagers([]);
          return;
        }

        // Get profiles for these managers with team info
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            user_id,
            full_name,
            email,
            team_id,
            teams:team_id (name)
          `)
          .in('user_id', managerIds)
          .neq('status', 'nlc');

        if (profileError) throw profileError;

        const managerList: Manager[] = (profileData || []).map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          team_name: (p.teams as any)?.name || null
        }));

        // Sort alphabetically by name
        managerList.sort((a, b) => a.full_name.localeCompare(b.full_name));
        
        setManagers(managerList);
      } catch (err) {
        console.error('Error fetching managers:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchManagers();
  }, []);

  // Filter managers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredManagers(managers);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = managers.filter(m => 
      m.full_name.toLowerCase().includes(search) ||
      m.email.toLowerCase().includes(search) ||
      (m.team_name && m.team_name.toLowerCase().includes(search))
    );

    setFilteredManagers(filtered);
  }, [searchTerm, managers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (manager: Manager) => {
    onChange(manager);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearchTerm('');
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Selected value display or search input */}
      {value ? (
        <div 
          className={cn(
            "flex items-center justify-between px-4 py-2.5 bg-background border rounded-lg",
            error ? "border-destructive" : "border-border"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{value.full_name}</p>
              {value.team_name && (
                <p className="text-xs text-muted-foreground">{value.team_name}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={cn(
              "w-full pl-10 pr-4 py-2.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all",
              error ? "border-destructive" : "border-border"
            )}
          />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !value && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading managers...
            </div>
          ) : filteredManagers.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchTerm ? 'No managers found' : 'No managers available'}
            </div>
          ) : (
            <ul className="py-1">
              {filteredManagers.map((manager) => (
                <li key={manager.user_id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(manager)}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {manager.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {manager.team_name || manager.email}
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
  );
}
