import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ExploreCourses from "./pages/ExploreCourses";
import CoursePage from "./pages/CoursePage";
import LessonPage from "./pages/LessonPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CoursesPage from "./pages/admin/CoursesPage";
import CourseFormPage from "./pages/admin/CourseFormPage";
import CourseContentPage from "./pages/admin/CourseContentPage";
import StudentsPage from "./pages/admin/StudentsPage";

import AdminsPage from "./pages/admin/AdminsPage";
import EmailTemplatesPage from "./pages/admin/EmailTemplatesPage";
import DashboardEditorPage from "./pages/admin/DashboardEditorPage";
import AnnouncementsPage from "./pages/admin/AnnouncementsPage";
import EsdeRegistration from "./pages/EsdeRegistration";
import EsdeCalendar from "./pages/EsdeCalendar";
import DialogoFraternoRegistration from "./pages/DialogoFraternoRegistration";


import PerfilUnico from "./pages/PerfilUnico";
import NotFound from "./pages/NotFound";
import WelcomePage from "./pages/WelcomePage";
import CourseRegistrationPage from "./pages/CourseRegistrationPage";
import PublicRegistrationPage from "./pages/PublicRegistrationPage";
import RegistrationPagesPage from "./pages/admin/RegistrationPagesPage";
import BookCatalog from "./pages/BookCatalog";
import LibraryPage from "./pages/admin/LibraryPage";
import AssessmentsPage from "./pages/admin/AssessmentsPage";
import AssessmentWizardPage from "./pages/admin/AssessmentWizardPage";
import AssessmentResultsPage from "./pages/admin/AssessmentResultsPage";
import AttendanceAdminPage from "./pages/admin/AttendanceAdminPage";
import EsdeCalendarEditorPage from "./pages/admin/EsdeCalendarEditorPage";
import AttendancePage from "./pages/AttendancePage";
import MyAttendancePage from "./pages/MyAttendancePage";
import AnnouncementsListPage from "./pages/AnnouncementsListPage";
import { CadastroObrigatorio } from "@/compartilhado";
import { supabase as clienteLsl } from "@/integrations/supabase/client";
import { ForcePasswordChangeGuard } from "./components/ForcePasswordChangeGuard";
import { ProtectedRoute } from "./components/ProtectedRoute";
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <CadastroObrigatorio cliente={clienteLsl} />
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <ForcePasswordChangeGuard />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/inscricao/esde" element={<EsdeRegistration />} />
            <Route path="/esde/calendario" element={<EsdeCalendar />} />
            <Route path="/esde/calendario/:code" element={<EsdeCalendar />} />
            <Route path="/presenca/:token" element={<AttendancePage />} />
            <Route path="/inscricao/dialogo-fraterno" element={<DialogoFraternoRegistration />} />
            
            
            <Route path="/welcome" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
            <Route path="/inscricao/curso/:id" element={<CourseRegistrationPage />} />
            <Route path="/inscricao/p/:slug" element={<PublicRegistrationPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/explore" element={<ProtectedRoute><ExploreCourses /></ProtectedRoute>} />
            <Route path="/course/:id" element={<ProtectedRoute><CoursePage /></ProtectedRoute>} />
            <Route path="/lesson/:id" element={<ProtectedRoute><LessonPage /></ProtectedRoute>} />
            <Route path="/my-account" element={<ProtectedRoute><PerfilUnico /></ProtectedRoute>} />
            <Route path="/biblioteca" element={<BookCatalog />} />
            <Route path="/minha-frequencia" element={<ProtectedRoute><MyAttendancePage /></ProtectedRoute>} />
            <Route path="/avisos" element={<ProtectedRoute><AnnouncementsListPage /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/courses" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
            <Route path="/admin/courses/new" element={<ProtectedRoute><CourseFormPage /></ProtectedRoute>} />
            <Route path="/admin/courses/:id" element={<ProtectedRoute><CourseFormPage /></ProtectedRoute>} />
            <Route path="/admin/courses/:id/content" element={<ProtectedRoute><CourseContentPage /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
            
            <Route path="/admin/emails" element={<ProtectedRoute><EmailTemplatesPage /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute><AnnouncementsPage /></ProtectedRoute>} />
            <Route path="/admin/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
            <Route path="/admin/assessments" element={<ProtectedRoute><AssessmentsPage /></ProtectedRoute>} />
            <Route path="/admin/assessments/new" element={<ProtectedRoute><AssessmentWizardPage /></ProtectedRoute>} />
            <Route path="/admin/assessments/:id" element={<ProtectedRoute><AssessmentWizardPage /></ProtectedRoute>} />
            <Route path="/admin/assessments/:id/results" element={<ProtectedRoute><AssessmentResultsPage /></ProtectedRoute>} />
            <Route path="/admin/admins" element={<ProtectedRoute><AdminsPage /></ProtectedRoute>} />
            <Route path="/admin/attendance" element={<ProtectedRoute><AttendanceAdminPage /></ProtectedRoute>} />
            <Route path="/admin/inscricoes" element={<ProtectedRoute><RegistrationPagesPage /></ProtectedRoute>} />
            <Route path="/admin/esde-calendar" element={<ProtectedRoute><EsdeCalendarEditorPage /></ProtectedRoute>} />
            <Route path="/admin/dashboard-editor" element={<ProtectedRoute><DashboardEditorPage /></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
