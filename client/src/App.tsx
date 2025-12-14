import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Courses from "@/pages/Courses";
import CourseDetail from "@/pages/CourseDetail";
import LessonDetail from "@/pages/LessonDetail";
import StudentDashboard from "@/pages/StudentDashboard";
import TeacherDashboard from "@/pages/teacher/TeacherDashboard";
import TeacherCourses from "@/pages/teacher/TeacherCourses";
import CourseEditor from "@/pages/teacher/CourseEditor";
import CourseEnrollments from "@/pages/teacher/CourseEnrollments";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import CourseApprovals from "@/pages/admin/CourseApprovals";
import TeachersList from "@/pages/admin/TeachersList";
import UserManagement from "@/pages/admin/UserManagement";
import CollegeManagement from "@/pages/admin/CollegeManagement";
import CollegeOnboarding from "@/pages/CollegeOnboarding";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/courses" component={Courses} />
      <Route path="/courses/:id" component={CourseDetail} />
      <Route path="/courses/:courseId/lessons/:lessonId" component={LessonDetail} />
      <Route path="/dashboard" component={StudentDashboard} />
      <Route path="/teacher" component={TeacherDashboard} />
      <Route path="/teacher/courses" component={TeacherCourses} />
      <Route path="/teacher/courses/new" component={CourseEditor} />
      <Route path="/teacher/courses/:id/edit" component={CourseEditor} />
      <Route path="/teacher/courses/:id/enrollments" component={CourseEnrollments} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/approvals" component={CourseApprovals} />
      <Route path="/admin/teachers" component={TeachersList} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/colleges" component={CollegeManagement} />
      <Route path="/onboarding" component={CollegeOnboarding} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
