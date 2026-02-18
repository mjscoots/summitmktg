import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RookieViewProvider } from "@/contexts/RookieViewContext";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "sonner";

// Public pages
import Index from "./pages/Index";
import AuthPage from "./pages/app/AuthPage";
import NotFound from "./pages/NotFound";
import Recruiting from "./pages/Recruiting";
import RookieApplication from "./pages/RookieApplication";
import VetApplication from "./pages/VetApplication";
import ApplySuccess from "./pages/ApplySuccess";
import PendingApproval from "./pages/app/PendingApproval";

// App pages
import { BootcampGate } from "@/components/BootcampGate";
import DashboardPage from "./pages/app/DashboardPage";
import TrainingPage from "./pages/app/TrainingPage";
import BootcampLock from "./pages/app/BootcampLock";
import BootcampPhase1 from "./pages/app/BootcampPhase1";
import BootcampPhase2 from "./pages/app/BootcampPhase2";
import BootcampMomentum from "./pages/app/BootcampMomentum";
import BootcampPhase3 from "./pages/app/BootcampPhase3";
import TrainingCoursePage from "./pages/app/TrainingCoursePage";
import LessonPage from "./pages/app/LessonPage";
import LeaderboardPage from "./pages/app/LeaderboardPage";
import CalendarPage from "./pages/app/CalendarPage";
import MyTeamPage from "./pages/app/MyTeamPage";
import MembersPage from "./pages/app/MembersPage";
import ProfilePage from "./pages/app/ProfilePage";
import InterviewsPage from "./pages/app/InterviewsPage";
import Interview1Page from "./pages/app/Interview1Page";
import Interview2Page from "./pages/app/Interview2Page";
import Interview3Page from "./pages/app/Interview3Page";
import WeeklyOneOnOnesPage from "./pages/app/WeeklyOneOnOnesPage";
import FormsPage from "./pages/app/FormsPage";

import TrainingVideosPage from "./pages/app/TrainingVideosPage";
import ManagerTrainingVideosPage from "./pages/app/ManagerTrainingVideosPage";
import AdminTeamPage from "./pages/app/AdminTeamPage";
import VideoPlayerPage from "./pages/app/VideoPlayerPage";
import ChatPage from "./pages/app/ChatPage";
const queryClient = new QueryClient();

 // Inner app component to use hooks
 function AppContent() {
   // Initialize activity tracking
   useActivityTracking();

   // Global unhandled rejection handler - prevents silent black screens on mobile
   useEffect(() => {
     const handleRejection = (event: PromiseRejectionEvent) => {
       console.error("Unhandled promise rejection:", event.reason);
       // Don't show toast for auth refresh errors (expected on stale sessions)
       const msg = String(event.reason?.message || event.reason || "");
       if (!msg.includes("Refresh Token") && !msg.includes("JWT")) {
         toast.error("Something went wrong. Please try refreshing.");
       }
       event.preventDefault();
     };

     const handleError = (event: ErrorEvent) => {
       console.error("Unhandled error:", event.error);
       event.preventDefault();
     };

     window.addEventListener("unhandledrejection", handleRejection);
     window.addEventListener("error", handleError);
     return () => {
       window.removeEventListener("unhandledrejection", handleRejection);
       window.removeEventListener("error", handleError);
     };
   }, []);
 
   return (
     <TooltipProvider>
       <Toaster />
       <Sonner />
       <BrowserRouter>
         <Routes>
           {/* ========== PUBLIC ROUTES ========== */}
           <Route path="/" element={<Index />} />
           <Route path="/recruiting" element={<Recruiting />} />
           {/* Redirect /apply to /recruiting#apply section */}
           <Route path="/apply" element={<Navigate to="/recruiting#apply" replace />} />
           <Route path="/apply/rookie" element={<RookieApplication />} />
           <Route path="/apply/veteran" element={<VetApplication />} />
           <Route path="/apply/success" element={<ApplySuccess />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            {/* Redirect any signup attempts to login */}
            <Route path="/signup" element={<Navigate to="/login" replace />} />
 
            {/* ========== BOOTCAMP ROUTES ========== */}
            <Route path="/bootcamp-lock" element={
              <ProtectedRoute>
                <BootcampLock />
              </ProtectedRoute>
            } />
            <Route path="/bootcamp/momentum" element={
              <ProtectedRoute>
                <BootcampMomentum />
              </ProtectedRoute>
            } />
            <Route path="/bootcamp/phase-1" element={
              <ProtectedRoute>
                <BootcampPhase1 />
              </ProtectedRoute>
            } />
            <Route path="/bootcamp/phase-2" element={
              <ProtectedRoute>
                <BootcampPhase2 />
              </ProtectedRoute>
            } />
            <Route path="/bootcamp/phase-3" element={
              <ProtectedRoute>
                <BootcampPhase3 />
              </ProtectedRoute>
            } />

            {/* ========== APP - PROTECTED ROUTES ========== */}
            
            {/* Main Dashboard */}
            <Route path="/app" element={
              <ProtectedRoute>
                <BootcampGate>
                  <DashboardPage />
                </BootcampGate>
              </ProtectedRoute>
            } />
  
            {/* Legacy routes - redirect to unified /app */}
            <Route path="/app/rookie" element={<Navigate to="/app" replace />} />
            <Route path="/app/manager" element={<Navigate to="/app" replace />} />
           <Route path="/rookie" element={<Navigate to="/app" replace />} />
           <Route path="/manager" element={<Navigate to="/app" replace />} />
           <Route path="/app-redirect" element={<Navigate to="/app" replace />} />
           <Route path="/app/progress" element={<Navigate to="/app/training" replace />} />

            {/* Chat */}
            <Route path="/app/chat" element={
              <ProtectedRoute>
                <BootcampGate>
                  <ChatPage />
                </BootcampGate>
              </ProtectedRoute>
            } />
            
            {/* Training */}
             <Route path="/app/training" element={
               <ProtectedRoute>
                 <BootcampGate>
                   <TrainingPage />
                 </BootcampGate>
               </ProtectedRoute>
             } />
             <Route path="/app/training/videos" element={
               <ProtectedRoute>
                 <BootcampGate>
                   <TrainingVideosPage />
                 </BootcampGate>
               </ProtectedRoute>
             } />
             <Route path="/app/training/manager-videos" element={
               <ProtectedRoute>
                 <BootcampGate>
                   <ManagerTrainingVideosPage />
                 </BootcampGate>
               </ProtectedRoute>
             } />
             <Route path="/app/training/videos/:videoId" element={
               <ProtectedRoute>
                 <BootcampGate>
                   <VideoPlayerPage />
                 </BootcampGate>
               </ProtectedRoute>
             } />
             <Route path="/app/training/:courseSlug" element={
               <ProtectedRoute>
                 <BootcampGate>
                   <TrainingCoursePage />
                 </BootcampGate>
               </ProtectedRoute>
             } />
             <Route path="/app/training/:courseSlug/:lessonId" element={
               <ProtectedRoute>
                 <BootcampGate>
                   <LessonPage />
                 </BootcampGate>
               </ProtectedRoute>
             } />
            
            {/* My Team (Manager only) */}
            <Route path="/app/team" element={
              <ProtectedRoute requiredRole="manager">
                <MyTeamPage />
              </ProtectedRoute>
            } />

            {/* Members Directory (Manager only) */}
            <Route path="/app/members" element={
              <ProtectedRoute requiredRole="manager">
                <MembersPage />
              </ProtectedRoute>
            } />
 
           {/* Profile */}
            <Route path="/app/profile" element={
              <ProtectedRoute>
                <BootcampGate>
                  <ProfilePage />
                </BootcampGate>
              </ProtectedRoute>
            } />
            
            {/* Leaderboard */}
            <Route path="/app/leaderboard" element={
              <ProtectedRoute>
                <BootcampGate>
                  <LeaderboardPage />
                </BootcampGate>
              </ProtectedRoute>
            } />
 
            {/* Calendar */}
            <Route path="/app/calendar" element={
              <ProtectedRoute>
                <BootcampGate>
                  <CalendarPage />
                </BootcampGate>
              </ProtectedRoute>
            } />
 
           {/* Forms (unified - Manager Only) */}
           <Route path="/app/forms" element={
             <ProtectedRoute requiredRole="manager">
               <FormsPage />
             </ProtectedRoute>
           } />

           {/* Interview sub-routes */}
           <Route path="/app/interviews" element={<Navigate to="/app/forms" replace />} />
           <Route path="/app/interviews/1" element={
             <ProtectedRoute requiredRole="manager">
               <Interview1Page />
             </ProtectedRoute>
           } />
           <Route path="/app/interviews/2" element={
             <ProtectedRoute requiredRole="manager">
               <Interview2Page />
             </ProtectedRoute>
           } />
            <Route path="/app/interviews/3" element={
              <ProtectedRoute requiredRole="manager">
                <Interview3Page />
              </ProtectedRoute>
            } />

            {/* Weekly 1:1's - redirect to forms */}
            <Route path="/app/weekly-one-on-ones" element={<Navigate to="/app/forms" replace />} />
            

            {/* Admin Team Management */}
            <Route path="/admin/team" element={
              <ProtectedRoute requiredRole="manager">
                <AdminTeamPage />
              </ProtectedRoute>
            } />
 
           {/* Catch-all */}
           <Route path="*" element={<NotFound />} />
         </Routes>
       </BrowserRouter>
     </TooltipProvider>
   );
 }
 
 const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RookieViewProvider>
           <AppContent />
        </RookieViewProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
