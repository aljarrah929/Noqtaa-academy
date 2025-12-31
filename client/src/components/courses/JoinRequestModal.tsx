import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import { 
  Upload, 
  FileCheck, 
  Clock, 
  CheckCircle2,
  XCircle,
  Loader2 
} from "lucide-react";

interface JoinRequestModalProps {
  courseId: number;
  courseTitle: string;
  trigger: React.ReactNode;
}

export function JoinRequestModal({ courseId, courseTitle, trigger }: JoinRequestModalProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const { data: status, isLoading: statusLoading } = useQuery<{
    hasPending: boolean;
    hasApproved: boolean;
    isEnrolled: boolean;
  }>({
    queryKey: ["/api/courses", courseId, "join-request", "status"],
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Receipt is required");
      
      const formData = new FormData();
      formData.append("receipt", file);
      if (message.trim()) {
        formData.append("message", message.trim());
      }
      
      const response = await fetch(`/api/courses/${courseId}/join-request`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit request");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your enrollment request has been sent. Wait for teacher approval.",
      });
      setOpen(false);
      setFile(null);
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "join-request", "status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Receipt image must be under 2MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selected);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate();
  };

  if (status?.hasPending) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent data-testid="dialog-join-request">
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
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (status?.hasApproved || status?.isEnrolled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent data-testid="dialog-join-request">
          <DialogHeader>
            <DialogTitle>Already Enrolled</DialogTitle>
            <DialogDescription>
              in {courseTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">You&apos;re In!</h3>
            <p className="text-muted-foreground text-sm">
              Your enrollment has been approved. You can now access all course content.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                onClick={() => document.getElementById("receipt-input")?.click()}
                data-testid="dropzone-receipt"
              >
                <input
                  id="receipt-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-receipt"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileCheck className="w-10 h-10 text-green-500" />
                    <span className="font-medium text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <span className="font-medium">Click to upload receipt</span>
                    <span className="text-xs text-muted-foreground">
                      PNG, JPG, or WebP (max 2MB)
                    </span>
                  </div>
                )}
              </div>
            </div>

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
                disabled={!file || submitMutation.isPending}
                data-testid="button-submit-request"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
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
