import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  ChevronDown, 
  ChevronRight, 
  Book, 
  FileText, 
  HelpCircle, 
  Video, 
  Save, 
  Loader2, 
  Plus,
  Trash2,
  ArrowLeft,
  GripVertical,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Lazy load the rich text editor to avoid SSR issues
const RichTextEditor = lazy(() => import('@/components/admin/RichTextEditor').then(m => ({ default: m.RichTextEditor })));

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  target_role: string | null;
  display_order: number;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  display_order: number;
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  video_url: string | null;
  key_takeaways: string[] | null;
  module_id: string;
  display_order: number;
}

interface QuizQuestion {
  id: string;
  lesson_id: string;
  question_text: string;
  question_type: string;
  options: { id: string; text: string }[];
  correct_answer: string;
  explanation: string | null;
  display_order: number;
}

type EditorView = 'courses' | 'lesson' | 'quiz';

export default function AdminTrainingEditor() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Selection state
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // Editor state
  const [editorView, setEditorView] = useState<EditorView>('courses');
  const [editingContent, setEditingContent] = useState('');
  const [editingVideoUrl, setEditingVideoUrl] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTakeaways, setEditingTakeaways] = useState<string[]>([]);
  
  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Admin access required');
      navigate('/app');
      return;
    }
    fetchCourses();
  }, [isAdmin, navigate]);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('training_courses')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModulesAndLessons = async (courseId: string) => {
    try {
      const { data: modulesData } = await supabase
        .from('training_modules')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('display_order');
      
      setModules(modulesData || []);
      
      const moduleIds = (modulesData || []).map(m => m.id);
      if (moduleIds.length > 0) {
        const { data: lessonsData } = await supabase
          .from('training_lessons')
          .select('*')
          .in('module_id', moduleIds)
          .eq('is_active', true)
          .order('display_order');
        
        setLessons(lessonsData || []);
      } else {
        setLessons([]);
      }
    } catch (err) {
      console.error('Error fetching modules:', err);
    }
  };

  const fetchQuizQuestions = async (lessonId: string) => {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('display_order');
      
      if (error) throw error;
      setQuizQuestions((data || []).map(q => ({
        ...q,
        options: (q.options as any) || [],
        explanation: q.explanation || null,
      })));
    } catch (err) {
      console.error('Error fetching quiz questions:', err);
    }
  };

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedModuleId(null);
    setSelectedLesson(null);
    setEditorView('courses');
    fetchModulesAndLessons(courseId);
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setEditingContent(lesson.content);
    setEditingVideoUrl(lesson.video_url || '');
    setEditingTitle(lesson.title);
    setEditingTakeaways(lesson.key_takeaways || []);
    setEditorView('lesson');
    fetchQuizQuestions(lesson.id);
  };

  const handleSaveLesson = async () => {
    if (!selectedLesson) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('training_lessons')
        .update({
          title: editingTitle,
          content: editingContent,
          video_url: editingVideoUrl || null,
          key_takeaways: editingTakeaways.filter(t => t.trim()),
        })
        .eq('id', selectedLesson.id);
      
      if (error) throw error;
      
      toast.success('Lesson saved!');
      
      // Update local state
      setLessons(prev => prev.map(l => 
        l.id === selectedLesson.id 
          ? { ...l, title: editingTitle, content: editingContent, video_url: editingVideoUrl, key_takeaways: editingTakeaways }
          : l
      ));
      setSelectedLesson({
        ...selectedLesson,
        title: editingTitle,
        content: editingContent,
        video_url: editingVideoUrl,
        key_takeaways: editingTakeaways,
      });
    } catch (err) {
      console.error('Error saving lesson:', err);
      toast.error('Failed to save lesson');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQuestion = async (question: QuizQuestion) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .update({
          question_text: question.question_text,
          options: question.options,
          correct_answer: question.correct_answer,
          explanation: question.explanation,
        })
        .eq('id', question.id);
      
      if (error) throw error;
      
      toast.success('Question saved!');
      setQuizQuestions(prev => prev.map(q => q.id === question.id ? question : q));
      setEditingQuestionId(null);
    } catch (err) {
      console.error('Error saving question:', err);
      toast.error('Failed to save question');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedLesson) return;
    
    try {
      const newOrder = quizQuestions.length;
      const { data, error } = await supabase
        .from('quiz_questions')
        .insert({
          lesson_id: selectedLesson.id,
          question_text: 'New Question',
          question_type: 'multiple_choice',
          options: [
            { id: 'a', text: 'Option A' },
            { id: 'b', text: 'Option B' },
            { id: 'c', text: 'Option C' },
            { id: 'd', text: 'Option D' },
          ],
          correct_answer: 'a',
          display_order: newOrder,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setQuizQuestions(prev => [...prev, {
        ...data,
        options: data.options as any,
        explanation: null,
      }]);
      setEditingQuestionId(data.id);
      toast.success('Question added!');
    } catch (err) {
      console.error('Error adding question:', err);
      toast.error('Failed to add question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', questionId);
      
      if (error) throw error;
      
      setQuizQuestions(prev => prev.filter(q => q.id !== questionId));
      toast.success('Question deleted');
    } catch (err) {
      console.error('Error deleting question:', err);
      toast.error('Failed to delete question');
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-60px)]">
        {/* Left Sidebar - Course/Module/Lesson Tree */}
        <div className="w-72 border-r border-border bg-card overflow-y-auto">
          <div className="p-4 border-b border-border">
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Dashboard</span>
            </button>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Book className="w-5 h-5 text-primary" />
              Training CMS
            </h2>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Crown className="w-3 h-3 text-primary" />
              Admin Content Editor
            </p>
          </div>
          
          {/* Course List */}
          <div className="p-2">
            {courses.map(course => (
              <div key={course.id} className="mb-2">
                <button
                  onClick={() => handleSelectCourse(course.id)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                    selectedCourseId === course.id 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <Book className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{course.title}</span>
                </button>
                
                {/* Modules for selected course */}
                {selectedCourseId === course.id && modules.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1">
                    {modules.map(module => (
                      <div key={module.id}>
                        <button
                          onClick={() => toggleModule(module.id)}
                          className={cn(
                            "w-full flex items-center gap-1.5 p-1.5 rounded text-left transition-colors",
                            "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {expandedModules.has(module.id) ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          <span className="text-xs truncate">{module.title}</span>
                        </button>
                        
                        {/* Lessons */}
                        {expandedModules.has(module.id) && (
                          <div className="ml-4 mt-1 space-y-0.5">
                            {lessons
                              .filter(l => l.module_id === module.id)
                              .map(lesson => (
                                <button
                                  key={lesson.id}
                                  onClick={() => handleSelectLesson(lesson)}
                                  className={cn(
                                    "w-full flex items-center gap-1.5 p-1.5 rounded text-left transition-colors",
                                    selectedLesson?.id === lesson.id
                                      ? "bg-primary/10 text-primary"
                                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  <FileText className="w-3 h-3 flex-shrink-0" />
                                  <span className="text-xs truncate">{lesson.title}</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Main Editor Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedLesson ? (
            <div className="text-center py-20 text-muted-foreground">
              <Book className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a lesson from the sidebar to edit</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Lesson Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{selectedLesson.title}</h1>
                  <p className="text-sm text-muted-foreground">Editing lesson content and quiz</p>
                </div>
                <Button onClick={handleSaveLesson} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
              
              {/* Tab Buttons */}
              <div className="flex gap-2 border-b border-border pb-2">
                <button
                  onClick={() => setEditorView('lesson')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-t-md transition-colors",
                    editorView === 'lesson' 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Content
                </button>
                <button
                  onClick={() => setEditorView('quiz')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-t-md transition-colors",
                    editorView === 'quiz' 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <HelpCircle className="w-4 h-4 inline mr-2" />
                  Quiz ({quizQuestions.length})
                </button>
              </div>
              
              {/* Lesson Content Editor */}
              {editorView === 'lesson' && (
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Lesson Title</label>
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      placeholder="Enter lesson title..."
                    />
                  </div>
                  
                  {/* Video URL */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
                      <Video className="w-4 h-4 text-primary" />
                      Video URL (YouTube/Vimeo)
                    </label>
                    <Input
                      value={editingVideoUrl}
                      onChange={(e) => setEditingVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                    {editingVideoUrl && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Video will appear at top of lesson
                      </p>
                    )}
                  </div>
                  
                  {/* Content - Rich Text Editor */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Lesson Content</label>
                    <Suspense fallback={
                      <div className="min-h-[400px] flex items-center justify-center bg-muted rounded-lg border">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    }>
                      <RichTextEditor
                        value={editingContent}
                        onChange={setEditingContent}
                        placeholder="Enter lesson content with rich formatting..."
                        minHeight="400px"
                      />
                    </Suspense>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use the toolbar for formatting. Supports images, videos, and links.
                    </p>
                  </div>
                  
                  {/* Key Takeaways */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Key Takeaways</label>
                    {editingTakeaways.map((takeaway, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          value={takeaway}
                          onChange={(e) => {
                            const newTakeaways = [...editingTakeaways];
                            newTakeaways[index] = e.target.value;
                            setEditingTakeaways(newTakeaways);
                          }}
                          placeholder={`Takeaway ${index + 1}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTakeaways(prev => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTakeaways(prev => [...prev, ''])}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Takeaway
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Quiz Editor */}
              {editorView === 'quiz' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {quizQuestions.length} question{quizQuestions.length !== 1 ? 's' : ''} • 100% required to pass
                    </p>
                    <Button onClick={handleAddQuestion} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </div>
                  
                  {quizQuestions.length === 0 ? (
                    <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-border">
                      <HelpCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground mb-3">No quiz questions yet</p>
                      <Button onClick={handleAddQuestion}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Question
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quizQuestions.map((question, index) => (
                        <QuizQuestionEditor
                          key={question.id}
                          question={question}
                          index={index}
                          isEditing={editingQuestionId === question.id}
                          onEdit={() => setEditingQuestionId(question.id)}
                          onSave={handleSaveQuestion}
                          onDelete={() => handleDeleteQuestion(question.id)}
                          onCancel={() => setEditingQuestionId(null)}
                          isSaving={isSaving}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// Quiz Question Editor Component
function QuizQuestionEditor({
  question,
  index,
  isEditing,
  onEdit,
  onSave,
  onDelete,
  onCancel,
  isSaving,
}: {
  question: QuizQuestion;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (q: QuizQuestion) => void;
  onDelete: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [editQuestion, setEditQuestion] = useState(question);

  useEffect(() => {
    setEditQuestion(question);
  }, [question]);

  const handleOptionChange = (optionId: string, newText: string) => {
    setEditQuestion(prev => ({
      ...prev,
      options: prev.options.map(opt => 
        opt.id === optionId ? { ...opt, text: newText } : opt
      ),
    }));
  };

  const handleSetCorrect = (optionId: string) => {
    setEditQuestion(prev => ({ ...prev, correct_answer: optionId }));
  };

  if (!isEditing) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-xs font-bold text-primary mt-1">{index + 1}.</span>
            <div className="flex-1">
              <p className="font-medium text-foreground mb-2">{question.question_text}</p>
              <div className="space-y-1">
                {question.options.map(opt => (
                  <div 
                    key={opt.id}
                    className={cn(
                      "text-sm px-2 py-1 rounded",
                      opt.id === question.correct_answer 
                        ? "bg-success/10 text-success font-medium" 
                        : "text-muted-foreground"
                    )}
                  >
                    {opt.id.toUpperCase()}) {opt.text}
                    {opt.id === question.correct_answer && " ✓"}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border-2 border-primary rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold text-primary">Question {index + 1}</span>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1.5">Question Text</label>
        <Textarea
          value={editQuestion.question_text}
          onChange={(e) => setEditQuestion(prev => ({ ...prev, question_text: e.target.value }))}
          placeholder="Enter question..."
          className="min-h-[80px]"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1.5">Answer Options</label>
        <div className="space-y-2">
          {editQuestion.options.map(opt => (
            <div key={opt.id} className="flex items-center gap-2">
              <button
                onClick={() => handleSetCorrect(opt.id)}
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold",
                  editQuestion.correct_answer === opt.id
                    ? "border-success bg-success text-white"
                    : "border-muted-foreground text-muted-foreground hover:border-primary"
                )}
              >
                {opt.id.toUpperCase()}
              </button>
              <Input
                value={opt.text}
                onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                placeholder={`Option ${opt.id.toUpperCase()}`}
                className="flex-1"
              />
              {editQuestion.correct_answer === opt.id && (
                <span className="text-xs text-success font-medium">Correct</span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1.5">Explanation (shown after wrong answer)</label>
        <Textarea
          value={editQuestion.explanation || ''}
          onChange={(e) => setEditQuestion(prev => ({ ...prev, explanation: e.target.value }))}
          placeholder="Explain the correct answer..."
          className="min-h-[60px]"
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(editQuestion)} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Question
        </Button>
      </div>
    </div>
  );
}
