import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Upload, X, CheckCircle, AlertCircle, Video, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface B2VideoUploaderProps {
  courseId: number;
  value?: string;
  onChange: (cdnUrl: string | undefined) => void;
  onUploadStart?: () => void;
  onUploadComplete?: (cdnUrl: string) => void;
  onUploadError?: (error: string) => void;
}

type UploadState = "idle" | "requesting" | "uploading" | "success" | "error";

export function B2VideoUploader({
  courseId,
  value,
  onChange,
  onUploadStart,
  onUploadComplete,
  onUploadError,
}: B2VideoUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>(value ? "success" : "idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"direct" | "proxy">("direct");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const log = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[B2Upload ${timestamp}] ${message}`, data || "");
  };

  const uploadViaProxy = async (file: File): Promise<string> => {
    log("Starting proxy upload", { fileName: file.name, size: file.size, type: file.type });
    setUploadMethod("proxy");

    const formData = new FormData();
    formData.append("video", file);
    formData.append("courseId", String(courseId));

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setProgress(percentage);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            log("Proxy upload success", { cdnUrl: response.cdnUrl });
            resolve(response.cdnUrl);
          } catch (e) {
            log("Proxy upload response parse error", { responseText: xhr.responseText });
            reject(new Error("Invalid response from server"));
          }
        } else {
          let errorMsg = `Proxy upload failed (${xhr.status})`;
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.message) errorMsg = response.message;
          } catch {}
          log("Proxy upload error", { status: xhr.status, errorMsg });
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        log("Proxy upload network error");
        reject(new Error("Network error during proxy upload"));
      };

      xhr.onabort = () => {
        reject(new Error("Upload cancelled"));
      };

      xhr.open("POST", "/api/b2/video/upload");
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  };

  const uploadDirect = async (file: File, uploadUrl: string, cdnUrl: string): Promise<string> => {
    const urlHost = new URL(uploadUrl).host;
    log("Starting direct upload", {
      host: urlHost,
      fileSize: file.size,
      fileType: file.type || "application/octet-stream",
    });
    setUploadMethod("direct");

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setProgress(percentage);
        }
      };

      xhr.onload = () => {
        log("Direct upload response", {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText?.substring(0, 500),
        });

        if (xhr.status >= 200 && xhr.status < 300) {
          log("Direct upload success", { cdnUrl });
          resolve(cdnUrl);
        } else {
          const errorMsg = `Direct upload failed: ${xhr.status} ${xhr.statusText}`;
          log("Direct upload failed", { status: xhr.status, responseText: xhr.responseText });
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        log("Direct upload network error (likely CORS)", {
          readyState: xhr.readyState,
          status: xhr.status,
        });
        reject(new Error("CORS_OR_NETWORK_ERROR"));
      };

      xhr.onabort = () => {
        reject(new Error("Upload cancelled"));
      };

      xhr.open("PUT", uploadUrl);
      const contentType = file.type || "application/octet-stream";
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.send(file);
    });
  };

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/")) {
      setErrorMessage("Please select a video file");
      setUploadState("error");
      return;
    }

    const maxSize = 1024 * 1024 * 1024;
    if (file.size > maxSize) {
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

    log("Upload started", {
      fileName: file.name,
      size: file.size,
      type: file.type,
      courseId,
    });

    try {
      log("Requesting presigned URL...");
      const response = await apiRequest("POST", "/api/b2/video/presign", {
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        courseId,
        fileSize: file.size,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        log("Presign request failed", { status: response.status, errorData });
        if (response.status === 401) {
          throw new Error("Please log in to upload videos");
        } else if (response.status === 403) {
          throw new Error(errorData.message || "You don't have permission to upload videos");
        } else if (response.status === 503) {
          throw new Error(errorData.message || "Video storage not configured");
        }
        throw new Error(errorData.message || `Request failed (${response.status})`);
      }

      const data = await response.json();
      log("Presign response received", {
        hasUploadUrl: !!data.uploadUrl,
        hasCdnUrl: !!data.cdnUrl,
        hasObjectKey: !!data.objectKey,
        cdnUrl: data.cdnUrl,
        objectKey: data.objectKey,
      });

      if (!data.uploadUrl || !data.cdnUrl || !data.objectKey) {
        throw new Error("Invalid response from video service");
      }

      setUploadState("uploading");

      let cdnUrl: string;
      let useDirectUpload = true;
      
      try {
        cdnUrl = await uploadDirect(file, data.uploadUrl, data.cdnUrl);
        log("Direct upload completed, verifying...");
        
        // VERIFY the upload succeeded by checking if object exists in B2
        const verifyResponse = await apiRequest("POST", "/api/b2/video/verify", {
          objectKey: data.objectKey,
          cdnUrl: data.cdnUrl,
        });
        
        if (!verifyResponse.ok) {
          const verifyError = await verifyResponse.json().catch(() => ({}));
          log("Direct upload verification FAILED", { status: verifyResponse.status, error: verifyError });
          throw new Error(verifyError.message || "Upload verification failed - file not found in storage");
        }
        
        const verifyResult = await verifyResponse.json();
        log("Direct upload verified successfully", verifyResult);
        
        if (!verifyResult.verified) {
          throw new Error("Upload verification failed - file not stored correctly");
        }
        
      } catch (directError: any) {
        if (directError.message === "CORS_OR_NETWORK_ERROR" || directError.message.includes("CORS")) {
          log("Direct upload failed (CORS), falling back to proxy upload");
          setProgress(0);
          useDirectUpload = false;
          cdnUrl = await uploadViaProxy(file);
        } else if (directError.message === "Upload cancelled") {
          setUploadState("idle");
          setProgress(0);
          return;
        } else if (directError.message.includes("verification failed") || directError.message.includes("not found")) {
          // Direct upload succeeded but verification failed - try proxy as fallback
          log("Direct upload verification failed, falling back to proxy upload");
          setProgress(0);
          useDirectUpload = false;
          cdnUrl = await uploadViaProxy(file);
        } else {
          throw directError;
        }
      }

      log("Upload complete", { cdnUrl, method: useDirectUpload ? "direct" : "proxy" });
      setUploadState("success");
      setProgress(100);
      onChange(cdnUrl);
      onUploadComplete?.(cdnUrl);

    } catch (error: any) {
      log("Upload error", { name: error?.name, message: error?.message });
      const message = error instanceof Error ? error.message : "Failed to start upload";
      setErrorMessage(message);
      setUploadState("error");
      onUploadError?.(message);
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
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
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

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  if (uploadState === "success" && value) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Video uploaded successfully</p>
            {fileName && <p className="text-xs text-muted-foreground truncate">{fileName} ({fileSize})</p>}
            <p className="text-xs text-muted-foreground mt-1 truncate">CDN URL ready</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetUploader}
            data-testid="button-replace-b2-video"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Replace
          </Button>
        </div>
      </Card>
    );
  }

  if (uploadState === "requesting") {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <RefreshCw className="w-5 h-5 text-primary animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Preparing upload...</p>
            <p className="text-xs text-muted-foreground">{fileName} ({fileSize})</p>
          </div>
        </div>
      </Card>
    );
  }

  if (uploadState === "uploading") {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Video className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                Uploading to CDN{uploadMethod === "proxy" ? " (via server)" : ""}...
              </p>
              <p className="text-xs text-muted-foreground truncate">{fileName} ({fileSize})</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={cancelUpload}
              data-testid="button-cancel-b2-upload"
            >
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

  if (uploadState === "error") {
    return (
      <Card className="p-4 border-destructive/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-destructive/10">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-destructive">Upload failed</p>
            <p className="text-xs text-muted-foreground">{errorMessage}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetUploader}
            data-testid="button-retry-b2-upload"
          >
            Try again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      }`}
      onClick={openFilePicker}
      data-testid="dropzone-b2-video"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-b2-video-file"
      />
      <div className="flex flex-col items-center gap-2">
        <div className="p-3 rounded-full bg-muted">
          <Upload className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">Drop your video here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM (max 1GB) - Served via CDN</p>
        </div>
      </div>
    </div>
  );
}
