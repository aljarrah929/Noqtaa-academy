import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FileCheck, Users, BookOpen, ArrowRight, Clock, Settings, Plus, FileText } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { CourseWithRelations, User } from "@shared/schema";

interface AdminDashboardStats {
  mode: "AUTO" | "MANUAL";
  pendingApprovals: string;
  totalTeachers: string;
  publishedCourses: string;
  totalStudents: string;
  config: {
    id: number;
    mode: "AUTO" | "MANUAL";
    pendingApprovalsValue: string;
    totalTeachersValue: string;
    publishedCoursesValue: string;
    totalStudentsValue: string;
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [editValues, setEditValues] = useState({
    pendingApprovals: "0",
    totalTeachers: "0",
    publishedCourses: "0",
    totalStudents: "0",
  });

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const { data: pendingCourses, isLoading: coursesLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/admin/pending"],
  });

  const { data: teachers, isLoading: teachersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/teachers"],
  });

  const { data: dashboardStats, isLoading: statsLoading } = useQuery<AdminDashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  const updateStatsMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", "/api/super-admin/admin-dashboard-stats", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      setEditModalOpen(false);
      toast({ title: t("admin.statsUpdated"), description: t("admin.statsUpdatedDesc") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("admin.statsUpdateFailed"), variant: "destructive" });
    },
  });

  const openEditModal = () => {
    if (dashboardStats) {
      setEditMode(dashboardStats.mode);
      setEditValues({
        pendingApprovals: dashboardStats.config.pendingApprovalsValue,
        totalTeachers: dashboardStats.config.totalTeachersValue,
        publishedCourses: dashboardStats.config.publishedCoursesValue,
        totalStudents: dashboardStats.config.totalStudentsValue,
      });
    }
    setEditModalOpen(true);
  };

  const handleSave = () => {
    updateStatsMutation.mutate({
      mode: editMode,
      pendingApprovalsValue: editValues.pendingApprovals,
      totalTeachersValue: editValues.totalTeachers,
      publishedCoursesValue: editValues.publishedCourses,
      totalStudentsValue: editValues.totalStudents,
    });
  };

  const stats = {
    pendingApprovals: dashboardStats?.pendingApprovals || String(pendingCourses?.length || 0),
    totalTeachers: dashboardStats?.totalTeachers || String(teachers?.length || 0),
    totalCourses: dashboardStats?.publishedCourses || "0",
    totalStudents: dashboardStats?.totalStudents || "0",
  };

  const isLoading = coursesLoading || teachersLoading || statsLoading;

  return (
    <DashboardLayout title={t("admin.dashboard")}>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">{t("admin.overview")}</h2>
          {isSuperAdmin && (
            <Button variant="ghost" size="icon" onClick={openEditModal} data-testid="button-edit-stats">
              <Settings className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("admin.pendingApprovals")}</p>
                  {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : (
                    <p className="text-3xl font-bold text-yellow-600" data-testid="stat-pending">{stats.pendingApprovals}</p>
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
                  <p className="text-sm text-muted-foreground">{t("admin.totalTeachers")}</p>
                  {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : (
                    <p className="text-3xl font-bold" data-testid="stat-teachers">{stats.totalTeachers}</p>
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
                  <p className="text-sm text-muted-foreground">{t("admin.publishedCourses")}</p>
                  {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : (
                    <p className="text-3xl font-bold text-green-600" data-testid="stat-courses">{stats.totalCourses}</p>
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
                  <p className="text-sm text-muted-foreground">{t("admin.totalStudents")}</p>
                  {isLoading ? <Skeleton className="h-8 w-12 mt-1" /> : (
                    <p className="text-3xl font-bold" data-testid="stat-students">{stats.totalStudents}</p>
                  )}
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="hover-elevate">
            <Link href="/admin/courses/new">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <Plus className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t("sidebar.createCourse")}</CardTitle>
                    <p className="text-sm text-muted-foreground">{t("teacher.createCourseDesc")}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover-elevate">
            <Link href="/admin/approvals">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                    <FileCheck className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t("admin.courseApprovals")}</CardTitle>
                    <p className="text-sm text-muted-foreground">{stats.pendingApprovals} {t("admin.pending")}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
            </Link>
          </Card>
           <Card className="hover-elevate">
            <Link href="/admin/library-purchases">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-full">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t("admin.libraryPurchasesTitle")}</CardTitle>
                    <p className="text-sm text-muted-foreground">{t("admin.libraryPurchasesDesc")}</p>
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
                    <CardTitle className="text-lg">{t("sidebar.teachers")}</CardTitle>
                    <p className="text-sm text-muted-foreground">{stats.totalTeachers} {t("admin.teachersCount")}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
            </Link>
          </Card>
        </div>
        

        {Number(stats.pendingApprovals) > 0 && (
          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Clock className="w-8 h-8 text-yellow-600" />
                  <div>
                    <h3 className="font-semibold">{t("admin.coursesAwaitingApproval")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {stats.pendingApprovals} {t("admin.coursesNeedReview")}
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link href="/admin/approvals">
                    {t("admin.reviewNow")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.editStats")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("admin.statsMode")}</Label>
                <p className="text-sm text-muted-foreground">
                  {editMode === "AUTO" ? t("admin.autoMode") : t("admin.manualMode")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("admin.auto")}</span>
                <Switch checked={editMode === "MANUAL"} onCheckedChange={(c) => setEditMode(c ? "MANUAL" : "AUTO")} data-testid="switch-mode-toggle" />
                <span className="text-sm text-muted-foreground">{t("admin.manual")}</span>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { key: "pendingApprovals", label: t("admin.pendingApprovals"), testId: "input-pending-approvals" },
                { key: "totalTeachers", label: t("admin.totalTeachers"), testId: "input-total-teachers" },
                { key: "publishedCourses", label: t("admin.publishedCourses"), testId: "input-published-courses" },
                { key: "totalStudents", label: t("admin.totalStudents"), testId: "input-total-students" },
              ].map(({ key, label, testId }) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    type="text"
                    value={editValues[key as keyof typeof editValues]}
                    onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
                    disabled={editMode === "AUTO"}
                    data-testid={testId}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} data-testid="button-cancel-edit">{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={updateStatsMutation.isPending} data-testid="button-save-stats">
              {updateStatsMutation.isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}