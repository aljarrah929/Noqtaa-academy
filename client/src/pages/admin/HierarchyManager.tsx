import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Landmark,
  Building2,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import type { University, College, Major } from "@shared/schema";

export default function HierarchyManager() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [uniDialogOpen, setUniDialogOpen] = useState(false);
  const [editingUni, setEditingUni] = useState<University | null>(null);
  const [uniName, setUniName] = useState("");
  const [uniSlug, setUniSlug] = useState("");
  const [uniLogo, setUniLogo] = useState("");

  const [collegeDialogOpen, setCollegeDialogOpen] = useState(false);
  const [collegeUniId, setCollegeUniId] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [collegeSlug, setCollegeSlug] = useState("");
  const [collegeThemeName, setCollegeThemeName] = useState("");
  const [collegePrimaryColor, setCollegePrimaryColor] = useState("#3B82F6");
  const [collegeSecondaryColor, setCollegeSecondaryColor] = useState("#60A5FA");

  const [majorDialogOpen, setMajorDialogOpen] = useState(false);
  const [majorUniId, setMajorUniId] = useState("");
  const [majorCollegeId, setMajorCollegeId] = useState("");
  const [majorName, setMajorName] = useState("");
  const [majorSlug, setMajorSlug] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; name: string } | null>(null);

  const { data: universities, isLoading: uniLoading } = useQuery<University[]>({
    queryKey: ["/api/universities"],
  });

  const { data: allColleges, isLoading: collegesLoading } = useQuery<College[]>({
    queryKey: ["/api/colleges"],
  });

  const { data: collegesForMajorForm } = useQuery<College[]>({
    queryKey: ["/api/universities", majorUniId, "colleges"],
    queryFn: async () => {
      const res = await fetch(`/api/universities/${majorUniId}/colleges`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!majorUniId,
  });

  const { data: allMajors, isLoading: majorsLoading } = useQuery<Major[]>({
    queryKey: ["/api/majors"],
  });

  const createUniMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/universities", {
        name: uniName,
        slug: uniSlug,
        logoUrl: uniLogo || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universities"] });
      toast({ title: "University created" });
      closeUniDialog();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateUniMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/universities/${editingUni!.id}`, {
        name: uniName,
        slug: uniSlug,
        logoUrl: uniLogo || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universities"] });
      toast({ title: "University updated" });
      closeUniDialog();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteUniMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/universities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universities"] });
      toast({ title: "University deleted" });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createCollegeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/colleges", {
        name: collegeName,
        slug: collegeSlug,
        universityId: Number(collegeUniId),
        themeName: collegeThemeName || collegeName,
        primaryColor: collegePrimaryColor,
        secondaryColor: collegeSecondaryColor,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colleges"] });
      toast({ title: "College created" });
      closeCollegeDialog();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCollegeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/colleges/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colleges"] });
      toast({ title: "College deleted" });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createMajorMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/majors", {
        name: majorName,
        slug: majorSlug,
        collegeId: Number(majorCollegeId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/majors"] });
      toast({ title: "Major created" });
      closeMajorDialog();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMajorMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/majors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/majors"] });
      toast({ title: "Major deleted" });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openUniDialog = (uni?: University) => {
    if (uni) {
      setEditingUni(uni);
      setUniName(uni.name);
      setUniSlug(uni.slug);
      setUniLogo(uni.logoUrl || "");
    } else {
      setEditingUni(null);
      setUniName("");
      setUniSlug("");
      setUniLogo("");
    }
    setUniDialogOpen(true);
  };

  const closeUniDialog = () => {
    setUniDialogOpen(false);
    setEditingUni(null);
    setUniName("");
    setUniSlug("");
    setUniLogo("");
  };

  const closeCollegeDialog = () => {
    setCollegeDialogOpen(false);
    setCollegeUniId("");
    setCollegeName("");
    setCollegeSlug("");
    setCollegeThemeName("");
    setCollegePrimaryColor("#3B82F6");
    setCollegeSecondaryColor("#60A5FA");
  };

  const closeMajorDialog = () => {
    setMajorDialogOpen(false);
    setMajorUniId("");
    setMajorCollegeId("");
    setMajorName("");
    setMajorSlug("");
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "university") deleteUniMutation.mutate(deleteTarget.id);
    else if (deleteTarget.type === "college") deleteCollegeMutation.mutate(deleteTarget.id);
    else if (deleteTarget.type === "major") deleteMajorMutation.mutate(deleteTarget.id);
  };

  if (authLoading) {
    return (
      <DashboardLayout title="Academic Structure">
        <Skeleton className="h-64 rounded-lg" />
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout title="Access Denied">
        <div className="max-w-4xl mx-auto text-center py-16">
          <ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only super admins can manage the academic structure.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Academic Structure">
      <div className="max-w-5xl mx-auto space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              Universities
            </CardTitle>
            <Button size="sm" onClick={() => openUniDialog()} data-testid="button-add-university">
              <Plus className="w-4 h-4 mr-1" />
              Add University
            </Button>
          </CardHeader>
          <CardContent>
            {uniLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-md" />)}
              </div>
            ) : universities && universities.length > 0 ? (
              <div className="space-y-2">
                {universities.map((uni) => (
                  <div
                    key={uni.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-md border border-border"
                    data-testid={`university-item-${uni.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Landmark className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{uni.name}</p>
                        <p className="text-xs text-muted-foreground">{uni.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openUniDialog(uni)} data-testid={`button-edit-university-${uni.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: "university", id: uni.id, name: uni.name })} data-testid={`button-delete-university-${uni.id}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">No universities yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Colleges
            </CardTitle>
            <Button size="sm" onClick={() => setCollegeDialogOpen(true)} data-testid="button-add-college">
              <Plus className="w-4 h-4 mr-1" />
              Add College
            </Button>
          </CardHeader>
          <CardContent>
            {collegesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-md" />)}
              </div>
            ) : allColleges && allColleges.length > 0 ? (
              <div className="space-y-2">
                {allColleges.map((college) => {
                  const parentUni = universities?.find((u) => u.id === college.universityId);
                  return (
                    <div
                      key={college.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border border-border"
                      data-testid={`college-item-${college.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: college.primaryColor + "20" }}
                        >
                          <Building2 className="w-4 h-4" style={{ color: college.primaryColor }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{college.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {parentUni?.name || "No university"} &middot; {college.slug}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: "college", id: college.id, name: college.name })} data-testid={`button-delete-college-${college.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">No colleges yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Majors
            </CardTitle>
            <Button size="sm" onClick={() => setMajorDialogOpen(true)} data-testid="button-add-major">
              <Plus className="w-4 h-4 mr-1" />
              Add Major
            </Button>
          </CardHeader>
          <CardContent>
            {majorsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-md" />)}
              </div>
            ) : allMajors && allMajors.length > 0 ? (
              <div className="space-y-2">
                {allMajors.map((major) => {
                  const parentCollege = allColleges?.find((c) => c.id === major.collegeId);
                  const parentUni = universities?.find((u) => u.id === parentCollege?.universityId);
                  return (
                    <div
                      key={major.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border border-border"
                      data-testid={`major-item-${major.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{major.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {parentUni?.name || "?"} &middot; {parentCollege?.name || "?"} &middot; {major.slug}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: "major", id: major.id, name: major.name })} data-testid={`button-delete-major-${major.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">No majors yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={uniDialogOpen} onOpenChange={setUniDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUni ? "Edit University" : "Add University"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="uni-name">Name</Label>
              <Input
                id="uni-name"
                value={uniName}
                onChange={(e) => {
                  setUniName(e.target.value);
                  if (!editingUni) {
                    setUniSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                  }
                }}
                placeholder="e.g. Cairo University"
                data-testid="input-university-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uni-slug">Slug</Label>
              <Input
                id="uni-slug"
                value={uniSlug}
                onChange={(e) => setUniSlug(e.target.value)}
                placeholder="e.g. cairo-university"
                data-testid="input-university-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uni-logo">Logo URL (optional)</Label>
              <Input
                id="uni-logo"
                value={uniLogo}
                onChange={(e) => setUniLogo(e.target.value)}
                placeholder="https://..."
                data-testid="input-university-logo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeUniDialog}>Cancel</Button>
            <Button
              onClick={() => editingUni ? updateUniMutation.mutate() : createUniMutation.mutate()}
              disabled={!uniName || !uniSlug || createUniMutation.isPending || updateUniMutation.isPending}
              data-testid="button-save-university"
            >
              {(createUniMutation.isPending || updateUniMutation.isPending) ? "Saving..." : editingUni ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={collegeDialogOpen} onOpenChange={setCollegeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add College</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>University</Label>
              <Select value={collegeUniId} onValueChange={setCollegeUniId}>
                <SelectTrigger data-testid="select-college-university">
                  <SelectValue placeholder="Select university" />
                </SelectTrigger>
                <SelectContent>
                  {universities?.map((uni) => (
                    <SelectItem key={uni.id} value={String(uni.id)}>{uni.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="college-name">Name</Label>
              <Input
                id="college-name"
                value={collegeName}
                onChange={(e) => {
                  setCollegeName(e.target.value);
                  setCollegeSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="e.g. Faculty of Engineering"
                data-testid="input-college-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="college-slug">Slug</Label>
              <Input
                id="college-slug"
                value={collegeSlug}
                onChange={(e) => setCollegeSlug(e.target.value)}
                placeholder="e.g. engineering"
                data-testid="input-college-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="college-theme">Theme Name</Label>
              <Input
                id="college-theme"
                value={collegeThemeName}
                onChange={(e) => setCollegeThemeName(e.target.value)}
                placeholder="e.g. Engineering Theme"
                data-testid="input-college-theme"
              />
            </div>
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="college-primary">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="college-primary"
                    value={collegePrimaryColor}
                    onChange={(e) => setCollegePrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-md border border-border cursor-pointer"
                  />
                  <Input
                    value={collegePrimaryColor}
                    onChange={(e) => setCollegePrimaryColor(e.target.value)}
                    className="flex-1"
                    data-testid="input-college-primary-color"
                  />
                </div>
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="college-secondary">Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="college-secondary"
                    value={collegeSecondaryColor}
                    onChange={(e) => setCollegeSecondaryColor(e.target.value)}
                    className="w-9 h-9 rounded-md border border-border cursor-pointer"
                  />
                  <Input
                    value={collegeSecondaryColor}
                    onChange={(e) => setCollegeSecondaryColor(e.target.value)}
                    className="flex-1"
                    data-testid="input-college-secondary-color"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCollegeDialog}>Cancel</Button>
            <Button
              onClick={() => createCollegeMutation.mutate()}
              disabled={!collegeUniId || !collegeName || !collegeSlug || createCollegeMutation.isPending}
              data-testid="button-save-college"
            >
              {createCollegeMutation.isPending ? "Saving..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={majorDialogOpen} onOpenChange={setMajorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Major</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>University</Label>
              <Select
                value={majorUniId}
                onValueChange={(val) => {
                  setMajorUniId(val);
                  setMajorCollegeId("");
                }}
              >
                <SelectTrigger data-testid="select-major-university">
                  <SelectValue placeholder="Select university" />
                </SelectTrigger>
                <SelectContent>
                  {universities?.map((uni) => (
                    <SelectItem key={uni.id} value={String(uni.id)}>{uni.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>College</Label>
              <Select
                value={majorCollegeId}
                onValueChange={setMajorCollegeId}
                disabled={!majorUniId}
              >
                <SelectTrigger data-testid="select-major-college">
                  <SelectValue placeholder={!majorUniId ? "Select university first" : "Select college"} />
                </SelectTrigger>
                <SelectContent>
                  {collegesForMajorForm?.map((col) => (
                    <SelectItem key={col.id} value={String(col.id)}>{col.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="major-name">Major Name</Label>
              <Input
                id="major-name"
                value={majorName}
                onChange={(e) => {
                  setMajorName(e.target.value);
                  setMajorSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="e.g. Computer Science"
                disabled={!majorCollegeId}
                data-testid="input-major-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="major-slug">Slug</Label>
              <Input
                id="major-slug"
                value={majorSlug}
                onChange={(e) => setMajorSlug(e.target.value)}
                placeholder="e.g. computer-science"
                disabled={!majorCollegeId}
                data-testid="input-major-slug"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeMajorDialog}>Cancel</Button>
            <Button
              onClick={() => createMajorMutation.mutate()}
              disabled={!majorCollegeId || !majorName || !majorSlug || createMajorMutation.isPending}
              data-testid="button-save-major"
            >
              {createMajorMutation.isPending ? "Saving..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone and may fail if there are related records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
