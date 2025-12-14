import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCheck, Users, BookOpen, ArrowRight, Clock } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithRelations, User } from "@shared/schema";

interface AdminStats {
  pendingApprovals: number;
  totalTeachers: number;
  totalCourses: number;
  totalStudents: number;
}

export default function AdminDashboard() {
  const { data: pendingCourses, isLoading: coursesLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/admin/pending"],
  });

  const { data: teachers, isLoading: teachersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/teachers"],
  });

  const stats: AdminStats = {
    pendingApprovals: pendingCourses?.length || 0,
    totalTeachers: teachers?.length || 0,
    totalCourses: 0,
    totalStudents: 0,
  };

  const isLoading = coursesLoading || teachersLoading;

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-yellow-600" data-testid="stat-pending">
                      {stats.pendingApprovals}
                    </p>
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
                  <p className="text-sm text-muted-foreground">Total Teachers</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold" data-testid="stat-teachers">
                      {stats.totalTeachers}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Published Courses</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-green-600" data-testid="stat-courses">
                      {stats.totalCourses}
                    </p>
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
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold" data-testid="stat-students">
                      {stats.totalStudents}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="hover-elevate">
            <Link href="/admin/approvals">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                    <FileCheck className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Course Approvals</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {stats.pendingApprovals} pending
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover-elevate">
            <Link href="/admin/teachers">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Teachers</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {stats.totalTeachers} teachers
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
            </Link>
          </Card>
        </div>

        {stats.pendingApprovals > 0 && (
          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Clock className="w-8 h-8 text-yellow-600" />
                  <div>
                    <h3 className="font-semibold">Courses Awaiting Approval</h3>
                    <p className="text-sm text-muted-foreground">
                      {stats.pendingApprovals} course{stats.pendingApprovals !== 1 ? "s" : ""} need your review
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link href="/admin/approvals">
                    Review Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
