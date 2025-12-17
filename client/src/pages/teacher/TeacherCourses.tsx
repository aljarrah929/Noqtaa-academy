import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  BookOpen, 
  Users, 
  Plus, 
  Send, 
  UserPlus,
  FileText,
  Video,
  Settings,
  GraduationCap
} from "lucide-react";
import { Link } from "wouter";
import type { CourseWithRelations } from "@shared/schema";

export default function TeacherCourses() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithRelations | null>(null);

  // Only TEACHER and SUPER_ADMIN can upload videos
  const canUploadVideo = user?.role === "TEACHER" || user?.role === "SUPER_ADMIN";

  const { data: courses, isLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/teacher/courses"],
  });

  const submitMutation = useMutation({
    mutationFn: async (courseId: number) => {
      await apiRequest("POST", `/api/courses/${courseId}/submit`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/courses"] });
      toast({
        title: "Course Submitted",
        description: "Your course has been submitted for approval.",
      });
      setSubmitDialogOpen(false);
      setSelectedCourse(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit course",
        variant: "destructive",
      });
    },
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "default";
      case "PENDING_APPROVAL":
        return "secondary";
      case "REJECTED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return "Pending";
      default:
        return status.charAt(0) + status.slice(1).toLowerCase();
    }
  };

  const handleSubmitClick = (course: CourseWithRelations) => {
    setSelectedCourse(course);
    setSubmitDialogOpen(true);
  };

  return (
    <DashboardLayout title="My Courses">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            {isLoading ? "Loading..." : `${courses?.length || 0} courses`}
          </p>
          <Button asChild data-testid="button-create-course">
            <Link href="/teacher/courses/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-32 w-full rounded-none" />
                <CardContent className="pt-8 pb-3">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
                <CardFooter className="pt-3 border-t border-border">
                  <Skeleton className="h-9 w-28 mr-2" />
                  <Skeleton className="h-9 w-28" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => {
              const teacherInitials = user?.firstName && user?.lastName
                ? `${user.firstName[0]}${user.lastName[0]}`
                : user?.email?.[0]?.toUpperCase() || "T";
              
              return (
                <Card key={course.id} data-testid={`card-course-${course.id}`} className="overflow-hidden">
                  {/* Cover Image Section */}
                  <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5">
                    {course.coverImageUrl ? (
                      <img 
                        src={course.coverImageUrl} 
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <GraduationCap className="w-12 h-12 text-primary/30" />
                      </div>
                    )}
                    {/* Status Badge on Cover */}
                    <div className="absolute top-3 left-3">
                      <Badge variant={getStatusVariant(course.status)}>
                        {getStatusLabel(course.status)}
                      </Badge>
                    </div>
                    {/* Teacher Avatar Overlay */}
                    <div className="absolute -bottom-6 left-4">
                      <Avatar className="w-12 h-12 border-2 border-background">
                        <AvatarImage src={user?.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {teacherInitials}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  <CardContent className="pt-8 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-lg line-clamp-1">{course.title}</h3>
                      {course.college && (
                        <Badge variant="outline" className="shrink-0">{course.college.name}</Badge>
                      )}
                    </div>
                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {course.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{course._count?.lessons || 0} lessons</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{course._count?.enrollments || 0} students</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-3 border-t border-border flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild data-testid={`button-manage-${course.id}`}>
                      <Link href={`/teacher/courses/${course.id}/edit`}>
                        <Settings className="w-4 h-4 mr-1" />
                        Manage Content
                      </Link>
                    </Button>
                    {canUploadVideo && (
                      <Button variant="outline" size="sm" asChild data-testid={`button-upload-video-${course.id}`}>
                        <Link href={`/teacher/courses/${course.id}/upload-video`}>
                          <Video className="w-4 h-4 mr-1" />
                          Upload Video
                        </Link>
                      </Button>
                    )}
                    {course.status === "DRAFT" && (
                      <Button 
                        size="sm" 
                        onClick={() => handleSubmitClick(course)}
                        data-testid={`button-submit-${course.id}`}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Submit
                      </Button>
                    )}
                    {course.status === "PUBLISHED" && (
                      <Button variant="outline" size="sm" asChild data-testid={`button-enrollments-${course.id}`}>
                        <Link href={`/teacher/courses/${course.id}/enrollments`}>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Enrollments
                        </Link>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="py-16">
            <CardContent className="text-center">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-xl mb-2">No Courses Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You haven't created any courses yet. Start by creating your first course.
              </p>
              <Button asChild>
                <Link href="/teacher/courses/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Course
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit "{selectedCourse?.title}" for approval? 
              An admin will review your course before it can be published.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedCourse && submitMutation.mutate(selectedCourse.id)}
              disabled={submitMutation.isPending}
              data-testid="button-confirm-submit"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
