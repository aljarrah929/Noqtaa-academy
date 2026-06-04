import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Upload, X, CheckCircle, FileText, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface B2FileUploaderProps {
  courseId: number;
  value?: string;
  onChange: (cdnUrl: string | undefined) => void;
  onUploadStart?: () => void;
  onUploadComplete?: (cdnUrl: string) => void;
  onUploadError?: (error: string) => void;
}

type UploadState = "idle" | "requesting" | "uploading" | "success" | "error";

export function B2FileUploader({
  courseId,
  value,
  onChange,
  onUploadStart,
  onUploadComplete,
  onUploadError,
}: B2FileUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>(value ? "success" : "idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const uploadViaProxy = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("video", file); // نتركها video عشان الباك إند يقبلها بدون تعديلات إضافية
    formData.append("courseId", String(courseId));

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText).cdnUrl);
          } catch (e) {
            reject(new Error("Invalid response from server"));
          }
        } else {
          reject(new Error(`Proxy upload failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during proxy upload"));
      xhr.onabort = () => reject(new Error("Upload cancelled"));

      xhr.open("POST", "/api/b2/video/upload");
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  };

  const uploadDirect = async (file: File, uploadUrl: string, cdnUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(cdnUrl);
        } else {
          reject(new Error(`Direct upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error("CORS_OR_NETWORK_ERROR"));
      xhr.onabort = () => reject(new Error("Upload cancelled"));

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.send(file);
    });
  };

  const uploadFile = useCallback(async (file: File) => {
    // 🔥 شلنا شرط الفحص تبع الفيديو من هون عشان يقبل الـ PDF
    if (file.size > 1024 * 1024 * 1024) {
      setErrorMessage("File too large. Maximum size is 1GB.");
      setUploadState("error");
      return;
    }

    setFileName(file.name);
    setFileSize(formatFileSize(file.size));
    setUploadState("requesting");
    setProgress(0);
    setErrorMessage("");
    onUploadStart?.();

    try {
      const response = await apiRequest("POST", "/api/b2/video/presign", {
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        courseId,
        fileSize: file.size,
      });

      if (!response.ok) throw new Error("Failed to get upload URL");
      const data = await response.json();
      setUploadState("uploading");

      let cdnUrl: string;
      try {
        cdnUrl = await uploadDirect(file, data.uploadUrl, data.cdnUrl);
      } catch (e: any) {
        if (e.message.includes("CORS") || e.message === "CORS_OR_NETWORK_ERROR") {
          setProgress(0);
          cdnUrl = await uploadViaProxy(file);
        } else throw e;
      }

      setUploadState("success");
      setProgress(100);
      onChange(cdnUrl);
      onUploadComplete?.(cdnUrl);

    } catch (error: any) {
      setErrorMessage(error.message || "Failed to start upload");
      setUploadState("error");
      onUploadError?.(error.message);
    }
  }, [courseId, onChange, onUploadStart, onUploadComplete, onUploadError]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const cancelUpload = () => {
    if (xhrRef.current) xhrRef.current.abort();
    setUploadState("idle");
    setProgress(0);
    setFileName("");
    setFileSize("");
    onChange(undefined);
  };

  const resetUploader = () => {
    cancelUpload();
    setErrorMessage("");
  };

  if (uploadState === "success" && value) {
    return (
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">تم رفع الملف بنجاح</p>
            {fileName && <p className="text-xs text-muted-foreground truncate">{fileName} ({fileSize})</p>}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={resetUploader}>
            <RefreshCw className="w-4 h-4 mr-1" /> تغيير الملف
          </Button>
        </div>
      </Card>
    );
  }

  if (uploadState === "uploading" || uploadState === "requesting") {
    return (
      <Card className="p-4 border-primary/20">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <FileText className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">جاري الرفع...</p>
              <p className="text-xs text-muted-foreground truncate">{fileName}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={cancelUpload}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{progress}%</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[160px] ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="p-4 rounded-full bg-primary/5 mb-3">
          <Upload className="w-8 h-8 text-primary/70" />
        </div>
        <p className="font-medium text-base mb-1">اسحب الملف هنا أو انقر للاختيار</p>
        <p className="text-sm text-muted-foreground">صيغ مدعومة: PDF, Word, PowerPoint (الحد الأقصى 1GB)</p>
      </div>
      {errorMessage && (
        <p className="text-sm text-destructive font-medium mt-2">{errorMessage}</p>
      )}
    </div>
  );
}