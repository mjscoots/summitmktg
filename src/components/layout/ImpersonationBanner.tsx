import { useRookieView } from '@/contexts/RookieViewContext';
import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ImpersonationBanner() {
  const { impersonatedUser, stopImpersonating, isImpersonating } = useRookieView();

  if (!isImpersonating || !impersonatedUser) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground px-4 py-2 flex items-center justify-center gap-3 shadow-lg">
      <Eye className="w-4 h-4 shrink-0" />
      <span className="text-sm font-semibold">
        Viewing as: {impersonatedUser.full_name} ({impersonatedUser.email})
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={stopImpersonating}
        className="h-7 text-xs gap-1 ml-2"
      >
        <X className="w-3 h-3" /> Exit
      </Button>
    </div>
  );
}
