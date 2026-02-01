import { useState, useCallback, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, FileUp, ShieldAlert, BookOpen, Upload, CheckCircle2, X, File } from "lucide-react";
import type { CourseWithRelations } from "@shared/schema";

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx", "zip", "png", "jpg", "jpeg"];
const MAX_FILE_SIZE = 100 * 1024 * 1024;

type UploadState = "idle" | "uploading" | "success" | "error";

export default function UploadFile() {
  const [, params] = useRoute("/teacher/courses/:courseId/upload-file");
  const courseId = params?.courseId ? parseInt(params.courseId) : undefined;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const isUploadingRef = useRef(false);

  const [lessonTitle, setLessonTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const canUpload = user?.role === "instructor" || user?.role === "super_admin";

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithRelations>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: teacherCourses, isLoading: coursesLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/teacher/courses"],
    enabled: !courseId && canUpload,
  });

  const validateFile = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size exceeds 100MB limit";
    }
    return null;
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (isUploadingRef.current) {
      return;
    }

    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      setUploadState("error");
      return;
    }

    isUploadingRef.current = true;
    setSelectedFile(file);
    setUploadError("");
    setUploadState("uploading");
    setUploadProgress(0);

    try {
      const presignResponse = await apiRequest("POST", "/api/r2/presign", {
        fileName: file.name,
        contentType: file.type,
        courseId: courseId,
        fileSize: file.size,
      });

      if (!presignResponse.ok) {
        const errData = await presignResponse.json();
        throw new Error(errData.message || "Failed to get upload URL");
      }

      const { uploadUrl, fileUrl } = await presignResponse.json();

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload cancelled"));
        });

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setUploadedFileUrl(fileUrl);
      setUploadState("success");
      setUploadProgress(100);
      xhrRef.current = null;

      toast({
        title: "File Uploaded",
        description: "Your file has been uploaded successfully.",
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Upload failed");
      setUploadState("error");
      setUploadProgress(0);
      xhrRef.current = null;
    } finally {
      isUploadingRef.current = false;
    }
  }, [courseId, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const resetUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    isUploadingRef.current = false;
    setSelectedFile(null);
    setUploadState("idle");
    setUploadProgress(0);
    setUploadedFileUrl("");
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const createLessonMutation = useMutation({
    mutationFn: async () => {
      if (!courseId) {
        throw new Error("No course selected");
      }
      if (!uploadedFileUrl) {
        throw new Error("No file uploaded");
      }
      const response = await apiRequest("POST", `/api/courses/${courseId}/lessons`, {
        title: lessonTitle,
        contentType: "file",
        content: uploadedFileUrl,
        orderIndex: (course?.lessons?.length || 0),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/courses"] });
      toast({
        title: "Lesson Created",
        description: "Your file lesson has been saved successfully.",
      });
      navigate(`/teacher/courses/${courseId}/content`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lesson",
        variant: "destructive",
      });
    },
  });

  const canSave = !!courseId && lessonTitle.trim().length > 0 && uploadState === "success" && !!uploadedFileUrl;

  if (authLoading || (courseId && courseLoading)) {
    return (
      <DashboardLayout title="Add File">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!canUpload) {
    return (
      <DashboardLayout title="Access Denied">
        <div className="max-w-2xl mx-auto">
          <Card className="py-16">
            <CardContent className="text-center">
              <ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                Only teachers can upload file lessons.
              </p>
              <Button asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!courseId) {
    return (
      <DashboardLayout title="Add File">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" asChild className="mb-6" data-testid="button-back">
            <Link href="/teacher">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="w-5 h-5" />
                Add File Lesson
              </CardTitle>
              <CardDescription>
                Select a course to add a file lesson
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coursesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                </div>
              ) : teacherCourses && teacherCourses.length > 0 ? (
                <div className="space-y-3">
                  {teacherCourses.map((c) => (
                    <Link
                      key={c.id}
                      href={`/teacher/courses/${c.id}/upload-file`}
                      className="w-full p-4 text-left rounded-lg border hover-elevate active-elevate-2 flex items-center gap-3"
                      data-testid={`button-select-course-${c.id}`}
                    >
                      <BookOpen className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate">{c.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {c.lessons?.length || 0} lessons
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">
                    No courses available. Ask an admin to create a course for you.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/teacher">Back to Dashboard</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout title="Add File">
        <div className="max-w-2xl mx-auto">
          <Card className="py-16">
            <CardContent className="text-center">
              <FileUp className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The course you're looking for doesn't exist.
              </p>
              <Button asChild>
                <Link href="/teacher/courses">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to My Courses
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Add File Lesson">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" asChild className="mb-6" data-testid="button-back">
          <Link href="/teacher/courses">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Courses
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5" />
              Add File Lesson
            </CardTitle>
            <CardDescription>
              Upload a file to <strong>{course.title}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="lessonTitle">Lesson Title *</Label>
              <Input
                id="lessonTitle"
                placeholder="Enter lesson title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                data-testid="input-lesson-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Upload File *</Label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_EXTENSIONS.map(e => `.${e}`).join(",")}
                onChange={handleFileInputChange}
                className="hidden"
                data-testid="input-file-hidden"
              />

              {uploadState === "idle" && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors duration-200
                    ${isDragging 
                      ? "border-primary bg-primary/5" 
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                    }
                  `}
                  data-testid="dropzone"
                >
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium mb-1">
                    {isDragging ? "Drop your file here" : "Drag & drop your file here"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Allowed: {ALLOWED_EXTENSIONS.join(", ")} (max 100MB)
                  </p>
                </div>
              )}

              {uploadState === "uploading" && selectedFile && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <File className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={resetUpload}
                      data-testid="button-cancel-upload"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                </div>
              )}

              {uploadState === "success" && selectedFile && (
                <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-green-600">
                        Upload complete
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={resetUpload}
                      data-testid="button-remove-file"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {uploadState === "error" && (
                <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <X className="w-8 h-8 text-destructive flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">Upload Failed</p>
                      <p className="text-sm text-destructive">
                        {uploadError}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetUpload}
                      data-testid="button-retry"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                asChild
                data-testid="button-cancel"
              >
                <Link href="/teacher/courses">Cancel</Link>
              </Button>
              <Button
                onClick={() => createLessonMutation.mutate()}
                disabled={!canSave || createLessonMutation.isPending}
                data-testid="button-save-lesson"
              >
                {createLessonMutation.isPending ? "Saving..." : "Save Lesson"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
