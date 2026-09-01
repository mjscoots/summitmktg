import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const LABEL: Record<string, string> = {
  manager: 'a manager',
  vet: 'a returning rep',
  rookie: 'a first year rep',
};

/**
 * Pass 148 — the persistent line an owner or admin sees while previewing the
 * app as a lower role. Always one tap back to their own view.
 */
export function ViewAsBanner() {
  const { viewAs, isViewingAs, setViewAs } = useAuth();

  if (!isViewingAs || !viewAs) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-center gap-3 bg-primary px-4 py-2 text-primary-foreground shadow-lg">
      <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="text-sm font-semibold">
        Preview only. You are seeing the app as {LABEL[viewAs]}.
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setViewAs(null)}
        className="ml-2 h-8 min-h-8 gap-1 text-xs"
      >
        <X className="h-3 w-3" aria-hidden="true" /> Back to my view
      </Button>
    </div>
  );
}

export default ViewAsBanner;
