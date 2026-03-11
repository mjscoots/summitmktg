import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Home, GraduationCap, Trophy, LogOut, User, Mountain, Shield, MessagesSquare, Sun, Moon, Wrench, BarChart3 } from 'lucide-react';
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

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
  iconColor?: string;
}

const mainNavItems: NavItem[] = [
  { label: 'Home', path: '/app', icon: Home },
  { label: 'Training', path: '/app/training', icon: GraduationCap, iconColor: 'text-blue-400' },
  { label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy, iconColor: 'text-yellow-400' },
  { label: 'Community', path: '/app/chat', icon: MessagesSquare, iconColor: 'text-purple-400' },
  { label: 'Operations', path: '/app/operations', icon: Wrench, iconColor: 'text-green-400' },
  { label: 'Analytics', path: '/app/analytics', icon: BarChart3, iconColor: 'text-emerald-400' },
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

  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || isOwner;
  const roleLabel = isOwner ? 'OWNER' : role === 'admin' ? 'ADMIN' : (role === 'manager' || isAdmin) ? 'MANAGER' : 'ROOKIE';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Operations paths — any of these make the Operations nav item active
  const operationsPaths = ['/app/operations', '/app/forms', '/app/interviews', '/app/weekly-one-on-ones', '/app/calendar', '/app/links'];
  // Analytics paths
  const analyticsPaths = ['/app/analytics', '/app/war-room', '/app/calculators'];

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    if (path === '/app/operations') {
      return operationsPaths.some(p => location.pathname.startsWith(p));
    }
    if (path === '/app/analytics') {
      return analyticsPaths.some(p => location.pathname.startsWith(p));
    }
    if (path === '/app/training') {
      return location.pathname.startsWith('/app/training');
    }
    return location.pathname.startsWith(path);
  };

  const getBadge = (path: string) => {
    if (path === '/app/chat') return unreadChat;
    return 0;
  };

  const NavButton = ({ item, active, badge }: { item: NavItem; active: boolean; badge: number }) => (
    <button
      data-tour={item.label.toLowerCase()}
      onClick={() => {
        if (item.path === '/app/chat') markChatRead();
        navigate(item.path);
        if (isMobile) setOpenMobile(false);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative group",
        active
          ? "text-primary"
          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
        collapsed && "justify-center px-2"
      )}
    >
      {/* Active accent bar */}
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: 'var(--gradient-primary)' }} />
      )}
      {/* Active glow background */}
      {active && (
        <div className="absolute inset-0 rounded-lg bg-primary/8 pointer-events-none" />
      )}
      <item.icon
        className={cn(
          "w-[18px] h-[18px] flex-shrink-0 transition-all duration-200 relative z-10",
          active ? "text-primary drop-shadow-[0_0_6px_hsl(217_91%_60%/0.4)]" : item.iconColor || "",
          !active && "group-hover:drop-shadow-[0_0_4px_hsl(217_91%_60%/0.2)]"
        )}
        strokeWidth={1.75}
      />
      {!collapsed && (
        <span className={cn("text-[13px] font-medium relative z-10", active && "font-semibold")}>
          {item.label}
        </span>
      )}
      {badge > 0 && (
        collapsed ? (
          <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none z-20">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : (
          <span className="ml-auto flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none min-w-[18px] h-[18px] px-1 relative z-10">
            {badge > 99 ? '99+' : badge}
          </span>
        )
      )}
    </button>
  );

  return (
    <Sidebar
      data-tour="sidebar"
      className={cn(
        'border-r border-sidebar-border bg-sidebar-background transition-all duration-200',
        collapsed ? 'w-[52px]' : 'w-44'
      )}
      collapsible="icon"
    >
      <SidebarHeader className="px-3 pt-4 pb-4">
        <button 
          className="flex items-center gap-2.5 cursor-pointer rounded-lg px-1 py-1 transition-all duration-200 hover:bg-muted/30 active:scale-95"
          onClick={() => navigate('/app')}
        >
          <Mountain className={cn("text-primary flex-shrink-0 transition-colors drop-shadow-[0_0_8px_hsl(217_91%_60%/0.3)]", collapsed ? "w-5 h-5" : "w-5 h-5")} />
          {!collapsed && (
            <span className="text-sm font-black tracking-tight uppercase gradient-text">
              Summit
            </span>
          )}
        </button>
      </SidebarHeader>

      <SidebarContent className="px-2 py-1 flex flex-col flex-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <NavButton item={item} active={isActive(item.path)} badge={getBadge(item.path)} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Admin */}
        {isAdmin && (
          <SidebarGroup>
            <Separator className="mb-2 bg-sidebar-border/50" />
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                <SidebarMenuItem>
                  <button
                    onClick={() => { navigate('/admin/team'); if (isMobile) setOpenMobile(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative group",
                      isActive('/admin/team') ? "text-purple-400 font-bold" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent font-semibold",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    {isActive('/admin/team') && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-purple-400" />
                    )}
                    <Shield className={cn("w-[18px] h-[18px] flex-shrink-0", isActive('/admin/team') ? "text-purple-400 drop-shadow-[0_0_6px_hsl(270_70%_60%/0.4)]" : "text-purple-400/70")} strokeWidth={2} />
                    {!collapsed && <span className="text-[13px]">Admin</span>}
                    {adminCounts.total > 0 && (
                      <span className={cn(
                        "flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none",
                        collapsed ? "absolute -top-1 -right-1 w-4 h-4" : "ml-auto min-w-[18px] h-[18px] px-1"
                      )}>
                        {adminCounts.total > 99 ? '99+' : adminCounts.total}
                      </span>
                    )}
                  </button>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-2 border-t border-sidebar-border/50">
        <div
          data-tour="profile"
          onClick={() => { navigate('/app/profile'); if (isMobile) setOpenMobile(false); }}
          className={cn(
            "flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all duration-200",
            "hover:bg-sidebar-accent",
            collapsed ? "justify-center" : ""
          )}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-border/30" />
          ) : (
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-primary)', opacity: 0.8 }}>
              <User className="w-3.5 h-3.5 text-white" strokeWidth={1.75} />
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">
                {profile?.full_name?.split(' ')[0] || 'User'}
              </p>
              <p className={cn("text-[9px] uppercase tracking-widest font-bold", isOwner ? "gradient-text-gold" : "text-primary/70")}>{roleLabel}</p>
            </div>
          )}
        </div>

        <button
          onClick={toggleThemeMode}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-200",
            "text-muted-foreground/60 hover:text-foreground hover:bg-muted/20",
            collapsed ? "justify-center" : ""
          )}
          title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4" strokeWidth={1.75} /> : <Moon className="w-4 h-4" strokeWidth={1.75} />}
          {!collapsed && <span className="text-xs">{themeMode === 'dark' ? 'Light' : 'Dark'}</span>}
        </button>

        <button
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-200",
            "text-muted-foreground/60 hover:text-foreground hover:bg-muted/20",
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
