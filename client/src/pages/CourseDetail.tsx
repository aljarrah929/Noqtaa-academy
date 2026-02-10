import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { LessonList, LockedContentMessage } from "@/components/courses/LessonList";
import { JoinRequestModal } from "@/components/courses/JoinRequestModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen, 
  Users, 
  Mail, 
  CheckCircle, 
  Lock,
  ArrowLeft,
  Building2,
  UserPlus,
  Clock
} from "lucide-react";
import { Link } from "wouter";
import { formatPrice } from "@/lib/utils";
import type { CourseWithRelations } from "@shared/schema";

export default function CourseDetail() {
  const [match, params] = useRoute("/courses/:id");
  const courseId = params?.id;
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const loginUrl = `/login?next=${encodeURIComponent(location)}`;

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithRelations>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: enrollmentCheck, isLoading: enrollmentLoading } = useQuery<{ enrolled: boolean }>({
    queryKey: ["/api/enrollments/check", courseId],
    enabled: !!courseId && isAuthenticated,
  });

  const isEnrolled = enrollmentCheck?.enrolled ?? false;

  // Check join request status for students
  const { data: joinRequestStatus } = useQuery<{
    exists: boolean;
    id?: number;
    status: "PENDING" | "APPROVED" | "REJECTED" | null;
    createdAt?: string;
  }>({
    queryKey: ["/api/join-requests/me", courseId ? parseInt(courseId) : 0],
    queryFn: async () => {
      const res = await fetch(`/api/join-requests/me?courseId=${courseId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    enabled: !!courseId && isAuthenticated && user?.role === "STUDENT" && !isEnrolled,
  });

  const getCollegeBadgeColor = (slug?: string) => {
    switch (slug) {
      case "pharmacy":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "engineering":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "it":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "";
    }
  };

  const teacherInitials = course?.teacher 
    ? `${course.teacher.firstName?.[0] || ""}${course.teacher.lastName?.[0] || ""}`.toUpperCase() || "T"
    : "T";

  if (courseLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-64 rounded-lg" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Card className="py-16">
            <CardContent className="text-center">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The course you're looking for doesn't exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/courses">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Courses
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/courses">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {course.college && (
                    <Badge 
                      variant="outline" 
                      className={getCollegeBadgeColor(course.college.slug)}
                    >
                      <Building2 className="w-3 h-3 mr-1" />
                      {course.college.name}
                    </Badge>
                  )}
                  {isEnrolled && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Enrolled
                    </Badge>
                  )}
                  {!isEnrolled && isAuthenticated && (
                    <Badge variant="secondary">
                      <Lock className="w-3 h-3 mr-1" />
                      Not Enrolled
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <CardTitle className="text-2xl md:text-3xl" data-testid="text-course-title">
                    {course.title}
                  </CardTitle>
                  {course.price != null && course.price > 0 && (
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-course-price">
                      {formatPrice(course.price)}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {course.description && (
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {course.description}
                  </p>
                )}
                
                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>{course.lessons?.length || 0} lessons</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{course._count?.enrollments || 0} students</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-xl font-semibold mb-4">Course Content</h2>
              {isEnrolled && course.isLocked && (
                <Card className="mb-4 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                  <CardContent className="py-4 flex items-center gap-3">
                    <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-300">Course is currently locked</p>
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        The instructor has temporarily locked access to course content.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {course.lessons && course.lessons.length > 0 ? (
                <LessonList
                  lessons={course.lessons}
                  courseId={course.id}
                  isEnrolled={isEnrolled}
                  isCourseLocked={course.isLocked}
                  teacherEmail={course.teacher?.email || undefined}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No lessons available yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {!isEnrolled && isAuthenticated && (
              <LockedContentMessage 
                teacherEmail={course.teacher?.email || undefined}
                teacherName={course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : undefined}
              />
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instructor</CardTitle>
              </CardHeader>
              <CardContent>
                {course.teacher && (
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage 
                        src={course.teacher.profileImageUrl || undefined} 
                        className="object-cover"
                      />
                      <AvatarFallback className="text-lg">{teacherInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold" data-testid="text-teacher-name">
                        {course.teacher.firstName} {course.teacher.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">Teacher</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        className="w-full"
                        data-testid="button-email-teacher"
                      >
                        <a href={`mailto:${course.teacher.email}?subject=Question about ${course.title}`}>
                          <Mail className="w-4 h-4 mr-2" />
                          Contact Teacher
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {!isAuthenticated && (
              <Card className="border-primary/50">
                <CardContent className="py-6 text-center">
                  <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold mb-2">Want to enroll?</h3>
                  {course.price != null && course.price > 0 && (
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-2" data-testid="text-enroll-price">
                      Price: {formatPrice(course.price)}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mb-4">
                    Log in to request enrollment and access course content.
                  </p>
                  <Button asChild className="w-full" data-testid="button-login-enroll">
                    <Link href={loginUrl}>Log in to Continue</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {isAuthenticated && !isEnrolled && user?.role === "STUDENT" && (
              <Card className="border-primary/50">
                <CardContent className="py-6 text-center">
                  {joinRequestStatus?.exists && joinRequestStatus.status === "PENDING" ? (
                    <>
                      <Clock className="w-10 h-10 mx-auto text-amber-500 mb-3" />
                      <h3 className="font-semibold mb-2">Request Pending</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Your enrollment request is being reviewed by the teacher.
                      </p>
                      <JoinRequestModal
                        courseId={parseInt(courseId!)}
                        courseTitle={course.title}
                        trigger={
                          <Button variant="outline" className="w-full" data-testid="button-view-request-status">
                            <Clock className="w-4 h-4 mr-2" />
                            View Status
                          </Button>
                        }
                      />
                    </>
                  ) : joinRequestStatus?.exists && joinRequestStatus.status === "REJECTED" ? (
                    <>
                      <UserPlus className="w-10 h-10 mx-auto text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Request Rejected</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Your previous request was rejected. You can submit a new one.
                      </p>
                      <JoinRequestModal
                        courseId={parseInt(courseId!)}
                        courseTitle={course.title}
                        trigger={
                          <Button className="w-full" data-testid="button-resubmit-request">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Submit New Request
                          </Button>
                        }
                      />
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-10 h-10 mx-auto text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Want to Enroll?</h3>
                      {course.price != null && course.price > 0 && (
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-2" data-testid="text-join-price">
                          Price: {formatPrice(course.price)}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mb-4">
                        Submit your payment receipt to request enrollment.
                      </p>
                      <JoinRequestModal
                        courseId={parseInt(courseId!)}
                        courseTitle={course.title}
                        trigger={
                          <Button className="w-full" data-testid="button-request-to-join">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Request to Join
                          </Button>
                        }
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {isEnrolled && !course.isLocked && (
              <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                <CardContent className="py-6 text-center">
                  <CheckCircle className="w-10 h-10 mx-auto text-green-600 mb-3" />
                  <h3 className="font-semibold mb-2 text-green-800 dark:text-green-400">You're Enrolled!</h3>
                  <p className="text-sm text-green-700 dark:text-green-500">
                    You have full access to all course content.
                  </p>
                </CardContent>
              </Card>
            )}

            {isEnrolled && course.isLocked && (
              <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                <CardContent className="py-6 text-center">
                  <Lock className="w-10 h-10 mx-auto text-amber-600 mb-3" />
                  <h3 className="font-semibold mb-2 text-amber-800 dark:text-amber-400">Course Locked</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-500">
                    Content is temporarily locked by the instructor.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
