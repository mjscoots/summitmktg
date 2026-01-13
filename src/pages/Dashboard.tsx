import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, 
  Trophy, 
  Flame, 
  LogOut, 
  ChevronRight,
  Lock,
  CheckCircle,
  Clock
} from "lucide-react";

interface Module {
  id: string;
  title: string;
  description: string;
  lessons: number;
  completedLessons: number;
  status: "locked" | "in-progress" | "completed";
  duration: string;
}

const mockModules: Module[] = [
  {
    id: "1",
    title: "Sales Fundamentals",
    description: "Master the core principles of successful selling",
    lessons: 8,
    completedLessons: 8,
    status: "completed",
    duration: "2h 30m",
  },
  {
    id: "2",
    title: "Prospecting & Lead Gen",
    description: "Find and qualify your ideal customers",
    lessons: 6,
    completedLessons: 4,
    status: "in-progress",
    duration: "1h 45m",
  },
  {
    id: "3",
    title: "Discovery Calls",
    description: "Ask the right questions, uncover real needs",
    lessons: 5,
    completedLessons: 0,
    status: "locked",
    duration: "1h 20m",
  },
  {
    id: "4",
    title: "Objection Handling",
    description: "Turn pushback into opportunity",
    lessons: 7,
    completedLessons: 0,
    status: "locked",
    duration: "2h",
  },
  {
    id: "5",
    title: "Closing Techniques",
    description: "Seal the deal with confidence",
    lessons: 6,
    completedLessons: 0,
    status: "locked",
    duration: "1h 50m",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [modules] = useState<Module[]>(mockModules);

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons, 0);
  const completedLessons = modules.reduce((acc, m) => acc + m.completedLessons, 0);
  const overallProgress = Math.round((completedLessons / totalLessons) * 100);

  const getStatusIcon = (status: Module["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "in-progress":
        return <Clock className="w-5 h-5 text-primary" />;
      case "locked":
        return <Lock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: Module["status"]) => {
    switch (status) {
      case "completed":
        return <span className="status-complete px-2 py-1 rounded text-xs font-medium">Completed</span>;
      case "in-progress":
        return <span className="status-progress px-2 py-1 rounded text-xs font-medium">In Progress</span>;
      case "locked":
        return <span className="status-locked px-2 py-1 rounded text-xs font-medium">Locked</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">
              Sales<span className="text-gradient">School</span>
            </h1>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
          <div className="card-elevated p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold text-foreground">{overallProgress}%</p>
              </div>
            </div>
            <div className="mt-4 progress-track">
              <div className="progress-fill" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">
                  {completedLessons}/{totalLessons} <span className="text-sm font-normal text-muted-foreground">lessons</span>
                </p>
              </div>
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Streak</p>
                <p className="text-2xl font-bold text-foreground">
                  7 <span className="text-sm font-normal text-muted-foreground">days</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Training Modules */}
        <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-xl font-semibold text-foreground mb-4">Training Modules</h2>
          <div className="space-y-3">
            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => module.status !== "locked" && navigate(`/training/${module.id}`)}
                disabled={module.status === "locked"}
                className={`w-full module-card text-left ${
                  module.status === "locked" ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {getStatusIcon(module.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-foreground">{module.title}</h3>
                        {getStatusBadge(module.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {module.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{module.lessons} lessons</span>
                        <span>{module.duration}</span>
                      </div>
                      {module.status === "in-progress" && (
                        <div className="mt-3">
                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${(module.completedLessons / module.lessons) * 100}%`,
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {module.completedLessons}/{module.lessons} completed
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {module.status !== "locked" && (
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
