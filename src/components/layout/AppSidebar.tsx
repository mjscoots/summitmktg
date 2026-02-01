import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Home, GraduationCap, Trophy, LogOut, User, ClipboardList } from 'lucide-react';
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

const baseNavItems = [
  { label: 'Home', path: '/app', icon: Home },
  { label: 'Training', path: '/app/training', icon: GraduationCap },
  { label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy },
];

const managerNavItems = [
  { label: 'Home', path: '/app', icon: Home },
  { label: 'Training', path: '/app/training', icon: GraduationCap },
  { label: 'Interviews', path: '/app/interviews', icon: ClipboardList, managerOnly: true },
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
  const roleColorClass = isManager ? 'text-blue-400' : 'text-green-400';
  const roleBgClass = isManager ? 'bg-blue-500/15' : 'bg-green-500/15';

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
        'border-r border-border bg-sidebar transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-border">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/app')}
        >
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg font-black text-lg",
            isManager ? "bg-blue-500/15 text-blue-400" : "bg-green-500/15 text-green-400"
          )}>
            S
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-base font-black tracking-tight">
                SUMMIT <span className={roleColorClass}>MKTG</span>
              </h1>
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                roleColorClass, roleBgClass
              )}>
                {roleLabel}
              </span>
            </div>
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
                          ? cn(
                              "text-foreground",
                              isManager ? "bg-blue-500/15" : "bg-green-500/15"
                            )
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        active && (isManager ? "text-blue-400" : "text-green-400")
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

      <SidebarFooter className="p-3 border-t border-border">
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-lg",
          collapsed ? "justify-center" : ""
        )}>
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
            isManager ? "bg-blue-500/15" : "bg-green-500/15"
          )}>
            <User className={cn("w-4 h-4", roleColorClass)} />
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
            onClick={handleSignOut}
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
