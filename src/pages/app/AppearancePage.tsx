import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { AppearanceCard } from '@/components/profile/AppearanceCard';

/** App look: light, dark or system, plus the workspace accent that follows it. */
export default function AppearancePage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title="App look" context="How the app looks on this account." />
        <AppearanceCard />
      </div>
    </AppLayout>
  );
}
