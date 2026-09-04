import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsList } from '@/components/settings/SettingsList';

/** Settings as its own page, so a deep link works. */
export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title="Settings" context="Your profile, look, notifications and account." />
        <SettingsList />
      </div>
    </AppLayout>
  );
}
