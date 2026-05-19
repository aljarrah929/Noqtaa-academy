import { useState, useRef, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Area } from "react-easy-crop";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Copy, Check, Camera, Loader2, X } from "lucide-react";
import { getCroppedImg } from "@/lib/cropImage";
import type { UserWithCollege } from "@shared/schema";
import { useTranslation } from "react-i18next";

export default function Profile() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const { t } = useTranslation();

  // إعدادات الـ Cropper
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const { data: user, isLoading } = useQuery<UserWithCollege>({
    queryKey: ["/api/auth/user"],
  });

  const copyPublicId = async () => {
    if (user?.publicId) {
      try {
        await navigator.clipboard.writeText(user.publicId);
        setCopied(true);
        toast({ title: t("profile.copied"), description: t("profile.copiedDesc") });
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast({ title: t("profile.copyFailed"), variant: "destructive" });
      }
    }
  };

  useEffect(() => {
    if (user?.phoneNumber) {
      setPhoneNumber(user.phoneNumber);
    }
  }, [user?.phoneNumber]);

  const phoneMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string }) => {
      const res = await apiRequest("PATCH", "/api/profile/phone", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t("profile.phoneUpdated"), description: t("profile.phoneUpdatedDesc") });
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const handlePhoneUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    phoneMutation.mutate({ phoneNumber });
  };

  const passwordMutation = useMutation({
    mutationFn: async (data: { newPassword: string; confirmPassword: string }) => {
      const res = await apiRequest("POST", "/api/profile/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("profile.passwordUpdated"), description: t("profile.passwordUpdatedDesc") });
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: t("common.error"), description: t("profile.passwordsNoMatch"), variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: t("common.error"), description: t("profile.passwordMin8"), variant: "destructive" });
      return;
    }
    passwordMutation.mutate({ newPassword, confirmPassword });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: t("common.error"), description: t("profile.invalidFileType"), variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result as string));
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);
    setImageSrc(null);

    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      const formData = new FormData();
      formData.append("avatar", croppedFile);

      const response = await fetch("/api/profile/avatar/upload", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Failed to upload avatar");

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t("profile.avatarUpdated"), description: t("profile.avatarUpdatedDesc") });
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  if (isLoading) return <DashboardLayout title={t("profile.title")}><div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout title={t("profile.title")}>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader><CardTitle>{t("profile.profilePicture")}</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-6">
            <Avatar className="h-24 w-24"><AvatarImage src={user?.profileImageUrl ?? undefined} /><AvatarFallback>{getInitials()}</AvatarFallback></Avatar>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Camera className="mr-2 h-4 w-4" /> {t("profile.uploadPhoto")}</Button>
          </CardContent>
        </Card>

        {/* بقية كود الـ UI الخاص بـ ID ومعلومات الحساب وكلمة السر كما هي */}
        {/* ... */}
      </div>

      {imageSrc && (
        <div className="fixed inset-0 z-50 bg-black/90 p-4 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-lg aspect-square overflow-hidden rounded-full">
  <Cropper 
    image={imageSrc} 
    crop={crop} 
    zoom={zoom} 
    aspect={1} 
    onCropChange={setCrop} 
    onZoomChange={setZoom} 
    onCropComplete={onCropComplete} 
    cropShape="round"
    // ضفنا هدول الخصائص عشان يضمن الـ Cropper يملأ الدائرة بشكل صحيح
    style={{ containerStyle: { width: '100%', height: '100%', position: 'relative' } }}
  />
</div>
          <div className="mt-4 w-full max-w-lg flex flex-col gap-2">
            <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(v) => setZoom(v[0])} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setImageSrc(null)}>إلغاء</Button>
              <Button onClick={handleCropSave} disabled={uploading}>{uploading ? <Loader2 className="animate-spin" /> : "حفظ"}</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}