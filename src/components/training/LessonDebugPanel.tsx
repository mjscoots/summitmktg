import { useState } from 'react';
import { ChevronDown, ChevronUp, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LessonDebugPanelProps {
  currentTrack: string;
  currentLessonId: string;
  currentLessonTitle: string;
  hasContent: boolean;
  atBottom: boolean;
  scrollProgress: number;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
  isLastLesson: boolean;
  isLastModule: boolean;
  lessonCompleted: boolean;
  canProceed: boolean;
  moduleTitle: string | null;
}

/**
 * Dev-only debug panel for training module troubleshooting
 * Only visible in development mode
 */
export function LessonDebugPanel({
  currentTrack,
  currentLessonId,
  currentLessonTitle,
  hasContent,
  atBottom,
  scrollProgress,
  nextLessonId,
  nextLessonTitle,
  isLastLesson,
  isLastModule,
  lessonCompleted,
  canProceed,
  moduleTitle,
}: LessonDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs font-mono bg-primary/20 text-primary border border-primary/30 rounded-t"
      >
        <Bug className="w-3 h-3" />
        Debug
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>
      
      {isOpen && (
        <div className="bg-card border border-primary/30 border-t-0 rounded-b p-2 text-xs font-mono space-y-1 max-h-60 overflow-y-auto">
          <Row label="Track" value={currentTrack} />
          <Row label="Module" value={moduleTitle || 'N/A'} />
          <Row label="Lesson ID" value={currentLessonId.slice(0, 8) + '...'} />
          <Row label="Title" value={currentLessonTitle.slice(0, 20) + (currentLessonTitle.length > 20 ? '...' : '')} />
          <Row 
            label="hasContent" 
            value={hasContent ? 'true' : 'false'} 
            status={hasContent ? 'success' : 'error'} 
          />
          <Row 
            label="atBottom" 
            value={atBottom ? 'true' : 'false'} 
            status={atBottom ? 'success' : 'warning'} 
          />
          <Row label="scrollProgress" value={`${Math.round(scrollProgress)}%`} />
          <Row 
            label="canProceed" 
            value={canProceed ? 'true' : 'false'} 
            status={canProceed ? 'success' : 'warning'} 
          />
          <Row 
            label="lessonCompleted" 
            value={lessonCompleted ? 'true' : 'false'} 
            status={lessonCompleted ? 'success' : 'neutral'} 
          />
          <Row 
            label="isLastLesson" 
            value={isLastLesson ? 'true' : 'false'} 
          />
          <Row 
            label="isLastModule" 
            value={isLastModule ? 'true' : 'false'} 
          />
          <Row 
            label="nextLesson" 
            value={nextLessonId ? `${nextLessonTitle?.slice(0, 15)}...` : 'none'} 
          />
        </div>
      )}
    </div>
  );
}

function Row({ 
  label, 
  value, 
  status 
}: { 
  label: string; 
  value: string; 
  status?: 'success' | 'error' | 'warning' | 'neutral';
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn(
        status === 'success' && 'text-primary',
        status === 'error' && 'text-primary',
        status === 'warning' && 'text-primary',
        !status && 'text-foreground'
      )}>
        {value}
      </span>
    </div>
  );
}
