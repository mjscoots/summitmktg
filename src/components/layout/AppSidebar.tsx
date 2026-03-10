import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Home, GraduationCap, Trophy, LogOut, User, Calendar, Mountain, Shield, MessagesSquare, FileText, Link2, Sun, Moon, Swords, ChevronRight, Calculator } from 'lucide-react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { useAdminCounts } from '@/hooks/useAdminCounts';
import { usePendingRSVP } from '@/hooks/usePendingRSVP';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
  iconColor?: string;
}

// Direct nav items (no dropdown)
const directNavItems: NavItem[] = [
  { label: 'Training', path: '/app/training', icon: GraduationCap, iconColor: 'text-green-400' },
  { label: 'Leaderboard', path: '/app/leaderboard', icon: Trophy, iconColor: 'text-yellow-400' },
  { label: 'Community', path: '/app/chat', icon: MessagesSquare, iconColor: 'text-blue-300' },
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
    if (path === '/app/forms') {
      return location.pathname.startsWith('/app/forms') || 
             location.pathname.startsWith('/app/interviews') || 
             location.pathname.startsWith('/app/weekly-one-on-ones');
    }
    if (path === '/app/training') {
      return location.pathname.startsWith('/app/training');
    }
    return location.pathname.startsWith(path);
  };

  // Build tools section based on role
  const toolsItems: NavItem[] = [];
  if (isManager) toolsItems.push({ label: 'Forms', path: '/app/forms', icon: FileText, iconColor: 'text-orange-400' });
  toolsItems.push({ label: 'Resources', path: '/app/links', icon: Link2, iconColor: 'text-purple-400' });
  toolsItems.push({ label: 'Calendar', path: '/app/calendar', icon: Calendar, iconColor: 'text-red-400' });
  toolsItems.push({ label: 'Calculators', path: '/app/calculators', icon: Calculator, iconColor: 'text-emerald-400' });
  if (isManager) toolsItems.push({ label: 'Stats', path: '/app/war-room', icon: Swords, iconColor: 'text-red-400' });

  const getBadge = (path: string) => {
    if (path === '/app/chat') return unreadChat;
    if (path === '/app/calendar') return pendingRSVP;
    return 0;
  };

  const toolsHasActive = toolsItems.some(item => isActive(item.path));
  const [toolsOpen, setToolsOpen] = useState(toolsHasActive);

  // Auto-open tools when navigating into it
  useMemo(() => {
    if (toolsHasActive && !toolsOpen) setToolsOpen(true);
  }, [toolsHasActive]);

  const toolsBadge = useMemo(() => {
    return toolsItems.reduce((sum, item) => sum + getBadge(item.path), 0);
  }, [unreadChat, pendingRSVP]);

  return (
    <Sidebar
      data-tour="sidebar"
      className={cn(
        'border-r border-sidebar-border bg-sidebar-background transition-all duration-200',
        collapsed ? 'w-[52px]' : 'w-44'
      )}
      collapsible="icon"
    >
      <SidebarHeader className="px-3 pt-4 pb-3">
        <button 
          className="flex items-center gap-2 cursor-pointer rounded-md px-1 py-0.5 transition-all duration-200 hover:bg-muted/50 active:scale-95"
          onClick={() => navigate('/app')}
        >
          <Mountain className={cn("text-primary flex-shrink-0 transition-colors", collapsed ? "w-5 h-5" : "w-4 h-4")} />
          {!collapsed && (
            <span className="text-sm font-black tracking-tight uppercase text-sidebar-foreground hover:text-primary transition-colors">
              Summit
            </span>
          )}
        </button>
      </SidebarHeader>

      <SidebarContent className="px-1.5 py-1 flex flex-col flex-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {/* Home */}
              <SidebarMenuItem>
                <button
                  data-tour="home"
                  onClick={() => { navigate('/app'); if (isMobile) setOpenMobile(false); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-150",
                    isActive('/app') ? "bg-primary/15 text-primary" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    collapsed && "justify-center"
                  )}
                >
                  <Home className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                  {!collapsed && <span className="text-[13px] font-medium">Home</span>}
                </button>
              </SidebarMenuItem>

              {/* Direct nav: Training, Leaderboard, Community */}
              {directNavItems.map((item) => {
                const active = isActive(item.path);
                const badge = getBadge(item.path);
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
                        active ? "bg-primary/15 text-primary" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        collapsed && "justify-center"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-primary" : item.iconColor || "")} strokeWidth={1.75} />
                      {!collapsed && <span className="text-[13px] font-medium">{item.label}</span>}
                      {badge > 0 && (
                        collapsed ? (
                          <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        ) : (
                          <span className="ml-auto flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none min-w-[18px] h-[18px] px-1">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )
                      )}
                    </button>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools dropdown */}
        <SidebarGroup className="py-0">
          {!collapsed ? (
            <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
              <CollapsibleTrigger className={cn(
                "w-full flex items-center justify-between px-2.5 py-2 rounded-md transition-all duration-150 group border",
                toolsHasActive
                  ? "text-primary text-[12px] font-extrabold uppercase tracking-widest bg-primary/10 border-primary/20"
                  : "text-sidebar-foreground/70 text-[12px] font-extrabold uppercase tracking-widest hover:text-sidebar-foreground hover:bg-sidebar-accent border-border/40 hover:border-border/60"
              )}>
                <span className="flex items-center gap-1.5">
                  <Wrench className={cn("w-3.5 h-3.5", toolsHasActive ? "text-primary" : "text-sidebar-foreground/50")} />
                  Tools
                </span>
                <div className="flex items-center gap-1">
                  {toolsBadge > 0 && !toolsOpen && (
                    <span className="flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none min-w-[18px] h-[18px] px-1">
                      {toolsBadge > 99 ? '99+' : toolsBadge}
                    </span>
                  )}
                  <ChevronRight className={cn("w-3 h-3 transition-transform duration-200", toolsOpen && "rotate-90")} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-0.5 mt-0.5">
                    {toolsItems.map((item) => {
                      const active = isActive(item.path);
                      const badge = getBadge(item.path);
                      return (
                        <SidebarMenuItem key={item.path}>
                          <button
                            data-tour={item.label.toLowerCase()}
                            onClick={() => { navigate(item.path); if (isMobile) setOpenMobile(false); }}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-150 relative",
                              active ? "bg-primary/15 text-primary" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                            )}
                          >
                            <item.icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-primary" : item.iconColor || "")} strokeWidth={1.75} />
                            <span className="text-[13px] font-medium">{item.label}</span>
                            {badge > 0 && (
                              <span className="ml-auto flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none min-w-[18px] h-[18px] px-1">
                                {badge > 99 ? '99+' : badge}
                              </span>
                            )}
                          </button>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {toolsItems.map((item) => {
                  const active = isActive(item.path);
                  const badge = getBadge(item.path);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <button
                        onClick={() => { navigate(item.path); if (isMobile) setOpenMobile(false); }}
                        className={cn(
                          "w-full flex items-center justify-center px-2.5 py-1.5 rounded-md transition-all duration-150 relative",
                          active ? "bg-primary/15 text-primary" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-primary" : item.iconColor || "")} strokeWidth={1.75} />
                        {badge > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </button>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Admin */}
        {isAdmin && (
          <SidebarGroup>
            <Separator className="mb-2 bg-sidebar-border" />
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                <SidebarMenuItem>
                  <button
                    onClick={() => { navigate('/admin/team'); if (isMobile) setOpenMobile(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-all duration-150 relative",
                      isActive('/admin/team') ? "bg-primary/15 text-primary font-bold" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent font-semibold",
                      collapsed && "justify-center"
                    )}
                  >
                    <Shield className={cn("w-4 h-4 flex-shrink-0", isActive('/admin/team') ? "text-primary" : "text-purple-400")} strokeWidth={2} />
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
      <SidebarFooter className="p-1.5 border-t border-sidebar-border">
        <div
          data-tour="profile"
          onClick={() => { navigate('/app/profile'); if (isMobile) setOpenMobile(false); }}
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
              <p className={cn("text-[10px] uppercase tracking-wide", isOwner ? "text-yellow-500 font-bold" : "text-primary/80")}>{roleLabel}</p>
            </div>
          )}
        </div>

        <button
          onClick={toggleThemeMode}
          className={cn(
            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all duration-150",
            "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            collapsed ? "justify-center" : ""
          )}
          title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4" strokeWidth={1.75} /> : <Moon className="w-4 h-4" strokeWidth={1.75} />}
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
