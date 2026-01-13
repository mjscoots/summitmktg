import { useNavigate } from "react-router-dom";
import { ChevronRight, BookOpen, Users, AlertTriangle, Bell } from "lucide-react";
import Header from "@/components/Header";
import { 
  getFoldersForRole, 
  getAnnouncementsForRole, 
  calculateFolderProgress,
  mockUsers,
  type UserProgress 
} from "@/data/mockData";

const VetDashboard = () => {
  const navigate = useNavigate();
  
  // Mock current user - in production this would come from auth
  const currentUser = mockUsers.find(u => u.role === "vet") || mockUsers[1];
  const userProgress: UserProgress[] = currentUser.progress;
  
  const folders = getFoldersForRole("vet");
  const rookieFolders = folders.filter(f => f.roleVisibility === "both");
  const vetOnlyFolders = folders.filter(f => f.roleVisibility === "vet");
  const announcements = getAnnouncementsForRole("vet").slice(0, 3);

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

  // Calculate stalled reps (no activity in 3+ days)
  const stalledReps = mockUsers.filter(user => {
    const daysMatch = user.lastActive.match(/(\d+)\s*days?\s*ago/);
    if (daysMatch) {
      return parseInt(daysMatch[1]) >= 3;
    }
    return false;
  });

  // Get top 5 reps needing attention (lowest progress or stalled)
  const repsNeedingAttention = [...mockUsers]
    .sort((a, b) => {
      const aStalled = stalledReps.includes(a);
      const bStalled = stalledReps.includes(b);
      if (aStalled && !bStalled) return -1;
      if (!aStalled && bStalled) return 1;
      return a.progress.filter(p => p.status === "completed").length - 
             b.progress.filter(p => p.status === "completed").length;
    })
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Header role="vet" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Continue Training Card */}
        {currentTraining && (
          <div className="card-elevated p-6 mb-6 animate-fade-in">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                  Continue Training
                </span>
                <h2 className="text-xl font-bold text-foreground mt-1">
                  {currentTraining.folder.title}
                </h2>
                {currentTraining.lesson && (
                  <p className="text-muted-foreground text-sm mt-1">
                    Next: {currentTraining.lesson.title}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {currentTraining.progress.completed}/{currentTraining.progress.total} lessons
                </p>
              </div>
            </div>
            <div className="progress-track mb-4">
              <div 
                className="progress-fill" 
                style={{ width: `${currentTraining.progress.percentage}%` }} 
              />
            </div>
            <button
              onClick={() => navigate(`/app/training/${currentTraining.folder.id}`)}
              className="btn-primary"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        )}

        {/* Training Library */}
        <div className="card-elevated p-6 mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Training Library</h2>
              <p className="text-sm text-muted-foreground">All available content</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/app/training?filter=rookie")}
              className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
            >
              <p className="font-medium text-foreground">Rookie Training</p>
              <p className="text-sm text-muted-foreground">{rookieFolders.length} modules</p>
            </button>
            <button
              onClick={() => navigate("/app/training?filter=vet")}
              className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
            >
              <p className="font-medium text-foreground">Vet Training</p>
              <p className="text-sm text-muted-foreground">{vetOnlyFolders.length} modules</p>
            </button>
          </div>
          <button
            onClick={() => navigate("/app/training")}
            className="mt-4 text-sm text-primary hover:underline"
          >
            View all training
          </button>
        </div>

        {/* Rep Progress Snapshot */}
        <div className="card-elevated p-6 mb-6 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Rep Progress</h2>
                <p className="text-sm text-muted-foreground">Needs attention</p>
              </div>
            </div>
            {stalledReps.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded">
                <AlertTriangle className="w-3 h-3" />
                {stalledReps.length} stalled
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Rep</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Role</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Progress</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {repsNeedingAttention.map((rep) => {
                  const isStalled = stalledReps.includes(rep);
                  const completedCount = rep.progress.filter(p => p.status === "completed").length;
                  
                  return (
                    <tr key={rep.id} className="border-b border-border/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{rep.name}</span>
                          {isStalled && <AlertTriangle className="w-4 h-4 text-destructive" />}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          rep.role === "rookie" 
                            ? "bg-primary/10 text-primary" 
                            : "bg-success/10 text-success"
                        }`}>
                          {rep.role === "rookie" ? "Rookie" : "Vet"}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{completedCount} lessons</td>
                      <td className={`py-3 ${isStalled ? "text-destructive" : "text-muted-foreground"}`}>
                        {rep.lastActive}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => navigate("/app/reps")}
            className="mt-4 text-sm text-primary hover:underline"
          >
            View all reps
          </button>
        </div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Announcements</h2>
                <p className="text-sm text-muted-foreground">Latest updates</p>
              </div>
            </div>
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-4 rounded-lg bg-secondary/50">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{announcement.title}</p>
                    {announcement.visibility === "vet" && (
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                        Vet
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {announcement.body}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">{announcement.createdAt}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/app/announcements")}
              className="mt-4 text-sm text-primary hover:underline"
            >
              View all announcements
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default VetDashboard;
