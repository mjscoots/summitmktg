import { useNavigate } from "react-router-dom";
import { Target, CheckCircle, Clock } from "lucide-react";
import Header from "@/components/Header";
import { 
  getFoldersForRole, 
  calculateFolderProgress,
  mockUsers,
  type UserProgress,
  type Role
} from "@/data/mockData";

interface MyProgressProps {
  role?: Role;
}

const MyProgress = ({ role = "rookie" }: MyProgressProps) => {
  const navigate = useNavigate();
  
  // Mock current user
  const currentUser = mockUsers.find(u => u.role === role) || mockUsers[0];
  const userProgress: UserProgress[] = currentUser.progress;
  
  const folders = getFoldersForRole(role);

  // Calculate stats
  const totalLessons = folders.reduce((acc, f) => acc + f.lessons.length, 0);
  const completedLessons = userProgress.filter(p => p.status === "completed").length;
  const inProgressLessons = userProgress.filter(p => p.status === "in_progress").length;
  const overallProgress = Math.round((completedLessons / totalLessons) * 100);

  const completedFolders = folders.filter(folder => {
    const progress = calculateFolderProgress(folder, userProgress);
    return progress.percentage === 100;
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <Header role={role} />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">My Progress</h1>
          <p className="text-muted-foreground mt-1">Track your training completion</p>
        </div>

        {/* Progress Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in">
          <div className="card-elevated p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{overallProgress}%</p>
            <p className="text-sm text-muted-foreground mt-1">Overall</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-3xl font-bold text-success">{completedLessons}</p>
            <p className="text-sm text-muted-foreground mt-1">Completed</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-3xl font-bold text-primary">{inProgressLessons}</p>
            <p className="text-sm text-muted-foreground mt-1">In Progress</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{completedFolders}/{folders.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Modules</p>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="card-elevated p-6 mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Overall Progress</h2>
          </div>
          <div className="progress-track h-3">
            <div className="progress-fill h-3" style={{ width: `${overallProgress}%` }} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {completedLessons} of {totalLessons} lessons completed
          </p>
        </div>

        {/* Module-by-Module Progress */}
        <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-lg font-bold text-foreground mb-4">Module Progress</h2>
          <div className="space-y-4">
            {folders.map((folder) => {
              const progress = calculateFolderProgress(folder, userProgress);
              const isComplete = progress.percentage === 100;

              return (
                <button
                  key={folder.id}
                  onClick={() => navigate(`/app/training/${folder.id}`)}
                  className="w-full p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : progress.completed > 0 ? (
                        <Clock className="w-5 h-5 text-primary" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className="font-medium text-foreground">{folder.title}</span>
                      {folder.roleVisibility === "vet" && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                          Vet
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {progress.completed}/{progress.total}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyProgress;
