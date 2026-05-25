import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Trash2, Eye, Search, BookOpen } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithRelations } from "@shared/schema";

export default function ManageCourses() {
  const { toast } = useToast();
  const [courseToDelete, setCourseToDelete] = useState<CourseWithRelations | null>(null);
  const [search, setSearch] = useState("");

  const { data: courses, isLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/courses"],
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: number) => {
      await apiRequest("DELETE", `/api/courses/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Course Deleted", description: "The course has been deleted successfully." });
      setCourseToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filtered = courses?.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher?.lastName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "bg-green-100 text-green-800";
      case "PENDING_APPROVAL": return "bg-yellow-100 text-yellow-800";
      case "DRAFT": return "bg-gray-100 text-gray-800";
      case "REJECTED": return "bg-red-100 text-red-800";
      default: return "";
    }
  };

  return (
    <DashboardLayout title="Manage Courses">
      <div className="max-w-6xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Courses ({filtered.length})</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses or teachers..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No courses found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(course => (
                  <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{course.title}</span>
                        <Badge className={getStatusColor(course.status)} variant="outline">
                          {course.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex gap-3">
                        <span>👨‍🏫 {course.teacher?.firstName} {course.teacher?.lastName}</span>
                        <span>🏫 {course.college?.name}</span>
                        <span>📚 {course._count?.lessons || 0} lessons</span>
                        <span>👥 {course._count?.enrollments || 0} students</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/courses/${course.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCourseToDelete(course)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
             Are you sure you want to delete this course "<strong>{courseToDelete?.title}</strong>"? This action cannot be undone, and it will permanently remove all associated lessons and recordings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => courseToDelete && deleteMutation.mutate(courseToDelete.id)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Course"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}