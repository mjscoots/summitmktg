import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type ThemeRole = 'rookie' | 'manager';
type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeRole: ThemeRole;
  themeMode: ThemeMode;
  setThemeRole: (role: ThemeRole) => void;
  toggleThemeMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyRoleTheme(role: ThemeRole) {
  const root = document.documentElement;
  if (role === 'rookie') {
    root.style.setProperty('--primary', '142 70% 45%');
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--accent', '142 70% 45%');
    root.style.setProperty('--accent-foreground', '0 0% 100%');
    root.style.setProperty('--ring', '142 70% 45%');
    root.style.setProperty('--sidebar-primary', '142 70% 45%');
    root.style.setProperty('--sidebar-ring', '142 70% 45%');
  } else {
    root.style.setProperty('--primary', '216 80% 45%');
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--accent', '216 80% 45%');
    root.style.setProperty('--accent-foreground', '0 0% 100%');
    root.style.setProperty('--ring', '216 80% 45%');
    root.style.setProperty('--sidebar-primary', '216 80% 45%');
    root.style.setProperty('--sidebar-ring', '216 80% 45%');
  }
}

function applyModeTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
    root.style.setProperty('--background', '0 0% 98%');
    root.style.setProperty('--foreground', '220 15% 10%');
    root.style.setProperty('--card', '0 0% 100%');
    root.style.setProperty('--card-foreground', '220 15% 10%');
    root.style.setProperty('--popover', '0 0% 100%');
    root.style.setProperty('--popover-foreground', '220 15% 10%');
    root.style.setProperty('--secondary', '220 14% 94%');
    root.style.setProperty('--secondary-foreground', '220 14% 30%');
    root.style.setProperty('--muted', '220 14% 92%');
    root.style.setProperty('--muted-foreground', '220 10% 45%');
    root.style.setProperty('--border', '220 13% 87%');
    root.style.setProperty('--input', '220 14% 92%');
    root.style.setProperty('--sidebar-background', '0 0% 97%');
    root.style.setProperty('--sidebar-foreground', '220 15% 25%');
    root.style.setProperty('--sidebar-accent', '220 14% 92%');
    root.style.setProperty('--sidebar-accent-foreground', '220 15% 25%');
    root.style.setProperty('--sidebar-border', '220 13% 87%');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.setProperty('--background', '220 15% 4%');
    root.style.setProperty('--foreground', '0 0% 98%');
    root.style.setProperty('--card', '220 13% 8%');
    root.style.setProperty('--card-foreground', '0 0% 98%');
    root.style.setProperty('--popover', '220 13% 8%');
    root.style.setProperty('--popover-foreground', '0 0% 98%');
    root.style.setProperty('--secondary', '220 14% 12%');
    root.style.setProperty('--secondary-foreground', '0 0% 85%');
    root.style.setProperty('--muted', '220 14% 14%');
    root.style.setProperty('--muted-foreground', '220 10% 50%');
    root.style.setProperty('--border', '220 13% 15%');
    root.style.setProperty('--input', '220 14% 10%');
    root.style.setProperty('--sidebar-background', '220 16% 3%');
    root.style.setProperty('--sidebar-foreground', '0 0% 85%');
    root.style.setProperty('--sidebar-accent', '220 14% 10%');
    root.style.setProperty('--sidebar-accent-foreground', '0 0% 85%');
    root.style.setProperty('--sidebar-border', '220 13% 12%');
  }
}

export function ThemeProvider({
  children,
  initialRole = 'rookie',
}: {
  children: ReactNode;
  initialRole?: ThemeRole;
}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('summit-theme-mode') as ThemeMode) || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    applyRoleTheme(initialRole);
  }, [initialRole]);

  useEffect(() => {
    applyModeTheme(themeMode);
    localStorage.setItem('summit-theme-mode', themeMode);
  }, [themeMode]);

  const setThemeRole = (role: ThemeRole) => {
    applyRoleTheme(role);
  };

  const toggleThemeMode = () => {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ themeRole: initialRole, themeMode, setThemeRole, toggleThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
