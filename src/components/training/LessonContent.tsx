import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface LessonContentProps {
  content: string;
  isRookieCourse?: boolean;
}

/**
 * Premium lesson content renderer
 * Converts markdown to clean, styled HTML with proper typography hierarchy:
 * - H1: 24-30px (page title)
 * - H2: 18-22px (section title)
 * - Body: 14-16px, line-height 1.6
 * - Captions: 12-13px, muted
 */
export function LessonContent({ content, isRookieCourse = true }: LessonContentProps) {
  const processedContent = useMemo(() => {
    let html = content
      // Headers - convert to styled UI headers with proper hierarchy
      // H1: 24-30px, font-semibold (rarely used in content, main title is outside)
      .replace(/^#{1}\s+(.+)$/gm, `<h1 class="text-2xl font-semibold text-foreground mb-4 mt-6 first:mt-0 tracking-tight">$1</h1>`)
      // H2: 18-22px - Section titles with subtle divider
      .replace(/^#{2}\s+(.+)$/gm, `<h2 class="text-lg font-semibold text-foreground mb-3 mt-8 first:mt-0 pb-2 border-b border-border/30">$1</h2>`)
      // H3: 16-18px - Subsection
      .replace(/^#{3}\s+(.+)$/gm, `<h3 class="text-base font-semibold text-foreground mb-2 mt-6">$1</h3>`)
      // H4: 14-16px - Minor heading
      .replace(/^#{4}\s+(.+)$/gm, `<h4 class="text-sm font-semibold text-foreground mb-2 mt-4 uppercase tracking-wide">$1</h4>`)
      
      // Bold text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      
      // Italic text
      .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
      .replace(/_([^_]+)_/g, '<em class="italic">$1</em>')
      
      // Blockquotes - premium styled callout
      .replace(/^>\s*(.+)$/gm, `<blockquote class="border-l-3 ${isRookieCourse ? 'border-green-500/40' : 'border-blue-500/40'} pl-4 my-4 py-1 text-foreground/80 italic text-sm">$1</blockquote>`)
      
      // Horizontal rules - subtle dividers
      .replace(/^---$/gm, '<hr class="border-border/40 my-6">')
      .replace(/^\*\*\*$/gm, '<hr class="border-border/40 my-6">')
      
      // Lists - unordered with tighter spacing
      .replace(/^[-•]\s+(.+)$/gm, `<li class="flex items-start gap-2 mb-1.5 text-sm leading-relaxed"><span class="${isRookieCourse ? 'text-green-400' : 'text-blue-400'} mt-0.5 text-xs">●</span><span class="text-foreground/90">$1</span></li>`)
      
      // Lists - ordered
      .replace(/^(\d+)\.\s+(.+)$/gm, `<li class="flex items-start gap-2 mb-1.5 text-sm leading-relaxed"><span class="${isRookieCourse ? 'text-green-400' : 'text-blue-400'} font-medium min-w-[18px] text-xs">$1.</span><span class="text-foreground/90">$2</span></li>`)
      
      // Wrap consecutive list items
      .replace(/(<li class="flex.*?<\/li>\n?)+/g, '<ul class="my-3 space-y-0">$&</ul>')
      
      // Code/keywords
      .replace(/`([^`]+)`/g, `<code class="px-1 py-0.5 rounded text-xs font-mono ${isRookieCourse ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}">$1</code>`)
      
      // Clean up any remaining # at start of lines
      .replace(/^#+ /gm, '')
      
      // Handle paragraphs - compact spacing
      .replace(/\n\n+/g, '</p><p class="mb-3 text-sm text-foreground/90 leading-relaxed">')
      .replace(/\n/g, '<br/>');
    
    // Wrap in paragraph if needed
    if (!html.startsWith('<h') && !html.startsWith('<p') && !html.startsWith('<ul')) {
      html = `<p class="mb-3 text-sm text-foreground/90 leading-relaxed">${html}</p>`;
    }
    
    // Clean up empty paragraphs and fix nested issues
    html = html
      .replace(/<p class="[^"]*"><\/p>/g, '')
      .replace(/<p class="[^"]*"><br\/><\/p>/g, '')
      .replace(/<br\/><br\/>/g, '</p><p class="mb-3 text-sm text-foreground/90 leading-relaxed">');
    
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'br', 'blockquote', 'hr', 'span', 'div', 'ul', 'ol', 'li', 'code'],
      ALLOWED_ATTR: ['class', 'style'],
    });
  }, [content, isRookieCourse]);

  return (
    <div 
      className={cn(
        "max-w-none",
        // Typography base
        "text-sm leading-relaxed",
        // Remove top margin from first element
        "[&>*:first-child]:mt-0",
        "[&>h1:first-child]:mt-0",
        "[&>h2:first-child]:mt-0",
        "[&>h2:first-child]:border-t-0",
        "[&>p:first-child]:mt-0",
        // Improve list rendering
        "[&>ul]:list-none [&>ul]:pl-0",
      )}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}
