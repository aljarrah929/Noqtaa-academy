import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, UserPlus, ArrowLeft, Mail } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithRelations, User, Enrollment } from "@shared/schema";

const enrollFormSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
});

type EnrollFormValues = z.infer<typeof enrollFormSchema>;

interface EnrollmentWithStudent extends Enrollment {
  student?: User;
}

export default function CourseEnrollments() {
  const [match, params] = useRoute("/teacher/courses/:id/enrollments");
  const courseId = params?.id;
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithRelations>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ["/api/courses", courseId, "enrollments"],
    enabled: !!courseId,
  });

  const { data: students } = useQuery<User[]>({
    queryKey: ["/api/users/students"],
  });

  const form = useForm<EnrollFormValues>({
    resolver: zodResolver(enrollFormSchema),
    defaultValues: { studentId: "" },
  });

  const enrollMutation = useMutation({
    mutationFn: async (data: EnrollFormValues) => {
      await apiRequest("POST", `/api/courses/${courseId}/enrollments`, {
        studentId: data.studentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      toast({ title: "Student Enrolled", description: "The student has been enrolled in this course." });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: EnrollFormValues) => {
    enrollMutation.mutate(data);
  };

  const enrolledStudentIds = new Set(enrollments?.map(e => e.studentId) || []);
  const availableStudents = students?.filter(s => !enrolledStudentIds.has(s.id)) || [];

  if (courseLoading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Enrollments: ${course?.title || ""}`}>
      <div className="max-w-4xl mx-auto">
        <Link href="/teacher/courses">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Enrolled Students</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {enrollments?.length || 0} students enrolled
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-enroll-student">
              <UserPlus className="w-4 h-4 mr-2" />
              Enroll Student
            </Button>
          </CardHeader>
          <CardContent>
            {enrollmentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-border">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : enrollments && enrollments.length > 0 ? (
              <div className="space-y-2">
                {enrollments.map((enrollment) => {
                  const student = enrollment.student;
                  const initials = student 
                    ? `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`.toUpperCase() || "S"
                    : "S";
                  
                  return (
                    <div
                      key={enrollment.id}
                      className="flex items-center gap-3 p-3 rounded-md border border-border"
                      data-testid={`enrollment-${enrollment.id}`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student?.profileImageUrl || undefined} className="object-cover" />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {student?.firstName} {student?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {student?.email}
                        </p>
                      </div>
                      {student?.email && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`mailto:${student.email}`}>
                            <Mail className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Students Enrolled</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click "Enroll Student" to add students to this course.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Student</DialogTitle>
            <DialogDescription>
              Select a student to enroll in this course.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-student">
                          <SelectValue placeholder="Select a student" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableStudents.length > 0 ? (
                          availableStudents.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.firstName} {student.lastName} ({student.email})
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No available students
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={enrollMutation.isPending || availableStudents.length === 0}
                  data-testid="button-confirm-enroll"
                >
                  {enrollMutation.isPending ? "Enrolling..." : "Enroll Student"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
