import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { BarChart3, Save } from "lucide-react";
import type { HomeStats } from "@shared/schema";

const iconOptions = [
  { value: "BookOpen", label: "Book Open" },
  { value: "Users", label: "Users" },
  { value: "GraduationCap", label: "Graduation Cap" },
  { value: "Award", label: "Award" },
  { value: "Building2", label: "Building" },
  { value: "Trophy", label: "Trophy" },
  { value: "Star", label: "Star" },
  { value: "Target", label: "Target" },
];

const homeStatsFormSchema = z.object({
  stat1Value: z.string().min(1, "Value is required").max(20, "Max 20 characters"),
  stat1Label: z.string().min(1, "Label is required").max(60, "Max 60 characters"),
  stat1Icon: z.string().min(1, "Icon is required"),
  stat2Value: z.string().min(1, "Value is required").max(20, "Max 20 characters"),
  stat2Label: z.string().min(1, "Label is required").max(60, "Max 60 characters"),
  stat2Icon: z.string().min(1, "Icon is required"),
  stat3Value: z.string().min(1, "Value is required").max(20, "Max 20 characters"),
  stat3Label: z.string().min(1, "Label is required").max(60, "Max 60 characters"),
  stat3Icon: z.string().min(1, "Icon is required"),
  stat4Value: z.string().min(1, "Value is required").max(20, "Max 20 characters"),
  stat4Label: z.string().min(1, "Label is required").max(60, "Max 60 characters"),
  stat4Icon: z.string().min(1, "Icon is required"),
});

type HomeStatsFormValues = z.infer<typeof homeStatsFormSchema>;

export default function HomeStatsManagement() {
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<HomeStats>({
    queryKey: ["/api/home-stats"],
  });

  const form = useForm<HomeStatsFormValues>({
    resolver: zodResolver(homeStatsFormSchema),
    defaultValues: {
      stat1Value: "",
      stat1Label: "",
      stat1Icon: "BookOpen",
      stat2Value: "",
      stat2Label: "",
      stat2Icon: "Users",
      stat3Value: "",
      stat3Label: "",
      stat3Icon: "GraduationCap",
      stat4Value: "",
      stat4Label: "",
      stat4Icon: "Award",
    },
    values: stats ? {
      stat1Value: stats.stat1Value,
      stat1Label: stats.stat1Label,
      stat1Icon: stats.stat1Icon,
      stat2Value: stats.stat2Value,
      stat2Label: stats.stat2Label,
      stat2Icon: stats.stat2Icon,
      stat3Value: stats.stat3Value,
      stat3Label: stats.stat3Label,
      stat3Icon: stats.stat3Icon,
      stat4Value: stats.stat4Value,
      stat4Label: stats.stat4Label,
      stat4Icon: stats.stat4Icon,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: HomeStatsFormValues) => {
      await apiRequest("PATCH", "/api/admin/home-stats", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/home-stats"] });
      toast({ title: "Home Stats Updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: HomeStatsFormValues) => {
    updateMutation.mutate(data);
  };

  const renderStatFields = (statNum: 1 | 2 | 3 | 4) => {
    const valueField = `stat${statNum}Value` as keyof HomeStatsFormValues;
    const labelField = `stat${statNum}Label` as keyof HomeStatsFormValues;
    const iconField = `stat${statNum}Icon` as keyof HomeStatsFormValues;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md">
        <FormField
          control={form.control}
          name={valueField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stat {statNum} Value</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. 50+"
                  {...field}
                  maxLength={20}
                  data-testid={`input-stat${statNum}-value`}
                />
              </FormControl>
              <FormDescription>{field.value?.length || 0}/20</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={labelField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stat {statNum} Label</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Quality Courses"
                  {...field}
                  maxLength={60}
                  data-testid={`input-stat${statNum}-label`}
                />
              </FormControl>
              <FormDescription>{field.value?.length || 0}/60</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={iconField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stat {statNum} Icon</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid={`select-stat${statNum}-icon`}>
                    <SelectValue placeholder="Select icon" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {iconOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  };

  return (
    <DashboardLayout title="Home Stats">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Home Page Statistics
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Edit the statistics displayed on the home page hero section.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-md" />
                ))}
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {renderStatFields(1)}
                  {renderStatFields(2)}
                  {renderStatFields(3)}
                  {renderStatFields(4)}

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      data-testid="button-save-stats"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
