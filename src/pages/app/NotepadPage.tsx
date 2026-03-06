import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  FileText, Search, X, Download, Pencil, Video, Save,
  StickyNote, BarChart3, Link2, ChevronDown, FolderOpen
} from 'lucide-react';

interface NoteWithVideo {
  id: string;
  notes: string | null;
  updated_at: string | null;
  video_id: string;
  training_videos: {
    id: string;
    title: string;
    category: string;
    video_url: string | null;
    duration_seconds: number | null;
  } | null;
}

function NoteCard({ note, onSave }: { note: NoteWithVideo; onSave: () => void }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(note.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('video_notes')
      .update({ notes: editedNotes, updated_at: new Date().toISOString() })
      .eq('id', note.id);

    if (!error) {
      toast.success('Notes saved');
      setIsEditing(false);
      onSave();
    } else {
      toast.error('Failed to save');
    }
    setIsSaving(false);
  };

  return (
    <Card id={`note-${note.id}`} className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground truncate">
            {note.training_videos?.title || 'Untitled Video'}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {note.updated_at
              ? `Edited ${formatDistanceToNow(new Date(note.updated_at))} ago`
              : 'Never edited'}
            {' · '}
            {note.notes?.length || 0} chars
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {!isEditing ? (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setEditedNotes(note.notes || ''); setIsEditing(true); }}>
                <Pencil className="w-3 h-3" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate(`/app/training/videos/${note.video_id}`)}>
                <Video className="w-3 h-3" /> View
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={isSaving}>
                <Save className="w-3 h-3" /> {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <Textarea
          value={editedNotes}
          onChange={(e) => setEditedNotes(e.target.value)}
          className="min-h-[160px] font-mono text-sm resize-y"
          placeholder="Add your notes here..."
        />
      ) : (
        <pre className="whitespace-pre-wrap font-sans text-sm bg-muted/50 p-3 rounded-md text-foreground/80 max-h-48 overflow-y-auto">
          {note.notes || 'No notes yet'}
        </pre>
      )}
    </Card>
  );
}

export default function NotepadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allNotes, setAllNotes] = useState<NoteWithVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('video_notes')
      .select('id, notes, updated_at, video_id, training_videos (id, title, category, video_url, duration_minutes)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (!error) setAllNotes((data || []) as unknown as NoteWithVideo[]);
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const notesByCategory = useMemo(() => {
    if (!allNotes) return {};
    return allNotes.reduce((acc: Record<string, NoteWithVideo[]>, note) => {
      const cat = note.training_videos?.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(note);
      return acc;
    }, {});
  }, [allNotes]);

  const filteredNotes = useMemo(() => {
    const source = selectedCategory === 'all' ? (allNotes || []) : (notesByCategory[selectedCategory] || []);
    if (!searchQuery) return source;
    const q = searchQuery.toLowerCase();
    return source.filter(n =>
      n.notes?.toLowerCase().includes(q) ||
      n.training_videos?.title?.toLowerCase().includes(q) ||
      n.training_videos?.category?.toLowerCase().includes(q)
    );
  }, [allNotes, notesByCategory, selectedCategory, searchQuery]);

  const filteredByCategory = useMemo(() => {
    if (selectedCategory !== 'all') return { [selectedCategory]: filteredNotes };
    return filteredNotes.reduce((acc: Record<string, NoteWithVideo[]>, note) => {
      const cat = note.training_videos?.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(note);
      return acc;
    }, {});
  }, [filteredNotes, selectedCategory]);

  const refetch = () => fetchNotes();

  const totalChars = allNotes?.reduce((s, n) => s + (n.notes?.length || 0), 0) || 0;
  const categories = Object.keys(notesByCategory);

  const exportNotes = () => {
    if (!allNotes?.length) return;
    let content = '# MY TRAINING NOTES\n\n';
    content += `Generated: ${new Date().toLocaleString()}\n\n`;
    (Object.entries(notesByCategory) as [string, NoteWithVideo[]][]).forEach(([category, notes]) => {
      content += `## ${category.toUpperCase()}\n\n`;
      notes.forEach((note: NoteWithVideo) => {
        content += `### ${note.training_videos?.title}\n`;
        content += `Last edited: ${note.updated_at ? new Date(note.updated_at).toLocaleString() : 'N/A'}\n\n`;
        content += `${note.notes || '(empty)'}\n\n---\n\n`;
      });
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-notes-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Notes exported!');
  };

  const scrollToNote = (id: string) => {
    document.getElementById(`note-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">My Notepad</h1>
            {allNotes && <span className="text-xs text-muted-foreground ml-1">({allNotes.length} notes)</span>}
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="pl-9 pr-8 h-9 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        {searchQuery && (
          <p className="text-xs text-muted-foreground mb-4">
            Found {filteredNotes.length} notes matching "{searchQuery}"
          </p>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-pulse text-muted-foreground">Loading notes...</div>
          </div>
        ) : !allNotes?.length ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">No notes yet</p>
            <p className="text-sm text-muted-foreground mb-4">Start taking notes while watching training videos!</p>
            <Button variant="outline" onClick={() => navigate('/app/training/videos')}>
              Browse Training Videos →
            </Button>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Category Sidebar — desktop */}
            <div className="hidden lg:block w-52 shrink-0">
              <div className="sticky top-6 space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Categories</p>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    selectedCategory === 'all' ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  All Notes ({allNotes.length})
                </button>
                {categories.map(cat => (
                  <div key={cat}>
                    <button
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-between",
                        selectedCategory === cat ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <span className="truncate">{cat}</span>
                      <span className="text-[10px] opacity-60">{notesByCategory[cat].length}</span>
                    </button>
                    {selectedCategory === cat && (
                      <div className="pl-4 mt-1 space-y-0.5">
                        {notesByCategory[cat].map(n => (
                          <button
                            key={n.id}
                            onClick={() => scrollToNote(n.id)}
                            className="w-full text-left text-xs px-2 py-1 hover:bg-muted rounded truncate text-muted-foreground"
                          >
                            {n.training_videos?.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile category filter */}
            <div className="lg:hidden w-full mb-4 -mt-2">
              <button
                onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md text-sm w-full justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5" />
                  {selectedCategory === 'all' ? 'All Notes' : selectedCategory}
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", mobileFilterOpen && "rotate-180")} />
              </button>
              {mobileFilterOpen && (
                <div className="mt-1 p-2 bg-card border rounded-md space-y-0.5">
                  <button onClick={() => { setSelectedCategory('all'); setMobileFilterOpen(false); }} className={cn("w-full text-left px-3 py-1.5 rounded text-sm", selectedCategory === 'all' && "bg-primary/15 text-primary")}>
                    All Notes ({allNotes.length})
                  </button>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); setMobileFilterOpen(false); }} className={cn("w-full text-left px-3 py-1.5 rounded text-sm flex justify-between", selectedCategory === cat && "bg-primary/15 text-primary")}>
                      <span>{cat}</span>
                      <span className="text-xs opacity-60">{notesByCategory[cat].length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-6">
              {(Object.entries(filteredByCategory) as [string, NoteWithVideo[]][]).map(([category, notes]) => (
                <div key={category}>
                  <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    {category}
                    <span className="text-xs font-normal text-muted-foreground">({notes.length})</span>
                  </h2>
                  <div className="space-y-3">
                    {notes.map(note => (
                      <NoteCard key={note.id} note={note} onSave={refetch} />
                    ))}
                  </div>
                </div>
              ))}
              {filteredNotes.length === 0 && searchQuery && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No notes match "{searchQuery}"</p>
                </div>
              )}
            </div>

            {/* Stats panel — desktop */}
            <div className="hidden xl:block w-52 shrink-0">
              <div className="sticky top-6 space-y-5">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" /> Stats
                  </p>
                  <Card className="p-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Videos noted</span><span className="font-semibold">{allNotes.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Categories</span><span className="font-semibold">{categories.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Characters</span><span className="font-semibold">{totalChars.toLocaleString()}</span></div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last update</span>
                      <span className="font-semibold text-xs">{allNotes[0]?.updated_at ? formatDistanceToNow(new Date(allNotes[0].updated_at)) + ' ago' : '—'}</span>
                    </div>
                  </Card>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Quick Links
                  </p>
                  <div className="space-y-1.5">
                    <button onClick={() => navigate('/app/training/videos')} className="block text-sm text-primary hover:underline">→ Training Videos</button>
                    <button onClick={() => navigate('/app/training')} className="block text-sm text-primary hover:underline">→ Training Hub</button>
                    <button onClick={() => navigate('/app/leaderboard')} className="block text-sm text-primary hover:underline">→ Leaderboard</button>
                  </div>
                </div>

                <Separator />

                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={exportNotes} disabled={!allNotes?.length}>
                  <Download className="w-3.5 h-3.5" /> Export All Notes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
