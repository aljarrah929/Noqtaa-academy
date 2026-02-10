import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { loginSchema, type LoginInput, type UserWithCollege } from "@shared/schema";
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
import { useTranslation } from "react-i18next";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [otpStep, setOtpStep] = useState(false);
  const [pendingUserId, setPendingUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const { t } = useTranslation();

  const searchParams = new URLSearchParams(window.location.search);
  const nextUrl = searchParams.get("next");

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
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
      setOtpCode("");
      setOtpError("");
      setOtpStep(true);
      toast({
        title: t("auth.codeSent"),
        description: t("auth.checkEmailForCode"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("auth.loginFailed"),
        description: error.message || t("auth.invalidCredentials"),
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { userId: string; otp: string }) => {
      const response = await apiRequest("POST", "/api/auth/verify-otp", data);
      return response.json() as Promise<UserWithCollege>;
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("auth.welcomeBackUser"),
        description: t("auth.loggedInAs", { name: `${user.firstName} ${user.lastName}` }),
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
        title: t("auth.verificationFailed"),
        description: error.message || t("auth.invalidCode"),
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
        title: t("auth.codeResent"),
        description: t("auth.newCodeSent"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("auth.resendFailed"),
        description: error.message || t("auth.unableToResend"),
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

  const handleOtpSubmit = () => {
    if (otpCode.length !== 6) {
      setOtpError(t("auth.codeMustBe6"));
      return;
    }
    setOtpError("");
    const payload = { userId: String(pendingUserId), otp: String(otpCode) };
    console.log("[OTP] Sending payload:", JSON.stringify(payload));
    verifyOtpMutation.mutate(payload);
  };

  const handleBackToLogin = () => {
    setOtpStep(false);
    setPendingUserId("");
    setUserEmail("");
    setResendCountdown(0);
    setOtpCode("");
    setOtpError("");
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
              {otpStep ? t("auth.verifyIdentity") : t("auth.welcomeBack")}
            </CardTitle>
            <CardDescription>
              {otpStep
                ? t("auth.codeSentTo", { email: userEmail })
                : t("auth.signInTo", { brand: BRAND_NAME })}
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
                        <FormLabel>{t("auth.email")}</FormLabel>
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
                        <FormLabel>{t("auth.password")}</FormLabel>
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

                  <div className="text-right rtl:text-left">
                    <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-forgot-password">
                      {t("auth.forgotPassword")}
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
                        <Loader2 className="w-4 h-4 ltr:mr-2 rtl:ml-2 animate-spin" />
                        {t("auth.sendingCode")}
                      </>
                    ) : (
                      t("auth.signIn")
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="otp-input-field" className="text-sm font-medium leading-none">
                    {t("auth.verificationCode")}
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    id="otp-input-field"
                    name="auth_otp_field_verify_v2"
                    autoComplete="off"
                    maxLength={6}
                    placeholder={t("auth.enterCode")}
                    autoFocus
                    className="text-center text-lg tracking-widest"
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                      setOtpCode(val);
                      setOtpError("");
                    }}
                    data-testid="input-otp"
                  />
                  {otpError && (
                    <p className="text-sm font-medium text-destructive">{otpError}</p>
                  )}
                </div>

                <Button
                  type="button"
                  className="w-full"
                  disabled={verifyOtpMutation.isPending}
                  onClick={handleOtpSubmit}
                  data-testid="button-verify-otp"
                >
                  {verifyOtpMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 ltr:mr-2 rtl:ml-2 animate-spin" />
                      {t("auth.verifying")}
                    </>
                  ) : (
                    t("auth.verifySignIn")
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
                      ? t("auth.sending")
                      : resendCountdown > 0
                        ? t("auth.resendCodeIn", { seconds: resendCountdown })
                        : t("auth.resendCode")}
                  </button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleBackToLogin}
                  data-testid="button-back-to-login"
                >
                  {t("auth.backToLogin")}
                </Button>
              </div>
            )}

            {!otpStep && (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {t("auth.noAccount")}{" "}
                <Link href="/signup" className="text-primary hover:underline" data-testid="link-signup">
                  {t("auth.signUp")}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
