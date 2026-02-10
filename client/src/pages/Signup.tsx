import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { signupSchema, type SignupInput, type UserWithCollege, type College, type University, type Major } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import { BRAND_NAME } from "@/lib/branding";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [otpStep, setOtpStep] = useState(false);
  const [pendingUserId, setPendingUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      universityId: 0,
      collegeId: 0,
      majorId: 0,
    },
  });

  const selectedUniversityId = form.watch("universityId");
  const selectedCollegeId = form.watch("collegeId");

  const { data: universities, isLoading: universitiesLoading } = useQuery<University[]>({
    queryKey: ["/api/universities"],
  });

  const { data: colleges, isLoading: collegesLoading } = useQuery<College[]>({
    queryKey: ["/api/universities", selectedUniversityId, "colleges"],
    queryFn: async () => {
      const res = await fetch(`/api/universities/${selectedUniversityId}/colleges`);
      if (!res.ok) throw new Error("Failed to fetch colleges");
      return res.json();
    },
    enabled: !!selectedUniversityId && selectedUniversityId > 0,
  });

  const { data: majorsData, isLoading: majorsLoading } = useQuery<Major[]>({
    queryKey: ["/api/majors", selectedCollegeId],
    queryFn: async () => {
      const res = await fetch(`/api/majors?collegeId=${selectedCollegeId}`);
      if (!res.ok) throw new Error("Failed to fetch majors");
      return res.json();
    },
    enabled: !!selectedCollegeId && selectedCollegeId > 0,
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupInput) => {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      return response.json() as Promise<{ status: string; userId: string }>;
    },
    onSuccess: (result) => {
      if (result.status === "pending_verification") {
        setPendingUserId(result.userId);
        setUserEmail(form.getValues("email"));
        setOtpCode("");
        setOtpError("");
        setOtpStep(true);
        toast({
          title: "Account created!",
          description: "Please check your email for the verification code.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Signup failed",
        description: error.message || "Could not create account",
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
        title: "Welcome!",
        description: `Welcome to ${BRAND_NAME}, ${user.firstName}!`,
      });
      setLocation("/dashboard");
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

  useEffect(() => {
    if (otpStep) {
      setResendCountdown(60);
    }
  }, [otpStep]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const onSubmit = (data: SignupInput) => {
    signupMutation.mutate(data);
  };

  const handleOtpSubmit = () => {
    if (otpCode.length !== 6) {
      setOtpError("Verification code must be 6 digits");
      return;
    }
    setOtpError("");
    verifyOtpMutation.mutate({ userId: String(pendingUserId), otp: String(otpCode) });
  };

  const handleBackToSignup = () => {
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
              {otpStep ? "Verify your email" : "Create an account"}
            </CardTitle>
            <CardDescription>
              {otpStep
                ? `We sent a verification code to ${userEmail}`
                : `Join ${BRAND_NAME} to access quality courses`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {otpStep ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signup-otp-input" className="text-sm font-medium leading-none">
                    Verification Code
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    id="signup-otp-input"
                    autoComplete="off"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    autoFocus
                    className="text-center text-lg tracking-widest"
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                      setOtpCode(val);
                      setOtpError("");
                    }}
                    data-testid="input-signup-otp"
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
                  data-testid="button-verify-signup-otp"
                >
                  {verifyOtpMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Continue"
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    disabled={resendCountdown > 0 || resendOtpMutation.isPending}
                    onClick={() => resendOtpMutation.mutate()}
                    className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-resend-signup-otp"
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
                  onClick={handleBackToSignup}
                  data-testid="button-back-to-signup"
                >
                  Back to signup
                </Button>
              </div>
            ) : (
              <>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John"
                                {...field}
                                data-testid="input-first-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Doe"
                                {...field}
                                data-testid="input-last-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+962XXXXXXXXX"
                              {...field}
                              data-testid="input-phone-number"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Min 8 chars, upper, lower, number, special"
                              {...field}
                              data-testid="input-password"
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
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Re-enter your password"
                              {...field}
                              data-testid="input-confirm-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="universityId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>University</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(parseInt(value, 10));
                              form.setValue("collegeId", 0);
                              form.setValue("majorId", 0);
                            }}
                            value={field.value ? String(field.value) : ""}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-university">
                                <SelectValue placeholder={universitiesLoading ? "Loading..." : "Select your university"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {universities?.map((uni) => (
                                <SelectItem key={uni.id} value={String(uni.id)}>
                                  {uni.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="collegeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>College</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(parseInt(value, 10));
                              form.setValue("majorId", 0);
                            }}
                            value={field.value ? String(field.value) : ""}
                            disabled={!selectedUniversityId || selectedUniversityId === 0}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-college">
                                <SelectValue placeholder={
                                  !selectedUniversityId || selectedUniversityId === 0
                                    ? "Select a university first"
                                    : collegesLoading
                                    ? "Loading..."
                                    : "Select your college"
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {colleges?.map((college) => (
                                <SelectItem key={college.id} value={String(college.id)}>
                                  {college.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="majorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Major</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value, 10))}
                            value={field.value ? String(field.value) : ""}
                            disabled={!selectedCollegeId || selectedCollegeId === 0}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-major">
                                <SelectValue placeholder={
                                  !selectedCollegeId || selectedCollegeId === 0
                                    ? "Select a college first"
                                    : majorsLoading
                                    ? "Loading..."
                                    : "Select your major"
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {majorsData?.map((major) => (
                                <SelectItem key={major.id} value={String(major.id)}>
                                  {major.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={signupMutation.isPending}
                      data-testid="button-signup"
                    >
                      {signupMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create account"
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                    Sign in
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
