import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseCard, CourseCardSkeleton } from "@/components/courses/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, BookOpen, Users, Award, ArrowRight, Building2, Trophy, Star, Target, type LucideIcon } from "lucide-react";
import type { CourseWithRelations, College, FeaturedProfile } from "@shared/schema";
import { BRAND_NAME, BRAND_COPYRIGHT } from "@/lib/branding";
import { useTranslation } from "react-i18next";
import pic1 from "@/assets/pic1.png";
import pic2 from "@/assets/pic2.png";
import pic3 from "@/assets/pic3.png";
import pic4 from "@/assets/pic4.png";
import pic5 from "@/assets/pic5.png";
import pic6 from "@/assets/pic6.png";
import pic7 from "@/assets/pic7.png";
import logoUrl from "@/assets/logo.png";
import logoDarkUrl from "@/assets/logo-dark.png";

const heroImages = [
  { src: pic1, alt: "Noqtaa" },
  { src: pic2, alt: "Noqtaa" },
  { src: pic3, alt: "Noqtaa" },
  { src: pic4, alt: "Noqtaa" },
  { src: pic5, alt: "Noqtaa" },
  { src: pic6, alt: "Noqtaa" },
  { src: pic7, alt: "Noqtaa" },
];

const iconMap: Record<string, LucideIcon> = {
  BookOpen, Users, GraduationCap, Award, Building2, Trophy, Star, Target,
};

// =====================
// TeamCarousel Component
// =====================
const RING_COLORS = ["#2d6a4f", "#c1440e", "#1b4332", "#8b1a6b", "#1a3a8b", "#c17a0e", "#1b4332"];

function TeamCarousel({ profiles }: { profiles: FeaturedProfile[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const isRTL = (text: string) => /[\u0600-\u06FF]/.test(text);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
      {profiles.map((profile, index) => {
        const isActive = activeIndex === index;
        const textDir = isRTL(profile.name) ? "rtl" : "ltr";

        return (
          <div
            key={profile.id}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            className="relative rounded-2xl overflow-hidden shadow-md"
            style={{
              height: "280px",
              backgroundColor: "#1a1a2e",
              cursor: "default",
            }}
            data-testid={`card-team-member-${profile.id}`}
          >
            {/* صورة الخلفية */}
            {profile.imageUrl ? (
              <img
                src={profile.imageUrl}
                alt={profile.name}
                className="absolute inset-0 w-full h-full object-cover object-top transition-all duration-500"
                style={{
                  filter: isActive ? "brightness(0.35)" : "brightness(0.85)",
                }}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ backgroundColor: "#2d6a4f" }}
              >
                <span className="text-white text-5xl font-bold opacity-30">{profile.name[0]}</span>
              </div>
            )}

            {/* الاسم والمسمى بالأسفل — دايماً ظاهر */}
            {!isActive && (
              <div
                className="absolute bottom-0 left-0 right-0 p-3"
                dir={textDir}
                style={{
                  background: "linear-gradient(to top, rgba(0,0,0,0.8) 80%, transparent)",
                }}
              >
                <p className="text-sm font-bold text-primary"
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
                  {profile.name}
                </p>
                {profile.title && (
                  <p className="text-xs text-white/80">{profile.title}</p>
                )}
              </div>
            )}

            {/* Hover overlay — النص والبايو */}
            {isActive && (
              <div
                className="absolute inset-0 flex flex-col justify-between p-4 text-white"
                dir={textDir}
              >
                {/* البايو */}
                <div>
                  <p className="text-2xl font-bold text-primary mb-3 leading-none">"</p>
                  <p className="text-xs leading-relaxed opacity-95 line-clamp-6"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}>
                    {profile.bio || ""}
                  </p>
                </div>

                {/* الأسفل: صورة دائرة + الاسم + LinkedIn */}
                <div className="flex items-center justify-between">
                  <div dir={textDir}>
                    <p className="text-sm font-bold text-primary">{profile.name}</p>
                    <p className="text-xs opacity-80">{profile.title}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* LinkedIn */}
                    {profile.profileUrl && (
                      <a
                        href={profile.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#0077b5" }}
                      >
                        <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    )}

                    {/* صورة دائرة صغيرة */}
                    {profile.imageUrl && (
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50">
                        <img
                          src={profile.imageUrl}
                          alt={profile.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}// =====================
// Landing Page
// =====================
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32 flex flex-col justify-center min-h-[500px] md:min-h-[600px]">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
              {BRAND_NAME}
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-white" data-testid="text-hero-title">
              {t("landing.heroTitle")}
              <span className="block text-white/90 mt-2">{t("landing.heroSubtitle")}</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              {t("landing.heroDescription")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-browse-courses">
                <Link href="/courses">
                  {t("landing.browseCourses")}
                  <ArrowRight className="w-5 h-5 ltr:ml-2 rtl:mr-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" asChild data-testid="button-login-hero">
                <Link href="/login">{t("landing.getStarted")}</Link>
              </Button>
            </div>
            <div className="flex justify-center gap-2 mt-8">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${currentSlide === index ? "bg-white scale-110" : "bg-white/40 hover:bg-white/60"}`}
                  aria-label={`Go to slide ${index + 1}`}
                  data-testid={`hero-dot-${index}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
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
                <div key={i} className="text-center" data-testid={`stat-item-${i}`}>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold mb-1" data-testid={`stat-value-${i}`}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground" data-testid={`stat-label-${i}`}>{stat.label}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
       {/* Team Section */}
      {(profilesLoading || (featuredProfiles && featuredProfiles.length > 0)) && (
        <section className="py-20 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-12" dir="rtl">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-3" data-testid="text-team-title">
                  {t("landing.platformTeam")}
                </h2>
                <p className="text-muted-foreground max-w-md">{t("landing.platformTeamDesc")}</p>
              </div>
            </div>
            {profilesLoading ? (
              <div className="flex gap-4 pb-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="min-w-[140px] h-[360px] rounded-3xl flex-shrink-0" />
                ))}
              </div>
            ) : (
              <TeamCarousel profiles={featuredProfiles || []} />
            )}
          </div>
        </section>
      )}
      {/* Colleges Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("landing.ourColleges")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("landing.ourCollegesDesc")}</p>
          </div>
          {collegesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-48">
                  <CardContent className="h-full flex items-center justify-center">
                    <div className="animate-pulse w-full h-full bg-muted rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {colleges?.map((college) => (
                <Card key={college.id} className="overflow-hidden hover-elevate group" data-testid={`card-college-${college.slug}`}>
                  <div className={`h-24 bg-gradient-to-r ${getCollegeGradient(college.slug)} flex items-center justify-center`}>
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white">
                      <Building2 className="w-8 h-8" />
                    </div>
                  </div>
                  <CardContent className="p-6 text-center">
                    <h3 className="text-xl font-semibold mb-2">{college.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{t("landing.exploreCourses", { college: college.name })}</p>
                    <Button variant="outline" size="sm" asChild>
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
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">{t("landing.featuredCourses")}</h2>
              <p className="text-muted-foreground">{t("landing.popularCourses")}</p>
            </div>
            <Button variant="outline" asChild className="hidden md:flex">
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
            <Card className="py-12">
              <CardContent className="text-center">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">{t("landing.noCoursesYet")}</h3>
                <p className="text-muted-foreground">{t("landing.checkBackSoon")}</p>
              </CardContent>
            </Card>
          )}
          <div className="mt-8 text-center md:hidden">
            <Button variant="outline" asChild>
              <Link href="/courses">
                {t("landing.viewAllCourses")}
                <ArrowRight className="w-4 h-4 ltr:ml-2 rtl:mr-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

            {/* اللوغو والوصف */}
            <div className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-2">
                <img src={logoUrl} alt={BRAND_NAME} className="w-10 h-10 object-contain rounded-md dark:hidden" />
                <img src={logoDarkUrl} alt={BRAND_NAME} className="w-10 h-10 object-contain rounded-md hidden dark:block" />
                <span className="font-bold text-lg">{BRAND_NAME}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
               {t("footer.para")}
              </p>
            </div>

            {/* الصفحات */}
            <div>
              <h4 className="font-bold mb-4 text-base">{t("footer.pages")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/" className="hover:text-foreground transition-colors">{t("footer.home")}</Link></li>
                <li><Link href="/courses" className="hover:text-foreground transition-colors">{t("footer.courses")}</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">{t("footer.login")} </Link></li>
                <li><Link href="/signup" className="hover:text-foreground transition-colors"> {t("footer.signUp")} </Link></li>
              </ul>
            </div>

            {/* السوشيال ميديا */}
            <div>
              <h4 className="font-bold mb-4 text-base">{t("footer.socialMedia")}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <svg className="w-4 h-4 fill-current text-blue-600" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    {t("footer.Facebook")}
                  </a>
                </li>
                <li>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <svg className="w-4 h-4 fill-current text-pink-500" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    {t("footer.Instagram")}
                  </a>
                </li>
                <li>
                  <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <svg className="w-4 h-4 fill-current text-red-600" viewBox="0 0 24 24"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
                    {t("footer.YouTube")}
                  </a>
                </li>
              </ul>
            </div>

            {/* تواصل معنا */}
            <div>
              <h4 className="font-bold mb-4 text-base">{t("footer.contactUs")}</h4>
              <p className="text-sm text-muted-foreground mb-3">{t("footer.helpText")}</p>
              <Button variant="outline" size="sm" asChild>
                <a href="mailto:support@noqtaa.cloud">{t("footer.helpBtn")}</a>
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{t("footer.rights")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
