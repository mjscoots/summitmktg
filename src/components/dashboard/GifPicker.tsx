import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Google's public Tenor API key
const TENOR_SEARCH_URL = 'https://tenor.googleapis.com/v2/search';
const TENOR_FEATURED_URL = 'https://tenor.googleapis.com/v2/featured';

interface GifResult {
  id: string;
  title: string;
  media_formats: {
    tinygif: { url: string };
    gif: { url: string };
  };
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

export const GIF_PREFIX = 'gif:';

export function isGifMessage(content: string): boolean {
  return content.startsWith(GIF_PREFIX);
}

export function getGifUrl(content: string): string | null {
  if (!isGifMessage(content)) return null;
  return content.slice(GIF_PREFIX.length);
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const baseUrl = searchQuery.trim() ? TENOR_SEARCH_URL : TENOR_FEATURED_URL;
      const params = new URLSearchParams({
        key: TENOR_API_KEY,
        client_key: 'summit_app',
        limit: '20',
        media_filter: 'tinygif,gif',
        contentfilter: 'medium',
      });
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const res = await fetch(`${baseUrl}?${params}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Tenor fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load featured on mount
  useEffect(() => {
    fetchGifs('');
    inputRef.current?.focus();
  }, [fetchGifs]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(query);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchGifs]);

  return (
    <div className="absolute bottom-full mb-2 right-0 w-[320px] bg-card border border-border rounded-xl shadow-xl z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">GIFs</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>
      
      {/* Search */}
      <div className="px-2 py-2 border-b border-border/30">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs..."
            className="w-full bg-muted/60 text-sm rounded-lg pl-8 pr-8 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-2 gap-1 p-2 max-h-[280px] overflow-y-auto">
        {loading && results.length === 0 ? (
          <div className="col-span-2 flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : results.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-sm text-muted-foreground">
            No GIFs found
          </div>
        ) : (
          results.map((gif) => (
            <button
              key={gif.id}
              onClick={() => onSelect(gif.media_formats.gif?.url || gif.media_formats.tinygif?.url)}
              className="rounded-lg overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all group"
              title={gif.title}
            >
              <img
                src={gif.media_formats.tinygif?.url}
                alt={gif.title}
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            </button>
          ))
        )}
      </div>

      {/* Tenor attribution */}
      <div className="px-3 py-1.5 border-t border-border/30 flex items-center justify-end">
        <span className="text-[9px] text-muted-foreground/50">Powered by Tenor</span>
      </div>
    </div>
  );
}
