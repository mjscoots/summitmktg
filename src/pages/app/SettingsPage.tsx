import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsList } from '@/components/settings/SettingsList';

/** Settings as its own page, so a deep link works. */
export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-8 px-5 py-8 md:space-y-12 md:px-8 md:py-12">
        <PageHeader title="Settings" context="Your profile, look, notifications and account." />
        <SettingsList />
      </div>
    </AppLayout>
  );
}
