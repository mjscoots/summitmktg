import { useState, useEffect, useCallback, RefObject } from 'react';

interface ScrollGateResult {
  atBottom: boolean;
  canProceed: boolean;
  scrollProgress: number;
  resetGate: () => void;
}

/**
 * Hook to detect when user has scrolled to bottom of content
 * Watches both window scroll and container scroll
 * Handles short content that doesn't require scrolling
 */
export function useScrollGate(
  containerRef?: RefObject<HTMLElement | null>,
  options?: { threshold?: number; enabled?: boolean }
): ScrollGateResult {
  const threshold = options?.threshold ?? 20;
  const enabled = options?.enabled ?? true;
  
  const [atBottom, setAtBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const checkScrollPosition = useCallback(() => {
    if (!enabled) {
      setAtBottom(true);
      setScrollProgress(100);
      return;
    }

    // Check if we have a specific container
    const container = containerRef?.current;
    
    if (container) {
      // Container-based scrolling
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;
      
      // If content fits without scrolling, we're at bottom
      if (maxScroll <= threshold) {
        setAtBottom(true);
        setScrollProgress(100);
        return;
      }
      
      const progress = Math.min(100, (scrollTop / maxScroll) * 100);
      setScrollProgress(progress);
      
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        setAtBottom(true);
      }
    } else {
      // Window-based scrolling (default)
      const { scrollY, innerHeight } = window;
      const { scrollHeight } = document.documentElement;
      const maxScroll = scrollHeight - innerHeight;
      
      // If page fits without scrolling, we're at bottom
      if (maxScroll <= threshold) {
        setAtBottom(true);
        setScrollProgress(100);
        return;
      }
      
      const progress = Math.min(100, (scrollY / maxScroll) * 100);
      setScrollProgress(progress);
      
      if (scrollY + innerHeight >= scrollHeight - threshold) {
        setAtBottom(true);
      }
    }
  }, [containerRef, threshold, enabled]);

  const resetGate = useCallback(() => {
    setAtBottom(false);
    setScrollProgress(0);
  }, []);

  // Check on mount and when content changes
  useEffect(() => {
    // Initial check after a brief delay for content to render
    const initialCheck = setTimeout(checkScrollPosition, 100);
    
    // Also check after images/content may have loaded
    const delayedCheck = setTimeout(checkScrollPosition, 500);
    
    return () => {
      clearTimeout(initialCheck);
      clearTimeout(delayedCheck);
    };
  }, [checkScrollPosition]);

  // Listen to scroll events
  useEffect(() => {
    const container = containerRef?.current;
    
    const handleScroll = () => {
      checkScrollPosition();
    };
    
    // Listen to both window and container scroll
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [containerRef, checkScrollPosition]);

  return {
    atBottom,
    canProceed: atBottom,
    scrollProgress,
    resetGate,
  };
}
