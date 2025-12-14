import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Users, Clock, Plus, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithRelations } from "@shared/schema";

export default function TeacherDashboard() {
  const { data: courses, isLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/teacher/courses"],
  });

  const stats = {
    total: courses?.length || 0,
    published: courses?.filter(c => c.status === "PUBLISHED").length || 0,
    pending: courses?.filter(c => c.status === "PENDING_APPROVAL").length || 0,
    draft: courses?.filter(c => c.status === "DRAFT").length || 0,
    totalStudents: courses?.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0) || 0,
  };

  return (
    <DashboardLayout title="Teacher Dashboard">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold" data-testid="stat-total-courses">{stats.total}</p>
                  )}
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Published</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-green-600" data-testid="stat-published">{stats.published}</p>
                  )}
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-yellow-600" data-testid="stat-pending">{stats.pending}</p>
                  )}
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold" data-testid="stat-students">{stats.totalStudents}</p>
                  )}
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover-elevate">
            <Link href="/teacher/courses/new">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Create Course</h3>
                  <p className="text-sm text-muted-foreground">Start a new course</p>
                </div>
                <ArrowRight className="w-5 h-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>

          <Card className="hover-elevate">
            <Link href="/teacher/courses">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Courses</h3>
                  <p className="text-sm text-muted-foreground">Edit and update courses</p>
                </div>
                <ArrowRight className="w-5 h-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>

          <Card className="hover-elevate">
            <Link href="/courses">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">View Catalog</h3>
                  <p className="text-sm text-muted-foreground">Browse all courses</p>
                </div>
                <ArrowRight className="w-5 h-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
