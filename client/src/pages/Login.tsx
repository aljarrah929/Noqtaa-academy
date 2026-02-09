import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { loginSchema, verifyOtpSchema, type LoginInput, type VerifyOtpInput, type UserWithCollege } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import { BRAND_NAME } from "@/lib/branding";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [otpStep, setOtpStep] = useState(false);
  const [pendingUserId, setPendingUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const searchParams = new URLSearchParams(window.location.search);
  const nextUrl = searchParams.get("next");

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const otpForm = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      userId: "",
      otp: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json() as Promise<{ requireOtp: boolean; userId: string }>;
    },
    onSuccess: (result) => {
      setPendingUserId(result.userId);
      setUserEmail(loginForm.getValues("email"));
      otpForm.setValue("userId", result.userId);
      setOtpStep(true);
      toast({
        title: "Verification code sent",
        description: "Check your email for the 6-digit code",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: VerifyOtpInput) => {
      const response = await apiRequest("POST", "/api/auth/verify-otp", data);
      return response.json() as Promise<UserWithCollege>;
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome back!",
        description: `Logged in as ${user.firstName} ${user.lastName}`,
      });

      if (nextUrl) {
        setLocation(nextUrl);
        return;
      }

      switch (user.role) {
        case "SUPER_ADMIN":
        case "ADMIN":
          setLocation("/admin");
          break;
        case "TEACHER":
          setLocation("/teacher");
          break;
        default:
          setLocation("/dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid or expired code",
        variant: "destructive",
      });
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/resend-otp", { userId: pendingUserId });
      return response.json();
    },
    onSuccess: () => {
      setResendCountdown(60);
      toast({
        title: "Code resent",
        description: "A new verification code has been sent to your email",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Resend failed",
        description: error.message || "Unable to resend code",
        variant: "destructive",
      });
    },
  });

  const startResendTimer = useCallback(() => {
    setResendCountdown(60);
  }, []);

  useEffect(() => {
    if (otpStep) {
      startResendTimer();
    }
  }, [otpStep, startResendTimer]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const onLoginSubmit = (data: LoginInput) => {
    loginMutation.mutate(data);
  };

  const onOtpSubmit = (data: VerifyOtpInput) => {
    verifyOtpMutation.mutate(data);
  };

  const handleBackToLogin = () => {
    setOtpStep(false);
    setPendingUserId("");
    setUserEmail("");
    setResendCountdown(0);
    otpForm.reset();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-md bg-primary/10">
                {otpStep ? (
                  <ShieldCheck className="w-8 h-8 text-primary" />
                ) : (
                  <GraduationCap className="w-8 h-8 text-primary" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {otpStep ? "Verify your identity" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {otpStep
                ? `We sent a verification code to ${userEmail}`
                : `Sign in to your ${BRAND_NAME} account`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!otpStep ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            {...field}
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Your password"
                            {...field}
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="text-right">
                    <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-forgot-password">
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending code...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="Enter 6-digit code"
                            autoFocus
                            autoComplete="one-time-code"
                            className="text-center text-lg tracking-widest"
                            value={field.value}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                              field.onChange(val);
                              otpForm.clearErrors("otp");
                            }}
                            onBlur={field.onBlur}
                            name="otp"
                            ref={field.ref}
                            data-testid="input-otp"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={verifyOtpMutation.isPending}
                    data-testid="button-verify-otp"
                  >
                    {verifyOtpMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Sign in"
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      disabled={resendCountdown > 0 || resendOtpMutation.isPending}
                      onClick={() => resendOtpMutation.mutate()}
                      className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="button-resend-otp"
                    >
                      {resendOtpMutation.isPending
                        ? "Sending..."
                        : resendCountdown > 0
                          ? `Resend code in ${resendCountdown}s`
                          : "Resend code"}
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleBackToLogin}
                    data-testid="button-back-to-login"
                  >
                    Back to login
                  </Button>
                </form>
              </Form>
            )}

            {!otpStep && (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary hover:underline" data-testid="link-signup">
                  Sign up
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
