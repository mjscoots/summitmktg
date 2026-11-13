import { useEffect, useState } from 'react';
/** Minimal read-only async loader. Skips when `enabled` is false. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], enabled = true) {
  const [data, setData] = useState<T | undefined>();
  const [isLoading, setLoading] = useState(enabled);
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let live = true; setLoading(true);
    fn().then((d) => { if (live) setData(d); }).catch(() => {}).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);
  return { data, isLoading };
}
