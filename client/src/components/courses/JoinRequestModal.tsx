import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  FileCheck, 
  Clock, 
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle
} from "lucide-react";

interface JoinRequestModalProps {
  courseId: number;
  courseTitle: string;
  trigger: React.ReactNode;
}

interface JoinRequestStatus {
  exists: boolean;
  id?: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | null;
  message?: string;
  createdAt?: string;
  reviewedAt?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const ALLOWED_EXTENSIONS = ".jpg, .jpeg, .png, .pdf";

export function JoinRequestModal({ courseId, courseTitle, trigger }: JoinRequestModalProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<JoinRequestStatus>({
    queryKey: ["/api/join-requests/me", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/join-requests/me?courseId=${courseId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Receipt file is required");
      
      setIsUploading(true);
      setUploadError(null);
      
      try {
        // Step 1: Upload file via proxy endpoint (avoids CORS issues)
        console.log("[JoinRequest] Uploading file via proxy:", file.name);
        
        const formData = new FormData();
        formData.append("file", file);
        formData.append("courseId", String(courseId));
        
        const uploadRes = await fetch("/api/join-requests/upload-receipt", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}));
          console.error("[JoinRequest] Proxy upload failed:", uploadRes.status, errorData);
          throw new Error(errorData.message || "Failed to upload file");
        }
        
        const uploadData = await uploadRes.json();
        const objectKey = uploadData.objectKey;
        console.log("[JoinRequest] File uploaded, objectKey:", objectKey);
        
        // Step 3: Create join request with receipt metadata
        const createRes = await apiRequest("POST", "/api/join-requests", {
          courseId,
          message: message.trim() || null,
          receiptKey: objectKey,
          receiptMime: file.type,
          receiptSize: file.size,
        });
        
        const result = await createRes.json();
        console.log("[JoinRequest] Join request created:", result);
        return result;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your enrollment request has been sent. Wait for teacher approval.",
      });
      setOpen(false);
      setFile(null);
      setMessage("");
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests/me", courseId] });
    },
    onError: (error: Error) => {
      console.error("[JoinRequest] Mutation error:", error);
      setUploadError(error.message);
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setUploadError(null);
    
    if (selected) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(selected.type)) {
        setUploadError(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS}`);
        return;
      }
      
      // Validate file size
      if (selected.size > MAX_FILE_SIZE) {
        setUploadError("File too large. Maximum size is 10 MB.");
        return;
      }
      
      setFile(selected);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError("Please select a receipt file");
      return;
    }
    submitMutation.mutate();
  };

  const resetForm = () => {
    setFile(null);
    setMessage("");
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Show pending state
  if (status?.exists && status.status === "PENDING") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent data-testid="dialog-join-request-pending">
          <DialogHeader>
            <DialogTitle>Request Pending</DialogTitle>
            <DialogDescription>
              for {courseTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 text-center">
            <Clock className="w-12 h-12 text-amber-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Waiting for Approval</h3>
            <p className="text-muted-foreground text-sm">
              Your enrollment request is pending. The teacher will review your payment receipt and respond soon.
            </p>
            {status.createdAt && (
              <p className="text-xs text-muted-foreground mt-3">
                Submitted: {new Date(status.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show approved state
  if (status?.exists && status.status === "APPROVED") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent data-testid="dialog-join-request-approved">
          <DialogHeader>
            <DialogTitle>Enrollment Approved</DialogTitle>
            <DialogDescription>
              for {courseTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">You're Enrolled!</h3>
            <p className="text-muted-foreground text-sm">
              Your enrollment has been approved. You can now access all course content.
            </p>
          </div>
          <Button onClick={() => setOpen(false)} className="w-full" data-testid="button-close-approved">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Show rejected state with option to resubmit
  if (status?.exists && status.status === "REJECTED") {
    return (
      <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (val) resetForm(); }}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent data-testid="dialog-join-request-rejected">
          <DialogHeader>
            <DialogTitle>Request Rejected</DialogTitle>
            <DialogDescription>
              for {courseTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4 text-center">
            <XCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Request Not Approved</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Your previous request was rejected. You can submit a new request with a valid payment receipt.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt">Payment Receipt *</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  file ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "border-border hover:border-primary/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
                data-testid="dropzone-receipt"
              >
                <input
                  ref={fileInputRef}
                  id="receipt-input"
                  type="file"
                  accept={ALLOWED_TYPES.join(",")}
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-receipt"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileCheck className="w-10 h-10 text-green-500" />
                    <span className="font-medium text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <span className="font-medium">Click to upload receipt</span>
                    <span className="text-xs text-muted-foreground">
                      {ALLOWED_EXTENSIONS} (max 10MB)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Any additional notes for the teacher..."
                maxLength={500}
                data-testid="input-message"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-request"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!file || submitMutation.isPending || isUploading}
                data-testid="button-submit-request"
              >
                {(submitMutation.isPending || isUploading) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isUploading ? "Uploading..." : "Submitting..."}
                  </>
                ) : (
                  "Submit New Request"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Show form for new request
  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (val) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent data-testid="dialog-join-request">
        <DialogHeader>
          <DialogTitle>Request to Join Course</DialogTitle>
          <DialogDescription>
            Upload your payment receipt to request enrollment in {courseTitle}
          </DialogDescription>
        </DialogHeader>
        
        {statusLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt">Payment Receipt *</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  file ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "border-border hover:border-primary/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
                data-testid="dropzone-receipt"
              >
                <input
                  ref={fileInputRef}
                  id="receipt-input"
                  type="file"
                  accept={ALLOWED_TYPES.join(",")}
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-receipt"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileCheck className="w-10 h-10 text-green-500" />
                    <span className="font-medium text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <span className="font-medium">Click to upload receipt</span>
                    <span className="text-xs text-muted-foreground">
                      {ALLOWED_EXTENSIONS} (max 10MB)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Any additional notes for the teacher..."
                maxLength={500}
                data-testid="input-message"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-request"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!file || submitMutation.isPending || isUploading}
                data-testid="button-submit-request"
              >
                {(submitMutation.isPending || isUploading) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isUploading ? "Uploading..." : "Submitting..."}
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
