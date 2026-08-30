import { EmptyState } from '@/components/shared/EmptyState';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Megaphone,
  Pin,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Settings,
  Plus,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Archive,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnnouncementEditorModal } from './AnnouncementEditorModal';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { verticalFilter } from '@/lib/workspaceScope';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Sparkles }> = {
  new_feature: { label: 'New Feature', icon: Sparkles },
  update: { label: 'Update', icon: Settings },
  training: { label: 'Training', icon: BookOpen },
  important: { label: 'Important', icon: AlertTriangle },
  admin_note: { label: 'Admin Note', icon: Megaphone },
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
  const { activeVertical } = useWorkspace();
  const isAdmin = role === 'admin' || role === 'owner';
  const isStaff = isAdmin || role === 'manager';
  const [posts, setPosts] = useState<AnnouncementPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<AnnouncementPost | null>(null);
  const [seen, setSeen] = useState<{ total: number; counts: Record<string, { seen: number; total: number }> }>({ total: 0, counts: {} });
  const [acks, setAcks] = useState<{ total: number; counts: Record<string, number> }>({ total: 0, counts: {} });
  const markedRef = useRef(false);

  const fetchPosts = useCallback(async () => {
    const query = (supabase as any)
      .from('announcement_posts')
      .select('*')
      .or(verticalFilter(activeVertical))
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(40);

    if (!isAdmin) query.eq('status', 'published');

    const { data } = await query;
    setPosts((data || []) as AnnouncementPost[]);
    setLoading(false);
  }, [isAdmin, activeVertical]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, user]);

  // Seen counts for managers/admins
  useEffect(() => {
    if (!isStaff || !user) return;
    (async () => {
      try {
        const { data } = await (supabase.rpc as any)('get_announcement_seen_counts');
        if (data) setSeen({ total: data.total || 0, counts: data.counts || {} });
      } catch {}
    })();
  }, [isStaff, user, posts.length]);

  // Got it counts, owner and admin only
  useEffect(() => {
    if (!isAdmin || !user) return;
    (async () => {
      try {
        const { data } = await (supabase.rpc as any)('announcement_ack_counts');
        if (data && !data.error) setAcks({ total: data.total || 0, counts: data.counts || {} });
      } catch {}
    })();
  }, [isAdmin, user, posts.length]);


  const now = Date.now();
  const isExpired = (p: AnnouncementPost) => !!p.expires_at && new Date(p.expires_at).getTime() < now;

  const livePosts = posts.filter((p) => p.status === 'published' && !isExpired(p));
  const draftPosts = posts.filter((p) => p.status === 'draft');
  const archivedPosts = posts.filter((p) => p.status === 'archived' || (p.status === 'published' && isExpired(p)));

  // Record "seen" once per mount for the live posts this user can see
  useEffect(() => {
    if (markedRef.current || !user || loading || livePosts.length === 0) return;
    markedRef.current = true;
    (async () => {
      try {
        await (supabase.rpc as any)('mark_announcements_seen', { _ids: livePosts.map((p) => p.id) });
      } catch {}
    })();
  }, [user, loading, livePosts]);

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
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleTogglePin = async (post: AnnouncementPost) => {
    if (!post.is_pinned) {
      await (supabase as any).from('announcement_posts').update({ is_pinned: false }).eq('is_pinned', true);
    }
    await (supabase as any).from('announcement_posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id);
    fetchPosts();
  };

  const handlePublish = async (post: AnnouncementPost) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    await (supabase as any)
      .from('announcement_posts')
      .update({
        status: newStatus,
        published_at: newStatus === 'published' ? new Date().toISOString() : null,
      })
      .eq('id', post.id);
    fetchPosts();
  };

  const handleArchive = async (post: AnnouncementPost) => {
    await (supabase as any).from('announcement_posts').update({ status: 'archived' }).eq('id', post.id);
    fetchPosts();
  };

  const handleRestore = async (post: AnnouncementPost) => {
    await (supabase as any)
      .from('announcement_posts')
      .update({
        status: 'published',
        published_at: post.published_at || new Date().toISOString(),
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', post.id);
    fetchPosts();
  };

  if (loading) return null;

  const baseList = showArchive ? archivedPosts : isAdmin ? [...livePosts, ...draftPosts] : livePosts;
  const pinnedPost = showArchive ? undefined : baseList.find((p) => p.is_pinned);
  const otherPosts = baseList.filter((p) => p.id !== pinnedPost?.id);
  const displayPosts = expanded ? otherPosts : otherPosts.slice(0, 3);

  if (!isAdmin && livePosts.length === 0) return null;

  return (
    <>
      <div className="mb-5 rounded-[var(--radius)] border border-white/[0.06] bg-card/60 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-white/[0.04] px-3 py-2.5 sm:px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Megaphone className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="micro-label !text-foreground">{showArchive ? 'Archive' : 'Announcements'}</h2>
          {!showArchive && isAdmin && draftPosts.length > 0 && (
            <span className="micro-label rounded-full border border-border/40 bg-muted/30 px-2 py-0.5">
              {draftPosts.length} draft{draftPosts.length > 1 ? 's' : ''}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {isAdmin && (
              <button
                onClick={() => {
                  setShowArchive((v) => !v);
                  setExpanded(false);
                }}
                className="micro-label inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                {showArchive ? <ArrowRight className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                {showArchive ? 'Back' : `Archive${archivedPosts.length ? ` (${archivedPosts.length})` : ''}`}
              </button>
            )}
            {isAdmin && !showArchive && (
              <button
                onClick={handleCreate}
                className="micro-label inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary/15 px-3 text-primary transition-colors hover:bg-primary/25"
              >
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 p-2 sm:p-3">
          {pinnedPost && (
            <AnnouncementCard
              post={pinnedPost}
              isAdmin={isAdmin}
              isStaff={isStaff}
              seenCount={seen.counts[pinnedPost.id]?.seen || 0}
              seenTotal={seen.counts[pinnedPost.id]?.total ?? seen.total}
              ackCount={acks.counts[pinnedPost.id] || 0}
              ackTotal={acks.total}
              isPinned
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              onPublish={handlePublish}
              onArchive={handleArchive}
              onRestore={handleRestore}
            />
          )}

          {displayPosts.map((post) => (
            <AnnouncementCard
              key={post.id}
              post={post}
              isAdmin={isAdmin}
              isStaff={isStaff}
              seenCount={seen.counts[post.id]?.seen || 0}
              seenTotal={seen.counts[post.id]?.total ?? seen.total}
              ackCount={acks.counts[post.id] || 0}
              ackTotal={acks.total}
              archived={showArchive}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              onPublish={handlePublish}
              onArchive={handleArchive}
              onRestore={handleRestore}
            />
          ))}

          {baseList.length === 0 && (
            <EmptyState
              icon={showArchive ? Archive : Megaphone}
              title={showArchive ? 'Archive is empty' : 'No announcements'}
              description={
                showArchive
                  ? 'Expired and archived announcements land here.'
                  : 'Create one to notify the whole team.'
              }
            />
          )}

          {otherPosts.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="micro-label flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> View all {otherPosts.length}
                </>
              )}
            </button>
          )}
        </div>
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
  isStaff,
  seenCount,
  seenTotal,
  ackCount,
  ackTotal,
  isPinned,
  archived,
  onEdit,
  onDelete,
  onTogglePin,
  onPublish,
  onArchive,
  onRestore,
}: {
  post: AnnouncementPost;
  isAdmin: boolean;
  isStaff: boolean;
  seenCount: number;
  seenTotal: number;
  ackCount?: number;
  ackTotal?: number;
  isPinned?: boolean;
  archived?: boolean;
  onEdit: (p: AnnouncementPost) => void;
  onDelete: (id: string) => void;
  onTogglePin: (p: AnnouncementPost) => void;
  onPublish: (p: AnnouncementPost) => void;
  onArchive: (p: AnnouncementPost) => void;
  onRestore: (p: AnnouncementPost) => void;
}) {
  const cat = CATEGORY_CONFIG[post.category] || CATEGORY_CONFIG.update;
  const Icon = cat.icon;
  const isDraft = post.status === 'draft';
  const timeAgo = formatDistanceToNow(new Date(post.published_at || post.created_at), { addSuffix: true });

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.05] bg-background/40 p-3.5 transition-colors',
        isPinned && 'border-l-2 border-l-primary/60',
        (isDraft || archived) && 'opacity-70'
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {isPinned && (
              <span className="micro-label inline-flex items-center gap-1 !text-primary">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </span>
            )}
            <span className="micro-label">{cat.label}</span>
            {isDraft && <span className="micro-label !text-warning">Draft</span>}
            {archived && <span className="micro-label !text-muted-foreground/70">Archived</span>}
            {post.is_important && <span className="micro-label !text-destructive">Important</span>}
            {post.is_auto_generated && <span className="micro-label !text-muted-foreground/60">Auto</span>}
            <span className="ml-auto text-[10px] text-muted-foreground/60">{timeAgo}</span>
          </div>

          <h3 className="mb-0.5 text-[13px] font-bold leading-tight text-foreground">{post.title}</h3>
          {post.body && <p className="text-[12px] leading-relaxed text-muted-foreground">{post.body}</p>}

          <div className="mt-2 flex items-center gap-3">
            {post.cta_label && post.cta_target && (
              <a
                href={post.cta_target}
                className="micro-label inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary/12 px-2.5 !text-primary transition-colors hover:bg-primary/20"
              >
                {post.cta_label} <ArrowRight className="h-2.5 w-2.5" />
              </a>
            )}
            {isStaff && seenTotal > 0 && (
              <span className="micro-label inline-flex items-center gap-1 !text-muted-foreground/70">
                <Eye className="h-3 w-3" /> Seen by {seenCount} of {seenTotal}
              </span>
            )}
            {isAdmin && (ackTotal || 0) > 0 && (
              <span className="micro-label inline-flex items-center gap-1 !text-muted-foreground/70">
                Got it {ackCount || 0} of {ackTotal}
              </span>
            )}
          </div>
        </div>

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Announcement actions"
                className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(post)}>Edit</DropdownMenuItem>
              {!archived && (
                <>
                  <DropdownMenuItem onClick={() => onTogglePin(post)}>
                    {post.is_pinned ? 'Unpin' : 'Pin to top'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPublish(post)}>
                    {isDraft ? 'Publish' : 'Unpublish'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onArchive(post)}>Archive</DropdownMenuItem>
                </>
              )}
              {archived && (
                <DropdownMenuItem onClick={() => onRestore(post)}>
                  <RotateCcw className="mr-2 h-3.5 w-3.5" /> Restore
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (confirm('Delete this announcement?')) onDelete(post.id);
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
