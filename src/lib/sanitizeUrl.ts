const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Returns the URL string only if it uses a safe protocol.
 * Returns '#' for invalid or dangerous URLs (javascript:, data:, etc.).
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (SAFE_PROTOCOLS.includes(parsed.protocol)) {
      return url;
    }
    return '#';
  } catch {
    return '#';
  }
}
