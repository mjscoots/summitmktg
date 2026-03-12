import { useState, useEffect, useRef } from 'react';
import { Reply, Copy, Pin, PinOff, Pencil, Trash2, SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const QUICK_REACTIONS = ['🔥', '💰', '🧠', '👍', '❤️', '😂'];

interface MessageContextMenuProps {
  messageId: string;
  isOwn: boolean;
  isManager: boolean;
  isPinned: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  messageContent: string;
}

export function MessageContextMenu({
  messageId,
  isOwn,
  isManager,
  isPinned,
  position,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onPin,
  messageContent,
}: MessageContextMenuProps) {
  const { user } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showFullEmoji, setShowFullEmoji] = useState(false);

  useEffect(() => {
    if (!position) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [position, onClose]);

  if (!position) return null;

  const reactingRef = useRef(false);
  const handleReact = async (emoji: string) => {
    if (!user || reactingRef.current) return;
    reactingRef.current = true;
    onClose();
    try {
      const { data: existing } = await supabase
        .from('chat_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();
      if (existing) {
        await supabase.from('chat_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('chat_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
      }
    } catch {
      // silent
    } finally {
      reactingRef.current = false;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent);
    toast.success('Copied');
    onClose();
  };

  // Adjust position to stay in viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 220),
    top: Math.min(position.y, window.innerHeight - 300),
    zIndex: 100,
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[99] bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      <div ref={menuRef} style={style} className="z-[100] animate-scale-in">
        {/* Quick reactions row */}
        <div className="flex items-center gap-1 p-1.5 bg-card/95 backdrop-blur-xl border border-border/40 rounded-full shadow-2xl mb-1.5">
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/80 text-lg transition-all hover:scale-125 active:scale-90"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setShowFullEmoji(!showFullEmoji)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/80 text-muted-foreground transition-all"
          >
            <SmilePlus className="w-4 h-4" />
          </button>
        </div>

        {/* Action menu */}
        <div className="bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl overflow-hidden min-w-[200px]">
          <MenuItem icon={<Reply className="w-4 h-4" />} label="Reply" onClick={() => { onReply(); onClose(); }} />
          <MenuItem icon={<Copy className="w-4 h-4" />} label="Copy" onClick={handleCopy} />
          {isManager && (
            <MenuItem
              icon={isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              label={isPinned ? 'Unpin' : 'Pin'}
              onClick={() => { onPin(); onClose(); }}
            />
          )}
          {isOwn && (
            <MenuItem icon={<Pencil className="w-4 h-4" />} label="Edit" onClick={() => { onEdit(); onClose(); }} />
          )}
          {(isOwn || isManager) && (
            <MenuItem
              icon={<Trash2 className="w-4 h-4" />}
              label="Delete"
              onClick={() => { onDelete(); onClose(); }}
              destructive
            />
          )}
        </div>
      </div>
    </>
  );
}

function MenuItem({ icon, label, onClick, destructive }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
        "border-b border-border/20 last:border-0",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-muted/60"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
