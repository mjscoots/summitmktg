import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Home, GraduationCap, Trophy, LogOut, User, ClipboardList, Users, ChevronRight, Calendar, Mountain } from 'lucide-react';
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


import { UserSearch } from 'lucide-react';

const baseNavItems = [
  { label: 'Home', path: '/app', icon: Home },
  { label: 'Training', path: '/app/training', icon: GraduationCap },
  { label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
  { label: 'Calendar', path: '/app/calendar', icon: Calendar },
];

const managerNavItems = [
  { label: 'Home', path: '/app', icon: Home },
  { label: 'Training', path: '/app/training', icon: GraduationCap },
  { label: 'Interviews', path: '/app/interviews', icon: ClipboardList },
  { label: 'Teams', path: '/app/team', icon: Users },
  { label: 'Members', path: '/app/members', icon: UserSearch },
  { label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
  { label: 'Calendar', path: '/app/calendar', icon: Calendar },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const isManager = role === 'manager' || role === 'admin';
  const roleLabel = isManager ? 'MANAGER' : 'ROOKIE';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar
      className={cn(
        'border-r border-border/30 bg-black transition-all duration-200',
        collapsed ? 'w-14' : 'w-52'
      )}
      collapsible="icon"
    >
      {/* Header: Logo centered + Role left-aligned */}
      <SidebarHeader className="px-4 pt-5 pb-4 border-b border-border/20">
        <div 
          className={cn(
            "flex flex-col cursor-pointer",
            collapsed ? "items-center" : "items-center"
          )}
          onClick={() => navigate('/app')}
        >
          <div className={cn(
              "flex items-center gap-2",
              collapsed ? "justify-center" : ""
            )}>
              <Mountain className={cn(
                "text-primary flex-shrink-0",
                collapsed ? "w-6 h-6" : "w-5 h-5"
              )} />
              {!collapsed && (
                <span 
                  className="text-lg font-black tracking-tight uppercase text-foreground/90"
                  style={{ textShadow: '0 0 10px hsl(216, 80%, 45%, 0.3)' }}
                >
                  Summit
                </span>
              )}
            </div>
          {!collapsed && (
            <span className="mt-2 text-[10px] font-semibold text-primary tracking-[0.15em] uppercase text-left w-full pl-1">
              {roleLabel}
            </span>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {(isManager ? managerNavItems : baseNavItems).map((item) => {
                const active = isActive(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 relative group/navitem",
                        active 
                          ? "bg-primary/20"
                          : "hover:bg-transparent"
                      )}
                    >
                      {/* Active indicator */}
                      <div className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full transition-all",
                        active ? "bg-primary" : "bg-transparent"
                      )} />
                      
                      <item.icon className={cn(
                        "w-[18px] h-[18px] flex-shrink-0 transition-colors",
                        active ? "text-primary" : "text-white/80 group-hover/navitem:text-primary"
                      )} strokeWidth={1.75} />
                      
                      {!collapsed && (
                        <span className={cn(
                          "text-sm font-medium transition-colors",
                          active ? "text-white" : "text-white/90 group-hover/navitem:text-primary"
                        )}>
                          {item.label}
                        </span>
                      )}
                    </button>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Account Panel */}
      <SidebarFooter className="p-2 border-t border-border/20">
        <div
          onClick={() => navigate('/app/profile')}
          className={cn(
            "flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-all duration-200 group",
            "hover:bg-primary/10",
            collapsed ? "justify-center" : ""
          )}
        >
          {/* Avatar */}
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-primary/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/30">
              <User className="w-4 h-4 text-primary" strokeWidth={1.75} />
            </div>
          )}
          
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-[10px] font-medium text-primary tracking-wide uppercase">
                  {roleLabel}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors flex-shrink-0" strokeWidth={1.75} />
            </>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-md transition-all duration-200",
            "text-white/60 hover:text-white hover:bg-white/5",
            collapsed ? "justify-center" : ""
          )}
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.75} />
          {!collapsed && <span className="text-sm">Log out</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
