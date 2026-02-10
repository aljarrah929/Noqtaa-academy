import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Copy, Check, Upload, Camera, Loader2 } from "lucide-react";
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: t("common.error"), description: t("profile.invalidFileType"), variant: "destructive" });
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast({ title: t("common.error"), description: t("profile.fileTooLarge"), variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Step 1: Get presigned URL
      let presignData: { uploadUrl: string; fileUrl: string };
      try {
        const presignRes = await apiRequest("POST", "/api/profile/avatar/presign", {
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        });
        if (!presignRes.ok) {
          const errorData = await presignRes.json().catch(() => ({}));
          console.error("Presign failed:", presignRes.status, errorData);
          throw new Error(errorData.message || "Failed to get upload URL");
        }
        presignData = await presignRes.json();
      } catch (err) {
        console.error("Presign error:", err);
        toast({ title: "Presign Failed", description: err instanceof Error ? err.message : "Could not prepare upload.", variant: "destructive" });
        return;
      }

      // Step 2: Upload to R2
      try {
        const uploadRes = await fetch(presignData.uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadRes.ok) {
          console.error("R2 upload failed:", uploadRes.status, await uploadRes.text().catch(() => ""));
          throw new Error(`Upload failed with status ${uploadRes.status}`);
        }
      } catch (err) {
        console.error("R2 upload error:", err);
        toast({ title: "Upload to R2 Failed", description: err instanceof Error ? err.message : "Could not upload file.", variant: "destructive" });
        return;
      }

      // Step 3: Confirm upload
      try {
        const confirmRes = await apiRequest("POST", "/api/profile/avatar/confirm", { fileUrl: presignData.fileUrl });
        if (!confirmRes.ok) {
          const errorData = await confirmRes.json().catch(() => ({}));
          console.error("Confirm failed:", confirmRes.status, errorData);
          throw new Error(errorData.message || "Failed to save avatar");
        }
      } catch (err) {
        console.error("Confirm error:", err);
        toast({ title: "Confirm Failed", description: err instanceof Error ? err.message : "Could not save avatar.", variant: "destructive" });
        return;
      }
      
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t("profile.avatarUpdated"), description: t("profile.avatarUpdatedDesc") });
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast({ title: t("common.error"), description: t("profile.avatarUploadFailed"), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  if (isLoading) {
    return (
      <DashboardLayout title={t("profile.title")}>
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t("profile.title")}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.profilePicture")}</CardTitle>
            <CardDescription>{t("profile.uploadPhotoDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
                <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
              </Avatar>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
                data-testid="input-avatar-file"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                data-testid="button-upload-avatar"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 ltr:mr-2 rtl:ml-2 animate-spin" />
                    {t("profile.uploading")}
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                    {t("profile.uploadPhoto")}
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, JPEG or WebP. Max 2MB.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Public ID Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.myId")}</CardTitle>
            <CardDescription>{t("profile.uniqueIdDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg font-mono px-4 py-2">
                {user?.publicId || t("profile.notAssigned")}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyPublicId}
              disabled={!user?.publicId}
              data-testid="button-copy-id"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {t("profile.copied")}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {t("profile.copyId")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Account Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.accountInfo")}</CardTitle>
            <CardDescription>{t("profile.accountInfo")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-sm">{t("profile.name")}</Label>
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">{t("profile.email")}</Label>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">{t("profile.role")}</Label>
                <Badge variant="secondary">{user?.role}</Badge>
              </div>
              {user?.college && (
                <div>
                  <Label className="text-muted-foreground text-sm">{t("profile.collegeName")}</Label>
                  <p className="font-medium">{user.college.name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Phone Number Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.phoneNumber")}</CardTitle>
            <CardDescription>{t("profile.phoneDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePhoneUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone-number">{t("profile.phoneNumber")}</Label>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="+962XXXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  data-testid="input-phone-number"
                />
              </div>
              <Button
                type="submit"
                disabled={phoneMutation.isPending || !phoneNumber.trim()}
                data-testid="button-update-phone"
              >
                {phoneMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ltr:mr-2 rtl:ml-2 animate-spin" />
                    {t("profile.saving")}
                  </>
                ) : (
                  t("profile.savePhone")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.changePassword")}</CardTitle>
            <CardDescription>{t("profile.updatePassword")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("profile.newPassword")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("profile.confirmNewPassword")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="input-confirm-password"
                />
              </div>
              <Button
                type="submit"
                disabled={passwordMutation.isPending || !newPassword || !confirmPassword}
                data-testid="button-update-password"
              >
                {passwordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ltr:mr-2 rtl:ml-2 animate-spin" />
                    {t("profile.updating")}
                  </>
                ) : (
                  t("profile.updatePasswordBtn")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
