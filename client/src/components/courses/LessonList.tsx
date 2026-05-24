import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Video, 
  FileText, 
  Link as LinkIcon, 
  File, 
  Lock, 
  Play,
  Clock 
} from "lucide-react";
import type { Lesson } from "@shared/schema";

interface LessonListProps {
  lessons: Lesson[];
  courseId: number;
  isEnrolled: boolean;
  isCourseLocked?: boolean;
  teacherEmail?: string;
  userPackages?: string[]; // التعديل: إضافة البكجات التي يملكها الطالب
}

export function LessonList({ 
  lessons, 
  courseId, 
  isEnrolled, 
  isCourseLocked = false, 
  teacherEmail,
  userPackages = [] // الافتراضي مصفوفة فارغة
}: LessonListProps) {

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case "video": return <Video className="w-4 h-4" />;
      case "text": return <FileText className="w-4 h-4" />;
      case "link": return <LinkIcon className="w-4 h-4" />;
      case "file": return <File className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatLessonTime = (totalSeconds: number) => {
    if (!totalSeconds) return "0:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
  };

  // 1. تجميع الدروس حسب البكج
  const groupedLessons = lessons.reduce((acc: Record<string, Lesson[]>, lesson: any) => {
    const pkg = (lesson.packageType as string) || "all";
    if (!acc[pkg]) acc[pkg] = [];
    acc[pkg].push(lesson);
    return acc;
  }, {});

  const packageNames: Record<string, string> = {
    first: "مادة الفيرست (First)",
    second: "مادة السكند (Second)",
    mid: "مادة الميد (Mid)",
    final: "مادة الفاينل (Final)",
    all: "المادة كاملة"
  };

  const sortedKeys = Object.keys(groupedLessons).sort();

  return (
    <div className="space-y-6">
      {sortedKeys.map((pkg) => (
        <div key={pkg} className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {packageNames[pkg] || pkg.toUpperCase()}
          </h3>
          
          {groupedLessons[pkg].sort((a, b) => a.orderIndex - b.orderIndex).map((lesson, index) => {
            // 2. التحقق من الصلاحية: هل الطالب مشترك بالبكج أو بالمادة كاملة (all)؟
            const hasAccess = isEnrolled && !isCourseLocked && (userPackages.includes("all") || userPackages.includes(pkg));
            
            return (
              <Card key={lesson.id} className={`group ${hasAccess ? 'hover-elevate cursor-pointer' : 'opacity-80'}`}>
                {hasAccess ? (
                  <Link href={`/courses/${courseId}/lessons/${lesson.id}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">{index + 1}</div>
                      <div className="flex-1">
                        <h4 className="font-medium">{lesson.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">{getContentTypeIcon(lesson.contentType)} {lesson.contentType}</span>
                          {lesson.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatLessonTime(lesson.duration)}</span>}
                        </div>
                      </div>
                      <Play className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </CardContent>
                  </Link>
                ) : (
                  <CardContent className="p-4 flex items-center gap-4 bg-muted/10">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><Lock className="w-4 h-4 text-muted-foreground" /></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-muted-foreground">{lesson.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">يجب شراء هذا القسم للوصول للدروس</p>
                    </div>
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function LockedContentMessage({ teacherEmail, teacherName }: { teacherEmail?: string; teacherName?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <Lock className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold text-xl mb-2">Content Locked</h3>
        <p className="text-muted-foreground mb-6">يجب الاشتراك في البكج المناسب لمشاهدة المحتوى.</p>
        {teacherEmail && (
          <Button asChild><a href={`mailto:${teacherEmail}`}>Contact Teacher</a></Button>
        )}
      </CardContent>
    </Card>
  );
}