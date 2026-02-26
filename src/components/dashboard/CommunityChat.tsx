import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Send, Bot, Loader2, Pencil, Trash2, X, Check, ChevronDown, Hash, AtSign, SmilePlus, Reply, CornerDownRight, Megaphone, Lightbulb, Sparkles, Sticker, Image, Pin, PinOff, BarChart3, Crown, Plus, MessageSquarePlus } from 'lucide-react';
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
  { id: 'general', label: 'Feed', icon: 'Hash', color: 'text-muted-foreground' },
  { id: 'announcements', label: 'Announcements', icon: 'Megaphone', color: 'text-amber-500' },
  { id: 'feedback', label: 'Ideas', icon: 'Lightbulb', color: 'text-emerald-500' },
  { id: 'ai-coach', label: 'AI Coach', icon: 'Sparkles', color: 'text-primary' },
] as const;

type ChannelId = string;
type RoomType = 'rookie' | 'vet';

function DateSeparator({ date }: { date: Date }) {
  let label = format(date, 'MMMM d, yyyy');
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';

  return (
    <div className="flex items-center my-4 px-4">
      <div className="flex-1 h-px bg-border/60" />
      <span className="text-[11px] font-semibold text-muted-foreground px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/60" />
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
  const [activeChannel, setActiveChannel] = useState<ChannelId>('general');
  const [activeRoom, setActiveRoom] = useState<RoomType>('rookie');
  const inputRef = useRef<HTMLInputElement>(null);
  const [channels, setChannels] = useState<Array<{ id: string; label: string; icon: string; color: string }>>([...DEFAULT_CHANNELS]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Effective channel combines tab + room (ai-coach has no room split)
  const effectiveChannel = activeChannel === 'ai-coach' ? 'ai-coach' : (activeRoom === 'vet' ? `${activeChannel}:vet` : activeChannel);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileInfo>>({});
  const profileMapRef = useRef<Record<string, ProfileInfo>>({});
  const [showScrollDown, setShowScrollDown] = useState(false);
  const { typingUsers, handleInputChange: onTyping, stopTyping } = useTypingIndicator();
  const [unreadChannels, setUnreadChannels] = useState<Set<ChannelId>>(new Set());
  const [localAiMessages, setLocalAiMessages] = useState<ChatMessage[]>([]);
  const [showStickers, setShowStickers] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [postOfTheDayId, setPostOfTheDayId] = useState<string | null>(null);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; msgId: string | null }>({ open: false, msgId: null });
  const isManager = role === 'manager' || role === 'admin';
  const isAdmin = role === 'admin';

  // Load channels from DB
  useEffect(() => {
    const fetchChannels = async () => {
      const { data } = await supabase
        .from('chat_channels')
        .select('slug, label, icon, color, display_order')
        .eq('is_active', true)
        .order('display_order');
      if (data && data.length > 0) {
        setChannels(data.map(ch => ({ id: ch.slug, label: ch.label, icon: ch.icon, color: ch.color })));
      }
    };
    fetchChannels();
  }, []);

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || creatingChannel) return;
    setCreatingChannel(true);
    const slug = newChannelName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { error } = await supabase.from('chat_channels').insert({
      slug,
      label: newChannelName.trim(),
      icon: 'Hash',
      color: 'text-muted-foreground',
      created_by: user?.id,
      display_order: channels.length + 1,
    });
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Channel already exists' : 'Failed to create channel');
    } else {
      setChannels(prev => [...prev, { id: slug, label: newChannelName.trim(), icon: 'Hash', color: 'text-muted-foreground' }]);
      setActiveChannel(slug);
      setNewChannelName('');
      setShowCreateChannel(false);
      toast.success('Channel created!');
    }
    setCreatingChannel(false);
  };

  // Keep ref in sync for use in realtime callback
  useEffect(() => { profileMapRef.current = profileMap; }, [profileMap]);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
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
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const userIds = [...new Set((data || []).filter(m => !m.is_ai).map(m => m.user_id))];
      if (userIds.length > 0) {
        const [profilesRes, rolesRes] = await Promise.all([
          supabase.from('profiles').select('user_id, full_name, avatar_url, is_active_now').in('user_id', userIds),
          supabase.from('user_roles').select('user_id, role').in('user_id', userIds),
        ]);

        const roleMap: Record<string, string> = {};
        (rolesRes.data || []).forEach(r => { roleMap[r.user_id] = r.role; });

        const map: Record<string, ProfileInfo> = {};
        (profilesRes.data || []).forEach(p => {
          map[p.user_id] = {
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            is_active_now: p.is_active_now,
            role: roleMap[p.user_id],
          };
        });
        setProfileMap(map);
      }

      setMessages((data || []).map(m => ({ ...m, channel: m.channel || 'general', is_pinned: m.is_pinned ?? false })));

      // Show local welcome banner on first chat visit (no DB message)
      if (user) {
        const userMessages = (data || []).filter(m => m.user_id === user.id);
        const hasAnyActivity = userMessages.length > 0;
        if (!hasAnyActivity) {
          const alreadyWelcomed = localStorage.getItem(`chat_welcomed_${user.id}`);
          if (!alreadyWelcomed) {
            localStorage.setItem(`chat_welcomed_${user.id}`, 'true');
            setShowWelcomeBanner(true);
          }
        }
      }
    };

    fetchMessages();
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('community-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (!newMsg.channel) newMsg.channel = 'general';

          if (!newMsg.is_ai && !profileMapRef.current[newMsg.user_id]) {
            const [pRes, rRes] = await Promise.all([
              supabase.from('profiles').select('user_id, full_name, avatar_url, is_active_now').eq('user_id', newMsg.user_id).maybeSingle(),
              supabase.from('user_roles').select('role').eq('user_id', newMsg.user_id).maybeSingle(),
            ]);
            if (pRes.data) {
              setProfileMap(prev => ({
                ...prev,
                [pRes.data!.user_id]: {
                  full_name: pRes.data!.full_name,
                  avatar_url: pRes.data!.avatar_url,
                  is_active_now: pRes.data!.is_active_now,
                  role: rRes.data?.role,
                },
              }));
            }
          }

          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Mark channel as unread if not active
          if (newMsg.user_id !== user?.id && newMsg.channel !== effectiveChannel) {
            setUnreadChannels(prev => new Set([...prev, newMsg.channel as ChannelId]));
          }

          if (newMsg.user_id !== user?.id) {
            onNewMessage?.();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated, channel: updated.channel || 'general' } : m));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, onNewMessage, effectiveChannel]);

  // Scroll on channel change or new messages in active channel
  const allChannelMessages = activeChannel === 'ai-coach' 
    ? localAiMessages 
    : messages.filter(m => m.channel === effectiveChannel);
  
  const channelMessages = allChannelMessages;
  useEffect(() => {
    scrollToBottom(false);
  }, [channelMessages.length, activeChannel, activeRoom, scrollToBottom]);

  // Post of the Day: find today's most-reacted message
  useEffect(() => {
    const fetchPostOfTheDay = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('chat_reactions')
        .select('message_id')
        .gte('created_at', todayStart.toISOString());

      if (!data || data.length === 0) {
        setPostOfTheDayId(null);
        return;
      }

      // Count reactions per message
      const counts: Record<string, number> = {};
      data.forEach(r => {
        counts[r.message_id] = (counts[r.message_id] || 0) + 1;
      });

      // Find message with most reactions (minimum 3 to qualify)
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted[0] && sorted[0][1] >= 3) {
        setPostOfTheDayId(sorted[0][0]);
      } else {
        setPostOfTheDayId(null);
      }
    };

    fetchPostOfTheDay();
    // Refresh every 2 minutes
    const interval = setInterval(fetchPostOfTheDay, 120000);
    return () => clearInterval(interval);
  }, []);

  // Clear unread when switching channels
  const switchChannel = (ch: ChannelId) => {
    setActiveChannel(ch);
    setReplyingTo(null);
    setEditingId(null);
    setUnreadChannels(prev => {
      const next = new Set(prev);
      next.delete(ch);
      return next;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isSending || !user) return;

    const content = input.trim();
    const isAiChannel = activeChannel === 'ai-coach';
    setInput('');
    stopTyping();
    setIsSending(true);
    const currentReplyTo = replyingTo?.id || null;
    setReplyingTo(null);

    try {
      if (isAiChannel) {
        // AI Coach is private — messages stay in local state only
        const localUserMsg: ChatMessage = {
          id: `local-${Date.now()}`,
          user_id: user.id,
          content,
          is_ai: false,
          channel: 'ai-coach',
          created_at: new Date().toISOString(),
          reply_to: null,
          is_pinned: false,
        };
        setLocalAiMessages(prev => [...prev, localUserMsg]);

        setIsAiLoading(true);
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          const accessToken = currentSession?.access_token;
          if (!accessToken) throw new Error('Not authenticated');

          const recentAiMessages = localAiMessages
            .slice(-10)
            .map(m => ({
              role: m.is_ai ? 'assistant' as const : 'user' as const,
              content: m.content,
            }));
          recentAiMessages.push({ role: 'user', content });

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({ messages: recentAiMessages }),
            }
          );

          if (!response.ok) throw new Error('AI request failed');

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let aiContent = '';
          let textBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            textBuffer += decoder.decode(value, { stream: true });

            let newlineIndex: number;
            while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
              let line = textBuffer.slice(0, newlineIndex);
              textBuffer = textBuffer.slice(newlineIndex + 1);
              if (line.endsWith('\r')) line = line.slice(0, -1);
              if (line.startsWith(':') || line.trim() === '') continue;
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(jsonStr);
                const c = parsed.choices?.[0]?.delta?.content;
                if (c) aiContent += c;
              } catch {
                textBuffer = line + '\n' + textBuffer;
                break;
              }
            }
          }

          if (aiContent) {
            const localAiMsg: ChatMessage = {
              id: `local-ai-${Date.now()}`,
              user_id: user.id,
              content: aiContent,
              is_ai: true,
              channel: 'ai-coach',
              created_at: new Date().toISOString(),
              reply_to: null,
              is_pinned: false,
            };
            setLocalAiMessages(prev => [...prev, localAiMsg]);
          }
        } catch (aiError) {
          console.error('AI error:', aiError);
          toast.error('AI Coach is unavailable right now');
        } finally {
          setIsAiLoading(false);
        }
      } else {
        // Regular channel — save to DB
        const { error } = await supabase.from('chat_messages').insert({
          user_id: user.id,
          content,
          is_ai: false,
          reply_to: currentReplyTo,
          channel: effectiveChannel,
        }).select('id').single();

        if (error) throw error;
      }
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    const { error } = await supabase.from('chat_messages').update({ content: editText.trim() }).eq('id', msgId);
    if (error) { toast.error('Failed to edit message'); return; }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editText.trim() } : m));
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = async (msgId: string) => {
    const { error } = await supabase.from('chat_messages').delete().eq('id', msgId);
    if (error) { toast.error('Failed to delete message'); return; }
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const handlePin = async (msgId: string, currentlyPinned: boolean) => {
    const { error } = await supabase.from('chat_messages').update({ is_pinned: !currentlyPinned }).eq('id', msgId);
    if (error) { toast.error('Failed to update pin'); return; }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: !currentlyPinned } : m));
    toast.success(currentlyPinned ? 'Message unpinned' : 'Message pinned');
  };

  const handleSendFile = async (content: string) => {
    if (!user) return;
    const { error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      content,
      reply_to: replyingTo?.id || null,
      channel: effectiveChannel,
    });
    if (error) { toast.error('Failed to send'); return; }
    setReplyingTo(null);
    scrollToBottom();
  };

  const handleCreatePoll = async (question: string, options: string[]) => {
    if (!user) return;
    setShowPollCreator(false);
    const pollContent = `📊 Poll: ${question}`;
    const { data: msg, error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      content: pollContent,
      channel: effectiveChannel,
    }).select('id').single();
    if (error || !msg) { toast.error('Failed to create poll'); return; }
    await supabase.from('chat_polls').insert({
      message_id: msg.id,
      question,
      options,
      created_by: user.id,
    });
    scrollToBottom();
  };

  const handleSendSticker = async (sticker: StickerType) => {
    if (!user) return;
    setShowStickers(false);
    const content = `${STICKER_PREFIX}${sticker.id}`;
    const { error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      content,
      reply_to: replyingTo?.id || null,
      channel: effectiveChannel,
    });
    if (error) { toast.error('Failed to send sticker'); return; }
    setReplyingTo(null);
    scrollToBottom();
  };

  const handleSendGif = async (gifUrl: string) => {
    if (!user) return;
    setShowGifs(false);
    const content = `${GIF_PREFIX}${gifUrl}`;
    const { error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      content,
      reply_to: replyingTo?.id || null,
      channel: effectiveChannel,
    });
    if (error) { toast.error('Failed to send GIF'); return; }
    setReplyingTo(null);
    scrollToBottom();
  };

  // Mark visible messages as read — track the last few messages from other users
  useEffect(() => {
    if (!user || channelMessages.length === 0) return;

    // Get the last 5 messages from OTHER users to mark as read
    const otherMessages = channelMessages
      .filter(m => m.user_id !== user.id && !m.is_ai)
      .slice(-5);

    if (otherMessages.length === 0) return;

    const receipts = otherMessages.map(m => ({
      message_id: m.id,
      user_id: user.id,
    }));

    supabase.from('chat_read_receipts')
      .upsert(receipts, { onConflict: 'message_id,user_id' })
      .then(({ error }) => {
        if (error) console.error('Read receipt error:', error);
      });
  }, [channelMessages.length, user?.id, effectiveChannel]);

  const getProfile = (msg: ChatMessage): ProfileInfo => {
    if (msg.is_ai) {
      if (msg.channel === 'ai-coach') return { full_name: 'AI Coach', avatar_url: null, role: 'bot' };
      return { full_name: 'Team Bot', avatar_url: null, role: 'bot' };
    }
    return profileMap[msg.user_id] || { full_name: 'Team Member', avatar_url: null };
  };

  const isOwnMessage = (msg: ChatMessage) => msg.user_id === user?.id && !msg.is_ai;

  const isSameSender = (curr: ChatMessage, prev: ChatMessage | null) => {
    if (!prev) return false;
    if (curr.reply_to) return false;
    if (curr.is_ai !== prev.is_ai) return false;
    if (curr.user_id !== prev.user_id) return false;
    const diff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
    return diff < 5 * 60 * 1000;
  };

  const handleProfileClick = async (userId: string) => {
    if (!userId) return;
    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('id, user_id, full_name, email, phone, status, experience, direct_manager').eq('user_id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
    ]);
    if (profileRes.data) {
      const p = profileRes.data;
      setSelectedMember({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        status: p.status,
        experience: p.experience,
        direct_manager: p.direct_manager,
        role: (roleRes.data?.role as 'rookie' | 'manager' | 'admin') || 'rookie',
      });
    }
  };

  const getRoleColor = (r?: string) => {
    if (r === 'admin') return 'text-red-400';
    if (r === 'manager') return 'text-blue-400';
    return 'text-success';
  };

  const getRoleBadge = (r?: string) => {
    if (r === 'bot') return <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wider">BOT</span>;
    if (r === 'admin') return <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 uppercase tracking-wider">Admin</span>;
    if (r === 'manager') return <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 uppercase tracking-wider">Manager</span>;
    return null;
  };

  const activeChannelConfig = channels.find(c => c.id === activeChannel) || channels[0];
  const canPostInChannel = activeChannel !== 'announcements' || isManager;
  const defaultDescriptions: Record<string, string> = {
    general: 'Share wins, ask questions, hype each other up 🔥',
    announcements: isManager ? 'Post updates for the team' : 'Updates from leadership',
    feedback: 'Share ideas & feature requests 💡',
    'ai-coach': 'Your personal sales coach — ask anything',
  };
  const channelDescription = (chId: string) => defaultDescriptions[chId] || `#${activeChannelConfig.label}`;

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--card))] rounded-xl overflow-hidden border border-border/30">
      {/* Channel tabs */}
      <div className="flex items-center flex-wrap gap-0.5 px-2 pt-2 pb-0 border-b border-border/50 bg-[hsl(var(--card))] flex-shrink-0">
        {channels.map(ch => {
          const Icon = ICON_MAP[ch.icon] || Hash;
          const isActive = activeChannel === ch.id;
          const hasUnread = unreadChannels.has(ch.id);
          return (
            <button
              key={ch.id}
              onClick={() => switchChannel(ch.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap",
                isActive
                  ? "bg-background text-foreground border border-border/50 border-b-transparent -mb-px z-10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? ch.color : "")} />
              {ch.label}
              {hasUnread && !isActive && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          );
        })}
        {/* Admin: Create Channel Button */}
        {isAdmin && (
          <button
            onClick={() => setShowCreateChannel(!showCreateChannel)}
            className={cn(
              "flex items-center gap-1 px-2 py-2 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap",
              showCreateChannel
                ? "text-primary bg-primary/10"
                : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/40"
            )}
            title="Create new channel"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Create Channel Inline Form */}
      {showCreateChannel && isAdmin && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-muted/20 flex-shrink-0">
          <Hash className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={newChannelName}
            onChange={e => setNewChannelName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateChannel()}
            placeholder="Channel name..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleCreateChannel}
            disabled={!newChannelName.trim() || creatingChannel}
            className="px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {creatingChannel ? 'Creating...' : 'Create'}
          </button>
          <button
            onClick={() => { setShowCreateChannel(false); setNewChannelName(''); }}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Rookie / Vet toggle + description */}
      {activeChannel !== 'ai-coach' && (
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-border/30 bg-muted/10 flex-shrink-0">
          <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/30">
            <button
              onClick={() => setActiveRoom('rookie')}
              className={cn(
                "px-3 py-1 text-[11px] font-semibold rounded-md transition-all",
                activeRoom === 'rookie'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Rookie
            </button>
            <button
              onClick={() => setActiveRoom('vet')}
              className={cn(
                "px-3 py-1 text-[11px] font-semibold rounded-md transition-all",
                activeRoom === 'vet'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Vet
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {channelDescription(activeChannel)}
          </p>
        </div>
      )}
      {activeChannel === 'ai-coach' && (
        <div className="px-4 py-1.5 border-b border-border/30 bg-muted/10 flex-shrink-0">
          <p className="text-[11px] text-muted-foreground">
            {channelDescription(activeChannel)}
          </p>
        </div>
      )}

      {/* Pinned messages banner */}
      {(() => {
        const pinned = channelMessages.filter(m => m.is_pinned);
        if (pinned.length === 0) return null;
        const lastPinned = pinned[pinned.length - 1];
        const pinProfile = getProfile(lastPinned);
        return (
          <button
            onClick={() => document.getElementById(`msg-${lastPinned.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="flex items-center gap-2 px-4 py-1.5 border-b border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors flex-shrink-0 text-left"
          >
            <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-amber-500">{pinProfile.full_name}:</span>
            <span className="text-[11px] text-muted-foreground truncate">{lastPinned.content}</span>
            {pinned.length > 1 && (
              <span className="text-[10px] text-muted-foreground/60 ml-auto flex-shrink-0">+{pinned.length - 1} more</span>
            )}
          </button>
        );
      })()}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 relative"
      >
        {/* First-time welcome banner */}
        {showWelcomeBanner && activeChannel === 'general' && (
          <div className="mx-4 mt-4 mb-2 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between gap-3">
            <p className="text-sm text-foreground">
              👋 Welcome to the squad, <span className="font-semibold">{profile?.full_name?.split(' ')[0] || 'champ'}</span>! Jump in and say hi.
            </p>
            <button onClick={() => setShowWelcomeBanner(false)} className="text-xs text-muted-foreground hover:text-foreground shrink-0">Dismiss</button>
          </div>
        )}

        {channelMessages.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              {(() => { const Icon = ICON_MAP[activeChannelConfig.icon] || Hash; return <Icon className={cn("w-8 h-8", activeChannelConfig.color)} />; })()}
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">
              Welcome to #{activeChannelConfig.label}!
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeChannel === 'ai-coach'
                ? 'Ask the AI Coach any question about sales, training, or strategy.'
                : activeChannel === 'announcements'
                  ? isManager ? 'Post important updates for the team here.' : 'Announcements from leadership will appear here.'
                  : activeChannel === 'feedback'
                    ? 'Share your ideas, suggestions, and feature requests.'
                    : 'This is the start of the conversation. Say hi!'}
            </p>
          </div>
        )}

        {channelMessages.map((msg, idx) => {
          const prev = idx > 0 ? channelMessages[idx - 1] : null;
          const grouped = isSameSender(msg, prev);
          const showDate = !prev || !isSameDay(new Date(msg.created_at), new Date(prev.created_at));
          const msgProfile = getProfile(msg);

          return (
            <div key={msg.id}>
              {showDate && <DateSeparator date={new Date(msg.created_at)} />}

              <div
                id={`msg-${msg.id}`}
                className={cn(
                  "group/msg relative px-4 hover:bg-muted/20 transition-colors",
                  grouped ? "py-0.5" : "pt-4 pb-1",
                  !grouped && activeChannel !== 'ai-coach' && "border-b border-border/20",
                  isOwnMessage(msg) && "hover:bg-primary/5",
                  msg.is_pinned && "bg-amber-500/5 border-l-2 border-amber-500/40",
                  postOfTheDayId === msg.id && "post-of-the-day",
                  msg.is_ai && !grouped && (msg.content.includes('DEAL ALERT') || msg.content.includes('SUMMER CHECKLIST COMPLETE') || msg.content.includes('FULLY CERTIFIED')) && "bot-msg-glow my-1"
                )}
              >
                {/* Post of the Day badge */}
                {postOfTheDayId === msg.id && (
                  <div className="flex items-center gap-1.5 mb-1.5 ml-[52px]">
                    <Crown className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/90">
                      Post of the Day
                    </span>
                  </div>
                )}

                {/* Toolbar */}
                {!msg.is_ai && (
                  <div className="absolute -top-3 right-4 hidden group-hover/msg:flex items-center gap-0.5 bg-card border border-border rounded-md shadow-lg px-0.5 py-0.5 z-10">
                    <button
                      onClick={() => { setReplyingTo(msg); inputRef.current?.focus(); }}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                      title="Reply"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                    {isOwnMessage(msg) && (
                      <button
                        onClick={() => { setEditingId(msg.id); setEditText(msg.content); }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isManager && (
                      <button
                        onClick={() => handlePin(msg.id, msg.is_pinned)}
                        className={cn(
                          "p-1.5 rounded transition-colors",
                          msg.is_pinned
                            ? "text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        title={msg.is_pinned ? "Unpin" : "Pin"}
                      >
                        {msg.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {(isOwnMessage(msg) || isManager) && (
                      <button
                        onClick={() => setDeleteConfirm({ open: true, msgId: msg.id })}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  {/* Avatar column */}
                  <div className="w-10 flex-shrink-0">
                    {!grouped ? (
                      msg.is_ai ? (
                        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-primary" />
                        </div>
                      ) : (
                        <button onClick={() => handleProfileClick(msg.user_id)} className="focus:outline-none">
                          <UserAvatar
                            avatarUrl={msgProfile.avatar_url}
                            fullName={msgProfile.full_name}
                            size="md"
                            showOnline
                            isOnline={msgProfile.is_active_now}
                          />
                        </button>
                      )
                    ) : (
                      <span className="text-[10px] text-muted-foreground/0 group-hover/msg:text-muted-foreground/60 transition-colors w-10 text-right leading-[22px] tabular-nums">
                        {format(new Date(msg.created_at), 'h:mm')}
                      </span>
                    )}
                  </div>

                  {/* Content column */}
                  <div className="flex-1 min-w-0">
                    {/* Reply context */}
                    {msg.reply_to && (() => {
                      const parentMsg = channelMessages.find(m => m.id === msg.reply_to);
                      if (!parentMsg) return null;
                      const parentProfile = getProfile(parentMsg);
                      return (
                        <div className="flex items-center gap-1.5 mb-1 text-xs cursor-pointer hover:text-foreground/80 transition-colors"
                             onClick={() => {
                               document.getElementById(`msg-${parentMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                             }}>
                          <CornerDownRight className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                          <span className={cn("font-semibold text-[11px]", parentMsg.is_ai ? 'text-primary' : getRoleColor(parentProfile.role))}>
                            {parentProfile.full_name}
                          </span>
                          <span className="text-muted-foreground/60 truncate max-w-[200px]">
                            {parentMsg.content}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Name + timestamp + tier header */}
                    {!grouped && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <button
                          onClick={() => !msg.is_ai && handleProfileClick(msg.user_id)}
                          className={cn(
                            "text-sm font-semibold hover:underline cursor-pointer",
                            msg.is_ai ? 'text-primary' : getRoleColor(msgProfile.role)
                          )}
                        >
                          {msgProfile.full_name}
                        </button>
                        {getRoleBadge(msgProfile.role)}
                        {!msg.is_ai && msgProfile.tier_pct != null && msgProfile.tier_pct >= 25 && (
                          <TierBadge percentage={msgProfile.tier_pct} size="xs" />
                        )}
                        <span className="text-[10px] text-muted-foreground/60">
                          {isToday(new Date(msg.created_at))
                            ? `Today at ${format(new Date(msg.created_at), 'h:mm a')}`
                            : isYesterday(new Date(msg.created_at))
                              ? `Yesterday at ${format(new Date(msg.created_at), 'h:mm a')}`
                              : format(new Date(msg.created_at), 'MM/dd/yyyy h:mm a')
                          }
                        </span>
                      </div>
                    )}

                    {/* Message content */}
                    {editingId === msg.id ? (
                      <div className="bg-muted/60 rounded-lg p-2 border border-primary/30">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEdit(msg.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-full bg-transparent text-foreground text-sm focus:outline-none"
                          autoFocus
                        />
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            escape to <button onClick={() => setEditingId(null)} className="text-primary hover:underline">cancel</button>
                            {' · '} enter to <button onClick={() => handleEdit(msg.id)} className="text-primary hover:underline">save</button>
                          </span>
                        </div>
                      </div>
                    ) : isStickerMessage(msg.content) ? (
                      (() => {
                        const sticker = getStickerFromMessage(msg.content);
                        return sticker ? (
                          <img
                            src={sticker.src}
                            alt={sticker.label}
                            className="w-32 h-32 object-contain rounded-lg"
                          />
                        ) : (
                          <p className="text-sm text-foreground/90">[Unknown sticker]</p>
                        );
                      })()
                    ) : isGifMessage(msg.content) ? (
                      (() => {
                        const gifUrl = getGifUrl(msg.content);
                        return gifUrl ? (
                          <img
                            src={gifUrl}
                            alt="GIF"
                            className="max-w-[280px] rounded-lg"
                            loading="lazy"
                          />
                        ) : (
                          <p className="text-sm text-foreground/90">[GIF unavailable]</p>
                        );
                      })()
                    ) : isImageMessage(msg.content) ? (
                      <ChatImage url={getImageUrl(msg.content)} />
                    ) : isFileMessage(msg.content) ? (
                      (() => {
                        const info = getFileInfo(msg.content);
                        return info ? <ChatFile info={info} /> : <p className="text-sm text-foreground/90">[File unavailable]</p>;
                      })()
                    ) : msg.content.startsWith('📊 Poll:') ? (
                      <div>
                        <p className="text-sm text-foreground/90 leading-relaxed">{renderWithLinks(msg.content)}</p>
                        <ChatPoll messageId={msg.id} profileMap={profileMap} />
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                        {renderWithLinks(msg.content)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Reactions — skip for AI coach (local IDs aren't real UUIDs) */}
                {activeChannel !== 'ai-coach' && (
                  <MessageReactions messageId={msg.id} profileMap={profileMap} />
                )}
                {/* Read receipts - only on the very last message, skip AI coach */}
                {activeChannel !== 'ai-coach' && idx === channelMessages.length - 1 && (
                  <ReadReceipts
                    messageId={msg.id}
                    profileMap={profileMap}
                    isLastInGroup={true}
                  />
                )}
              </div>
            </div>
          );
        })}

        {isAiLoading && activeChannel === 'ai-coach' && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold text-primary">AI Coach</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wider">BOT</span>
                </div>
                <div className="flex gap-1 py-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1.5 flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-muted-foreground">
              {typingUsers.length === 1
                ? `${typingUsers[0].fullName} is typing...`
                : typingUsers.length === 2
                  ? `${typingUsers[0].fullName} and ${typingUsers[1].fullName} are typing...`
                  : `${typingUsers[0].fullName} and ${typingUsers.length - 1} others are typing...`
              }
            </span>
          </div>
        )}

        <div ref={messagesEndRef} className="h-6" />
      </div>

      {/* Scroll to bottom FAB */}
      {showScrollDown && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => scrollToBottom()}
            className="bg-card border border-border shadow-lg rounded-full p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      {canPostInChannel ? (
        <div className="px-4 pb-4 pt-1 flex-shrink-0 relative space-y-2">
          {/* Sticker Picker */}
          {showStickers && (
            <StickerPicker
              onSelect={handleSendSticker}
              onClose={() => setShowStickers(false)}
            />
          )}
          {/* GIF Picker */}
          {showGifs && (
            <GifPicker
              onSelect={handleSendGif}
              onClose={() => setShowGifs(false)}
            />
          )}
          {/* Poll Creator */}
          {showPollCreator && (
            <PollCreator
              onSubmit={handleCreatePoll}
              onClose={() => setShowPollCreator(false)}
            />
          )}
          {/* Reply preview */}
          {replyingTo && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-1 bg-muted/40 rounded-t-lg border border-b-0 border-border/50 text-xs">
              <Reply className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-muted-foreground">Replying to</span>
              <span className="font-semibold text-foreground truncate">
                {getProfile(replyingTo).full_name}
              </span>
              <span className="text-muted-foreground/60 truncate flex-1 max-w-[200px]">
                {replyingTo.content}
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors ml-auto flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className={cn(
            "flex items-center gap-0 bg-muted/60 border border-border/50 focus-within:border-primary/40 transition-colors",
            replyingTo ? "rounded-b-lg rounded-t-none" : "rounded-lg"
          )}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); onTyping(); }}
              onKeyDown={handleKeyDown}
              placeholder={
                replyingTo
                  ? `Reply to ${getProfile(replyingTo).full_name}...`
                  : activeChannel === 'ai-coach'
                    ? 'Ask Summit Coach anything...'
                    : activeChannel === 'feedback'
                      ? 'Share an idea or suggestion...'
                      : "What's on your mind?"
              }
              className="flex-1 bg-transparent text-foreground text-sm px-4 py-2.5 focus:outline-none placeholder:text-muted-foreground/50"
              disabled={isSending || isAiLoading}
            />
            {activeChannel !== 'ai-coach' && (
              <>
                <ChatImageUpload onSend={handleSendFile} />
                <button
                  onClick={() => { setShowPollCreator(!showPollCreator); setShowGifs(false); setShowStickers(false); }}
                  className={cn(
                    "p-2 rounded-md transition-all flex-shrink-0",
                    showPollCreator
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
                  )}
                  title="Create Poll"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setShowGifs(!showGifs); setShowStickers(false); setShowPollCreator(false); }}
                  className={cn(
                    "p-2 rounded-md transition-all flex-shrink-0",
                    showGifs
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
                  )}
                  title="GIFs"
                >
                  <Image className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setShowStickers(!showStickers); setShowGifs(false); setShowPollCreator(false); }}
                  className={cn(
                    "p-2 rounded-md transition-all flex-shrink-0",
                    showStickers
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
                  )}
                  title="Stickers"
                >
                  <Sticker className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending || isAiLoading}
              className={cn(
                "p-2 mr-1 rounded-md transition-all flex-shrink-0",
                input.trim()
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground/30"
              )}
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 flex-shrink-0 border-t border-border/30 bg-muted/20">
          <p className="text-xs text-muted-foreground text-center">
            Only managers can post in Announcements
          </p>
        </div>
      )}
      {/* Profile Modal */}
      <MemberProfileModal
        open={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
        roster={[]}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={open => !open && setDeleteConfirm({ open: false, msgId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The message will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm.msgId) handleDelete(deleteConfirm.msgId);
                setDeleteConfirm({ open: false, msgId: null });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
