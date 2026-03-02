import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Component that scrolls to top of page on route change
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType !== "POP") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      // Also reset any nested scroll containers
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname, navType]);

  return null;
};
