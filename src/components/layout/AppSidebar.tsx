import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Home, GraduationCap, Trophy, LogOut, User, ClipboardList, Users } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import summitLogo from '@/assets/summit-mktg-logo.png';

const baseNavItems = [
  { label: 'Home', path: '/app', icon: Home },
  { label: 'Training', path: '/app/training', icon: GraduationCap },
  { label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
];

const managerNavItems = [
  { label: 'Home', path: '/app', icon: Home },
  { label: 'Training', path: '/app/training', icon: GraduationCap },
  { label: 'Interviews', path: '/app/interviews', icon: ClipboardList },
  { label: 'My Team', path: '/app/team', icon: Users },
  { label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
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
        'border-r border-sidebar-border bg-sidebar transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div 
          className="flex flex-col items-center gap-2 cursor-pointer"
          onClick={() => navigate('/app')}
        >
          {/* Summit Logo */}
          <img 
            src={summitLogo} 
            alt="Summit Marketing" 
            className={cn(
              "object-contain transition-all duration-200",
              collapsed ? "h-10 w-auto" : "h-16 w-auto"
            )}
          />
          {!collapsed && (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
              isManager 
                ? "bg-primary/15 text-primary" 
                : "bg-green-500/15 text-green-400"
            )}>
              {roleLabel}
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {(isManager ? managerNavItems : baseNavItems).map((item) => {
                const active = isActive(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 font-medium",
                        active 
                          ? "bg-primary/15 text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <item.icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        active && "text-primary"
                      )} />
                      {!collapsed && <span>{item.label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {/* Clickable User Profile */}
        <div
          onClick={() => navigate('/app/profile')}
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/50",
            collapsed ? "justify-center" : ""
          )}
        >
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
            isManager ? "bg-blue-500/15" : "bg-green-500/15"
          )}>
            <User className={cn(
              "w-4 h-4",
              isManager ? "text-blue-400" : "text-green-400"
            )} />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSignOut();
            }}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors flex-shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
