import { useState, useEffect, useRef } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
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
import AccountantDashboard from "@/pages/accountant/AccountantDashboard";
import CollegeOnboarding from "@/pages/CollegeOnboarding";
import Profile from "@/pages/Profile";
import SupportWidget from "@/components/SupportWidget";

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
      <Route path="/teacher/join-requests" component={TeacherJoinRequests} />
      <Route path="/teacher/upload-video" component={UploadVideo} />
      <Route path="/teacher/courses/:courseId/upload-video" component={UploadVideo} />
      <Route path="/teacher/upload-file" component={UploadFile} />
      <Route path="/teacher/courses/:courseId/upload-file" component={UploadFile} />
      <Route path="/admin/courses/new" component={CourseEditor} />
      <Route path="/admin/courses/:id/edit" component={CourseEditor} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/approvals" component={CourseApprovals} />
      <Route path="/admin/teachers" component={TeachersList} />
      <Route path="/admin/users" component={UserManagement} />
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
  const [isViolator, setIsViolator] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        console.log("[Security] PrintScreen detected globally");

        setIsViolator(true);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setIsViolator(false);
          timerRef.current = null;
        }, 10000);

        if (user?.id) {
          console.log("[Security] Reporting screenshot for user:", user.id);
          apiRequest("POST", "/api/security/report-screenshot", {
            userId: user.id,
          }).catch((err) => {
            console.error("[Security] Report failed:", err);
          });
        }
      }
    };

    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keyup", handleKeyUp);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user?.id]);

  return (
    <>
      {isViolator && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "black",
            zIndex: 99999999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "red",
            fontSize: "24px",
            textAlign: "center",
            padding: "20px",
          }}
          data-testid="security-warning-overlay"
        >
          <h1 style={{ fontSize: "32px", marginBottom: "16px" }}>
            SECURITY ALERT
          </h1>
          <p>Screenshot detected. This incident has been reported.</p>
          <p style={{ marginTop: "8px" }}>
            Your account ID and Phone Number have been sent to the admin.
          </p>
          <button
            onClick={() => setIsViolator(false)}
            style={{
              marginTop: "24px",
              padding: "12px 24px",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
            }}
            data-testid="button-dismiss-warning"
          >
            I Understand
          </button>
        </div>
      )}
      <Router />
      <SupportWidget />
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
