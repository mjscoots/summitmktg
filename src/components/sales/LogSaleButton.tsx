import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogSaleSheet } from '@/components/sales/LogSaleSheet';

/** Full-width entry point for logging a self-reported Pest sale. */
export function LogSaleButton({ onSaved }: { onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="min-h-11 w-full" onClick={() => setOpen(true)}>
        Log a sale
      </Button>
      <LogSaleSheet open={open} onOpenChange={setOpen} onSaved={onSaved} />
    </>
  );
}

export default LogSaleButton;
