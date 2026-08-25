interface PageMetaOptions {
  title: string;
  description: string;
  /** Absolute or relative path used for canonical + og:url */
  path?: string;
}

function upsert(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

/**
 * Sets per-page title, description, canonical and OG/Twitter tags so texted
 * links unfurl with the right copy. Safe to call from any public page.
 */
export function setPageMeta({ title, description, path }: PageMetaOptions) {
  document.title = title;
  const url = path ? `${window.location.origin}${path}` : window.location.href;

  upsert('meta[name="description"]', { name: 'description', content: description });
  upsert('link[rel="canonical"]', { rel: 'canonical', href: url });
  upsert('meta[property="og:title"]', { property: 'og:title', content: title });
  upsert('meta[property="og:description"]', { property: 'og:description', content: description });
  upsert('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  upsert('meta[property="og:url"]', { property: 'og:url', content: url });
  upsert('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsert('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
  upsert('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
}
