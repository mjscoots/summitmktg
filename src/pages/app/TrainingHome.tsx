import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, Lock, CheckCircle, Clock } from "lucide-react";
import Header from "@/components/Header";
import { 
  getFoldersForRole, 
  calculateFolderProgress,
  getFolderStatus,
  mockUsers,
  type UserProgress,
  type Role
} from "@/data/mockData";

interface TrainingHomeProps {
  role?: Role;
}

const TrainingHome = ({ role = "rookie" }: TrainingHomeProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get("filter");
  
  // Mock current user
  const currentUser = mockUsers.find(u => u.role === role) || mockUsers[0];
  const userProgress: UserProgress[] = currentUser.progress;
  
  let folders = getFoldersForRole(role);
  
  // Apply filter if specified
  if (filter === "rookie") {
    folders = folders.filter(f => f.roleVisibility === "both");
  } else if (filter === "vet") {
    folders = folders.filter(f => f.roleVisibility === "vet");
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "in_progress":
        return <Clock className="w-5 h-5 text-primary" />;
      case "locked":
        return <Lock className="w-5 h-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="status-complete px-2 py-1 rounded text-xs font-medium">Complete</span>;
      case "in_progress":
        return <span className="status-progress px-2 py-1 rounded text-xs font-medium">In Progress</span>;
      case "locked":
        return <span className="status-locked px-2 py-1 rounded text-xs font-medium">Locked</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header role={role} />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Training</h1>
          <p className="text-muted-foreground mt-1">
            {role === "vet" ? "All training chapters" : "Your assigned training chapters"}
          </p>
        </div>

        {/* Filter tabs for vet */}
        {role === "vet" && (
          <div className="flex gap-2 mb-6 animate-fade-in">
            <button
              onClick={() => navigate("/app/training")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !filter ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            <button
              onClick={() => navigate("/app/training?filter=rookie")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === "rookie" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              Rookie
            </button>
            <button
              onClick={() => navigate("/app/training?filter=vet")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === "vet" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              Vet
            </button>
          </div>
        )}

        {/* Folder Cards */}
        <div className="space-y-4">
          {folders.map((folder, index) => {
            const progress = calculateFolderProgress(folder, userProgress);
            const previousCompleted = index === 0 || 
              calculateFolderProgress(folders[index - 1], userProgress).percentage === 100;
            const status = getFolderStatus(folder, userProgress, previousCompleted);
            const isLocked = status === "locked";

            return (
              <button
                key={folder.id}
                onClick={() => !isLocked && navigate(`/app/training/${folder.id}`)}
                disabled={isLocked}
                className={`w-full card-elevated p-6 text-left transition-all animate-fade-in ${
                  isLocked ? "opacity-60 cursor-not-allowed" : "hover:border-primary"
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {getStatusIcon(status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-foreground">{folder.title}</h3>
                        {getStatusBadge(status)}
                        {folder.roleVisibility === "vet" && (
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                            Vet
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {folder.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{folder.lessons.length} lessons</span>
                      </div>
                      {status !== "locked" && (
                        <div className="mt-3">
                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {progress.completed}/{progress.total} completed
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {!isLocked && (
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default TrainingHome;
