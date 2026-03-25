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
  // All roles use the same deep blue palette now
  root.style.setProperty('--primary', '216 89% 53%');
  root.style.setProperty('--primary-foreground', '0 0% 100%');
  root.style.setProperty('--accent', '216 89% 53%');
  root.style.setProperty('--accent-foreground', '0 0% 100%');
  root.style.setProperty('--ring', '216 89% 53%');
  root.style.setProperty('--sidebar-primary', '216 89% 53%');
  root.style.setProperty('--sidebar-ring', '216 89% 53%');
}

function applyModeTheme(mode: ThemeMode) {
  const root = document.documentElement;
  // Always dark — the brand is a dark premium dashboard
  root.classList.add('dark');
  root.classList.remove('light');
  root.style.setProperty('--background', '216 30% 5%');
  root.style.setProperty('--foreground', '223 100% 97%');
  root.style.setProperty('--card', '220 40% 10%');
  root.style.setProperty('--card-foreground', '223 100% 97%');
  root.style.setProperty('--popover', '220 40% 10%');
  root.style.setProperty('--popover-foreground', '223 100% 97%');
  root.style.setProperty('--secondary', '218 46% 14%');
  root.style.setProperty('--secondary-foreground', '223 100% 97%');
  root.style.setProperty('--muted', '218 46% 14%');
  root.style.setProperty('--muted-foreground', '217 25% 50%');
  root.style.setProperty('--border', '217 44% 20%');
  root.style.setProperty('--input', '220 40% 10%');
  root.style.setProperty('--sidebar-background', '216 40% 3%');
  root.style.setProperty('--sidebar-foreground', '0 0% 85%');
  root.style.setProperty('--sidebar-accent', '218 46% 14%');
  root.style.setProperty('--sidebar-accent-foreground', '0 0% 90%');
  root.style.setProperty('--sidebar-border', '217 44% 15%');
}

export function ThemeProvider({
  children,
  initialRole = 'rookie',
}: {
  children: ReactNode;
  initialRole?: ThemeRole;
}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    applyRoleTheme(initialRole);
  }, [initialRole]);

  useEffect(() => {
    applyModeTheme(themeMode);
  }, [themeMode]);

  const setThemeRole = (role: ThemeRole) => {
    applyRoleTheme(role);
  };

  const toggleThemeMode = () => {
    // Always stays dark
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
