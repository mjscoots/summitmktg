import { supabase } from '@/integrations/supabase/client';

/** Longest edge of a stored avatar. */
const MAX_EDGE = 512;
/** Hard cap after resize. */
const MAX_BYTES = 1_000_000;

/**
 * Re-encode an image to a square JPEG at most 512px wide. Re-encoding drops
 * EXIF, and the quality steps down until the file fits under the cap.
 */
export async function normalizeAvatar(source: Blob): Promise<Blob> {
  const bitmap = await loadImage(source);
  const size = Math.min(MAX_EDGE, Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap as CanvasImageSource, (size - w) / 2, (size - h) / 2, w, h);

  for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5]) {
    const out = await toBlob(canvas, quality);
    if (out && out.size <= MAX_BYTES) return out;
  }
  return (await toBlob(canvas, 0.4)) || source;
}

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

function loadImage(source: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image could not be read'));
    };
    img.src = url;
  });
}

/** One stable object per person, so a new photo replaces the old one. */
export function avatarPath(userId: string) {
  return `${userId}/avatar.jpg`;
}

/**
 * Store a person's photo in their own folder and hand back a URL that skips
 * any cached copy of the previous file.
 */
export async function uploadAvatar(userId: string, source: Blob): Promise<string> {
  const blob = await normalizeAvatar(source);
  const path = avatarPath(userId);
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
  if (error) throw error;
  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${publicUrl}?v=${Date.now()}`;
}

/** Clear the stored file so the person falls back to initials. */
export async function deleteAvatarFile(userId: string) {
  await supabase.storage.from('avatars').remove([avatarPath(userId)]);
}
