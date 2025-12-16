import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoUploader } from "@/components/VideoUploader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Video, CheckCircle, ShieldAlert } from "lucide-react";
import type { CourseWithRelations } from "@shared/schema";

export default function UploadVideo() {
  const [, params] = useRoute("/teacher/courses/:courseId/upload-video");
  const courseId = params?.courseId;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [videoUid, setVideoUid] = useState<string | undefined>();
  const [uploadComplete, setUploadComplete] = useState(false);

  // Only TEACHER and SUPER_ADMIN can upload videos
  const canUpload = user?.role === "TEACHER" || user?.role === "SUPER_ADMIN";

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithRelations>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const createLessonMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/courses/${courseId}/lessons`, {
        title: lessonTitle,
        contentType: "video",
        content: videoUid,
        orderIndex: (course?.lessons?.length || 0),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/courses"] });
      toast({
        title: "Lesson Created",
        description: "Your video lesson has been saved successfully.",
      });
      navigate(`/teacher/courses/${courseId}/edit`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lesson",
        variant: "destructive",
      });
    },
  });

  const handleVideoUploadComplete = (uid: string) => {
    setVideoUid(uid);
    setUploadComplete(true);
  };

  const handleVideoChange = (uid: string | undefined) => {
    setVideoUid(uid);
    if (!uid) {
      setUploadComplete(false);
    }
  };

  const canSave = lessonTitle.trim().length > 0 && uploadComplete && videoUid;

  if (authLoading || courseLoading) {
    return (
      <DashboardLayout title="Upload Video">
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
                Only teachers can upload video lessons.
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

  if (!course) {
    return (
      <DashboardLayout title="Upload Video">
        <div className="max-w-2xl mx-auto">
          <Card className="py-16">
            <CardContent className="text-center">
              <Video className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
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
    <DashboardLayout title="Upload Video Lesson">
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
              <Video className="w-5 h-5" />
              Upload Video Lesson
            </CardTitle>
            <CardDescription>
              Add a new video lesson to <strong>{course.title}</strong>
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
              <Label htmlFor="lessonDescription">Description (optional)</Label>
              <Textarea
                id="lessonDescription"
                placeholder="Enter lesson description"
                value={lessonDescription}
                onChange={(e) => setLessonDescription(e.target.value)}
                rows={3}
                data-testid="input-lesson-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Video File *</Label>
              <VideoUploader
                value={videoUid}
                onChange={handleVideoChange}
                onUploadComplete={handleVideoUploadComplete}
              />
            </div>

            {uploadComplete && videoUid && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Video uploaded successfully</span>
              </div>
            )}

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
