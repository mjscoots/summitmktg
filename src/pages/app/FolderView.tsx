import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock, CheckCircle, Circle, Clock } from "lucide-react";
import Header from "@/components/Header";
import { 
  allFolders,
  calculateFolderProgress,
  getLessonStatus,
  mockUsers,
  type UserProgress,
  type Role
} from "@/data/mockData";

interface FolderViewProps {
  role?: Role;
}

const FolderView = ({ role = "rookie" }: FolderViewProps) => {
  const navigate = useNavigate();
  const { folderId } = useParams();
  
  const folder = allFolders.find(f => f.id === folderId);
  
  // Mock current user
  const currentUser = mockUsers.find(u => u.role === role) || mockUsers[0];
  const userProgress: UserProgress[] = currentUser.progress;

  if (!folder) {
    return (
      <div className="min-h-screen bg-background">
        <Header role={role} />
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-muted-foreground">Folder not found</p>
          <button onClick={() => navigate("/app/training")} className="btn-primary mt-4">
            Back to Training
          </button>
        </div>
      </div>
    );
  }

  const progress = calculateFolderProgress(folder, userProgress);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "in_progress":
        return <Circle className="w-5 h-5 text-primary" />;
      case "not_started":
        return <Circle className="w-5 h-5 text-muted-foreground" />;
      case "locked":
        return <Lock className="w-5 h-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role={role} />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate("/app/training")}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Training
        </button>

        {/* Folder Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{folder.title}</h1>
              <p className="text-muted-foreground mt-1">{folder.description}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {progress.completed}/{progress.total} lessons
              </p>
            </div>
          </div>
          <div className="mt-4 progress-track">
            <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{progress.percentage}% complete</p>
        </div>

        {/* Lessons List */}
        <div className="space-y-2">
          {folder.lessons.map((lesson, index) => {
            const previousCompleted = index === 0 || 
              userProgress.some(p => p.lessonId === folder.lessons[index - 1].id && p.status === "completed");
            const status = getLessonStatus(lesson, userProgress, previousCompleted, index === 0);
            const isLocked = status === "locked";

            return (
              <button
                key={lesson.id}
                onClick={() => !isLocked && navigate(`/app/training/${folder.id}/${lesson.id}`)}
                disabled={isLocked}
                className={`w-full p-4 rounded-lg text-left transition-all flex items-center gap-4 animate-fade-in ${
                  isLocked 
                    ? "bg-card/50 opacity-50 cursor-not-allowed border border-border" 
                    : status === "completed"
                    ? "bg-success/5 border border-success/20 hover:border-success/40"
                    : "bg-card hover:bg-muted border border-border"
                }`}
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                {getStatusIcon(status)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">
                    {index + 1}. {lesson.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lesson.duration}
                    </span>
                    {isLocked && (
                      <span>Locked until previous lessons are completed</span>
                    )}
                  </div>
                </div>
                {status === "completed" && (
                  <span className="text-xs font-medium text-success">Completed</span>
                )}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default FolderView;
