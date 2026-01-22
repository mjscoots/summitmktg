import Header from "@/components/Header";
import AnnouncementsPanel from "@/components/AnnouncementsPanel";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import TrainingProgress from "@/components/TrainingProgress";
import DashboardLeaderboard from "@/components/DashboardLeaderboard";
import { mockUsers, type UserProgress } from "@/data/mockData";

const RookieDashboard = () => {
  // Mock current user - in production this would come from auth
  const currentUser = mockUsers.find(u => u.role === "rookie") || mockUsers[0];
  const userProgress: UserProgress[] = currentUser.progress;

  return (
    <div className="min-h-screen bg-background">
      <Header role="rookie" />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* TOP ROW: Announcements + Weekly Calendar */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* LEFT: Announcements */}
          <div className="card-elevated p-5 animate-fade-in">
            <AnnouncementsPanel role="rookie" />
          </div>

          {/* RIGHT: Weekly Calendar */}
          <div className="card-elevated p-5 animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <WeeklyCalendar />
          </div>
        </div>

        {/* SECTION 2: Training Progress */}
        <div className="mb-6">
          <TrainingProgress role="rookie" userProgress={userProgress} canSkip={false} />
        </div>

        {/* SECTION 3: Weekly Leaderboard */}
        <DashboardLeaderboard userRole="rookie" />
      </main>
    </div>
  );
};

export default RookieDashboard;
