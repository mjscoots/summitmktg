/**
 * Extract Vimeo video ID from various URL formats
 */
export function extractVimeoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

/**
 * Clean Vimeo embed URL with all branding removed
 */
export function getCleanVimeoEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    title: '0',
    byline: '0',
    portrait: '0',
    badge: '0',
    autopause: '0',
    player_id: '0',
    app_id: '0',
    controls: '1',
    dnt: '1',
  });
  return `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
}

/**
 * Get Vimeo thumbnail URL using vumbnail.com (no API key needed)
 */
export function getVimeoThumbnailUrl(videoUrl: string): string | null {
  const id = extractVimeoId(videoUrl);
  if (!id) return null;
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
