import { useState } from 'react';
import { Check, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CopyLinkButtonProps {
  /** Path starting with "/" — will be joined with current origin. */
  path: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function CopyLinkButton({ path, label = 'Copy link', className, size = 'sm' }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied', { description: url });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface text-muted-foreground transition-all duration-180 hover:border-primary/30 hover:bg-primary/[0.06] hover:text-foreground',
        size === 'sm' ? 'min-h-9 px-3 text-xs font-semibold' : 'min-h-11 px-3.5 text-sm font-semibold',
        className
      )}
      aria-label={label}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <LinkIcon className="w-3.5 h-3.5" />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}
