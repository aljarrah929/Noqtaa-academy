import { useState, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, UserPlus, ArrowLeft, Mail, Search, UserCheck, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import type { CourseWithRelations, User, Enrollment, UserWithCollege } from "@shared/schema";

interface EnrollmentWithStudent extends Enrollment {
  student?: User;
}

export default function CourseEnrollments() {
  const [match, params] = useRoute("/teacher/courses/:id/enrollments");
  const courseId = params?.id;
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<UserWithCollege | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<{ id: string; name: string } | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithRelations>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ["/api/courses", courseId, "enrollments"],
    enabled: !!courseId,
  });

  const { data: searchResults, isLoading: searching } = useQuery<UserWithCollege[]>({
    queryKey: ["/api/users/search", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/users/search?query=${encodeURIComponent(debouncedQuery)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to search users");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const enrolledStudentIds = new Set(enrollments?.map(e => e.studentId) || []);
  const availableResults = searchResults?.filter(s => !enrolledStudentIds.has(s.id)) || [];

  const enrollMutation = useMutation({
    mutationFn: async (studentId: string) => {
      await apiRequest("POST", `/api/courses/${courseId}/enrollments`, {
        studentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      toast({ title: "Student Enrolled", description: "The student has been enrolled in this course." });
      setDialogOpen(false);
      setSearchQuery("");
      setSelectedStudent(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEnroll = () => {
    if (selectedStudent) {
      enrollMutation.mutate(selectedStudent.id);
    }
  };

  const removeMutation = useMutation({
    mutationFn: async (studentId: string) => {
      await apiRequest("DELETE", `/api/courses/${courseId}/enrollments/${studentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      toast({ title: "Student Removed", description: "Student removed successfully" });
      setRemoveDialogOpen(false);
      setStudentToRemove(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleRemoveClick = (studentId: string, studentName: string) => {
    setStudentToRemove({ id: studentId, name: studentName });
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = () => {
    if (studentToRemove) {
      removeMutation.mutate(studentToRemove.id);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSearchQuery("");
      setSelectedStudent(null);
    }
  };

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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">
                            {student?.firstName} {student?.lastName}
                          </p>
                          {student?.publicId && (
                            <Badge variant="secondary" className="text-xs">
                              {student.publicId}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {student?.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {student?.email && (
                          <Button variant="ghost" size="icon" asChild data-testid={`button-email-${enrollment.id}`}>
                            <a href={`mailto:${student.email}`}>
                              <Mail className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveClick(
                            enrollment.studentId,
                            `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "this student"
                          )}
                          data-testid={`button-remove-${enrollment.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
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

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll Student</DialogTitle>
            <DialogDescription>
              Search for a student by their ID (e.g., PH123456), name, or email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by Student ID (PH123456)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-student"
              />
            </div>

            {/* Search Results */}
            {debouncedQuery.length >= 2 && (
              <div className="border rounded-md max-h-60 overflow-y-auto">
                {searching ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Searching...
                  </div>
                ) : availableResults.length > 0 ? (
                  <div className="divide-y">
                    {availableResults.map((student) => {
                      const initials = `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`.toUpperCase() || "S";
                      const isSelected = selectedStudent?.id === student.id;
                      
                      return (
                        <div
                          key={student.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer hover-elevate ${isSelected ? "bg-accent" : ""}`}
                          onClick={() => setSelectedStudent(student)}
                          data-testid={`result-student-${student.id}`}
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={student.profileImageUrl || undefined} className="object-cover" />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">
                                {student.firstName} {student.lastName}
                              </p>
                              {student.publicId && (
                                <Badge variant="secondary" className="text-xs">
                                  {student.publicId}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm text-muted-foreground truncate">
                                {student.email}
                              </p>
                              {student.college && (
                                <Badge variant="outline" className="text-xs">
                                  {student.college.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <UserCheck className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    All matching students are already enrolled
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No students found
                  </div>
                )}
              </div>
            )}

            {/* Selected Student Preview */}
            {selectedStudent && (
              <div className="border rounded-md p-3 bg-accent/30">
                <p className="text-sm font-medium mb-1">Selected Student:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{selectedStudent.firstName} {selectedStudent.lastName}</span>
                  {selectedStudent.publicId && (
                    <Badge variant="outline">{selectedStudent.publicId}</Badge>
                  )}
                  {selectedStudent.college && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedStudent.college.name}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{selectedStudent.email}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEnroll}
              disabled={!selectedStudent || enrollMutation.isPending}
              data-testid="button-confirm-enroll"
            >
              {enrollMutation.isPending ? "Enrolling..." : "Enroll Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {studentToRemove?.name} from this course?
              They will lose access to all course content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove"
            >
              {removeMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
