import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * Breakpoint for the app shell sidebar. Must stay in sync with the `lg:`
 * header switch in AppLayout: below 1024px (all iPad portrait widths and
 * iPad landscape at 1024 minus browser chrome) the sidebar is an off-canvas
 * drawer, so tablets never land in a half-desktop layout.
 */
const SIDEBAR_DESKTOP_BREAKPOINT = 1024;

export function useIsSidebarMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${SIDEBAR_DESKTOP_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < SIDEBAR_DESKTOP_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < SIDEBAR_DESKTOP_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
