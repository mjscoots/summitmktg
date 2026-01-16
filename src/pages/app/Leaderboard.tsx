import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Medal, Award, Mountain, Users, BookOpen, UserPlus } from "lucide-react";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock leaderboard data - replace with real data later
const mockLeaderboardData = [
  { id: "1", name: "Alex Johnson", role: "rookie", trainingCompletion: 100, referrals: 5, status: "gold" },
  { id: "2", name: "Sarah Miller", role: "rookie", trainingCompletion: 100, referrals: 3, status: "silver" },
  { id: "3", name: "Mike Chen", role: "rookie", trainingCompletion: 100, referrals: 2, status: "silver" },
  { id: "4", name: "Jordan Lee", role: "rookie", trainingCompletion: 85, referrals: 1, status: "bronze" },
  { id: "5", name: "Taylor Swift", role: "rookie", trainingCompletion: 70, referrals: 0, status: "none" },
  { id: "6", name: "Chris Brown", role: "rookie", trainingCompletion: 60, referrals: 1, status: "bronze" },
  { id: "7", name: "Marcus Williams", role: "vet", trainingCompletion: 100, referrals: 8, status: "gold" },
  { id: "8", name: "Jessica Davis", role: "vet", trainingCompletion: 100, referrals: 5, status: "gold" },
  { id: "9", name: "David Kim", role: "vet", trainingCompletion: 90, referrals: 3, status: "silver" },
  { id: "10", name: "Emily Turner", role: "vet", trainingCompletion: 75, referrals: 2, status: "bronze" },
];

const statusConfig = {
  bronze: { label: "Bronze", color: "bg-orange-900/20 text-orange-400 border-orange-500/30", icon: Medal },
  silver: { label: "Silver", color: "bg-slate-400/20 text-slate-300 border-slate-400/30", icon: Award },
  gold: { label: "Gold", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Trophy },
  none: { label: "-", color: "bg-muted text-muted-foreground", icon: null },
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("rookie");
  
  // Get current user role from localStorage (mock)
  const userRole = localStorage.getItem("userRole") || "vet";
  const isManager = userRole === "vet";

  const sortedData = [...mockLeaderboardData].sort((a, b) => {
    if (b.trainingCompletion !== a.trainingCompletion) {
      return b.trainingCompletion - a.trainingCompletion;
    }
    return b.referrals - a.referrals;
  });

  const rookieData = sortedData.filter(r => r.role === "rookie");
  const vetData = sortedData.filter(r => r.role === "vet");

  const renderLeaderboard = (data: typeof mockLeaderboardData) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 text-muted-foreground font-medium">Rank</th>
            <th className="text-left py-3 text-muted-foreground font-medium">Name</th>
            <th className="text-left py-3 text-muted-foreground font-medium">Training</th>
            <th className="text-left py-3 text-muted-foreground font-medium">Referrals</th>
            <th className="text-left py-3 text-muted-foreground font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rep, index) => {
            const status = statusConfig[rep.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;
            const needsTraining = rep.trainingCompletion < 80;
            
            return (
              <tr key={rep.id} className="border-b border-border/50">
                <td className="py-4">
                  <span className={`font-bold ${index < 3 ? "text-primary" : "text-muted-foreground"}`}>
                    #{index + 1}
                  </span>
                </td>
                <td className="py-4">
                  <span className="font-medium text-foreground">{rep.name}</span>
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 progress-track">
                      <div className="progress-fill" style={{ width: `${rep.trainingCompletion}%` }} />
                    </div>
                    <span className="text-muted-foreground">{rep.trainingCompletion}%</span>
                    {needsTraining && (
                      <span className="text-xs text-warning">Needs training</span>
                    )}
                  </div>
                </td>
                <td className="py-4 text-muted-foreground">{rep.referrals}</td>
                <td className="py-4">
                  {StatusIcon ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${status.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header role={userRole as "rookie" | "vet"} />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 animate-fade-in">
          <Mountain className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
        </div>

        {/* Status Ladder Explanation */}
        <div className="card-elevated p-6 mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-lg font-bold text-foreground mb-4">Status Ladder</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-orange-500/30 bg-orange-900/10">
              <div className="flex items-center gap-2 mb-2">
                <Medal className="w-5 h-5 text-orange-400" />
                <span className="font-bold text-orange-400">Bronze</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <BookOpen className="w-3 h-3" /> Pitch learned
                </li>
                <li className="flex items-center gap-2">
                  <UserPlus className="w-3 h-3" /> 1 rep referred
                </li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-slate-400/30 bg-slate-400/10">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-slate-300" />
                <span className="font-bold text-slate-300">Silver</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <BookOpen className="w-3 h-3" /> Manual read
                </li>
                <li className="flex items-center gap-2">
                  <UserPlus className="w-3 h-3" /> 3 reps referred
                </li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-yellow-400">Gold</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <BookOpen className="w-3 h-3" /> Blitz completed
                </li>
                <li className="flex items-center gap-2">
                  <UserPlus className="w-3 h-3" /> 5 reps referred
                </li>
              </ul>
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
                {isManager && <TabsTrigger value="vet">Vets</TabsTrigger>}
              </TabsList>
            </div>
            <TabsContent value="rookie">
              {renderLeaderboard(rookieData)}
            </TabsContent>
            {isManager && (
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
