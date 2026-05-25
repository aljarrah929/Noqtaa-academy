import { useState, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Video as VideoIcon } from "lucide-react";
import { B2VideoUploader } from "@/components/B2VideoUploader";

const uploadVideoSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  content: z.string().min(1, "Video is required"),
  duration: z.number().min(0).default(0),
  packageType: z.string().default("all"), // 🔥 ضفنا البكج هون
});

type UploadVideoValues = z.infer<typeof uploadVideoSchema>;

export default function UploadVideo() {
  const [, params] = useRoute("/teacher/courses/:courseId/upload-video");
  const courseId = parseInt(params?.courseId || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const extractedDurationRef = useRef<number>(0);
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);

  const form = useForm<UploadVideoValues>({
    resolver: zodResolver(uploadVideoSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      duration: 0,
      packageType: "all", // 🔥 القيمة الافتراضية
    },
  });

  const { data: course } = useQuery({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: UploadVideoValues) => {
  // استخدم المدة المستخرجة أو الحقول اليدوية
  const manualSeconds = (hours * 3600) + (minutes * 60) + seconds;
  const totalSeconds = manualSeconds > 0 ? manualSeconds : extractedDurationRef.current;
  
  const res = await apiRequest("POST", `/api/courses/${courseId}/lessons`, {
    title: data.title,
    contentType: "video",
    content: data.content,
    duration: totalSeconds,
    packageType: data.packageType,
  });
  return res.json();
},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      toast({ title: "تم الرفع بنجاح", description: "تمت إضافة الفيديو للكورس." });
      setLocation(`/teacher/courses/${courseId}/content`);
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  return (
    <DashboardLayout title="Upload Video Lesson">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href={`/teacher/courses/${courseId}/content`}>
          <Button variant="ghost" className="mb-2"><ArrowLeft className="w-4 h-4 mr-2" /> Back to My Courses</Button>
        </Link>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <VideoIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Upload Video Lesson</h2>
                <p className="text-sm text-muted-foreground">Add a new video lesson to <span className="font-semibold text-foreground">{(course as any)?.title}</span></p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => createLessonMutation.mutate(d))} className="space-y-5">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Lesson Title *</FormLabel><FormControl><Input placeholder="Enter lesson title" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                {/* 🔥 قائمة اختيار البكج */}
                <FormField control={form.control} name="packageType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>القسم التابع له هذا الفيديو *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="all">المادة كاملة (All)</SelectItem>
                        <SelectItem value="first">مادة الفيرست (First)</SelectItem>
                        <SelectItem value="second">مادة السكند (Second)</SelectItem>
                        <SelectItem value="mid">مادة الميد (Mid)</SelectItem>
                        <SelectItem value="final">مادة الفاينل (Final)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description (optional)</FormLabel><FormControl><Textarea placeholder="Enter lesson description" className="min-h-24" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="space-y-2">
                  <FormLabel>* مدة الفيديو (ساعات : دقائق : ثواني)</FormLabel>
                  <div className="flex gap-2 items-center text-muted-foreground" dir="ltr">
                    <Input type="number" min="0" value={hours || ""} onChange={e => setHours(Number(e.target.value))} placeholder="ساعات" className="text-center" /> :
                    <Input type="number" min="0" max="59" value={minutes || ""} onChange={e => setMinutes(Number(e.target.value))} placeholder="دقائق" className="text-center" /> :
                    <Input type="number" min="0" max="59" value={seconds || ""} onChange={e => setSeconds(Number(e.target.value))} placeholder="ثواني" className="text-center" />
                  </div>
                </div>

                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video File *</FormLabel>
                    <FormControl>
                     <B2VideoUploader 
  courseId={courseId} 
  value={field.value} 
  onChange={field.onChange}
  onDurationExtracted={(totalSeconds) => {
    extractedDurationRef.current = totalSeconds;
    // حدّث الحقول اليدوية عشان تظهر للمعلم
    setHours(Math.floor(totalSeconds / 3600));
    setMinutes(Math.floor((totalSeconds % 3600) / 60));
    setSeconds(totalSeconds % 60);
  }}
/>
هيك لما المعلم يرفع الفيديو، المدة بتنسحب تلقائياً وبتنحفظ بالـ form وبتظهر بالحقول اليدوية.
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-end gap-3 pt-4">
                  <Link href={`/teacher/courses/${courseId}/content`}><Button type="button" variant="outline">Cancel</Button></Link>
                  <Button type="submit" disabled={createLessonMutation.isPending || !form.watch("content")}>
                    {createLessonMutation.isPending ? "Saving..." : "Save Lesson"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}