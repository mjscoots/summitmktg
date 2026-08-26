import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import summitLogo from '@/assets/summit-logo-new.png';
import { LogOut, User, Shield, CalendarClock } from 'lucide-react';
import { useSeasonHub } from '@/hooks/useSeasonHub';
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
import { useNewLeads } from '@/hooks/useNewLeads';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { DESKTOP_MAIN, manageDestinations, canSeeAdmin, type NavDest } from '@/lib/appNav';

type NavItem = NavDest;



export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, profile, signOut } = useAuth();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const { unreadCount: unreadChat, markRead: markChatRead } = useUnreadChat();
  const adminCounts = useAdminCounts();
  const { newCount: newLeads } = useNewLeads();
  const { season } = useSeasonHub();
  const { activeVertical } = useWorkspace();
  const { workspaces } = useWorkspace();
  const presidedName = workspaces.find((w) => w.is_president)?.short_name || null;



  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || isOwner;
  const isManager = role === 'manager' || role === 'president' || isAdmin;
  const roleLabel = isOwner
    ? 'OWNER'
    : role === 'admin'
      ? 'ADMIN'
      : role === 'president'
        ? `MANAGER${presidedName ? ` · ${presidedName.toUpperCase()}` : ''}`
        : isManager
          ? 'MANAGER'
          : 'SALES';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    if (path === '/app/links') {
      return (
        location.pathname.startsWith('/app/links') ||
        location.pathname.startsWith('/app/notepad') ||
        location.pathname.startsWith('/app/calculators') ||
        location.pathname.startsWith('/app/logistics') ||
        location.pathname.startsWith('/app/estimate-earnings')
      );
    }
    if (path === '/app/team') {
      return location.pathname.startsWith('/app/team') || location.pathname.startsWith('/app/members');
    }
    if (path === '/app/forms') {
      return (
        location.pathname.startsWith('/app/forms') ||
        location.pathname.startsWith('/app/interviews') ||
        location.pathname.startsWith('/app/manager-meeting') ||
        location.pathname.startsWith('/app/one-on-ones') ||
        location.pathname.startsWith('/app/weekly-one-on-ones')
      );
    }
    if (path === '/app/recruits') {
      return location.pathname.startsWith('/app/recruits') || location.pathname.startsWith('/app/recruiting');
    }
    if (path === '/app/training') {
      return location.pathname.startsWith('/app/training') || location.pathname.startsWith('/app/videos');
    }
    return location.pathname.startsWith(path);
  };

  const getBadge = (path: string) => {
    if (path === '/app/chat') return unreadChat;
    if (path === '/app/leads') return newLeads;
    return 0;
  };

  const visibleMainNavItems: NavItem[] =
    season && activeVertical === 'Pest'
      ? [...DESKTOP_MAIN, { key: 'season', label: 'Season', path: '/app/season', icon: CalendarClock }]
      : DESKTOP_MAIN;

  const managementNavItems = manageDestinations(role);



  const NavButton = ({ item, active, badge }: { item: NavItem; active: boolean; badge: number }) => (
    <button
      data-tour={item.label.toLowerCase()}
      onClick={() => {
        if (item.path === '/app/chat') markChatRead();
        navigate(item.path);
        if (isMobile) setOpenMobile(false);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 relative group",
        active
          ? "text-white"
          : "text-white/60 hover:text-white hover:bg-sidebar-accent",
        collapsed && "justify-center px-2"
      )}
    >
      {/* Active indicator — accent left rule */}
      {active && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
          style={{ background: 'hsl(var(--sidebar-primary))' }}
        />
      )}
      {active && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'hsl(var(--sidebar-primary) / 0.1)', borderRadius: 'var(--radius)' }}
        />
      )}

      <item.icon
        className={cn(
          "w-[18px] h-[18px] flex-shrink-0 transition-all duration-250 relative z-10",
          active ? "text-white" : "text-white/60"
        )}
        strokeWidth={1.75}
      />
      {!collapsed && (
        <span className={cn(
          "text-[13px] font-medium relative z-10 transition-all duration-250",
          active ? "font-semibold text-white" : "text-white/60"
        )}>
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
        'border-r transition-all duration-300',
        collapsed ? 'w-[52px]' : 'w-44'
      )}
      style={{ background: '#060A10', borderColor: 'hsl(217 44% 15%)' }}
      collapsible="icon"
    >
      <SidebarHeader className="px-3 pt-4 pb-4">
        <button
          className="flex items-center gap-2.5 cursor-pointer rounded-lg px-1 py-1 transition-all duration-250 hover:bg-white/5 active:scale-95"
          onClick={() => navigate('/app')}
        >
          <img src={summitLogo} alt="" className="h-5 w-5 flex-shrink-0 object-contain" />
          {!collapsed && (
            <span className="text-sm font-black tracking-tight uppercase text-white">
              Summit
            </span>
          )}
        </button>
        <WorkspaceSwitcher collapsed={collapsed} />
      </SidebarHeader>

      <SidebarContent className="px-2 py-1 flex flex-col flex-1">
        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {visibleMainNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <NavButton item={item} active={isActive(item.path)} badge={getBadge(item.path)} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Manage (Manager tier and up) */}
        {managementNavItems.length > 0 && (
          <SidebarGroup className="mt-3">
            <Separator className="mb-2" style={{ background: 'hsl(217 44% 15% / 0.5)' }} />
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
                Manage
              </p>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {managementNavItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <NavButton item={item} active={isActive(item.path)} badge={getBadge(item.path)} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Admin (Admin tier and up, plus presidents for their workspace) */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {(canSeeAdmin(role) || role === 'president') && (
                <SidebarMenuItem>
                  <button
                    onClick={() => { navigate('/admin/inbox'); if (isMobile) setOpenMobile(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors duration-200 relative group",
                      isActive('/admin') ? "text-white" : "text-white/40 hover:text-white/70 hover:bg-sidebar-accent",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    {isActive('/admin') && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full" style={{ background: 'hsl(var(--sidebar-primary))' }} />
                    )}
                    <Shield className={cn("w-4 h-4 flex-shrink-0", isActive('/admin') ? "text-white" : "text-white/40")} strokeWidth={2} />
                    {!collapsed && <span className="text-[12px] font-medium">Admin</span>}
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
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* Footer — Profile */}
      <SidebarFooter className="p-2" style={{ borderTop: '1px solid hsl(217 44% 15% / 0.5)' }}>
        <div
          data-tour="profile"
          onClick={() => { navigate('/app/profile'); if (isMobile) setOpenMobile(false); }}
          className={cn(
            "flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all duration-250",
            "hover:bg-white/5 group",
            collapsed ? "justify-center" : ""
          )}
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-white/10 group-hover:ring-white/20 transition-all duration-300"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white/10 group-hover:ring-white/20 transition-all duration-300"
              style={{ background: 'hsl(216 89% 53%)' }}
            >
              <User className="w-3.5 h-3.5 text-white" strokeWidth={1.75} />
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {profile?.full_name?.split(' ')[0] || 'User'}
              </p>
              <p className="text-[9px] uppercase tracking-widest font-bold leading-tight mt-0.5 text-primary/70">
                {roleLabel}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-250",
            "text-white/40 hover:text-white hover:bg-white/5",
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
