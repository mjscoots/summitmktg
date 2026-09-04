import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { TodoList } from '@/components/dashboard/TodoList';

/** The full to do list. Home shows the first three; this page shows them all. */
export default function MissionsPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-4">
        <PageHeader title="To do" context="Your own list." />
        <TodoList />
      </div>
    </AppLayout>
  );
}
