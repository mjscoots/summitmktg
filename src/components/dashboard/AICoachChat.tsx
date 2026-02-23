import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Minimize2, MessagesSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPreview {
  id: string;
  content: string;
  user_name: string;
  is_ai: boolean;
  created_at: string;
}

type TabMode = 'ai' | 'chat';

export function AICoachChat() {
  const { role, profile, user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<TabMode>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [hasNewChat, setHasNewChat] = useState(false);
  const [chatPreview, setChatPreview] = useState<ChatPreview[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isManager = role === 'manager' || role === 'admin';
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const scrollToBottom = () => {
    if (activeTab === 'ai') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatPreview, activeTab]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized, activeTab]);

  // Load previous AI coach conversations on mount
  useEffect(() => {
    if (!user) return;
    const loadHistory = async () => {
      const { data } = await supabase
        .from('ai_coach_conversations')
        .select('role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);
      if (data?.length) {
        setMessages(data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
      }
    };
    loadHistory();
  }, [user]);

  // Fetch recent chat messages for preview
  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) {
        const userIds = [...new Set(data.filter(m => !m.is_ai).map(m => m.user_id))];
        let nameMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);
          (profiles || []).forEach(p => { nameMap[p.user_id] = p.full_name; });
        }
        setChatPreview(data.reverse().map(m => ({
          id: m.id,
          content: m.content,
          user_name: m.is_ai ? 'AI Coach' : (nameMap[m.user_id] || 'Team Member'),
          is_ai: m.is_ai,
          created_at: m.created_at,
        })));
      }
    };
    fetchRecent();
  }, []);

  // Realtime subscription for new chat messages
  useEffect(() => {
    const channel = supabase
      .channel('bubble-chat-notify')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const msg = payload.new as any;
          let userName = 'Team Member';
          if (msg.is_ai) {
            userName = 'AI Coach';
          } else {
            const { data: p } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', msg.user_id)
              .maybeSingle();
            if (p) userName = p.full_name;
          }
          
          setChatPreview(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev.slice(-19), {
              id: msg.id,
              content: msg.content,
              user_name: userName,
              is_ai: msg.is_ai,
              created_at: msg.created_at,
            }];
          });

          if (msg.user_id !== user?.id && !isOpen) {
            setHasNewChat(true);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isSendingChat) return;

    if (activeTab === 'chat') {
      // Send to community chat (no @coach AI commands — AI coach is private)
      if (!user) return;
      const content = input.trim();
      setInput('');
      setIsSendingChat(true);

      try {
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          content,
          is_ai: false,
        });
      } catch { toast.error('Failed to send'); } finally { setIsSendingChat(false); }
      return;
    }

    // AI tab
    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            messages: [...messages, userMessage],
            save_messages: { user: userMessage.content },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to connect to AI coach');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

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
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save assistant response to conversation history
      if (assistantContent && user) {
        supabase.from('ai_coach_conversations').insert({
          user_id: user.id,
          role: 'assistant',
          content: assistantContent.slice(0, 2000),
        }).then(() => {});
      }
    } catch (error) {
      console.error('AI Coach error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1 || prev[i].content !== ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setHasNewChat(false); }}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
          isManager 
            ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30' 
            : 'bg-green-600 hover:bg-green-500 shadow-green-500/30'
        } ${hasNewChat ? 'ring-4 ring-primary/60 animate-bounce' : ''}`}
        aria-label="Open Chat"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {hasNewChat && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full" />
          </span>
        )}
      </button>
    );
  }

  return (
    <div 
      className={`fixed z-50 transition-all duration-300 ${
        isMinimized 
          ? 'bottom-6 right-6 w-80' 
          : 'bottom-6 right-6 w-96 h-[600px] max-h-[80vh]'
      }`}
    >
      <div className={`bg-card border rounded-xl shadow-2xl flex flex-col overflow-hidden h-full ${
        isManager ? 'border-blue-500/30 shadow-blue-500/10' : 'border-green-500/30 shadow-green-500/10'
      }`}>
        {/* Header */}
        <div className={`p-3 flex items-center justify-between ${
          isManager ? 'bg-blue-600' : 'bg-green-600'
        }`}>
          <div className="flex items-center gap-2">
            {/* Tab switcher */}
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'chat' ? 'bg-white/25 text-white' : 'text-white/60 hover:text-white/90'
              }`}
            >
              <MessagesSquare className="w-3.5 h-3.5 inline mr-1" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'ai' ? 'bg-white/25 text-white' : 'text-white/60 hover:text-white/90'
              }`}
            >
              <Bot className="w-3.5 h-3.5 inline mr-1" />
              AI Coach
            </button>
          </div>
          <div className="flex items-center gap-1">
            {activeTab === 'chat' && (
              <button
                onClick={() => { setIsOpen(false); navigate('/app/chat'); }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors text-[10px] font-medium"
              >
                Full View
              </button>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background/95 min-h-0">
              {activeTab === 'ai' ? (
                <>
                  {messages.length === 0 && (
                    <div className="text-center py-6">
                      <Bot className={`w-10 h-10 mx-auto mb-2 ${isManager ? 'text-blue-500' : 'text-green-500'}`} />
                      <p className="text-foreground font-semibold text-sm mb-1">Hey {firstName}!</p>
                      <p className="text-muted-foreground text-xs">
                        {isManager 
                          ? "Recruiting, team development, or daily execution?"
                          : "Let's sharpen your pitch or work through objections."
                        }
                      </p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                        msg.role === 'user' ? 'bg-muted' : isManager ? 'bg-blue-500/20' : 'bg-green-500/20'
                      }`}>
                        {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-muted-foreground" /> : <Bot className={`w-3.5 h-3.5 ${isManager ? 'text-blue-400' : 'text-green-400'}`} />}
                      </div>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user' ? 'bg-muted text-foreground' : 'bg-card border border-border text-foreground'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.content === '' && (
                    <div className="flex gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isManager ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                        <Loader2 className={`w-3.5 h-3.5 animate-spin ${isManager ? 'text-blue-400' : 'text-green-400'}`} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <>
                  {chatPreview.length === 0 && (
                    <div className="text-center py-6">
                      <MessagesSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No messages yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Type <span className="font-mono text-primary">@coach</span> for AI</p>
                    </div>
                  )}
                  {chatPreview.map((msg) => (
                    <div key={msg.id} className="flex flex-col items-start">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {msg.is_ai && <Bot className="w-3 h-3 text-primary" />}
                        <span className={`text-[10px] font-medium ${msg.is_ai ? 'text-primary' : 'text-muted-foreground'}`}>
                          {msg.user_name}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm ${
                        msg.is_ai ? 'bg-primary/10 border border-primary/20 text-foreground' : 'bg-card border border-border text-foreground'
                      }`}>
                        <p className="whitespace-pre-wrap break-words line-clamp-4">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-card flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={activeTab === 'ai' 
                    ? (isManager ? "Ask about leadership, recruiting..." : "Ask about pitch, objections...")
                    : "Message team... (@coach for AI)"
                  }
                  className="flex-1 bg-muted text-foreground text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                  disabled={isLoading || isSendingChat}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || isSendingChat}
                  size="sm"
                  className={isManager ? 'bg-blue-600 hover:bg-blue-500' : 'bg-green-600 hover:bg-green-500'}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
