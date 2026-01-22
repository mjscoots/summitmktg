import { createContext, useContext, useEffect, ReactNode } from 'react';

type ThemeRole = 'rookie' | 'manager';

interface ThemeContextType {
  themeRole: ThemeRole;
  setThemeRole: (role: ThemeRole) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Apply CSS custom properties based on role
function applyRoleTheme(role: ThemeRole) {
  const root = document.documentElement;
  
  if (role === 'rookie') {
    // Green theme for rookies
    root.style.setProperty('--primary', '142 70% 45%');
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--accent', '142 70% 45%');
    root.style.setProperty('--accent-foreground', '0 0% 100%');
    root.style.setProperty('--ring', '142 70% 45%');
    root.style.setProperty('--sidebar-primary', '142 70% 45%');
    root.style.setProperty('--sidebar-ring', '142 70% 45%');
  } else {
    // Blue theme for managers
    root.style.setProperty('--primary', '216 80% 45%');
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--accent', '216 80% 45%');
    root.style.setProperty('--accent-foreground', '0 0% 100%');
    root.style.setProperty('--ring', '216 80% 45%');
    root.style.setProperty('--sidebar-primary', '216 80% 45%');
    root.style.setProperty('--sidebar-ring', '216 80% 45%');
  }
}

export function ThemeProvider({ 
  children, 
  initialRole = 'rookie' 
}: { 
  children: ReactNode;
  initialRole?: ThemeRole;
}) {
  useEffect(() => {
    applyRoleTheme(initialRole);
  }, [initialRole]);

  const setThemeRole = (role: ThemeRole) => {
    applyRoleTheme(role);
  };

  return (
    <ThemeContext.Provider value={{ themeRole: initialRole, setThemeRole }}>
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
