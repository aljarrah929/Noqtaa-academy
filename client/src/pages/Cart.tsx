import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import { useCart } from "@/hooks/useCart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowLeft, ShoppingCart, Upload, FileCheck, Loader2, AlertCircle, Smartphone, Wallet, CreditCard } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const ALLOWED_EXTENSIONS = ".jpg, .jpeg, .png, .pdf";

export default function Cart() {
  const { cart, removeFromCart, clearCart, cartTotal } = useCart();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setUploadError(null);
    if (selected) {
      if (!ALLOWED_TYPES.includes(selected.type)) {
        setUploadError(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS}`);
        return;
      }
      if (selected.size > MAX_FILE_SIZE) {
        setUploadError("File too large. Maximum size is 10 MB.");
        return;
      }
      setFile(selected);
    }
  };

  const handleCheckout = async () => {
    if (!paymentMethod) {
      setUploadError("Please select a payment method");
      return;
    }
    if (paymentMethod !== "visa" && !file) {
      setUploadError("Please select a receipt file");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      let objectKey, mime, size;

      // 1. رفع الصورة مرة واحدة لكل السلة
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        // بنبعث أول كورس بس كـ reference للرفع
        formData.append("courseId", String(cart[0].id)); 

        const uploadRes = await fetch("/api/join-requests/upload-receipt", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!uploadRes.ok) throw new Error("Failed to upload file");
        const uploadData = await uploadRes.json();
        objectKey = uploadData.objectKey;
        mime = file.type;
        size = file.size;
      }

      // 2. إرسال طلب انضمام لكل كورس بالسلة بنفس الوصل
      // 2. إرسال طلب انضمام لكل كورس بالسلة بنفس الوصل
      for (const item of cart) {
        await apiRequest("POST", "/api/join-requests", {
          courseId: item.id,
          message: "Paid via Cart checkout",
          receiptKey: objectKey,
          receiptMime: mime,
          receiptSize: size,
          paymentMethod: paymentMethod,
          packageType: item.packageType || "all",
        });
        
        // 👇 هاد السطر السحري اللي بيمسح الذاكرة القديمة للكورس وبخليه يصير Pending
        queryClient.invalidateQueries({ queryKey: ["/api/join-requests/me", item.id] });
      }

      // مسح الذاكرة العامة للطلبات
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests/me"] });

      toast({
        title: "Order Submitted Successfully!",
        description: "Your payment receipt has been sent for all courses.",
      });

      clearCart();
      setLocation("/courses");

    } catch (error: any) {
      setUploadError(error.message || "Failed to process checkout");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingCart className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Your Cart</h1>
        </div>

        {cart.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">Looks like you haven't added any courses yet.</p>
              <Button asChild>
                <Link href="/courses">Explore Courses</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* قائمة الكورسات */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                      {item.packageLabel && <span className="text-sm text-muted-foreground">{item.packageLabel}</span>}
                      <span className="text-primary font-bold">{formatPrice(item.price)}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              <Button variant="ghost" asChild className="mt-4">
                <Link href="/courses"><ArrowLeft className="w-4 h-4 mr-2"/> Continue Shopping</Link>
              </Button>
            </div>

            {/* ملخص الطلب والدفع */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-lg font-bold border-b pb-4">
                    <span>Total:</span>
                    <span className="text-emerald-600">{formatPrice(cartTotal)}</span>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2 pt-2">
                    <Label>Payment Method *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Method" />
                      </SelectTrigger>
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

                  {(paymentMethod === "cliq" || paymentMethod === "zain_cash") && (
                    <div className="p-3 bg-muted rounded-md text-sm border">
                      <p className="font-semibold mb-1">Transfer {formatPrice(cartTotal)} to:</p>
                      {paymentMethod === "cliq" ? (
                        <p>CliQ Alias: <strong className="bg-background px-1 rounded">NOQTAA</strong></p>
                      ) : (
                        <p>Zain Cash: <strong className="bg-background px-1 rounded">0790000000</strong></p>
                      )}
                    </div>
                  )}

                  {(paymentMethod === "cliq" || paymentMethod === "zain_cash") && (
                     <div className="space-y-2">
                     <Label>Upload Receipt *</Label>
                     <div 
                       className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${file ? "border-green-500 bg-green-50" : "border-border"}`}
                       onClick={() => fileInputRef.current?.click()}
                     >
                       <input ref={fileInputRef} type="file" accept={ALLOWED_TYPES.join(",")} onChange={handleFileChange} className="hidden" />
                       {file ? (
                         <div className="flex flex-col items-center"><FileCheck className="w-8 h-8 text-green-500 mb-1" /><span className="text-sm font-medium">{file.name}</span></div>
                       ) : (
                         <div className="flex flex-col items-center"><Upload className="w-8 h-8 text-muted-foreground mb-1" /><span className="text-sm">Click to upload</span></div>
                       )}
                     </div>
                   </div>
                  )}

                  {uploadError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{uploadError}</AlertDescription></Alert>}

                  <Button className="w-full mt-4" size="lg" disabled={!paymentMethod || (paymentMethod !== "visa" && !file) || isUploading} onClick={handleCheckout}>
                    {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : "Confirm Checkout"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}