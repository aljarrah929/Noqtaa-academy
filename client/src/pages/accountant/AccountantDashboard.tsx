import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, BookOpen, Building2, FileDown, Search, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CourseEnrollment {
  id: number;
  title: string;
  enrollments: number;
}

interface CollegeEnrollment {
  id: number;
  name: string;
  courses: CourseEnrollment[];
}

interface EnrollmentData {
  totals: {
    totalEnrollments: number;
    totalCourses: number;
    totalColleges: number;
  };
  colleges: CollegeEnrollment[];
}

export default function AccountantDashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [collegeFilter, setCollegeFilter] = useState<string>("all");
  const [isDownloading, setIsDownloading] = useState(false);

  const { data, isLoading, error } = useQuery<EnrollmentData>({
    queryKey: ["/api/accountant/enrollments"],
  });

  const filteredData = useMemo(() => {
    if (!data) return null;

    let colleges = data.colleges;

    if (collegeFilter !== "all") {
      colleges = colleges.filter(c => c.id.toString() === collegeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      colleges = colleges.map(college => ({
        ...college,
        courses: college.courses.filter(course =>
          course.title.toLowerCase().includes(query)
        ),
      })).filter(college => college.courses.length > 0);
    }

    const filteredTotals = {
      totalEnrollments: colleges.reduce(
        (sum, college) => sum + college.courses.reduce((s, c) => s + c.enrollments, 0),
        0
      ),
      totalCourses: colleges.reduce((sum, college) => sum + college.courses.length, 0),
      totalColleges: colleges.length,
    };

    return { totals: filteredTotals, colleges };
  }, [data, searchQuery, collegeFilter]);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/accountant/enrollments.pdf", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to download report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `enrollment-report-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report Downloaded",
        description: "The enrollment report has been downloaded successfully.",
      });
    } catch (err) {
      toast({
        title: "Download Failed",
        description: "Could not download the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (error) {
    return (
      <DashboardLayout title="Enrollment Statistics">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Failed to load enrollment data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Enrollment Statistics">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card data-testid="card-total-enrollments">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-enrollments">
                  {data?.totals.totalEnrollments.toLocaleString() || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Students enrolled in all courses
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-courses">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-courses">
                  {data?.totals.totalCourses.toLocaleString() || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Published courses with enrollments
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-colleges">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Colleges</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-colleges">
                  {data?.totals.totalColleges.toLocaleString() || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Colleges with active courses
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Enrollment Details by College
              </CardTitle>
              <Button
                onClick={handleDownloadPDF}
                disabled={isDownloading || isLoading}
                data-testid="button-download-pdf"
              >
                <FileDown className="h-4 w-4 mr-2" />
                {isDownloading ? "Downloading..." : "Download PDF Report"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search courses by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-courses"
                />
              </div>
              <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-college-filter">
                  <SelectValue placeholder="Filter by College" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Colleges</SelectItem>
                  {data?.colleges.map((college) => (
                    <SelectItem key={college.id} value={college.id.toString()}>
                      {college.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredData && filteredData.colleges.length > 0 ? (
              <div className="space-y-6">
                {filteredData.colleges.map((college) => (
                  <div key={college.id} className="space-y-3" data-testid={`college-section-${college.id}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {college.name}
                      </h3>
                      <Badge variant="secondary">
                        {college.courses.reduce((sum, c) => sum + c.enrollments, 0)} total enrollments
                      </Badge>
                    </div>
                    <div className="rounded-lg border">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left py-2 px-4 font-medium text-sm">Course Title</th>
                            <th className="text-right py-2 px-4 font-medium text-sm w-32">Enrollments</th>
                          </tr>
                        </thead>
                        <tbody>
                          {college.courses.map((course) => (
                            <tr
                              key={course.id}
                              className="border-t hover-elevate"
                              data-testid={`course-row-${course.id}`}
                            >
                              <td className="py-2 px-4 text-sm">{course.title}</td>
                              <td className="py-2 px-4 text-sm text-right font-medium">
                                {course.enrollments.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || collegeFilter !== "all"
                  ? "No courses match your search criteria."
                  : "No enrollment data available."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
