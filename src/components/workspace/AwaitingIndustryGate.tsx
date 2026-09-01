import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, LogOut } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/hooks/useAuth';

/** Screens a person waiting on an industry may still open. */
const ALLOWED = ['/app/chat', '/app/ask', '/app/profile'];

/**
 * Pass 149 — membership is acceptance only. A person with no industry yet keeps
 * Summit Trinity chat and one waiting screen, and nothing industry scoped opens
 * until the owner accepts them.
 */
export function AwaitingIndustryGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const { myWorkspaces, isLoading } = useWorkspace();

  const staff = role === 'owner' || role === 'admin';
  const waiting = !isLoading && !staff && myWorkspaces.length === 0;

  if (!waiting || ALLOWED.some((p) => pathname.startsWith(p))) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-foreground">You are in, waiting on your industry</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your account is set up. The owner places you in Pest, Fiber or Life, and the rest of the
          app opens as soon as that is done.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Until then you can read and post in Summit Trinity, the room everyone shares.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/app/chat')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <MessageSquare className="h-4 w-4" /> Open Summit Trinity
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-6 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default AwaitingIndustryGate;
