import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

/**
 * Pass 157 - the two toast layers render nothing until something is toasted,
 * so they load after first paint instead of sitting in the shell.
 */
export default function RootOverlays() {
  return (
    <>
      <Toaster />
      <Sonner />
    </>
  );
}
