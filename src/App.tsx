import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import AppRedirect from "./pages/app/AppRedirect";
import RookieDashboardPage from "./pages/app/RookieDashboardPage";
import ManagerDashboardPage from "./pages/app/ManagerDashboardPage";
import TrainingCoursePage from "./pages/app/TrainingCoursePage";
import LessonPage from "./pages/app/LessonPage";
import ProgressPage from "./pages/app/ProgressPage";
import AnnouncementsPage from "./pages/app/AnnouncementsPage";
import LeaderboardPage from "./pages/app/LeaderboardPage";

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
            <Route path="/apply/rookie" element={<RookieApplication />} />
            <Route path="/apply/vet" element={<VetApplication />} />
            <Route path="/apply/success" element={<ApplySuccess />} />

            {/* App - Protected Routes */}
            <Route path="/app" element={
              <ProtectedRoute>
                <AppRedirect />
              </ProtectedRoute>
            } />
            
            <Route path="/app/rookie" element={
              <ProtectedRoute>
                <RookieDashboardPage />
              </ProtectedRoute>
            } />
            
            <Route path="/app/manager" element={
              <ProtectedRoute requiredRole="manager">
                <ManagerDashboardPage />
              </ProtectedRoute>
            } />
            
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
                <ProgressPage />
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

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
