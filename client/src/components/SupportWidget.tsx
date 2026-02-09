import { useState, useRef, useEffect } from "react";
import { Headphones, Mail, X } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3" data-testid="support-widget">
      {open && (
        <div
          className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
          data-testid="support-widget-menu"
        >
          <p className="text-xs font-medium text-muted-foreground px-1">Contact Support</p>

          <a
            href="https://wa.me/962791397673"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover-elevate"
            data-testid="link-support-whatsapp"
          >
            <SiWhatsapp className="h-4 w-4 text-green-500" />
            <span>WhatsApp</span>
          </a>

          <a
            href="mailto:support@noqtaa.cloud"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover-elevate"
            data-testid="link-support-email"
          >
            <Mail className="h-4 w-4 text-blue-500" />
            <span>Email</span>
          </a>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95"
        aria-label={open ? "Close support menu" : "Open support menu"}
        data-testid="button-support-toggle"
      >
        {open ? <X className="h-6 w-6" /> : <Headphones className="h-6 w-6" />}
      </button>
    </div>
  );
}
