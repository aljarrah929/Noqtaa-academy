import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, BookOpen, Mail, ArrowLeft } from "lucide-react";
import { useState } from "react";

interface TeacherItem {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImageUrl: string | null;
  bio: string | null;
  courseCount: number;
}

export default function Teachers() {
  const [search, setSearch] = useState("");

  const { data: teachers, isLoading } = useQuery<TeacherItem[]>({
    queryKey: ["/api/teachers"],
  });

  const filtered = (teachers || []).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const initials = (t: TeacherItem) =>
    `${t.firstName?.[0] || ""}${t.lastName?.[0] || ""}` || t.email[0]?.toUpperCase() || "أ";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto space-y-8 p-4 md:p-8 mt-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-primary/5 p-6 rounded-2xl border border-primary/10">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Users className="w-8 h-8" /> t("nav.teacher")
            </h1>
            <p className="text-muted-foreground mt-2">تعرّف على أساتذة المنصة والمواد التي يدرّسونها</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن أستاذ..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
            <Users className="w-16 h-16 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-xl font-medium">لا يوجد أساتذة حالياً</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((t) => (
              <Card key={t.id} className="group hover:shadow-lg transition-all border-primary/10">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <Avatar className="w-24 h-24 mb-4 border-4 border-primary/10">
                    <AvatarImage src={t.profileImageUrl || undefined} alt={t.name} className="object-cover" />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials(t)}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{t.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="w-3 h-3" /> {t.email}
                  </p>
                  {t.bio && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{t.bio}</p>
                  )}
                  <Badge variant="secondary" className="mt-3 gap-1">
                    <BookOpen className="w-3 h-3" /> {t.courseCount} مادة
                  </Badge>
                  <Link href={`/teachers/${t.id}`} className="w-full mt-4">
                    <Button variant="outline" className="w-full rounded-full">عرض الملف</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}