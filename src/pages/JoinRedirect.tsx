import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { captureSourceFromUrl } from '@/lib/source';

/** /join?ref=CODE — records the source, then hands off to the application flow. */
export default function JoinRedirect() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    (async () => {
      await captureSourceFromUrl();
      const vertical = (params.get('vertical') || '').trim();
      navigate(vertical ? `/apply/rookie?vertical=${encodeURIComponent(vertical)}` : '/recruiting#apply', {
        replace: true,
      });
    })();
  }, [navigate, params]);

  return (
    <div className="gold-world min-h-screen bg-background flex items-center justify-center">
      <span className="micro-label animate-pulse text-muted-foreground">Loading</span>
    </div>
  );
}
