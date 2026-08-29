import { useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { moreGroups } from '@/lib/appNav';
import { WorkspaceSegmented } from '@/components/workspace/WorkspaceSegmented';

/**
 * More: everything the phone bar does not carry, grouped by the job it
 * belongs to. Role aware, so a person only sees what they can open.
 */
export default function MorePage() {
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const { activeVertical } = useWorkspace();
  const groups = moreGroups(activeVertical, role);

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title="More" context="Every other place in the app." />

        <div className="lg:hidden">
          <WorkspaceSegmented />
        </div>

        {groups.map((group) => (
          <section key={group.title} className="space-y-2">
            <p className="eyebrow px-1">{group.title}</p>
            <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
              {group.items.map((item, i) => (
                <button
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  className={
                    'flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-secondary' +
                    (i > 0 ? ' border-t border-border' : '')
                  }
                >
                  <item.icon className="h-[18px] w-[18px] flex-shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  <span className="flex-1 truncate text-[15px] text-foreground">{item.label}</span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </section>
        ))}

        <button
          onClick={async () => {
            await signOut();
            navigate('/');
          }}
          className="flex min-h-[52px] w-full items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-4 text-left text-[15px] text-muted-foreground transition-colors hover:bg-secondary"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          Log out
        </button>
      </div>
    </AppLayout>
  );
}
