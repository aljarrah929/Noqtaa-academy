import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, Plus, Edit, Trash2, User } from "lucide-react";
import type { FeaturedProfile } from "@shared/schema";

const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name must be 80 characters or less"),
  title: z.string().max(80, "Title must be 80 characters or less").optional().nullable(),
  bio: z.string().max(800, "Bio must be 800 characters or less").optional().nullable(),
  imageUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function FeaturedProfilesManagement() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<FeaturedProfile | null>(null);

  const { data: profiles, isLoading } = useQuery<FeaturedProfile[]>({
    queryKey: ["/api/admin/featured-profiles"],
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      title: "",
      bio: "",
      imageUrl: "",
      isActive: true,
      sortOrder: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const payload = {
        ...data,
        imageUrl: data.imageUrl || null,
        title: data.title || null,
        bio: data.bio || null,
      };
      await apiRequest("POST", "/api/admin/featured-profiles", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/featured-profiles"] });
      toast({ title: "Profile Created" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormValues & { id: number }) => {
      const payload = {
        ...data,
        imageUrl: data.imageUrl || null,
        title: data.title || null,
        bio: data.bio || null,
      };
      await apiRequest("PATCH", `/api/admin/featured-profiles/${data.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/featured-profiles"] });
      toast({ title: "Profile Updated" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/featured-profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/featured-profiles"] });
      toast({ title: "Profile Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/admin/featured-profiles/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/featured-profiles"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openDialog = (profile?: FeaturedProfile) => {
    if (profile) {
      setEditingProfile(profile);
      form.reset({
        name: profile.name,
        title: profile.title || "",
        bio: profile.bio || "",
        imageUrl: profile.imageUrl || "",
        isActive: profile.isActive,
        sortOrder: profile.sortOrder,
      });
    } else {
      setEditingProfile(null);
      form.reset({
        name: "",
        title: "",
        bio: "",
        imageUrl: "",
        isActive: true,
        sortOrder: (profiles?.length || 0) + 1,
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProfile(null);
    form.reset();
  };

  const onSubmit = (data: ProfileFormValues) => {
    if (editingProfile) {
      updateMutation.mutate({ ...data, id: editingProfile.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const sortedProfiles = profiles?.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <DashboardLayout title="Featured Profiles">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Featured Profiles</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {profiles?.length || 0} profiles ({profiles?.filter(p => p.isActive).length || 0} active)
              </p>
            </div>
            <Button onClick={() => openDialog()} data-testid="button-add-profile">
              <Plus className="w-4 h-4 mr-2" />
              Add Profile
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            ) : sortedProfiles && sortedProfiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedProfiles.map((profile) => (
                  <Card 
                    key={profile.id} 
                    className={`overflow-hidden ${!profile.isActive ? 'opacity-60' : ''}`}
                    data-testid={`card-profile-${profile.id}`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={profile.imageUrl || undefined} alt={profile.name} />
                          <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate" data-testid={`text-profile-name-${profile.id}`}>
                              {profile.name}
                            </h3>
                            {profile.isActive ? (
                              <Badge variant="secondary" className="text-xs">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          {profile.title && (
                            <p className="text-sm text-muted-foreground truncate">
                              {profile.title}
                            </p>
                          )}
                        </div>
                      </div>
                      {profile.bio && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                          {profile.bio}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={profile.isActive}
                            onCheckedChange={(checked) =>
                              toggleActiveMutation.mutate({ id: profile.id, isActive: checked })
                            }
                            data-testid={`switch-active-${profile.id}`}
                          />
                          <span className="text-sm text-muted-foreground">
                            {profile.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(profile)}
                            data-testid={`button-edit-profile-${profile.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(profile.id)}
                            className="text-destructive"
                            data-testid={`button-delete-profile-${profile.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Featured Profiles Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add profiles to display on the home page.
                </p>
                <Button onClick={() => openDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Profile
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
              {editingProfile ? "Edit Profile" : "Add Profile"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John Doe" 
                        {...field} 
                        data-testid="input-profile-name"
                        maxLength={80}
                      />
                    </FormControl>
                    <FormDescription>{field.value?.length || 0}/80</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Professor of Computer Science" 
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-profile-title"
                        maxLength={80}
                      />
                    </FormControl>
                    <FormDescription>{field.value?.length || 0}/80</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="A brief description..." 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-profile-bio"
                        rows={3}
                        maxLength={800}
                      />
                    </FormControl>
                    <FormDescription>{field.value?.length || 0}/800</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://..." 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-profile-image"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-profile-sort"
                      />
                    </FormControl>
                    <FormDescription>Lower numbers appear first</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-profile-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active (visible on home page)</FormLabel>
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
                  data-testid="button-save-profile"
                >
                  {editingProfile ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
