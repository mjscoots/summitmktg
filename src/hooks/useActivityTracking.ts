import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const IDLE_TIMEOUT_GENERAL_MS = 180_000;  // 3 min — general pages
const IDLE_TIMEOUT_CONTENT_MS = 600_000;  // 10 min — video/lesson pages (passive consumption)

function getRouteCategory(): string {
  const path = window.location.pathname;
  if (/^\/app\/training\/videos\/[^/]+/.test(path)) return 'video';
  if (/^\/app\/training\/[^/]+\/[^/]+/.test(path)) return 'lesson';
  if (/^\/app\/training/.test(path)) return 'training';
  return 'other';
}

function isContentRoute(): boolean {
  const cat = getRouteCategory();
  return cat === 'video' || cat === 'lesson';
}

/**
 * Qualified-time activity tracker with anti-idle protection.
 *
 * Rules:
 * - Only counts time when tab is VISIBLE (Page Visibility API)
 * - Only counts time when user has interacted within the idle window
 * - Idle window is 10 min on video/lesson pages (passive consumption)
 *   and 3 min on other pages
 * - Video `timeupdate` events count as interaction (auto-extends while playing)
 * - Heartbeat fires every 60 seconds; skips if idle or hidden
 */
export function useActivityTracking() {
  const { user } = useAuth();
  const lastUpdateRef = useRef<number>(0);
  const lastInteractionRef = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(true);

  useEffect(() => {
    if (!user) return;

    // --- Visibility ---
    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      if (isVisibleRef.current) {
        lastInteractionRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // --- Interaction tracking ---
    const handleInteraction = () => {
      lastInteractionRef.current = Date.now();
    };
    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart', 'mousedown', 'keydown'];
    events.forEach(e => window.addEventListener(e, handleInteraction, { passive: true }));

    // --- Video playback detection ---
    // Listen for timeupdate on any <video> or <iframe> to keep session alive
    // while user is passively watching content
    const videoObserver = new MutationObserver(() => {
      document.querySelectorAll('video').forEach(v => {
        if (!(v as any).__activityBound) {
          v.addEventListener('timeupdate', handleInteraction, { passive: true });
          v.addEventListener('playing', handleInteraction, { passive: true });
          (v as any).__activityBound = true;
        }
      });
    });
    videoObserver.observe(document.body, { childList: true, subtree: true });
    // Bind existing videos immediately
    document.querySelectorAll('video').forEach(v => {
      v.addEventListener('timeupdate', handleInteraction, { passive: true });
      v.addEventListener('playing', handleInteraction, { passive: true });
      (v as any).__activityBound = true;
    });

    // --- Heartbeat ---
    const tick = async () => {
      if (!isVisibleRef.current) return;

      // Use longer idle timeout on content pages
      const idleTimeout = isContentRoute() ? IDLE_TIMEOUT_CONTENT_MS : IDLE_TIMEOUT_GENERAL_MS;
      if (Date.now() - lastInteractionRef.current > idleTimeout) return;

      // Rate-limit to 1 call per ~55s
      const now = Date.now();
      if (now - lastUpdateRef.current < 55_000) return;
      lastUpdateRef.current = now;

      try {
        const category = getRouteCategory();
        await (supabase.rpc as any)('record_daily_time', {
          _user_id: user.id,
          _category: category,
        });
        await supabase.rpc('update_user_activity', { _user_id: user.id });
      } catch {
        // Silent — non-critical
      }
    };

    tick();
    const id = setInterval(tick, 60_000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      events.forEach(e => window.removeEventListener(e, handleInteraction));
      videoObserver.disconnect();
      clearInterval(id);
    };
  }, [user]);
}

// Format last active time for display
export function formatLastActive(lastActiveAt: string | null): string {
  if (!lastActiveAt) return 'Never';
  const lastActive = new Date(lastActiveAt);
  const now = new Date();
  const diffMs = now.getTime() - lastActive.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 5) return 'Active now';
  if (diffMins < 60) return `Active ${diffMins} min ago`;
  if (diffHours < 24) return `Active ${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Active yesterday';
  if (diffDays < 7) return `Active ${diffDays} days ago`;
  return `Last active ${lastActive.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function formatTimeMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
