import { useNavigate } from "react-router-dom";
import { Trophy, Medal, Award, ChevronRight, BookOpen, Phone, Users } from "lucide-react";
import type { Role } from "@/data/mockData";

interface LeaderboardEntry {
  id: string;
  name: string;
  role: Role;
  trainingCompletion: number;
  callAttendance: number;
  roleplayParticipation: number;
  weeklyScore: number;
}

// Mock weekly leaderboard data - resets weekly
const mockWeeklyLeaderboard: LeaderboardEntry[] = [
  { id: "1", name: "Alex Johnson", role: "rookie", trainingCompletion: 100, callAttendance: 100, roleplayParticipation: 100, weeklyScore: 300 },
  { id: "2", name: "Jessica Martinez", role: "rookie", trainingCompletion: 85, callAttendance: 100, roleplayParticipation: 75, weeklyScore: 260 },
  { id: "3", name: "Mike Davis", role: "rookie", trainingCompletion: 70, callAttendance: 50, roleplayParticipation: 50, weeklyScore: 170 },
  { id: "4", name: "James Wilson", role: "rookie", trainingCompletion: 60, callAttendance: 100, roleplayParticipation: 25, weeklyScore: 185 },
  { id: "5", name: "Sarah Chen", role: "vet", trainingCompletion: 100, callAttendance: 100, roleplayParticipation: 100, weeklyScore: 300 },
  { id: "6", name: "Emily Rodriguez", role: "vet", trainingCompletion: 95, callAttendance: 100, roleplayParticipation: 80, weeklyScore: 275 },
  { id: "7", name: "Marcus Williams", role: "vet", trainingCompletion: 100, callAttendance: 100, roleplayParticipation: 100, weeklyScore: 300 },
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-4 h-4 text-yellow-400" />;
    case 2:
      return <Award className="w-4 h-4 text-slate-300" />;
    case 3:
      return <Medal className="w-4 h-4 text-orange-400" />;
    default:
      return <span className="text-xs text-muted-foreground font-bold">#{rank}</span>;
  }
};

interface DashboardLeaderboardProps {
  userRole: Role;
}

const DashboardLeaderboard = ({ userRole }: DashboardLeaderboardProps) => {
  const navigate = useNavigate();

  // Filter based on role visibility
  // Rookies see only rookies, Vets see everyone
  const visibleData = userRole === "rookie"
    ? mockWeeklyLeaderboard.filter(entry => entry.role === "rookie")
    : mockWeeklyLeaderboard;

  // Sort by weekly score
  const sortedData = [...visibleData].sort((a, b) => b.weeklyScore - a.weeklyScore).slice(0, 5);

  return (
    <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Weekly Leaderboard</h2>
            <p className="text-xs text-muted-foreground">Resets every Monday</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/app/leaderboard")}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View all <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 pb-3 border-b border-border">
        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> Training</span>
        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> Calls</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Roleplay</span>
      </div>

      <div className="space-y-2">
        {sortedData.map((entry, index) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              index === 0 ? "bg-warning/5 border border-warning/20" : "bg-secondary/30"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
              {getRankIcon(index + 1)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground text-sm truncate">{entry.name}</span>
                {userRole === "vet" && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    entry.role === "rookie" 
                      ? "bg-primary/10 text-primary" 
                      : "bg-success/10 text-success"
                  }`}>
                    {entry.role === "rookie" ? "R" : "V"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{entry.trainingCompletion}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{entry.callAttendance}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{entry.roleplayParticipation}%</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-foreground">{entry.weeklyScore}</span>
              <p className="text-[10px] text-muted-foreground">pts</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardLeaderboard;
