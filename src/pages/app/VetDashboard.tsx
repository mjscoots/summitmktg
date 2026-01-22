import { useNavigate } from "react-router-dom";
import { Users, AlertTriangle, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import AnnouncementsPanel from "@/components/AnnouncementsPanel";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import TrainingProgress from "@/components/TrainingProgress";
import DashboardLeaderboard from "@/components/DashboardLeaderboard";
import { mockUsers, type UserProgress } from "@/data/mockData";

const VetDashboard = () => {
  const navigate = useNavigate();
  
  // Mock current user - in production this would come from auth
  const currentUser = mockUsers.find(u => u.role === "vet") || mockUsers[1];
  const userProgress: UserProgress[] = currentUser.progress;

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

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* TOP ROW: Announcements + Weekly Calendar */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* LEFT: Announcements */}
          <div className="card-elevated p-5 animate-fade-in">
            <AnnouncementsPanel role="vet" />
          </div>

          {/* RIGHT: Weekly Calendar */}
          <div className="card-elevated p-5 animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <WeeklyCalendar />
          </div>
        </div>

        {/* SECTION 2: Training Progress */}
        <div className="mb-6">
          <TrainingProgress role="vet" userProgress={userProgress} canSkip={true} />
        </div>

        {/* SECTION 3: Weekly Leaderboard */}
        <div className="mb-6">
          <DashboardLeaderboard userRole="vet" />
        </div>

        {/* VET ONLY: Rep Progress Snapshot */}
        <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: "0.25s" }}>
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
            <div className="flex items-center gap-3">
              {stalledReps.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded">
                  <AlertTriangle className="w-3 h-3" />
                  {stalledReps.length} stalled
                </span>
              )}
              <button
                onClick={() => navigate("/app/reps")}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="w-4 h-4" />
              </button>
            </div>
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
        </div>
      </main>
    </div>
  );
};

export default VetDashboard;
