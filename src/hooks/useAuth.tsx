import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';


type UserRole = 'rookie' | 'manager' | 'admin' | 'owner';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  recruiter: string | null;
  region: string | null;
  experience: 'rookie' | 'veteran';
  status: 'active' | 'contract_signed' | 'onboarded' | 'info_added' | 'nlc' | 'pending' | 'rejected';
  avatar_url: string | null;
  team_id: string | null;
  pillar_slug: string | null;
  direct_manager: string | null;

  approved: boolean | null;
  referred_by: string | null;
  onboarding_status: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, metadata?: Record<string, string>) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>('rookie');
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingRef = useRef(true);
  const hasActiveSessionRef = useRef(false);
  const roleCacheRef = useRef<Map<string, UserRole>>(new Map());

  const ROLE_PRIORITY: UserRole[] = ['rookie', 'manager', 'admin', 'owner'];
  const ROLE_STORAGE_PREFIX = 'auth-role-cache:';

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const normalizeRole = (value: unknown): UserRole | null => {
    if (value === 'rookie' || value === 'manager' || value === 'admin' || value === 'owner') {
      return value;
    }
    return null;
  };

  const getStoredRole = (userId: string): UserRole | null => {
    try {
      const raw = sessionStorage.getItem(`${ROLE_STORAGE_PREFIX}${userId}`);
      return normalizeRole(raw);
    } catch {
      return null;
    }
  };

  const setStoredRole = (userId: string, nextRole: UserRole) => {
    try {
      sessionStorage.setItem(`${ROLE_STORAGE_PREFIX}${userId}`, nextRole);
    } catch {
      // ignore storage errors
    }
  };

  const getCachedRole = (userId: string): UserRole | null => {
    return roleCacheRef.current.get(userId) ?? getStoredRole(userId);
  };

  const setCachedRole = (userId: string, nextRole: UserRole) => {
    roleCacheRef.current.set(userId, nextRole);
    setStoredRole(userId, nextRole);
  };

  const seedRoleFromMetadata = (sessionUser: User | null) => {
    if (!sessionUser) return;
    const metadataRole = normalizeRole(sessionUser.user_metadata?.selected_role);
    if (metadataRole) {
      setCachedRole(sessionUser.id, metadataRole);
    }
  };

  const fetchUserRole = async (userId: string): Promise<UserRole> => {
    const cachedRole = getCachedRole(userId);

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching role:', error);
        return cachedRole ?? 'rookie';
      }

      const roles = (data ?? [])
        .map((r) => normalizeRole(r.role))
        .filter((r): r is UserRole => r !== null);

      if (!roles.length) {
        setCachedRole(userId, 'rookie');
        return 'rookie';
      }

      const resolvedRole = roles.sort((a, b) => ROLE_PRIORITY.indexOf(b) - ROLE_PRIORITY.indexOf(a))[0] ?? 'rookie';
      setCachedRole(userId, resolvedRole);
      return resolvedRole;
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      return cachedRole ?? 'rookie';
    }
  };

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as Profile | null;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const [newProfile, newRole] = await Promise.all([
        fetchProfile(user.id),
        fetchUserRole(user.id),
      ]);
      setProfile(newProfile);
      setRole(newRole);
    }
  };

  useEffect(() => {
    let mounted = true;
    let initialLoadDone = false;

    // Safety timeout: only unblock loading if no active session has been detected
    // (prevents auth deadlock while avoiding premature rookie-role fallback)
    const loadingTimeout = setTimeout(() => {
      if (mounted && isLoadingRef.current && !hasActiveSessionRef.current) {
        console.warn('Auth loading timeout - forcing isLoading to false');
        setIsLoading(false);
      }
    }, 4000);

    const loadUserData = async (userId: string) => {
      try {
        const [userProfile, userRole] = await Promise.all([
          fetchProfile(userId),
          fetchUserRole(userId),
        ]);
        if (mounted) {
          setProfile(userProfile);
          setRole(userRole);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        if (mounted) setIsLoading(false);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // For token refreshes, only update session/user if the user actually changed.
        // This prevents unnecessary re-renders that unmount components (e.g. video player).
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setSession(prev => {
            // Only update if token actually differs
            if (prev?.access_token === session.access_token) return prev;
            return session;
          });
          // Don't update user/profile/role — same user, same data.
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        hasActiveSessionRef.current = !!session;

        if (session?.user) {
          seedRoleFromMetadata(session.user);
          // Skip if getSession already handled the initial load
          if (event === 'INITIAL_SESSION' && initialLoadDone) return;
          // Defer to avoid Supabase internal deadlock
          setTimeout(() => { if (mounted) loadUserData(session.user.id); }, 0);
        } else {
          setProfile(null);
          setRole('rookie');
          setIsLoading(false);
        }
      }
    );

    // THEN get the current session (races with INITIAL_SESSION event)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      initialLoadDone = true;
      setSession(session);
      setUser(session?.user ?? null);
      hasActiveSessionRef.current = !!session;

      if (session?.user) {
        seedRoleFromMetadata(session.user);
        loadUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    }).catch((err) => {
      console.error('Error getting session:', err);
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, metadata?: Record<string, string>) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            ...metadata,
          },
        },
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    const currentUserId = user?.id;
    await supabase.auth.signOut();
    hasActiveSessionRef.current = false;
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole('rookie');
    if (currentUserId) {
      roleCacheRef.current.delete(currentUserId);
      try {
        sessionStorage.removeItem(`${ROLE_STORAGE_PREFIX}${currentUserId}`);
      } catch {
        // ignore storage errors
      }
    }
  };

  const value = {
    user,
    session,
    profile,
    role,
    isLoading,
    isAuthenticated: !!session,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
