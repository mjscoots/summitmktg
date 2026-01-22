import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import RookieApplication from "./pages/RookieApplication";
import VetApplication from "./pages/VetApplication";
import ApplySuccess from "./pages/ApplySuccess";
import NotFound from "./pages/NotFound";

// App pages
import DashboardPage from "./pages/app/DashboardPage";
import TrainingCoursePage from "./pages/app/TrainingCoursePage";
import LessonPage from "./pages/app/LessonPage";
import ProgressPage from "./pages/app/ProgressPage";
import AnnouncementsPage from "./pages/app/AnnouncementsPage";
import LeaderboardPage from "./pages/app/LeaderboardPage";
import TeamPage from "./pages/app/TeamPage";

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
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            
            {/* Application routes - consolidated */}
            <Route path="/apply" element={<RookieApplication />} />
            <Route path="/apply/rookie" element={<RookieApplication />} />
            <Route path="/apply/vet" element={<VetApplication />} />
            <Route path="/apply/success" element={<ApplySuccess />} />

            {/* ========== APP - PROTECTED ROUTES ========== */}
            
            {/* Main Dashboard - role-aware (replaces /app/rookie and /app/manager) */}
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
            
            {/* Training */}
            <Route path="/app/training" element={
              <ProtectedRoute>
                <TrainingCoursePage />
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
            
            {/* Progress */}
            <Route path="/app/progress" element={
              <ProtectedRoute>
                <ProgressPage />
              </ProtectedRoute>
            } />
            
            {/* Team (Manager only) */}
            <Route path="/app/team" element={
              <ProtectedRoute requiredRole="manager">
                <TeamPage />
              </ProtectedRoute>
            } />
            
            {/* Announcements */}
            <Route path="/app/announcements" element={
              <ProtectedRoute>
                <AnnouncementsPage />
              </ProtectedRoute>
            } />
            
            {/* Leaderboard */}
            <Route path="/app/leaderboard" element={
              <ProtectedRoute>
                <LeaderboardPage />
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
