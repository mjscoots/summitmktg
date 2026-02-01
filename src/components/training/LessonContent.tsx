import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface LessonContentProps {
  content: string;
  isRookieCourse?: boolean;
}

/**
 * Premium lesson content renderer
 * Converts markdown to clean, styled HTML without visible markdown artifacts
 */
export function LessonContent({ content, isRookieCourse = true }: LessonContentProps) {
  const accentColor = isRookieCourse ? 'green' : 'blue';
  
  const processedContent = useMemo(() => {
    let html = content
      // Handle line breaks
      .replace(/\n\n/g, '</p><p class="mb-4 text-foreground/90 leading-relaxed">')
      .replace(/\n/g, '<br/>')
      
      // Headers - convert to styled UI headers (remove # symbols)
      .replace(/^#{1}\s+(.+)$/gm, `<h1 class="text-2xl font-black text-foreground mb-6 mt-8 tracking-tight">$1</h1>`)
      .replace(/^#{2}\s+(.+)$/gm, `<h2 class="text-xl font-bold text-foreground mb-4 mt-8 border-b border-border/40 pb-2">$1</h2>`)
      .replace(/^#{3}\s+(.+)$/gm, `<h3 class="text-lg font-semibold text-foreground mb-3 mt-6">$1</h3>`)
      .replace(/^#{4}\s+(.+)$/gm, `<h4 class="text-base font-semibold text-foreground mb-2 mt-4">$1</h4>`)
      
      // Bold text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
      
      // Italic text
      .replace(/\*(.+?)\*/g, '<em class="italic text-foreground/90">$1</em>')
      .replace(/_(.+?)_/g, '<em class="italic text-foreground/90">$1</em>')
      
      // Emoji preservation (don't strip)
      
      // Blockquotes - premium styled
      .replace(/^>\s*(.+)$/gm, `<blockquote class="border-l-4 ${isRookieCourse ? 'border-green-500/50' : 'border-blue-500/50'} pl-4 my-4 py-2 ${isRookieCourse ? 'bg-green-500/5' : 'bg-blue-500/5'} rounded-r-lg text-foreground/90 italic">$1</blockquote>`)
      
      // Horizontal rules
      .replace(/---/g, '<hr class="border-border/50 my-8">')
      .replace(/\*\*\*/g, '<hr class="border-border/50 my-8">')
      
      // Lists - unordered
      .replace(/^[-•]\s+(.+)$/gm, `<li class="flex items-start gap-2 mb-2"><span class="${isRookieCourse ? 'text-green-400' : 'text-blue-400'} mt-1">•</span><span>$1</span></li>`)
      
      // Lists - ordered (numbered)
      .replace(/^(\d+)\.\s+(.+)$/gm, `<li class="flex items-start gap-2 mb-2"><span class="${isRookieCourse ? 'text-green-400' : 'text-blue-400'} font-semibold min-w-[20px]">$1.</span><span>$2</span></li>`)
      
      // Wrap consecutive list items in ul
      .replace(/(<li class="flex.*?<\/li>\n?)+/g, '<ul class="space-y-1 my-4">$&</ul>')
      
      // Code blocks (backticks)
      .replace(/`([^`]+)`/g, `<code class="px-1.5 py-0.5 rounded ${isRookieCourse ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'} text-sm font-mono">$1</code>`)
      
      // Clean up any remaining # at start of lines (fallback)
      .replace(/^#+ /gm, '');
    
    // Wrap in paragraph if not already structured
    if (!html.startsWith('<h1') && !html.startsWith('<h2') && !html.startsWith('<p')) {
      html = `<p class="mb-4 text-foreground/90 leading-relaxed">${html}</p>`;
    }
    
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'br', 'blockquote', 'hr', 'span', 'div', 'ul', 'ol', 'li', 'code'],
      ALLOWED_ATTR: ['class', 'style'],
    });
  }, [content, isRookieCourse]);

  return (
    <div 
      className={cn(
        "prose prose-invert max-w-none",
        "prose-headings:font-bold prose-headings:tracking-tight",
        "prose-p:leading-relaxed prose-p:text-foreground/90",
        "[&>*:first-child]:mt-0",
        "[&>h1:first-child]:mt-0 [&>h2:first-child]:mt-0",
      )}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}
