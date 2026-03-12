import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { CornerDownRight, SmilePlus, Reply } from 'lucide-react';
import { isStickerMessage, getStickerFromMessage } from '@/components/dashboard/StickerPicker';
import { isGifMessage, getGifUrl } from '@/components/dashboard/GifPicker';
import { isImageMessage, getImageUrl, ChatImage, isFileMessage, getFileInfo, ChatFile } from '@/components/dashboard/ChatImageUpload';
import { ChatPoll } from '@/components/dashboard/ChatPoll';

function renderWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 break-all">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface ChatBubbleProps {
  message: {
    id: string;
    user_id: string;
    content: string;
    is_ai: boolean;
    created_at: string;
    reply_to: string | null;
    is_pinned: boolean;
  };
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showTimestamp: boolean;
  profile: { full_name: string; avatar_url: string | null; role?: string; is_active_now?: boolean };
  profileMap: Record<string, { full_name: string }>;
  allMessages: Array<{ id: string; user_id: string; content: string; is_ai: boolean; created_at: string }>;
  onProfileClick: (userId: string) => void;
  onContextMenu: (e: React.MouseEvent | React.TouchEvent, msgId: string) => void;
  onDoubleTap: (msgId: string) => void;
  onReply?: (msgId: string) => void;
  isEditing: boolean;
  editText: string;
  onEditChange: (text: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
}

export function ChatBubble({
  message,
  isOwn,
  isFirstInGroup,
  isLastInGroup,
  showTimestamp,
  profile,
  profileMap,
  allMessages,
  onProfileClick,
  onContextMenu,
  onDoubleTap,
  onReply,
  isEditing,
  editText,
  onEditChange,
  onEditSave,
  onEditCancel,
}: ChatBubbleProps) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [hovered, setHovered] = useState(false);
  const [showFireAnim, setShowFireAnim] = useState(false);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    const fetchReactions = async () => {
      const { data } = await supabase
        .from('chat_reactions')
        .select('emoji, user_id')
        .eq('message_id', message.id);
      if (!data) return;
      const grouped: Record<string, string[]> = {};
      data.forEach(r => {
        if (!grouped[r.emoji]) grouped[r.emoji] = [];
        grouped[r.emoji].push(r.user_id);
      });
      setReactions(Object.entries(grouped).map(([emoji, users]) => ({ emoji, users, count: users.length })));
    };
    fetchReactions();

    const channel = supabase
      .channel(`reactions-${message.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reactions', filter: `message_id=eq.${message.id}` }, fetchReactions)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [message.id]);

  const toggleReaction = async (emoji: string) => {
    if (!user) return;
    const existing = reactions.find(r => r.emoji === emoji);
    const hasReacted = existing?.users.includes(user.id);
    if (hasReacted) {
      await supabase.from('chat_reactions').delete().eq('message_id', message.id).eq('user_id', user.id).eq('emoji', emoji);
    } else {
      await supabase.from('chat_reactions').insert({ message_id: message.id, user_id: user.id, emoji });
    }
  };

  const handleDoubleTap = (msgId: string) => {
    setShowFireAnim(true);
    setTimeout(() => setShowFireAnim(false), 800);
    onDoubleTap(msgId);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      e.preventDefault();
      handleDoubleTap(message.id);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  let longPressTimer: ReturnType<typeof setTimeout>;
  const handleTouchStart = (e: React.TouchEvent) => {
    longPressTimer = setTimeout(() => {
      onContextMenu(e, message.id);
    }, 500);
  };
  const handleTouchCancel = () => clearTimeout(longPressTimer);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, message.id);
  };

  const getRoleColor = (r?: string) => {
    if (r === 'owner') return 'text-amber-400';
    if (r === 'admin') return 'text-slate-300';
    if (r === 'manager') return 'text-blue-400';
    return 'text-foreground/60';
  };

  const getRoleBorderRing = (r?: string) => {
    if (r === 'owner') return 'ring-2 ring-amber-500/50';
    if (r === 'admin') return 'ring-2 ring-slate-400/40';
    if (r === 'manager') return 'ring-2 ring-blue-500/40';
    return '';
  };

  const parentMsg = message.reply_to ? allMessages.find(m => m.id === message.reply_to) : null;

  const renderContent = () => {
    if (isEditing) {
      return (
        <div>
          <input
            type="text"
            value={editText}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onEditSave(); if (e.key === 'Escape') onEditCancel(); }}
            className="w-full bg-transparent text-inherit text-sm focus:outline-none"
            autoFocus
          />
          <span className="text-[10px] opacity-40 mt-1 block">esc cancel · enter save</span>
        </div>
      );
    }
    if (isStickerMessage(message.content)) {
      const sticker = getStickerFromMessage(message.content);
      return sticker ? <img src={sticker.src} alt={sticker.label} className="w-24 h-24 object-contain" /> : null;
    }
    if (isGifMessage(message.content)) {
      const gifUrl = getGifUrl(message.content);
      return gifUrl ? <img src={gifUrl} alt="GIF" className="max-w-[220px] rounded-lg" loading="lazy" /> : null;
    }
    if (isImageMessage(message.content)) return <ChatImage url={getImageUrl(message.content)} />;
    if (isFileMessage(message.content)) {
      const info = getFileInfo(message.content);
      return info ? <ChatFile info={info} /> : null;
    }
    if (message.content.startsWith('📊 Poll:')) {
      return (
        <div>
          <p className="leading-relaxed">{renderWithLinks(message.content)}</p>
          <ChatPoll messageId={message.id} profileMap={profileMap} />
        </div>
      );
    }
    return <span>{renderWithLinks(message.content)}</span>;
  };

  const hasMediaContent = isStickerMessage(message.content) || isGifMessage(message.content) || isImageMessage(message.content);

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        "relative px-3",
        isFirstInGroup ? "pt-1.5" : "pt-[1px]",
        isLastInGroup ? "pb-0.5" : "pb-[1px]",
        "group"
      )}
      onContextMenu={handleContextMenu}
      onDoubleClick={() => handleDoubleTap(message.id)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchCancel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={cn("flex items-end gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
        {/* Avatar */}
        <div className="w-7 flex-shrink-0">
          {!isOwn && isLastInGroup && !message.is_ai ? (
            <button onClick={() => onProfileClick(message.user_id)} className="focus:outline-none">
              <UserAvatar
                avatarUrl={profile.avatar_url}
                fullName={profile.full_name}
                size="sm"
                showOnline
                isOnline={profile.is_active_now}
                className={getRoleBorderRing(profile.role)}
              />
            </button>
          ) : isOwn ? null : <div className="w-7" />}
        </div>

        <div className={cn("max-w-[75%] min-w-0 relative", isOwn && "ml-auto")}>
          {/* Name */}
          {!isOwn && isFirstInGroup && !message.is_ai && (
            <button
              onClick={() => onProfileClick(message.user_id)}
              className={cn("text-[11px] font-semibold mb-0.5 ml-1 block", getRoleColor(profile.role))}
            >
              {profile.full_name}
            </button>
          )}

          {/* Reply preview */}
          {parentMsg && (
            <div
              className={cn(
                "flex items-center gap-1.5 mb-0.5 text-[11px] cursor-pointer hover:opacity-70 transition-opacity ml-1",
                isOwn && "justify-end mr-1 ml-0"
              )}
              onClick={() => document.getElementById(`msg-${parentMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            >
              <CornerDownRight className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
              <span className="text-muted-foreground/50 truncate max-w-[180px]">
                {parentMsg.content.slice(0, 60)}
              </span>
            </div>
          )}

          {/* Bubble */}
          <div className={cn(
            "relative text-[14px] leading-relaxed whitespace-pre-wrap break-words select-text",
            hasMediaContent ? "rounded-2xl" : cn(
              "px-3 py-[7px]",
              isOwn
                ? "bg-primary text-primary-foreground"
                : message.is_ai
                  ? "bg-accent/30 border border-accent/20"
                  : "bg-[hsl(var(--muted)/0.35)]",
              // iMessage corner rounding
              isOwn ? cn(
                "rounded-[18px]",
                isFirstInGroup && !isLastInGroup && "rounded-br-[5px]",
                !isFirstInGroup && !isLastInGroup && "rounded-r-[5px]",
                !isFirstInGroup && isLastInGroup && "rounded-tr-[5px]",
              ) : cn(
                "rounded-[18px]",
                isFirstInGroup && !isLastInGroup && "rounded-bl-[5px]",
                !isFirstInGroup && !isLastInGroup && "rounded-l-[5px]",
                !isFirstInGroup && isLastInGroup && "rounded-tl-[5px]",
              ),
            ),
            message.is_pinned && "ring-1 ring-amber-500/20",
          )}>
            {message.is_ai && isFirstInGroup && (
              <span className="text-[10px] font-semibold text-primary/70 block mb-0.5">Summit AI</span>
            )}
            {renderContent()}
          </div>

          {/* Double-tap fire animation */}
          {showFireAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <span className="text-4xl animate-ping" style={{ animationDuration: '0.6s', animationIterationCount: 1 }}>🔥</span>
            </div>
          )}

          {/* Hover actions - desktop only */}
          {hovered && !isEditing && (
            <div className={cn(
              "absolute top-0 hidden lg:flex items-center gap-0.5 -translate-y-1/2",
              isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"
            )}>
              <button
                onClick={() => onDoubleTap(message.id)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-card/90 border border-border/20 text-muted-foreground/40 hover:text-foreground hover:bg-card transition-all shadow-sm"
              >
                <SmilePlus className="w-3 h-3" />
              </button>
              {onReply && (
                <button
                  onClick={() => onReply(message.id)}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-card/90 border border-border/20 text-muted-foreground/40 hover:text-foreground hover:bg-card transition-all shadow-sm"
                >
                  <Reply className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Compact reactions */}
          {reactions.length > 0 && (
            <div className={cn("flex items-center gap-0.5 mt-0.5", isOwn ? "justify-end mr-1" : "ml-1")}>
              <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-card/80 border border-border/20 shadow-sm backdrop-blur-sm">
                {reactions.slice(0, 4).map(r => (
                  <button
                    key={r.emoji}
                    onClick={() => toggleReaction(r.emoji)}
                    className={cn(
                      "text-xs hover:scale-110 transition-transform",
                      r.users.includes(user?.id || '') && "drop-shadow-[0_0_3px_hsl(var(--primary)/0.5)]"
                    )}
                  >
                    {r.emoji}
                  </button>
                ))}
                {reactions.reduce((sum, r) => sum + r.count, 0) > 1 && (
                  <span className="text-[10px] font-medium text-muted-foreground/40 ml-0.5">
                    {reactions.reduce((sum, r) => sum + r.count, 0)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {showTimestamp && isLastInGroup && (
            <div className={cn("text-[10px] text-muted-foreground/30 mt-0.5 px-1", isOwn ? "text-right" : "text-left")}>
              {new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
