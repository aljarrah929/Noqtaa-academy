import { useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useContentProtection(userId?: string) {
  const { toast } = useToast();

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        document.body.style.filter = "blur(20px)";
        toast({
          title: "Warning: Screen capture is prohibited",
          description:
            "Repeated attempts will result in permanent account suspension.",
          variant: "destructive",
          duration: 10000,
        });
        setTimeout(() => {
          document.body.style.filter = "";
        }, 10000);

        if (userId) {
          apiRequest("POST", "/api/report-violation", {
            userId,
            violationType: "screenshot",
          }).catch(() => {});
        }
      }
    },
    [toast, userId]
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
