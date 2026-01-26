import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, ArrowLeft, Video, FileText, Link as LinkIcon, File } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithRelations, Lesson } from "@shared/schema";
import { B2VideoUploader } from "@/components/B2VideoUploader";

const lessonFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  contentType: z.enum(["video", "text", "link", "file"]),
  content: z.string().optional(),
});

type LessonFormValues = z.infer<typeof lessonFormSchema>;

export default function TeacherContentManagement() {
  const [match, params] = useRoute("/teacher/courses/:id/content");
  const [, setLocation] = useLocation();
  const courseId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithRelations>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const lessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: "",
      contentType: "text",
      content: "",
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: LessonFormValues) => {
      await apiRequest("POST", `/api/courses/${courseId}/lessons`, {
        ...data,
        orderIndex: (course?.lessons?.length || 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      toast({ title: "Lesson Created" });
      setLessonDialogOpen(false);
      lessonForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async (data: LessonFormValues & { id: number }) => {
      await apiRequest("PATCH", `/api/lessons/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      toast({ title: "Lesson Updated" });
      setLessonDialogOpen(false);
      setEditingLesson(null);
      lessonForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      await apiRequest("DELETE", `/api/lessons/${lessonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      toast({ title: "Lesson Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onLessonSubmit = (data: LessonFormValues) => {
    if (editingLesson) {
      updateLessonMutation.mutate({ ...data, id: editingLesson.id });
    } else {
      createLessonMutation.mutate(data);
    }
  };

  const openLessonDialog = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      lessonForm.reset({
        title: lesson.title,
        contentType: lesson.contentType,
        content: lesson.content || "",
      });
    } else {
      setEditingLesson(null);
      lessonForm.reset({ title: "", contentType: "text", content: "" });
    }
    setLessonDialogOpen(true);
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />;
      case "link":
        return <LinkIcon className="w-4 h-4" />;
      case "file":
        return <File className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (courseLoading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout title="Course Not Found">
        <div className="max-w-4xl mx-auto text-center py-16">
          <h2 className="text-xl font-semibold mb-4">Course not found</h2>
          <Button asChild>
            <Link href="/teacher/courses">Back to Courses</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const sortedLessons = [...(course?.lessons || [])].sort((a, b) => a.orderIndex - b.orderIndex);
  const canUploadVideo = user?.role === "TEACHER" || user?.role === "SUPER_ADMIN";

  return (
    <DashboardLayout title={`Manage Content: ${course.title}`}>
      <div className="max-w-4xl mx-auto">
        <Link href="/teacher/courses">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </Link>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">{course.title}</CardTitle>
                  {course.college && (
                    <Badge variant="outline" className="mt-2">{course.college.name}</Badge>
                  )}
                </div>
                <Badge variant={course.status === "PUBLISHED" ? "default" : "secondary"}>
                  {course.status}
                </Badge>
              </div>
              {course.description && (
                <p className="text-sm text-muted-foreground mt-2">{course.description}</p>
              )}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Lessons</CardTitle>
              <div className="flex items-center gap-2">
                {canUploadVideo && (
                  <Button variant="outline" size="sm" asChild data-testid="button-upload-video">
                    <Link href={`/teacher/courses/${courseId}/upload-video`}>
                      <Video className="w-4 h-4 mr-1" />
                      Upload Video
                    </Link>
                  </Button>
                )}
                <Button size="sm" onClick={() => openLessonDialog()} data-testid="button-add-lesson">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Lesson
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sortedLessons.length > 0 ? (
                <div className="space-y-2">
                  {sortedLessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 p-3 rounded-md border border-border"
                      data-testid={`lesson-item-${lesson.id}`}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{lesson.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getContentTypeIcon(lesson.contentType)}
                          <Badge variant="outline" className="text-xs">
                            {lesson.contentType}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openLessonDialog(lesson)}
                          data-testid={`button-edit-lesson-${lesson.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteLessonMutation.mutate(lesson.id)}
                          data-testid={`button-delete-lesson-${lesson.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No lessons yet. Start by adding your first lesson.
                  </p>
                  <Button onClick={() => openLessonDialog()} data-testid="button-add-first-lesson">
                    <Plus className="w-4 h-4 mr-1" />
                    Add First Lesson
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
          </DialogHeader>
          <Form {...lessonForm}>
            <form onSubmit={lessonForm.handleSubmit(onLessonSubmit)} className="space-y-4">
              <FormField
                control={lessonForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Lesson title" {...field} data-testid="input-lesson-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={lessonForm.control}
                name="contentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-content-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="link">Link</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={lessonForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {lessonForm.watch("contentType") === "video" ? "Video" : "Content"}
                    </FormLabel>
                    <FormControl>
                      {lessonForm.watch("contentType") === "video" ? (
                        <B2VideoUploader
                          courseId={parseInt(courseId || "0")}
                          value={field.value}
                          onChange={(cdnUrl) => field.onChange(cdnUrl || "")}
                        />
                      ) : (
                        <Textarea 
                          placeholder={
                            lessonForm.watch("contentType") === "link" ? "External URL" :
                            lessonForm.watch("contentType") === "file" ? "File URL" :
                            "Lesson content"
                          }
                          className="min-h-32"
                          {...field} 
                          data-testid="input-lesson-content"
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setLessonDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createLessonMutation.isPending || updateLessonMutation.isPending}
                  data-testid="button-save-lesson"
                >
                  {editingLesson ? "Update Lesson" : "Add Lesson"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
