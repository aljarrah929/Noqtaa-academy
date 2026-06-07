import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Users, ArrowRight, CheckCircle, Video, FileText } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import type { CourseWithRelations } from "@shared/schema";

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { data: courses, isLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/teacher/courses"],
  });

  const stats = {
    total: courses?.length || 0,
    published: courses?.filter(c => c.status === "PUBLISHED").length || 0,
    totalStudents: courses?.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0) || 0,
  };

  return (
    <DashboardLayout title={t("teacher.dashboard")}>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("teacher.totalCourses")}</p>
                  {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : (
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
                  <p className="text-sm text-muted-foreground">{t("teacher.published")}</p>
                  {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : (
                    <p className="text-3xl font-bold text-green-600" data-testid="stat-published">{stats.published}</p>
                  )}
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("teacher.totalStudents")}</p>
                  {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : (
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
          <h2 className="text-xl font-semibold">{t("teacher.quickActions")}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover-elevate">
            <Link href="/teacher/courses">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("teacher.manageContent")}</h3>
                  <p className="text-sm text-muted-foreground">{t("teacher.manageContentDesc")}</p>
                </div>
                <ArrowRight className="w-5 h-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>

          <Card className="hover-elevate">
            <Link href="/teacher/courses/new">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("sidebar.createCourse")}</h3>
                  <p className="text-sm text-muted-foreground">{t("teacher.createCourseDesc")}</p>
                </div>
                <ArrowRight className="w-5 h-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>

          <Card className="hover-elevate">
            <Link href="/teacher/upload-video">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("teacher.uploadVideo")}</h3>
                  <p className="text-sm text-muted-foreground">{t("teacher.uploadVideoDesc")}</p>
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
                  <h3 className="font-semibold">{t("teacher.viewCatalog")}</h3>
                  <p className="text-sm text-muted-foreground">{t("teacher.viewCatalogDesc")}</p>
                </div>
                <ArrowRight className="w-5 h-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>
      <Card className="hover-elevate">
            <Link href="/teacher/library">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">ملفات المكتبة</h3>
                  <p className="text-sm text-muted-foreground">رفع وإدارة ملازم PDF</p>
                </div>
                <ArrowRight className="w-5 h-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>
    </DashboardLayout>
  );
}