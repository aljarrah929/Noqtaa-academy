import { useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export function useContentProtection() {
  const { toast } = useToast();

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        document.body.style.filter = "blur(20px)";
        toast({
          title: "Screenshots are prohibited",
          description: "Screen capture is not allowed on this page.",
          variant: "destructive",
          duration: 10000,
        });
        setTimeout(() => {
          document.body.style.filter = "";
        }, 10000);
      }
    },
    [toast]
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const blocked = ["s", "p", "S", "P"];
      if (blocked.includes(e.key)) {
        e.preventDefault();
      }
      if (e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
      }
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("content-protected");
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("content-protected");
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.filter = "";
    };
  }, [handleContextMenu, handleKeyUp, handleKeyDown]);
}
