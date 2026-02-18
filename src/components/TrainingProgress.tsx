import { useNavigate } from "react-router-dom";
import { Target, Play, ChevronRight, Lock, CheckCircle, Circle } from "lucide-react";
import { 
  getFoldersForRole, 
  calculateFolderProgress,
  type UserProgress,
  type Role,
  type TrainingFolder
} from "@/data/mockData";

interface TrainingProgressProps {
  role: Role;
  userProgress: UserProgress[];
  canSkip?: boolean; // Vets can skip foundational modules
}

const TrainingProgress = ({ role, userProgress, canSkip = false }: TrainingProgressProps) => {
  const navigate = useNavigate();
  const folders = getFoldersForRole(role);

  // Find current folder and lesson
  const getCurrentTraining = () => {
    for (const folder of folders) {
      const progress = calculateFolderProgress(folder, userProgress);
      if (progress.percentage < 100) {
        const currentLesson = folder.lessons.find(lesson => 
          !userProgress.some(p => p.lessonId === lesson.id && p.status === "completed")
        );
        return { folder, lesson: currentLesson, progress };
      }
    }
    return null;
  };

  const currentTraining = getCurrentTraining();

  // Calculate overall progress
  const totalLessons = folders.reduce((acc, f) => acc + f.lessons.length, 0);
  const completedLessons = userProgress.filter(p => p.status === "completed").length;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Determine folder status
  const getFolderState = (folder: TrainingFolder, index: number) => {
    const progress = calculateFolderProgress(folder, userProgress);
    const isComplete = progress.percentage === 100;
    const previousComplete = index === 0 || 
      calculateFolderProgress(folders[index - 1], userProgress).percentage === 100;
    const isLocked = !previousComplete && !canSkip;
    const isCurrent = !isComplete && previousComplete;

    return { progress, isComplete, isLocked, isCurrent };
  };

  return (
    <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: "0.15s" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-success" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">Your Training Progress</h2>
          <p className="text-sm text-muted-foreground">{overallProgress}% complete</p>
        </div>
      </div>
      
      {/* Overall Progress Bar */}
      <div className="progress-track h-3 mb-4">
        <div 
          className="progress-fill h-3" 
          style={{ width: `${overallProgress}%` }} 
        />
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-secondary/50">
          <p className="text-2xl font-bold text-foreground">{completedLessons}</p>
          <p className="text-sm text-muted-foreground">Lessons completed</p>
        </div>
        <div className="p-4 rounded-lg bg-secondary/50">
          <p className="text-2xl font-bold text-foreground">{totalLessons - completedLessons}</p>
          <p className="text-sm text-muted-foreground">Lessons remaining</p>
        </div>
      </div>

      {/* GET TO TRAINING Button */}
      <button
        onClick={() => currentTraining 
          ? navigate(`/app/training/${currentTraining.folder.id}`) 
          : navigate("/app/training")
        }
        className="w-full py-4 rounded-lg bg-success hover:bg-success/90 text-success-foreground font-bold text-lg flex items-center justify-center gap-3 transition-colors mb-6"
      >
        <Play className="w-5 h-5" />
        GET TO TRAINING
      </button>

      {/* Module List */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Training Chapters
        </p>
        {folders.map((folder, index) => {
          const { progress, isComplete, isLocked, isCurrent } = getFolderState(folder, index);
          
          return (
            <button
              key={folder.id}
              onClick={() => !isLocked && navigate(`/app/training/${folder.id}`)}
              disabled={isLocked}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                isLocked
                  ? "opacity-50 cursor-not-allowed bg-muted/30"
                  : isCurrent
                  ? "bg-primary/10 border border-primary/30 hover:bg-primary/20"
                  : isComplete
                  ? "bg-success/5 hover:bg-success/10"
                  : "bg-secondary/50 hover:bg-secondary"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isComplete
                  ? "bg-success text-success-foreground"
                  : isLocked
                  ? "bg-muted text-muted-foreground"
                  : isCurrent
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}>
                {isComplete ? (
                  <CheckCircle className="w-4 h-4" />
                ) : isLocked ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${
                  isLocked ? "text-muted-foreground" : "text-foreground"
                }`}>
                  {folder.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 progress-track h-1.5 max-w-24">
                    <div className="progress-fill h-1.5" style={{ width: `${progress.percentage}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
              </div>
              {!isLocked && (
                <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
                  isCurrent ? "text-primary" : "text-muted-foreground"
                }`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TrainingProgress;
