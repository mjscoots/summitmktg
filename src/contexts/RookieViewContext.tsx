import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ImpersonatedUser {
  user_id: string;
  full_name: string;
  email: string;
}

interface RookieViewContextType {
  isRookieView: boolean;
  toggleRookieView: () => void;
  setRookieView: (value: boolean) => void;
  impersonatedUser: ImpersonatedUser | null;
  startImpersonating: (user: ImpersonatedUser) => void;
  stopImpersonating: () => void;
  isImpersonating: boolean;
}

const RookieViewContext = createContext<RookieViewContextType | undefined>(undefined);

export function RookieViewProvider({ children }: { children: ReactNode }) {
  const [isRookieView, setIsRookieView] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);

  const toggleRookieView = useCallback(() => {
    setIsRookieView(prev => !prev);
  }, []);

  const setRookieView = useCallback((value: boolean) => {
    setIsRookieView(value);
  }, []);

  const startImpersonating = useCallback((user: ImpersonatedUser) => {
    setImpersonatedUser(user);
    setIsRookieView(true);
  }, []);

  const stopImpersonating = useCallback(() => {
    setImpersonatedUser(null);
    setIsRookieView(false);
  }, []);

  return (
    <RookieViewContext.Provider value={{
      isRookieView,
      toggleRookieView,
      setRookieView,
      impersonatedUser,
      startImpersonating,
      stopImpersonating,
      isImpersonating: !!impersonatedUser,
    }}>
      {children}
    </RookieViewContext.Provider>
  );
}

export function useRookieView(): RookieViewContextType {
  const context = useContext(RookieViewContext);
  if (!context) {
    return {
      isRookieView: false,
      toggleRookieView: () => {},
      setRookieView: () => {},
      impersonatedUser: null,
      startImpersonating: () => {},
      stopImpersonating: () => {},
      isImpersonating: false,
    };
  }
  return context;
}
