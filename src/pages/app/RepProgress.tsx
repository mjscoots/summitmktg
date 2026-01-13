import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, ChevronDown, ChevronUp, AlertTriangle, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import { 
  mockUsers,
  allFolders,
  calculateFolderProgress,
  type User
} from "@/data/mockData";

const RepProgress = () => {
  const navigate = useNavigate();
  const { repId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"progress" | "lastActive" | "name">("lastActive");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterRole, setFilterRole] = useState<"all" | "rookie" | "vet">("all");

  // If viewing a specific rep
  if (repId) {
    const rep = mockUsers.find(u => u.id === repId);
    
    if (!rep) {
      return (
        <div className="min-h-screen bg-background">
          <Header role="vet" />
          <div className="max-w-4xl mx-auto px-6 py-8 text-center">
            <p className="text-muted-foreground">Rep not found</p>
            <button onClick={() => navigate("/app/reps")} className="btn-primary mt-4">
              Back to Reps
            </button>
          </div>
        </div>
      );
    }

    const folders = allFolders.filter(
      f => f.roleVisibility === "both" || f.roleVisibility === rep.role
    );

    return (
      <div className="min-h-screen bg-background">
        <Header role="vet" />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate("/app/reps")}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Reps
          </button>

          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{rep.name}</h1>
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                rep.role === "rookie" 
                  ? "bg-primary/10 text-primary" 
                  : "bg-success/10 text-success"
              }`}>
                {rep.role === "rookie" ? "Rookie" : "Vet"}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">{rep.email}</p>
            <p className="text-sm text-muted-foreground mt-2">Last active: {rep.lastActive}</p>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-in">
            <div className="card-elevated p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {rep.progress.filter(p => p.status === "completed").length}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {rep.progress.filter(p => p.status === "in_progress").length}
              </p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {folders.reduce((acc, f) => acc + f.lessons.length, 0) - rep.progress.length}
              </p>
              <p className="text-sm text-muted-foreground">Remaining</p>
            </div>
          </div>

          {/* Module Progress */}
          <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-lg font-bold text-foreground mb-4">Module Progress</h2>
            <div className="space-y-3">
              {folders.map((folder) => {
                const progress = calculateFolderProgress(folder, rep.progress);
                
                return (
                  <div key={folder.id} className="p-4 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">{folder.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {progress.completed}/{progress.total}
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Calculate stalled status
  const isStalled = (user: User) => {
    const daysMatch = user.lastActive.match(/(\d+)\s*days?\s*ago/);
    if (daysMatch) {
      return parseInt(daysMatch[1]) >= 3;
    }
    return false;
  };

  const stalledCount = mockUsers.filter(isStalled).length;
  const avgProgress = Math.round(
    mockUsers.reduce((acc, u) => {
      const completed = u.progress.filter(p => p.status === "completed").length;
      const total = allFolders
        .filter(f => f.roleVisibility === "both" || f.roleVisibility === u.role)
        .reduce((a, f) => a + f.lessons.length, 0);
      return acc + (completed / total) * 100;
    }, 0) / mockUsers.length
  );

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  const filteredReps = mockUsers
    .filter((rep) => {
      if (filterRole !== "all" && rep.role !== filterRole) return false;
      return (
        rep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "progress") {
        comparison = a.progress.filter(p => p.status === "completed").length - 
                     b.progress.filter(p => p.status === "completed").length;
      }
      if (sortBy === "name") comparison = a.name.localeCompare(b.name);
      if (sortBy === "lastActive") comparison = a.lastActive.localeCompare(b.lastActive);
      return sortAsc ? comparison : -comparison;
    });

  return (
    <div className="min-h-screen bg-background">
      <Header role="vet" />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Rep Progress</h1>
          <p className="text-muted-foreground mt-1">Monitor all reps' training progress</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fade-in">
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Total Reps</p>
            <p className="text-2xl font-bold text-foreground">{mockUsers.length}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">Avg Progress</p>
            <p className="text-2xl font-bold text-foreground">{avgProgress}%</p>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stalled Reps</p>
                <p className="text-2xl font-bold text-destructive">{stalledCount}</p>
              </div>
              {stalledCount > 0 && <AlertTriangle className="w-6 h-6 text-destructive" />}
            </div>
          </div>
        </div>

        {/* Search & Filter */}
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
            {(["all", "rookie", "vet"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterRole(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterRole === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1) + "s"}
              </button>
            ))}
          </div>
        </div>

        {/* Reps Table */}
        <div className="card-elevated overflow-hidden animate-fade-in" style={{ animationDelay: "0.15s" }}>
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
                    <span className="text-sm font-medium text-muted-foreground">Role</span>
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
                  <th className="text-left p-4 hidden lg:table-cell">
                    <button
                      onClick={() => toggleSort("lastActive")}
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Last Active
                      {sortBy === "lastActive" && (sortAsc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </button>
                  </th>
                  <th className="text-left p-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredReps.map((rep) => {
                  const stalled = isStalled(rep);
                  const completedCount = rep.progress.filter(p => p.status === "completed").length;
                  const totalLessons = allFolders
                    .filter(f => f.roleVisibility === "both" || f.roleVisibility === rep.role)
                    .reduce((a, f) => a + f.lessons.length, 0);
                  const progressPct = Math.round((completedCount / totalLessons) * 100);

                  return (
                    <tr 
                      key={rep.id} 
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/app/reps/${rep.id}`)}
                    >
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
                              {stalled && <AlertTriangle className="w-4 h-4 text-destructive" />}
                            </p>
                            <p className="text-sm text-muted-foreground">{rep.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          rep.role === "rookie"
                            ? "bg-primary/20 text-primary"
                            : "bg-success/20 text-success"
                        }`}>
                          {rep.role === "rookie" ? "Rookie" : "Vet"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 progress-track">
                            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                          </div>
                          <span className="text-sm font-medium text-foreground">{progressPct}%</span>
                        </div>
                      </td>
                      <td className={`p-4 hidden lg:table-cell ${stalled ? "text-destructive" : "text-muted-foreground"}`}>
                        {rep.lastActive}
                      </td>
                      <td className="p-4">
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
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

export default RepProgress;
