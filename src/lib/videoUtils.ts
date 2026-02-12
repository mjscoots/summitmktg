/**
 * Extract Vimeo video ID from various URL formats
 */
export function extractVimeoId(url: string): string | null {
  if (!url) return null;
  // Match vimeo.com/ID, player.vimeo.com/video/ID, etc.
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

/**
 * Get Vimeo thumbnail URL from a Vimeo video URL.
 * Uses vumbnail.com service for instant thumbnails without API key.
 */
export function getVimeoThumbnailUrl(videoUrl: string, size: 'small' | 'medium' | 'large' = 'large'): string | null {
  const id = extractVimeoId(videoUrl);
  if (!id) return null;
  // vumbnail.com provides Vimeo thumbnails without API auth
  return `https://vumbnail.com/${id}.jpg`;
}

/**
 * Check if a URL is a Vimeo URL
 */
export function isVimeoUrl(url: string): boolean {
  return /vimeo\.com/.test(url);
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

/**
 * Get YouTube thumbnail URL
 */
export function getYouTubeThumbnailUrl(videoUrl: string): string | null {
  const match = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?#]+)/);
  if (!match) return null;
  return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
}

/**
 * Get thumbnail URL for any supported video platform
 */
export function getVideoThumbnailUrl(videoUrl: string | null): string | null {
  if (!videoUrl) return null;
  if (isVimeoUrl(videoUrl)) return getVimeoThumbnailUrl(videoUrl);
  if (isYouTubeUrl(videoUrl)) return getYouTubeThumbnailUrl(videoUrl);
  return null;
}
