import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Upload, X, CheckCircle, AlertCircle, Video, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface VideoUploaderProps {
  value?: string;
  onChange: (streamUid: string | undefined) => void;
  onUploadStart?: () => void;
  onUploadComplete?: (uid: string) => void;
  onUploadError?: (error: string) => void;
}

type UploadState = "idle" | "requesting" | "uploading" | "success" | "error";

export function VideoUploader({
  value,
  onChange,
  onUploadStart,
  onUploadComplete,
  onUploadError,
}: VideoUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>(value ? "success" : "idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/")) {
      setErrorMessage("Please select a video file");
      setUploadState("error");
      return;
    }

    // Check file size (200MB limit for basic uploads)
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMessage("File too large. Maximum size is 200MB.");
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
      const response = await apiRequest("POST", "/api/stream/create-upload");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error("Please log in to upload videos");
        } else if (response.status === 403) {
          throw new Error(errorData.message || "You don't have permission to upload videos");
        } else if (response.status === 500) {
          throw new Error(errorData.message || "Server error - video service may be unavailable");
        }
        throw new Error(errorData.message || `Request failed (${response.status})`);
      }
      
      const data = await response.json();

      if (!data.uploadURL || !data.uid) {
        throw new Error("Invalid response from video service");
      }
      
      setUploadState("uploading");

      abortControllerRef.current = new AbortController();

      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          setProgress(percentage);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadState("success");
          setProgress(100);
          onChange(data.uid);
          onUploadComplete?.(data.uid);
        } else {
          let errorMsg = `Upload failed (${xhr.status})`;
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.errors && response.errors.length > 0) {
              errorMsg = response.errors[0].message || errorMsg;
            } else if (response.message) {
              errorMsg = response.message;
            }
          } catch {
            if (xhr.status === 413) {
              errorMsg = "File too large. Maximum size is 200MB for basic uploads.";
            }
          }
          setErrorMessage(errorMsg);
          setUploadState("error");
          onUploadError?.(errorMsg);
        }
      };

      xhr.onerror = () => {
        const errorMsg = "Network error during upload";
        setErrorMessage(errorMsg);
        setUploadState("error");
        onUploadError?.(errorMsg);
      };

      xhr.onabort = () => {
        setUploadState("idle");
        setProgress(0);
      };

      xhr.open("POST", data.uploadURL);
      
      const formData = new FormData();
      formData.append("file", file);
      
      xhr.send(formData);

    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start upload";
      setErrorMessage(message);
      setUploadState("error");
      onUploadError?.(message);
    }
  }, [onChange, onUploadStart, onUploadComplete, onUploadError]);

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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
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
            <p className="text-xs text-muted-foreground mt-1">Stream ID: {value}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetUploader}
            data-testid="button-replace-video"
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
            <p className="font-medium text-sm">Requesting upload URL...</p>
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
              <p className="font-medium text-sm">Uploading...</p>
              <p className="text-xs text-muted-foreground truncate">{fileName} ({fileSize})</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={cancelUpload}
              data-testid="button-cancel-upload"
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
            data-testid="button-retry-upload"
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
      data-testid="dropzone-video"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-video-file"
      />
      <div className="flex flex-col items-center gap-2">
        <div className="p-3 rounded-full bg-muted">
          <Upload className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">Drop your video here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM, or other video formats</p>
        </div>
      </div>
    </div>
  );
}
