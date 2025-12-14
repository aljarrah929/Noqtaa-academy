import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, KeyRound, CheckCircle, AlertCircle } from "lucide-react";
import { BRAND_NAME } from "@/lib/branding";

const resetFormSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetFormInput = z.infer<typeof resetFormSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(searchString);
  const token = params.get("token");

  const form = useForm<ResetFormInput>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetFormInput) => {
      const response = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      setSuccess(true);
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password.",
      });
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to reset password");
      toast({
        title: "Reset failed",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetFormInput) => {
    setError(null);
    resetPasswordMutation.mutate(data);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-md bg-destructive/10">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-2xl">Invalid reset link</CardTitle>
              <CardDescription>
                This password reset link is invalid or missing the token.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/forgot-password">
                <Button className="w-full" data-testid="button-request-new-link">
                  Request a new reset link
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-md bg-primary/10">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Password reset successful</CardTitle>
              <CardDescription>
                Your password has been updated. You can now log in with your new password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full" data-testid="button-go-to-login">
                  Go to login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-md bg-primary/10">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="At least 8 characters"
                          {...field}
                          data-testid="input-new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm your password"
                          {...field}
                          data-testid="input-confirm-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-reset-password"
                >
                  {resetPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset password"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
