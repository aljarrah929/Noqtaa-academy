import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { FileText, Upload, Trash2, Loader2, Plus } from "lucide-react";
import type { CourseWithRelations } from "@shared/schema";

interface TeacherLibFile {
  id: number;
  title: string;
  description: string | null;
  price: number;
  fileSize: number;
  courseId: number;
  courseTitle: string | null;
  createdAt: string;
}

export default function TeacherLibrary() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [courseId, setCourseId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: courses } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/teacher/courses"],
  });

  const { data: files, isLoading } = useQuery<TeacherLibFile[]>({
    queryKey: ["/api/teacher/library"],
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("يرجى اختيار ملف");
      if (!title.trim()) throw new Error("يرجى إدخال عنوان");
      if (!courseId) throw new Error("يرجى اختيار الكورس المرتبط");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title);
      fd.append("description", description);
      fd.append("price", price);
      fd.append("courseId", courseId);
      const res = await fetch("/api/library/files", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "فشل رفع الملف");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/library"] });
      toast({ title: "تم الرفع", description: "تم إضافة الملف للمكتبة بنجاح." });
      setTitle(""); setDescription(""); setPrice("0"); setCourseId(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/library/files/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("فشل الحذف");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/library"] });
      toast({ title: "تم الحذف" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <DashboardLayout title="ملفات المكتبة">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* نموذج الرفع */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" /> رفع ملف جديد للمكتبة
            </CardTitle>
            <CardDescription>
              ارفع ملف PDF واربطه بكورس. سيكون مجانياً للمشتركين بالكورس، ومدفوعاً لغيرهم.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>عنوان الملف *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: ملزمة الوحدة الأولى" />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف مختصر للملف" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الكورس المرتبط *</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger><SelectValue placeholder="اختر الكورس" /></SelectTrigger>
                  <SelectContent>
                    {(courses || []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>السعر (JOD)</Label>
                <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>الملف (PDF/Word) *</Label>
              <Input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {file && <p className="text-xs text-muted-foreground">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
            </div>
            <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending} className="w-full">
              {uploadMutation.isPending
                ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الرفع...</>
                : <><Upload className="w-4 h-4 ml-2" /> رفع الملف</>}
            </Button>
          </CardContent>
        </Card>

        {/* قائمة الملفات */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> ملفاتي بالمكتبة
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : !files || files.length === 0 ? (
            <Card className="py-10 border-dashed">
              <CardContent className="text-center text-muted-foreground">
                لم ترفع أي ملفات بعد.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {files.map((f) => (
                <Card key={f.id}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{f.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {f.courseTitle ? `كورس: ${f.courseTitle}` : "—"} • {(f.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Badge variant="secondary">{f.price > 0 ? `${f.price} JOD` : "مجاناً"}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(f.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}