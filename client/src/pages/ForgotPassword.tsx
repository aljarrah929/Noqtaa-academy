import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
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
import { GraduationCap, Loader2, ArrowLeft, Mail, CheckCircle, RefreshCw } from "lucide-react";
import { BRAND_NAME } from "@/lib/branding";
import { useTranslation } from "react-i18next";

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const submittedEmailRef = useRef<string>("");
  const { t } = useTranslation();

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldownSeconds > 0) {
      interval = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordInput) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      submittedEmailRef.current = variables.email;
      setSubmitted(true);
      if (data.cooldownRemaining) {
        setCooldownSeconds(data.cooldownRemaining);
      } else {
        setCooldownSeconds(60);
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!submittedEmailRef.current) {
        throw new Error("No email to resend to");
      }
      setIsResending(true);
      const response = await apiRequest("POST", "/api/auth/resend-forgot-password", { 
        email: submittedEmailRef.current 
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsResending(false);
      if (data.cooldownRemaining) {
        setCooldownSeconds(data.cooldownRemaining);
      } else {
        setCooldownSeconds(60);
      }
    },
    onError: () => {
      setIsResending(false);
    },
  });

  const onSubmit = (data: ForgotPasswordInput) => {
    forgotPasswordMutation.mutate(data);
  };

  const handleResend = () => {
    if (submittedEmailRef.current) {
      resendMutation.mutate();
    }
  };

  const handleTryAnother = () => {
    setSubmitted(false);
    submittedEmailRef.current = "";
    setCooldownSeconds(0);
    form.reset();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-md bg-primary/10">
                {submitted ? (
                  <CheckCircle className="w-8 h-8 text-primary" />
                ) : (
                  <Mail className="w-8 h-8 text-primary" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {submitted ? t("auth.checkEmail") : t("auth.forgotPasswordTitle")}
            </CardTitle>
            <CardDescription>
              {submitted
                ? t("auth.checkEmailDesc")
                : t("auth.forgotPasswordDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  {t("auth.linkExpiry")}
                </p>
                
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleResend}
                    disabled={cooldownSeconds > 0 || isResending}
                    data-testid="button-resend-email"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="w-4 h-4 ltr:mr-2 rtl:ml-2 animate-spin" />
                        {t("auth.sending")}
                      </>
                    ) : cooldownSeconds > 0 ? (
                      <>
                        <RefreshCw className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                        {t("auth.resendAvailableIn", { seconds: cooldownSeconds })}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                        {t("auth.resendEmail")}
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    {t("auth.didntReceive")}
                  </p>
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleTryAnother}
                  data-testid="button-try-another"
                >
                  {t("auth.tryAnotherEmail")}
                </Button>
                <Link href="/login" className="block">
                  <Button variant="ghost" className="w-full" data-testid="link-back-to-login">
                    <ArrowLeft className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                    {t("auth.backToLogin")}
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
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

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={forgotPasswordMutation.isPending}
                      data-testid="button-send-reset"
                    >
                      {forgotPasswordMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 ltr:mr-2 rtl:ml-2 animate-spin" />
                          {t("auth.sending")}
                        </>
                      ) : (
                        t("auth.sendResetLink")
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center">
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-to-login">
                    <ArrowLeft className="w-4 h-4 inline ltr:mr-1 rtl:ml-1" />
                    {t("auth.backToLogin")}
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
