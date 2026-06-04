import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Filter,
  Search,
  Plus,
} from "lucide-react";
import type { JoinRequestWithRelations } from "@shared/schema";

export default function AdminJoinRequests() {
  const { toast } = useToast();

  // Receipt states
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptMimeType, setReceiptMimeType] = useState<string>("image/jpeg");
  const [receiptLoading, setReceiptLoading] = useState(false);

  // Confirm states
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: "approve" | "reject"; studentName: string } | null>(null);

  // Bulk states
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<Set<number>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");

  // ===== Add by ID states =====
  const [addByIdOpen, setAddByIdOpen] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<string>("all");

  const { data: requests, isLoading } = useQuery<JoinRequestWithRelations[]>({
    queryKey: ["/api/join-requests"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  // جلب قائمة الكورسات
  const { data: courses } = useQuery<any[]>({
    queryKey: ["/api/courses"],
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("POST", `/api/join-requests/${requestId}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: "Request Approved", description: "Student has been enrolled in the course." });
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("POST", `/api/join-requests/${requestId}/reject`, {});
    },
    onSuccess: () => {
      toast({ title: "Request Rejected", description: "The enrollment request has been rejected." });
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mutation لإضافة طالب مباشرة
  const enrollByIdMutation = useMutation({
    mutationFn: async ({ studentId, courseId, packageType  }: { studentId: string; courseId: number; packageType: string; }) => {
      await apiRequest("POST", `/api/courses/${courseId}/enrollments`, { studentId, packageType  });
    },
    onSuccess: () => {
      toast({ title: "✅ تم التسجيل", description: "تم تسجيل الطالب في الكورس بنجاح." });
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests"] });
      setAddByIdOpen(false);
      setSearchId("");
      setFoundStudent(null);
      
      setSelectedCourseId("");
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  // البحث عن طالب بالـ ID
  const handleSearchById = async () => {
    if (!searchId.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    setFoundStudent(null);
    try {
      const res = await fetch(`/api/users/search?query=${encodeURIComponent(searchId.trim())}`, {
        credentials: "include",
      });
      const data = await res.json();
      const student = data.find((u: any) => u.publicId === searchId.trim().toUpperCase() && u.role === "STUDENT");
      if (student) {
        setFoundStudent(student);
      } else {
        setSearchError("لم يتم العثور على طالب بهذا الـ ID");
      }
    } catch {
      setSearchError("حدث خطأ أثناء البحث");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleEnrollById = () => {
  if (!foundStudent || !selectedCourseId) return;
  enrollByIdMutation.mutate({
    studentId: foundStudent.id,
    courseId: parseInt(selectedCourseId),
    packageType: selectedPackage,
  });
};

  const viewReceipt = async (requestId: number, mimeType?: string) => {
    setReceiptLoading(true);
    setReceiptDialogOpen(true);
    try {
      const response = await fetch(`/api/join-requests/${requestId}/receipt`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load receipt");
      const data = await response.json();
      setReceiptUrl(data.downloadUrl);
      setReceiptMimeType(data.mimeType || mimeType || "image/jpeg");
    } catch {
      toast({ title: "Error", description: "Failed to load receipt", variant: "destructive" });
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

  const toggleSelect = (id: number) => {
    setSelectedRequests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRequests.size === pendingRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(pendingRequests.map((r) => r.id)));
    }
  };

  const handleBulkAction = (action: "approve" | "reject") => {
    if (selectedRequests.size === 0) return;
    setBulkAction(action);
    setBulkConfirmOpen(true);
  };

  const confirmBulkAction = async () => {
    if (!bulkAction || selectedRequests.size === 0) return;
    const ids = Array.from(selectedRequests);
    let successCount = 0;
    let errorCount = 0;
    for (const id of ids) {
      try {
        await apiRequest("POST", `/api/join-requests/${id}/${bulkAction}`, {});
        successCount++;
      } catch {
        errorCount++;
      }
    }
    toast({
      title: bulkAction === "approve" ? "Bulk Approve Complete" : "Bulk Reject Complete",
      description: `${successCount} ${bulkAction === "approve" ? "approved" : "rejected"}${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/join-requests"] });
    setSelectedRequests(new Set());
    setBulkConfirmOpen(false);
    setBulkAction(null);
  };

  const filteredRequests = requests?.filter((r) => {
    if (statusFilter === "ALL") return true;
    return r.status === statusFilter;
  }) || [];

  const pendingRequests = requests?.filter((r) => r.status === "PENDING") || [];

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
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const publishedCourses = courses?.filter((c: any) => c.status === "PUBLISHED") || [];

  return (
    <DashboardLayout title="Join Requests Manager">
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserPlus className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-semibold">All Join Requests</h1>
              <p className="text-sm text-muted-foreground">Manage enrollment requests across all courses</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* ===== زر إضافة طالب بالـ ID ===== */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddByIdOpen(true)}
              className="border-primary text-primary hover:bg-primary/5"
            >
              <Plus className="w-4 h-4 mr-1" />
              إضافة طالب بالـ ID
            </Button>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ALL">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {statusFilter === "PENDING" && pendingRequests.length > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleSelectAll} data-testid="button-select-all">
                  {selectedRequests.size === pendingRequests.length ? "Deselect All" : "Select All"}
                </Button>
                <Button size="sm" onClick={() => handleBulkAction("approve")} disabled={selectedRequests.size === 0} data-testid="button-bulk-approve">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve ({selectedRequests.size})
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleBulkAction("reject")} disabled={selectedRequests.size === 0} data-testid="button-bulk-reject">
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject ({selectedRequests.size})
                </Button>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">No Requests Found</h2>
              <p className="text-muted-foreground">
                {statusFilter === "PENDING" ? "No pending join requests at this time." : `No ${statusFilter.toLowerCase()} requests found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <Card key={request.id} data-testid={`card-admin-request-${request.id}`}>
                <CardContent className="py-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {statusFilter === "PENDING" && (
                      <div className="flex-shrink-0">
                        <input type="checkbox" checked={selectedRequests.has(request.id)} onChange={() => toggleSelect(request.id)} className="h-4 w-4 rounded border-border" data-testid={`checkbox-request-${request.id}`} />
                      </div>
                    )}
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.student?.profileImageUrl || undefined} className="object-cover" />
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
                      <span className="text-sm truncate max-w-[200px]" data-testid={`text-course-${request.id}`}>{request.course?.title}</span>
                    </div>
                    <div className="flex-shrink-0">{getStatusBadge(request.status)}</div>
                    <div className="text-sm text-muted-foreground flex-shrink-0">{formatDate(request.createdAt)}</div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => viewReceipt(request.id, request.receiptMime || undefined)} data-testid={`button-view-receipt-${request.id}`}>
                        <Eye className="w-4 h-4 mr-1" />Receipt
                      </Button>
                      {request.status === "PENDING" && (
                        <>
                          <Button variant="default" size="sm" onClick={() => handleAction(request.id, "approve", `${request.student?.firstName} ${request.student?.lastName}`)} disabled={approveMutation.isPending || rejectMutation.isPending} data-testid={`button-approve-${request.id}`}>
                            <CheckCircle className="w-4 h-4 mr-1" />Approve
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleAction(request.id, "reject", `${request.student?.firstName} ${request.student?.lastName}`)} disabled={approveMutation.isPending || rejectMutation.isPending} data-testid={`button-reject-${request.id}`}>
                            <XCircle className="w-4 h-4 mr-1" />Reject
                          </Button>
                        </>
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
        )}
      </div>

      {/* ===== Dialog إضافة طالب بالـ ID ===== */}
      <Dialog open={addByIdOpen} onOpenChange={(open) => {
        setAddByIdOpen(open);
        if (!open) { setSearchId(""); setFoundStudent(null); setSelectedCourseId(""); setSelectedPackage("all"); setSearchError(""); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة طالب بالـ ID</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* البحث بالـ ID */}
            <div className="space-y-2">
              <Label>معرّف الطالب (Student ID)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="مثال: IT704260"
                  value={searchId}
                  onChange={(e) => { setSearchId(e.target.value.toUpperCase()); setSearchError(""); setFoundStudent(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchById()}
                  className="font-mono"
                />
                <Button onClick={handleSearchById} disabled={searchLoading || !searchId.trim()}>
                  {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {searchError && <p className="text-sm text-destructive">{searchError}</p>}
            </div>

            {/* نتيجة البحث */}
            {foundStudent && (
              <div className="p-3 rounded-lg border bg-muted/30 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={foundStudent.profileImageUrl || undefined} className="object-cover" />
                  <AvatarFallback>{`${foundStudent.firstName?.[0] || ""}${foundStudent.lastName?.[0] || ""}`.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{foundStudent.firstName} {foundStudent.lastName}</p>
                  <p className="text-xs text-muted-foreground">{foundStudent.publicId} · {foundStudent.email}</p>
                </div>
                <Badge variant="secondary" className="ml-auto">طالب</Badge>
              </div>
            )}

            {/* اختيار الكورس */}
            {/* اختيار الكورس والقسم */}
{foundStudent && (
  <div className="space-y-3">
    <div className="space-y-2">
      <Label>اختر الكورس</Label>
      <Select value={selectedCourseId} onValueChange={(val) => {
        setSelectedCourseId(val);
        setSelectedPackage("all");
      }}>
        <SelectTrigger>
          <SelectValue placeholder="اختر الكورس..." />
        </SelectTrigger>
        <SelectContent>
          {publishedCourses.map((course: any) => (
            <SelectItem key={course.id} value={String(course.id)}>
              {course.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* اختيار القسم */}
    {selectedCourseId && (() => {
      const course = publishedCourses.find((c: any) => String(c.id) === selectedCourseId);
      const packages = [
        { value: "all", label: "المادة كاملة", price: course?.price },
        { value: "first", label: "الفيرست", price: course?.priceFirst },
        { value: "second", label: "السكند", price: course?.priceSecond },
        { value: "mid", label: "الميد", price: course?.priceMid },
        { value: "final", label: "الفاينل", price: course?.priceFinal },
      ].filter(p => p.price && p.price > 0);

      return (
        <div className="space-y-2">
          <Label>اختر القسم</Label>
          <Select value={selectedPackage} onValueChange={setSelectedPackage}>
            <SelectTrigger>
              <SelectValue placeholder="اختر القسم..." />
            </SelectTrigger>
            <SelectContent>
              {packages.map(pkg => (
                <SelectItem key={pkg.value} value={pkg.value}>
                  {pkg.label} — {pkg.price} JOD
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    })()}
  </div>
)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddByIdOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleEnrollById}
              disabled={!foundStudent || !selectedCourseId || enrollByIdMutation.isPending}
            >
              {enrollByIdMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              تسجيل الطالب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={closeReceiptDialog}>
        <DialogContent className="max-w-lg" data-testid="dialog-receipt">
          <DialogHeader><DialogTitle>Payment Receipt</DialogTitle></DialogHeader>
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
                  <Button asChild><a href={receiptUrl} target="_blank" rel="noopener noreferrer">Open PDF</a></Button>
                </div>
              ) : (
                <img src={receiptUrl} alt="Payment Receipt" className="max-w-full max-h-[60vh] rounded-lg object-contain" data-testid="img-receipt" />
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

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent data-testid="dialog-confirm-action">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.action === "approve" ? "Approve Request" : "Reject Request"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "approve"
                ? `Are you sure you want to approve ${confirmAction?.studentName}'s enrollment request?`
                : `Are you sure you want to reject ${confirmAction?.studentName}'s enrollment request?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActionHandler} className={confirmAction?.action === "reject" ? "bg-destructive hover:bg-destructive/90" : ""} data-testid="button-confirm-action">
              {confirmAction?.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Confirm Dialog */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent data-testid="dialog-bulk-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>{bulkAction === "approve" ? "Bulk Approve Requests" : "Bulk Reject Requests"}</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "approve"
                ? `Are you sure you want to approve ${selectedRequests.size} request(s)?`
                : `Are you sure you want to reject ${selectedRequests.size} request(s)?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkAction} className={bulkAction === "reject" ? "bg-destructive hover:bg-destructive/90" : ""} data-testid="button-confirm-bulk">
              {bulkAction === "approve" ? `Approve ${selectedRequests.size}` : `Reject ${selectedRequests.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}