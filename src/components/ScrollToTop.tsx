import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Component that scrolls to top of page on route change.
 * When the URL carries a hash (e.g. /recruiting#apply), scrolls the matching
 * element into view instead — on PUSH/REPLACE and on POP (back/forward).
 */
export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      let attempts = 0;
      let cancelled = false;

      const tryScroll = () => {
        if (cancelled) return;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "instant", block: "start" });
          return;
        }
        attempts += 1;
        // Wait for the route to paint; give up after ~500ms and fall back to top.
        if (attempts < 10) {
          requestAnimationFrame(() => requestAnimationFrame(tryScroll));
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
      };

      requestAnimationFrame(() => requestAnimationFrame(tryScroll));
      return () => {
        cancelled = true;
      };
    }

    if (navType !== "POP") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      // Also reset any nested scroll containers
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname, hash, navType]);

  return null;
};
