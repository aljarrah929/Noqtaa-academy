import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { LockedContentMessage } from "@/components/courses/LessonList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Video, 
  FileText, 
  Link as LinkIcon, 
  File, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock
} from "lucide-react";
import type { Lesson, CourseWithRelations } from "@shared/schema";

interface LessonWithAccess extends Lesson {
  locked?: boolean;
}

export default function LessonDetail() {
  const [match, params] = useRoute("/courses/:courseId/lessons/:lessonId");
  const courseId = params?.courseId;
  const lessonId = params?.lessonId;
  const { user, isAuthenticated } = useAuth();

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithRelations>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: lesson, isLoading: lessonLoading } = useQuery<LessonWithAccess>({
    queryKey: ["/api/lessons", lessonId],
    enabled: !!lessonId,
  });

  const { data: enrollmentCheck, isLoading: enrollmentLoading } = useQuery<{ enrolled: boolean }>({
    queryKey: ["/api/enrollments/check", courseId],
    enabled: !!courseId && isAuthenticated,
  });

  const isEnrolled = enrollmentCheck?.enrolled ?? false;
  const isContentLocked = lesson?.locked === true;
  const isCourseLocked = course?.isLocked === true;
  const isLoading = courseLoading || lessonLoading || enrollmentLoading;

  const sortedLessons = course?.lessons?.sort((a, b) => a.orderIndex - b.orderIndex) || [];
  const currentIndex = sortedLessons.findIndex(l => l.id === Number(lessonId));
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null;

  const getContentTypeIcon = (contentType?: string) => {
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

  const renderContent = () => {
    if (!lesson?.content) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No content available for this lesson.
        </div>
      );
    }

    switch (lesson.contentType) {
      case "video":
        // Check if it's a Cloudflare Stream UID (32-character hex string)
        const isCloudflareStreamUid = /^[a-f0-9]{32}$/i.test(lesson.content);
        if (isCloudflareStreamUid) {
          return (
            <div className="aspect-video rounded-lg overflow-hidden bg-black" data-testid="video-player-cloudflare">
              <iframe
                src={`https://iframe.videodelivery.net/${lesson.content}`}
                className="w-full h-full"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title={lesson.title}
              />
            </div>
          );
        }
        
        if (lesson.content.includes("youtube.com") || lesson.content.includes("youtu.be")) {
          const videoId = lesson.content.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
          return (
            <div className="aspect-video rounded-lg overflow-hidden bg-black" data-testid="video-player-youtube">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                allowFullScreen
                title={lesson.title}
              />
            </div>
          );
        }
        return (
          <div className="aspect-video rounded-lg overflow-hidden bg-black" data-testid="video-player-native">
            <video controls className="w-full h-full" src={lesson.content}>
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case "text":
        return (
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap">{lesson.content}</div>
          </div>
        );

      case "link":
        return (
          <div className="text-center py-12">
            <LinkIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">External Resource</h3>
            <p className="text-muted-foreground mb-6">
              This lesson links to an external resource.
            </p>
            <Button asChild>
              <a href={lesson.content} target="_blank" rel="noopener noreferrer">
                Open Link
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        );

      case "file":
        return (
          <div className="text-center py-12">
            <File className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Downloadable File</h3>
            <p className="text-muted-foreground mb-6">
              Download the lesson materials below.
            </p>
            <Button asChild>
              <a href={lesson.content} download>
                Download File
              </a>
            </Button>
          </div>
        );

      default:
        return (
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {lesson.content}
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!course || !lesson) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="py-16">
            <CardContent className="text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Lesson Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The lesson you're looking for doesn't exist.
              </p>
              <Button asChild>
                <Link href="/courses">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Courses
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isEnrolled || isContentLocked) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href={`/courses/${courseId}`}>
            <Button variant="ghost" className="mb-6" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Course
            </Button>
          </Link>
          <LockedContentMessage 
            teacherEmail={course.teacher?.email || undefined}
            teacherName={course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : undefined}
          />
        </div>
      </div>
    );
  }

  if (isEnrolled && isCourseLocked) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href={`/courses/${courseId}`}>
            <Button variant="ghost" className="mb-6" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Course
            </Button>
          </Link>
          <Card className="border-dashed bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold text-xl mb-2 text-amber-800 dark:text-amber-300">Course Locked by Instructor</h3>
              <p className="text-amber-700 dark:text-amber-400 mb-6 max-w-md mx-auto">
                The instructor has temporarily locked access to this course's content. Please check back later or contact the instructor for more information.
              </p>
              {course.teacher?.email && (
                <Button asChild data-testid="button-contact-teacher">
                  <a href={`mailto:${course.teacher.email}?subject=Question about ${course.title}`}>
                    Contact Instructor
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href={`/courses/${courseId}`}>
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {course.title}
          </Button>
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">
                {getContentTypeIcon(lesson.contentType)}
                <span className="ml-1">{lesson.contentType}</span>
              </Badge>
              <Badge variant="secondary">
                Lesson {currentIndex + 1} of {sortedLessons.length}
              </Badge>
            </div>
            <CardTitle className="text-2xl" data-testid="text-lesson-title">
              {lesson.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4">
          {prevLesson ? (
            <Button variant="outline" asChild data-testid="button-prev-lesson">
              <Link href={`/courses/${courseId}/lessons/${prevLesson.id}`}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous: {prevLesson.title}
              </Link>
            </Button>
          ) : (
            <div />
          )}
          
          {nextLesson ? (
            <Button asChild data-testid="button-next-lesson">
              <Link href={`/courses/${courseId}/lessons/${nextLesson.id}`}>
                Next: {nextLesson.title}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href={`/courses/${courseId}`}>
                Back to Course
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
