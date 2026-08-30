/**
 * Chat photos are re-encoded in the browser before upload: max 1600px on the
 * longest edge, JPEG output (which drops EXIF), target under about 2MB.
 */
const MAX_EDGE = 1600;
const TARGET_BYTES = 2 * 1024 * 1024;

export function isImageMimeOrName(file: File) {
  if (file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', quality));
}

/**
 * Returns a downscaled JPEG blob, or null when the file is not a decodable image.
 */
export async function prepareChatImage(file: File): Promise<{ blob: Blob; ext: string } | null> {
  if (!isImageMimeOrName(file)) return null;
  // Animated formats lose their animation when re-encoded, so leave them alone.
  if (file.type === 'image/gif') return null;

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return null;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.85;
  let blob = await toBlob(canvas, quality);
  while (blob && blob.size > TARGET_BYTES && quality > 0.45) {
    quality -= 0.15;
    blob = await toBlob(canvas, quality);
  }
  if (!blob) return null;
  return { blob, ext: 'jpg' };
}
