import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, BookOpen, Mail, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatPrice } from "@/lib/utils";

interface TeacherWithStats {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  coursesCount: number;
  studentsCount: number;
}

interface TeacherCourse {
  id: number;
  title: string;
  price: number;
  status: string;
  studentsCount: number;
}

interface TeacherStudent {
  studentId: string;
  name: string;
  email: string;
  phone: string;
  courseName: string;
}

export default function TeachersList() {
  const { data: teachers, isLoading } = useQuery<TeacherWithStats[]>({
    queryKey: ["/api/admin/teachers"],
  });

  const [coursesDialog, setCoursesDialog] = useState<TeacherWithStats | null>(null);
  const [studentsDialog, setStudentsDialog] = useState<TeacherWithStats | null>(null);

  const getTeacherName = (teacher: TeacherWithStats) =>
    `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() || "Unknown";

  const getInitials = (teacher: TeacherWithStats) => {
    return `${teacher.firstName?.[0] || ""}${teacher.lastName?.[0] || ""}`.toUpperCase() || "T";
  };

  return (
    <DashboardLayout title="Teachers">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Teachers</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {teachers?.length || 0} teachers
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : teachers && teachers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Courses</TableHead>
                      <TableHead className="text-center">Students</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.map((teacher) => (
                      <TableRow key={teacher.id} data-testid={`row-teacher-${teacher.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={teacher.profileImageUrl || undefined} className="object-cover" />
                              <AvatarFallback>{getInitials(teacher)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {teacher.firstName} {teacher.lastName}
                              </div>
                              <Badge variant="secondary" className="text-xs mt-1">
                                Teacher
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {teacher.email}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setCoursesDialog(teacher)}
                            data-testid={`btn-courses-${teacher.id}`}
                          >
                            <BookOpen className="w-4 h-4" />
                            <span className="font-medium">{teacher.coursesCount}</span>
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setStudentsDialog(teacher)}
                            data-testid={`btn-students-${teacher.id}`}
                          >
                            <Users className="w-4 h-4" />
                            <span className="font-medium">{teacher.studentsCount}</span>
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          {teacher.email && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`mailto:${teacher.email}`}>
                                <Mail className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Teachers Yet</h3>
                <p className="text-sm text-muted-foreground">
                  There are no teachers registered on the platform.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TeacherCoursesDialog
        teacher={coursesDialog}
        onClose={() => setCoursesDialog(null)}
      />
      <TeacherStudentsDialog
        teacher={studentsDialog}
        onClose={() => setStudentsDialog(null)}
      />
    </DashboardLayout>
  );
}

function TeacherCoursesDialog({
  teacher,
  onClose,
}: {
  teacher: TeacherWithStats | null;
  onClose: () => void;
}) {
  const { data: courses, isLoading } = useQuery<TeacherCourse[]>({
    queryKey: ["/api/admin/teachers", teacher?.id, "courses"],
    enabled: !!teacher,
  });

  const teacherName = teacher
    ? `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() || "Teacher"
    : "";

  return (
    <Dialog open={!!teacher} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl" data-testid="dialog-teacher-courses">
        <DialogHeader>
          <DialogTitle data-testid="text-courses-dialog-title">
            Courses by {teacherName}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Title</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id} data-testid={`row-course-${course.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{course.title}</span>
                        <Badge variant="secondary" className="text-xs">
                          {course.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatPrice(course.price)}
                    </TableCell>
                    <TableCell className="text-center">
                      {course.studentsCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        data-testid={`button-edit-course-${course.id}`}
                      >
                        <Link href={`/admin/courses/${course.id}/edit`}>
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No courses found for this teacher.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TeacherStudentsDialog({
  teacher,
  onClose,
}: {
  teacher: TeacherWithStats | null;
  onClose: () => void;
}) {
  const { data: students, isLoading } = useQuery<TeacherStudent[]>({
    queryKey: ["/api/admin/teachers", teacher?.id, "students"],
    enabled: !!teacher,
  });

  const teacherName = teacher
    ? `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() || "Teacher"
    : "";

  return (
    <Dialog open={!!teacher} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl" data-testid="dialog-teacher-students">
        <DialogHeader>
          <DialogTitle data-testid="text-students-dialog-title">
            Students of {teacherName}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : students && students.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Course</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, idx) => (
                  <TableRow key={`${student.studentId}-${idx}`} data-testid={`row-student-${student.studentId}`}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-muted-foreground">{student.email}</TableCell>
                    <TableCell className="text-muted-foreground">{student.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.courseName}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No students enrolled with this teacher.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
