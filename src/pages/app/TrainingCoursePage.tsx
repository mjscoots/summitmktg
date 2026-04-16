import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChevronRight, CheckCircle2, Lock, PlayCircle, ArrowLeft, Pencil, Mic, RotateCcw } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Module {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  display_order: number;
  completed: boolean;
  quiz_passed: boolean;
  requires_pitch_approval?: boolean;
  pitch_status?: 'pending' | 'approved' | 'rejected' | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  target_role: 'rookie' | 'manager' | 'admin' | 'owner' | null;
}

// Rookie courses always show green
const ROOKIE_COURSES = ['learn-your-pitch', 'summer-sales-manual', 'training-videos'];

const isLessonSatisfied = (lesson: Lesson) => {
  // Pitch upload is optional — completion is the only gate
  return lesson.completed;
};

export default function TrainingCoursePage() {
  const { courseSlug } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  // Admin quick-edit state
  const [editingLesson, setEditingLesson] = useState<{ id: string; title: string; content: string; video_url: string } | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  // Manual re-read tracking
  const [manualReadCount, setManualReadCount] = useState(0);
  const [showRereadCelebration, setShowRereadCelebration] = useState(false);

  const isAdmin = role === 'admin' || role === 'owner';
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  const isRookieCourse = course ? (ROOKIE_COURSES.includes(course.slug) || course.target_role === null) : true;
  const accentColor = isRookieCourse ? 'green' : 'blue';

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!user || !courseSlug) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: courseData, error: courseError } = await supabase
          .from('training_courses')
          .select('*')
          .eq('slug', courseSlug)
          .eq('is_active', true)
          .maybeSingle();

        if (courseError || !courseData) {
          console.error('Course not found:', courseError);
          navigate('/app/training');
          return;
        }

        setCourse(courseData);

        // Fetch modules with nested lessons in a single query
        const { data: modulesData, error: modulesError } = await supabase
          .from('training_modules')
          .select(`
            id, title, description, display_order,
            training_lessons (id, title, display_order, requires_pitch_approval)
          `)
          .eq('course_id', courseData.id)
          .eq('is_active', true)
          .eq('training_lessons.is_active', true)
          .order('display_order');

        if (modulesError) {
          console.error('Error fetching modules:', modulesError);
          return;
        }

        // Collect all lesson IDs and batch-fetch progress in one query
        const allLessonIds = (modulesData || []).flatMap(
          m => (m.training_lessons || []).map(l => l.id)
        );

        let progressMap = new Map<string, { completed_at: string | null; quiz_passed: boolean }>();
        if (allLessonIds.length > 0) {
          const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('lesson_id, completed_at, quiz_passed')
            .eq('user_id', user.id)
            .in('lesson_id', allLessonIds);

          progressMap = new Map(
            (progressData || []).map(p => [p.lesson_id, p])
          );
        }

        // Fetch pitch approval statuses for lessons that require them
        const pitchLessonIds = (modulesData || []).flatMap(
          m => (m.training_lessons || []).filter(l => l.requires_pitch_approval).map(l => l.id)
        );
        let pitchMap = new Map<string, string>();
        if (pitchLessonIds.length > 0) {
          const { data: pitchData } = await supabase
            .from('pitch_approval_requests')
            .select('lesson_id, status')
            .eq('user_id', user.id)
            .in('lesson_id', pitchLessonIds)
            .order('attempt_number', { ascending: false });
          // Only keep the latest status per lesson
          (pitchData || []).forEach(p => {
            if (!pitchMap.has(p.lesson_id)) pitchMap.set(p.lesson_id, p.status);
          });
        }

        const modulesWithLessons = (modulesData || []).map(module => {
          const sortedLessons = [...(module.training_lessons || [])].sort(
            (a, b) => a.display_order - b.display_order
          );
          const lessons = sortedLessons.map(lesson => ({
            ...lesson,
            completed: progressMap.has(lesson.id) && !!progressMap.get(lesson.id)!.completed_at,
            quiz_passed: progressMap.has(lesson.id) && !!progressMap.get(lesson.id)!.quiz_passed,
            pitch_status: lesson.requires_pitch_approval
              ? (pitchMap.get(lesson.id) as 'pending' | 'approved' | 'rejected' | undefined) || null
              : null,
          }));
          return { ...module, lessons };
        });

        setModules(modulesWithLessons);

        // Auto-expand the current (first incomplete, unlocked) module
        for (let i = 0; i < modulesWithLessons.length; i++) {
          const m = modulesWithLessons[i];
          const mComplete = m.lessons.every(isLessonSatisfied);
          const prevIncomplete = i > 0 && modulesWithLessons[i - 1].lessons.some(l => !isLessonSatisfied(l));
          if (!mComplete && !prevIncomplete) {
            setExpandedModuleId(m.id);
            break;
          }
        }

        const totalLessons = modulesWithLessons.reduce((sum, m) => sum + m.lessons.length, 0);
        const completedLessons = modulesWithLessons.reduce(
          (sum, m) => sum + m.lessons.filter(isLessonSatisfied).length,
          0
        );
        setOverallProgress(totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, [courseSlug, user, navigate]);

  // Manual re-read tracking for summer-sales-manual
  const isManualCourse = courseSlug === 'summer-sales-manual';
  
  const handleManualRereadComplete = useCallback(async () => {
    if (!user || !isManualCourse) return;
    
    // Record new completion
    const newCount = manualReadCount + 1;
    await supabase.from('manual_read_completions').insert({
      user_id: user.id,
      course_slug: 'summer-sales-manual',
      completion_number: newCount,
    });
    
    // Reset all lesson progress for this course's lessons
    const allLessonIds = modules.flatMap(m => m.lessons.map(l => l.id));
    if (allLessonIds.length > 0) {
      for (const lid of allLessonIds) {
        await supabase
          .from('lesson_progress')
          .update({ completed_at: null, quiz_passed: false, quiz_score: null })
          .eq('user_id', user.id)
          .eq('lesson_id', lid);
      }
    }
    
    setManualReadCount(newCount);
    setShowRereadCelebration(true);
    toast.success(`Manual completed for the ${newCount}${newCount === 1 ? 'st' : newCount === 2 ? 'nd' : newCount === 3 ? 'rd' : 'th'} time! 🎉`);
    
    // Reload page to show reset progress
    window.location.reload();
  }, [user, isManualCourse, manualReadCount, modules]);

  // Fetch manual read count and check for completion
  useEffect(() => {
    if (!user || !isManualCourse) return;
    
    const fetchReadCount = async () => {
      const { data } = await supabase
        .from('manual_read_completions')
        .select('completion_number')
        .eq('user_id', user.id)
        .eq('course_slug', 'summer-sales-manual')
        .order('completion_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      setManualReadCount(data?.completion_number || 0);
    };
    
    fetchReadCount();
  }, [user, isManualCourse]);

  // Check if manual course just hit 100% and auto-trigger re-read
  useEffect(() => {
    if (!isManualCourse || overallProgress !== 100 || modules.length === 0 || !user) return;
    
    // Check if this completion was already recorded
    const checkAndRecord = async () => {
      const { data } = await supabase
        .from('manual_read_completions')
        .select('completion_number')
        .eq('user_id', user.id)
        .eq('course_slug', 'summer-sales-manual')
        .order('completion_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const currentCount = data?.completion_number || 0;
      
      // Only auto-complete if progress is 100% and we haven't recorded it yet
      // We use a simple heuristic: if all lessons show completed but count hasn't incremented
      const allComplete = modules.every(m => m.lessons.every(l => l.quiz_passed));
      if (allComplete && currentCount === manualReadCount) {
        handleManualRereadComplete();
      }
    };
    
    checkAndRecord();
  }, [overallProgress, isManualCourse, modules, user]);

  const handleEditLesson = async (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { data } = await supabase
      .from('training_lessons')
      .select('id, title, content, video_url')
      .eq('id', lessonId)
      .single();
    if (data) {
      setEditingLesson({ id: data.id, title: data.title, content: data.content, video_url: data.video_url || '' });
      setEditTitle(data.title);
      setEditContent(data.content);
      setEditVideoUrl(data.video_url || '');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingLesson) return;
    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from('training_lessons')
        .update({ title: editTitle.trim(), content: editContent, video_url: editVideoUrl.trim() || null })
        .eq('id', editingLesson.id);
      if (error) throw error;
      // Update local state
      setModules(prev => prev.map(m => ({
        ...m,
        lessons: m.lessons.map(l => l.id === editingLesson.id ? { ...l, title: editTitle.trim() } : l)
      })));
      setEditingLesson(null);
      toast.success('Lesson updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-xl text-foreground mb-4">Course not found</h1>
          <button 
            onClick={() => navigate('/app/training')}
            className={cn(
              "hover:underline",
              isRookieCourse ? "text-primary" : "text-blue-400"
            )}
          >
            Back to Training
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <PageBackButton to="/app/training" label="Training" />

        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">
              {course.title.replace(' (Management Edition)', '')}
            </h1>
            <span className={cn(
              "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border",
              isRookieCourse 
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-blue-500/15 text-blue-400 border-blue-500/30"
            )}>
              {isRookieCourse ? 'ROOKIE' : 'MANAGER'}
            </span>
            {/* Manual re-read counter badge */}
            {isManualCourse && manualReadCount > 0 && (
              <Badge className="bg-primary/15 text-primary border-primary/30 font-bold text-xs">
                <RotateCcw className="w-3 h-3 mr-1" />
                {manualReadCount}x Read
              </Badge>
            )}
          </div>
          {course.description && (
            <p className="text-muted-foreground">{course.description}</p>
          )}
          
          {/* Overall Progress */}
          <div className="mt-4 p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Overall Progress</span>
              <span className={cn(
                "text-sm font-medium",
                isRookieCourse ? "text-primary" : "text-blue-400"
              )}>{overallProgress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  isRookieCourse ? "bg-primary" : "bg-blue-500"
                )}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modules List */}
        <div className="space-y-6">
          {modules.map((module, moduleIndex) => {
            const moduleProgress = module.lessons.length > 0
              ? Math.round((module.lessons.filter(isLessonSatisfied).length / module.lessons.length) * 100)
              : 0;
            
            const isModuleComplete = moduleProgress === 100;
            const prevModule = moduleIndex > 0 ? modules[moduleIndex - 1] : null;
            const isModuleLocked = moduleIndex > 0 && !!prevModule?.lessons.some(l => !isLessonSatisfied(l));

            const isCurrentModule = !isModuleLocked && !isModuleComplete && 
              (moduleIndex === 0 || !modules[moduleIndex - 1].lessons.some(l => !isLessonSatisfied(l)));

            const isExpanded = expandedModuleId === module.id;

            const handleModuleClick = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (isModuleLocked) return;
              // Toggle accordion
              setExpandedModuleId(isExpanded ? null : module.id);
            };

            return (
              <div 
                key={module.id}
                className={cn(
                  "bg-card rounded-lg border transition-all",
                  isModuleLocked 
                    ? 'border-border opacity-40 grayscale cursor-not-allowed' 
                    : isModuleComplete
                      ? 'border-border/50 opacity-60'
                      : isCurrentModule
                        ? isRookieCourse
                          ? 'border-primary/50 ring-1 ring-green-500/20 shadow-[0_0_15px_-5px_rgba(34,197,94,0.15)]'
                          : 'border-blue-500/50 ring-1 ring-blue-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.15)]'
                        : isRookieCourse
                          ? 'border-border hover:border-primary/30'
                          : 'border-border hover:border-blue-500/30'
                )}
              >
                {/* Module Header - Clickable */}
                <div 
                  onClick={handleModuleClick}
                  className={cn(
                    "p-4 transition-colors",
                    isExpanded && "border-b border-border",
                    isCurrentModule && "bg-muted/30",
                    !isModuleLocked && "cursor-pointer hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-sm font-medium px-2 py-0.5 rounded",
                        isModuleComplete
                          ? "text-muted-foreground bg-muted/50"
                          : isRookieCourse 
                            ? "text-primary bg-primary/10"
                            : "text-blue-400 bg-blue-500/10"
                      )}>
                        {isModuleComplete ? '✓' : `Chapter ${moduleIndex + 1}`}
                      </span>
                      <h3 className={cn(
                        "font-semibold",
                        isModuleComplete ? "text-muted-foreground" : "text-foreground"
                      )}>{module.title}</h3>
                      {isCurrentModule && (
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse",
                          isRookieCourse 
                            ? "bg-primary/15 text-primary"
                            : "bg-blue-500/15 text-blue-400"
                        )}>
                          CONTINUE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {moduleProgress}%
                      </span>
                      {isModuleLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                      {!isModuleLocked && (
                        <ChevronRight className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          isExpanded && "rotate-90",
                          isCurrentModule 
                            ? isRookieCourse ? "text-primary" : "text-blue-400"
                            : "text-muted-foreground"
                        )} />
                      )}
                    </div>
                  </div>
                  {module.description && (
                    <p className="text-sm text-muted-foreground mt-2">{module.description}</p>
                  )}
                </div>

                {/* Lessons - Accordion */}
                {isExpanded && !isModuleLocked && (
                <div className="divide-y divide-border">
                  {module.lessons.map((lesson, lessonIndex) => {
                     const isLessonComplete = isLessonSatisfied(lesson);
                     const prevLesson = lessonIndex > 0 ? module.lessons[lessonIndex - 1] : null;
                      const prevLessonComplete = prevLesson ? isLessonSatisfied(prevLesson) : true;
                     const isLessonLocked = isModuleLocked || 
                       (lessonIndex > 0 && !prevLessonComplete);
                    
                     const isCurrentLesson = !isLessonLocked && !isLessonComplete && prevLessonComplete;

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => !isLessonLocked && navigate(`/app/training/${courseSlug}/${lesson.id}`)}
                        disabled={isLessonLocked}
                        className={cn(
                          "w-full p-4 flex items-center justify-between text-left transition-all",
                          isLessonLocked 
                            ? 'cursor-not-allowed opacity-40' 
                            : isLessonComplete
                              ? 'opacity-60 hover:opacity-80 cursor-pointer'
                              : isCurrentLesson
                                ? cn(
                                    'cursor-pointer',
                                    isRookieCourse 
                                      ? 'bg-primary/5 hover:bg-primary/10' 
                                      : 'bg-blue-500/5 hover:bg-blue-500/10'
                                  )
                                : 'hover:bg-muted/50 cursor-pointer'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {isLessonComplete ? (
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                          ) : isLessonLocked ? (
                            <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          ) : isCurrentLesson ? (
                            <PlayCircle className={cn(
                              "w-5 h-5 flex-shrink-0 animate-pulse",
                              isRookieCourse ? "text-primary" : "text-blue-400"
                            )} />
                          ) : (
                            <PlayCircle className={cn(
                              "w-5 h-5 flex-shrink-0",
                              isRookieCourse ? "text-primary/60" : "text-blue-400/60"
                            )} />
                          )}
                          <span className={cn(
                            "text-sm",
                            isLessonComplete
                              ? 'text-muted-foreground line-through decoration-muted-foreground/30' 
                              : isLessonLocked 
                                ? 'text-muted-foreground'
                                : isCurrentLesson
                                  ? 'text-foreground font-medium'
                                  : 'text-foreground'
                          )}>
                            {lesson.title}
                          </span>
                          {/* Pitch approval status badge */}
                          {lesson.requires_pitch_approval && lesson.quiz_passed && (
                            <span className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-1",
                              lesson.pitch_status === 'approved'
                                ? "bg-primary/15 text-primary"
                                : lesson.pitch_status === 'pending'
                                  ? "bg-primary/15 text-primary"
                                  : lesson.pitch_status === 'rejected'
                                    ? "bg-destructive/15 text-destructive"
                                    : "bg-primary/15 text-primary"
                            )}>
                              {lesson.pitch_status === 'approved' ? '🎤 Approved' 
                                : lesson.pitch_status === 'pending' ? '🎤 Pending'
                                : lesson.pitch_status === 'rejected' ? '🎤 Re-record'
                                : '🎤 Required'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <button
                              onClick={(e) => handleEditLesson(lesson.id, e)}
                              className="p-1 rounded border border-border bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit lesson"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          {!isLessonLocked && (
                            <ChevronRight className={cn(
                              "w-4 h-4",
                              isCurrentLesson 
                                ? isRookieCourse ? "text-primary" : "text-blue-400"
                                : "text-muted-foreground"
                            )} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Admin Quick Edit Modal */}
      <Dialog open={!!editingLesson} onOpenChange={(open) => !open && setEditingLesson(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Lesson</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Video URL</label>
              <Input value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Content (Markdown)</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={12}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingLesson(null)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={isSavingEdit || !editTitle.trim()}>
                {isSavingEdit ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
