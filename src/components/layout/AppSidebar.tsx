import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Home, GraduationCap, Trophy, LogOut, User, Users, Calendar, Mountain, Shield, MessagesSquare, FileText, Link2, Sun, Moon, Swords } from 'lucide-react';
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
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { useAdminCounts } from '@/hooks/useAdminCounts';
import { usePendingRSVP } from '@/hooks/usePendingRSVP';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
  iconColor?: string;
  requiredRole?: 'manager' | 'admin' | 'owner';
}

// Primary nav items (top section)
const rookieNavItems: NavItem[] = [
  { label: 'Home', path: '/app', icon: Home },
  { label: 'Training', path: '/app/training', icon: GraduationCap, iconColor: 'text-green-400' },
  { label: 'Community', path: '/app/chat', icon: MessagesSquare, iconColor: 'text-blue-300' },
  { label: 'Resources', path: '/app/links', icon: Link2, iconColor: 'text-purple-400' },
  { label: 'Calendar', path: '/app/calendar', icon: Calendar, iconColor: 'text-red-400' },
  { label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy, iconColor: 'text-yellow-400' },
];

const managerNavItems: NavItem[] = [
  { label: 'Home', path: '/app', icon: Home },
  { label: 'Training', path: '/app/training', icon: GraduationCap, iconColor: 'text-green-400' },
  { label: 'Community', path: '/app/chat', icon: MessagesSquare, iconColor: 'text-blue-300' },
  { label: 'War Room', path: '/app/war-room', icon: Swords, iconColor: 'text-red-400' },
  { label: 'Forms', path: '/app/forms', icon: FileText, iconColor: 'text-orange-400' },
  { label: 'Resources', path: '/app/links', icon: Link2, iconColor: 'text-purple-400' },
  { label: 'Calendar', path: '/app/calendar', icon: Calendar, iconColor: 'text-red-400' },
  { label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy, iconColor: 'text-yellow-400' },
];

// Bottom admin items (above footer) — Team removed, now inside War Room
const bottomNavItems: NavItem[] = [
  { label: 'Admin', path: '/admin/team', icon: Shield, requiredRole: 'admin' },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, profile, signOut } = useAuth();
  const { themeMode, toggleThemeMode } = useTheme();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const { unreadCount: unreadChat, markRead: markChatRead } = useUnreadChat();
  const adminCounts = useAdminCounts();
  const pendingRSVP = usePendingRSVP();

  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || isOwner;
  const isManager = role === 'manager' || isAdmin;
  const roleLabel = isOwner ? 'OWNER' : role === 'admin' ? 'ADMIN' : isManager ? 'MANAGER' : 'ROOKIE';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    // Forms path also matches interviews and weekly-one-on-ones
    if (path === '/app/forms') {
      return location.pathname.startsWith('/app/forms') || 
             location.pathname.startsWith('/app/interviews') || 
             location.pathname.startsWith('/app/weekly-one-on-ones');
    }
    // 1:1 Prep path
    if (path === '/app/one-on-ones/prep') {
      return location.pathname.startsWith('/app/one-on-ones');
    }
    return location.pathname.startsWith(path);
  };

  const navItems = isManager ? managerNavItems : rookieNavItems;

  const visibleBottomItems = bottomNavItems.filter((item) => {
    if (item.requiredRole === 'admin') return isAdmin;
    if (item.requiredRole === 'manager') return isManager;
    return true;
  });

  return (
    <Sidebar
      data-tour="sidebar"
      className={cn(
        'border-r border-sidebar-border bg-sidebar-background transition-all duration-200',
        collapsed ? 'w-[52px]' : 'w-44'
      )}
      collapsible="icon"
    >
      {/* Header */}
      <SidebarHeader className="px-3 pt-4 pb-3">
        <button 
          className="flex items-center gap-2 cursor-pointer rounded-md px-1 py-0.5 transition-all duration-200 hover:bg-muted/50 active:scale-95"
          onClick={() => navigate('/app')}
        >
          <Mountain className={cn(
            "text-primary flex-shrink-0 transition-colors",
            collapsed ? "w-5 h-5" : "w-4 h-4"
          )} />
          {!collapsed && (
            <span className="text-sm font-black tracking-tight uppercase text-sidebar-foreground hover:text-primary transition-colors">
              Summit
            </span>
          )}
        </button>
      </SidebarHeader>

      {/* Main nav */}
      <SidebarContent className="px-1.5 py-1 flex flex-col flex-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <button
                      data-tour={item.label.toLowerCase()}
                      onClick={() => {
                        if (item.path === '/app/chat') markChatRead();
                        navigate(item.path);
                        if (isMobile) setOpenMobile(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-150 relative",
                        active 
                          ? "bg-primary/15 text-primary"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon 
                        className={cn(
                          "w-4 h-4 flex-shrink-0",
                          active ? "text-primary" : item.iconColor || ""
                        )} 
                        strokeWidth={1.75} 
                      />
                      {!collapsed && (
                        <span className="text-[13px] font-medium">{item.label}</span>
                      )}
                      {item.path === '/app/chat' && unreadChat > 0 && (
                        <span className={cn(
                          "flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none",
                          collapsed ? "absolute -top-1 -right-1 w-4 h-4" : "ml-auto min-w-[18px] h-[18px] px-1"
                        )}>
                          {unreadChat > 99 ? '99+' : unreadChat}
                        </span>
                      )}
                      {item.path === '/app/calendar' && pendingRSVP > 0 && (
                        <span className={cn(
                          "flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none",
                          collapsed ? "absolute -top-1 -right-1 w-4 h-4" : "ml-auto min-w-[18px] h-[18px] px-1"
                        )}>
                          {pendingRSVP > 99 ? '99+' : pendingRSVP}
                        </span>
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
            <Separator className="mb-2 bg-sidebar-border" />
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {visibleBottomItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <button
                        onClick={() => {
                          navigate(item.path);
                          if (isMobile) setOpenMobile(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-150 relative",
                          active 
                          ? "bg-primary/15 text-primary"
                          : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent"
                        )}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                        {!collapsed && (
                          <span className="text-[13px] font-medium">{item.label}</span>
                        )}
                        {item.label === 'Admin' && adminCounts.total > 0 && (
                          <span className={cn(
                            "flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none",
                            collapsed ? "absolute -top-1 -right-1 w-4 h-4" : "ml-auto min-w-[18px] h-[18px] px-1"
                          )}>
                            {adminCounts.total > 99 ? '99+' : adminCounts.total}
                          </span>
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
      <SidebarFooter className="p-1.5 border-t border-sidebar-border">
        <div
          data-tour="profile"
          onClick={() => {
            navigate('/app/profile');
            if (isMobile) setOpenMobile(false);
          }}
          className={cn(
            "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all duration-200",
            "hover:bg-sidebar-accent",
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
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {profile?.full_name?.split(' ')[0] || 'User'}
              </p>
              <p className={cn("text-[10px] uppercase tracking-wide", isOwner ? "text-yellow-400 font-bold" : "text-primary/80")}>{roleLabel}</p>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleThemeMode}
          className={cn(
            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all duration-150",
            "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            collapsed ? "justify-center" : ""
          )}
          title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4" strokeWidth={1.75} />
          ) : (
            <Moon className="w-4 h-4" strokeWidth={1.75} />
          )}
          {!collapsed && <span className="text-xs">{themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <button
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all duration-150",
            "text-muted-foreground hover:text-foreground hover:bg-muted/50",
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
