import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { 
  UserPlus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileImage, 
  Loader2, 
  Inbox,
  BookOpen,
  Eye,
  ShieldAlert
} from "lucide-react";
import type { JoinRequestWithRelations } from "@shared/schema";

export default function TeacherJoinRequests() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canApproveReject = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptMimeType, setReceiptMimeType] = useState<string>("image/jpeg");
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: "approve" | "reject"; studentName: string } | null>(null);

  const { data: requests, isLoading } = useQuery<JoinRequestWithRelations[]>({
    queryKey: ["/api/join-requests"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("POST", `/api/join-requests/${requestId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Request Approved",
        description: "Student has been enrolled in the course.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("POST", `/api/join-requests/${requestId}/reject`, {});
    },
    onSuccess: () => {
      toast({
        title: "Request Rejected",
        description: "The enrollment request has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const viewReceipt = async (requestId: number, mimeType?: string) => {
    setReceiptLoading(true);
    setReceiptDialogOpen(true);
    try {
      const response = await fetch(`/api/join-requests/${requestId}/receipt`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load receipt");
      }
      const data = await response.json();
      setReceiptUrl(data.downloadUrl);
      setReceiptMimeType(data.mimeType || mimeType || "image/jpeg");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load receipt",
        variant: "destructive",
      });
      setReceiptDialogOpen(false);
    } finally {
      setReceiptLoading(false);
    }
  };

  const closeReceiptDialog = () => {
    setReceiptDialogOpen(false);
    setReceiptUrl(null);
    setReceiptMimeType("image/jpeg");
  };

  const handleAction = (id: number, action: "approve" | "reject", studentName: string) => {
    setConfirmAction({ id, action, studentName });
    setConfirmDialogOpen(true);
  };

  const confirmActionHandler = () => {
    if (!confirmAction) return;
    
    if (confirmAction.action === "approve") {
      approveMutation.mutate(confirmAction.id);
    } else {
      rejectMutation.mutate(confirmAction.id);
    }
    setConfirmDialogOpen(false);
    setConfirmAction(null);
  };

  const pendingRequests = requests?.filter(r => r.status === "PENDING") || [];
  const processedRequests = requests?.filter(r => r.status !== "PENDING") || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "APPROVED":
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (student?: { firstName?: string | null; lastName?: string | null }) => {
    if (!student) return "?";
    return `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`.toUpperCase() || "?";
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <UserPlus className="w-6 h-6" />
          <h1 className="text-2xl font-semibold">Join Requests</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : requests?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">No Join Requests</h2>
              <p className="text-muted-foreground">
                When students request to join your courses, they will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {pendingRequests.length > 0 && (
              <div>
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Pending ({pendingRequests.length})
                </h2>
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} data-testid={`card-request-${request.id}`}>
                      <CardContent className="py-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="h-10 w-10">
                              <AvatarImage 
                                src={request.student?.profileImageUrl || undefined}
                                className="object-cover"
                              />
                              <AvatarFallback>{getInitials(request.student)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate" data-testid={`text-student-name-${request.id}`}>
                                {request.student?.firstName} {request.student?.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {request.student?.publicId || request.student?.email}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <BookOpen className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[200px]" data-testid={`text-course-${request.id}`}>
                              {request.course?.title}
                            </span>
                          </div>

                          <div className="text-sm text-muted-foreground flex-shrink-0">
                            {formatDate(request.createdAt)}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewReceipt(request.id, request.receiptMime || undefined)}
                              data-testid={`button-view-receipt-${request.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Receipt
                            </Button>
                            {canApproveReject ? (
                              <>
                                <Button 
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleAction(
                                    request.id, 
                                    "approve", 
                                    `${request.student?.firstName} ${request.student?.lastName}`
                                  )}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                  data-testid={`button-approve-${request.id}`}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button 
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleAction(
                                    request.id, 
                                    "reject", 
                                    `${request.student?.firstName} ${request.student?.lastName}`
                                  )}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                  data-testid={`button-reject-${request.id}`}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <Badge variant="outline" data-testid={`badge-pending-admin-${request.id}`}>
                                <ShieldAlert className="w-3 h-3 mr-1" />
                                Pending Admin Approval
                              </Badge>
                            )}
                          </div>
                        </div>
                        {request.message && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-md">
                            <p className="text-sm text-muted-foreground">{request.message}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {processedRequests.length > 0 && (
              <div>
                <h2 className="text-lg font-medium mb-4">Recent History</h2>
                <div className="space-y-3">
                  {processedRequests.slice(0, 10).map((request) => (
                    <Card key={request.id} className="opacity-75" data-testid={`card-request-${request.id}`}>
                      <CardContent className="py-3">
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="h-8 w-8">
                              <AvatarImage 
                                src={request.student?.profileImageUrl || undefined}
                                className="object-cover"
                              />
                              <AvatarFallback className="text-xs">{getInitials(request.student)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {request.student?.firstName} {request.student?.lastName}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm truncate max-w-[200px] text-muted-foreground">
                              {request.course?.title}
                            </span>
                          </div>

                          <div className="flex-shrink-0">
                            {getStatusBadge(request.status)}
                          </div>

                          <div className="text-sm text-muted-foreground flex-shrink-0">
                            {formatDate(request.reviewedAt || request.createdAt)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={receiptDialogOpen} onOpenChange={closeReceiptDialog}>
        <DialogContent className="max-w-lg" data-testid="dialog-receipt">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {receiptLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading receipt...</p>
              </div>
            ) : receiptUrl ? (
              receiptMimeType === "application/pdf" ? (
                <div className="flex flex-col items-center gap-4">
                  <FileImage className="w-16 h-16 text-primary" />
                  <p className="text-muted-foreground">PDF Receipt</p>
                  <Button asChild>
                    <a href={receiptUrl} target="_blank" rel="noopener noreferrer" data-testid="link-view-pdf">
                      Open PDF
                    </a>
                  </Button>
                </div>
              ) : (
                <img 
                  src={receiptUrl} 
                  alt="Payment Receipt" 
                  className="max-w-full max-h-[60vh] rounded-lg object-contain"
                  data-testid="img-receipt"
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-3 py-8">
                <FileImage className="w-12 h-12 text-muted-foreground" />
                <p className="text-muted-foreground">Receipt not available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent data-testid="dialog-confirm-action">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "approve" ? "Approve Request" : "Reject Request"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "approve"
                ? `Are you sure you want to approve ${confirmAction?.studentName}'s enrollment request? They will be added to the course.`
                : `Are you sure you want to reject ${confirmAction?.studentName}'s enrollment request? They will need to submit a new request to try again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmActionHandler}
              className={confirmAction?.action === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
              data-testid="button-confirm-action"
            >
              {confirmAction?.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
