import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Users, AlertTriangle, TrendingUp, Search, ChevronDown, ChevronUp } from "lucide-react";

interface Rep {
  id: string;
  name: string;
  email: string;
  type: "rookie" | "vet";
  progress: number;
  currentModule: string;
  lastActive: string;
  streak: number;
  stalled: boolean;
}

const mockReps: Rep[] = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex@example.com",
    type: "rookie",
    progress: 45,
    currentModule: "Prospecting & Lead Gen",
    lastActive: "2 hours ago",
    streak: 7,
    stalled: false,
  },
  {
    id: "2",
    name: "Sarah Chen",
    email: "sarah@example.com",
    type: "vet",
    progress: 78,
    currentModule: "Objection Handling",
    lastActive: "1 day ago",
    streak: 3,
    stalled: false,
  },
  {
    id: "3",
    name: "Mike Davis",
    email: "mike@example.com",
    type: "rookie",
    progress: 12,
    currentModule: "Sales Fundamentals",
    lastActive: "5 days ago",
    streak: 0,
    stalled: true,
  },
  {
    id: "4",
    name: "Emily Rodriguez",
    email: "emily@example.com",
    type: "vet",
    progress: 92,
    currentModule: "Closing Techniques",
    lastActive: "3 hours ago",
    streak: 14,
    stalled: false,
  },
  {
    id: "5",
    name: "James Wilson",
    email: "james@example.com",
    type: "rookie",
    progress: 28,
    currentModule: "Sales Fundamentals",
    lastActive: "4 days ago",
    streak: 0,
    stalled: true,
  },
];

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [reps] = useState<Rep[]>(mockReps);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"progress" | "lastActive" | "name">("progress");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "rookie" | "vet" | "stalled">("all");

  const stalledCount = reps.filter((r) => r.stalled).length;
  const avgProgress = Math.round(reps.reduce((acc, r) => acc + r.progress, 0) / reps.length);

  const filteredReps = reps
    .filter((rep) => {
      if (filterType === "stalled") return rep.stalled;
      if (filterType !== "all") return rep.type === filterType;
      return true;
    })
    .filter((rep) =>
      rep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "progress") comparison = a.progress - b.progress;
      if (sortBy === "name") comparison = a.name.localeCompare(b.name);
      if (sortBy === "lastActive") comparison = a.lastActive.localeCompare(b.lastActive);
      return sortAsc ? comparison : -comparison;
    });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
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
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
              Manager
            </span>
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
          <div className="card-elevated p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reps</p>
                <p className="text-2xl font-bold text-foreground">{reps.length}</p>
              </div>
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
                <p className="text-2xl font-bold text-foreground">{avgProgress}%</p>
              </div>
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stalled Reps</p>
                <p className="text-2xl font-bold text-foreground">{stalledCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "rookie", "vet", "stalled"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {type === "all" ? "All" : type === "stalled" ? "Stalled" : type.charAt(0).toUpperCase() + type.slice(1) + "s"}
              </button>
            ))}
          </div>
        </div>

        {/* Rep Table */}
        <div className="card-elevated overflow-hidden animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4">
                    <button
                      onClick={() => toggleSort("name")}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Rep
                      {sortBy === "name" && (sortAsc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </button>
                  </th>
                  <th className="text-left p-4 hidden sm:table-cell">
                    <span className="text-sm font-medium text-muted-foreground">Type</span>
                  </th>
                  <th className="text-left p-4">
                    <button
                      onClick={() => toggleSort("progress")}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Progress
                      {sortBy === "progress" && (sortAsc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </button>
                  </th>
                  <th className="text-left p-4 hidden md:table-cell">
                    <span className="text-sm font-medium text-muted-foreground">Current Module</span>
                  </th>
                  <th className="text-left p-4 hidden lg:table-cell">
                    <button
                      onClick={() => toggleSort("lastActive")}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Last Active
                      {sortBy === "lastActive" && (sortAsc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </button>
                  </th>
                  <th className="text-left p-4 hidden lg:table-cell">
                    <span className="text-sm font-medium text-muted-foreground">Streak</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReps.map((rep) => (
                  <tr key={rep.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium text-foreground">
                            {rep.name.split(" ").map((n) => n[0]).join("")}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground flex items-center gap-2">
                            {rep.name}
                            {rep.stalled && (
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{rep.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          rep.type === "rookie"
                            ? "bg-primary/20 text-primary"
                            : "bg-success/20 text-success"
                        }`}
                      >
                        {rep.type === "rookie" ? "Rookie" : "Vet"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 progress-track">
                          <div className="progress-fill" style={{ width: `${rep.progress}%` }} />
                        </div>
                        <span className="text-sm font-medium text-foreground">{rep.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{rep.currentModule}</span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className={`text-sm ${rep.stalled ? "text-destructive" : "text-muted-foreground"}`}>
                        {rep.lastActive}
                      </span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {rep.streak > 0 ? `${rep.streak} days` : "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManagerDashboard;
