import Header from "@/components/Header";
import { 
  getAnnouncementsForRole,
  type Role
} from "@/data/mockData";
import { Bell } from "lucide-react";

interface AnnouncementsProps {
  role?: Role;
}

const Announcements = ({ role = "rookie" }: AnnouncementsProps) => {
  const announcements = getAnnouncementsForRole(role);

  return (
    <div className="min-h-screen bg-background">
      <Header role={role} />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground mt-1">Latest updates and news</p>
        </div>

        {announcements.length === 0 ? (
          <div className="card-elevated p-12 text-center animate-fade-in">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <div 
                key={announcement.id} 
                className="card-elevated p-6 animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-lg font-bold text-foreground">{announcement.title}</h2>
                  <div className="flex items-center gap-2">
                    {announcement.visibility === "vet" && (
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                        Vet Only
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {announcement.createdAt}
                    </span>
                  </div>
                </div>
                <p className="text-foreground/80">{announcement.body}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Announcements;
