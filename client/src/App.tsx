import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Courses from "@/pages/Courses";
import CourseDetail from "@/pages/CourseDetail";
import LessonDetail from "@/pages/LessonDetail";
import StudentDashboard from "@/pages/StudentDashboard";
import TeacherDashboard from "@/pages/teacher/TeacherDashboard";
import TeacherCourses from "@/pages/teacher/TeacherCourses";
import CourseEditor from "@/pages/teacher/CourseEditor";
import TeacherContentManagement from "@/pages/teacher/TeacherContentManagement";
import CourseEnrollments from "@/pages/teacher/CourseEnrollments";
import UploadVideo from "@/pages/teacher/UploadVideo";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import CourseApprovals from "@/pages/admin/CourseApprovals";
import TeachersList from "@/pages/admin/TeachersList";
import UserManagement from "@/pages/admin/UserManagement";
import CollegeManagement from "@/pages/admin/CollegeManagement";
import FeaturedProfilesManagement from "@/pages/admin/FeaturedProfilesManagement";
import HomeStatsManagement from "@/pages/admin/HomeStatsManagement";
import CollegeOnboarding from "@/pages/CollegeOnboarding";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/courses" component={Courses} />
      <Route path="/courses/:id" component={CourseDetail} />
      <Route path="/courses/:courseId/lessons/:lessonId" component={LessonDetail} />
      <Route path="/dashboard" component={StudentDashboard} />
      <Route path="/teacher" component={TeacherDashboard} />
      <Route path="/teacher/courses" component={TeacherCourses} />
      <Route path="/teacher/courses/:id/content" component={TeacherContentManagement} />
      <Route path="/teacher/courses/:id/enrollments" component={CourseEnrollments} />
      <Route path="/teacher/upload-video" component={UploadVideo} />
      <Route path="/teacher/courses/:courseId/upload-video" component={UploadVideo} />
      <Route path="/admin/courses/new" component={CourseEditor} />
      <Route path="/admin/courses/:id/edit" component={CourseEditor} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/approvals" component={CourseApprovals} />
      <Route path="/admin/teachers" component={TeachersList} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/colleges" component={CollegeManagement} />
      <Route path="/admin/featured-profiles" component={FeaturedProfilesManagement} />
      <Route path="/admin/home-stats" component={HomeStatsManagement} />
      <Route path="/onboarding" component={CollegeOnboarding} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
