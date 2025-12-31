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
  ChevronRight,
  Play
} from "lucide-react";
import type { Lesson } from "@shared/schema";

interface LessonListProps {
  lessons: Lesson[];
  courseId: number;
  isEnrolled: boolean;
  isCourseLocked?: boolean;
  teacherEmail?: string;
}

export function LessonList({ lessons, courseId, isEnrolled, isCourseLocked = false, teacherEmail }: LessonListProps) {
  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case "video":
        return <Video className="w-5 h-5" />;
      case "text":
        return <FileText className="w-5 h-5" />;
      case "link":
        return <LinkIcon className="w-5 h-5" />;
      case "file":
        return <File className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getContentTypeLabel = (contentType: string) => {
    return contentType.charAt(0).toUpperCase() + contentType.slice(1);
  };

  const sortedLessons = [...lessons].sort((a, b) => a.orderIndex - b.orderIndex);

  if (lessons.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">No lessons yet</h3>
          <p className="text-muted-foreground">
            This course doesn't have any lessons yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine if content should be accessible
  const canAccessContent = isEnrolled && !isCourseLocked;

  return (
    <div className="space-y-2">
      {sortedLessons.map((lesson, index) => (
        <Card 
          key={lesson.id} 
          className={`group ${canAccessContent ? 'hover-elevate cursor-pointer' : ''}`}
          data-testid={`card-lesson-${lesson.id}`}
        >
          {canAccessContent ? (
            <Link href={`/courses/${courseId}/lessons/${lesson.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">{index + 1}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate" data-testid={`text-lesson-title-${lesson.id}`}>
                        {lesson.title}
                      </h4>
                      <Badge variant="outline" className="flex-shrink-0">
                        {getContentTypeIcon(lesson.contentType)}
                        <span className="ml-1 text-xs">{getContentTypeLabel(lesson.contentType)}</span>
                      </Badge>
                    </div>
                  </div>

                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Link>
          ) : (
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate text-muted-foreground" data-testid={`text-lesson-title-${lesson.id}`}>
                      {lesson.title}
                    </h4>
                    <Badge variant="outline" className="flex-shrink-0 opacity-50">
                      {getContentTypeIcon(lesson.contentType)}
                      <span className="ml-1 text-xs">{getContentTypeLabel(lesson.contentType)}</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isEnrolled && isCourseLocked ? "Course locked by instructor" : "Content locked"}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

export function LockedContentMessage({ teacherEmail, teacherName }: { teacherEmail?: string; teacherName?: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-xl mb-2">Content Locked</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          You must be enrolled in this course to view lesson content. Contact the teacher to request enrollment.
        </p>
        {teacherEmail && (
          <Button asChild data-testid="button-contact-teacher">
            <a 
              href={`mailto:${teacherEmail}?subject=Enrollment Request&body=Hello${teacherName ? ` ${teacherName}` : ''},%0D%0A%0D%0AI would like to request enrollment in your course.%0D%0A%0D%0AThank you.`}
            >
              Contact Teacher
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
