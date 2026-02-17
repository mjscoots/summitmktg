import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Send, MessageSquare, Bot, Loader2, Pencil, Trash2, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

      // Fetch profile names
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
          
          // Fetch name if needed
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

          // Notify parent if message is from someone else
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
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || isSending || !user) return;

    const content = input.trim();
    const isAiCommand = content.startsWith('@coach');
    setInput('');
    setIsSending(true);

    try {
      // Insert chat message
      const { error } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        content: isAiCommand ? content.replace('@coach', '').trim() : content,
        is_ai: false,
      });

      if (error) throw error;

      // If AI command, get AI response
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

          // Parse streaming response to get full text
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

          // Insert AI response as chat message
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

  return (
    <div className="bg-card rounded-lg border border-border/50 h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Team Chat</h2>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            @coach for AI
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Type <span className="font-mono text-primary">@coach</span> to ask the AI
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${isOwnMessage(msg) ? 'items-end' : 'items-start'} group/msg`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              {msg.is_ai && <Bot className="w-3 h-3 text-primary" />}
              <span className={`text-[10px] font-medium ${
                msg.is_ai ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {getDisplayName(msg)}
              </span>
              <span className="text-[9px] text-muted-foreground/60">
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </span>
            </div>

            {editingId === msg.id ? (
              <div className="max-w-[85%] w-full flex gap-1.5">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(msg.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="flex-1 bg-muted text-foreground text-sm px-2.5 py-1.5 rounded-lg border border-primary/50 focus:outline-none"
                  autoFocus
                />
                <button onClick={() => handleEdit(msg.id)} className="p-1 text-primary hover:bg-primary/10 rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="relative max-w-[85%]">
                <div className={`rounded-lg px-3 py-2 text-sm ${
                  msg.is_ai
                    ? 'bg-primary/10 border border-primary/20 text-foreground'
                    : isOwnMessage(msg)
                      ? 'bg-muted text-foreground'
                      : 'bg-card border border-border text-foreground'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                {/* Edit/Delete controls */}
                {(isOwnMessage(msg) || isAdmin) && !msg.is_ai && (
                  <div className="absolute -top-1 right-0 hidden group-hover/msg:flex items-center gap-0.5 bg-card border border-border rounded-md shadow-sm px-0.5 py-0.5">
                    {isOwnMessage(msg) && (
                      <button
                        onClick={() => { setEditingId(msg.id); setEditText(msg.content); }}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isAiLoading && (
          <div className="flex items-start gap-1.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Bot className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-medium text-primary">Summit AI Coach</span>
            </div>
            <Loader2 className="w-4 h-4 animate-spin text-primary ml-1" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/30 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message team... (@coach for AI)"
            className="flex-1 bg-muted text-foreground text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
            disabled={isSending || isAiLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending || isAiLoading}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
