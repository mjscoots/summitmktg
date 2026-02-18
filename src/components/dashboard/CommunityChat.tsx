import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Send, Bot, Loader2, Pencil, Trash2, X, Check, ChevronDown, Hash, AtSign, SmilePlus, Reply, CornerDownRight } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { MessageReactions } from './MessageReactions';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  is_ai: boolean;
  created_at: string;
  reply_to: string | null;
}

interface ProfileInfo {
  full_name: string;
  avatar_url: string | null;
  role?: string;
}

interface CommunityChatProps {
  onNewMessage?: () => void;
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileInfo>>({});
  const [showScrollDown, setShowScrollDown] = useState(false);
  const { typingUsers, handleInputChange: onTyping, stopTyping } = useTypingIndicator();

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  // Fetch messages + profiles with avatars & roles
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const userIds = [...new Set((data || []).filter(m => !m.is_ai).map(m => m.user_id))];
      if (userIds.length > 0) {
        const [profilesRes, rolesRes] = await Promise.all([
          supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
          supabase.from('user_roles').select('user_id, role').in('user_id', userIds),
        ]);

        const roleMap: Record<string, string> = {};
        (rolesRes.data || []).forEach(r => { roleMap[r.user_id] = r.role; });

        const map: Record<string, ProfileInfo> = {};
        (profilesRes.data || []).forEach(p => {
          map[p.user_id] = {
            full_name: p.full_name,
            avatar_url: p.avatar_url,
            role: roleMap[p.user_id],
          };
        });
        setProfileMap(map);
      }

      setMessages(data || []);
    };

    fetchMessages();
  }, []);

  // Subscribe to realtime
  useEffect(() => {
    const channel = supabase
      .channel('community-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;

          if (!newMsg.is_ai && !profileMap[newMsg.user_id]) {
            const [pRes, rRes] = await Promise.all([
              supabase.from('profiles').select('user_id, full_name, avatar_url').eq('user_id', newMsg.user_id).maybeSingle(),
              supabase.from('user_roles').select('role').eq('user_id', newMsg.user_id).maybeSingle(),
            ]);
            if (pRes.data) {
              setProfileMap(prev => ({
                ...prev,
                [pRes.data!.user_id]: {
                  full_name: pRes.data!.full_name,
                  avatar_url: pRes.data!.avatar_url,
                  role: rRes.data?.role,
                },
              }));
            }
          }

          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          if (newMsg.user_id !== user?.id) {
            onNewMessage?.();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, onNewMessage, profileMap]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || isSending || !user) return;

    const content = input.trim();
    const isAiCommand = content.startsWith('@coach');
    setInput('');
    stopTyping();
    setIsSending(true);
    const currentReplyTo = replyingTo?.id || null;
    setReplyingTo(null);

    try {
      const { error } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        content: isAiCommand ? content.replace('@coach', '').trim() : content,
        is_ai: false,
        reply_to: currentReplyTo,
      });

      if (error) throw error;

      if (isAiCommand) {
        setIsAiLoading(true);
        const userQuestion = content.replace('@coach', '').trim();

        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          const accessToken = currentSession?.access_token;
          if (!accessToken) throw new Error('Not authenticated');

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({
                messages: [{ role: 'user', content: userQuestion }],
              }),
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
            await supabase.from('chat_messages').insert({
              user_id: user.id,
              content: aiContent,
              is_ai: true,
            });
          }
        } catch (aiError) {
          console.error('AI error:', aiError);
          toast.error('AI Coach is unavailable right now');
        } finally {
          setIsAiLoading(false);
        }
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

  const getProfile = (msg: ChatMessage): ProfileInfo => {
    if (msg.is_ai) return { full_name: 'Summit AI Coach', avatar_url: null, role: 'bot' };
    return profileMap[msg.user_id] || { full_name: 'Team Member', avatar_url: null };
  };

  const isOwnMessage = (msg: ChatMessage) => msg.user_id === user?.id && !msg.is_ai;
  const isAdmin = role === 'admin';

  // Discord-style grouping: same sender within 5 minutes
  const isSameSender = (curr: ChatMessage, prev: ChatMessage | null) => {
    if (!prev) return false;
    if (curr.reply_to) return false; // replies always break grouping
    if (curr.is_ai !== prev.is_ai) return false;
    if (curr.user_id !== prev.user_id) return false;
    const diff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
    return diff < 5 * 60 * 1000;
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

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--card))] rounded-xl overflow-hidden border border-border/30">
      {/* Channel header - Discord style */}
      <div className="px-4 py-2.5 border-b border-border/50 bg-card flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">general</h2>
          <div className="h-4 w-px bg-border/60 mx-1" />
          <p className="text-xs text-muted-foreground truncate">
            Team chat · Type <span className="font-mono text-primary">@coach</span> for AI
          </p>
        </div>
      </div>

      {/* Messages area - Discord style */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 relative"
      >
        {messages.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Hash className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">Welcome to #general!</h3>
            <p className="text-sm text-muted-foreground">
              This is the start of the conversation. Say hi to your team!
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : null;
          const grouped = isSameSender(msg, prev);
          const showDate = !prev || !isSameDay(new Date(msg.created_at), new Date(prev.created_at));
          const msgProfile = getProfile(msg);

          return (
            <div key={msg.id}>
              {showDate && <DateSeparator date={new Date(msg.created_at)} />}

              <div
                id={`msg-${msg.id}`}
                className={cn(
                  "group/msg relative px-4 hover:bg-muted/30 transition-colors",
                  grouped ? "py-0.5" : "pt-3 pb-0.5",
                  isOwnMessage(msg) && "hover:bg-primary/5"
                )}
              >
                {/* Toolbar - Discord style floating */}
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
                    {(isOwnMessage(msg) || isAdmin) && (
                      <button
                        onClick={() => handleDelete(msg.id)}
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
                        <UserAvatar
                          avatarUrl={msgProfile.avatar_url}
                          fullName={msgProfile.full_name}
                          size="md"
                        />
                      )
                    ) : (
                      /* Hover timestamp for grouped messages */
                      <span className="text-[10px] text-muted-foreground/0 group-hover/msg:text-muted-foreground/60 transition-colors w-10 text-right leading-[22px] tabular-nums">
                        {format(new Date(msg.created_at), 'h:mm')}
                      </span>
                    )}
                  </div>

                  {/* Content column */}
                  <div className="flex-1 min-w-0">
                    {/* Reply context */}
                    {msg.reply_to && (() => {
                      const parentMsg = messages.find(m => m.id === msg.reply_to);
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

                    {/* Name + timestamp header (non-grouped only) */}
                    {!grouped && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className={cn(
                          "text-sm font-semibold hover:underline cursor-pointer",
                          msg.is_ai ? 'text-primary' : getRoleColor(msgProfile.role)
                        )}>
                          {msgProfile.full_name}
                        </span>
                        {getRoleBadge(msgProfile.role)}
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
                    ) : (
                      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    )}
                  </div>
                </div>

                {/* Reactions */}
                <MessageReactions messageId={msg.id} profileMap={profileMap} />
              </div>
            </div>
          );
        })}

        {isAiLoading && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold text-primary">Summit AI Coach</span>
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

      {/* Input - Discord style */}
      <div className="px-4 pb-4 pt-1 flex-shrink-0">
        {/* Reply preview bar */}
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
            placeholder={replyingTo ? `Reply to ${getProfile(replyingTo).full_name}...` : "Message #general"}
            className="flex-1 bg-transparent text-foreground text-sm px-4 py-2.5 focus:outline-none placeholder:text-muted-foreground/50"
            disabled={isSending || isAiLoading}
          />
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
    </div>
  );
}