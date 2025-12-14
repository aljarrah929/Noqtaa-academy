import { useState } from "react";
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
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, Plus, Edit, Trash2 } from "lucide-react";
import type { College } from "@shared/schema";

const collegeFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z.string().min(1, "Slug is required").max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  themeName: z.string().min(1, "Theme name is required").max(100),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  logoUrl: z.string().optional(),
});

type CollegeFormValues = z.infer<typeof collegeFormSchema>;

export default function CollegeManagement() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);

  const { data: colleges, isLoading } = useQuery<College[]>({
    queryKey: ["/api/colleges"],
  });

  const form = useForm<CollegeFormValues>({
    resolver: zodResolver(collegeFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      themeName: "",
      primaryColor: "#3B82F6",
      secondaryColor: "#60A5FA",
      logoUrl: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CollegeFormValues) => {
      await apiRequest("POST", "/api/colleges", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colleges"] });
      toast({ title: "College Created" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CollegeFormValues & { id: number }) => {
      await apiRequest("PATCH", `/api/colleges/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colleges"] });
      toast({ title: "College Updated" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/colleges/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colleges"] });
      toast({ title: "College Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openDialog = (college?: College) => {
    if (college) {
      setEditingCollege(college);
      form.reset({
        name: college.name,
        slug: college.slug,
        themeName: college.themeName,
        primaryColor: college.primaryColor,
        secondaryColor: college.secondaryColor,
        logoUrl: college.logoUrl || "",
      });
    } else {
      setEditingCollege(null);
      form.reset({
        name: "",
        slug: "",
        themeName: "",
        primaryColor: "#3B82F6",
        secondaryColor: "#60A5FA",
        logoUrl: "",
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCollege(null);
    form.reset();
  };

  const onSubmit = (data: CollegeFormValues) => {
    if (editingCollege) {
      updateMutation.mutate({ ...data, id: editingCollege.id });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <DashboardLayout title="College Management">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Colleges</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {colleges?.length || 0} colleges
              </p>
            </div>
            <Button onClick={() => openDialog()} data-testid="button-add-college">
              <Plus className="w-4 h-4 mr-2" />
              Add College
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 rounded-lg" />
                ))}
              </div>
            ) : colleges && colleges.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {colleges.map((college) => (
                  <Card key={college.id} className="overflow-hidden" data-testid={`card-college-${college.id}`}>
                    <div 
                      className="h-16 flex items-center justify-center"
                      style={{ backgroundColor: college.primaryColor }}
                    >
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold text-lg mb-1">{college.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">/{college.slug}</p>
                      <div className="flex items-center gap-2 mb-4">
                        <div 
                          className="w-6 h-6 rounded-full border"
                          style={{ backgroundColor: college.primaryColor }}
                          title="Primary Color"
                        />
                        <div 
                          className="w-6 h-6 rounded-full border"
                          style={{ backgroundColor: college.secondaryColor }}
                          title="Secondary Color"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(college)}
                          data-testid={`button-edit-college-${college.id}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(college.id)}
                          className="text-destructive"
                          data-testid={`button-delete-college-${college.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Colleges Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first college to get started.
                </p>
                <Button onClick={() => openDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add College
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCollege ? "Edit College" : "Add College"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="College of Engineering" {...field} data-testid="input-college-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="engineering" {...field} data-testid="input-college-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="themeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme Name</FormLabel>
                    <FormControl>
                      <Input placeholder="engineering-theme" {...field} data-testid="input-college-theme" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input type="color" className="w-12 h-9 p-1" {...field} />
                          <Input {...field} placeholder="#3B82F6" data-testid="input-primary-color" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input type="color" className="w-12 h-9 p-1" {...field} />
                          <Input {...field} placeholder="#60A5FA" data-testid="input-secondary-color" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} data-testid="input-logo-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-college"
                >
                  {editingCollege ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
