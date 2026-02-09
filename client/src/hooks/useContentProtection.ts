import { useEffect, useCallback } from "react";

export function useContentProtection() {
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

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
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("content-protected");
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleContextMenu, handleKeyDown]);
}
