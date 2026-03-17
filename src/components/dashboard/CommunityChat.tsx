import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { MemberProfileModal } from '@/components/team/MemberProfileModal';
import { TeamMember } from '@/lib/hierarchyUtils';
import { GIF_PREFIX } from './GifPicker';
import { STICKER_PREFIX } from './StickerPicker';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageContextMenu } from '@/components/chat/MessageContextMenu';
import { BackgroundDust } from '@/components/chat/BackgroundDust';
import { SummitLoader } from '@/components/shared/SummitLoader';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
}

interface CommunityChatProps {
  onNewMessage?: () => void;
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

export function CommunityChat({ onNewMessage }: CommunityChatProps) {
  const { user, profile, role } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
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

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { typingUsers, handleInputChange: onTyping, stopTyping } = useTypingIndicator();

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  useEffect(() => { profileMapRef.current = profileMap; }, [profileMap]);

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

  // Fetch messages + profiles
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) { console.error('Error:', error); setLoading(false); return; }

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
          if (!prev || (rolePriority[r.role] ?? 0) > (rolePriority[prev] ?? 0)) roleMap[r.user_id] = r.role;
        });
        const map: Record<string, ProfileInfo> = {};
        (profilesRes.data || []).forEach(p => {
          map[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url, is_active_now: p.is_active_now, role: roleMap[p.user_id] };
        });
        setProfileMap(map);
      }
      setMessages(([...(data || [])].reverse()).map(m => ({ ...m, channel: m.channel || 'general', is_pinned: m.is_pinned ?? false })));
      setLoading(false);
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
        if (newMsg.user_id !== user?.id) onNewMessage?.();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated, channel: updated.channel || 'general' } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, onNewMessage]);

  const channelMessages = messages.filter(m => (m.channel || 'general') === 'general');

  useEffect(() => { if (!loading) scrollToBottom(false); }, [channelMessages.length, scrollToBottom, loading]);

  // Read receipts
  useEffect(() => {
    if (!user || channelMessages.length === 0) return;
    const otherMessages = channelMessages.filter(m => m.user_id !== user.id && !m.is_ai).slice(-5);
    if (otherMessages.length === 0) return;
    supabase.from('chat_read_receipts').upsert(otherMessages.map(m => ({ message_id: m.id, user_id: user.id })), { onConflict: 'message_id,user_id' });
  }, [channelMessages.length, user?.id]);

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

  const handleSend = async () => {
    if (!input.trim() || isSending || !user) return;
    const content = input.trim();
    setInput(''); stopTyping(); setIsSending(true);
    const currentReplyTo = replyingTo?.id || null;
    setReplyingTo(null);

    try {
      const { data: msg, error } = await supabase.from('chat_messages').insert({
        user_id: user.id, content, is_ai: false, reply_to: currentReplyTo, channel: 'general'
      }).select('id').single();
      if (error) throw error;
      if (msg) {
        (supabase.rpc as any)('award_chat_message_points', { _user_id: user.id, _content: content, _message_id: msg.id })
          .then((res: any) => { if (res.error) console.error('[ChatPoints]', res.error); })
          .catch(() => {});
      }
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
    if (!user || doubleTapGuard.current) return;
    doubleTapGuard.current = true;
    try {
      const { data: existing } = await supabase.from('chat_reactions').select('id').eq('message_id', msgId).eq('user_id', user.id).eq('emoji', '⛰️').maybeSingle();
      if (existing) {
        await supabase.from('chat_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('chat_reactions').insert({ message_id: msgId, user_id: user.id, emoji: '⛰️' });
      }
    } catch {
      // silent
    } finally {
      doubleTapGuard.current = false;
    }
  };

  const handleReplyFromHover = (msgId: string) => {
    const msg = channelMessages.find(m => m.id === msgId);
    if (msg) setReplyingTo(msg);
  };

  const handleSendFile = async (content: string) => {
    if (!user) return;
    const { error } = await supabase.from('chat_messages').insert({ user_id: user.id, content, reply_to: replyingTo?.id || null, channel: 'general' });
    if (error) { toast.error('Failed to send'); return; }
    setReplyingTo(null); scrollToBottom();
  };

  const handleSendGif = async (gifUrl: string) => {
    if (!user) return;
    await supabase.from('chat_messages').insert({ user_id: user.id, content: `${GIF_PREFIX}${gifUrl}`, reply_to: replyingTo?.id || null, channel: 'general' });
    setReplyingTo(null); scrollToBottom();
  };

  const handleSendSticker = async (sticker: any) => {
    if (!user) return;
    await supabase.from('chat_messages').insert({ user_id: user.id, content: `${STICKER_PREFIX}${sticker.id}`, reply_to: replyingTo?.id || null, channel: 'general' });
    setReplyingTo(null); scrollToBottom();
  };

  const handleCreatePoll = async (question: string, options: string[]) => {
    if (!user) return;
    const { data: msg, error } = await supabase.from('chat_messages').insert({ user_id: user.id, content: `📊 Poll: ${question}`, channel: 'general' }).select('id').single();
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

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden relative" style={{ height: '100%', maxHeight: '100%' }}>
      {/* Cosmic background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 20%, hsl(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 70% 80%, hsl(var(--accent)) 0%, transparent 50%)',
          }}
        />
        <BackgroundDust />
      </div>

      {/* Header */}
      <div className="relative z-[1]">
        <ChatHeader
          channelName="Team Chat"
          subtitle="Summit Crew"
          pinnedCount={pinnedCount}
          onPinnedClick={() => {
            const pinned = channelMessages.filter(m => m.is_pinned);
            if (pinned.length) document.getElementById(`msg-${pinned[pinned.length - 1].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
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

        {!loading && channelMessages.map((msg, idx) => {
          const prev = idx > 0 ? channelMessages[idx - 1] : null;
          const next = idx < channelMessages.length - 1 ? channelMessages[idx + 1] : null;
          const showDate = !prev || !isSameDay(new Date(msg.created_at), new Date(prev.created_at));
          const grouped = isSameSender(msg, prev);
          const isLastInGroup = !next || !isSameSender(next, msg);
          const isFirstInGroup = !grouped;
          const showTime = shouldShowTime(msg, prev);
          const own = msg.user_id === user?.id && !msg.is_ai;

          if (msg.is_ai && msg.channel !== 'ai-coach') {
            return (
              <div key={msg.id}>
                {showDate && <DateSeparator date={new Date(msg.created_at)} />}
                <SystemMessage content={msg.content} />
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
                allMessages={channelMessages}
                onProfileClick={handleProfileClick}
                onContextMenu={handleContextMenu}
                onDoubleTap={handleDoubleTapReact}
                onReply={handleReplyFromHover}
                isEditing={editingId === msg.id}
                editText={editText}
                onEditChange={setEditText}
                onEditSave={() => handleEdit(msg.id)}
                onEditCancel={() => { setEditingId(null); setEditText(''); }}
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
