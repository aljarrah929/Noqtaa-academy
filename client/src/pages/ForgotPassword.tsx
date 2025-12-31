import { useState, useEffect } from "react";
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

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (submitted && cooldownSeconds > 0) {
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
  }, [submitted, cooldownSeconds]);

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordInput) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", data);
      return response.json();
    },
    onSuccess: (_, variables) => {
      setSubmittedEmail(variables.email);
      setSubmitted(true);
      setCooldownSeconds(60);
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      setIsResending(true);
      const response = await apiRequest("POST", "/api/auth/resend-forgot-password", { email: submittedEmail });
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
    resendMutation.mutate();
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
              {submitted ? "Check your email" : "Forgot password?"}
            </CardTitle>
            <CardDescription>
              {submitted
                ? "If an account exists with this email, we sent a password reset link."
                : "Enter your email and we'll send you a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  The link will expire in 30 minutes. If you don't see the email, check your spam folder.
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
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : cooldownSeconds > 0 ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Resend available in {cooldownSeconds}s
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Resend email
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Didn't receive the email? Wait for the countdown and try resending.
                  </p>
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setSubmitted(false);
                    setSubmittedEmail("");
                    setCooldownSeconds(60);
                    form.reset();
                  }}
                  data-testid="button-try-another"
                >
                  Try another email
                </Button>
                <Link href="/login" className="block">
                  <Button variant="ghost" className="w-full" data-testid="link-back-to-login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to login
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

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={forgotPasswordMutation.isPending}
                      data-testid="button-send-reset"
                    >
                      {forgotPasswordMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send reset link"
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center">
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-to-login">
                    <ArrowLeft className="w-4 h-4 inline mr-1" />
                    Back to login
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
