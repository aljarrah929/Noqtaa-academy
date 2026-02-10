import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, Users, Clock, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { CourseWithRelations } from "@shared/schema";

interface CourseCardProps {
  course: CourseWithRelations;
  showStatus?: boolean;
  showTeacher?: boolean;
  showEnrollmentCount?: boolean;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function CourseCard({
  course,
  showStatus = false,
  showTeacher = true,
  showEnrollmentCount = false,
  actionLabel = "View Course",
  actionHref,
  onAction,
}: CourseCardProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "default";
      case "PENDING_APPROVAL":
        return "secondary";
      case "REJECTED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return "Pending";
      default:
        return status.charAt(0) + status.slice(1).toLowerCase();
    }
  };

  const getCollegeBadgeColor = (slug?: string) => {
    switch (slug) {
      case "pharmacy":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "engineering":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "it":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "";
    }
  };

  const teacherInitials = course.teacher 
    ? `${course.teacher.firstName?.[0] || ""}${course.teacher.lastName?.[0] || ""}`.toUpperCase() || "T"
    : "T";

  return (
    <Card className="flex flex-col h-full hover-elevate" data-testid={`card-course-${course.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {course.college && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getCollegeBadgeColor(course.college.slug)}`}
                >
                  {course.college.name}
                </Badge>
              )}
              {showStatus && (
                <Badge variant={getStatusVariant(course.status)} className="text-xs">
                  {getStatusLabel(course.status)}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-lg leading-tight line-clamp-2" data-testid={`text-course-title-${course.id}`}>
              {course.title}
            </h3>
          </div>
          {course.price != null && course.price > 0 && (
            <Badge
              variant="outline"
              className="flex-shrink-0 font-bold text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:bg-emerald-900/20"
              data-testid={`badge-price-${course.id}`}
            >
              {formatPrice(course.price)}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pb-3">
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {course.description}
          </p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>{course._count?.lessons || course.lessons?.length || 0} lessons</span>
          </div>
          {showEnrollmentCount && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{course._count?.enrollments || course.enrollments?.length || 0} students</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t border-border flex items-center justify-between gap-4">
        {showTeacher && course.teacher && (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={course.teacher.profileImageUrl || undefined} className="object-cover" />
              <AvatarFallback className="text-xs">{teacherInitials}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground truncate">
              {course.teacher.firstName} {course.teacher.lastName}
            </span>
          </div>
        )}
        
        {actionHref ? (
          <Button asChild size="sm" variant="ghost" data-testid={`button-view-course-${course.id}`}>
            <Link href={actionHref}>
              {actionLabel}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        ) : onAction ? (
          <Button size="sm" variant="ghost" onClick={onAction} data-testid={`button-action-course-${course.id}`}>
            {actionLabel}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

export function CourseCardSkeleton() {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-20 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex gap-4">
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        </div>
      </CardFooter>
    </Card>
  );
}
