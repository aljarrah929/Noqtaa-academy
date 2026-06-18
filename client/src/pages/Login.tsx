import { useState } from "react";
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
import { GraduationCap, Loader2 } from "lucide-react";
import { BRAND_NAME } from "@/lib/branding";
import { useTranslation } from "react-i18next";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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

      // التوجيه بناءً على الصلاحيات
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
        title: t("auth.loginFailed"),
        description: error.message || t("auth.invalidCredentials"),
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: LoginInput) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-md bg-primary/10">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {t("auth.welcomeBack")}
            </CardTitle>
            <CardDescription>
              {t("auth.signInTo", { brand: BRAND_NAME })}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      {t("auth.signingIn")} 
                    </>
                  ) : (
                    t("auth.signIn")
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link href="/signup" className="text-primary hover:underline" data-testid="link-signup">
                {t("auth.signUp")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}