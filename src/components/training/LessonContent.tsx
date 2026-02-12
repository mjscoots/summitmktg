import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface LessonContentProps {
  content: string;
  isRookieCourse?: boolean;
}

/**
 * Premium lesson content renderer
 * Detects whether content is HTML (from CMS Rich Text Editor) or markdown,
 * and renders accordingly to preserve formatting from admin edits.
 */
export function LessonContent({ content, isRookieCourse = true }: LessonContentProps) {
  const isHtmlContent = useMemo(() => {
    // Detect if content is HTML by checking for common HTML tags
    return /<(h[1-6]|p|ul|ol|li|div|span|strong|em|blockquote|br|img|a|table)\b/i.test(content);
  }, [content]);

  const processedContent = useMemo(() => {
    if (isHtmlContent) {
      // Content is HTML from the CMS Rich Text Editor - render as-is with sanitization
      return DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'b', 'i', 'u', 's', 'br', 'blockquote', 'hr', 'span', 'div', 'ul', 'ol', 'li', 'code', 'pre', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sub', 'sup'],
        ALLOWED_ATTR: ['class', 'style', 'href', 'src', 'alt', 'target', 'rel', 'width', 'height'],
      });
    }

    // Legacy markdown content - apply regex transforms
    let html = content
      .replace(/^#{1}\s+(.+)$/gm, `<h1 class="text-2xl font-semibold text-foreground mb-4 mt-6 first:mt-0 tracking-tight">$1</h1>`)
      .replace(/^#{2}\s+(.+)$/gm, `<h2 class="text-lg font-semibold text-foreground mb-3 mt-8 first:mt-0 pb-2 border-b border-border/30">$1</h2>`)
      .replace(/^#{3}\s+(.+)$/gm, `<h3 class="text-base font-semibold text-foreground mb-2 mt-6">$1</h3>`)
      .replace(/^#{4}\s+(.+)$/gm, `<h4 class="text-sm font-semibold text-foreground mb-2 mt-4 uppercase tracking-wide">$1</h4>`)
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
      .replace(/_([^_]+)_/g, '<em class="italic">$1</em>')
      .replace(/^>\s*(.+)$/gm, `<blockquote class="border-l-3 ${isRookieCourse ? 'border-green-500/40' : 'border-blue-500/40'} pl-4 my-4 py-1 text-foreground/80 italic text-sm">$1</blockquote>`)
      .replace(/^---$/gm, '<hr class="border-border/40 my-6">')
      .replace(/^\*\*\*$/gm, '<hr class="border-border/40 my-6">')
      .replace(/^[-•]\s+(.+)$/gm, `<li class="flex items-start gap-2 mb-1.5 text-sm leading-relaxed"><span class="${isRookieCourse ? 'text-green-400' : 'text-blue-400'} mt-0.5 text-xs">●</span><span class="text-foreground/90">$1</span></li>`)
      .replace(/^(\d+)\.\s+(.+)$/gm, `<li class="flex items-start gap-2 mb-1.5 text-sm leading-relaxed"><span class="${isRookieCourse ? 'text-green-400' : 'text-blue-400'} font-medium min-w-[18px] text-xs">$1.</span><span class="text-foreground/90">$2</span></li>`)
      .replace(/(<li class="flex.*?<\/li>\n?)+/g, '<ul class="my-3 space-y-0">$&</ul>')
      .replace(/`([^`]+)`/g, `<code class="px-1 py-0.5 rounded text-xs font-mono ${isRookieCourse ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}">$1</code>`)
      .replace(/^#+ /gm, '')
      .replace(/\n\n+/g, '</p><p class="mb-3 text-sm text-foreground/90 leading-relaxed">')
      .replace(/\n/g, '<br/>');
    
    if (!html.startsWith('<h') && !html.startsWith('<p') && !html.startsWith('<ul')) {
      html = `<p class="mb-3 text-sm text-foreground/90 leading-relaxed">${html}</p>`;
    }
    
    html = html
      .replace(/<p class="[^"]*"><\/p>/g, '')
      .replace(/<p class="[^"]*"><br\/><\/p>/g, '')
      .replace(/<br\/><br\/>/g, '</p><p class="mb-3 text-sm text-foreground/90 leading-relaxed">');
    
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'br', 'blockquote', 'hr', 'span', 'div', 'ul', 'ol', 'li', 'code'],
      ALLOWED_ATTR: ['class', 'style'],
    });
  }, [content, isRookieCourse, isHtmlContent]);

  return (
    <div 
      className={cn(
        "max-w-none",
        "text-sm leading-relaxed",
        "[&>*:first-child]:mt-0",
        "[&>h1:first-child]:mt-0",
        "[&>h2:first-child]:mt-0",
        "[&>h2:first-child]:border-t-0",
        "[&>p:first-child]:mt-0",
        "[&>ul]:list-none [&>ul]:pl-0",
        // Styling for HTML content from CMS
        isHtmlContent && [
          "[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:mb-4 [&_h1]:mt-6",
          "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-3 [&_h2]:mt-6",
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mb-2 [&_h3]:mt-4",
          "[&_p]:mb-3 [&_p]:text-sm [&_p]:text-foreground/90 [&_p]:leading-relaxed",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:text-sm [&_ul]:text-foreground/90",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:text-sm [&_ol]:text-foreground/90",
          "[&_li]:mb-1 [&_li]:leading-relaxed",
          "[&_blockquote]:border-l-3 [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:text-foreground/80 [&_blockquote]:italic [&_blockquote]:text-sm",
          isRookieCourse 
            ? "[&_blockquote]:border-green-500/40" 
            : "[&_blockquote]:border-blue-500/40",
          "[&_strong]:font-semibold [&_strong]:text-foreground",
          "[&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80",
          "[&_img]:rounded-lg [&_img]:my-4 [&_img]:max-w-full",
        ],
      )}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}
