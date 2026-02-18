import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Send, Bot, Loader2, Pencil, Trash2, X, Check, ChevronDown } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  is_ai: boolean;
  created_at: string;
  user_name?: string;
}

interface CommunityChatProps {
  onNewMessage?: () => void;
}

function DateSeparator({ date }: { date: Date }) {
  let label = format(date, 'EEEE, MMMM d');
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';

  return (
    <div className="flex items-center justify-center my-3">
      <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
        {label}
      </span>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  // Fetch messages
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
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const map: Record<string, string> = {};
        (profiles || []).forEach(p => { map[p.user_id] = p.full_name; });
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
            const { data: p } = await supabase
              .from('profiles')
              .select('user_id, full_name')
              .eq('user_id', newMsg.user_id)
              .maybeSingle();
            if (p) {
              setProfileMap(prev => ({ ...prev, [p.user_id]: p.full_name }));
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
    setIsSending(true);

    try {
      const { error } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        content: isAiCommand ? content.replace('@coach', '').trim() : content,
        is_ai: false,
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

  const getDisplayName = (msg: ChatMessage) => {
    if (msg.is_ai) return 'Summit AI Coach';
    return profileMap[msg.user_id] || 'Team Member';
  };

  const isOwnMessage = (msg: ChatMessage) => msg.user_id === user?.id && !msg.is_ai;
  const isAdmin = role === 'admin';

  // Check if consecutive messages are from the same sender (for grouping)
  const isSameSender = (curr: ChatMessage, prev: ChatMessage | null) => {
    if (!prev) return false;
    if (curr.is_ai !== prev.is_ai) return false;
    if (curr.user_id !== prev.user_id) return false;
    // Group within 2 minutes
    const diff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
    return diff < 2 * 60 * 1000;
  };

  return (
    <div className="h-full flex flex-col bg-background rounded-2xl overflow-hidden">
      {/* Header - iMessage style */}
      <div className="px-4 py-3 border-b border-border/40 bg-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center justify-center gap-2">
          <h2 className="font-semibold text-foreground">Team Chat</h2>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-0.5">
          Type <span className="font-mono text-primary">@coach</span> to ask the AI
        </p>
      </div>

      {/* Messages - iMessage bubble style */}
      <div 
        ref={containerRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 min-h-0 relative"
      >
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Send className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a conversation with your team
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : null;
          const grouped = isSameSender(msg, prev);
          const own = isOwnMessage(msg);
          const showDate = !prev || !isSameDay(new Date(msg.created_at), new Date(prev.created_at));

          return (
            <div key={msg.id}>
              {showDate && <DateSeparator date={new Date(msg.created_at)} />}
              
              <div className={cn(
                "flex flex-col group/msg",
                own ? "items-end" : "items-start",
                grouped ? "mt-0.5" : "mt-3"
              )}>
                {/* Sender name - only for non-grouped, non-own messages */}
                {!grouped && !own && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1">
                    {msg.is_ai && <Bot className="w-3 h-3 text-primary" />}
                    <span className={cn(
                      "text-[11px] font-semibold",
                      msg.is_ai ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {getDisplayName(msg)}
                    </span>
                  </div>
                )}

                {editingId === msg.id ? (
                  <div className="max-w-[75%] w-full flex gap-1.5">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(msg.id); if (e.key === 'Escape') setEditingId(null); }}
                      className="flex-1 bg-muted text-foreground text-sm px-3 py-2 rounded-2xl border border-primary/50 focus:outline-none"
                      autoFocus
                    />
                    <button onClick={() => handleEdit(msg.id)} className="p-1.5 text-primary hover:bg-primary/10 rounded-full"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-full"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className={cn("relative max-w-[75%] flex items-end gap-1", own ? "flex-row-reverse" : "flex-row")}>
                    {/* Chat bubble */}
                    <div className={cn(
                      "px-3.5 py-2 text-sm leading-relaxed",
                      // iMessage-style bubble shapes
                      own
                        ? cn(
                            "bg-primary text-primary-foreground",
                            grouped
                              ? "rounded-2xl rounded-br-md"
                              : "rounded-2xl rounded-br-md"
                          )
                        : msg.is_ai
                          ? cn(
                              "bg-accent/60 text-foreground border border-primary/20",
                              grouped
                                ? "rounded-2xl rounded-bl-md"
                                : "rounded-2xl rounded-bl-md"
                            )
                          : cn(
                              "bg-muted text-foreground",
                              grouped
                                ? "rounded-2xl rounded-bl-md"
                                : "rounded-2xl rounded-bl-md"
                            )
                    )}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>

                    {/* Timestamp on hover */}
                    <span className="text-[9px] text-muted-foreground/50 opacity-0 group-hover/msg:opacity-100 transition-opacity flex-shrink-0 pb-1">
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </span>

                    {/* Edit/Delete controls */}
                    {(isOwnMessage(msg) || isAdmin) && !msg.is_ai && (
                      <div className={cn(
                        "absolute -top-3 hidden group-hover/msg:flex items-center gap-0.5 bg-card border border-border rounded-full shadow-lg px-1 py-0.5 z-10",
                        own ? "left-0" : "right-0"
                      )}>
                        {isOwnMessage(msg) && (
                          <button
                            onClick={() => { setEditingId(msg.id); setEditText(msg.content); }}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isAiLoading && (
          <div className="flex items-start mt-3">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
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

      {/* Input - iMessage style */}
      <div className="px-3 py-2 border-t border-border/40 bg-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="iMessage"
              className="w-full bg-muted/60 text-foreground text-sm px-4 py-2.5 rounded-full border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/50"
              disabled={isSending || isAiLoading}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending || isAiLoading}
            className={cn(
              "p-2.5 rounded-full transition-all flex-shrink-0",
              input.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90 scale-100"
                : "bg-muted text-muted-foreground scale-95"
            )}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
