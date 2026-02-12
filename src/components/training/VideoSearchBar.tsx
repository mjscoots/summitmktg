import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Play, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type TrainingVideo = Database['public']['Tables']['training_videos']['Row'];

interface VideoSearchBarProps {
  videos: TrainingVideo[];
  categoryTabs: string[];
  activeCategory: string;
  onFilteredVideos: (videos: TrainingVideo[], searchTerm: string) => void;
  onCategoryChange: (category: string) => void;
  onNavigateToVideo: (videoId: string) => void;
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-primary">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export function VideoSearchBar({
  videos,
  categoryTabs,
  activeCategory,
  onFilteredVideos,
  onCategoryChange,
  onNavigateToVideo,
}: VideoSearchBarProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Categories excluding "All Videos"
  const realCategories = useMemo(() => categoryTabs.filter(c => c !== 'All Videos'), [categoryTabs]);

  // Compute suggestions & filtered videos
  const { suggestions, filtered, resultCount } = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return { suggestions: [], filtered: null, resultCount: 0 };

    // Determine base set (respect active category filter)
    const base = activeCategory === 'All Videos'
      ? videos
      : videos.filter(v => v.category === activeCategory);

    // Match categories
    const matchedCats = realCategories.filter(c => c.toLowerCase().includes(q));

    // Match videos by title or description
    const matchedVideos = base.filter(v =>
      v.title.toLowerCase().includes(q) ||
      (v.description && v.description.toLowerCase().includes(q)) ||
      v.category.toLowerCase().includes(q)
    );

    // Build suggestions (max 5)
    const sug: Array<{ type: 'video' | 'category'; label: string; id?: string; count?: number }> = [];

    // Add video suggestions first
    for (const v of matchedVideos) {
      if (sug.length >= 5) break;
      sug.push({ type: 'video', label: v.title, id: v.id });
    }

    // Add category suggestions
    for (const cat of matchedCats) {
      if (sug.length >= 5) break;
      const count = videos.filter(v => v.category === cat).length;
      if (count > 0) {
        sug.push({ type: 'category', label: cat, count });
      }
    }

    return { suggestions: sug, filtered: matchedVideos, resultCount: matchedVideos.length };
  }, [debouncedQuery, videos, activeCategory, realCategories]);

  // Push filtered results up
  useEffect(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) {
      onFilteredVideos([], '');
      return;
    }
    onFilteredVideos(filtered || [], debouncedQuery.trim());
  }, [filtered, debouncedQuery, onFilteredVideos]);

  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    setShowDropdown(false);
    onFilteredVideos([], '');
    onCategoryChange('All Videos');
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (sug: { type: string; label: string; id?: string }) => {
    setShowDropdown(false);
    if (sug.type === 'video' && sug.id) {
      onNavigateToVideo(sug.id);
    } else if (sug.type === 'category') {
      setQuery('');
      setDebouncedQuery('');
      onFilteredVideos([], '');
      onCategoryChange(sug.label);
    }
  };

  return (
    <div ref={containerRef} className="relative mb-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setShowDropdown(e.target.value.length > 0);
          }}
          onFocus={() => query.length > 0 && setShowDropdown(true)}
          placeholder="Search videos by title or category..."
          className="w-full h-12 pl-11 pr-10 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Auto-suggest Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1.5 w-full bg-popover border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {suggestions.map((sug, i) => (
            <button
              key={`${sug.type}-${sug.id || sug.label}-${i}`}
              onClick={() => handleSuggestionClick(sug)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors"
            >
              {sug.type === 'video' ? (
                <Play className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <span className="truncate text-foreground">
                {highlightMatch(sug.label, debouncedQuery.trim())}
              </span>
              {sug.type === 'category' && sug.count !== undefined && (
                <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                  {sug.count} video{sug.count !== 1 ? 's' : ''}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Result Count */}
      {debouncedQuery.trim() && (
        <p className="text-xs text-muted-foreground mt-2">
          {resultCount > 0
            ? `Showing ${resultCount} result${resultCount !== 1 ? 's' : ''} for "${debouncedQuery.trim()}"`
            : null}
        </p>
      )}
    </div>
  );
}
