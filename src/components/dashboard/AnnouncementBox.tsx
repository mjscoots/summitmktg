import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Megaphone, Pin, Sparkles, BookOpen, AlertTriangle, Settings, Plus, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnnouncementEditorModal } from './AnnouncementEditorModal';
import { formatDistanceToNow } from 'date-fns';

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Sparkles; accent: string }> = {
  new_feature: { label: 'New Feature', icon: Sparkles, accent: 'bg-primary/20 text-primary/80 border-orange-500/30' },
  update: { label: 'Update', icon: Settings, accent: 'bg-primary/20 text-primary/80 border-amber-500/30' },
  training: { label: 'Training', icon: BookOpen, accent: 'bg-primary/20 text-primary/80 border-orange-400/30' },
  important: { label: 'Important', icon: AlertTriangle, accent: 'bg-red-500/20 text-red-300 border-red-500/30' },
  admin_note: { label: 'Admin Note', icon: Megaphone, accent: 'bg-primary/20 text-primary/80 border-orange-500/30' },
};

interface AnnouncementPost {
  id: string;
  title: string;
  body: string;
  category: string;
  cta_label: string | null;
  cta_target: string | null;
  is_pinned: boolean;
  is_important: boolean;
  is_auto_generated: boolean;
  source_type: string | null;
  status: string;
  published_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function AnnouncementBox() {
  const { role, user } = useAuth();
  const isAdmin = role === 'admin' || role === 'owner';
  const [posts, setPosts] = useState<AnnouncementPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<AnnouncementPost | null>(null);

  const fetchPosts = async () => {
    // Admins see all, reps see published only (RLS handles this)
    const query = (supabase as any).from('announcement_posts')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);

    if (!isAdmin) {
      query.eq('status', 'published');
    }

    const { data } = await query;
    setPosts((data || []) as AnnouncementPost[]);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [user, role]);

  const handleEdit = (post: AnnouncementPost) => {
    setEditingPost(post);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingPost(null);
    setEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from('announcement_posts').delete().eq('id', id);
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const handleTogglePin = async (post: AnnouncementPost) => {
    // Unpin all others first if pinning
    if (!post.is_pinned) {
      await (supabase as any).from('announcement_posts').update({ is_pinned: false }).eq('is_pinned', true);
    }
    await (supabase as any).from('announcement_posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id);
    fetchPosts();
  };

  const handlePublish = async (post: AnnouncementPost) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    await (supabase as any).from('announcement_posts').update({
      status: newStatus,
      published_at: newStatus === 'published' ? new Date().toISOString() : null,
    }).eq('id', post.id);
    fetchPosts();
  };

  if (loading) return null;

  const publishedPosts = posts.filter(p => p.status === 'published');
  const draftPosts = posts.filter(p => p.status === 'draft');
  const visiblePosts = isAdmin ? posts : publishedPosts;
  const pinnedPost = visiblePosts.find(p => p.is_pinned);
  const otherPosts = visiblePosts.filter(p => !p.is_pinned);
  const displayPosts = expanded ? otherPosts : otherPosts.slice(0, 2);

  if (!isAdmin && publishedPosts.length === 0) return null;

  return (
    <>
      <div className="mb-5 rounded-2xl overflow-hidden" style={{
        background: 'linear-gradient(135deg, hsl(25 80% 8%), hsl(20 60% 6%))',
        boxShadow: '0 0 40px -12px hsl(25 95% 53% / 0.15), inset 0 1px 0 hsl(25 95% 53% / 0.08)',
        border: '1px solid hsl(25 95% 53% / 0.15)',
      }}>
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(25 95% 53%), hsl(30 90% 45%))' }}>
            <Megaphone className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-wide" style={{ color: 'hsl(25 95% 65%)' }}>
            Updates & Announcements
          </h2>
          {isAdmin && draftPosts.length > 0 && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-yellow-500/20">
              {draftPosts.length} draft{draftPosts.length > 1 ? 's' : ''}
            </span>
          )}
          {isAdmin && (
            <button onClick={handleCreate} className="ml-auto flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md transition-all" style={{ background: 'hsl(25 95% 53% / 0.15)', color: 'hsl(25 95% 65%)' }}>
              <Plus className="w-3 h-3" /> New
            </button>
          )}
        </div>

        {/* Pinned Post */}
        {pinnedPost && (
          <AnnouncementCard
            post={pinnedPost}
            isAdmin={isAdmin}
            isPinned
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTogglePin={handleTogglePin}
            onPublish={handlePublish}
          />
        )}

        {/* Other Posts */}
        {displayPosts.map(post => (
          <AnnouncementCard
            key={post.id}
            post={post}
            isAdmin={isAdmin}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTogglePin={handleTogglePin}
            onPublish={handlePublish}
          />
        ))}

        {/* Empty state for admins */}
        {isAdmin && visiblePosts.length === 0 && (
          <div className="px-5 py-6 text-center">
            <Megaphone className="w-6 h-6 mx-auto mb-2 opacity-20" style={{ color: 'hsl(25 95% 53%)' }} />
            <p className="text-[11px] text-muted-foreground">No announcements yet. Create one to notify your team.</p>
          </div>
        )}

        {/* View More */}
        {otherPosts.length > 2 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors"
            style={{ color: 'hsl(25 95% 60%)', borderTop: '1px solid hsl(25 95% 53% / 0.08)' }}
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3" /> Show less</>
            ) : (
              <><ChevronDown className="w-3 h-3" /> View all {otherPosts.length} updates</>
            )}
          </button>
        )}
      </div>

      {isAdmin && (
        <AnnouncementEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          post={editingPost}
          onSaved={fetchPosts}
        />
      )}
    </>
  );
}

function AnnouncementCard({
  post,
  isAdmin,
  isPinned,
  onEdit,
  onDelete,
  onTogglePin,
  onPublish,
}: {
  post: AnnouncementPost;
  isAdmin: boolean;
  isPinned?: boolean;
  onEdit: (p: AnnouncementPost) => void;
  onDelete: (id: string) => void;
  onTogglePin: (p: AnnouncementPost) => void;
  onPublish: (p: AnnouncementPost) => void;
}) {
  const cat = CATEGORY_CONFIG[post.category] || CATEGORY_CONFIG.update;
  const Icon = cat.icon;
  const isDraft = post.status === 'draft';
  const timeAgo = post.published_at
    ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true })
    : formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <div className={cn(
      "mx-3 mb-2 rounded-xl p-3.5 transition-all",
      isPinned
        ? "border border-orange-500/20"
        : "border border-transparent hover:border-orange-500/10",
      isDraft && "opacity-60",
    )} style={{
      background: isPinned
        ? 'linear-gradient(135deg, hsl(25 80% 12%), hsl(20 60% 9%))'
        : 'hsl(20 20% 8% / 0.5)',
    }}>
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5" style={{ color: 'hsl(25 95% 60%)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isPinned && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'hsl(25 95% 53% / 0.15)', color: 'hsl(25 95% 60%)' }}>
                <Pin className="w-2 h-2" /> Pinned
              </span>
            )}
            <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border", cat.accent)}>
              {cat.label}
            </span>
            {isDraft && (
              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-yellow-500/20">
                Draft
              </span>
            )}
            {post.is_auto_generated && (
              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground border border-border/30">
                Auto
              </span>
            )}
            {post.is_important && (
              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/15 text-primary border border-red-500/20">
                Important
              </span>
            )}
          </div>

          <h3 className="text-[13px] font-bold text-foreground leading-tight mb-0.5">{post.title}</h3>
          {post.body && <p className="text-[11px] text-muted-foreground leading-relaxed">{post.body}</p>}

          <div className="flex items-center gap-3 mt-2">
            {post.cta_label && post.cta_target && (
              <a href={post.cta_target} className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md transition-all" style={{ background: 'hsl(25 95% 53% / 0.15)', color: 'hsl(25 95% 65%)' }}>
                {post.cta_label} <ArrowRight className="w-2.5 h-2.5" />
              </a>
            )}
            <span className="text-[9px] text-muted-foreground/60 ml-auto">{timeAgo}</span>
          </div>
        </div>
      </div>

      {/* Admin controls */}
      {isAdmin && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-border/10">
          <button onClick={() => onEdit(post)} className="text-[9px] font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded transition-colors">Edit</button>
          <button onClick={() => onTogglePin(post)} className="text-[9px] font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded transition-colors">
            {post.is_pinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={() => onPublish(post)} className="text-[9px] font-semibold px-2 py-0.5 rounded transition-colors" style={{ color: isDraft ? 'hsl(142 71% 45%)' : 'hsl(25 95% 60%)' }}>
            {isDraft ? 'Publish' : 'Unpublish'}
          </button>
          <button onClick={() => { if (confirm('Delete this announcement?')) onDelete(post.id); }} className="text-[9px] font-semibold text-primary/60 hover:text-primary px-2 py-0.5 rounded transition-colors ml-auto">Delete</button>
        </div>
      )}
    </div>
  );
}
