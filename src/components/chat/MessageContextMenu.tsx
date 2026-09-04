import { useState, useEffect, useRef } from 'react';
import { Reply, Copy, Pin, PinOff, Pencil, Trash2, SmilePlus, Download } from 'lucide-react';
import { getChatAttachmentUrl } from '@/lib/chatAttachments';
import { mediaPathsFor, saveAttachment } from '@/lib/chatMedia';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const QUICK_REACTIONS = ['🔥', '💪', '😂', '👏', '❄️', '💯'];


interface MessageContextMenuProps {
  messageId: string;
  isOwn: boolean;
  isManager: boolean;
  /** Owner and admin may edit or delete any message in any room. */
  canModerate?: boolean;
  isPinned: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  /** Same optimistic path the bubble uses, so a reaction shows at once. */
  onToggleReaction: (msgId: string, emoji: string) => void;
  messageContent: string;
}

export function MessageContextMenu({
  messageId,
  isOwn,
  isManager,
  canModerate = false,
  isPinned,
  position,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onToggleReaction,
  messageContent,
}: MessageContextMenuProps) {
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


  const handleReact = (emoji: string) => {
    onToggleReaction(messageId, emoji);
    onClose();
  };


  const savePaths = mediaPathsFor(messageContent);

  const handleSave = async () => {
    onClose();
    try {
      for (const path of savePaths) {
        const signed = await getChatAttachmentUrl(path);
        if (!signed) continue;
        await saveAttachment(signed, path.split('/').pop() || 'attachment');
      }
    } catch {
      toast.error('Could not save that');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent);
    toast.success('Copied');
    onClose();
  };

  // Adjust position so both the react row and the menu stay in the viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.max(8, Math.min(position.x, window.innerWidth - 348)),
    top: Math.min(position.y, window.innerHeight - 300),
    zIndex: 100,
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[99] bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      <div ref={menuRef} style={style} className="z-[100] animate-scale-in">
        {/* Quick reactions row */}
        <div className="mb-1.5 flex items-center gap-0.5 rounded-full border border-border/40 bg-card/95 p-1 shadow-2xl backdrop-blur-xl">
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              aria-label={`React ${emoji}`}
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg transition-all hover:bg-muted/80 hover:scale-110 active:scale-90"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setShowFullEmoji(!showFullEmoji)}
            aria-label="More reactions"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-muted/80"
          >
            <SmilePlus className="w-4 h-4" />
          </button>

        </div>

        {/* Action menu */}
        <div className="bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl overflow-hidden min-w-[200px]">
          <MenuItem icon={<Reply className="w-4 h-4" />} label="Reply" onClick={() => { onReply(); onClose(); }} />
          <MenuItem icon={<Copy className="w-4 h-4" />} label="Copy" onClick={handleCopy} />
          {savePaths.length > 0 && (
            <MenuItem icon={<Download className="w-4 h-4" />} label="Save" onClick={handleSave} />
          )}
          {isManager && (
            <MenuItem
              icon={isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              label={isPinned ? 'Unpin' : 'Pin'}
              onClick={() => { onPin(); onClose(); }}
            />
          )}
          {(isOwn || canModerate) && (
            <MenuItem icon={<Pencil className="w-4 h-4" />} label="Edit" onClick={() => { onEdit(); onClose(); }} />
          )}
          {(isOwn || canModerate) && (
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
