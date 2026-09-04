import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { BadgeStrip } from '@/components/badges/BadgeStrip';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { CornerDownRight, SmilePlus, Reply, Check, CheckCheck } from 'lucide-react';
import { isStickerMessage, getStickerFromMessage } from '@/components/dashboard/StickerPicker';
import { isGifMessage, getGifUrl } from '@/components/dashboard/GifPicker';
import { isImageMessage, getImageUrl, ChatImage, isFileMessage, getFileInfo, ChatFile } from '@/components/dashboard/ChatImageUpload';
import { ChatPoll } from '@/components/dashboard/ChatPoll';
import { isVoiceMessage, getVoiceInfo, VoiceNoteBubble } from '@/components/chat/VoiceNote';
import { MediaGallery } from '@/components/chat/MediaGallery';
import { ChatVideo } from '@/components/chat/ChatVideo';
import { isImagesMessage, getImagePaths, isVideoMessage, getVideoPath } from '@/lib/chatMedia';
import { RankInsignia } from '@/components/badges/RankInsignia';
import { RoleChip } from '@/components/shared/RoleChip';
import { IndustryChips } from '@/components/shared/IndustryChips';
import { ExperienceStars } from '@/components/shared/ExperienceStars';
import { LockedInBadge } from '@/components/badges/LockedInBadge';
import { useIdentity } from '@/hooks/useIdentityChips';
import { isEmojiOnly } from '@/lib/chatText';

/** A win post bursts once per session, never again on scroll back. */
const burstedWins = new Set<string>();



function renderMentions(text: string, keyPrefix: string) {
  // @First Last (up to two capitalised words) or @firstname
  // Split with a global regex, but test each part with a fresh, non-global one
  // so lastIndex never carries over between parts.
  const mentionRegex = /(@[A-Za-z][\w'-]*(?: [A-Z][\w'-]*)?)/g;
  const isMention = /^@[A-Za-z][\w'-]*(?: [A-Z][\w'-]*)?$/;
  return text.split(mentionRegex).map((part, i) => {
    if (isMention.test(part)) {
      return (
        <span key={`${keyPrefix}-m${i}`} className="rounded bg-primary/20 px-1 font-semibold text-primary">
          {part}
        </span>
      );
    }
    return <span key={`${keyPrefix}-t${i}`}>{part}</span>;
  });
}

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
    return <span key={i}>{renderMentions(part, String(i))}</span>;
  });
}

interface Reaction {
  emoji: string;
  count: number;
  mine: boolean;
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
    /** Set once a message has been changed, so an edited label can show. */
    edited_at?: string | null;
    /** Card kind. 'text' for ordinary messages. */
    kind?: string;
  };
  isOwn: boolean;
  /** Own messages only: one check delivered, two checks read. */
  readTick?: 'sent' | 'read' | null;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showTimestamp: boolean;
  profile: { full_name: string; avatar_url: string | null; role?: string; is_active_now?: boolean; team_name?: string | null };
  profileMap: Record<string, { full_name: string }>;
  parentMessage?: { id: string; content: string } | null;
  onProfileClick: (userId: string) => void;
  onContextMenu: (e: React.MouseEvent | React.TouchEvent, msgId: string) => void;
  onDoubleTap: (msgId: string) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onReply?: (msgId: string) => void;
  isEditing: boolean;
  editText: string;
  onEditChange: (text: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  reactions?: Reaction[];
  /** True for the message this person just sent, so it scales in once. */
  justSent?: boolean;
  /** True for a message that landed while the room was open. */
  justArrived?: boolean;
  /** Direct messages already name the person in the header. */
  hideSenderName?: boolean;
  /** Show accepted industry chips under the sender name. */
  showIndustryChips?: boolean;
  /** Industry room: skip the chip everyone in the room already shares. */
  skipIndustry?: string | null;

}

export function ChatBubble({
  message,
  isOwn,
  isFirstInGroup,
  isLastInGroup,
  showTimestamp,
  profile,
  profileMap,
  parentMessage,
  onProfileClick,
  onContextMenu,
  onDoubleTap,
  onToggleReaction,
  onReply,
  isEditing,
  editText,
  onEditChange,
  onEditSave,
  onEditCancel,
  reactions: reactionsProp = [],
  justSent = false,
  justArrived = false,
  hideSenderName = false,
  readTick = null,
  showIndustryChips = false,
  skipIndustry = null,
}: ChatBubbleProps) {


  const reactions = reactionsProp;
  // Identity line under the sender name: accepted industries plus experience.
  const showIdentity = showIndustryChips && !isOwn && isFirstInGroup && !message.is_ai && !hideSenderName;
  const identity = useIdentity(showIdentity ? message.user_id : null);

  const [hovered, setHovered] = useState(false);
  const [showFireAnim, setShowFireAnim] = useState(false);
  const [showQuickPicker, setShowQuickPicker] = useState(false);
  const [poppedEmoji, setPoppedEmoji] = useState<string | null>(null);
  const [dragX, setDragX] = useState(0);
  const swipeRef = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const QUICK_EMOJIS = ['🔥', '💪', '😂', '👏', '❄️', '💯'];

  const toggleReaction = (msgId: string, emoji: string) => {
    setPoppedEmoji(emoji);
    window.setTimeout(() => setPoppedEmoji(null), 420);
    onToggleReaction(msgId, emoji);
  };

  const handleDoubleTap = (msgId: string) => {
    setShowFireAnim(true);
    setTimeout(() => setShowFireAnim(false), 800);
    onDoubleTap(msgId);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    clearLongPress();
    if (dragX >= 40 && onReply) {
      navigator.vibrate?.(8);
      onReply(message.id);
    }
    swipeRef.current = null;
    setDragX(0);
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      e.preventDefault();
      handleDoubleTap(message.id);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    clearLongPress();
    const t = e.touches[0];
    // A touch that starts on media (gallery, lightbox, video) belongs to that
    // element, so swipe to reply stays out of it.
    const onMedia = !!(e.target as HTMLElement | null)?.closest?.('[data-chat-media="true"]');
    if (t && !onMedia) swipeRef.current = { x: t.clientX, y: t.clientY, active: false };
    else swipeRef.current = null;
    longPressTimerRef.current = setTimeout(() => {
      onContextMenu(e, message.id);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    clearLongPress();
    const start = swipeRef.current;
    const t = e.touches[0];
    if (!start || !t || !onReply) return;
    const dx = t.clientX - start.x;
    const dy = Math.abs(t.clientY - start.y);
    if (!start.active && (dx < 8 || dy > Math.abs(dx))) return;
    start.active = true;
    setDragX(Math.max(0, Math.min(dx, 64)));
  };

  const handleTouchCancel = () => {
    clearLongPress();
    swipeRef.current = null;
    setDragX(0);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, message.id);
  };

  const getRoleColor = (r?: string) => {
    if (r === 'owner') return 'text-primary';
    if (r === 'admin') return 'text-slate-300';
    if (r === 'manager') return 'text-primary';
    return 'text-foreground/60';
  };

  const getRoleBorderRing = (r?: string) => {
    if (r === 'owner') return 'ring-2 ring-amber-500/50';
    if (r === 'admin') return 'ring-2 ring-slate-400/40';
    if (r === 'manager') return 'ring-2 ring-primary/40';
    return '';
  };

  const parentMsg = message.reply_to ? parentMessage ?? null : null;

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
      return sticker ? <img loading="lazy" decoding="async" width={96} height={96} src={sticker.src} alt={sticker.label} className="w-24 h-24 object-contain" /> : null;
    }
    if (isGifMessage(message.content)) {
      const gifUrl = getGifUrl(message.content);
      return gifUrl ? <img src={gifUrl} alt="GIF" className="max-w-[220px] rounded-lg" loading="lazy" /> : null;
    }
    if (isVoiceMessage(message.content)) {
      const info = getVoiceInfo(message.content);
      return info ? <VoiceNoteBubble url={info.url} seconds={info.seconds} isOwn={isOwn} /> : null;
    }
    if (isImagesMessage(message.content)) return <MediaGallery paths={getImagePaths(message.content)} />;
    if (isVideoMessage(message.content)) return <ChatVideo path={getVideoPath(message.content)} />;
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
    if (isEmojiOnly(message.content)) {
      return <span className="block text-[40px] leading-none">{message.content.trim()}</span>;
    }
    return <span>{renderWithLinks(message.content)}</span>;
  };

  const emojiOnly = !isEditing && isEmojiOnly(message.content);

  // A win post bursts once, inside the bubble, and never again on scroll back.
  const [showWinBurst, setShowWinBurst] = useState(false);
  useEffect(() => {
    if (message.kind !== 'win' || burstedWins.has(message.id)) return;
    burstedWins.add(message.id);
    setShowWinBurst(true);
    const id = window.setTimeout(() => setShowWinBurst(false), 1000);
    return () => window.clearTimeout(id);
  }, [message.id, message.kind]);

  const hasMediaContent =
    emojiOnly ||
    isStickerMessage(message.content) ||
    isGifMessage(message.content) ||
    isImageMessage(message.content) ||
    isImagesMessage(message.content) ||
    isVideoMessage(message.content);

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
      onTouchMove={handleTouchMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={cn("flex items-end gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
        {/* Avatar - 36px on other people's messages */}
        <div className="w-9 flex-shrink-0">
          {!isOwn && isLastInGroup && !message.is_ai ? (
            <button onClick={() => onProfileClick(message.user_id)} className="focus:outline-none">
              <UserAvatar
                avatarUrl={profile.avatar_url}
                fullName={profile.full_name}
                size="sm"
                showOnline
                isOnline={profile.is_active_now}
                className={cn('!w-9 !h-9 text-[11px]', getRoleBorderRing(profile.role))}
              />
            </button>
          ) : isOwn ? null : <div className="w-9" />}
        </div>

        <div
          className={cn(
            "max-w-[75%] min-w-0 relative swipe-reply",
            justArrived && "msg-in",
            isOwn && "ml-auto"
          )}
          style={dragX ? { transform: `translateX(${dragX}px)` } : undefined}
        >
          {/* Name and team */}
          {!isOwn && isFirstInGroup && !message.is_ai && !hideSenderName && (
            <span className="flex items-center gap-1 mb-0.5 ml-1 min-w-0">
              <button
                onClick={() => onProfileClick(message.user_id)}
                className={cn("text-[11px] font-semibold truncate", getRoleColor(profile.role))}
              >
                {(profile.full_name || '').trim().split(/\s+/)[0] || profile.full_name}
              </button>
              {profile.team_name && (
                <span className="shrink-0 rounded-full border border-border/60 bg-muted/30 px-1.5 text-[10px] text-muted-foreground">
                  {profile.team_name}
                </span>
              )}
              <RoleChip userId={message.user_id} />
              <RankInsignia role={profile.role} size="sm" className="shrink-0" />

              <BadgeStrip userId={message.user_id} max={2} className="shrink-0" />
            </span>
          )}

          {/* Industry chips and years in the industry */}
          {showIdentity && (
            <span className="mb-0.5 ml-1 flex items-center gap-1">
              <IndustryChips verticals={identity?.verticals} skip={skipIndustry} max={3} />
              <ExperienceStars years={identity?.years} />
              <LockedInBadge userId={message.user_id} />
            </span>



          )}


          {/* Reply quote strip */}
          {parentMsg && (
            <div
              className={cn(
                "reply-quote mb-1 cursor-pointer transition-opacity hover:opacity-70 ml-1",
                isOwn && "mr-1 ml-0 justify-end"
              )}
              onClick={() => document.getElementById(`msg-${parentMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            >
              <CornerDownRight className="w-3 h-3 shrink-0 text-primary/50" />
              <span className="truncate max-w-[200px]">{parentMsg.content.slice(0, 60)}</span>
            </div>
          )}

          {/* Bubble */}
          <div className={cn(
            "chat-text relative leading-relaxed whitespace-pre-wrap break-words select-text",
            justSent && "bubble-in",
            hasMediaContent ? "rounded-2xl" : cn(
              "px-3 py-[7px]",
              isOwn
                ? "bubble-own"
                : message.is_ai
                  ? "bg-accent/30 border border-accent/20"
                  : "bubble-other",
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
            !hasMediaContent && isLastInGroup && !message.is_ai && (isOwn ? "bubble-tail-own" : "bubble-tail-other"),
          )}>

            {message.is_ai && isFirstInGroup && (
              <span className="text-[10px] font-semibold text-primary/70 block mb-0.5">Summit AI</span>
            )}
            {renderContent()}
            {showWinBurst && (
              <span aria-hidden className="win-burst">
                {[12, 30, 48, 66, 84].map((left, i) => (
                  <span key={left} style={{ left: `${left}%`, animationDelay: `${i * 60}ms` }} />
                ))}
              </span>
            )}
            {!hasMediaContent && !isEditing && (
              <span className="ml-2 inline-flex select-none items-center gap-1 align-bottom text-[10px] text-muted-foreground/50">
                {message.edited_at && <span>edited</span>}
                <span>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                {isOwn && readTick === 'read' && <CheckCheck className="h-3 w-3 text-muted-foreground/60" aria-label="Read" />}
                {isOwn && readTick === 'sent' && <Check className="h-3 w-3 text-muted-foreground/50" aria-label="Delivered" />}
              </span>
            )}
          </div>

          {/* Double-tap fire animation */}
          {showFireAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <span className="text-4xl animate-ping" style={{ animationDuration: '0.6s', animationIterationCount: 1 }}>⛰️</span>
            </div>
          )}

          {/* Hover actions - desktop only */}
          {hovered && !isEditing && (
            <div className={cn(
              "absolute top-0 hidden lg:flex items-center gap-0.5 -translate-y-1/2",
              isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"
            )}>
              <div className="relative">
                <button
                  onClick={() => setShowQuickPicker(p => !p)}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-card/90 border border-border/20 text-muted-foreground/40 hover:text-foreground hover:bg-card transition-all shadow-sm"
                >
                  <SmilePlus className="w-3 h-3" />
                </button>
                {showQuickPicker && (
                  <div className={cn(
                    "absolute bottom-full mb-1 z-50 bg-card border border-border/50 rounded-full shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150",
                    isOwn ? "right-0" : "left-0"
                  )}>
                    <div className="flex items-center gap-0.5 p-1">
                      {QUICK_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => { toggleReaction(message.id, emoji); setShowQuickPicker(false); }}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted text-sm transition-all hover:scale-125 active:scale-90"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
            <div
              className={cn("flex items-center gap-0.5 mt-0.5", isOwn ? "justify-end mr-1" : "ml-1")}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-card/80 border border-border/20 shadow-sm backdrop-blur-sm">
                {reactions.slice(0, 4).map(r => (
                  <button
                    key={r.emoji}
                    onClick={() => toggleReaction(message.id, r.emoji)}
                    className={cn(
                      "relative text-xs hover:scale-110 transition-transform",
                      poppedEmoji === r.emoji && "react-pop",
                      r.mine && "drop-shadow-[0_0_3px_hsl(var(--primary)/0.5)]"
                    )}
                  >
                    {r.emoji}
                    {poppedEmoji === r.emoji && (
                      <span aria-hidden className="pointer-events-none absolute inset-0">
                        <span className="react-particle" style={{ ['--px' as string]: '-10px', ['--py' as string]: '-16px' }} />
                        <span className="react-particle" style={{ ['--px' as string]: '2px', ['--py' as string]: '-20px' }} />
                        <span className="react-particle" style={{ ['--px' as string]: '12px', ['--py' as string]: '-14px' }} />
                      </span>
                    )}
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

          {/* Timestamp - media bubbles carry it outside, text bubbles inside */}
          {hasMediaContent && showTimestamp && isLastInGroup && (
            <div className={cn("text-[10px] text-muted-foreground/30 mt-0.5 px-1", isOwn ? "text-right" : "text-left")}>
              {new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
