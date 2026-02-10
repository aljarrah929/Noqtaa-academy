import { useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { CourseCard, CourseCardSkeleton } from "@/components/courses/CourseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, BookOpen, X, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { CourseWithRelations, College } from "@shared/schema";

export default function Courses() {
  const searchParams = new URLSearchParams(useSearch());
  const initialCollege = searchParams.get("college") || "all";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollege, setSelectedCollege] = useState(initialCollege);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const userMajorId = user?.majorId;
  const coursesQueryKey = userMajorId
    ? ["/api/courses", { majorId: userMajorId }]
    : ["/api/courses"];

  const { data: courses, isLoading: coursesLoading } = useQuery<CourseWithRelations[]>({
    queryKey: coursesQueryKey,
    queryFn: async () => {
      const url = userMajorId ? `/api/courses?majorId=${userMajorId}` : "/api/courses";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
  });

  const { data: colleges } = useQuery<College[]>({
    queryKey: ["/api/colleges"],
  });

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    
    return courses.filter((course) => {
      const matchesSearch = 
        searchQuery === "" ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCollege = 
        selectedCollege === "all" || 
        course.college?.slug === selectedCollege;
      
      return matchesSearch && matchesCollege;
    });
  }, [courses, searchQuery, selectedCollege]);

  const handleCollegeChange = (value: string) => {
    setSelectedCollege(value);
    if (value === "all") {
      setLocation("/courses");
    } else {
      setLocation(`/courses?college=${value}`);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCollege("all");
    setLocation("/courses");
  };

  const hasActiveFilters = searchQuery !== "" || selectedCollege !== "all";

  const pathLabel = user?.major && user?.university
    ? `${user.major.name} at ${user.university.name}`
    : user?.major
    ? user.major.name
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-page-title">
            Course Catalog
          </h1>
          {pathLabel ? (
            <div className="flex items-center gap-2 mt-1">
              <GraduationCap className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground" data-testid="text-path-label">
                Showing courses for <span className="font-medium text-foreground">{pathLabel}</span>
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Browse courses from all our colleges
            </p>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          
          <Select value={selectedCollege} onValueChange={handleCollegeChange}>
            <SelectTrigger className="w-full md:w-48" data-testid="select-college">
              <SelectValue placeholder="All Colleges" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Colleges</SelectItem>
              {colleges?.map((college) => (
                <SelectItem key={college.id} value={college.slug}>
                  {college.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} data-testid="button-clear-filters">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {selectedCollege !== "all" && (
            <Badge 
              variant="secondary" 
              className="cursor-pointer"
              onClick={() => handleCollegeChange("all")}
            >
              {colleges?.find(c => c.slug === selectedCollege)?.name}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
          {!coursesLoading && (
            <span className="text-sm text-muted-foreground">
              {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} found
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
              <h3 className="font-semibold text-xl mb-2">No courses found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {hasActiveFilters 
                  ? "Try adjusting your filters or search query to find what you're looking for."
                  : "There are no published courses available at the moment. Check back soon!"
                }
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
