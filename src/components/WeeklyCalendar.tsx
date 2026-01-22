import { Calendar, Video, Users, Brain, Dumbbell, Target, RefreshCw } from "lucide-react";

interface DayActivity {
  day: string;
  shortDay: string;
  focus: string;
  icon: React.ElementType;
  description: string;
  type: "training" | "call" | "roleplay" | "personal" | "optional" | "reset";
}

const weeklySchedule: DayActivity[] = [
  {
    day: "Monday",
    shortDay: "Mon",
    focus: "Script Reps",
    icon: Dumbbell,
    description: "Foundation review & practice",
    type: "training",
  },
  {
    day: "Tuesday",
    shortDay: "Tue",
    focus: "Team Call",
    icon: Video,
    description: "Zoom – mandatory attendance",
    type: "call",
  },
  {
    day: "Wednesday",
    shortDay: "Wed",
    focus: "Roleplay",
    icon: Users,
    description: "Objections & closes practice",
    type: "roleplay",
  },
  {
    day: "Thursday",
    shortDay: "Thu",
    focus: "Team Call",
    icon: Video,
    description: "Zoom – mandatory attendance",
    type: "call",
  },
  {
    day: "Friday",
    shortDay: "Fri",
    focus: "Field Focus",
    icon: Target,
    description: "Personal improvement & execution",
    type: "personal",
  },
  {
    day: "Saturday",
    shortDay: "Sat",
    focus: "Optional Reps",
    icon: Brain,
    description: "Review & catch-up",
    type: "optional",
  },
  {
    day: "Sunday",
    shortDay: "Sun",
    focus: "Reset",
    icon: RefreshCw,
    description: "Mindset & prep for the week",
    type: "reset",
  },
];

const typeColors = {
  training: "bg-primary/10 border-primary/30 text-primary",
  call: "bg-success/10 border-success/30 text-success",
  roleplay: "bg-warning/10 border-warning/30 text-warning",
  personal: "bg-accent/10 border-accent/30 text-accent-foreground",
  optional: "bg-muted/50 border-border text-muted-foreground",
  reset: "bg-secondary/50 border-border text-muted-foreground",
};

const WeeklyCalendar = () => {
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayIndex = today === 0 ? 6 : today - 1; // Convert to 0 = Monday

  return (
    <div className="h-full">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">Weekly Game Plan</h3>
      </div>
      
      <div className="space-y-2">
        {weeklySchedule.map((activity, index) => {
          const Icon = activity.icon;
          const isToday = index === dayIndex;
          const isPast = index < dayIndex;
          
          return (
            <div
              key={activity.day}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                isToday
                  ? "bg-primary/10 border-primary/50 ring-1 ring-primary/30"
                  : isPast
                  ? "opacity-50 bg-muted/20 border-transparent"
                  : typeColors[activity.type]
              }`}
            >
              <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                isToday ? "bg-primary text-primary-foreground" : "bg-background/50"
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {activity.shortDay}
                  </span>
                  <span className={`font-medium text-sm ${isToday ? "text-foreground" : ""}`}>
                    {activity.focus}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                      TODAY
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyCalendar;
