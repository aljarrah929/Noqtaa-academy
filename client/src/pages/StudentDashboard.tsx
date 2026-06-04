import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CourseCard, CourseCardSkeleton } from "@/components/courses/CourseCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, FileText } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithRelations } from "@shared/schema";

export default function StudentDashboard() {
  // هاد الراوت بيجيب كل اشتراكات الطالب (كورسات وملفات pdf)
  const { data: enrolledItems, isLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/enrollments/my-courses"],
  });

  // 🔥 الذكاء هون: فصلناهم لمصفوفتين بناءً على الفورمات اللي ضفناه بالداتابيز
  const videoCourses = enrolledItems?.filter(item => item.format !== "pdf") || [];
  const pdfFiles = enrolledItems?.filter(item => item.format === "pdf") || [];

  return (
    <DashboardLayout title="لوحة التحكم | دوراتي وملفاتي">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* ================= قسم الكورسات (الفيديو) ================= */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              الكورسات المسجل بها ({videoCourses.length})
            </h2>
            <Button variant="outline" asChild>
              <Link href="/courses">
                تصفح الكورسات
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)}
            </div>
          ) : videoCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  actionHref={`/courses/${course.id}`}
                  actionLabel="متابعة التعلم"
                />
              ))}
            </div>
          ) : (
            <Card className="py-12 border-dashed bg-muted/30">
              <CardContent className="text-center">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="font-semibold text-lg mb-2">لا يوجد كورسات</h3>
                <p className="text-muted-foreground text-sm">لم تقم بالاشتراك في أي كورس بعد.</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ================= قسم ملفات الـ PDF ================= */}
        <section className="pt-8 border-t">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              الملازم وملفات PDF ({pdfFiles.length})
            </h2>
            <Button variant="outline" asChild>
              <Link href="/library">
                تصفح المكتبة
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2].map((i) => <CourseCardSkeleton key={i} />)}
            </div>
          ) : pdfFiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pdfFiles.map((file) => (
                <CourseCard
                  key={file.id}
                  course={file}
                  actionHref={`/courses/${file.id}`}
                  actionLabel="تصفح الملف"
                />
              ))}
            </div>
          ) : (
            <Card className="py-12 border-dashed bg-muted/30">
              <CardContent className="text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="font-semibold text-lg mb-2">لا يوجد ملفات</h3>
                <p className="text-muted-foreground text-sm">لم تقم بالاشتراك في أي ملزمة أو ملف PDF.</p>
              </CardContent>
            </Card>
          )}
        </section>

      </div>
    </DashboardLayout>
  );
}