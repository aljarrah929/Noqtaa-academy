import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Building2, Check, ChevronLeft, BookOpen, Landmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { College, University, Major } from "@shared/schema";
import { BRAND_NAME } from "@/lib/branding";

type Step = "university" | "college" | "major";

export default function SelectPath() {
  const [step, setStep] = useState<Step>("university");
  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null);
  const [selectedMajorId, setSelectedMajorId] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: universities, isLoading: universitiesLoading } = useQuery<University[]>({
    queryKey: ["/api/universities"],
  });

  const { data: colleges, isLoading: collegesLoading } = useQuery<College[]>({
    queryKey: ["/api/universities", selectedUniversityId, "colleges"],
    queryFn: async () => {
      const res = await fetch(`/api/universities/${selectedUniversityId}/colleges`);
      if (!res.ok) throw new Error("Failed to fetch colleges");
      return res.json();
    },
    enabled: !!selectedUniversityId,
  });

  const { data: majorsData, isLoading: majorsLoading } = useQuery<Major[]>({
    queryKey: ["/api/majors", selectedCollegeId],
    queryFn: async () => {
      const res = await fetch(`/api/majors?collegeId=${selectedCollegeId}`);
      if (!res.ok) throw new Error("Failed to fetch majors");
      return res.json();
    },
    enabled: !!selectedCollegeId,
  });

  const updatePathMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/auth/user/path", {
        universityId: selectedUniversityId,
        collegeId: selectedCollegeId,
        majorId: selectedMajorId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Academic path saved", description: "Welcome! Your selections have been saved." });
      setLocation("/courses");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const selectedUniversity = universities?.find(u => u.id === selectedUniversityId);
  const selectedCollege = colleges?.find(c => c.id === selectedCollegeId);

  const handleBack = () => {
    if (step === "major") {
      setSelectedMajorId(null);
      setStep("college");
    } else if (step === "college") {
      setSelectedCollegeId(null);
      setSelectedMajorId(null);
      setStep("university");
    }
  };

  useEffect(() => {
    if (user && user.majorId) {
      setLocation("/courses");
    }
  }, [user, setLocation]);

  if (user && user.majorId) {
    return null;
  }

  const stepNumber = step === "university" ? 1 : step === "college" ? 2 : 3;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-select-path-title">
            Welcome to {BRAND_NAME}
          </h1>
          <p className="text-muted-foreground">
            Choose your academic path to see courses relevant to you.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s < stepNumber
                    ? "bg-primary text-primary-foreground"
                    : s === stepNumber
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid={`step-indicator-${s}`}
              >
                {s < stepNumber ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-8 h-0.5 ${s < stepNumber ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          {step === "university" && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="w-5 h-5" />
                  Select Your University
                </CardTitle>
                <CardDescription>
                  Choose the university you are enrolled in.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {universitiesLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                  </div>
                ) : universities && universities.length > 0 ? (
                  <div className="space-y-3">
                    {universities.map((uni) => (
                      <button
                        key={uni.id}
                        onClick={() => {
                          setSelectedUniversityId(uni.id);
                          setSelectedCollegeId(null);
                          setSelectedMajorId(null);
                          setStep("college");
                        }}
                        className={`w-full p-4 rounded-md border-2 text-left transition-colors ${
                          selectedUniversityId === uni.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`select-path-university-${uni.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Landmark className="w-5 h-5 text-primary" />
                          </div>
                          <h3 className="font-medium">{uni.name}</h3>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No universities available yet. Please contact support.
                  </p>
                )}
              </CardContent>
            </>
          )}

          {step === "college" && (
            <>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-to-university">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">{selectedUniversity?.name}</span>
                </div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Select Your College
                </CardTitle>
                <CardDescription>
                  Choose your college or faculty.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {collegesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                  </div>
                ) : colleges && colleges.length > 0 ? (
                  <div className="space-y-3">
                    {colleges.map((college) => (
                      <button
                        key={college.id}
                        onClick={() => {
                          setSelectedCollegeId(college.id);
                          setSelectedMajorId(null);
                          setStep("major");
                        }}
                        className={`w-full p-4 rounded-md border-2 text-left transition-colors ${
                          selectedCollegeId === college.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`select-path-college-${college.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: college.primaryColor + "20" }}
                          >
                            <Building2
                              className="w-5 h-5"
                              style={{ color: college.primaryColor }}
                            />
                          </div>
                          <div>
                            <h3 className="font-medium">{college.name}</h3>
                            <p className="text-sm text-muted-foreground">{college.themeName}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No colleges available for this university.
                  </p>
                )}
              </CardContent>
            </>
          )}

          {step === "major" && (
            <>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-to-college">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedUniversity?.name} / {selectedCollege?.name}
                  </span>
                </div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Select Your Major
                </CardTitle>
                <CardDescription>
                  Choose your field of study.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {majorsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                  </div>
                ) : majorsData && majorsData.length > 0 ? (
                  <div className="space-y-3">
                    {majorsData.map((major) => (
                      <button
                        key={major.id}
                        onClick={() => setSelectedMajorId(major.id)}
                        className={`w-full p-4 rounded-md border-2 text-left transition-colors ${
                          selectedMajorId === major.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`select-path-major-${major.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-medium">{major.name}</h3>
                          </div>
                          {selectedMajorId === major.id && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No majors available for this college.
                  </p>
                )}

                <div className="mt-6 pt-6 border-t">
                  <Button
                    onClick={() => updatePathMutation.mutate()}
                    disabled={!selectedMajorId || updatePathMutation.isPending}
                    className="w-full"
                    data-testid="button-save-path"
                  >
                    {updatePathMutation.isPending ? "Saving..." : "Save & Continue"}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
