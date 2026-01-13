import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Circle, PlayCircle, Clock } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  current: boolean;
}

const mockLessons: Record<string, { title: string; lessons: Lesson[] }> = {
  "1": {
    title: "Sales Fundamentals",
    lessons: [
      { id: "1", title: "Introduction to Sales", duration: "15 min", completed: true, current: false },
      { id: "2", title: "The Sales Mindset", duration: "20 min", completed: true, current: false },
      { id: "3", title: "Understanding Your Customer", duration: "25 min", completed: true, current: false },
      { id: "4", title: "Value Proposition", duration: "18 min", completed: true, current: false },
      { id: "5", title: "Building Trust", duration: "22 min", completed: true, current: false },
      { id: "6", title: "Communication Basics", duration: "20 min", completed: true, current: false },
      { id: "7", title: "Active Listening", duration: "15 min", completed: true, current: false },
      { id: "8", title: "Module Recap", duration: "10 min", completed: true, current: false },
    ],
  },
  "2": {
    title: "Prospecting & Lead Gen",
    lessons: [
      { id: "1", title: "What is Prospecting?", duration: "12 min", completed: true, current: false },
      { id: "2", title: "Ideal Customer Profile", duration: "20 min", completed: true, current: false },
      { id: "3", title: "Finding Leads", duration: "25 min", completed: true, current: false },
      { id: "4", title: "Qualifying Leads", duration: "18 min", completed: true, current: false },
      { id: "5", title: "Cold Outreach", duration: "22 min", completed: false, current: true },
      { id: "6", title: "Building a Pipeline", duration: "20 min", completed: false, current: false },
    ],
  },
};

const Training = () => {
  const navigate = useNavigate();
  const { moduleId } = useParams();
  const moduleData = mockModules[moduleId || "1"] || mockModules["1"];
  const [lessons, setLessons] = useState<Lesson[]>(moduleData.lessons);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(
    lessons.find((l) => l.current) || lessons[0]
  );

  const completedCount = lessons.filter((l) => l.completed).length;
  const progress = Math.round((completedCount / lessons.length) * 100);

  const handleLessonClick = (lesson: Lesson) => {
    if (!lesson.completed && !lesson.current) return;
    setActiveLesson(lesson);
  };

  const handleCompleteLesson = () => {
    if (!activeLesson) return;
    
    setLessons((prev) => {
      const updated = prev.map((l) => {
        if (l.id === activeLesson.id) {
          return { ...l, completed: true, current: false };
        }
        return l;
      });
      
      // Find next incomplete lesson and make it current
      const currentIndex = updated.findIndex((l) => l.id === activeLesson.id);
      if (currentIndex < updated.length - 1) {
        updated[currentIndex + 1].current = true;
        setActiveLesson(updated[currentIndex + 1]);
      }
      
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{moduleData.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {completedCount}/{lessons.length} lessons completed
              </p>
            </div>
            <div className="hidden sm:block w-32">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">{progress}%</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Lesson List */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Lessons
            </h2>
            <div className="space-y-2">
              {lessons.map((lesson, index) => (
                <button
                  key={lesson.id}
                  onClick={() => handleLessonClick(lesson)}
                  disabled={!lesson.completed && !lesson.current}
                  className={`w-full p-4 rounded text-left transition-all ${
                    activeLesson?.id === lesson.id
                      ? "bg-primary/10 border border-primary"
                      : lesson.completed || lesson.current
                      ? "bg-card hover:bg-muted border border-border"
                      : "bg-card/50 opacity-50 cursor-not-allowed border border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {lesson.completed ? (
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    ) : lesson.current ? (
                      <PlayCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {index + 1}. {lesson.title}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {lesson.duration}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            {activeLesson && (
              <div className="card-elevated p-8 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  {activeLesson.completed ? (
                    <span className="status-complete px-2 py-1 rounded text-xs font-medium">
                      Completed
                    </span>
                  ) : (
                    <span className="status-progress px-2 py-1 rounded text-xs font-medium">
                      In Progress
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {activeLesson.duration}
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {activeLesson.title}
                </h2>

                {/* Placeholder content */}
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-6">
                  <div className="text-center">
                    <PlayCircle className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Video content</p>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none mb-8">
                  <p className="text-muted-foreground">
                    This is where the lesson content would appear. It could include video, 
                    text, exercises, or interactive elements. The training modules are 
                    designed to be focused and actionable.
                  </p>
                </div>

                {!activeLesson.completed && (
                  <button onClick={handleCompleteLesson} className="btn-primary">
                    Mark as Complete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const mockModules: Record<string, { title: string; lessons: Lesson[] }> = {
  "1": {
    title: "Sales Fundamentals",
    lessons: [
      { id: "1", title: "Introduction to Sales", duration: "15 min", completed: true, current: false },
      { id: "2", title: "The Sales Mindset", duration: "20 min", completed: true, current: false },
      { id: "3", title: "Understanding Your Customer", duration: "25 min", completed: true, current: false },
      { id: "4", title: "Value Proposition", duration: "18 min", completed: true, current: false },
      { id: "5", title: "Building Trust", duration: "22 min", completed: true, current: false },
      { id: "6", title: "Communication Basics", duration: "20 min", completed: true, current: false },
      { id: "7", title: "Active Listening", duration: "15 min", completed: true, current: false },
      { id: "8", title: "Module Recap", duration: "10 min", completed: true, current: false },
    ],
  },
  "2": {
    title: "Prospecting & Lead Gen",
    lessons: [
      { id: "1", title: "What is Prospecting?", duration: "12 min", completed: true, current: false },
      { id: "2", title: "Ideal Customer Profile", duration: "20 min", completed: true, current: false },
      { id: "3", title: "Finding Leads", duration: "25 min", completed: true, current: false },
      { id: "4", title: "Qualifying Leads", duration: "18 min", completed: true, current: false },
      { id: "5", title: "Cold Outreach", duration: "22 min", completed: false, current: true },
      { id: "6", title: "Building a Pipeline", duration: "20 min", completed: false, current: false },
    ],
  },
};

export default Training;
