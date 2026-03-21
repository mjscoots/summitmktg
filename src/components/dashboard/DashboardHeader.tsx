import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Menu, X, Mountain } from 'lucide-react';
import { useState } from 'react';
import { isManagerOrAbove } from '@/lib/roles';

export function DashboardHeader() {
  const navigate = useNavigate();
  const { role, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isManager = isManagerOrAbove(role);
  const roleLabel = role === 'owner' ? 'OWNER' : isManager ? 'MANAGER' : 'ROOKIE';
  const roleColor = role === 'owner' ? 'text-yellow-400' : isManager ? 'text-blue-400' : 'text-green-400';
  const roleBgColor = isManager ? 'bg-blue-500/10' : 'bg-green-500/10';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = isManager
    ? [
        { label: 'Dashboard', path: '/app' },
        { label: 'Training', path: '/app/training' },
        { label: 'Leaderboard', path: '/app/leaderboard' },
        { label: 'Team', path: '/app/team' },
        { label: 'Announcements', path: '/app/announcements' },
      ]
    : [
        { label: 'Dashboard', path: '/app' },
        { label: 'Training', path: '/app/training' },
        { label: 'Leaderboard', path: '/app/leaderboard' },
        { label: 'Announcements', path: '/app/announcements' },
      ];

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo + Role Badge */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
            >
              <Mountain className="w-5 h-5 text-primary" />
              <span className="text-lg font-black tracking-tight uppercase" style={{ textShadow: '0 0 10px hsl(216, 80%, 45%, 0.3)' }}>
                Summit
              </span>
            </button>
            <span className={`text-xs font-bold ${roleColor} ${roleBgColor} px-2.5 py-1 rounded uppercase tracking-wide`}>
              {roleLabel}
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </button>
            ))}
            
            {/* User Menu */}
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium text-foreground">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-muted-foreground hover:text-foreground p-2"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden pt-4 pb-2 border-t border-border mt-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 mt-2 border-t border-border">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
