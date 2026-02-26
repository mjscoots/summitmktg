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

  const ROLE_PRIORITY: UserRole[] = ['rookie', 'manager', 'admin', 'owner'];

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const fetchUserRole = async (userId: string): Promise<UserRole> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching role:', error);
        return 'rookie';
      }

      const roles = (data ?? []).map((r) => r.role as UserRole);
      if (!roles.length) return 'rookie';

      return roles.sort((a, b) => ROLE_PRIORITY.indexOf(b) - ROLE_PRIORITY.indexOf(a))[0] ?? 'rookie';
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      return 'rookie';
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
      const newProfile = await fetchProfile(user.id);
      const newRole = await fetchUserRole(user.id);
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
        setSession(session);
        setUser(session?.user ?? null);
        hasActiveSessionRef.current = !!session;

        if (session?.user) {
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
    await supabase.auth.signOut();
    hasActiveSessionRef.current = false;
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole('rookie');
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
