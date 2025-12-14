import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Building2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { College } from "@shared/schema";

export default function CollegeOnboarding() {
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: colleges, isLoading } = useQuery<College[]>({
    queryKey: ["/api/colleges"],
  });

  const updateCollegeMutation = useMutation({
    mutationFn: async (collegeId: number) => {
      await apiRequest("PATCH", "/api/auth/user/college", { collegeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "College Selected", description: "Your college has been saved. Welcome!" });
      window.location.href = "/dashboard";
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (selectedCollegeId) {
      updateCollegeMutation.mutate(selectedCollegeId);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-onboarding-title">
            Welcome to EduLearn
          </h1>
          <p className="text-muted-foreground">
            Please select your college to personalize your learning experience.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Select Your College
            </CardTitle>
            <CardDescription>
              This selection will customize your theme and course recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {colleges?.map((college) => (
                  <button
                    key={college.id}
                    onClick={() => setSelectedCollegeId(college.id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedCollegeId === college.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    data-testid={`college-option-${college.id}`}
                  >
                    <div className="flex items-center justify-between">
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
                          <p className="text-sm text-muted-foreground">
                            {college.themeName}
                          </p>
                        </div>
                      </div>
                      {selectedCollegeId === college.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 pt-6 border-t">
              <Button
                onClick={handleSubmit}
                disabled={!selectedCollegeId || updateCollegeMutation.isPending}
                className="w-full"
                data-testid="button-confirm-college"
              >
                {updateCollegeMutation.isPending ? "Saving..." : "Continue to Dashboard"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
