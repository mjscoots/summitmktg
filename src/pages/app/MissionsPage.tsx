import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { TodoList } from '@/components/dashboard/TodoList';

/** The full mission board. Home shows the first three; this page shows them all. */
export default function MissionsPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-4">
        <PageHeader title="Missions" context="Everything on your list." />
        <TodoList />
      </div>
    </AppLayout>
  );
}
