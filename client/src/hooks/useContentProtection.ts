import { useEffect, useCallback, useState, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

export function useContentProtection(userId?: string) {
  const [showWarning, setShowWarning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        setShowWarning(true);

        timerRef.current = setTimeout(() => {
          setShowWarning(false);
          timerRef.current = null;
        }, 10000);

        if (userId) {
          apiRequest("POST", "/api/security/report-screenshot", {
            userId,
          }).catch((err) => {
            console.error("[Security] Failed to report screenshot:", err);
          });
        }
      }
    },
    [userId]
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
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [handleContextMenu, handleKeyUp, handleKeyDown]);

  return { showWarning };
}
