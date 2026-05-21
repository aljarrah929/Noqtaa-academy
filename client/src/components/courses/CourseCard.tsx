import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, Users, Heart } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { CourseWithRelations } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query"; // مهم جداً للاتصال بالسيرفر
import { apiRequest, queryClient } from "@/lib/queryClient"; // أدوات الاستعلام
import { useToast } from "@/hooks/use-toast";

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
  showEnrollmentCount = true,
  actionLabel,
  actionHref,
  onAction,
}: CourseCardProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // 1. قراءة العداد الحقيقي من قاعدة البيانات (وإذا مافي بنعطيه 0)
  const dbLikes = (course as any).likesCount || 0;
  const [likesCount, setLikesCount] = useState<number>(Number(dbLikes) || 0);
  const [isLiked, setIsLiked] = useState(false);

  // 2. أمر الاتصال بالسيرفر لحفظ اللايك للأبد
  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      // نضرب الراوت اللي ضفناه بالـ backend
      const res = await apiRequest("POST", `/api/courses/${course.id}/like`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.likesCount !== undefined) {
        setLikesCount(data.likesCount); // تحديث العداد من السيرفر
      }
      // تحديث باقي الكروت بالخلفية
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "خطأ", 
        description: "لم يتم حفظ الإعجاب، تأكد من اتصال السيرفر.",
        variant: "destructive"
      });
    }
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PUBLISHED": return "default";
      case "PENDING_APPROVAL": return "secondary";
      case "REJECTED": return "destructive";
      default: return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING_APPROVAL": return t("course.pending");
      case "PUBLISHED": return t("course.published");
      case "REJECTED": return t("course.rejected");
      case "DRAFT": return t("course.draft");
      default: return status.charAt(0) + status.slice(1).toLowerCase();
    }
  };

  const getCollegeTheme = (slug?: string) => {
    switch (slug) {
      case "pharmacy":
        return { badge: "bg-emerald-500/90 text-white backdrop-blur-md border-none", gradient: "from-emerald-500 to-teal-600" };
      case "engineering":
        return { badge: "bg-blue-500/90 text-white backdrop-blur-md border-none", gradient: "from-blue-500 to-indigo-600" };
      case "it":
        return { badge: "bg-purple-500/90 text-white backdrop-blur-md border-none", gradient: "from-purple-500 to-pink-600" };
      default:
        return { badge: "bg-slate-500/90 text-white backdrop-blur-md border-none", gradient: "from-slate-500 to-slate-700" };
    }
  };

  const currentTheme = getCollegeTheme(course.college?.slug);
  const teacherInitials = course.teacher 
    ? `${course.teacher.firstName?.[0] || ""}${course.teacher.lastName?.[0] || ""}`.toUpperCase() || "T"
    : "T";

  const lessonCount = course._count?.lessons || course.lessons?.length || 0;
  const studentCount = course._count?.enrollments || course.enrollments?.length || 0;

  const handleCardClick = () => {
    if (actionHref) {
      setLocation(actionHref);
    } else if (onAction) {
      onAction();
    }
  };

  // 3. الدالة السحرية المحدثة
  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    
    // تحديث الشكل فوراً للطالب
    // تحديث الشكل فوراً للطالب
    if (isLiked) {
      setIsLiked(false);
      setLikesCount((prev: number) => prev - 1);
    } else {
      setIsLiked(true);
      setLikesCount((prev: number) => prev + 1);
    }

    // إرسال اللايك للسيرفر عشان ينحفظ بالداتابيز
    toggleLikeMutation.mutate();
  };

  return (
    <Card 
      className="group flex flex-col h-full overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-card shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer" 
      onClick={handleCardClick}
    >
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-900">
        {course.coverImageUrl ? (
          <img 
            src={course.coverImageUrl} 
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${currentTheme.gradient} flex items-center justify-center p-4 transition-transform duration-500 group-hover:scale-105`}>
            <span className="text-white/20 font-bold text-4xl select-none truncate max-w-full px-2">
              {course.title}
            </span>
          </div>
        )}

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          {course.college && (
            <Badge className={`${currentTheme.badge} text-xs font-semibold px-2.5 py-1 shadow-sm`}>
              {course.college.name}
            </Badge>
          )}
          
          {showStatus && (
            <Badge variant={getStatusVariant(course.status)} className="text-xs backdrop-blur-md shadow-sm">
              {getStatusLabel(course.status)}
            </Badge>
          )}

          {course.price != null && course.price > 0 ? (
            <Badge className="ml-auto bg-black/70 dark:bg-white/80 text-white dark:text-black font-bold backdrop-blur-sm border-none px-2.5 py-1 shadow-sm">
              {formatPrice(course.price)}
            </Badge>
          ) : (
            <Badge className="ml-auto bg-emerald-500 text-white font-bold border-none px-2.5 py-1 shadow-sm animate-pulse">
              {t("course.free", "مجاني")}
            </Badge>
          )}
        </div>
      </div>
      
      <CardContent className="flex-1 p-4 pb-2">
        <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-50 leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200" title={course.title}>
          {course.title}
        </h3>
        {course.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
            {course.description}
          </p>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-3 border-t border-slate-50 dark:border-slate-900 flex items-center justify-between gap-2">
        {showTeacher && course.teacher && (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 ring-2 ring-slate-100 dark:ring-slate-800 flex-shrink-0">
              <AvatarImage src={course.teacher.profileImageUrl || undefined} className="object-cover" />
              <AvatarFallback className="text-[10px] bg-slate-100 dark:bg-slate-800 font-bold">{teacherInitials}</AvatarFallback>
            </Avatar>
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
              {course.teacher.firstName} {course.teacher.lastName}
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium flex-shrink-0">
          <div className="flex items-center gap-1" title={t("sidebar.lessons")}>
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>{lessonCount}</span>
          </div>
          
          {showEnrollmentCount && (
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded-md" title={t("sidebar.students")}>
              <Users className="w-3.5 h-3.5" />
              <span>{studentCount}</span>
            </div>
          )}

          <button 
            type="button"
            onClick={handleLikeClick}
            disabled={toggleLikeMutation.isPending}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all duration-200 active:scale-95 disabled:opacity-50 ${
              isLiked 
                ? "text-pink-600 bg-pink-100 dark:bg-pink-950/50" 
                : "text-slate-500 bg-slate-50 dark:bg-slate-950/30 hover:text-pink-500 hover:bg-pink-50/50"
            }`} 
            title={isLiked ? "إلغاء الإعجاب" : "إعجاب"}
          >
            <Heart className={`w-3.5 h-3.5 transition-transform duration-300 ${isLiked ? "fill-pink-600 scale-110" : ""}`} />
            <span>{likesCount}</span>
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}

export function CourseCardSkeleton() {
  return (
    <Card className="flex flex-col h-full overflow-hidden rounded-xl">
      <div className="w-full aspect-[16/10] bg-muted animate-pulse" />
      <div className="p-4 flex-1 space-y-3">
        <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
      </div>
      <div className="p-4 border-t border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-muted animate-pulse rounded-full" />
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
    </Card>
  );
}