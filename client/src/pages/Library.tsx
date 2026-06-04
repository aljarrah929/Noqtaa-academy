import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Search, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Header } from "@/components/layout/Header";

export default function Library() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allItems, isLoading } = useQuery<any[]>({
    queryKey: ["/api/courses"],
  });

  const pdfBooks = allItems?.filter((item) => item.status === "PUBLISHED" && item.format === "pdf") || [];
  
  const filteredBooks = pdfBooks.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    // 🔥 ضفنا تغليف كامل للصفحة عشان الهيدر يركب صح فوق
    <div className="min-h-screen flex flex-col bg-background">
      <Header /> 
      
      <main className="flex-1 max-w-7xl w-full mx-auto space-y-8 p-4 md:p-8 mt-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-primary/5 p-6 rounded-2xl border border-primary/10">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <BookOpen className="w-8 h-8" /> المكتبة الرقمية
            </h1>
            <p className="text-muted-foreground mt-2">تصفح واشترك في الملازم والملفات الأكاديمية</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="ابحث عن ملف، ملزمة..." 
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-xl font-medium">لا توجد ملفات حالياً</h3>
            <p className="text-muted-foreground mt-2">سيتم إضافة الملازم قريباً من قبل الأساتذة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <Card key={book.id} className="group hover:shadow-lg transition-all duration-300 border-primary/10 overflow-hidden flex flex-col">
                <div className="aspect-[3/4] relative bg-muted flex items-center justify-center overflow-hidden">
                  {book.coverImageUrl ? (
                    <img 
                      src={book.coverImageUrl} 
                      alt={book.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <FileText className="w-20 h-20 text-primary/20" />
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                      PDF
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                    {book.description || "ملف أكاديمي"}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t">
                    <span className="font-bold text-primary text-lg">
                      {book.price > 0 ? `${book.price} JOD` : "مجاناً"}
                    </span>
                    <Link href={`/courses/${book.id}`}>
                      <Button size="sm" className="rounded-full">
                        التفاصيل
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