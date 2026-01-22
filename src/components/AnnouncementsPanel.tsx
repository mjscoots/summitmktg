import { useNavigate } from "react-router-dom";
import { Bell, AlertCircle, Zap, Phone, Calendar, MessageSquare, Mountain } from "lucide-react";
import { getAnnouncementsForRole, type Role, type Announcement } from "@/data/mockData";

// Extended announcement types for richer display
type AnnouncementType = "update" | "blitz" | "call" | "schedule" | "motivation" | "general";

interface EnhancedAnnouncement extends Announcement {
  type?: AnnouncementType;
}

const typeConfig: Record<AnnouncementType, { icon: React.ElementType; color: string }> = {
  update: { icon: Bell, color: "text-primary" },
  blitz: { icon: Zap, color: "text-warning" },
  call: { icon: Phone, color: "text-success" },
  schedule: { icon: Calendar, color: "text-accent-foreground" },
  motivation: { icon: MessageSquare, color: "text-primary" },
  general: { icon: Bell, color: "text-muted-foreground" },
};

// Mock enhanced announcements
const getEnhancedAnnouncements = (role: Role): EnhancedAnnouncement[] => {
  const baseAnnouncements = getAnnouncementsForRole(role);
  
  // Add types to existing announcements
  const enhanced: EnhancedAnnouncement[] = baseAnnouncements.map((ann) => ({
    ...ann,
    type: ann.title.toLowerCase().includes("blitz") ? "blitz" 
        : ann.title.toLowerCase().includes("call") ? "call"
        : ann.title.toLowerCase().includes("leaderboard") ? "motivation"
        : "update" as AnnouncementType,
  }));

  // Add some additional mock announcements
  enhanced.unshift({
    id: "ann-weekly",
    title: "This Week's Focus: Close Harder",
    body: "We're 15% behind target. Every rep needs to be asking for the close on every pitch. No exceptions. Push through the discomfort.",
    visibility: "both",
    createdAt: "Today",
    type: "motivation",
  });

  if (role === "vet") {
    enhanced.unshift({
      id: "ann-vet-call",
      title: "Manager Sync – Thursday 7AM",
      body: "All vets on the call. Bring your numbers and be ready to discuss rep performance.",
      visibility: "vet",
      createdAt: "Today",
      type: "call",
    });
  }

  return enhanced.slice(0, 4);
};

interface AnnouncementsPanelProps {
  role: Role;
}

const AnnouncementsPanel = ({ role }: AnnouncementsPanelProps) => {
  const navigate = useNavigate();
  const announcements = getEnhancedAnnouncements(role);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bell className="w-4 h-4 text-primary" />
        </div>
        <div className="flex items-center gap-2">
          <Mountain className="w-3 h-3 text-primary/40" />
          <h3 className="font-bold text-foreground">Announcements</h3>
        </div>
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto">
        {announcements.map((announcement) => {
          const config = typeConfig[announcement.type || "general"];
          const Icon = config.icon;
          
          return (
            <div
              key={announcement.id}
              className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground text-sm leading-tight">
                      {announcement.title}
                    </p>
                    {announcement.visibility === "vet" && (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">
                        Vet
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {announcement.body}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">{announcement.createdAt}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => navigate("/app/announcements")}
        className="mt-3 text-xs text-primary hover:underline"
      >
        View all announcements →
      </button>
    </div>
  );
};

export default AnnouncementsPanel;
