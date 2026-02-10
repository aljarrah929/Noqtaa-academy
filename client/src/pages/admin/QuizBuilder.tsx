import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload,
  FileText,
  Sparkles,
  Trash2,
  Save,
  Check,
  X,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QuizQuestion, Course } from "@shared/schema";

interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export default function QuizBuilder() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id || "0");
  const { user } = useAuth();
  const { toast } = useToast();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: course } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: savedQuestions, isLoading: loadingSaved } = useQuery<QuizQuestion[]>({
    queryKey: [`/api/quiz-questions?courseId=${courseId}`],
    enabled: !!courseId,
  });

  const generateMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("pdfFile", file);
      const res = await fetch("/api/admin/generate-quiz-from-pdf", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate questions");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedQuestions(data.questions);
      toast({
        title: "Questions Generated",
        description: `${data.questions.length} questions were generated from the PDF.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (questions: GeneratedQuestion[]) => {
      const res = await apiRequest("POST", "/api/quiz-questions/bulk", {
        courseId,
        questions,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedQuestions([]);
      queryClient.invalidateQueries({ queryKey: [`/api/quiz-questions?courseId=${courseId}`] });
      toast({
        title: "Questions Saved",
        description: `${data.inserted} questions saved successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (questionId: number) => {
      await apiRequest("DELETE", `/api/quiz-questions/${questionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quiz-questions?courseId=${courseId}`] });
      toast({ title: "Question deleted" });
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const handleGenerate = () => {
    if (selectedFile) {
      generateMutation.mutate(selectedFile);
    }
  };

  const removeGeneratedQuestion = (index: number) => {
    setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateGeneratedQuestion = (index: number, updated: GeneratedQuestion) => {
    setGeneratedQuestions(prev => prev.map((q, i) => i === index ? updated : q));
    setEditingIndex(null);
  };

  const handleSaveAll = () => {
    if (generatedQuestions.length > 0) {
      saveMutation.mutate(generatedQuestions);
    }
  };

  const backLink = user?.role === "TEACHER" ? `/teacher/courses/${courseId}/content` : `/admin/courses/${courseId}/edit`;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={backLink}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate" data-testid="text-page-title">Quiz Builder</h1>
            {course && (
              <p className="text-sm text-muted-foreground truncate" data-testid="text-course-name">
                {course.title}
              </p>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Smart Import from PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`relative border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-pdf"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-pdf-file"
              />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">
                {selectedFile ? selectedFile.name : "Drop a PDF file here or click to browse"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedFile
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                  : "Supports text-based PDFs up to 20MB"}
              </p>
            </div>

            {selectedFile && (
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {selectedFile.name}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  data-testid="button-clear-file"
                >
                  <X className="h-3 w-3 mr-1" /> Clear
                </Button>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!selectedFile || generateMutation.isPending}
              className="w-full"
              data-testid="button-generate-quiz"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing PDF and generating questions...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Questions from PDF
                </>
              )}
            </Button>

            {generateMutation.isPending && (
              <p className="text-sm text-muted-foreground text-center">
                This may take 15-30 seconds depending on the document length.
              </p>
            )}
          </CardContent>
        </Card>

        {generatedQuestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-review-header">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Review Generated Questions ({generatedQuestions.length})
              </h2>
              <Button
                onClick={handleSaveAll}
                disabled={saveMutation.isPending}
                data-testid="button-save-all"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save All Questions
              </Button>
            </div>

            {generatedQuestions.map((q, index) => (
              <QuestionCard
                key={index}
                question={q}
                index={index}
                isEditing={editingIndex === index}
                onEdit={() => setEditingIndex(index)}
                onCancelEdit={() => setEditingIndex(null)}
                onUpdate={(updated) => updateGeneratedQuestion(index, updated)}
                onDelete={() => removeGeneratedQuestion(index)}
              />
            ))}
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold" data-testid="text-saved-header">
            Saved Questions {savedQuestions?.length ? `(${savedQuestions.length})` : ""}
          </h2>

          {loadingSaved ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : savedQuestions && savedQuestions.length > 0 ? (
            savedQuestions.map((q) => (
              <Card key={q.id} data-testid={`card-saved-question-${q.id}`}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium flex-1" data-testid={`text-question-${q.id}`}>{q.question}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(q.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-saved-${q.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, i) => (
                      <div
                        key={i}
                        className={`text-sm px-3 py-2 rounded-md border ${
                          opt === q.correctAnswer
                            ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                            : "border-border"
                        }`}
                      >
                        {opt === q.correctAnswer && <Check className="h-3 w-3 inline mr-1" />}
                        {opt}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No saved questions yet. Use Smart Import above to generate questions from a PDF.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function QuestionCard({
  question,
  index,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: {
  question: GeneratedQuestion;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (q: GeneratedQuestion) => void;
  onDelete: () => void;
}) {
  const [editData, setEditData] = useState<GeneratedQuestion>(question);

  const handleStartEdit = () => {
    setEditData({ ...question });
    onEdit();
  };

  const handleSave = () => {
    if (editData.question.trim() && editData.options.every(o => o.trim()) && editData.correctAnswer.trim()) {
      onUpdate(editData);
    }
  };

  if (isEditing) {
    return (
      <Card data-testid={`card-edit-question-${index}`}>
        <CardContent className="pt-4 space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Question</label>
            <Textarea
              value={editData.question}
              onChange={(e) => setEditData(prev => ({ ...prev, question: e.target.value }))}
              className="resize-none"
              data-testid={`input-edit-question-${index}`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {editData.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...editData.options];
                    newOpts[i] = e.target.value;
                    setEditData(prev => ({ ...prev, options: newOpts }));
                  }}
                  data-testid={`input-edit-option-${index}-${i}`}
                />
                <Button
                  variant={editData.correctAnswer === opt ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditData(prev => ({ ...prev, correctAnswer: opt }))}
                  title="Mark as correct answer"
                  data-testid={`button-mark-correct-${index}-${i}`}
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Explanation</label>
            <Input
              value={editData.explanation || ""}
              onChange={(e) => setEditData(prev => ({ ...prev, explanation: e.target.value }))}
              data-testid={`input-edit-explanation-${index}`}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancelEdit} data-testid={`button-cancel-edit-${index}`}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} data-testid={`button-save-edit-${index}`}>
              <Check className="h-3 w-3 mr-1" /> Apply
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={`card-generated-question-${index}`}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1">
            <Badge variant="secondary" className="mt-0.5 shrink-0">Q{index + 1}</Badge>
            <p className="font-medium" data-testid={`text-generated-question-${index}`}>{question.question}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={handleStartEdit} data-testid={`button-edit-${index}`}>
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-${index}`}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {question.options.map((opt, i) => (
            <div
              key={i}
              className={`text-sm px-3 py-2 rounded-md border ${
                opt === question.correctAnswer
                  ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                  : "border-border"
              }`}
            >
              {opt === question.correctAnswer && <Check className="h-3 w-3 inline mr-1" />}
              {opt}
            </div>
          ))}
        </div>
        {question.explanation && (
          <p className="text-sm text-muted-foreground">
            <strong>Explanation:</strong> {question.explanation}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
