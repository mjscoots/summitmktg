import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { Button } from '@/components/ui/button';

export default function PortalLayout() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = [
    { to: '/portal', label: 'Home', end: true },
    { to: '/portal/training', label: 'Training' },
    ...(isManagerOrAbove(role) ? [{ to: '/portal/rookie-status', label: 'Rookie Status' }] : []),
    { to: '/portal/forms', label: 'Forms' },
    { to: '/portal/resources', label: 'Resources' },
    { to: '/portal/calendar', label: 'Calendar' },
  ];
  const handleSignOut = async () => { await signOut(); navigate('/login', { replace: true }); };

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} onClick={() => setOpen(false)}
          className={({ isActive }) => `min-h-11 flex items-center rounded-md px-3 text-sm font-medium transition-colors ${isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
  const footer = (
    <div className="border-t border-border pt-4 space-y-2">
      <p className="text-sm text-foreground truncate px-3">{profile?.full_name || ''}</p>
      <Button variant="ghost" className="w-full justify-start min-h-11" onClick={handleSignOut}>
        <LogOut className="w-4 h-4 mr-2" />Sign out
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="hidden md:flex md:flex-col md:justify-between w-60 shrink-0 border-r border-border bg-card p-4 sticky top-0 h-screen">
        <div className="space-y-6"><p className="px-3 font-bold tracking-tight">Trinity Portal</p>{nav}</div>
        {footer}
      </aside>
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 h-14">
        <p className="font-bold tracking-tight">Trinity Portal</p>
        <Button variant="ghost" size="icon" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>
      {open && <div className="md:hidden border-b border-border bg-card p-4 space-y-4">{nav}{footer}</div>}
      <main className="flex-1 min-w-0 px-4 py-6 md:px-10 md:py-10 max-w-4xl"><Outlet /></main>
    </div>
  );
}
