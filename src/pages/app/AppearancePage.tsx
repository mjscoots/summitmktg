import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { AppearanceCard } from '@/components/profile/AppearanceCard';

/** App look: light, dark or system, plus the workspace accent that follows it. */
export default function AppearancePage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-8 px-5 py-8 md:space-y-12 md:px-8 md:py-12">
        <PageHeader title="App look" context="How the app looks on this account." />
        <AppearanceCard />
      </div>
    </AppLayout>
  );
}
