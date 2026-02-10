import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { CourseCard, CourseCardSkeleton } from "@/components/courses/CourseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, BookOpen, X, GraduationCap, Landmark } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { CourseWithRelations, Major } from "@shared/schema";
import { useTranslation } from "react-i18next";

export default function Courses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMajorId, setSelectedMajorId] = useState<string>("loading");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const userUniversityId = user?.universityId;
  const userMajorId = user?.majorId;

  useEffect(() => {
    if (selectedMajorId === "loading" && user !== undefined) {
      setSelectedMajorId(userMajorId ? String(userMajorId) : "all");
    }
  }, [user, userMajorId, selectedMajorId]);

  const { data: universityMajors } = useQuery<Major[]>({
    queryKey: ["/api/majors", { universityId: userUniversityId }],
    queryFn: async () => {
      const res = await fetch(`/api/majors?universityId=${userUniversityId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch majors");
      return res.json();
    },
    enabled: !!userUniversityId,
  });

  const { data: allCourses, isLoading: coursesLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/courses", { universityId: userUniversityId }],
    queryFn: async () => {
      const url = userUniversityId
        ? `/api/courses?universityId=${userUniversityId}`
        : "/api/courses";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
  });

  const filteredCourses = useMemo(() => {
    if (!allCourses) return [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return allCourses.filter(
        (course) =>
          course.title.toLowerCase().includes(q) ||
          course.description?.toLowerCase().includes(q) ||
          course.code?.toLowerCase().includes(q) ||
          course.instructorName?.toLowerCase().includes(q)
      );
    }

    if (selectedMajorId && selectedMajorId !== "all" && selectedMajorId !== "loading") {
      return allCourses.filter((course) => course.majorId === Number(selectedMajorId));
    }

    return allCourses;
  }, [allCourses, searchQuery, selectedMajorId]);

  const handleMajorChange = (value: string) => {
    setSelectedMajorId(value);
    setSearchQuery("");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedMajorId(userMajorId ? String(userMajorId) : "all");
  };

  const isFilteredByMajor = selectedMajorId !== "all" && selectedMajorId !== "loading" && !searchQuery.trim();
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    (selectedMajorId !== "all" && selectedMajorId !== "loading" && selectedMajorId !== String(userMajorId));

  const selectedMajorName = universityMajors?.find((m) => m.id === Number(selectedMajorId))?.name;
  const universityName = user?.university?.name;

  const sectionHeader = searchQuery.trim()
    ? t("course.searchResultsAcross", { university: universityName || t("course.allAvailableCourses") })
    : isFilteredByMajor && selectedMajorName
    ? t("course.coursesIn", { major: selectedMajorName })
    : universityName
    ? t("course.allCoursesAt", { university: universityName })
    : t("course.allAvailableCourses");

  if (selectedMajorId === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-page-title">
            {t("course.courseCatalog")}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {isFilteredByMajor ? (
              <GraduationCap className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <Landmark className="w-4 h-4 text-primary shrink-0" />
            )}
            <p className="text-sm text-muted-foreground" data-testid="text-section-header">
              {sectionHeader}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder={universityName ? t("course.searchCoursesAt", { university: universityName }) : t("course.searchCourses")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ltr:pl-10 rtl:pr-10"
              data-testid="input-search"
            />
          </div>

          {universityMajors && universityMajors.length > 0 && (
            <Select value={searchQuery.trim() ? "all" : selectedMajorId} onValueChange={handleMajorChange} disabled={!!searchQuery.trim()}>
              <SelectTrigger className="w-full md:w-56" data-testid="select-major-filter">
                <SelectValue placeholder={t("course.filterByMajor")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("course.allMajors")}</SelectItem>
                {universityMajors.map((major) => (
                  <SelectItem key={major.id} value={String(major.id)}>
                    {major.name}
                    {major.id === userMajorId ? ` (${t("course.yourMajor")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} data-testid="button-clear-filters">
              <X className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
              {t("course.reset")}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {!coursesLoading && (
            <span className="text-sm text-muted-foreground" data-testid="text-course-count">
              {t("course.coursesFound", { count: filteredCourses.length })}
            </span>
          )}
        </div>

        {coursesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                actionHref={`/courses/${course.id}`}
              />
            ))}
          </div>
        ) : (
          <Card className="py-16">
            <CardContent className="text-center">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-xl mb-2">{t("course.noCoursesFound")}</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {searchQuery.trim()
                  ? t("course.noCoursesSearch")
                  : hasActiveFilters
                  ? t("course.noCoursesForMajor")
                  : t("course.noCoursesAvailable")}
              </p>
              {(searchQuery.trim() || hasActiveFilters) && (
                <Button variant="outline" onClick={clearFilters} data-testid="button-clear-empty">
                  {t("course.resetFilters")}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
