 import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
 
 interface RookieViewContextType {
   isRookieView: boolean;
   toggleRookieView: () => void;
   setRookieView: (value: boolean) => void;
 }
 
 const RookieViewContext = createContext<RookieViewContextType | undefined>(undefined);
 
 export function RookieViewProvider({ children }: { children: ReactNode }) {
   const [isRookieView, setIsRookieView] = useState(false);
 
   const toggleRookieView = useCallback(() => {
     setIsRookieView(prev => !prev);
   }, []);
 
   const setRookieView = useCallback((value: boolean) => {
     setIsRookieView(value);
   }, []);
 
   return (
     <RookieViewContext.Provider value={{ isRookieView, toggleRookieView, setRookieView }}>
       {children}
     </RookieViewContext.Provider>
   );
 }
 
 export function useRookieView(): RookieViewContextType {
   const context = useContext(RookieViewContext);
   if (!context) {
     // Return default values if not within provider
     return {
       isRookieView: false,
       toggleRookieView: () => {},
       setRookieView: () => {},
     };
   }
   return context;
 }