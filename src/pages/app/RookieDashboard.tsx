import { useNavigate } from "react-router-dom";
import { ChevronRight, BookOpen, Target, Bell } from "lucide-react";
import Header from "@/components/Header";
import { 
  getFoldersForRole, 
  getAnnouncementsForRole, 
  calculateFolderProgress,
  mockUsers,
  type UserProgress 
} from "@/data/mockData";

const RookieDashboard = () => {
  const navigate = useNavigate();
  
  // Mock current user - in production this would come from auth
  const currentUser = mockUsers.find(u => u.role === "rookie") || mockUsers[0];
  const userProgress: UserProgress[] = currentUser.progress;
  
  const folders = getFoldersForRole("rookie");
  const announcements = getAnnouncementsForRole("rookie").slice(0, 3);

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
  const overallProgress = Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="min-h-screen bg-background">
      <Header role="rookie" />

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

        {/* Training Path */}
        <div className="card-elevated p-6 mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Rookie Training Path</h2>
              <p className="text-sm text-muted-foreground">Your assigned modules</p>
            </div>
          </div>
          <div className="space-y-3">
            {folders.slice(0, 4).map((folder) => {
              const progress = calculateFolderProgress(folder, userProgress);
              const isComplete = progress.percentage === 100;
              
              return (
                <button
                  key={folder.id}
                  onClick={() => navigate(`/app/training/${folder.id}`)}
                  className="w-full flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{folder.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="w-24 progress-track">
                        <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {progress.completed}/{progress.total}
                      </span>
                    </div>
                  </div>
                  {isComplete ? (
                    <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded">
                      Complete
                    </span>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => navigate("/app/training")}
            className="mt-4 text-sm text-primary hover:underline"
          >
            View all training
          </button>
        </div>

        {/* Progress Overview */}
        <div className="card-elevated p-6 mb-6 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-success" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Progress Overview</h2>
              <p className="text-sm text-muted-foreground">{overallProgress}% complete</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-2xl font-bold text-foreground">{completedLessons}</p>
              <p className="text-sm text-muted-foreground">Lessons completed</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-2xl font-bold text-foreground">{totalLessons - completedLessons}</p>
              <p className="text-sm text-muted-foreground">Lessons remaining</p>
            </div>
          </div>
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
                  <p className="font-medium text-foreground">{announcement.title}</p>
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

export default RookieDashboard;
