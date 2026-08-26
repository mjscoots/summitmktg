import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'chat-uploads';
const EXPIRY_SECONDS = 3600;

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
export async function getChatAttachmentUrl(urlOrPath: string): Promise<string | null> {
  const path = toObjectPath(urlOrPath);
  if (!path) return null;

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

/** Resolves a stored attachment reference to a signed URL for rendering. */
export function useChatAttachmentUrl(urlOrPath: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!urlOrPath) {
      setUrl(null);
      return;
    }
    setFailed(false);
    getChatAttachmentUrl(urlOrPath).then(signed => {
      if (!active) return;
      setUrl(signed);
      setFailed(!signed);
    });
    return () => {
      active = false;
    };
  }, [urlOrPath]);

  return { url, failed };
}
