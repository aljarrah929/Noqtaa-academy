import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Tag, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAccountantDashboard } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { DiscountCoupon } from "@shared/schema";

const couponFormSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(50, "Code must be at most 50 characters"),
  description: z.string().optional().default(""),
  discountPercent: z.string()
    .min(1, "Discount percent is required")
    .refine((val) => !isNaN(Number(val)), "Must be a number")
    .refine((val) => Number(val) >= 1 && Number(val) <= 100, "Must be between 1 and 100"),
  maxUses: z.string().optional().default(""),
  validFrom: z.string().optional().default(""),
  validUntil: z.string().optional().default(""),
  isActive: z.boolean().default(true),
});

type CouponFormValues = z.infer<typeof couponFormSchema>;

export default function CouponManagement() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<DiscountCoupon | null>(null);

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: "",
      description: "",
      discountPercent: "",
      maxUses: "",
      validFrom: "",
      validUntil: "",
      isActive: true,
    },
  });

  const { data: coupons, isLoading } = useQuery<DiscountCoupon[]>({
    queryKey: ["/api/coupons"],
    enabled: !!user && canAccessAccountantDashboard(user.role),
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await apiRequest("POST", "/api/coupons", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      toast({ title: "Created", description: "Coupon created successfully." });
      form.reset();
      setIsCreateOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await apiRequest("PATCH", `/api/coupons/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      toast({ title: "Updated", description: "Coupon updated successfully." });
      form.reset();
      setEditCoupon(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/coupons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      toast({ title: "Deleted", description: "Coupon deleted successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openEdit = (coupon: DiscountCoupon) => {
    setEditCoupon(coupon);
    form.reset({
      code: coupon.code,
      description: coupon.description || "",
      discountPercent: coupon.discountPercent.toString(),
      maxUses: coupon.maxUses?.toString() || "",
      validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().split("T")[0] : "",
      validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().split("T")[0] : "",
      isActive: coupon.isActive,
    });
  };

  const onSubmit = (values: CouponFormValues) => {
    const data = {
      code: values.code.toUpperCase(),
      description: values.description || null,
      discountPercent: parseInt(values.discountPercent),
      maxUses: values.maxUses ? parseInt(values.maxUses) : null,
      validFrom: values.validFrom ? new Date(values.validFrom).toISOString() : null,
      validUntil: values.validUntil ? new Date(values.validUntil).toISOString() : null,
      isActive: values.isActive,
    };

    if (editCoupon) {
      updateMutation.mutate({ id: editCoupon.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout title="Coupon Management">
        <div className="flex items-center justify-center p-8">
          <Skeleton className="h-96 w-full max-w-4xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !canAccessAccountantDashboard(user.role)) {
    return (
      <DashboardLayout title="Access Denied">
        <Card className="max-w-md mx-auto mt-8">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page.
            </p>
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">Go Home</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const CouponForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Coupon Code</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., SUMMER2026"
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  data-testid={isEdit ? "input-edit-coupon-code" : "input-coupon-code"}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Summer sale discount"
                  data-testid={isEdit ? "input-edit-description" : "input-description"}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="discountPercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Percent</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="1"
                    max="100"
                    placeholder="10"
                    data-testid={isEdit ? "input-edit-discount-percent" : "input-discount-percent"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxUses"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Uses (optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="1"
                    placeholder="100"
                    data-testid={isEdit ? "input-edit-max-uses" : "input-max-uses"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="validFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valid From (optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    data-testid={isEdit ? "input-edit-valid-from" : "input-valid-from"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valid Until (optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    data-testid={isEdit ? "input-edit-valid-until" : "input-valid-until"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {isEdit && (
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  value={field.value ? "active" : "inactive"}
                  onValueChange={(value) => field.onChange(value === "active")}
                >
                  <FormControl>
                    <SelectTrigger className="w-32" data-testid="select-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active" data-testid="select-item-active">Active</SelectItem>
                    <SelectItem value="inactive" data-testid="select-item-inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <DialogFooter>
          <Button 
            type="submit" 
            disabled={isEdit ? updateMutation.isPending : createMutation.isPending}
            data-testid={isEdit ? "button-update-coupon" : "button-submit-coupon"}
          >
            {isEdit 
              ? (updateMutation.isPending ? "Updating..." : "Update Coupon")
              : (createMutation.isPending ? "Creating..." : "Create Coupon")
            }
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  return (
    <DashboardLayout title="Discount Coupons">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                <CardTitle>Discount Coupons</CardTitle>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) form.reset();
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-coupon">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Coupon
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Coupon</DialogTitle>
                    <DialogDescription>Add a new discount coupon for students.</DialogDescription>
                  </DialogHeader>
                  <CouponForm />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !coupons || coupons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-coupons">
                No coupons created yet. Create your first coupon above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id} data-testid={`row-coupon-${coupon.id}`}>
                      <TableCell className="font-mono font-semibold" data-testid={`text-coupon-code-${coupon.id}`}>{coupon.code}</TableCell>
                      <TableCell data-testid={`text-coupon-discount-${coupon.id}`}>{coupon.discountPercent}%</TableCell>
                      <TableCell data-testid={`text-coupon-uses-${coupon.id}`}>
                        {coupon.usedCount || 0}
                        {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                      </TableCell>
                      <TableCell data-testid={`text-coupon-valid-${coupon.id}`}>
                        {coupon.validUntil
                          ? new Date(coupon.validUntil).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={coupon.isActive ? "default" : "secondary"} data-testid={`badge-coupon-status-${coupon.id}`}>
                          {coupon.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog open={editCoupon?.id === coupon.id} onOpenChange={(open) => {
                            if (!open) {
                              setEditCoupon(null);
                              form.reset();
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEdit(coupon)}
                                data-testid={`button-edit-coupon-${coupon.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Coupon</DialogTitle>
                                <DialogDescription>Update coupon details.</DialogDescription>
                              </DialogHeader>
                              <CouponForm isEdit />
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(coupon.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-coupon-${coupon.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
