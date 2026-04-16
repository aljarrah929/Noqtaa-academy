import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseCard, CourseCardSkeleton } from "@/components/courses/CourseCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, BookOpen, Users, Award, ArrowRight, Building2, Trophy, Star, Target, type LucideIcon } from "lucide-react";
import type { CourseWithRelations, College, FeaturedProfile } from "@shared/schema";
import { BRAND_NAME, BRAND_COPYRIGHT } from "@/lib/branding";
import { useTranslation } from "react-i18next";
import logoUrl from "@/assets/logo.png";

const heroImages = [
  { src: "/images/hero-pharmacy.png", alt: "Pharmacy" },
  { src: "/images/hero-engineering.png", alt: "Engineering" },
  { src: "/images/hero-it.png", alt: "IT" },
  { src: "/images/flag.png" },
];

// مكون النجمة السباعية الأردنية لاستخدامه في التصميم
const JordanianStar = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5L58.5 35L89.5 28L72 54L96 76L65 74L50 95L35 74L4 76L28 54L10.5 28L41.5 35L50 5Z" />
  </svg>
);

export default function Landing() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useTranslation();

  const { data: courses, isLoading: coursesLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/courses", "featured"],
  });

  const { data: colleges, isLoading: collegesLoading } = useQuery<College[]>({
    queryKey: ["/api/colleges"],
  });

  const { data: featuredProfiles, isLoading: profilesLoading } = useQuery<FeaturedProfile[]>({
    queryKey: ["/api/featured-profiles"],
  });

  const { data: publicStats, isLoading: statsLoading } = useQuery<{
    totalCourses: number;
    totalStudents: number;
    totalTeachers: number;
    totalColleges: number;
  }>({
    queryKey: ["/api/public-stats"],
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const stats = publicStats ? [
    { icon: BookOpen, label: t("landing.qualityCourses"), value: String(publicStats.totalCourses) },
    { icon: Users, label: t("landing.activeStudents"), value: String(publicStats.totalStudents) },
    { icon: GraduationCap, label: t("landing.expertTeachers"), value: String(publicStats.totalTeachers) },
    { icon: Award, label: t("landing.collegesLabel"), value: String(publicStats.totalColleges) },
  ] : [
    { icon: BookOpen, label: t("landing.qualityCourses"), value: "..." },
    { icon: Users, label: t("landing.activeStudents"), value: "..." },
    { icon: GraduationCap, label: t("landing.expertTeachers"), value: "..." },
    { icon: Award, label: t("landing.collegesLabel"), value: "..." },
  ];

  const featuredCourses = courses?.slice(0, 3) || [];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getCollegeGradient = (slug: string) => {
    switch (slug) {
      case "pharmacy": return "from-emerald-500 to-emerald-700";
      case "engineering": return "from-blue-500 to-blue-700";
      case "it": return "from-purple-500 to-purple-700";
      default: return "from-primary to-primary/80";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[500px] md:min-h-[600px]">
        {heroImages.map((image, index) => (
          <div
            key={image.src}
            className="absolute inset-0 transition-opacity duration-[800ms] ease-in-out"
            style={{ opacity: currentSlide === index ? 1 : 0 }}
          >
            <img src={image.src} alt={image.alt} className="w-full h-full object-cover" />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32 flex flex-col justify-center min-h-[500px] md:min-h-[600px]">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm">
              {BRAND_NAME}
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-white">
              {t("landing.heroTitle")}
              <span className="block text-[#FCF6BA] mt-2 drop-shadow-md">{t("landing.heroSubtitle")}</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              {t("landing.heroDescription")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="bg-[#B38728] hover:bg-[#AA771C] text-white border-none">
                <Link href="/courses">
                  {t("landing.browseCourses")}
                  <ArrowRight className="w-5 h-5 ltr:ml-2 rtl:mr-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Link href="/login">{t("landing.getStarted")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Jordanian Heritage Divider */}
      <div className="relative py-4 flex items-center justify-center bg-background">
        <div className="absolute inset-0 flex items-center px-4 md:px-20">
          <div className="w-full border-t border-[#B38728]/30"></div>
        </div>
        <div className="relative bg-background px-4">
          <JordanianStar className="w-10 h-10 text-[#B38728]" />
        </div>
      </div>

      {/* Stats Section with Jordanian Pattern Background */}
      <section className="relative py-16 bg-muted/30 overflow-hidden">
        {/* Background Watermark Stars */}
        <JordanianStar className="absolute -left-10 -top-10 w-64 h-64 text-[#B38728] opacity-[0.03] rotate-12" />
        <JordanianStar className="absolute -right-10 -bottom-10 w-64 h-64 text-[#B38728] opacity-[0.03] -rotate-12" />

        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {statsLoading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <Skeleton className="w-12 h-12 rounded-full mx-auto mb-3" />
                  <Skeleton className="h-8 w-16 mx-auto mb-1" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                </div>
              ))
            ) : (
              stats.map((stat, i) => (
                <div key={i} className="text-center group">
                  <div className="w-14 h-14 rounded-full bg-[#B38728]/10 flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110">
                    <stat.icon className="w-7 h-7 text-[#B38728]" />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold mb-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Colleges Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("landing.ourColleges")}</h2>
            <div className="w-20 h-1 bg-[#B38728] mx-auto mb-4 rounded-full"></div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("landing.ourCollegesDesc")}
            </p>
          </div>
          
          {collegesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-48"><CardContent className="h-full flex items-center justify-center"><div className="animate-pulse w-full h-full bg-muted rounded-lg" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {colleges?.map((college) => (
                <Card key={college.id} className="overflow-hidden hover-elevate group border-none shadow-md">
                  <div className={`h-24 bg-gradient-to-r ${getCollegeGradient(college.slug)} flex items-center justify-center`}>
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                      <Building2 className="w-8 h-8" />
                    </div>
                  </div>
                  <CardContent className="p-6 text-center">
                    <h3 className="text-xl font-semibold mb-2">{college.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("landing.exploreCourses", { college: college.name })}
                    </p>
                    <Button variant="outline" size="sm" asChild className="border-[#B38728] text-[#B38728] hover:bg-[#B38728] hover:text-white">
                      <Link href={`/courses?college=${college.slug}`}>
                        {t("landing.viewCourses")}
                        <ArrowRight className="w-4 h-4 ltr:ml-1 rtl:mr-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-20 bg-muted/30 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">{t("landing.featuredCourses")}</h2>
              <p className="text-muted-foreground">{t("landing.popularCourses")}</p>
            </div>
            <Button variant="outline" asChild className="hidden md:flex border-[#B38728] text-[#B38728]">
              <Link href="/courses">
                {t("landing.viewAll")}
                <ArrowRight className="w-4 h-4 ltr:ml-2 rtl:mr-2" />
              </Link>
            </Button>
          </div>
          
          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)}
            </div>
          ) : featuredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCourses.map((course) => (
                <CourseCard key={course.id} course={course} actionHref={`/courses/${course.id}`} />
              ))}
            </div>
          ) : (
            <Card className="py-12"><CardContent className="text-center"><BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-medium text-lg mb-2">{t("landing.noCoursesYet")}</h3><p className="text-muted-foreground">{t("landing.checkBackSoon")}</p></CardContent></Card>
          )}
        </div>
      </section>

      {/* Team Section */}
      {(profilesLoading || (featuredProfiles && featuredProfiles.length > 0)) && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("landing.platformTeam")}</h2>
              <div className="w-20 h-1 bg-[#B38728] mx-auto mb-4 rounded-full"></div>
              <p className="text-muted-foreground max-w-2xl mx-auto">{t("landing.platformTeamDesc")}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProfiles?.map((profile) => (
                <Card key={profile.id} className="p-6 hover:shadow-lg transition-shadow border-t-4 border-t-[#B38728]">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="w-24 h-24 mb-4 ring-2 ring-[#B38728]/20">
                      <AvatarImage src={profile.imageUrl || undefined} alt={profile.name} />
                      <AvatarFallback className="text-xl bg-[#B38728]/10 text-[#B38728]">{getInitials(profile.name)}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-lg mb-1">{profile.name}</h3>
                    {profile.title && <p className="text-sm text-[#B38728] font-medium mb-3">{profile.title}</p>}
                    {profile.bio && <p className="text-sm text-muted-foreground line-clamp-3 italic">"{profile.bio}"</p>}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt={BRAND_NAME} className="w-12 h-12 object-contain" />
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight">{BRAND_NAME}</span>
                <span className="text-[10px] text-[#B38728] font-bold tracking-[0.2em] uppercase">Jordanian Excellence</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {BRAND_COPYRIGHT}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}