import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { FileText, Check, X, Eye, Loader2 } from "lucide-react";

interface PurchaseRow {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  message: string | null;
  createdAt: string;
  fileTitle: string | null;
  filePrice: number | null;
  studentFirst: string | null;
  studentLast: string | null;
  studentEmail: string | null;
}

export default function AdminLibraryPurchases() {
  const { toast } = useToast();
  const [viewing, setViewing] = useState<number | null>(null);

  const { data: rows, isLoading } = useQuery<PurchaseRow[]>({
    queryKey: ["/api/library/purchases/all"],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "approve" | "reject" }) => {
      const res = await fetch(`/api/library/purchases/${id}/${action}`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("فشل تنفيذ العملية");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library/purchases/all"] });
      toast({ title: "تم" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const viewReceipt = async (id: number) => {
    setViewing(id);
    try {
      const res = await fetch(`/api/library/purchases/${id}/receipt`, { credentials: "include" });
      if (!res.ok) throw new Error("تعذّر فتح الإيصال");
      const data = await res.json();
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setViewing(null);
    }
  };

  const statusBadge = (s: string) => {
    if (s === "PENDING") return <Badge className="bg-amber-500">قيد المراجعة</Badge>;
    if (s === "APPROVED") return <Badge className="bg-green-600">مقبول</Badge>;
    return <Badge variant="destructive">مرفوض</Badge>;
  };

  return (
    <DashboardLayout title="طلبات شراء ملفات المكتبة">
      <div className="max-w-4xl mx-auto">
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        ) : !rows || rows.length === 0 ? (
          <Card className="py-12 border-dashed">
            <CardContent className="text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              لا توجد طلبات شراء.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium">{r.fileTitle || "ملف محذوف"}</p>
                      <p className="text-sm text-muted-foreground">
                        {[r.studentFirst, r.studentLast].filter(Boolean).join(" ")} • {r.studentEmail}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{r.filePrice ? `${r.filePrice} JOD` : "مجاناً"}</span>
                      {statusBadge(r.status)}
                    </div>
                  </div>
                  {r.message && <p className="text-sm bg-muted/40 rounded p-2">{r.message}</p>}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => viewReceipt(r.id)} disabled={viewing === r.id}>
                      {viewing === r.id ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Eye className="w-4 h-4 ml-1" />}
                      عرض الإيصال
                    </Button>
                    {r.status === "PENDING" && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700"
                          onClick={() => reviewMutation.mutate({ id: r.id, action: "approve" })}
                          disabled={reviewMutation.isPending}>
                          <Check className="w-4 h-4 ml-1" /> قبول
                        </Button>
                        <Button size="sm" variant="destructive"
                          onClick={() => reviewMutation.mutate({ id: r.id, action: "reject" })}
                          disabled={reviewMutation.isPending}>
                          <X className="w-4 h-4 ml-1" /> رفض
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}