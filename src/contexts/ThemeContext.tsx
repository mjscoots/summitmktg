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
  // A workspace theme owns its own accent colours; do not overwrite them.
  if (root.dataset.workspaceTheme === '1') return;
  // All roles use the same deep blue palette now
  root.style.setProperty('--primary', '216 89% 53%');
  root.style.setProperty('--primary-foreground', '0 0% 100%');
  root.style.setProperty('--accent', '216 89% 53%');
  root.style.setProperty('--accent-foreground', '0 0% 100%');
  root.style.setProperty('--ring', '216 89% 53%');
  root.style.setProperty('--sidebar-primary', '216 89% 53%');
  root.style.setProperty('--sidebar-ring', '216 89% 53%');
}

function applyModeTheme(_mode: ThemeMode) {
  // Appearance owns light and dark now: src/lib/appearance.ts marks the
  // resolved mode on <html> and the workspace theme writes the palette.
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
