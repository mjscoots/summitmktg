import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import AuthPage from "./pages/app/AuthPage";
import NotFound from "./pages/NotFound";

// App pages
import DashboardPage from "./pages/app/DashboardPage";
import TrainingPage from "./pages/app/TrainingPage";
import TrainingCoursePage from "./pages/app/TrainingCoursePage";
import LessonPage from "./pages/app/LessonPage";
import LeaderboardPage from "./pages/app/LeaderboardPage";
import CalendarPage from "./pages/app/CalendarPage";
import MyTeamPage from "./pages/app/MyTeamPage";
import ProfilePage from "./pages/app/ProfilePage";
import InterviewsPage from "./pages/app/InterviewsPage";
import Interview1Page from "./pages/app/Interview1Page";
import Interview2Page from "./pages/app/Interview2Page";
import Interview3Page from "./pages/app/Interview3Page";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<AuthPage />} />
            {/* Redirect any signup attempts to login */}
            <Route path="/signup" element={<Navigate to="/login" replace />} />

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
            
            {/* Training */}
            <Route path="/app/training" element={
              <ProtectedRoute>
                <TrainingPage />
              </ProtectedRoute>
            } />
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

            {/* Profile */}
            <Route path="/app/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            
            {/* Leaderboard */}
            <Route path="/app/leaderboard" element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            } />

            {/* Calendar */}
            <Route path="/app/calendar" element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            } />

            {/* Interviews (Manager Only) */}
            <Route path="/app/interviews" element={
              <ProtectedRoute requiredRole="manager">
                <InterviewsPage />
              </ProtectedRoute>
            } />
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

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
