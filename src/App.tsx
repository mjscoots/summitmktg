import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RookieViewProvider } from "@/contexts/RookieViewContext";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "sonner";
import { ScrollToTop } from "@/components/ScrollToTop";

// Public pages (keep eager – small & needed immediately)
import Index from "./pages/Index";
import AuthPage from "./pages/app/AuthPage";
import NotFound from "./pages/NotFound";
import Recruiting from "./pages/Recruiting";
import RookieApplication from "./pages/RookieApplication";
import VetApplication from "./pages/VetApplication";
import ApplySuccess from "./pages/ApplySuccess";
import PendingApproval from "./pages/app/PendingApproval";

// Core app pages (keep eager – most users hit these immediately)
import { BootcampGate } from "@/components/BootcampGate";
import DashboardPage from "./pages/app/DashboardPage";
import TrainingPage from "./pages/app/TrainingPage";

// Lazy-loaded pages (loaded on demand to reduce initial bundle)
const BootcampLock = lazy(() => import("./pages/app/BootcampLock"));
const BootcampPhase1 = lazy(() => import("./pages/app/BootcampPhase1"));
const BootcampPhase2 = lazy(() => import("./pages/app/BootcampPhase2"));
const BootcampMomentum = lazy(() => import("./pages/app/BootcampMomentum"));
const BootcampPhase3 = lazy(() => import("./pages/app/BootcampPhase3"));
const TrainingCoursePage = lazy(() => import("./pages/app/TrainingCoursePage"));
const LessonPage = lazy(() => import("./pages/app/LessonPage"));
const LeaderboardPage = lazy(() => import("./pages/app/LeaderboardPage"));
const CalendarPage = lazy(() => import("./pages/app/CalendarPage"));
const MyTeamPage = lazy(() => import("./pages/app/MyTeamPage"));
const MembersPage = lazy(() => import("./pages/app/MembersPage"));
const ProfilePage = lazy(() => import("./pages/app/ProfilePage"));
const InterviewsPage = lazy(() => import("./pages/app/InterviewsPage"));
const Interview1Page = lazy(() => import("./pages/app/Interview1Page"));
const Interview2Page = lazy(() => import("./pages/app/Interview2Page"));
const Interview3Page = lazy(() => import("./pages/app/Interview3Page"));

const FormsPage = lazy(() => import("./pages/app/FormsPage"));
const TrainingVideosPage = lazy(() => import("./pages/app/TrainingVideosPage"));
const ManagerTrainingVideosPage = lazy(() => import("./pages/app/ManagerTrainingVideosPage"));
const VideosPage = lazy(() => import("./pages/app/VideosPage"));
const AdminTeamPage = lazy(() => import("./pages/app/AdminTeamPage"));
const VideoPlayerPage = lazy(() => import("./pages/app/VideoPlayerPage"));
const ChatPage = lazy(() => import("./pages/app/ChatPage"));
const LinksPage = lazy(() => import("./pages/app/LinksPage"));
const OneOnOnePrepPage = lazy(() => import("./pages/app/OneOnOnePrepPage"));
const PitchApprovalsPage = lazy(() => import("./pages/app/PitchApprovalsPage"));
const WarRoomPage = lazy(() => import("./pages/app/WarRoomPage"));
const NotepadPage = lazy(() => import("./pages/app/NotepadPage"));
const CalculatorsPage = lazy(() => import("./pages/app/CalculatorsPage"));
const OperationsPage = lazy(() => import("./pages/app/OperationsPage"));
const ManagePage = lazy(() => import("./pages/app/ManagePage"));

function LazyFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

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
          <ScrollToTop />
          <Suspense fallback={<LazyFallback />}>
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
               <Route path="/app/videos" element={
                 <ProtectedRoute>
                   <BootcampGate>
                     <VideosPage />
                   </BootcampGate>
                 </ProtectedRoute>
               } />
               <Route path="/app/videos/:videoId" element={
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

               {/* Links */}
               <Route path="/app/links" element={
                 <ProtectedRoute>
                   <BootcampGate>
                     <LinksPage />
                   </BootcampGate>
                 </ProtectedRoute>
               } />

               {/* Calculators */}
               <Route path="/app/calculators" element={
                 <ProtectedRoute>
                   <BootcampGate>
                     <CalculatorsPage />
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

               {/* 1:1 Prep */}
               <Route path="/app/one-on-ones/prep" element={
                 <ProtectedRoute requiredRole="manager">
                   <OneOnOnePrepPage />
                 </ProtectedRoute>
               } />

               {/* Pitch Approvals (Manager+) */}
               <Route path="/app/pitch-approvals" element={
                 <ProtectedRoute requiredRole="manager">
                   <PitchApprovalsPage />
                 </ProtectedRoute>
               } />

              {/* Admin Team Management */}
              <Route path="/admin/team" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminTeamPage />
                </ProtectedRoute>
              } />

              {/* Operations Hub */}
              <Route path="/app/operations" element={
                <ProtectedRoute>
                  <BootcampGate>
                    <OperationsPage />
                  </BootcampGate>
                </ProtectedRoute>
              } />

              {/* Manage Hub (replaces Analytics) */}
              <Route path="/app/manage" element={
                <ProtectedRoute>
                  <BootcampGate>
                    <ManagePage />
                  </BootcampGate>
                </ProtectedRoute>
              } />
              {/* Redirect old analytics route */}
              <Route path="/app/analytics" element={<Navigate to="/app/manage" replace />} />

              {/* War Room */}
              <Route path="/app/war-room" element={
                <ProtectedRoute>
                  <BootcampGate>
                    <WarRoomPage />
                  </BootcampGate>
                </ProtectedRoute>
              } />

             {/* Notepad */}
             <Route path="/app/notepad" element={
               <ProtectedRoute>
                 <BootcampGate>
                   <NotepadPage />
                 </BootcampGate>
               </ProtectedRoute>
             } />

             {/* Catch-all */}
             <Route path="*" element={<NotFound />} />
           </Routes>
         </Suspense>
       </BrowserRouter>
     </TooltipProvider>
   );
 }

 const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <RookieViewProvider>
         <AppContent />
      </RookieViewProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
