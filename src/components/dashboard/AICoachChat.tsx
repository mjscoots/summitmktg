import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Minimize2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AICoachChatProps {
  hasNewMessages?: boolean;
  onOpen?: () => void;
}

export function AICoachChat({ hasNewMessages, onOpen }: AICoachChatProps) {
  const { role, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isManager = role === 'manager' || role === 'admin';
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

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
            userRole: role,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to connect to AI coach');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Add empty assistant message to update
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
    } catch (error) {
      console.error('AI Coach error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
      // Remove the empty assistant message on error
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
        onClick={() => {
          setIsOpen(true);
          onOpen?.();
        }}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
          isManager 
            ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30' 
            : 'bg-green-600 hover:bg-green-500 shadow-green-500/30'
        } ${hasNewMessages ? 'animate-pulse ring-4 ring-primary/50' : ''}`}
        aria-label="Open AI Coach"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {hasNewMessages && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
            <span className="w-2 h-2 bg-white rounded-full" />
          </span>
        )}
        {!hasNewMessages && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
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
      <div className={`bg-card border rounded-xl shadow-2xl flex flex-col overflow-hidden ${
        isManager ? 'border-blue-500/30 shadow-blue-500/10' : 'border-green-500/30 shadow-green-500/10'
      }`}>
        {/* Header */}
        <div className={`p-4 flex items-center justify-between ${
          isManager ? 'bg-blue-600' : 'bg-green-600'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Summit AI Coach</h3>
              <p className="text-xs text-white/80">
                {isManager ? 'Leadership Mode' : 'Rookie Training'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
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
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/95">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className={`w-12 h-12 mx-auto mb-3 ${isManager ? 'text-blue-500' : 'text-green-500'}`} />
                  <p className="text-foreground font-semibold mb-1">Hey {firstName}!</p>
                  <p className="text-muted-foreground text-sm">
                    {isManager 
                      ? "What should we work on today? Recruiting, team development, or daily execution?"
                      : "Ready to sharpen your skills? Let's practice your pitch or work through objections."
                    }
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {isManager ? (
                      <>
                        <button
                          onClick={() => setInput("What should I focus on today?")}
                          className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-full hover:bg-blue-500/20 transition-colors"
                        >
                          Today's priorities
                        </button>
                        <button
                          onClick={() => setInput("Help me with a recruiting conversation")}
                          className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-full hover:bg-blue-500/20 transition-colors"
                        >
                          Recruiting help
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setInput("Let's practice my pitch")}
                          className="text-xs px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full hover:bg-green-500/20 transition-colors"
                        >
                          Practice pitch
                        </button>
                        <button
                          onClick={() => setInput("How do I handle 'I need to think about it'?")}
                          className="text-xs px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full hover:bg-green-500/20 transition-colors"
                        >
                          Handle objections
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === 'user' 
                      ? 'bg-muted' 
                      : isManager ? 'bg-blue-500/20' : 'bg-green-500/20'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Bot className={`w-4 h-4 ${isManager ? 'text-blue-400' : 'text-green-400'}`} />
                    )}
                  </div>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-muted text-foreground'
                      : 'bg-card border border-border text-foreground'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.content === '' && (
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isManager ? 'bg-blue-500/20' : 'bg-green-500/20'
                  }`}>
                    <Loader2 className={`w-4 h-4 animate-spin ${isManager ? 'text-blue-400' : 'text-green-400'}`} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-card">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isManager ? "Ask about leadership, recruiting..." : "Ask about pitch, objections..."}
                  className="flex-1 bg-muted text-foreground text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                  className={isManager ? 'bg-blue-600 hover:bg-blue-500' : 'bg-green-600 hover:bg-green-500'}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}