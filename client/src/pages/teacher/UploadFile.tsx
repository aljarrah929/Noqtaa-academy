import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, FileUp, ShieldAlert, BookOpen, Link as LinkIcon } from "lucide-react";
import type { CourseWithRelations } from "@shared/schema";

export default function UploadFile() {
  const [, params] = useRoute("/teacher/courses/:courseId/upload-file");
  const courseId = params?.courseId;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const [lessonTitle, setLessonTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  const canUpload = user?.role === "TEACHER" || user?.role === "SUPER_ADMIN";

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithRelations>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: teacherCourses, isLoading: coursesLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/teacher/courses"],
    enabled: !courseId && canUpload,
  });

  const createLessonMutation = useMutation({
    mutationFn: async () => {
      if (!courseId) {
        throw new Error("No course selected");
      }
      const response = await apiRequest("POST", `/api/courses/${courseId}/lessons`, {
        title: lessonTitle,
        contentType: "file",
        content: fileUrl,
        orderIndex: (course?.lessons?.length || 0),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/courses"] });
      toast({
        title: "Lesson Created",
        description: "Your file lesson has been saved successfully.",
      });
      navigate(`/teacher/courses/${courseId}/content`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lesson",
        variant: "destructive",
      });
    },
  });

  const canSave = !!courseId && lessonTitle.trim().length > 0 && fileUrl.trim().length > 0;

  if (authLoading || (courseId && courseLoading)) {
    return (
      <DashboardLayout title="Add File">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!canUpload) {
    return (
      <DashboardLayout title="Access Denied">
        <div className="max-w-2xl mx-auto">
          <Card className="py-16">
            <CardContent className="text-center">
              <ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                Only teachers can upload file lessons.
              </p>
              <Button asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!courseId) {
    return (
      <DashboardLayout title="Add File">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" asChild className="mb-6" data-testid="button-back">
            <Link href="/teacher">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="w-5 h-5" />
                Add File Lesson
              </CardTitle>
              <CardDescription>
                Select a course to add a file lesson
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coursesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                </div>
              ) : teacherCourses && teacherCourses.length > 0 ? (
                <div className="space-y-3">
                  {teacherCourses.map((c) => (
                    <Link
                      key={c.id}
                      href={`/teacher/courses/${c.id}/upload-file`}
                      className="w-full p-4 text-left rounded-lg border hover-elevate active-elevate-2 flex items-center gap-3"
                      data-testid={`button-select-course-${c.id}`}
                    >
                      <BookOpen className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate">{c.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {c.lessons?.length || 0} lessons
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">
                    No courses available. Ask an admin to create a course for you.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/teacher">Back to Dashboard</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout title="Add File">
        <div className="max-w-2xl mx-auto">
          <Card className="py-16">
            <CardContent className="text-center">
              <FileUp className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The course you're looking for doesn't exist.
              </p>
              <Button asChild>
                <Link href="/teacher/courses">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to My Courses
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Add File Lesson">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" asChild className="mb-6" data-testid="button-back">
          <Link href="/teacher/courses">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Courses
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5" />
              Add File Lesson
            </CardTitle>
            <CardDescription>
              Add a downloadable file to <strong>{course.title}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="lessonTitle">Lesson Title *</Label>
              <Input
                id="lessonTitle"
                placeholder="Enter lesson title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                data-testid="input-lesson-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fileUrl">File URL *</Label>
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  id="fileUrl"
                  type="url"
                  placeholder="https://drive.google.com/... or https://dropbox.com/..."
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  data-testid="input-file-url"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Paste a link to your file (Google Drive, Dropbox, OneDrive, etc.)
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                asChild
                data-testid="button-cancel"
              >
                <Link href="/teacher/courses">Cancel</Link>
              </Button>
              <Button
                onClick={() => createLessonMutation.mutate()}
                disabled={!canSave || createLessonMutation.isPending}
                data-testid="button-save-lesson"
              >
                {createLessonMutation.isPending ? "Saving..." : "Save Lesson"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
