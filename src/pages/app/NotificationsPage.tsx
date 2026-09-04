import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';

/** Notification settings, on their own page. */
export default function NotificationsPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title="Notifications" context="Choose what reaches you." />
        <NotificationPreferences />
      </div>
    </AppLayout>
  );
}
