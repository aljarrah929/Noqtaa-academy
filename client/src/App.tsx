import { useState, useEffect, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
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
import TeacherJoinRequests from "@/pages/teacher/JoinRequests";
import UploadVideo from "@/pages/teacher/UploadVideo";
import UploadFile from "@/pages/teacher/UploadFile";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import CourseApprovals from "@/pages/admin/CourseApprovals";
import TeachersList from "@/pages/admin/TeachersList";
import UserManagement from "@/pages/admin/UserManagement";
import CollegeManagement from "@/pages/admin/CollegeManagement";
import FeaturedProfilesManagement from "@/pages/admin/FeaturedProfilesManagement";
import HomeStatsManagement from "@/pages/admin/HomeStatsManagement";
import HierarchyManager from "@/pages/admin/HierarchyManager";
import QuizBuilder from "@/pages/admin/QuizBuilder";
import AdminJoinRequests from "@/pages/admin/AdminJoinRequests";
import AccountantDashboard from "@/pages/accountant/AccountantDashboard";
import CollegeOnboarding from "@/pages/CollegeOnboarding";
import SelectPath from "@/pages/SelectPath";
import Profile from "@/pages/Profile";
import SupportWidget from "@/components/SupportWidget";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/select-path", "/onboarding"];

function PathRedirect() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading || !user) return;
    if (PUBLIC_PATHS.includes(location)) return;
    if (user.role !== "STUDENT") return;
    if (!user.majorId || !user.universityId) {
      setLocation("/select-path");
    }
  }, [user, isLoading, location, setLocation]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/select-path" component={SelectPath} />
      <Route path="/courses" component={Courses} />
      <Route path="/courses/:id" component={CourseDetail} />
      <Route path="/courses/:courseId/lessons/:lessonId" component={LessonDetail} />
      <Route path="/dashboard" component={StudentDashboard} />
      <Route path="/teacher" component={TeacherDashboard} />
      <Route path="/teacher/courses" component={TeacherCourses} />
      <Route path="/teacher/courses/:id/content" component={TeacherContentManagement} />
      <Route path="/teacher/courses/:id/edit" component={CourseEditor} />
      <Route path="/teacher/courses/:id/enrollments" component={CourseEnrollments} />
      <Route path="/teacher/join-requests" component={TeacherJoinRequests} />
      <Route path="/teacher/upload-video" component={UploadVideo} />
      <Route path="/teacher/courses/:courseId/upload-video" component={UploadVideo} />
      <Route path="/teacher/upload-file" component={UploadFile} />
      <Route path="/teacher/courses/:courseId/upload-file" component={UploadFile} />
      <Route path="/admin/courses/new" component={CourseEditor} />
      <Route path="/admin/courses/:id/edit" component={CourseEditor} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/approvals" component={CourseApprovals} />
      <Route path="/admin/requests" component={AdminJoinRequests} />
      <Route path="/admin/teachers" component={TeachersList} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/structure" component={HierarchyManager} />
      <Route path="/admin/courses/:id/quiz-builder" component={QuizBuilder} />
      <Route path="/admin/colleges" component={CollegeManagement} />
      <Route path="/admin/featured-profiles" component={FeaturedProfilesManagement} />
      <Route path="/admin/home-stats" component={HomeStatsManagement} />
      <Route path="/accountant" component={AccountantDashboard} />
      <Route path="/accountant/enrollments" component={AccountantDashboard} />
      <Route path="/onboarding" component={CollegeOnboarding} />
      <Route path="/profile" component={Profile} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const userIdRef = useRef<string | undefined>(undefined);

  userIdRef.current = user?.id;

  useEffect(() => {
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "PrintScreen") {
        setShowWarning(true);

        setTimeout(() => {
          setShowWarning(false);
        }, 10000);

        const uid = userIdRef.current;
        if (uid) {
          fetch("/api/security/report-screenshot", {
            method: "POST",
            body: JSON.stringify({ userId: uid }),
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }).catch(() => {});
        }
      }
    }

    window.addEventListener("keyup", onKeyUp);
    return () => window.removeEventListener("keyup", onKeyUp);
  }, []);

  return (
    <>
      <PathRedirect />
      <Router />
      <SupportWidget />
      {showWarning && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.95)",
          zIndex: 999999999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "red",
          flexDirection: "column",
        }}
        data-testid="security-warning-overlay"
        >
          <h1 style={{ fontSize: "3rem", fontWeight: "bold" }}>SECURITY ALERT</h1>
          <p style={{ fontSize: "1.5rem", color: "white" }}>Screen capture detected.</p>
          <p style={{ color: "white" }}>Your ID and Phone have been reported to Admin.</p>
          <p style={{ marginTop: "20px", color: "#888" }}>This window will close in 10 seconds...</p>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
