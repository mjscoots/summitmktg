import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Link2, BookOpen, Users, Globe, Pencil, Trash2, GripVertical } from 'lucide-react';

interface ManagedLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  target_role: string;
  display_order: number;
  is_active: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  link: Link2,
  book: BookOpen,
  users: Users,
  globe: Globe,
  external: ExternalLink,
};

interface SortableLinkCardProps {
  link: ManagedLink;
  isAdmin: boolean;
  isReordering: boolean;
  onEdit: (link: ManagedLink) => void;
  onDelete: (id: string) => void;
}

export function SortableLinkCard({ link, isAdmin, isReordering, onEdit, onDelete }: SortableLinkCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id, disabled: !isReordering });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const IconComp = ICON_MAP[link.icon || 'link'] || Link2;

  const cardContent = (
    <Card className="p-4 h-full border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary/60 to-primary/10 rounded-l-xl" />
      
      <div className="flex items-start gap-3 pl-2">
        {isReordering && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/60 text-muted-foreground flex-shrink-0 mt-0.5"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0 group-hover:bg-primary/20 transition-colors">
          <IconComp className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {link.title}
            </h3>
            {!isReordering && (
              <ExternalLink className="w-3 h-3 text-muted-foreground/40 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          {link.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{link.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[9px] text-muted-foreground/60">
              {link.target_role === 'all' ? 'Everyone' : link.target_role === 'rookie' ? 'Rookie' : 'Manager'}
            </Badge>
          </div>
        </div>
      </div>

      {isAdmin && !isReordering && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(link); }}
            className="p-1 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(link.id); }}
            className="p-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </Card>
  );

  if (isReordering) {
    return (
      <div ref={setNodeRef} style={style} className="group block">
        {cardContent}
      </div>
    );
  }

  return (
    <a
      ref={setNodeRef}
      style={style}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      {cardContent}
    </a>
  );
}
