import { useState, useEffect } from "react";
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
import { Plus, Trash2, Save, ArrowLeft, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithRelations, College, Lesson, User } from "@shared/schema";
import { B2VideoUploader } from "@/components/B2VideoUploader";

const courseFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  collegeId: z.string().min(1, "College is required"),
  teacherId: z.string().min(1, "Teacher is required"),
  price: z.string().min(1, "Price is required"),
});

const lessonFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  contentType: z.enum(["video", "text", "link", "file"]),
  content: z.string().optional(),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;
type LessonFormValues = z.infer<typeof lessonFormSchema>;

export default function CourseEditor() {
  const [matchEdit, editParams] = useRoute("/admin/courses/:id/edit");
  const [matchNew] = useRoute("/admin/courses/new");
  const [, setLocation] = useLocation();
  const isNew = matchNew;
  const courseId = editParams?.id;
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithRelations>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: colleges } = useQuery<College[]>({
    queryKey: ["/api/colleges"],
  });

  const { data: teachers } = useQuery<User[]>({
    queryKey: ["/api/admin/teachers"],
    enabled: isAdmin,
  });

  const courseForm = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      collegeId: "",
      teacherId: "",
      price: "0",
    },
  });

  const lessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: "",
      contentType: "text",
      content: "",
    },
  });

  useEffect(() => {
    if (course) {
      courseForm.reset({
        title: course.title,
        description: course.description || "",
        collegeId: String(course.collegeId),
        teacherId: course.teacherId || "",
        price: String(course.price || 0),
      });
    }
  }, [course, courseForm]);

  const createCourseMutation = useMutation({
    mutationFn: async (data: CourseFormValues) => {
      const res = await apiRequest("POST", "/api/courses", {
        ...data,
        collegeId: Number(data.collegeId),
        price: Number(data.price),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Course Created", description: "The course has been created." });
      setLocation(`/admin/courses/${data.id}/edit`);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async (data: CourseFormValues) => {
      await apiRequest("PATCH", `/api/courses/${courseId}`, {
        ...data,
        collegeId: Number(data.collegeId),
        price: Number(data.price),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Course Updated", description: "Changes have been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  const onCourseSubmit = (data: CourseFormValues) => {
    if (isNew) {
      createCourseMutation.mutate(data);
    } else {
      updateCourseMutation.mutate(data);
    }
  };

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

  if (authLoading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Access Denied">
        <div className="max-w-4xl mx-auto text-center py-16">
          <ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            Only administrators can create or edit courses.
          </p>
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (courseLoading && !isNew) {
    return (
      <DashboardLayout title="Loading...">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  const sortedLessons = [...(course?.lessons || [])].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <DashboardLayout title={isNew ? "Create Course" : "Edit Course"}>
      <div className="max-w-4xl mx-auto">
        <Link href="/admin">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Button>
        </Link>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...courseForm}>
                <form onSubmit={courseForm.handleSubmit(onCourseSubmit)} className="space-y-4">
                  <FormField
                    control={courseForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Course title" {...field} data-testid="input-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={courseForm.control}
                    name="collegeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>College</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-college">
                              <SelectValue placeholder="Select a college" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {colleges?.map((college) => (
                              <SelectItem key={college.id} value={String(college.id)}>
                                {college.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={courseForm.control}
                    name="teacherId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teacher</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-teacher">
                              <SelectValue placeholder="Select a teacher" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teachers?.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.firstName} {teacher.lastName} ({teacher.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={courseForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (EGP)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            placeholder="0" 
                            {...field} 
                            data-testid="input-price"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={courseForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Course description" 
                            className="min-h-24"
                            {...field} 
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={createCourseMutation.isPending || updateCourseMutation.isPending}
                    data-testid="button-save-course"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isNew ? "Create Course" : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {!isNew && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Lessons</CardTitle>
                <Button size="sm" onClick={() => openLessonDialog()} data-testid="button-add-lesson">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Lesson
                </Button>
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
                          <Badge variant="outline" className="text-xs mt-1">
                            {lesson.contentType}
                          </Badge>
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
                  <p className="text-muted-foreground text-center py-8">
                    No lessons yet. Click "Add Lesson" to create one.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
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
