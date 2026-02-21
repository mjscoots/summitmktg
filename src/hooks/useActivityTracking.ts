 import { useEffect, useRef } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from './useAuth';
 
 // Track user activity and update last_active_at
 export function useActivityTracking() {
   const { user } = useAuth();
   const lastUpdateRef = useRef<number>(0);
   const isActiveRef = useRef<boolean>(true);
 
   useEffect(() => {
     if (!user) return;
 
     const updateActivity = async () => {
       const now = Date.now();
       // Only update if at least 30 seconds have passed
       if (now - lastUpdateRef.current < 30000) return;
       
       lastUpdateRef.current = now;
       
       try {
         await supabase.rpc('update_user_activity', { _user_id: user.id });
       } catch (err) {
         // Silent fail - activity tracking is non-critical
         // Silent fail - activity tracking is non-critical
       }
     };
 
     // Update on initial load
     updateActivity();
 
     // Track user interactions
     const handleActivity = () => {
       isActiveRef.current = true;
       updateActivity();
     };
 
     // Event listeners for activity detection
     const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
     events.forEach(event => {
       window.addEventListener(event, handleActivity, { passive: true });
     });
 
     // Periodic heartbeat every 30 seconds if active
     const intervalId = setInterval(() => {
       if (isActiveRef.current) {
         updateActivity();
         isActiveRef.current = false; // Reset, will be set true on next activity
       }
     }, 30000);
 
     return () => {
       events.forEach(event => {
         window.removeEventListener(event, handleActivity);
       });
       clearInterval(intervalId);
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
 
 // Format time in minutes to hours/minutes display
 export function formatTimeMinutes(minutes: number): string {
   if (minutes < 60) return `${minutes}m`;
   const hours = Math.floor(minutes / 60);
   const mins = minutes % 60;
   if (mins === 0) return `${hours}h`;
   return `${hours}h ${mins}m`;
 }