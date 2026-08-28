import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type MembershipStatus =
  | 'interested'
  | 'applied'
  | 'approved'
  | 'onboarding'
  | 'active'
  | 'rejected'
  | 'paused'
  | null;

export interface WorkspaceApprover {
  user_id: string;
  name: string | null;
  decision: 'approved' | 'rejected' | null;
}

export interface Workspace {
  vertical: string;
  slug: string;
  name: string;
  short_name: string;
  unit: string;
  accent_token: string;
  status: 'active' | 'coming_soon';
  display_order: number;
  is_president: boolean;
  president_name: string | null;
  membership_status: MembershipStatus;
  reject_reason: string | null;
  /** Pass 89 — the rep's latest request for a locked vertical. */
  request_status?: 'pending' | 'approved' | 'rejected' | null;
  request_reviewed_at?: string | null;
  approvers: WorkspaceApprover[];
}


const MEMBER_STATUSES: MembershipStatus[] = ['approved', 'onboarding', 'active', 'paused'];

export function isMember(w: Workspace): boolean {
  return MEMBER_STATUSES.includes(w.membership_status);
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  myWorkspaces: Workspace[];
  lockedWorkspaces: Workspace[];
  active: Workspace | null;
  activeVertical: string;
  isLoading: boolean;
  isPresidentOfActive: boolean;
  /** Increments on every workspace switch so screens remount and refetch. */
  epoch: number;
  switchWorkspace: (vertical: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const STORAGE_KEY = 'summit-active-vertical';

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [epoch, setEpoch] = useState(0);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeVertical, setActiveVertical] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || 'Pest'
  );
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setWorkspaces([]);
      setIsLoading(false);
      return;
    }
    const { data } = await supabase.rpc('get_my_workspaces' as never);
    const res = data as unknown as {
      active_vertical: string | null;
      workspaces: Workspace[];
    } | null;
    const rows = res?.workspaces || [];
    setWorkspaces(rows);

    const mine = rows.filter(isMember);
    const stored = localStorage.getItem(STORAGE_KEY);
    const next =
      (res?.active_vertical && mine.some((w) => w.vertical === res.active_vertical)
        ? res.active_vertical
        : null) ||
      (stored && mine.some((w) => w.vertical === stored) ? stored : null) ||
      mine[0]?.vertical ||
      'Pest';
    setActiveVertical(next);
    localStorage.setItem(STORAGE_KEY, next);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const switchWorkspace = useCallback(
    async (vertical: string) => {
      if (vertical === activeVertical) return;
      const name = workspaces.find((w) => w.vertical === vertical)?.name || vertical;
      setActiveVertical(vertical);
      localStorage.setItem(STORAGE_KEY, vertical);
      // The app restarts in the new workspace: land on Home, top of page, and
      // bump the epoch so every screen unmounts and refetches with the new scope.
      setEpoch((n) => n + 1);
      navigate('/app');
      window.scrollTo({ top: 0, behavior: 'auto' });
      toast(`Now in ${name}`);
      await supabase.rpc('set_active_vertical' as never, { _vertical: vertical } as never);
      await refresh();
    },
    [activeVertical, workspaces, navigate, refresh]
  );

  const value = useMemo<WorkspaceContextValue>(() => {
    const myWorkspaces = workspaces.filter(isMember);
    const active = workspaces.find((w) => w.vertical === activeVertical) || myWorkspaces[0] || null;
    return {
      workspaces,
      myWorkspaces,
      lockedWorkspaces: workspaces.filter((w) => !isMember(w)),
      active,
      activeVertical: active?.vertical || activeVertical,
      isLoading,
      isPresidentOfActive: Boolean(active?.is_president),
      epoch,
      switchWorkspace,
      refresh,
    };
  }, [workspaces, activeVertical, isLoading, epoch, switchWorkspace, refresh]);


  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    return {
      workspaces: [],
      myWorkspaces: [],
      lockedWorkspaces: [],
      active: null,
      activeVertical: 'Pest',
      isLoading: false,
      isPresidentOfActive: false,
      epoch: 0,
      switchWorkspace: async () => {},
      refresh: async () => {},
    };
  }
  return ctx;
}
