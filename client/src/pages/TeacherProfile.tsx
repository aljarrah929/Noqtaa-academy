import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { Users, BookOpen, Mail, ArrowLeft, FileText } from "lucide-react";

interface TeacherCourse {
  id: number;
  title: string;
  description: string | null;
  price: number;
  coverImageUrl?: string | null;
}

interface TeacherDetail {
  id: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
  bio: string | null;
  courses: TeacherCourse[];
}

export default function TeacherProfile() {
  const [, params] = useRoute("/teachers/:id");
  const id = params?.id;
  const { t } = useTranslation();
  const { data: teacher, isLoading } = useQuery<TeacherDetail>({
    queryKey: [`/api/teachers/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-40 rounded-xl mb-6" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t("Teachers_profile.empty3")} </h2>
          <Button asChild>
            <Link href="/teachers"><ArrowLeft className="w-4 h-4 ml-2" /> {t("common.back")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const initials = teacher.name?.split(" ").map((p) => p[0]).slice(0, 2).join("") || "أ";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <Link href="/teachers">
          <Button variant="ghost"><ArrowLeft className="w-4 h-4 ml-2" /> {t("common.back")} </Button>
        </Link>

        {/* بطاقة المعلومات */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-l from-primary/10 to-primary/5 h-24" />
          <CardContent className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={teacher.profileImageUrl || undefined} alt={teacher.name} className="object-cover" />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-start">
                <h1 className="text-2xl font-bold">{teacher.name}</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center sm:justify-start mt-1">
                  <Mail className="w-3 h-3" /> {teacher.email}
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <BookOpen className="w-3 h-3" /> {teacher.courses.length} {t("Teachers_profile.course")}
              </Badge>
            </div>

            {/* النبذة */}
            <div className="mt-6">
              <h2 className="font-semibold mb-2">{t("Teachers_profile.About")}</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {teacher.bio || t("Teachers_profile.empty1")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* المواد */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />   {t("Teachers_profile.mat")}
          </h2>

          {teacher.courses.length === 0 ? (
            <Card className="py-10 border-dashed">
              <CardContent className="text-center text-muted-foreground">
                {t("Teachers_profile.empty2")}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teacher.courses.map((c) => (
                <Link key={c.id} href={`/courses/${c.id}`}>
                  <Card className="group hover:shadow-lg transition-all border-primary/10 overflow-hidden cursor-pointer h-full">
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                      {c.coverImageUrl ? (
                        <img src={c.coverImageUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <FileText className="w-12 h-12 text-primary/30" />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold line-clamp-1 group-hover:text-primary transition-colors">{c.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.description || "—"}</p>
                      <p className="font-bold text-primary mt-3">{c.price > 0 ? `${c.price} JOD` : "مجاناً"}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}