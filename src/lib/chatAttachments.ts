import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'chat-uploads';
const EXPIRY_SECONDS = 3600;
/** Re-sign well before the hour is up so long lived bubbles never break. */
const REFRESH_AFTER_MS = 50 * 60 * 1000;

/**
 * Chat attachments live in a private bucket. Older messages stored the full
 * public URL, newer ones store the object path. Both resolve to a path here.
 */
export function toObjectPath(urlOrPath: string): string {
  const value = (urlOrPath || '').trim();
  if (!value) return '';
  const marker = `/${BUCKET}/`;
  const at = value.indexOf(marker);
  const raw = at >= 0 ? value.slice(at + marker.length) : value;
  return raw.split('?')[0].replace(/^\/+/, '');
}

type CacheEntry = { url: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

/** Short-lived signed URL for a chat attachment, cached for the session. */
export async function getChatAttachmentUrl(
  urlOrPath: string,
  opts?: { force?: boolean }
): Promise<string | null> {
  const path = toObjectPath(urlOrPath);
  if (!path) return null;

  if (opts?.force) cache.delete(path);

  const hit = cache.get(path);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

  const pending = inflight.get(path);
  if (pending) return pending;

  const request = (async () => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, EXPIRY_SECONDS);
    inflight.delete(path);
    if (error || !data?.signedUrl) return null;
    cache.set(path, {
      url: data.signedUrl,
      // Refresh a minute early so playback never starts on an expired URL.
      expiresAt: Date.now() + (EXPIRY_SECONDS - 60) * 1000,
    });
    return data.signedUrl;
  })();

  inflight.set(path, request);
  return request;
}

/**
 * Resolves a stored attachment reference to a signed URL for rendering.
 * While the element stays mounted the URL is re-signed every 50 minutes, and a
 * load error re-signs once before giving up.
 */
export function useChatAttachmentUrl(urlOrPath: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const retriedRef = useRef(false);

  const load = useCallback(
    async (force: boolean) => {
      if (!urlOrPath) return null;
      const signed = await getChatAttachmentUrl(urlOrPath, { force });
      return signed;
    },
    [urlOrPath]
  );

  useEffect(() => {
    let active = true;
    retriedRef.current = false;
    if (!urlOrPath) {
      setUrl(null);
      return;
    }
    setFailed(false);
    void load(false).then((signed) => {
      if (!active) return;
      setUrl(signed);
      setFailed(!signed);
    });

    const timer = window.setInterval(() => {
      void load(true).then((signed) => {
        if (active && signed) setUrl(signed);
      });
    }, REFRESH_AFTER_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [urlOrPath, load]);

  /** Called by the media element when the browser could not load the URL. */
  const retry = useCallback(() => {
    if (retriedRef.current) {
      setFailed(true);
      return;
    }
    retriedRef.current = true;
    void load(true).then((signed) => {
      if (signed) setUrl(signed);
      else setFailed(true);
    });
  }, [load]);

  return { url, failed, retry };
}
