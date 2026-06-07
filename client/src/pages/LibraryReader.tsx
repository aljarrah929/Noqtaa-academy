import { useEffect, useRef, useState, useCallback } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ArrowRight, Loader2, ZoomIn, ZoomOut, AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react";

// نحمّل pdf.js من الـ CDN ديناميكياً (بدون تعديل إعدادات البناء)
const PDFJS_VERSION = "3.11.174";
const PDFJS_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

declare global {
  interface Window { pdfjsLib: any; }
}

function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      return resolve(window.pdfjsLib);
    }
    const script = document.createElement("script");
    script.src = PDFJS_SRC;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("تعذّر تحميل محرك العرض"));
    document.body.appendChild(script);
  });
}

export default function LibraryReader() {
  const [, params] = useRoute("/library/:id/read");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const renderingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.3);

  const watermark = `${user?.firstName || ""} ${user?.lastName || ""} • ${user?.email || ""} • ${user?.publicId || ""}`.trim();

  // ===== الحماية: منع right-click و keyboard shortcuts للحفظ/الطباعة =====
  useEffect(() => {
    const blockContext = (e: MouseEvent) => { e.preventDefault(); return false; };
    const blockKeys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // Ctrl+S / Ctrl+P / Ctrl+Shift+S … منع الحفظ والطباعة
      if ((e.ctrlKey || e.metaKey) && (k === "s" || k === "p")) {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("keydown", blockKeys);
    };
  }, []);

  // ===== تحميل ملف الـ PDF عبر الـ stream الآمن =====
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const pdfjsLib = await loadPdfJs();

        // نجيب الملف من الـ stream الآمن (credentials للسيشن)
        const res = await fetch(`/api/library/${id}/stream`, { credentials: "include" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "تعذّر فتح الملف");
        }
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        if (cancelled) return;

        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setPage(1);
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "حدث خطأ");
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  // ===== رسم الصفحة الحالية على canvas مع watermark =====
  const renderPage = useCallback(async () => {
    if (!pdfRef.current || !containerRef.current || renderingRef.current) return;
    renderingRef.current = true;
    try {
      const pdf = pdfRef.current;
      const pdfPage = await pdf.getPage(page);
      const viewport = pdfPage.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.maxWidth = "100%";
      canvas.style.height = "auto";
      canvas.style.display = "block";
      canvas.style.margin = "0 auto";
      canvas.style.borderRadius = "8px";
      canvas.style.boxShadow = "0 4px 24px rgba(0,0,0,0.12)";

      await pdfPage.render({ canvasContext: ctx, viewport }).promise;

      // رسم الـ watermark المائل المتكرر فوق الصفحة
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = "#000";
      ctx.font = "bold 22px sans-serif";
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 6);
      const text = watermark || "محمي";
      for (let y = -canvas.height; y < canvas.height; y += 140) {
        for (let x = -canvas.width; x < canvas.width; x += 360) {
          ctx.fillText(text, x, y);
        }
      }
      ctx.restore();

      // استبدال المحتوى بالصفحة الجديدة
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(canvas);
    } catch (e) {
      // تجاهل أخطاء الرسم العابرة
    } finally {
      renderingRef.current = false;
    }
  }, [page, scale, watermark]);

  useEffect(() => {
    if (!loading && pdfRef.current) renderPage();
  }, [loading, page, scale, renderPage]);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(numPages, p + 1));
  const zoomIn = () => setScale((s) => Math.min(3, s + 0.2));
  const zoomOut = () => setScale((s) => Math.max(0.6, s - 0.2));

  return (
    <div
      className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex flex-col select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      {/* شريط علوي */}
      <div className="sticky top-0 z-10 bg-background border-b flex items-center justify-between gap-3 px-4 py-3 shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => setLocation(`/library/${id}`)}>
          <ArrowRight className="w-4 h-4 ml-1" /> رجوع
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={zoomOut} title="تصغير"><ZoomOut className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" onClick={zoomIn} title="تكبير"><ZoomIn className="w-4 h-4" /></Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrev} disabled={page <= 1}><ChevronRight className="w-4 h-4" /></Button>
          <span className="text-sm font-medium min-w-[70px] text-center">
            {numPages ? `${page} / ${numPages}` : "—"}
          </span>
          <Button variant="outline" size="icon" onClick={goNext} disabled={page >= numPages}><ChevronLeft className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* منطقة العرض */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p>جاري تحميل الملف...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <p className="text-destructive font-medium">{error}</p>
            <Button asChild variant="outline">
              <Link href={`/library/${id}`}><ArrowLeft className="w-4 h-4 ml-2" /> رجوع لصفحة الملف</Link>
            </Button>
          </div>
        ) : (
          <div ref={containerRef} className="max-w-4xl mx-auto" />
        )}
      </div>
    </div>
  );
}