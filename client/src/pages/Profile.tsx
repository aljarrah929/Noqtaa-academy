import { useState, useRef } from "react";
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

export default function Profile() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: user, isLoading } = useQuery<UserWithCollege>({
    queryKey: ["/api/auth/user"],
  });

  const copyPublicId = async () => {
    if (user?.publicId) {
      try {
        await navigator.clipboard.writeText(user.publicId);
        setCopied(true);
        toast({ title: "Copied!", description: "Your ID has been copied to clipboard." });
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast({ title: "Failed to copy", variant: "destructive" });
      }
    }
  };

  const passwordMutation = useMutation({
    mutationFn: async (data: { newPassword: string; confirmPassword: string }) => {
      const res = await apiRequest("POST", "/api/profile/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    passwordMutation.mutate({ newPassword, confirmPassword });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Error", description: "Only PNG, JPG, JPEG, and WebP files are allowed.", variant: "destructive" });
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast({ title: "Error", description: "File size must be less than 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Get presigned URL
      const presignRes = await apiRequest("POST", "/api/profile/avatar/presign", {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
      const { uploadUrl, fileUrl } = await presignRes.json();

      // Upload to R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      // Confirm upload
      await apiRequest("POST", "/api/profile/avatar/confirm", { fileUrl });
      
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Avatar Updated", description: "Your profile picture has been updated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload avatar.", variant: "destructive" });
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
      <DashboardLayout title="Profile">
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
    <DashboardLayout title="Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>Upload a photo to personalize your account</CardDescription>
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
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Upload Photo
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
            <CardTitle>My ID</CardTitle>
            <CardDescription>Your unique identifier on this platform</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg font-mono px-4 py-2">
                {user?.publicId || "Not assigned"}
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
                  <Check className="w-4 h-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy ID
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Account Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-sm">Name</Label>
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Email</Label>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Role</Label>
                <Badge variant="secondary">{user?.role}</Badge>
              </div>
              {user?.college && (
                <div>
                  <Label className="text-muted-foreground text-sm">College</Label>
                  <p className="font-medium">{user.college.name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Change Password Section */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
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
                <Label htmlFor="confirm-password">Confirm New Password</Label>
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
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
