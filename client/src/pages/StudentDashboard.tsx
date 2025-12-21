import { useQuery } from "@tanstack/react-query";
import { DashboardLayout, DashboardSkeleton } from "@/components/layout/DashboardLayout";
import { CourseCard, CourseCardSkeleton } from "@/components/courses/CourseCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithRelations } from "@shared/schema";

export default function StudentDashboard() {
  const { data: enrolledCourses, isLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/enrollments/my-courses"],
  });

  return (
    <DashboardLayout title="My Courses">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-muted-foreground">
              {isLoading ? "Loading..." : `${enrolledCourses?.length || 0} enrolled courses`}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/courses">
              Browse Courses
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : enrolledCourses && enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                actionHref={`/courses/${course.id}`}
                actionLabel="Continue Learning"
              />
            ))}
          </div>
        ) : (
          <Card className="py-16">
            <CardContent className="text-center">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-xl mb-2">No Enrolled Courses</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You haven't been enrolled in any courses yet. Browse our catalog and contact teachers to request enrollment.
              </p>
              <Button asChild>
                <Link href="/courses">
                  Browse Courses
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
