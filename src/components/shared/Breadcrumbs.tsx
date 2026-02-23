import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1 text-xs text-muted-foreground mb-3 flex-wrap', className)}
    >
      <Link
        to="/app"
        className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1 min-w-0">
            <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/50" />
            {isLast || !item.to ? (
              <span className={cn(
                'truncate max-w-[180px] sm:max-w-[280px]',
                isLast ? 'text-foreground font-medium' : ''
              )}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.to}
                className="truncate max-w-[180px] sm:max-w-[280px] hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
