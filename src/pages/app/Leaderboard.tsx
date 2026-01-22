import { useState } from "react";
import { Trophy, Medal, Award, Mountain, BookOpen, Phone, Users, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  { id: "5", name: "Taylor Brown", role: "rookie", trainingCompletion: 45, callAttendance: 75, roleplayParticipation: 50, weeklyScore: 170 },
  { id: "6", name: "Sarah Chen", role: "vet", trainingCompletion: 100, callAttendance: 100, roleplayParticipation: 100, weeklyScore: 300 },
  { id: "7", name: "Emily Rodriguez", role: "vet", trainingCompletion: 95, callAttendance: 100, roleplayParticipation: 80, weeklyScore: 275 },
  { id: "8", name: "Marcus Williams", role: "vet", trainingCompletion: 100, callAttendance: 100, roleplayParticipation: 100, weeklyScore: 300 },
  { id: "9", name: "David Kim", role: "vet", trainingCompletion: 90, callAttendance: 75, roleplayParticipation: 90, weeklyScore: 255 },
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-5 h-5 text-yellow-400" />;
    case 2:
      return <Award className="w-5 h-5 text-slate-300" />;
    case 3:
      return <Medal className="w-5 h-5 text-orange-400" />;
    default:
      return <span className="text-sm text-muted-foreground font-bold">#{rank}</span>;
  }
};

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState("rookie");
  
  // Get current user role from localStorage (mock)
  const userRole = (localStorage.getItem("userRole") || "vet") as Role;
  const isVet = userRole === "vet";

  // Filter based on role visibility rules
  // Rookies see only rookies, Vets see everyone
  const rookieData = [...mockWeeklyLeaderboard]
    .filter(r => r.role === "rookie")
    .sort((a, b) => b.weeklyScore - a.weeklyScore);
  
  const vetData = [...mockWeeklyLeaderboard]
    .filter(r => r.role === "vet")
    .sort((a, b) => b.weeklyScore - a.weeklyScore);

  const renderLeaderboard = (data: LeaderboardEntry[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 text-muted-foreground font-medium w-16">Rank</th>
            <th className="text-left py-3 text-muted-foreground font-medium">Name</th>
            <th className="text-center py-3 text-muted-foreground font-medium">
              <div className="flex items-center justify-center gap-1">
                <BookOpen className="w-3 h-3" /> Training
              </div>
            </th>
            <th className="text-center py-3 text-muted-foreground font-medium">
              <div className="flex items-center justify-center gap-1">
                <Phone className="w-3 h-3" /> Calls
              </div>
            </th>
            <th className="text-center py-3 text-muted-foreground font-medium">
              <div className="flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> Roleplay
              </div>
            </th>
            <th className="text-right py-3 text-muted-foreground font-medium">Score</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rep, index) => (
            <tr 
              key={rep.id} 
              className={`border-b border-border/50 ${index < 3 ? "bg-warning/5" : ""}`}
            >
              <td className="py-4">
                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                  {getRankIcon(index + 1)}
                </div>
              </td>
              <td className="py-4">
                <span className="font-medium text-foreground">{rep.name}</span>
              </td>
              <td className="py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-16 progress-track">
                    <div className="progress-fill" style={{ width: `${rep.trainingCompletion}%` }} />
                  </div>
                  <span className="text-muted-foreground text-xs w-8">{rep.trainingCompletion}%</span>
                </div>
              </td>
              <td className="py-4 text-center">
                <span className={`text-sm ${rep.callAttendance === 100 ? "text-success" : "text-muted-foreground"}`}>
                  {rep.callAttendance}%
                </span>
              </td>
              <td className="py-4 text-center">
                <span className={`text-sm ${rep.roleplayParticipation >= 75 ? "text-success" : "text-muted-foreground"}`}>
                  {rep.roleplayParticipation}%
                </span>
              </td>
              <td className="py-4 text-right">
                <span className="text-lg font-bold text-foreground">{rep.weeklyScore}</span>
                <span className="text-xs text-muted-foreground ml-1">pts</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header role={userRole} />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <Mountain className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Weekly Leaderboard</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Resets every Monday
              </p>
            </div>
          </div>
        </div>

        {/* Scoring Explanation */}
        <div className="card-elevated p-6 mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-lg font-bold text-foreground mb-4">How Scoring Works</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="font-bold text-foreground">Training</span>
              </div>
              <p className="text-sm text-muted-foreground">Complete lessons and quizzes. Max 100 pts.</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-success" />
                <span className="font-bold text-foreground">Call Attendance</span>
              </div>
              <p className="text-sm text-muted-foreground">Join Tuesday & Thursday calls. Max 100 pts.</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-warning" />
                <span className="font-bold text-foreground">Roleplay</span>
              </div>
              <p className="text-sm text-muted-foreground">Participate in Wednesday practice. Max 100 pts.</p>
            </div>
          </div>
        </div>

        {/* Rankings */}
        <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Rankings</h2>
              <TabsList>
                <TabsTrigger value="rookie">Rookies</TabsTrigger>
                {isVet && <TabsTrigger value="vet">Vets</TabsTrigger>}
              </TabsList>
            </div>
            <TabsContent value="rookie">
              {renderLeaderboard(rookieData)}
            </TabsContent>
            {isVet && (
              <TabsContent value="vet">
                {renderLeaderboard(vetData)}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
