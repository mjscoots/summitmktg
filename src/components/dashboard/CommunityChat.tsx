import { useState, useRef, useEffect, useCallback, useMemo, DragEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withArchivedSuffix } from '@/lib/archived';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ChevronDown, Upload } from 'lucide-react';
import { uploadChatFile } from '@/components/dashboard/ChatImageUpload';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { MemberProfileModal } from '@/components/team/MemberProfileModal';
import { TeamMember } from '@/lib/hierarchyUtils';
import { GIF_PREFIX } from './GifPicker';
import { STICKER_PREFIX } from './StickerPicker';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageContextMenu } from '@/components/chat/MessageContextMenu';
import { SummitLoader } from '@/components/shared/SummitLoader';
import { useChatChannels } from '@/hooks/useChatChannels';
import { EventCard } from '@/components/chat/EventCard';
import { AnnouncementCard } from '@/components/chat/AnnouncementCard';
import { IncentiveCard } from '@/components/chat/IncentiveCard';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  is_ai: boolean;
  created_at: string;
  reply_to: string | null;
  channel: string;
  is_pinned: boolean;
  /** Card kind. 'text' for ordinary messages. */
  kind?: string;
  /** Source record for card kinds. */
  ref_id?: string | null;
  meta?: Record<string, unknown> | null;
  /** Present on rows read through get_channel_messages. */
  reply_sender?: string | null;
  reply_excerpt?: string | null;
}


interface ProfileInfo {
  full_name: string;
  avatar_url: string | null;
  role?: string;
  is_active_now?: boolean;
}

interface CommunityChatProps {
  onNewMessage?: () => void;
  /** Conversation to open. When omitted the general channel is used. */
  channelSlug?: string;
  /** Back to the conversation list. */
  onBack?: () => void;
  /** Room name shown in the header, e.g. the caller's own team name. */
  roomLabel?: string;
  /** Hide the back control when this room is the landing surface. */
  hideBack?: boolean;
  /** Header controls, e.g. people search. */
  headerRight?: React.ReactNode;
  /** Rendered between the header and the thread, e.g. room strip. */
  topSlot?: React.ReactNode;
  /** Placeholder for the composer input. */
  composerPlaceholder?: string;
}


function DateSeparator({ date }: { date: Date }) {
  let label = format(date, 'MMMM d, yyyy');
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';
  return (
    <div className="flex items-center justify-center my-4">
      <span className="text-[10px] font-medium text-muted-foreground/30 bg-card/50 backdrop-blur-sm px-3 py-0.5 rounded-full">{label}</span>
    </div>
  );
}

function SystemMessage({ content }: { content: string }) {
  return (
    <div className="flex items-center justify-center my-3 px-6">
      <span className="text-[11px] text-muted-foreground/30 text-center leading-relaxed italic">{content}</span>
    </div>
  );
}

const WIN_PREFIX = /^\[\[WIN\|[0-9a-f-]+\]\]/i;
const isWinPost = (content: string) => WIN_PREFIX.test(content);
const stripWinPrefix = (content: string) => content.replace(WIN_PREFIX, '');

const AWARDS_PREFIX = /^\[\[AWARDS\|[0-9-]+\]\]/i;
const isAwardsPost = (content: string) => AWARDS_PREFIX.test(content);

function WinSystemMessage({ content }: { content: string }) {
  return (
    <div className="flex items-center justify-center my-3 px-4">
      <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.07] px-4 py-1.5 text-center text-[12px] font-bold text-amber-200/90">
        {stripWinPrefix(content)}
      </span>
    </div>
  );
}

function AwardsSystemMessage({ content }: { content: string }) {
  const body = content.replace(AWARDS_PREFIX, '');
  const [header, ...lines] = body.split('\n').filter(Boolean);
  return (
    <div className="my-3 px-4">
      <div className="mx-auto max-w-sm rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200/80">Weekly awards</p>
        <p className="mt-0.5 text-[12px] text-amber-100/70">{header}</p>
        <ul className="mt-2 space-y-1">
          {lines.map((l) => (
            <li key={l} className="text-[12px] font-semibold text-amber-200/90">{l}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}


export function CommunityChat({ onNewMessage, channelSlug, onBack, roomLabel, hideBack, headerRight, topSlot, composerPlaceholder }: CommunityChatProps) {
  const { user, profile, role } = useAuth();
  const { activeVertical } = useWorkspace();
  const [activeChannel, setActiveChannel] = useState(channelSlug || 'general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileInfo>>({});
  const profileMapRef = useRef<Record<string, ProfileInfo>>({});
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; msgId: string | null }>({ open: false, msgId: null });
  const [contextMenu, setContextMenu] = useState<{ position: { x: number; y: number }; msgId: string } | null>(null);
  // Centralized reactions state: { messageId -> { emoji -> { count, mine } } }
  const [reactionsMap, setReactionsMap] = useState<Record<string, Record<string, { count: number; mine: boolean }>>>({});
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prependingRef = useRef(false);

  const { typingUsers, handleInputChange: onTyping, stopTyping } = useTypingIndicator(`chat-typing-${activeChannel}`);

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  const { channels, markChannelRead } = useChatChannels();
  const markReadRef = useRef(markChannelRead);
  useEffect(() => { markReadRef.current = markChannelRead; }, [markChannelRead]);

  useEffect(() => { profileMapRef.current = profileMap; }, [profileMap]);
  useEffect(() => { if (channelSlug) setActiveChannel(channelSlug); }, [channelSlug]);

  // Mark the channel being viewed as read — once per channel, per user
  useEffect(() => {
    if (!user) return;
    void markReadRef.current(activeChannel);
  }, [activeChannel, user?.id]);

  const scrollToBottom = useCallback((smooth = true) => {
    const container = containerRef.current;
    if (!container) return;
    const doScroll = () => container.scrollTo({ top: container.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 100);
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 120);
  }, []);

  /** Rows from get_channel_messages -> local message + profile + reaction state. */
  const absorbPage = useCallback((rows: any[]) => {
    const profiles: Record<string, ProfileInfo> = {};
    const reactions: Record<string, Record<string, { count: number; mine: boolean }>> = {};
    const parsed: ChatMessage[] = rows.map((r) => {
      if (!r.is_ai && r.user_id) {
        profiles[r.user_id] = {
          full_name: withArchivedSuffix(r.sender_name || 'Team Member', r.sender_archived),
          avatar_url: r.sender_avatar ?? null,
          is_active_now: r.sender_active ?? false,
          role: r.sender_role ?? undefined,
        };
      }
      const list = (r.reactions || []) as { emoji: string; count: number; mine: boolean }[];
      if (list.length) {
        reactions[r.id] = Object.fromEntries(list.map((x) => [x.emoji, { count: x.count, mine: !!x.mine }]));
      }
      return {
        id: r.id,
        user_id: r.user_id,
        content: r.content,
        is_ai: !!r.is_ai,
        created_at: r.created_at,
        reply_to: r.reply_to ?? null,
        channel: r.channel || 'general',
        is_pinned: !!r.is_pinned,
        kind: r.kind || 'text',
        ref_id: r.ref_id ?? null,
        meta: r.meta ?? null,
        reply_sender: r.reply_sender ?? null,
        reply_excerpt: r.reply_excerpt ?? null,
      };

    });
    setProfileMap((prev) => ({ ...prev, ...profiles }));
    setReactionsMap((prev) => ({ ...prev, ...reactions }));
    return parsed;
  }, []);

  // First page for the active channel
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMessages([]);
      const { data, error } = await (supabase as any).rpc('get_channel_messages', {
        _channel: activeChannel,
        _limit: 50,
      });
      if (cancelled) return;
      if (error || !data || data.error) { setLoading(false); return; }
      setMessages(absorbPage(data.messages || []));
      setHasMore(!!data.has_more);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeChannel, absorbPage]);

  const loadOlder = useCallback(async () => {
    const container = containerRef.current;
    const oldest = messages[0];
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const prevHeight = container?.scrollHeight ?? 0;
    const { data, error } = await (supabase as any).rpc('get_channel_messages', {
      _channel: activeChannel,
      _before: oldest.created_at,
      _limit: 50,
    });
    if (!error && data && !data.error) {
      const older = absorbPage(data.messages || []);
      prependingRef.current = true;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !seen.has(m.id)), ...prev];
      });
      setHasMore(!!data.has_more);
      requestAnimationFrame(() => {
        const c = containerRef.current;
        if (c) c.scrollTop = c.scrollHeight - prevHeight;
      });
    }
    setLoadingOlder(false);
  }, [messages, activeChannel, loadingOlder, absorbPage]);

  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // One subscription per open channel: messages (filtered) + reactions
  useEffect(() => {
    if (!activeChannel) return;
    const channel = supabase
      .channel(`chat-${activeChannel}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel=eq.${activeChannel}` }, async (payload) => {
        const row = payload.new as any;
        const newMsg: ChatMessage = { ...row, channel: row.channel || 'general', is_pinned: row.is_pinned ?? false };
        if (!newMsg.is_ai && !profileMapRef.current[newMsg.user_id]) {
          const { data: p } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, is_active_now, archived')
            .eq('user_id', newMsg.user_id)
            .maybeSingle();
          if (p) {
            setProfileMap((prev) => ({
              ...prev,
              [p.user_id]: {
                full_name: withArchivedSuffix(p.full_name, (p as any).archived),
                avatar_url: p.avatar_url,
                is_active_now: p.is_active_now,
              },
            }));
          }
        }
        setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
        if (newMsg.user_id !== user?.id) onNewMessage?.();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `channel=eq.${activeChannel}` }, (payload) => {
        const updated = payload.new as any;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated, channel: updated.channel || 'general' } : m)));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reactions' }, (payload) => {
        const row = payload.new as any;
        const old = payload.old as any;
        const target = row?.message_id || old?.message_id;
        // Only reactions on messages loaded in this channel, and never our own
        // (those are already applied optimistically).
        if (!target || !messagesRef.current.some((m) => m.id === target)) return;
        if ((row?.user_id || old?.user_id) === user?.id) return;
        if (payload.eventType === 'INSERT' && row) {
          setReactionsMap((prev) => {
            const msg = { ...(prev[row.message_id] || {}) };
            const cur = msg[row.emoji];
            msg[row.emoji] = { count: (cur?.count || 0) + 1, mine: cur?.mine || false };
            return { ...prev, [row.message_id]: msg };
          });
        } else if (payload.eventType === 'DELETE' && old) {
          setReactionsMap((prev) => {
            const msg = { ...(prev[old.message_id] || {}) };
            const cur = msg[old.emoji];
            if (!cur) return prev;
            if (cur.count <= 1) delete msg[old.emoji];
            else msg[old.emoji] = { count: cur.count - 1, mine: cur.mine };
            return { ...prev, [old.message_id]: msg };
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChannel, user?.id, onNewMessage]);

  const channelMessages = messages.filter(m => (m.channel || 'general') === activeChannel);
  const messageById = useMemo(() => {
    const map: Record<string, ChatMessage> = {};
    channelMessages.forEach((m) => { map[m.id] = m; });
    return map;
  }, [channelMessages]);

  // Active, non-archived members the composer can @mention
  const [mentionables, setMentionables] = useState<{ user_id: string; full_name: string }[]>([]);
  useEffect(() => {
    (async () => {
      // Only members of the active workspace can be mentioned into its channels.
      const { data } = await (supabase as any).rpc('get_workspace_mentionables');
      setMentionables(
        ((data || []) as { user_id: string; full_name: string }[])
          .filter(p => p.full_name && p.user_id && p.user_id !== user?.id)
          .map(p => ({ user_id: p.user_id, full_name: p.full_name }))
      );
    })();
  }, [user?.id, activeVertical]);

  useEffect(() => {
    if (loading) return;
    if (prependingRef.current) { prependingRef.current = false; return; }
    scrollToBottom(false);
  }, [channelMessages.length, scrollToBottom, loading, activeChannel]);

  const isSameSender = (curr: ChatMessage, prev: ChatMessage | null) => {
    if (!prev || curr.reply_to || curr.is_ai !== prev.is_ai || curr.user_id !== prev.user_id) return false;
    return new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
  };

  const shouldShowTime = (curr: ChatMessage, prev: ChatMessage | null) => {
    if (!prev) return true;
    return new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime() > 10 * 60 * 1000;
  };

  const getProfile = (msg: ChatMessage): ProfileInfo => {
    if (msg.is_ai) return { full_name: 'Summit AI', avatar_url: null, role: 'bot' };
    return profileMap[msg.user_id] || { full_name: 'Team Member', avatar_url: null };
  };

  const getReactionsForMessage = useCallback((msgId: string) => {
    const msgReactions = reactionsMap[msgId];
    if (!msgReactions) return [];
    return Object.entries(msgReactions).map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }));
  }, [reactionsMap]);

  const handleSend = async () => {
    if (!input.trim() || isSending || !user) return;
    const content = input.trim();
    setInput(''); stopTyping(); setIsSending(true);
    const currentReplyTo = replyingTo?.id || null;
    setReplyingTo(null);

    try {
      // Points and mention notifications are handled by an insert trigger.
      const { error } = await supabase.from('chat_messages').insert({
        user_id: user.id, content, is_ai: false, reply_to: currentReplyTo, channel: activeChannel
      });
      if (error) throw error;
    } catch (error) { console.error('Send error:', error); toast.error('Failed to send'); } finally { setIsSending(false); }
  };

  const handleEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    const { error } = await supabase.from('chat_messages').update({ content: editText.trim() }).eq('id', msgId);
    if (error) { toast.error('Failed to edit'); return; }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editText.trim() } : m));
    setEditingId(null); setEditText('');
  };

  const handleDelete = async (msgId: string) => {
    const { error } = await supabase.from('chat_messages').delete().eq('id', msgId);
    if (error) { toast.error('Failed to delete'); return; }
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const handlePin = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const { error } = await supabase.from('chat_messages').update({ is_pinned: !msg.is_pinned }).eq('id', msgId);
    if (error) { toast.error('Failed to pin'); return; }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: !m.is_pinned } : m));
    toast.success(msg.is_pinned ? 'Unpinned' : 'Pinned');
  };

  const doubleTapGuard = useRef(false);
  const handleDoubleTapReact = async (msgId: string) => {
    handleToggleReaction(msgId, '⛰️');
  };

  const toggleGuard = useRef(false);
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!user || toggleGuard.current) return;
    toggleGuard.current = true;

    const msgReactions = reactionsMap[msgId] || {};
    const hasReacted = !!msgReactions[emoji]?.mine;

    const apply = (add: boolean) => setReactionsMap(prev => {
      const current = { ...(prev[msgId] || {}) };
      const cur = current[emoji];
      if (add) {
        current[emoji] = { count: (cur?.count || 0) + 1, mine: true };
      } else if (cur) {
        if (cur.count <= 1) delete current[emoji];
        else current[emoji] = { count: cur.count - 1, mine: false };
      }
      return { ...prev, [msgId]: current };
    });

    // Optimistic update
    apply(!hasReacted);

    try {
      if (hasReacted) {
        const { data: existing } = await supabase.from('chat_reactions').select('id').eq('message_id', msgId).eq('user_id', user.id).eq('emoji', emoji).maybeSingle();
        if (existing) await supabase.from('chat_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('chat_reactions').insert({ message_id: msgId, user_id: user.id, emoji });
      }
    } catch {
      // Rollback on error
      apply(hasReacted);
    } finally {
      toggleGuard.current = false;
    }
  };

  const handleReplyFromHover = (msgId: string) => {
    const msg = channelMessages.find(m => m.id === msgId);
    if (msg) setReplyingTo(msg);
  };

  const handleSendFile = async (content: string) => {
    if (!user) return;
    const { error } = await supabase.from('chat_messages').insert({ user_id: user.id, content, reply_to: replyingTo?.id || null, channel: activeChannel });
    if (error) { toast.error('Failed to send'); return; }
    setReplyingTo(null); scrollToBottom();
  };

  const handleSendVoice = async (content: string) => {
    if (!user) return;
    const { error } = await supabase.from('chat_messages').insert({ user_id: user.id, content, reply_to: replyingTo?.id || null, channel: activeChannel });
    if (error) { toast.error('Failed to send voice note'); return; }
    setReplyingTo(null);
  };

  const handleSendGif = async (gifUrl: string) => {
    if (!user) return;
    await supabase.from('chat_messages').insert({ user_id: user.id, content: `${GIF_PREFIX}${gifUrl}`, reply_to: replyingTo?.id || null, channel: activeChannel });
    setReplyingTo(null); scrollToBottom();
  };

  const handleSendSticker = async (sticker: any) => {
    if (!user) return;
    await supabase.from('chat_messages').insert({ user_id: user.id, content: `${STICKER_PREFIX}${sticker.id}`, reply_to: replyingTo?.id || null, channel: activeChannel });
    setReplyingTo(null); scrollToBottom();
  };

  const handleCreatePoll = async (question: string, options: string[]) => {
    if (!user) return;
    const { data: msg, error } = await supabase.from('chat_messages').insert({ user_id: user.id, content: `📊 Poll: ${question}`, channel: activeChannel }).select('id').single();
    if (error || !msg) { toast.error('Failed to create poll'); return; }
    await supabase.from('chat_polls').insert({ message_id: msg.id, question, options, created_by: user.id });
    scrollToBottom();
  };

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent, msgId: string) => {
    let x: number, y: number;
    if ('touches' in e) {
      const touch = e.changedTouches?.[0] || e.touches?.[0];
      if (!touch) return;
      x = touch.clientX; y = touch.clientY;
    } else {
      x = e.clientX; y = e.clientY;
    }
    setContextMenu({ position: { x, y }, msgId });
  };

  const handleProfileClick = async (userId: string) => {
    if (!userId) return;
    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('id, user_id, full_name, email, phone, status, experience, direct_manager').eq('user_id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
    ]);
    if (profileRes.data) {
      const p = profileRes.data;
      setSelectedMember({ id: p.id, user_id: p.user_id, full_name: p.full_name, email: p.email, phone: p.phone, status: p.status, experience: p.experience, direct_manager: p.direct_manager, role: (roleRes.data?.role as 'rookie' | 'manager' | 'admin') || 'rookie' });
    }
  };

  const contextMsg = contextMenu ? messages.find(m => m.id === contextMenu.msgId) : null;
  const pinnedCount = channelMessages.filter(m => m.is_pinned).length;
  /** Latest pinned card surfaces in a collapsible bar so nobody has to scroll for it. */
  const pinnedCard = [...channelMessages]
    .reverse()
    .find(m => m.is_pinned || ['event', 'announcement', 'incentive'].includes(m.kind || '')) || null;


  return (
    <div
      className="h-full min-h-0 flex flex-col overflow-hidden relative"
      style={{ height: '100%', maxHeight: '100%' }}
      onDragEnter={(e: DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; setIsDragging(true); }}
      onDragOver={(e: DragEvent) => { e.preventDefault(); e.stopPropagation(); }}
      onDragLeave={(e: DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); }}
      onDrop={async (e: DragEvent) => {
        e.preventDefault(); e.stopPropagation(); dragCounter.current = 0; setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (!files.length || !user) return;
        for (const file of files) {
          try {
            await uploadChatFile(file, user.id, handleSendFile);
            toast.success(`Uploaded ${file.name}`);
          } catch { toast.error(`Failed to upload ${file.name}`); }
        }
      }}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary/40 rounded-xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="w-10 h-10" />
            <p className="text-sm font-semibold">Drop files to share</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="relative z-[1]">
        <ChatHeader
          channelName={roomLabel || channels.find(c => c.slug === activeChannel)?.label || 'Chat'}
          onBack={onBack}
          hideBack={hideBack}
          rightSlot={headerRight}
          pinnedCount={pinnedCount}
          onPinnedClick={() => {
            const pinned = channelMessages.filter(m => m.is_pinned);
            if (pinned.length) document.getElementById(`msg-${pinned[pinned.length - 1].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
        {topSlot}
        {pinnedCard && (
          <PinnedBar
            item={{
              id: pinnedCard.id,
              kind: pinnedCard.kind || 'text',
              content: pinnedCard.content,
              ref_id: pinnedCard.ref_id ?? null,
              meta: (pinnedCard.meta as Record<string, unknown>) || null,
            }}
          />
        )}
      </div>


      {/* Messages thread */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-contain min-h-0 relative z-[1]">
        {loading && (
          <SummitLoader label="Loading messages..." className="py-20" />
        )}

        {!loading && channelMessages.length === 0 && (
          <div className="text-center py-20 px-4">
            <p className="text-lg font-semibold text-foreground/20">No messages yet</p>
            <p className="text-sm text-muted-foreground/20 mt-1">Start the conversation</p>
          </div>
        )}

        {!loading && hasMore && (
          <div className="flex justify-center py-3">
            <button
              onClick={loadOlder}
              disabled={loadingOlder}
              className="min-h-[44px] rounded-full border border-border/60 bg-card px-4 text-[12px] text-muted-foreground transition-colors hover:border-primary/40 disabled:opacity-50"
            >
              {loadingOlder ? 'Loading' : 'Load older'}
            </button>
          </div>
        )}



        {!loading && channelMessages.map((msg, idx) => {
          const prev = idx > 0 ? channelMessages[idx - 1] : null;
          const next = idx < channelMessages.length - 1 ? channelMessages[idx + 1] : null;
          const showDate = !prev || !isSameDay(new Date(msg.created_at), new Date(prev.created_at));
          const grouped = isSameSender(msg, prev);
          const isLastInGroup = !next || !isSameSender(next, msg);
          const isFirstInGroup = !grouped;
          const showTime = shouldShowTime(msg, prev);
          const own = msg.user_id === user?.id && !msg.is_ai;

          if (msg.kind === 'event' || msg.kind === 'announcement' || msg.kind === 'incentive') {
            const meta = (msg.meta || {}) as Record<string, any>;
            return (
              <div key={msg.id}>
                {showDate && <DateSeparator date={new Date(msg.created_at)} />}
                {msg.kind === 'event' && <EventCard eventId={msg.ref_id ?? null} meta={meta} title={msg.content} />}
                {msg.kind === 'announcement' && (
                  <AnnouncementCard postId={msg.ref_id ?? null} meta={meta} title={msg.content} />
                )}
                {msg.kind === 'incentive' && (
                  <IncentiveCard incentiveId={msg.ref_id ?? null} meta={meta} title={msg.content} />
                )}
              </div>
            );
          }

          if (msg.is_ai && msg.channel !== 'ai-coach') {
            return (
              <div key={msg.id}>
                {showDate && <DateSeparator date={new Date(msg.created_at)} />}
                {msg.kind === 'award' || isAwardsPost(msg.content)
                  ? <AwardsSystemMessage content={msg.content} />
                  : msg.kind === 'win' || isWinPost(msg.content)
                    ? <WinSystemMessage content={msg.content} />
                    : <SystemMessage content={msg.content} />}

              </div>
            );
          }


          return (
            <div key={msg.id}>
              {showDate && <DateSeparator date={new Date(msg.created_at)} />}
              {showTime && !showDate && isFirstInGroup && (
                <div className="flex justify-center my-2">
                  <span className="text-[10px] text-muted-foreground/25">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <ChatBubble
                message={msg}
                isOwn={own}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                showTimestamp={isLastInGroup && !showTime}
                profile={getProfile(msg)}
                profileMap={profileMap}
                parentMessage={msg.reply_to ? (messageById[msg.reply_to] ?? (msg.reply_excerpt ? { id: msg.reply_to, content: msg.reply_excerpt } : null)) : null}
                onProfileClick={handleProfileClick}
                onContextMenu={handleContextMenu}
                onDoubleTap={handleDoubleTapReact}
                onToggleReaction={handleToggleReaction}
                onReply={handleReplyFromHover}
                isEditing={editingId === msg.id}
                editText={editText}
                onEditChange={setEditText}
                onEditSave={() => handleEdit(msg.id)}
                onEditCancel={() => { setEditingId(null); setEditText(''); }}
                reactions={getReactionsForMessage(msg.id)}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-3" />
      </div>

      {/* Scroll to bottom */}
      {showScrollDown && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
          <button onClick={() => scrollToBottom()} className="bg-card/80 backdrop-blur-xl border border-border/20 shadow-xl rounded-full p-2 text-muted-foreground/40 hover:text-foreground transition-all hover:shadow-2xl">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="relative z-[1]">
        <ChatComposer
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          onSendFile={handleSendFile}
          onSendGif={handleSendGif}
          onSendSticker={handleSendSticker}
          onCreatePoll={handleCreatePoll}
          isSending={isSending}
          replyingTo={replyingTo ? { full_name: getProfile(replyingTo).full_name, content: replyingTo.content } : null}
          onCancelReply={() => setReplyingTo(null)}
          onTyping={onTyping}
          typingUsers={typingUsers}
          onSendVoice={handleSendVoice}
          mentionables={mentionables}
        />
      </div>

      {/* Context menu */}
      {contextMenu && contextMsg && (
        <MessageContextMenu
          messageId={contextMsg.id}
          isOwn={contextMsg.user_id === user?.id}
          isManager={isManager}
          isPinned={contextMsg.is_pinned}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onReply={() => setReplyingTo(contextMsg)}
          onEdit={() => { setEditingId(contextMsg.id); setEditText(contextMsg.content); }}
          onDelete={() => setDeleteConfirm({ open: true, msgId: contextMsg.id })}
          onPin={() => handlePin(contextMsg.id)}
          messageContent={contextMsg.content}
        />
      )}

      <MemberProfileModal open={selectedMember !== null} onClose={() => setSelectedMember(null)} member={selectedMember} roster={[]} />

      <AlertDialog open={deleteConfirm.open} onOpenChange={open => !open && setDeleteConfirm({ open: false, msgId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteConfirm.msgId) handleDelete(deleteConfirm.msgId); setDeleteConfirm({ open: false, msgId: null }); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
