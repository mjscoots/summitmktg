import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Send, Bot, Loader2, Pencil, Trash2, X, Check, ChevronDown, Hash, AtSign, SmilePlus, Reply, CornerDownRight, Megaphone, Lightbulb, Sparkles, Image, Pin, PinOff, BarChart3, Crown, Plus, MessageSquarePlus, Paperclip } from 'lucide-react';
import { StickerPicker, STICKER_PREFIX, isStickerMessage, getStickerFromMessage, type Sticker as StickerType } from './StickerPicker';
import { GifPicker, GIF_PREFIX, isGifMessage, getGifUrl } from './GifPicker';
import { TierBadge } from '@/components/shared/TierBadge';
import { ChatPoll, PollCreator } from './ChatPoll';
import { ChatImageUpload, isImageMessage, isFileMessage, getImageUrl, getFileInfo, ChatImage, ChatFile } from './ChatImageUpload';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { MessageReactions } from './MessageReactions';
import { ReadReceipts } from './ReadReceipts';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { sanitizeUrl } from '@/lib/sanitizeUrl';
import { MemberProfileModal } from '@/components/team/MemberProfileModal';
import { TeamMember } from '@/lib/hierarchyUtils';

/** Render text with clickable links */
function renderWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      const safe = sanitizeUrl(part);
      if (safe === '#') return <span key={i}>{part}</span>;
      return (
        <a key={i} href={safe} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 break-all">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  is_ai: boolean;
  created_at: string;
  reply_to: string | null;
  channel: string;
  is_pinned: boolean;
}

interface ProfileInfo {
  full_name: string;
  avatar_url: string | null;
  role?: string;
  is_active_now?: boolean;
  tier_pct?: number;
  weekly_points?: number;
}

interface CommunityChatProps {
  onNewMessage?: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Hash, Megaphone, Lightbulb, Sparkles, MessageSquarePlus,
};

const DEFAULT_CHANNELS = [
  { id: 'general', label: 'General', icon: 'Hash', color: 'text-muted-foreground' },
] as const;

const QUICK_REPLY_CHIPS = ['🔥 LFG', '✅ Let\'s get it', '⛰️ Summit on top'] as const;

type ChannelId = string;

function DateSeparator({ date }: { date: Date }) {
  let label = format(date, 'MMMM d, yyyy');
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';

  return (
    <div className="flex items-center my-4 px-4">
      <div className="flex-1 h-px bg-border/50" />
      <span className="text-[11px] font-semibold text-muted-foreground px-3">{label}</span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

/** Bot message divider style */
function BotMessage({ content }: { content: string }) {
  return (
    <div className="my-3 mx-4">
      <div className="h-px bg-border/50 mb-3" />
      <p className="text-[13px] text-muted-foreground italic text-center leading-relaxed">{content}</p>
      <div className="h-px bg-border/50 mt-3" />
    </div>
  );
}

export function CommunityChat({ onNewMessage }: CommunityChatProps) {
  const { user, profile, role } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const activeChannel: ChannelId = 'general';
  const inputRef = useRef<HTMLInputElement>(null);
  const [channels] = useState<Array<{ id: string; label: string; icon: string; color: string }>>([...DEFAULT_CHANNELS]);

  const effectiveChannel = 'general';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileInfo>>({});
  const profileMapRef = useRef<Record<string, ProfileInfo>>({});
  const [showScrollDown, setShowScrollDown] = useState(false);
  const { typingUsers, handleInputChange: onTyping, stopTyping } = useTypingIndicator();
  const [unreadChannels, setUnreadChannels] = useState<Set<ChannelId>>(new Set());
  const [localAiMessages, setLocalAiMessages] = useState<ChatMessage[]>([]);
  const [showGifs, setShowGifs] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [postOfTheDayId, setPostOfTheDayId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; msgId: string | null }>({ open: false, msgId: null });
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  const isAdmin = role === 'admin' || role === 'owner';
  const isOwner = role === 'owner';

  // Load channels from DB


  useEffect(() => { profileMapRef.current = profileMap; }, [profileMap]);

  const scrollToBottom = useCallback((smooth = true) => {
    const container = containerRef.current;
    if (!container) return;

    const doScroll = () => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    };

    // Initial + retries to account for async layout/media rendering
    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 120);
    setTimeout(doScroll, 320);
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  // Fetch messages + profiles
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) { console.error('Error fetching messages:', error); return; }

      const userIds = [...new Set((data || []).filter(m => !m.is_ai).map(m => m.user_id))];
      if (userIds.length > 0) {
        const [profilesRes, rolesRes] = await Promise.all([
          supabase.from('profiles').select('user_id, full_name, avatar_url, is_active_now').in('user_id', userIds),
          supabase.from('user_roles').select('user_id, role').in('user_id', userIds),
        ]);
        const rolePriority: Record<string, number> = { rookie: 0, manager: 1, admin: 2, owner: 3 };
        const roleMap: Record<string, string> = {};
        (rolesRes.data || []).forEach(r => {
          const prev = roleMap[r.user_id];
          if (!prev || (rolePriority[r.role] ?? 0) > (rolePriority[prev] ?? 0)) {
            roleMap[r.user_id] = r.role;
          }
        });
        const map: Record<string, ProfileInfo> = {};
        (profilesRes.data || []).forEach(p => {
          map[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url, is_active_now: p.is_active_now, role: roleMap[p.user_id] };
        });
        setProfileMap(map);
      }
      setMessages(([...(data || [])].reverse()).map(m => ({ ...m, channel: m.channel || 'general', is_pinned: m.is_pinned ?? false })));
    };
    fetchMessages();
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('community-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
        const newMsg = payload.new as ChatMessage;
        if (!newMsg.channel) newMsg.channel = 'general';
        if (!newMsg.is_ai && !profileMapRef.current[newMsg.user_id]) {
          const [pRes, rRes] = await Promise.all([
            supabase.from('profiles').select('user_id, full_name, avatar_url, is_active_now').eq('user_id', newMsg.user_id).maybeSingle(),
            supabase.from('user_roles').select('role').eq('user_id', newMsg.user_id).maybeSingle(),
          ]);
          if (pRes.data) {
            setProfileMap(prev => ({ ...prev, [pRes.data!.user_id]: { full_name: pRes.data!.full_name, avatar_url: pRes.data!.avatar_url, is_active_now: pRes.data!.is_active_now, role: rRes.data?.role } }));
          }
        }
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        if (newMsg.user_id !== user?.id && newMsg.channel !== effectiveChannel) {
          setUnreadChannels(prev => new Set([...prev, newMsg.channel as ChannelId]));
        }
        if (newMsg.user_id !== user?.id) onNewMessage?.();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated, channel: updated.channel || 'general' } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, onNewMessage, effectiveChannel]);

  const allChannelMessages = messages.filter(m => m.channel === effectiveChannel);
  const channelMessages = allChannelMessages;

  useEffect(() => {
    scrollToBottom(false);
  }, [channelMessages.length, scrollToBottom]);

  // Post of the Day
  useEffect(() => {
    const fetchPostOfTheDay = async () => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabase.from('chat_reactions').select('message_id').gte('created_at', todayStart.toISOString());
      if (!data || data.length === 0) { setPostOfTheDayId(null); return; }
      const counts: Record<string, number> = {};
      data.forEach(r => { counts[r.message_id] = (counts[r.message_id] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      setPostOfTheDayId(sorted[0] && sorted[0][1] >= 3 ? sorted[0][0] : null);
    };
    fetchPostOfTheDay();
    const interval = setInterval(fetchPostOfTheDay, 120000);
    return () => clearInterval(interval);
  }, []);

  // Double-click to react with 🔥
  const handleDoubleClickReact = async (msgId: string) => {
    if (!user) return;
    const { data: existing } = await supabase.from('chat_reactions').select('id').eq('message_id', msgId).eq('user_id', user.id).eq('emoji', '🔥').maybeSingle();
    if (existing) {
      await supabase.from('chat_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('chat_reactions').insert({ message_id: msgId, user_id: user.id, emoji: '🔥' });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isSending || !user) return;
    const content = input.trim();
    setInput(''); stopTyping(); setIsSending(true);
    const currentReplyTo = replyingTo?.id || null;
    setReplyingTo(null);

    try {
      const { data: msg, error } = await supabase.from('chat_messages').insert({ user_id: user.id, content, is_ai: false, reply_to: currentReplyTo, channel: effectiveChannel }).select('id').single();
      if (error) throw error;
      if (msg) {
        (supabase.rpc as any)('award_chat_message_points', { _user_id: user.id, _content: content, _message_id: msg.id }).catch(() => {});
      }
    } catch (error) { console.error('Send error:', error); toast.error('Failed to send message'); } finally { setIsSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleEdit = async (msgId: string) => { if (!editText.trim()) return; const { error } = await supabase.from('chat_messages').update({ content: editText.trim() }).eq('id', msgId); if (error) { toast.error('Failed to edit'); return; } setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editText.trim() } : m)); setEditingId(null); setEditText(''); };
  const handleDelete = async (msgId: string) => { const { error } = await supabase.from('chat_messages').delete().eq('id', msgId); if (error) { toast.error('Failed to delete'); return; } setMessages(prev => prev.filter(m => m.id !== msgId)); };
  const handlePin = async (msgId: string, currentlyPinned: boolean) => { const { error } = await supabase.from('chat_messages').update({ is_pinned: !currentlyPinned }).eq('id', msgId); if (error) { toast.error('Failed to update pin'); return; } setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: !currentlyPinned } : m)); toast.success(currentlyPinned ? 'Unpinned' : 'Pinned'); };
  const handleSendFile = async (content: string) => { if (!user) return; const { error } = await supabase.from('chat_messages').insert({ user_id: user.id, content, reply_to: replyingTo?.id || null, channel: effectiveChannel }); if (error) { toast.error('Failed to send'); return; } setReplyingTo(null); scrollToBottom(); };
  const handleCreatePoll = async (question: string, options: string[]) => { if (!user) return; setShowPollCreator(false); const { data: msg, error } = await supabase.from('chat_messages').insert({ user_id: user.id, content: `📊 Poll: ${question}`, channel: effectiveChannel }).select('id').single(); if (error || !msg) { toast.error('Failed to create poll'); return; } await supabase.from('chat_polls').insert({ message_id: msg.id, question, options, created_by: user.id }); scrollToBottom(); };
  const handleSendGif = async (gifUrl: string) => { if (!user) return; setShowGifs(false); const { error } = await supabase.from('chat_messages').insert({ user_id: user.id, content: `${GIF_PREFIX}${gifUrl}`, reply_to: replyingTo?.id || null, channel: effectiveChannel }); if (error) { toast.error('Failed to send GIF'); return; } setReplyingTo(null); scrollToBottom(); };

  // Read receipts
  useEffect(() => {
    if (!user || channelMessages.length === 0) return;
    const otherMessages = channelMessages.filter(m => m.user_id !== user.id && !m.is_ai).slice(-5);
    if (otherMessages.length === 0) return;
    supabase.from('chat_read_receipts').upsert(otherMessages.map(m => ({ message_id: m.id, user_id: user.id })), { onConflict: 'message_id,user_id' });
  }, [channelMessages.length, user?.id, effectiveChannel]);

  const getProfile = (msg: ChatMessage): ProfileInfo => {
    if (msg.is_ai) {
      if (msg.channel === 'ai-coach') return { full_name: 'AI Coach', avatar_url: null, role: 'bot' };
      return { full_name: 'Summit', avatar_url: null, role: 'bot' };
    }
    return profileMap[msg.user_id] || { full_name: 'Team Member', avatar_url: null };
  };
  const isOwnMessage = (msg: ChatMessage) => msg.user_id === user?.id && !msg.is_ai;
  const isSameSender = (curr: ChatMessage, prev: ChatMessage | null) => {
    if (!prev || curr.reply_to || curr.is_ai !== prev.is_ai || curr.user_id !== prev.user_id) return false;
    return new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
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

  const getRoleColor = (r?: string) => { if (r === 'admin') return 'text-red-400'; if (r === 'manager') return 'text-blue-400'; return 'text-foreground/80'; };
  const getRoleBadge = (r?: string) => {
    if (r === 'bot') return null; // No badge for bot — uses divider style
    if (r === 'owner') return <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 uppercase tracking-wider">Owner</span>;
    if (r === 'admin') return <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 uppercase tracking-wider">Admin</span>;
    if (r === 'manager') return <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 uppercase tracking-wider">Manager</span>;
    return <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 uppercase tracking-wider">Rookie</span>;
  };

  const activeChannelConfig = channels.find(c => c.id === activeChannel) || channels[0];
  const canPostInChannel = true;

  return (
    <div className="h-full min-h-0 flex flex-col rounded-xl overflow-hidden border border-border/50 bg-gradient-to-b from-background via-card to-background shadow-[0_14px_42px_-24px_hsl(var(--primary)/0.45)]">
      {/* Pinned */}
      {(() => {
        const pinned = channelMessages.filter(m => m.is_pinned);
        if (pinned.length === 0) return null;
        const lastPinned = pinned[pinned.length - 1];
        const pinProfile = getProfile(lastPinned);
        return (
          <button onClick={() => document.getElementById(`msg-${lastPinned.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="flex items-center gap-2 px-4 py-1.5 border-b border-amber-500/10 bg-amber-500/5 hover:bg-amber-500/10 transition-colors flex-shrink-0 text-left">
            <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-amber-500">{pinProfile.full_name}:</span>
            <span className="text-[11px] text-muted-foreground truncate">{lastPinned.content}</span>
          </button>
        );
      })()}

      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-contain min-h-0 relative">
        {channelMessages.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-4">
              {(() => { const Icon = ICON_MAP[activeChannelConfig.icon] || Hash; return <Icon className={cn("w-7 h-7", activeChannelConfig.color)} />; })()}
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">#{activeChannelConfig.label}</h3>
            <p className="text-sm text-muted-foreground">Start the conversation.</p>
          </div>
        )}

        {channelMessages.map((msg, idx) => {
          const prev = idx > 0 ? channelMessages[idx - 1] : null;
          const grouped = isSameSender(msg, prev);
          const showDate = !prev || !isSameDay(new Date(msg.created_at), new Date(prev.created_at));
          const msgProfile = getProfile(msg);
          const own = isOwnMessage(msg);

          // Bot messages render as centered dividers
          if (msg.is_ai && msg.channel !== 'ai-coach') {
            return (
              <div key={msg.id}>
                {showDate && <DateSeparator date={new Date(msg.created_at)} />}
                <BotMessage content={msg.content} />
              </div>
            );
          }

          return (
            <div key={msg.id}>
              {showDate && <DateSeparator date={new Date(msg.created_at)} />}

              <div
                id={`msg-${msg.id}`}
                onDoubleClick={() => { if (!msg.is_ai) handleDoubleClickReact(msg.id); }}
                className={cn(
                  "group/msg relative px-4 hover:bg-muted/30 transition-colors select-none",
                  grouped ? "py-0.5" : "pt-3 pb-1",
                  msg.is_pinned && "bg-amber-500/[0.03] border-l-2 border-amber-500/30",
                  postOfTheDayId === msg.id && "post-of-the-day"
                )}
              >
                {postOfTheDayId === msg.id && (
                  <div className="flex items-center gap-1.5 mb-1.5 ml-[52px]">
                    <Crown className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/90">Post of the Day</span>
                  </div>
                )}

                {/* Hover toolbar */}
                {!msg.is_ai && (
                   <div className="absolute -top-3 right-4 hidden group-hover/msg:flex items-center gap-0.5 bg-card border border-border/60 rounded-md shadow-lg px-0.5 py-0.5 z-10">
                    <button onClick={() => { setReplyingTo(msg); inputRef.current?.focus(); }} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors" title="Reply"><Reply className="w-3.5 h-3.5" /></button>
                    {own && <button onClick={() => { setEditingId(msg.id); setEditText(msg.content); }} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>}
                    {isManager && <button onClick={() => handlePin(msg.id, msg.is_pinned)} className={cn("p-1.5 rounded transition-colors", msg.is_pinned ? "text-amber-500 hover:text-amber-400" : "text-muted-foreground hover:text-foreground hover:bg-muted/60")} title={msg.is_pinned ? "Unpin" : "Pin"}>{msg.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}</button>}
                    {(own || isManager) && <button onClick={() => setDeleteConfirm({ open: true, msgId: msg.id })} className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                )}

                <div className={cn("flex gap-3", own && "flex-row-reverse")}>
                  {/* Avatar */}
                  <div className="w-9 flex-shrink-0">
                    {!grouped ? (
                      msg.is_ai ? (
                        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      ) : (
                        <button onClick={() => handleProfileClick(msg.user_id)} className="focus:outline-none">
                          <UserAvatar avatarUrl={msgProfile.avatar_url} fullName={msgProfile.full_name} size="md" showOnline isOnline={msgProfile.is_active_now} />
                        </button>
                      )
                    ) : (
                      <span className="text-[10px] text-transparent group-hover/msg:text-muted-foreground/50 transition-colors w-9 text-right leading-[22px] tabular-nums">
                        {format(new Date(msg.created_at), 'h:mm')}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn("flex-1 min-w-0", own && "text-right")}>
                    {/* Reply context */}
                    {msg.reply_to && (() => {
                      const parentMsg = channelMessages.find(m => m.id === msg.reply_to);
                      if (!parentMsg) return null;
                      const parentProfile = getProfile(parentMsg);
                      return (
                        <div className={cn("flex items-center gap-1.5 mb-1 text-xs cursor-pointer hover:text-foreground/60 transition-colors", own && "justify-end")} onClick={() => document.getElementById(`msg-${parentMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                          <CornerDownRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                          <span className={cn("font-semibold text-[11px]", getRoleColor(parentProfile.role))}>{parentProfile.full_name}</span>
                          <span className="text-muted-foreground/50 truncate max-w-[200px]">{parentMsg.content}</span>
                        </div>
                      );
                    })()}

                    {/* Header */}
                    {!grouped && (
                      <div className={cn("flex items-center gap-2 mb-0.5", own && "justify-end")}>
                        <button onClick={() => !msg.is_ai && handleProfileClick(msg.user_id)} className={cn("text-sm font-semibold hover:underline cursor-pointer", msg.is_ai ? 'text-primary' : getRoleColor(msgProfile.role))}>
                          {msgProfile.full_name}
                        </button>
                        {getRoleBadge(msgProfile.role)}
                        {!msg.is_ai && msgProfile.tier_pct != null && msgProfile.tier_pct >= 25 && <TierBadge percentage={msgProfile.tier_pct} size="xs" />}
                        <span className="text-[10px] text-muted-foreground/60">
                          {isToday(new Date(msg.created_at)) ? `Today at ${format(new Date(msg.created_at), 'h:mm a')}` : isYesterday(new Date(msg.created_at)) ? `Yesterday at ${format(new Date(msg.created_at), 'h:mm a')}` : format(new Date(msg.created_at), 'MM/dd/yyyy h:mm a')}
                        </span>
                      </div>
                    )}

                    {/* Message body */}
                    {editingId === msg.id ? (
                      <div className="bg-muted/40 rounded-lg p-2 border border-primary/30">
                        <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(msg.id); if (e.key === 'Escape') setEditingId(null); }} className="w-full bg-transparent text-foreground text-sm focus:outline-none" autoFocus />
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-muted-foreground">esc to <button onClick={() => setEditingId(null)} className="text-primary hover:underline">cancel</button> · enter to <button onClick={() => handleEdit(msg.id)} className="text-primary hover:underline">save</button></span>
                        </div>
                      </div>
                    ) : isStickerMessage(msg.content) ? (
                      (() => { const sticker = getStickerFromMessage(msg.content); return sticker ? <img src={sticker.src} alt={sticker.label} className={cn("w-32 h-32 object-contain rounded-lg", own && "ml-auto")} /> : <p className="text-sm text-muted-foreground">[Unknown sticker]</p>; })()
                    ) : isGifMessage(msg.content) ? (
                      (() => { const gifUrl = getGifUrl(msg.content); return gifUrl ? <img src={gifUrl} alt="GIF" className={cn("max-w-[280px] rounded-lg", own && "ml-auto")} loading="lazy" /> : <p className="text-sm text-muted-foreground">[GIF unavailable]</p>; })()
                    ) : isImageMessage(msg.content) ? (
                      <ChatImage url={getImageUrl(msg.content)} />
                    ) : isFileMessage(msg.content) ? (
                      (() => { const info = getFileInfo(msg.content); return info ? <ChatFile info={info} /> : <p className="text-sm text-muted-foreground">[File unavailable]</p>; })()
                    ) : msg.content.startsWith('📊 Poll:') ? (
                      <div><p className="text-sm text-foreground/80 leading-relaxed">{renderWithLinks(msg.content)}</p><ChatPoll messageId={msg.id} profileMap={profileMap} /></div>
                    ) : (
                      <p className={cn("text-sm leading-relaxed whitespace-pre-wrap break-words", own ? "text-foreground/90" : "text-foreground/70")}>{renderWithLinks(msg.content)}</p>
                    )}
                  </div>
                </div>

                {activeChannel !== 'ai-coach' && <MessageReactions messageId={msg.id} profileMap={profileMap} messageAuthorId={msg.user_id} />}
                {activeChannel !== 'ai-coach' && idx === channelMessages.length - 1 && <ReadReceipts messageId={msg.id} profileMap={profileMap} isLastInGroup={true} />}
              </div>
            </div>
          );
        })}

        {isAiLoading && activeChannel === 'ai-coach' && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4 text-primary" /></div>
              <div>
                <div className="flex items-baseline gap-2 mb-1"><span className="text-sm font-semibold text-primary">AI Coach</span></div>
                <div className="flex gap-1 py-1">
                   <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {typingUsers.length > 0 && (
          <div className="px-4 py-1.5 flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-muted-foreground">
              {typingUsers.length === 1 ? `${typingUsers[0].fullName} is typing...` : typingUsers.length === 2 ? `${typingUsers[0].fullName} and ${typingUsers[1].fullName} are typing...` : `${typingUsers[0].fullName} and ${typingUsers.length - 1} others are typing...`}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} className="h-6" />
      </div>

      {/* Scroll FAB */}
      {showScrollDown && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <button onClick={() => scrollToBottom()} className="bg-card border border-border/60 shadow-lg rounded-full p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modern Input Bar */}
      {canPostInChannel ? (
        <div className="px-4 pb-3 pt-2 flex-shrink-0 relative space-y-2 border-t border-border/30 bg-background/80 backdrop-blur-md">
          {activeChannel !== 'ai-coach' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {QUICK_REPLY_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setInput(chip);
                    onTyping();
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-chat-display text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/10 transition-colors whitespace-nowrap"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {showGifs && <GifPicker onSelect={handleSendGif} onClose={() => setShowGifs(false)} />}
          {showPollCreator && <PollCreator onSubmit={handleCreatePoll} onClose={() => setShowPollCreator(false)} />}

          {replyingTo && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-1 bg-muted/30 rounded-t-lg border border-b-0 border-border/40 text-xs">
              <Reply className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-muted-foreground">Replying to</span>
              <span className="font-semibold text-foreground/60 truncate">{getProfile(replyingTo).full_name}</span>
              <button onClick={() => setReplyingTo(null)} className="p-0.5 text-muted-foreground/50 hover:text-foreground rounded transition-colors ml-auto flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          <div className={cn(
            "flex items-center gap-1 bg-card/80 border border-border/60 focus-within:border-primary/50 focus-within:shadow-[0_0_0_1px_hsl(var(--primary)/0.25)] transition-all",
            replyingTo ? "rounded-b-lg rounded-t-none" : "rounded-xl"
          )}>
            {/* Left icons */}
            {activeChannel !== 'ai-coach' && (
              <>
                <ChatImageUpload onSend={handleSendFile} />
                <button
                  onClick={() => { setShowGifs(!showGifs); setShowPollCreator(false); }}
                  className={cn("p-2 rounded-lg transition-all flex-shrink-0", showGifs ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                  title="GIFs"
                >
                  <Image className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setShowPollCreator(!showPollCreator); setShowGifs(false); }}
                  className={cn("p-2 rounded-lg transition-all flex-shrink-0", showPollCreator ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                  title="Poll"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); onTyping(); }}
              onKeyDown={handleKeyDown}
              onPaste={async (e) => {
                const items = e.clipboardData?.items;
                if (!items || !user) return;
                for (const item of Array.from(items)) {
                  if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (!file) return;
                    try {
                      const { uploadChatFile } = await import('@/components/dashboard/ChatImageUpload');
                      await uploadChatFile(file, user.id, handleSendFile);
                      toast.success('Image uploaded');
                    } catch {
                      toast.error('Failed to upload pasted image');
                    }
                    return;
                  }
                }
              }}
              placeholder={activeChannel === 'ai-coach' ? 'Ask Summit Coach anything...' : 'Drop your update, win the day…'}
              className="flex-1 bg-transparent text-foreground font-chat-input text-sm px-3 py-2.5 focus:outline-none placeholder:text-muted-foreground"
              disabled={isSending || isAiLoading}
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending || isAiLoading}
              className={cn("p-2 mr-1 rounded-lg transition-all flex-shrink-0", input.trim() ? "text-primary hover:bg-primary/10 hover:scale-105 active:scale-95" : "text-muted-foreground/40")}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 flex-shrink-0 border-t border-border/30">
          <p className="text-xs text-muted-foreground/50 text-center">Only managers can post in Announcements</p>
        </div>
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
