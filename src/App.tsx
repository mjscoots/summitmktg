import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import RookieApplication from "./pages/RookieApplication";
import VetApplication from "./pages/VetApplication";
import ApplySuccess from "./pages/ApplySuccess";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// App pages
import AppRedirect from "./pages/app/AppRedirect";
import RookieDashboard from "./pages/app/RookieDashboard";
import VetDashboard from "./pages/app/VetDashboard";
import TrainingHome from "./pages/app/TrainingHome";
import FolderView from "./pages/app/FolderView";
import LessonView from "./pages/app/LessonView";
import MyProgress from "./pages/app/MyProgress";
import RepProgress from "./pages/app/RepProgress";
import Announcements from "./pages/app/Announcements";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Index />} />
          <Route path="/apply/rookie" element={<RookieApplication />} />
          <Route path="/apply/vet" element={<VetApplication />} />
          <Route path="/apply/success" element={<ApplySuccess />} />
          <Route path="/login" element={<Login />} />

          {/* App - Role-based */}
          <Route path="/app" element={<AppRedirect />} />
          <Route path="/app/rookie" element={<RookieDashboard />} />
          <Route path="/app/vet" element={<VetDashboard />} />
          
          {/* Training - with role wrapper */}
          <Route path="/app/training" element={<TrainingHome />} />
          <Route path="/app/training/:folderId" element={<FolderView />} />
          <Route path="/app/training/:folderId/:lessonId" element={<LessonView />} />
          
          {/* Progress */}
          <Route path="/app/progress" element={<MyProgress />} />
          
          {/* Vet/Manager only */}
          <Route path="/app/reps" element={<RepProgress />} />
          <Route path="/app/reps/:repId" element={<RepProgress />} />
          
          {/* Announcements */}
          <Route path="/app/announcements" element={<Announcements />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
