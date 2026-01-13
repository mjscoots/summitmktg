import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle, PlayCircle, Clock } from "lucide-react";
import Header from "@/components/Header";
import { 
  allFolders,
  mockUsers,
  type UserProgress,
  type Role
} from "@/data/mockData";

interface LessonViewProps {
  role?: Role;
}

const LessonView = ({ role = "rookie" }: LessonViewProps) => {
  const navigate = useNavigate();
  const { folderId, lessonId } = useParams();
  
  const folder = allFolders.find(f => f.id === folderId);
  const lesson = folder?.lessons.find(l => l.id === lessonId);
  const lessonIndex = folder?.lessons.findIndex(l => l.id === lessonId) ?? -1;
  
  // Mock current user
  const currentUser = mockUsers.find(u => u.role === role) || mockUsers[0];
  const [userProgress, setUserProgress] = useState<UserProgress[]>(currentUser.progress);
  
  const isCompleted = userProgress.some(p => p.lessonId === lessonId && p.status === "completed");
  
  const nextLesson = folder?.lessons[lessonIndex + 1];
  const prevLesson = folder?.lessons[lessonIndex - 1];

  if (!folder || !lesson) {
    return (
      <div className="min-h-screen bg-background">
        <Header role={role} />
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-muted-foreground">Lesson not found</p>
          <button onClick={() => navigate("/app/training")} className="btn-primary mt-4">
            Back to Training
          </button>
        </div>
      </div>
    );
  }

  const handleMarkComplete = () => {
    setUserProgress(prev => {
      const existing = prev.find(p => p.lessonId === lesson.id);
      if (existing) {
        return prev.map(p => 
          p.lessonId === lesson.id 
            ? { ...p, status: "completed" as const, completedAt: new Date().toISOString() }
            : p
        );
      }
      return [...prev, { 
        lessonId: lesson.id, 
        status: "completed" as const, 
        completedAt: new Date().toISOString() 
      }];
    });
  };

  const handleNext = () => {
    if (!isCompleted) {
      handleMarkComplete();
    }
    if (nextLesson) {
      navigate(`/app/training/${folder.id}/${nextLesson.id}`);
    } else {
      navigate(`/app/training/${folder.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role={role} />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/app/training/${folder.id}`)}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {folder.title}
        </button>

        {/* Lesson Content */}
        <div className="card-elevated p-8 animate-fade-in">
          {/* Lesson Header */}
          <div className="flex items-center gap-3 mb-4">
            {isCompleted ? (
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
              {lesson.duration}
            </span>
            <span className="text-xs text-muted-foreground">
              Lesson {lessonIndex + 1} of {folder.lessons.length}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-6">{lesson.title}</h1>

          {/* Video Placeholder */}
          {lesson.contentType === "video" && (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-6">
              <div className="text-center">
                <PlayCircle className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Video content</p>
              </div>
            </div>
          )}

          {/* Lesson Content */}
          <div className="prose prose-invert max-w-none mb-8">
            <p className="text-foreground/80 text-lg leading-relaxed">
              {lesson.content}
            </p>
            
            {/* Placeholder content for demo */}
            <div className="mt-6 p-6 rounded-lg bg-secondary/50 border-l-4 border-primary">
              <p className="text-muted-foreground m-0">
                This is where the full lesson content would appear. It could include 
                detailed explanations, examples, exercises, and key takeaways.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <div>
              {prevLesson && (
                <button
                  onClick={() => navigate(`/app/training/${folder.id}/${prevLesson.id}`)}
                  className="btn-secondary"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {!isCompleted && (
                <button onClick={handleMarkComplete} className="btn-secondary">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Complete
                </button>
              )}
              <button onClick={handleNext} className="btn-primary">
                {nextLesson ? (
                  <>
                    Next Lesson
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Finish Module
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LessonView;
