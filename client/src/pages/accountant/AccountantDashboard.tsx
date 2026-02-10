import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Users,
  BookOpen,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAccountantDashboard } from "@/lib/authUtils";
import { formatPrice } from "@/lib/utils";
import { InvoiceTemplate } from "./InvoiceTemplate";

interface CourseReport {
  courseId: number;
  title: string;
  instructorId: string;
  instructorName: string;
  collegeName: string;
  price: number;
  studentCount: number;
  totalRevenue: number;
}

interface ReportsData {
  reports: CourseReport[];
  totals: {
    totalRevenue: number;
    totalStudents: number;
    totalCourses: number;
  };
}

type SortKey = "title" | "instructorName" | "price" | "studentCount" | "totalRevenue";
type SortDir = "asc" | "desc";

export default function AccountantDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [instructorFilter, setInstructorFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("totalRevenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const invoiceRef = useRef<HTMLDivElement>(null);

  const hasAccess = user ? canAccessAccountantDashboard(user.role) : false;

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      setLocation("/");
    }
  }, [authLoading, hasAccess, setLocation]);

  const { data, isLoading, error } = useQuery<ReportsData>({
    queryKey: ["/api/accountant/reports"],
    enabled: !!hasAccess,
  });

  const instructors = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    data.reports.forEach((r) => map.set(r.instructorId, r.instructorName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  const filteredReports = useMemo(() => {
    if (!data) return [];
    let list = data.reports;
    if (instructorFilter !== "all") {
      list = list.filter((r) => r.instructorId === instructorFilter);
    }
    list = [...list].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return list;
  }, [data, instructorFilter, sortKey, sortDir]);

  const filteredTotals = useMemo(() => {
    return {
      totalRevenue: filteredReports.reduce((s, r) => s + r.totalRevenue, 0),
      totalStudents: filteredReports.reduce((s, r) => s + r.studentCount, 0),
      totalCourses: filteredReports.length,
    };
  }, [filteredReports]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedInstructorName =
    instructorFilter !== "all"
      ? instructors.find((i) => i.id === instructorFilter)?.name || ""
      : "";

  if (error) {
    return (
      <DashboardLayout title="Financial Reports">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Failed to load financial data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <>
      <div className="print-hidden">
        <DashboardLayout title="Financial Reports">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card data-testid="card-total-revenue">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {instructorFilter !== "all" ? "Total Due" : "Total Revenue"}
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <div className="text-2xl font-bold" data-testid="text-total-revenue">
                      {formatPrice(filteredTotals.totalRevenue)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {instructorFilter !== "all"
                      ? `Amount due to ${selectedInstructorName}`
                      : "Platform-wide revenue"}
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-students">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold" data-testid="text-total-students">
                      {filteredTotals.totalStudents.toLocaleString()}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Enrolled across courses</p>
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
                      {filteredTotals.totalCourses.toLocaleString()}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Published courses</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Course Revenue Details</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={instructorFilter} onValueChange={setInstructorFilter}>
                      <SelectTrigger className="w-full sm:w-[220px]" data-testid="select-instructor-filter">
                        <SelectValue placeholder="Filter by Instructor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Instructors</SelectItem>
                        {instructors.map((inst) => (
                          <SelectItem key={inst.id} value={inst.id}>
                            {inst.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handlePrint} disabled={isLoading} data-testid="button-print-invoice">
                      <Printer className="h-4 w-4 mr-2" />
                      Print Invoice
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : filteredReports.length > 0 ? (
                  <div className="rounded-lg border overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-muted/50">
                        <tr>
                          <th
                            className="text-left py-2.5 px-4 font-medium text-sm cursor-pointer select-none"
                            onClick={() => handleSort("title")}
                            data-testid="th-sort-title"
                          >
                            <span className="inline-flex items-center">
                              Course
                              <SortIcon column="title" />
                            </span>
                          </th>
                          <th
                            className="text-left py-2.5 px-4 font-medium text-sm cursor-pointer select-none"
                            onClick={() => handleSort("instructorName")}
                            data-testid="th-sort-instructor"
                          >
                            <span className="inline-flex items-center">
                              Instructor
                              <SortIcon column="instructorName" />
                            </span>
                          </th>
                          <th
                            className="text-right py-2.5 px-4 font-medium text-sm cursor-pointer select-none w-28"
                            onClick={() => handleSort("price")}
                            data-testid="th-sort-price"
                          >
                            <span className="inline-flex items-center justify-end">
                              Price
                              <SortIcon column="price" />
                            </span>
                          </th>
                          <th
                            className="text-right py-2.5 px-4 font-medium text-sm cursor-pointer select-none w-28"
                            onClick={() => handleSort("studentCount")}
                            data-testid="th-sort-students"
                          >
                            <span className="inline-flex items-center justify-end">
                              Students
                              <SortIcon column="studentCount" />
                            </span>
                          </th>
                          <th
                            className="text-right py-2.5 px-4 font-medium text-sm cursor-pointer select-none w-32"
                            onClick={() => handleSort("totalRevenue")}
                            data-testid="th-sort-revenue"
                          >
                            <span className="inline-flex items-center justify-end">
                              Revenue
                              <SortIcon column="totalRevenue" />
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReports.map((report) => (
                          <tr
                            key={report.courseId}
                            className="border-t hover-elevate"
                            data-testid={`report-row-${report.courseId}`}
                          >
                            <td className="py-2.5 px-4 text-sm">
                              <div>{report.title}</div>
                              <div className="text-xs text-muted-foreground">{report.collegeName}</div>
                            </td>
                            <td className="py-2.5 px-4 text-sm">{report.instructorName}</td>
                            <td className="py-2.5 px-4 text-sm text-right">{formatPrice(report.price)}</td>
                            <td className="py-2.5 px-4 text-sm text-right">{report.studentCount.toLocaleString()}</td>
                            <td className="py-2.5 px-4 text-sm text-right font-semibold">
                              {formatPrice(report.totalRevenue)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t bg-muted/30 font-semibold">
                          <td className="py-2.5 px-4 text-sm" colSpan={3}>
                            Totals
                          </td>
                          <td className="py-2.5 px-4 text-sm text-right">
                            {filteredTotals.totalStudents.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-sm text-right">
                            {formatPrice(filteredTotals.totalRevenue)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No financial data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </div>

      <div className="print-only" ref={invoiceRef}>
        <InvoiceTemplate
          reports={filteredReports}
          totals={filteredTotals}
          instructorName={selectedInstructorName}
          showAll={instructorFilter === "all"}
        />
      </div>
    </>
  );
}
