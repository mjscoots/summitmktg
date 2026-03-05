import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const IDLE_TIMEOUT_MS = 90_000; // 90 seconds — no interaction = pause time accrual

function getRouteCategory(): string {
  const path = window.location.pathname;
  if (/^\/app\/training\/videos\/[^/]+/.test(path)) return 'video';
  if (/^\/app\/training\/[^/]+\/[^/]+/.test(path)) return 'lesson';
  if (/^\/app\/training/.test(path)) return 'training';
  return 'other';
}

/**
 * Qualified-time activity tracker with anti-idle protection.
 *
 * Rules:
 * - Only counts time when tab is VISIBLE (Page Visibility API)
 * - Only counts time when user has interacted within the last 90 seconds
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
        // Reset interaction timer when tab regains focus
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

    // --- Heartbeat ---
    const tick = async () => {
      // Guard: tab hidden
      if (!isVisibleRef.current) return;

      // Guard: idle (no interaction for 90 s)
      if (Date.now() - lastInteractionRef.current > IDLE_TIMEOUT_MS) return;

      // Guard: rate-limit to 1 call per 60 s
      const now = Date.now();
      if (now - lastUpdateRef.current < 60_000) return;
      lastUpdateRef.current = now;

      try {
        const category = getRouteCategory();
        // Record 1 minute of qualified time
        await (supabase.rpc as any)('record_daily_time', {
          _user_id: user.id,
          _category: category,
        });
        // Update presence
        await supabase.rpc('update_user_activity', { _user_id: user.id });
      } catch {
        // Silent — non-critical
      }
    };

    tick(); // fire immediately on mount
    const id = setInterval(tick, 60_000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      events.forEach(e => window.removeEventListener(e, handleInteraction));
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
