import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseCard, CourseCardSkeleton } from "@/components/courses/CourseCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, BookOpen, Users, Award, ArrowRight, Building2 } from "lucide-react";
import type { CourseWithRelations, College, FeaturedProfile } from "@shared/schema";

export default function Landing() {
  const { data: courses, isLoading: coursesLoading } = useQuery<CourseWithRelations[]>({
    queryKey: ["/api/courses", "featured"],
  });

  const { data: colleges, isLoading: collegesLoading } = useQuery<College[]>({
    queryKey: ["/api/colleges"],
  });

  const { data: featuredProfiles, isLoading: profilesLoading } = useQuery<FeaturedProfile[]>({
    queryKey: ["/api/featured-profiles"],
  });

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
      case "pharmacy":
        return "from-emerald-500 to-emerald-700";
      case "engineering":
        return "from-blue-500 to-blue-700";
      case "it":
        return "from-purple-500 to-purple-700";
      default:
        return "from-primary to-primary/80";
    }
  };

  const getCollegeIcon = (slug: string) => {
    return <Building2 className="w-8 h-8" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-6">
              University E-Learning Platform
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
              Learn from the Best
              <span className="block text-primary mt-2">Academic Courses</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Access high-quality courses from top university professors across Pharmacy, Engineering, and IT colleges.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-browse-courses">
                <Link href="/courses">
                  Browse Courses
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-login-hero">
                <a href="/api/login">
                  Get Started
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: BookOpen, label: "Quality Courses", value: "50+" },
              { icon: Users, label: "Active Students", value: "1000+" },
              { icon: GraduationCap, label: "Expert Teachers", value: "30+" },
              { icon: Award, label: "Colleges", value: "3" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="text-2xl md:text-3xl font-bold mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Colleges</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose from three specialized colleges, each offering courses tailored to your academic interests.
            </p>
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
                <Card 
                  key={college.id} 
                  className="overflow-hidden hover-elevate group"
                  data-testid={`card-college-${college.slug}`}
                >
                  <div className={`h-24 bg-gradient-to-r ${getCollegeGradient(college.slug)} flex items-center justify-center`}>
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white">
                      {getCollegeIcon(college.slug)}
                    </div>
                  </div>
                  <CardContent className="p-6 text-center">
                    <h3 className="text-xl font-semibold mb-2">{college.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Explore courses in the {college.name} department
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/courses?college=${college.slug}`}>
                        View Courses
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Featured Courses</h2>
              <p className="text-muted-foreground">
                Popular courses from our top instructors
              </p>
            </div>
            <Button variant="outline" asChild className="hidden md:flex">
              <Link href="/courses">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
          
          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          ) : featuredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  actionHref={`/courses/${course.id}`}
                />
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="text-center">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No courses yet</h3>
                <p className="text-muted-foreground">
                  Check back soon for new course offerings.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 text-center md:hidden">
            <Button variant="outline" asChild>
              <Link href="/courses">
                View All Courses
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {(profilesLoading || (featuredProfiles && featuredProfiles.length > 0)) && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-team-title">Platform Team</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Meet the people behind our university e-learning platform
              </p>
            </div>
            
            {profilesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6">
                    <div className="flex flex-col items-center text-center">
                      <Skeleton className="w-24 h-24 rounded-full mb-4" />
                      <Skeleton className="w-32 h-5 mb-2" />
                      <Skeleton className="w-24 h-4 mb-3" />
                      <Skeleton className="w-full h-16" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredProfiles?.map((profile) => (
                  <Card 
                    key={profile.id} 
                    className="p-6"
                    data-testid={`card-team-member-${profile.id}`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <Avatar className="w-24 h-24 mb-4">
                        <AvatarImage src={profile.imageUrl || undefined} alt={profile.name} />
                        <AvatarFallback className="text-xl">{getInitials(profile.name)}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-lg mb-1" data-testid={`text-team-name-${profile.id}`}>
                        {profile.name}
                      </h3>
                      {profile.title && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {profile.title}
                        </p>
                      )}
                      {profile.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {profile.bio}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-primary/10">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold">EduLearn</span>
            </div>
            <p className="text-sm text-muted-foreground">
              University E-Learning Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
