import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Search, BookOpen, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Header } from "@/components/layout/Header";

interface LibraryItem {
  id: number;
  title: string;
  description: string | null;
  price: number;
  fileSize: number;
  coverImageUrl: string | null;
  courseTitle: string | null;
  teacherName: string;
  hasAccess: boolean;
}

export default function Library() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();
  const { data: items, isLoading } = useQuery<LibraryItem[]>({
    queryKey: ["/api/library"],
  });

  const filtered = (items || []).filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto space-y-8 p-4 md:p-8 mt-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-primary/5 p-6 rounded-2xl border border-primary/10">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <BookOpen className="w-8 h-8" /> {t("Teachers_profile.Library")}
            </h1>
            <p className="text-muted-foreground mt-2">{t("Teachers_profile.dis2")}</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("Teachers_profile.search2")}
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-xl font-medium">{t("Teachers_profile.empty4")}</h3>
            <p className="text-muted-foreground mt-2">{t("Teachers_profile.dis3")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((book) => (
              <Card key={book.id} className="group hover:shadow-lg transition-all duration-300 border-primary/10 overflow-hidden flex flex-col">
                <div className="aspect-[3/4] relative bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                  {book.coverImageUrl ? (
                    <img
                      src={book.coverImageUrl}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <FileText className="w-20 h-20 text-primary/30" />
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">PDF</Badge>
                  </div>
                  {book.hasAccess && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-green-600 text-white gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {t("Teachers_profile.avil")}
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {book.title}
                  </h3>
                  {book.courseTitle && (
                    <p className="text-xs text-muted-foreground mb-2"> {t("Teachers_profile.Linked")} {book.courseTitle}</p>
                  )}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                    {book.description || t("Teachers_profile.book")}
                  </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t">
                    <span className="font-bold text-primary text-lg">
                      {book.hasAccess ? t("Teachers_profile.avilyou") : book.price > 0 ? `${book.price} JOD` : t("Teachers_profile.free")}
                    </span>
                    <Link href={`/library/${book.id}`}>
                      <Button size="sm" className="rounded-full">
                        {book.hasAccess ? t("Teachers_profile.read") :t("Teachers_profile.details")}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}