import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, FileText, Link as LinkIcon, File, Lock, Play, Clock, FolderOpen } from "lucide-react";
import type { Lesson } from "@shared/schema";

interface LessonListProps {
  lessons: any[]; // any to avoid strict type errors
  courseId: number;
  isEnrolled: boolean;
  isCourseLocked?: boolean;
  teacherEmail?: string;
  userPackages?: string[]; 
  isAdmin?: boolean;
}

export function LessonList({ 
  lessons, 
  courseId, 
  isEnrolled, 
  isCourseLocked = false, 
  teacherEmail,
  userPackages = [] ,
  isAdmin = false,
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

  if (!lessons || lessons.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center"><FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-medium text-lg mb-2">لا يوجد محتوى بعد</h3></CardContent></Card>
    );
  }

  // تجميع الدروس حسب البكج
  const groupedLessons = lessons.reduce((acc: Record<string, any[]>, lesson: any) => {
    const pkg = lesson.packageType || "all";
    if (!acc[pkg]) acc[pkg] = [];
    acc[pkg].push(lesson);
    return acc;
  }, {});

  const packageNames: Record<string, string> = {
    first: "مادة الفيرست",
    second: "مادة السكند",
    mid: "مادة الميد",
    final: "مادة الفاينل",
    all: "مادة شاملة / أخرى"
  };

  // ترتيب الأقسام
  const sortOrder = ["first", "second", "mid", "final", "all"];
  const sortedKeys = Object.keys(groupedLessons).sort((a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b));

  return (
    <div className="space-y-6">
      {sortedKeys.map((pkg) => {
        // التحقق من الصلاحية (معاه البكج الشامل، أو هاد البكج تحديداً)
        const hasAccess = isAdmin || (isEnrolled && !isCourseLocked && (userPackages.includes("all") || userPackages.includes(pkg)));

        

        return (
          <div key={pkg} className="border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="bg-primary/5 p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
                <FolderOpen className="w-5 h-5" /> {packageNames[pkg] || pkg.toUpperCase()}
              </h3>
              <Badge variant="secondary">{groupedLessons[pkg].length} دروس</Badge>
            </div>
            
            <div className="p-3 space-y-2">
              {groupedLessons[pkg].sort((a, b) => a.orderIndex - b.orderIndex).map((lesson, index) => (
                <Card key={lesson.id} className={`group border-0 shadow-none bg-transparent ${hasAccess ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-70'}`}>
                  {hasAccess ? (
                    <Link href={`/courses/${courseId}/lessons/${lesson.id}`}>
                      <CardContent className="p-3 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary border border-primary/20">{index + 1}</div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{lesson.title}</h4>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">{getContentTypeIcon(lesson.contentType)} {lesson.contentType}</span>
                            {lesson.duration > 0 && <span className="flex items-center gap-1 border-l pl-2 dark:border-slate-700"><Clock className="w-3 h-3" /> {formatLessonTime(lesson.duration)}</span>}
                          </div>
                        </div>
                        <Play className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CardContent>
                    </Link>
                  ) : (
  <CardContent className="p-3 flex items-center gap-4">
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border">
      <Lock className="w-4 h-4 text-muted-foreground" />
    </div>
    <div className="flex-1">
      <h4 className="font-medium text-sm text-muted-foreground">{lesson.title}</h4>
      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">{getContentTypeIcon(lesson.contentType)} {lesson.contentType}</span>
        {lesson.duration > 0 && (
          <span className="flex items-center gap-1 border-l pl-2 dark:border-slate-700">
            <Clock className="w-3 h-3" /> {formatLessonTime(lesson.duration)}
          </span>
        )}
      </div>
      <p className="text-[10px] text-destructive mt-1">You must subscribe to this section to view it🔒</p>
    </div>
  </CardContent>
)}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LockedContentMessage({ teacherEmail, teacherName }: { teacherEmail?: string; teacherName?: string }) {
  return (
    <Card className="border-dashed bg-muted/30">
      <CardContent className="py-12 text-center">
        <Lock className="w-10 h-10 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="font-semibold text-lg mb-2">محتوى مقفول</h3>
        <p className="text-sm text-muted-foreground mb-6">يجب الاشتراك في البكج المناسب لمشاهدة الدروس.</p>
        {teacherEmail && <Button asChild variant="outline"><a href={`mailto:${teacherEmail}`}>Contact Teacher</a></Button>}
      </CardContent>
    </Card>
  );
}