import { useEffect, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { UpdatePrompt } from "@/components/layout/UpdatePrompt";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from "react-router-dom";
import { sectionForTab } from "@/lib/adminSections";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RookieViewProvider } from "@/contexts/RookieViewContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { WorkspaceThemeProvider } from "@/components/workspace/WorkspaceThemeProvider";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "sonner";
import { ScrollToTop } from "@/components/ScrollToTop";
import { lazyRoute, isChunkLoadError, recoverFromStaleBuild, clearChunkRetryLatch } from "@/lib/lazyRoute";

// Every route-level page is loaded on demand so the first paint ships only the
// shell. AuthPage and NotFound stay eager: they are tiny and must render without
// a second request when a session is missing or a URL is wrong.
import AuthPage from "./pages/app/AuthPage";
import NotFound from "./pages/NotFound";

const Index = lazyRoute(() => import("./pages/Index"));
const IndustryPage = lazyRoute(() => import("./pages/IndustryPage"));
const InvitePage = lazyRoute(() => import("./pages/InvitePage"));
const JoinRedirect = lazyRoute(() => import("./pages/JoinRedirect"));
const Recruiting = lazyRoute(() => import("./pages/Recruiting"));
const Parents = lazyRoute(() => import("./pages/Parents"));
const RookieApplication = lazyRoute(() => import("./pages/RookieApplication"));
const VetApplication = lazyRoute(() => import("./pages/VetApplication"));
const ApplySuccess = lazyRoute(() => import("./pages/ApplySuccess"));
const PendingApproval = lazyRoute(() => import("./pages/app/PendingApproval"));
const ResetPasswordPage = lazyRoute(() => import("./pages/app/ResetPasswordPage"));

const DashboardPage = lazyRoute(() => import("./pages/app/DashboardPage"));
const TrainingPage = lazyRoute(() => import("./pages/app/TrainingPage"));


// Lazy-loaded pages (loaded on demand to reduce initial bundle)
const BootcampLock = lazyRoute(() => import("./pages/app/BootcampLock"));
const BootcampPhase1 = lazyRoute(() => import("./pages/app/BootcampPhase1"));
const BootcampPhase2 = lazyRoute(() => import("./pages/app/BootcampPhase2"));
const BootcampMomentum = lazyRoute(() => import("./pages/app/BootcampMomentum"));
const BootcampPhase3 = lazyRoute(() => import("./pages/app/BootcampPhase3"));
const TrainingCoursePage = lazyRoute(() => import("./pages/app/TrainingCoursePage"));
const LessonPage = lazyRoute(() => import("./pages/app/LessonPage"));
const LeaderboardPage = lazyRoute(() => import("./pages/app/LeaderboardPage"));
const CalendarPage = lazyRoute(() => import("./pages/app/CalendarPage"));
const EventsPage = lazyRoute(() => import("./pages/app/EventsPage"));
const MyTeamPage = lazyRoute(() => import("./pages/app/MyTeamPage"));
const MyWeekPage = lazyRoute(() => import("./pages/app/MyWeekPage"));

const ProfilePage = lazyRoute(() => import("./pages/app/ProfilePage"));
const InterviewsPage = lazyRoute(() => import("./pages/app/InterviewsPage"));
const Interview1Page = lazyRoute(() => import("./pages/app/Interview1Page"));
const Interview2Page = lazyRoute(() => import("./pages/app/Interview2Page"));
const Interview3Page = lazyRoute(() => import("./pages/app/Interview3Page"));

const FormsPage = lazyRoute(() => import("./pages/app/FormsPage"));
const TrainingVideosPage = lazyRoute(() => import("./pages/app/TrainingVideosPage"));
const ManagerTrainingVideosPage = lazyRoute(() => import("./pages/app/ManagerTrainingVideosPage"));
const AdminTeamPage = lazyRoute(() => import("./pages/app/AdminTeamPage"));
const VideoPlayerPage = lazyRoute(() => import("./pages/app/VideoPlayerPage"));
const ChatPage = lazyRoute(() => import("./pages/app/ChatPage"));
const LinksPage = lazyRoute(() => import("./pages/app/LinksPage"));
const OneOnOnePrepPage = lazyRoute(() => import("./pages/app/OneOnOnePrepPage"));
const PitchApprovalsPage = lazyRoute(() => import("./pages/app/PitchApprovalsPage"));
const WarRoomPage = lazyRoute(() => import("./pages/app/WarRoomPage"));
const EstimateEarningsPage = lazyRoute(() => import("./pages/app/EstimateEarningsPage"));
const RepLogisticsPage = lazyRoute(() => import("./pages/app/RepLogisticsPage"));
const CommandCenterPage = lazyRoute(() => import("./pages/app/CommandCenterPage"));
const ManagerMeetingPage = lazyRoute(() => import("./pages/app/ManagerMeetingPage"));
const RosterSweepPage = lazyRoute(() => import("./pages/app/RosterSweepPage"));
const TicketPage = lazyRoute(() => import("./pages/TicketPage"));
const RecruitsPage = lazyRoute(() => import("./pages/app/RecruitsPage"));
const LeadsPage = lazyRoute(() => import("./pages/app/LeadsPage"));
const MyMoneyPage = lazyRoute(() => import("./pages/app/MyMoneyPage"));
const InstallsPage = lazyRoute(() => import('@/pages/app/InstallsPage'));
const MissionsPage = lazyRoute(() => import('@/pages/app/MissionsPage'));
const PipelinePage = lazyRoute(() => import('@/pages/app/PipelinePage'));

const AskSummitPage = lazyRoute(() => import("./pages/app/AskSummitPage"));
const ScriptsPage = lazyRoute(() => import("./pages/app/ScriptsPage"));
const DoorsPage = lazyRoute(() => import("./pages/app/DoorsPage"));
const AlumniPage = lazyRoute(() => import("./pages/app/AlumniPage"));
const PersonProfilePage = lazyRoute(() => import("./pages/app/PersonProfilePage"));
const SeasonPage = lazyRoute(() => import("./pages/app/SeasonPage"));
const IndustriesPage = lazyRoute(() => import("./pages/app/IndustriesPage"));


/** Old /admin/team?tab=... links land in the section that now owns that tab. */
function AdminTabRedirect() {
  const [params] = useSearchParams();
  const tab = params.get('tab');
  const section = sectionForTab(tab);
  return <Navigate to={`/admin/${section}${tab ? `?tab=${tab}` : ''}`} replace />;
}

/** Old /app/videos/:id deep links land on the same video in the training library. */
function VideoDeepLinkRedirect() {
  const { videoId } = useParams<{ videoId: string }>();
  return <Navigate to={`/app/training/videos/${videoId ?? ''}`} replace />;
}

function LazyFallback() {
  return (
    <div className="min-h-[50vh] bg-background px-4 py-6" aria-busy="true">
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <div className="h-6 w-40 rounded bg-muted/40" />
        <div className="h-24 rounded-lg bg-muted/25" />
        <div className="h-24 rounded-lg bg-muted/20" />
      </div>
    </div>
  );
}


 // Inner app component to use hooks
 function AppContent() {
   // Initialize activity tracking
   useActivityTracking();

   // A render on this build means the chunks are healthy again.
   useEffect(() => { clearChunkRetryLatch(); }, []);

   // Global unhandled rejection handler - prevents silent black screens on mobile
   useEffect(() => {
     const handleRejection = (event: PromiseRejectionEvent) => {
       console.error("Unhandled promise rejection:", event.reason);
       // A dead chunk hash is recovered silently: caches go, the page reloads once.
       if (isChunkLoadError(event.reason)) {
         event.preventDefault();
         void recoverFromStaleBuild();
         return;
       }
       // Don't show toast for auth refresh errors (expected on stale sessions)
       const msg = String(event.reason?.message || event.reason || "");
       if (!msg.includes("Refresh Token") && !msg.includes("JWT")) {
         toast.error("That screen failed to load. Refresh the page to try again.");
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
       <UpdatePrompt />
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<LazyFallback />}>
           <WorkspaceProvider>
           <Routes>
             {/* ========== PUBLIC ROUTES ========== */}
             <Route path="/" element={<Index />} />
             <Route path="/recruiting" element={<Recruiting />} />
             {/* Public Golden Ticket lead capture (QR / no login) */}
             <Route path="/ticket" element={<TicketPage />} />
             <Route path="/parents" element={<Parents />} />
             <Route path="/industries/:slug" element={<IndustryPage />} />
             <Route path="/join" element={<JoinRedirect />} />
             <Route path="/invite/:token" element={<InvitePage />} />
             {/* Redirect /apply to /recruiting#apply section */}
             <Route path="/apply" element={<Navigate to="/recruiting#apply" replace />} />
             <Route path="/apply/rookie" element={<RookieApplication />} />
             <Route path="/apply/veteran" element={<VetApplication />} />
             <Route path="/apply/success" element={<ApplySuccess />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              {/* Redirect any signup attempts to login */}
              <Route path="/signup" element={<Navigate to="/login" replace />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* ========== SUMMER CHECKLIST ROUTES ========== */}
              <Route path="/summer-checklist" element={
                <ProtectedRoute>
                  <BootcampLock />
                </ProtectedRoute>
              } />
              <Route path="/summer-checklist/momentum" element={
                <ProtectedRoute>
                  <BootcampMomentum />
                </ProtectedRoute>
              } />
              <Route path="/summer-checklist/phase-1" element={
                <ProtectedRoute>
                  <BootcampPhase1 />
                </ProtectedRoute>
              } />
              <Route path="/summer-checklist/phase-2" element={
                <ProtectedRoute>
                  <BootcampPhase2 />
                </ProtectedRoute>
              } />
              <Route path="/summer-checklist/phase-3" element={
                <ProtectedRoute>
                  <BootcampPhase3 />
                </ProtectedRoute>
              } />

              {/* Legacy bootcamp URLs */}
              <Route path="/bootcamp-lock" element={<Navigate to="/summer-checklist" replace />} />
              <Route path="/bootcamp/momentum" element={<Navigate to="/summer-checklist/momentum" replace />} />
              <Route path="/bootcamp/phase-1" element={<Navigate to="/summer-checklist/phase-1" replace />} />
              <Route path="/bootcamp/phase-2" element={<Navigate to="/summer-checklist/phase-2" replace />} />
              <Route path="/bootcamp/phase-3" element={<Navigate to="/summer-checklist/phase-3" replace />} />

              {/* ========== APP - PROTECTED ROUTES ========== */}

              {/* Main Dashboard */}
              <Route path="/app" element={
                <ProtectedRoute>
                    <DashboardPage />
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
                    <ChatPage />
                </ProtectedRoute>
              } />

              {/* Training */}
               <Route path="/app/training" element={
                 <ProtectedRoute>
                     <TrainingPage />
                 </ProtectedRoute>
               } />
               <Route path="/app/training/videos" element={
                 <ProtectedRoute>
                     <TrainingVideosPage />
                 </ProtectedRoute>
               } />
               <Route path="/app/training/manager-videos" element={
                 <ProtectedRoute>
                     <ManagerTrainingVideosPage />
                 </ProtectedRoute>
               } />
               <Route path="/app/training/videos/:videoId" element={
                 <ProtectedRoute>
                     <VideoPlayerPage />
                 </ProtectedRoute>
               } />
               {/* One video library: /app/training/videos */}
               <Route path="/app/videos" element={<Navigate to="/app/training/videos" replace />} />
               <Route path="/app/videos/:videoId" element={<VideoDeepLinkRedirect />} />
               <Route path="/app/training/:courseSlug" element={
                 <ProtectedRoute>
                     <TrainingCoursePage />
                 </ProtectedRoute>
               } />
               <Route path="/app/training/:courseSlug/:lessonId" element={
                 <ProtectedRoute>
                     <LessonPage />
                 </ProtectedRoute>
               } />

              {/* My Team (Manager only) */}
              <Route path="/app/team" element={
                <ProtectedRoute requiredRole="manager">
                  <MyTeamPage />
                </ProtectedRoute>
              } />

              {/* My week — one screen for a manager's Monday */}
              <Route path="/app/week" element={
                <ProtectedRoute requiredRole="manager">
                  <MyWeekPage />
                </ProtectedRoute>
              } />


              {/* Members directory now lives as a tab inside Team */}
              <Route path="/app/members" element={<Navigate to="/app/team?tab=members" replace />} />

             {/* Profile */}
              <Route path="/app/profile" element={
                <ProtectedRoute>
                    <ProfilePage />
                </ProtectedRoute>
              } />

              {/* Alumni — read-only view for alumni-status accounts */}
              <Route path="/app/alumni" element={
                <ProtectedRoute>
                  <AlumniPage />
                </ProtectedRoute>
              } />

              {/* Person profile — everything the app knows about one person */}
              <Route path="/app/person/:userId" element={
                <ProtectedRoute>
                  <PersonProfilePage />
                </ProtectedRoute>
              } />

              {/* Leads — every person who has been part of Summit (manager and above) */}
              <Route path="/app/leads" element={
                <ProtectedRoute>
                  <LeadsPage />
                </ProtectedRoute>
              } />

              {/* Recruits — lead funnel (all reps) */}
              <Route path="/app/recruits" element={
                <ProtectedRoute>
                    <RecruitsPage />
                </ProtectedRoute>
              } />

              {/* Fiber installs */}
              <Route path="/app/installs" element={
                <ProtectedRoute>
                    <InstallsPage />
                </ProtectedRoute>
              } />

              {/* Full mission board */}
              <Route path="/app/missions" element={
                <ProtectedRoute>
                    <MissionsPage />
                </ProtectedRoute>
              } />


              {/* Life pipeline */}
              <Route path="/app/pipeline" element={
                <ProtectedRoute>
                    <PipelinePage />
                </ProtectedRoute>
              } />


              {/* My Money — rep pay, housing, next tier */}
              <Route path="/app/money" element={
                <ProtectedRoute>
                    <MyMoneyPage />
                </ProtectedRoute>
              } />

              {/* Scripts library — openers, objections, closes */}
              <Route path="/app/scripts" element={
                <ProtectedRoute>
                    <ScriptsPage />
                </ProtectedRoute>
              } />

              {/* Season Countdown Hub */}
              <Route path="/app/season" element={
                <ProtectedRoute>
                    <SeasonPage />
                </ProtectedRoute>
              } />

              {/* Industry hub + onboarding paths */}
              <Route path="/app/industries" element={
                <ProtectedRoute>
                    <IndustriesPage />
                </ProtectedRoute>
              } />



              {/* The field pack now lives inside Learn */}
              <Route path="/app/playbook" element={<Navigate to="/app/training#field-pack" replace />} />


              {/* Doors mode — the field flow, full screen and oversized */}
              <Route path="/app/doors" element={
                <ProtectedRoute>
                  <WorkspaceThemeProvider>
                    <DoorsPage />
                  </WorkspaceThemeProvider>
                </ProtectedRoute>
              } />

              {/* Ask Summit — grounded AI assistant */}
              <Route path="/app/ask" element={
                <ProtectedRoute>
                    <AskSummitPage />
                </ProtectedRoute>
              } />



              {/* Leaderboard */}
              <Route path="/app/leaderboard" element={
                <ProtectedRoute>
                    <LeaderboardPage />
                </ProtectedRoute>
              } />

               {/* Links */}
               <Route path="/app/links" element={
                 <ProtectedRoute>
                     <LinksPage />
                 </ProtectedRoute>
               } />

               {/* Calculators - redirect to Resources */}
               <Route path="/app/calculators" element={<Navigate to="/app/links" replace />} />

               {/* Events */}
               <Route path="/app/events" element={
                <ProtectedRoute>
                    <EventsPage />
                </ProtectedRoute>
              } />

               {/* Calendar */}
               <Route path="/app/calendar" element={
                <ProtectedRoute>
                    <CalendarPage />
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

               {/* Weekly Manager Meeting */}
               <Route path="/app/manager-meeting" element={
                 <ProtectedRoute requiredRole="manager">
                   <ManagerMeetingPage />
                 </ProtectedRoute>
                } />

                <Route path="/app/roster/sweep" element={
                  <ProtectedRoute requiredRole="manager">
                    <RosterSweepPage />
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

              {/* Admin — five groups. Old /admin/team links redirect to the owning group. */}
              <Route path="/admin/team" element={<AdminTabRedirect />} />
              {(['people', 'requests', 'money', 'content', 'settings'] as const).map((s) => (
                <Route key={s} path={`/admin/${s}`} element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminTeamPage section={s} />
                  </ProtectedRoute>
                } />
              ))}
              <Route path="/admin" element={<Navigate to="/admin/requests" replace />} />
              <Route path="/admin/inbox" element={<Navigate to="/admin/requests" replace />} />
              <Route path="/admin/reports" element={<Navigate to="/command" replace />} />



               {/* Redirect old Hub/Operations to Calendar */}
               <Route path="/app/operations" element={<Navigate to="/app/calendar" replace />} />

              {/* Manage Hub (replaces Analytics) */}
              {/* Manage hub dissolved — everything lives in the sidebar now */}
              <Route path="/app/manage" element={<Navigate to="/app" replace />} />
              {/* Legacy recruit pipeline routes now point at the unified leads funnel */}
              <Route path="/app/spreadsheets" element={<Navigate to="/app/recruits" replace />} />
              <Route path="/app/recruit-pipeline" element={<Navigate to="/app/recruits" replace />} />
              <Route path="/app/recruiting" element={<Navigate to="/app/recruits" replace />} />
              {/* Redirect old analytics route */}
              <Route path="/app/analytics" element={<Navigate to="/app" replace />} />

              {/* Estimate My Earnings */}
              <Route path="/app/estimate-earnings" element={
                <ProtectedRoute>
                    <EstimateEarningsPage />
                </ProtectedRoute>
              } />

              {/* War Room */}
              <Route path="/app/war-room" element={
                <ProtectedRoute>
                    <WarRoomPage />
                </ProtectedRoute>
              } />

              {/* Rep Logistics */}
              <Route path="/app/logistics" element={
                <ProtectedRoute>
                    <RepLogisticsPage />
                </ProtectedRoute>
              } />

              {/* Command reports live on their own route */}
              <Route path="/command" element={
                <ProtectedRoute requiredRole="admin">
                  <CommandCenterPage />
                </ProtectedRoute>
              } />


             {/* Notepad - redirect to Resources */}
             <Route path="/app/notepad" element={<Navigate to="/app/links" replace />} />

             {/* Catch-all */}
             <Route path="*" element={<NotFound />} />
           </Routes>
           </WorkspaceProvider>
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
