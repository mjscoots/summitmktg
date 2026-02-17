import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Home, GraduationCap, Trophy, LogOut, User, ClipboardList, Users, Calendar, Mountain, MessageSquare, Shield, MessagesSquare } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

// Primary nav items (top section)
const rookieNavItems = [
  { label: 'Home', path: '/app', icon: Home },
  { label: 'Training', path: '/app/training', icon: GraduationCap },
  { label: 'Chat', path: '/app/chat', icon: MessagesSquare },
  { label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
  { label: 'Calendar', path: '/app/calendar', icon: Calendar },
];

const managerNavItems = [
  { label: 'Home', path: '/app', icon: Home },
  { label: 'Training', path: '/app/training', icon: GraduationCap },
  { label: 'Chat', path: '/app/chat', icon: MessagesSquare },
  { label: 'Interviews', path: '/app/interviews', icon: ClipboardList },
  { label: 'Weekly 1:1\'s', path: '/app/weekly-one-on-ones', icon: MessageSquare },
  { label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
  { label: 'Calendar', path: '/app/calendar', icon: Calendar },
];

// Bottom admin items (above footer)
const bottomNavItems = [
  { label: 'Team', path: '/app/team', icon: Users, requiredRole: 'manager' as const },
  { label: 'Admin', path: '/admin/team', icon: Shield, requiredRole: 'admin' as const },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const isManager = role === 'manager' || role === 'admin';
  const isAdmin = role === 'admin';
  const roleLabel = isAdmin ? 'ADMIN' : isManager ? 'MANAGER' : 'ROOKIE';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const navItems = isManager ? managerNavItems : rookieNavItems;

  const visibleBottomItems = bottomNavItems.filter(item => {
    if (item.requiredRole === 'admin') return isAdmin;
    if (item.requiredRole === 'manager') return isManager;
    return true;
  });

  return (
    <Sidebar
      className={cn(
        'border-r border-border/20 bg-black transition-all duration-200',
        collapsed ? 'w-[52px]' : 'w-44'
      )}
      collapsible="icon"
    >
      {/* Header */}
      <SidebarHeader className="px-3 pt-4 pb-3">
        <button 
          className="flex items-center gap-2 cursor-pointer rounded-md px-1 py-0.5 transition-all duration-200 hover:bg-white/10 active:scale-95"
          onClick={() => navigate('/app')}
        >
          <Mountain className={cn(
            "text-primary flex-shrink-0 transition-colors",
            collapsed ? "w-5 h-5" : "w-4 h-4"
          )} />
          {!collapsed && (
            <span className="text-sm font-black tracking-tight uppercase text-foreground/90 hover:text-primary transition-colors">
              Summit
            </span>
          )}
        </button>
      </SidebarHeader>

      {/* Main nav - grows to push bottom items down */}
      <SidebarContent className="px-1.5 py-1 flex flex-col flex-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-150 relative",
                        active 
                          ? "bg-primary/15 text-primary"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                      {!collapsed && (
                        <span className="text-[13px] font-medium">{item.label}</span>
                      )}
                    </button>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom admin section */}
        {visibleBottomItems.length > 0 && (
          <SidebarGroup>
            <Separator className="mb-2 bg-white/5" />
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {visibleBottomItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <button
                        onClick={() => navigate(item.path)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-150",
                          active 
                            ? "bg-primary/15 text-primary"
                            : "text-white/50 hover:text-white/80 hover:bg-white/5"
                        )}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                        {!collapsed && (
                          <span className="text-[13px] font-medium">{item.label}</span>
                        )}
                      </button>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-1.5 border-t border-border/10">
        <div
          onClick={() => navigate('/app/profile')}
          className={cn(
            "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all duration-200",
            "hover:bg-white/5",
            collapsed ? "justify-center" : ""
          )}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 text-primary" strokeWidth={1.75} />
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/90 truncate">
                {profile?.full_name?.split(' ')[0] || 'User'}
              </p>
              <p className="text-[10px] text-primary/80 uppercase tracking-wide">{roleLabel}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all duration-150",
            "text-white/50 hover:text-white/80 hover:bg-white/5",
            collapsed ? "justify-center" : ""
          )}
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          {!collapsed && <span className="text-xs">Log out</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
