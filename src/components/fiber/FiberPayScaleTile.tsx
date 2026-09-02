import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { isManagerOrAbove } from '@/lib/roles';

/**
 * Pass 154 - the owner's Fiber pay scale file, for leaders only. The bucket is
 * private, so the URL is minted on tap by an edge function that checks the
 * caller is a manager or above. Reps never see this tile.
 */
export function FiberPayScaleTile() {
  const { role } = useAuth();
  const { activeVertical } = useWorkspace();
  const [busy, setBusy] = useState(false);

  if (activeVertical !== 'Fiber' || !isManagerOrAbove(role)) return null;

  const open = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('fiber-doc-url', {
      body: { path: 'Summit_Fiber_Pay_Scale_v5.xlsx' },
    });
    setBusy(false);
    const url = (data as { url?: string } | null)?.url;
    if (error || !url) {
      toast('Could not open the file');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className="group flex min-h-[88px] w-full items-start gap-3 rounded-xl border border-white/[0.06] bg-card/60 p-4 text-left backdrop-blur-sm transition-colors hover:border-primary/30"
    >
      <span className="rounded-xl bg-primary/15 p-2.5 text-primary">
        <FileSpreadsheet className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-foreground">Fiber pay scale v5</span>
        <span className="mt-0.5 block text-[12px] text-muted-foreground">
          {busy ? 'Opening' : 'The pay scale workbook, for leaders'}
        </span>
      </span>
    </button>
  );
}

export default FiberPayScaleTile;
