import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Check, X, FileCheck, Eye, Pencil } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithRelations } from "@shared/schema";

export default function CourseApprovals() {
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<CourseWithRelations | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");

  const { data: pendingCourses, isLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/admin/pending"],
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ courseId, action, reason }: { courseId: number; action: "approve" | "reject"; reason?: string }) => {
      await apiRequest("POST", `/api/courses/${courseId}/${action}`, { reason });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: variables.action === "approve" ? "Course Approved" : "Course Rejected",
        description: variables.action === "approve" 
          ? "The course has been published." 
          : "The course has been rejected.",
      });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openDialog = (course: CourseWithRelations, actionType: "approve" | "reject") => {
    setSelectedCourse(course);
    setAction(actionType);
    setReason("");
  };

  const closeDialog = () => {
    setSelectedCourse(null);
    setAction(null);
    setReason("");
  };

  const handleConfirm = () => {
    if (!selectedCourse || !action) return;
    approvalMutation.mutate({
      courseId: selectedCourse.id,
      action,
      reason: action === "reject" ? reason : undefined,
    });
  };

  const getTeacherInitials = (teacher?: CourseWithRelations["teacher"]) => {
    if (!teacher) return "T";
    return `${teacher.firstName?.[0] || ""}${teacher.lastName?.[0] || ""}`.toUpperCase() || "T";
  };

  return (
    <DashboardLayout title="Course Approvals">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Approvals</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {pendingCourses?.length || 0} courses awaiting review
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : pendingCourses && pendingCourses.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>College</TableHead>
                      <TableHead>Lessons</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCourses.map((course) => (
                      <TableRow key={course.id} data-testid={`row-course-${course.id}`}>
                        <TableCell>
                          <div className="font-medium">{course.title}</div>
                          {course.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1 max-w-xs">
                              {course.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={course.teacher?.profileImageUrl || undefined} className="object-cover" />
                              <AvatarFallback className="text-xs">
                                {getTeacherInitials(course.teacher)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {course.teacher?.firstName} {course.teacher?.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {course.college && (
                            <Badge variant="outline">{course.college.name}</Badge>
                          )}
                        </TableCell>
                        <TableCell>{course._count?.lessons || 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              asChild
                              data-testid={`button-view-${course.id}`}
                            >
                              <Link href={`/courses/${course.id}`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              data-testid={`button-edit-${course.id}`}
                            >
                              <Link href={`/admin/courses/${course.id}/edit`}>
                                <Pencil className="w-4 h-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog(course, "approve")}
                              className="text-green-600 hover:text-green-700"
                              data-testid={`button-approve-${course.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog(course, "reject")}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-reject-${course.id}`}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Pending Approvals</h3>
                <p className="text-sm text-muted-foreground">
                  All course submissions have been reviewed.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedCourse && !!action} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve Course" : "Reject Course"}
            </DialogTitle>
            <DialogDescription>
              {action === "approve" 
                ? `Are you sure you want to approve "${selectedCourse?.title}"? It will be published and visible to all students.`
                : `Are you sure you want to reject "${selectedCourse?.title}"? The teacher will be notified.`
              }
            </DialogDescription>
          </DialogHeader>

          {action === "reject" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                placeholder="Provide a reason for rejection..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                data-testid="input-rejection-reason"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={approvalMutation.isPending}
              variant={action === "reject" ? "destructive" : "default"}
              data-testid="button-confirm-action"
            >
              {approvalMutation.isPending 
                ? "Processing..." 
                : action === "approve" ? "Approve" : "Reject"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
