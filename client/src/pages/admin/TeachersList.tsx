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
import { Users, BookOpen, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeacherWithStats {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  coursesCount: number;
  studentsCount: number;
}

export default function TeachersList() {
  const { data: teachers, isLoading } = useQuery<TeacherWithStats[]>({
    queryKey: ["/api/users/teachers/stats"],
  });

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
                          <div className="flex items-center justify-center gap-1">
                            <BookOpen className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{teacher.coursesCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{teacher.studentsCount}</span>
                          </div>
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
    </DashboardLayout>
  );
}
