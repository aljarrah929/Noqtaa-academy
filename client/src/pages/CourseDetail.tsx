import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { LessonList, LockedContentMessage } from "@/components/courses/LessonList";
import { JoinRequestModal } from "@/components/courses/JoinRequestModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Check } from "lucide-react"; 
import { useCart } from "@/hooks/useCart"; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { addToCart, removeFromCart, isInCart } = useCart();
  const [selectedPackage, setSelectedPackage] = useState("all");

  const loginUrl = `/login?next=${encodeURIComponent(location)}`;

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithRelations>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const formatDuration = (totalSeconds: number) => {
    if (!totalSeconds) return "0s";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    let parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);
    return parts.join(" "); 
  };

  const totalDurationSeconds = course?.lessons?.reduce((acc, lesson) => acc + (lesson.duration || 0), 0) || 0;
  
  const { data: enrollmentCheck } = useQuery<{ enrolled: boolean }>({
    queryKey: ["/api/enrollments/check", courseId],
    enabled: !!courseId && isAuthenticated,
  });

  const isEnrolled = enrollmentCheck?.enrolled ?? false;
  const userPackages = (enrollmentCheck as any)?.packages || [];
  // بعد سطر userPackages، أضف هاد الحساب:
const availablePackages = [
  { value: "first", price: (course as any)?.priceFirst },
  { value: "second", price: (course as any)?.priceSecond },
  { value: "mid", price: (course as any)?.priceMid },
  { value: "final", price: (course as any)?.priceFinal },
].filter(p => p.price > 0).map(p => p.value);

// الطالب اشترى كل شي إذا:
// 1. عنده "all"
// 2. أو اشترى كل الـ packages المتاحة
const hasAllPackages = userPackages.includes("all") || 
  (availablePackages.length > 0 && availablePackages.every(p => userPackages.includes(p)));
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

  // تجهيز خيارات البكجات والأسعار
  
  const packageOptions = [
    { value: "all", label: "Full material  (All)", price: course?.price || 0 },
    { value: "first", label: "First material (First)", price: (course as any)?.priceFirst || 0 },
    { value: "second", label: "Second material (Second)", price: (course as any)?.priceSecond || 0 },
    { value: "mid", label: "Midterm material (Mid)", price: (course as any)?.priceMid || 0 },
    { value: "final", label: "Final material  (Final)", price: (course as any)?.priceFinal || 0 },
  ].filter(opt => opt.price > 0 || opt.value === "all")
   .filter(opt => !userPackages.includes(opt.value) && !userPackages.includes("all")); // هاد الفلتر بخفي البكجات المشتراة
  const currentSelection = packageOptions.find(opt => opt.value === selectedPackage) || packageOptions[0];

  const getCollegeBadgeColor = (slug?: string) => {
    switch (slug) {
      case "pharmacy": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "engineering": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "it": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default: return "";
    }
  };

  const teacherInitials = course?.teacher 
    ? `${course.teacher.firstName?.[0] || ""}${course.teacher.lastName?.[0] || ""}`.toUpperCase() || "T"
    : "T";

  if (courseLoading) return (<div className="min-h-screen bg-background"><Header /><div className="max-w-6xl mx-auto px-4 py-8"><Skeleton className="h-8 w-32 mb-6" /><Skeleton className="h-64 rounded-lg" /></div></div>);
  if (!course) return (<div className="min-h-screen bg-background"><Header /><div className="max-w-6xl mx-auto px-4 py-8"><Card className="py-16"><CardContent className="text-center"><BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" /><h2 className="text-xl font-semibold mb-2">Course Not Found</h2></CardContent></Card></div></div>);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/courses">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Courses
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {course.college && (
                    <Badge variant="outline" className={getCollegeBadgeColor(course.college.slug)}>
                      <Building2 className="w-3 h-3 mr-1" /> {course.college.name}
                    </Badge>
                  )}
                  {isEnrolled ? (
                    <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Enrolled</Badge>
                  ) : isAuthenticated ? (
                    <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" /> Not Enrolled</Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <CardTitle className="text-2xl md:text-3xl">{course.title}</CardTitle>
                  {course.price != null && course.price > 0 && (
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(course.price)}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {course.description && <p className="text-muted-foreground leading-relaxed mb-6">{course.description}</p>}
                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><BookOpen className="w-4 h-4" /><span>{course.lessons?.length || 0} lessons</span></div>
                  <div className="flex items-center gap-2"><Users className="w-4 h-4" /><span>{course._count?.enrollments || 0} students</span></div>
                  <div className="flex items-center gap-1"><Clock className="w-4 h-4 text-primary" /><span dir="ltr" className="mr-1 text-primary text-sm">{formatDuration(totalDurationSeconds)}</span></div>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-xl font-semibold mb-4">Course Content</h2>
              {course.lessons && course.lessons.length > 0 ? (
                <LessonList
                    lessons={course.lessons}
                    courseId={course.id}
                    isEnrolled={isEnrolled}
                    isCourseLocked={course.isLocked}
                    teacherEmail={course.teacher?.email || undefined}
                    userPackages={userPackages}
                    isAdmin={user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"}
/>
              ) : (
                <Card><CardContent className="py-8 text-center"><BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">No lessons available yet.</p></CardContent></Card>
              )}
            </div>

            {!isEnrolled && isAuthenticated && (
              <LockedContentMessage teacherEmail={course.teacher?.email || undefined} teacherName={course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : undefined} />
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Instructor</CardTitle></CardHeader>
              <CardContent>
                {course.teacher && (
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={course.teacher.profileImageUrl || undefined} className="object-cover" />
                      <AvatarFallback className="text-lg">{teacherInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{course.teacher.firstName} {course.teacher.lastName}</h3>
                      <p className="text-sm text-muted-foreground mb-3">Teacher</p>
                      <Button variant="outline" size="sm" asChild className="w-full">
                        <a href={`mailto:${course.teacher.email}?subject=Question about ${course.title}`}><Mail className="w-4 h-4 mr-2" /> Contact Teacher</a>
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
                  <Button asChild className="w-full"><Link href={loginUrl}>Log in to Continue</Link></Button>
                </CardContent>
              </Card>
            )}

            {isAuthenticated && user?.role === "STUDENT" && packageOptions.length > 0 && !hasAllPackages && (


              <Card className="border-primary/50">
                <CardContent className="py-6 text-center">
                  {joinRequestStatus?.exists && joinRequestStatus.status === "PENDING" ? (
                    <>
                      <Clock className="w-10 h-10 mx-auto text-amber-500 mb-3" />
                      <h3 className="font-semibold mb-2">Request Pending</h3>
                      <JoinRequestModal courseId={parseInt(courseId!)} courseTitle={course.title} trigger={<Button variant="outline" className="w-full"><Clock className="w-4 h-4 mr-2" /> View Status</Button>} />
                    </>
                  ) : joinRequestStatus?.exists && joinRequestStatus.status === "REJECTED" ? (
                    <>
                      <UserPlus className="w-10 h-10 mx-auto text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Request Rejected</h3>
                      <JoinRequestModal courseId={parseInt(courseId!)} courseTitle={course.title} trigger={<Button className="w-full"><UserPlus className="w-4 h-4 mr-2" /> Submit New Request</Button>} />
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-10 h-10 mx-auto text-primary mb-3" />
                      <h3 className="font-semibold mb-4">Want to Enroll?</h3>
                      
                      {/* --- اختيار البكج --- */}
                      {packageOptions.length > 1 && (
                        <div className="mb-4 text-start">
                          <Label className="block mb-2 font-semibold"> (Select Package)</Label>
                          <Select value={selectedPackage} onValueChange={setSelectedPackage} dir="rtl">
                            <SelectTrigger className="w-full bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {packageOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {currentSelection && currentSelection.price > 0 && (
                        <div className="p-3 bg-muted rounded-lg mb-4 border">
                          <p className="text-sm text-muted-foreground mb-1">Total Price:</p>
                          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatPrice(currentSelection.price)}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          variant={isInCart(course.id) ? "secondary" : "outline"}
                          className="flex-1"
                          onClick={() => 
                            isInCart(course.id) 
                              ? removeFromCart(course.id) 
                              : addToCart({ 
                                  id: course.id, 
                                  title: course.title, 
                                  price: currentSelection.price,
                                  packageType: currentSelection.value,
                                  packageLabel: currentSelection.label
                                })
                          }
                        >
                          {isInCart(course.id) ? (
                            <><Check className="w-4 h-4 mr-2 text-green-600" /> In Cart</>
                          ) : (
                            <><ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart</>
                          )}
                        </Button>

                        <JoinRequestModal
                          courseId={parseInt(courseId!)}
                          courseTitle={course.title}
                          packageType={currentSelection.value}
                          trigger={
                            <Button className="flex-1">
                              <UserPlus className="w-4 h-4 mr-2" /> Buy Now
                            </Button>
                          }
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {isEnrolled && (packageOptions.length === 0 || hasAllPackages) && (
  <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
    <CardContent className="py-6 text-center">
      <CheckCircle className="w-10 h-10 mx-auto text-green-600 mb-3" />
      <h3 className="font-semibold mb-2 text-green-800 dark:text-green-400">You're Enrolled!</h3>
      <p className="text-sm text-green-700 dark:text-green-500">You have access to your purchased content.</p>
    </CardContent>
  </Card>
)}
            
          </div>
        </div>
      </div>
    </div>
  );
}