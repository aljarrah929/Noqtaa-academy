import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { queryClient } from "@/lib/queryClient";
import {
  FileText, ArrowLeft, Lock, CheckCircle2, Clock, Upload, BookOpen, Loader2,
  Smartphone, Wallet, CreditCard, FileCheck,
} from "lucide-react";

interface FileDetail {
  id: number;
  title: string;
  description: string | null;
  price: number;
  fileSize: number;
  fileMime: string;
  coverImageUrl: string | null;
  courseTitle: string | null;
  teacherName: string;
  hasAccess: boolean;
  pendingPurchase: boolean;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export default function LibraryFileDetail() {
  const [, params] = useRoute("/library/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [paymentMethod, setPaymentMethod] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);

  const { data: file, isLoading } = useQuery<FileDetail>({
    queryKey: [`/api/library/${id}`],
    enabled: !!id,
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!paymentMethod) throw new Error(t("Teachers_profile.selectPaymentErr"));
      if (paymentMethod !== "visa" && !receipt) throw new Error(t("Teachers_profile.receiptErr"));
      const fd = new FormData();
      if (receipt) fd.append("receipt", receipt);
      fd.append("paymentMethod", paymentMethod);
      const res = await fetch(`/api/library/${id}/purchase`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || t("Teachers_profile.submitFailed"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/library/${id}`] });
      toast({ title: t("Teachers_profile.requestSent"), description: t("Teachers_profile.requestSentDesc") });
      setReceipt(null);
      setPaymentMethod("");
    },
    onError: (e: Error) => {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    },
  });

  // يفتح صفحة العارض الآمن بدل رابط الملف المباشر
  const openFile = () => {
    setLocation(`/library/${id}/read`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-40 mb-6" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t("Teachers_profile.fileNotFound")}</h2>
          <Button asChild>
            <Link href="/library"><ArrowLeft className="w-4 h-4 ml-2" /> {t("Teachers_profile.backToLibrary")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const sizeMB = (file.fileSize / 1024 / 1024).toFixed(2);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/library">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 ml-2" /> {t("Teachers_profile.backToLibrary")}
          </Button>
        </Link>

        <Card className="overflow-hidden">
          {/* صورة الغلاف لو موجودة */}
          {file.coverImageUrl && (
            <div className="w-full aspect-[16/7] bg-muted overflow-hidden">
              <img src={file.coverImageUrl} alt={file.title} className="w-full h-full object-cover" />
            </div>
          )}

          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl mb-1">{file.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {file.teacherName}{file.courseTitle ? ` ${t("Teachers_profile.Linked")} ${file.courseTitle}` : ""} • {sizeMB} MB
                </p>
              </div>
              <Badge variant="secondary">PDF</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {file.description || t("Teachers_profile.noDescription")}
            </p>

            <div className="border-t pt-6">
              {/* الحالة 1: عنده وصول → زر قراءة */}
              {file.hasAccess ? (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">{t("Teachers_profile.availableToYou")}</span>
                  </div>
                  <Button size="lg" className="w-full" onClick={openFile}>
                    <BookOpen className="w-5 h-5 ml-2" />
                    {t("Teachers_profile.readFile")}
                  </Button>
                </div>

              /* الحالة 2: غير مسجّل دخول */
              ) : !isAuthenticated ? (
                <div className="text-center space-y-3">
                  <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">{t("Teachers_profile.loginToAccess")}</p>
                  <Button asChild><Link href="/login">{t("Teachers_profile.login")}</Link></Button>
                </div>

              /* الحالة 3: ليس طالباً */
              ) : user?.role !== "STUDENT" ? (
                <div className="text-center text-muted-foreground">
                  {t("Teachers_profile.notStudent")}
                </div>

              /* الحالة 4: طلب قيد المراجعة */
              ) : file.pendingPurchase ? (
                <div className="text-center space-y-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg p-6 border border-amber-200 dark:border-amber-800">
                  <Clock className="w-10 h-10 mx-auto text-amber-600" />
                  <p className="font-medium text-amber-800 dark:text-amber-300">{t("Teachers_profile.pendingTitle")}</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">{t("Teachers_profile.pendingDesc")}</p>
                </div>

              /* الحالة 5: شراء — بطرق الدفع زي السلة */
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-primary/5 rounded-lg p-4">
                    <span className="font-medium">{t("Teachers_profile.filePrice")}</span>
                    <span className="font-bold text-primary text-xl">
                      {file.price > 0 ? `${file.price} JOD` : t("Teachers_profile.free")}
                    </span>
                  </div>

                  {/* طريقة الدفع */}
                  <div className="space-y-2">
                    <Label>{t("Teachers_profile.paymentMethod")}</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue placeholder={t("Teachers_profile.selectPayment")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cliq">
                          <div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-purple-600" /><span>CliQ Transfer</span></div>
                        </SelectItem>
                        <SelectItem value="zain_cash">
                          <div className="flex items-center gap-2"><Wallet className="w-4 h-4 text-red-600" /><span>Zain Cash</span></div>
                        </SelectItem>
                        <SelectItem value="visa">
                          <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-600" /><span>Visa (Coming Soon)</span></div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* تعليمات التحويل */}
                  {(paymentMethod === "cliq" || paymentMethod === "zain_cash") && (
                    <div className="p-3 bg-muted rounded-md text-sm border">
                      <p className="font-semibold mb-1">{t("Teachers_profile.transferTo", { price: file.price })}</p>
                      {paymentMethod === "cliq" ? (
                        <p>CliQ Alias: <strong className="bg-background px-1 rounded">NOQTAA</strong></p>
                      ) : (
                        <p>Zain Cash: <strong className="bg-background px-1 rounded">0790000000</strong></p>
                      )}
                    </div>
                  )}

                  {/* رفع الإيصال */}
                  {(paymentMethod === "cliq" || paymentMethod === "zain_cash") && (
                    <div className="space-y-2">
                      <Label>{t("Teachers_profile.receiptLabel")}</Label>
                      <Input
                        type="file"
                        accept={ALLOWED_TYPES.join(",")}
                        onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                      />
                      {receipt && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <FileCheck className="w-3 h-3" /> {receipt.name}
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => purchaseMutation.mutate()}
                    disabled={!paymentMethod || (paymentMethod !== "visa" && !receipt) || purchaseMutation.isPending}
                  >
                    {purchaseMutation.isPending
                      ? <><Loader2 className="w-5 h-5 ml-2 animate-spin" /> {t("Teachers_profile.sending")}</>
                      : <><Upload className="w-5 h-5 ml-2" /> {t("Teachers_profile.submitPurchase")}</>}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    {t("Teachers_profile.enrolledFree")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}