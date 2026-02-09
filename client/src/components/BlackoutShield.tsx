import { useEffect, useState, useCallback } from "react";

export function BlackoutShield() {
  const [isBlocked, setIsBlocked] = useState(false);

  const triggerBlackout = useCallback((duration?: number) => {
    setIsBlocked(true);
    if (duration) {
      setTimeout(() => setIsBlocked(false), duration);
    }
  }, []);

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        triggerBlackout(15000);
      }
    };

    const handleBlur = () => {
      triggerBlackout();
    };

    const handleFocus = () => {
      setIsBlocked(false);
    };

    const handleMouseLeave = () => {
      triggerBlackout();
    };

    const handleMouseEnter = () => {
      setIsBlocked(false);
    };

    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [triggerBlackout]);

  if (!isBlocked) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999999,
        backgroundColor: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "all",
      }}
      data-testid="blackout-shield"
    >
      <p
        style={{
          color: "#ef4444",
          fontSize: "20px",
          fontWeight: 600,
          textAlign: "center",
          maxWidth: "500px",
          lineHeight: 1.6,
          padding: "0 24px",
        }}
        data-testid="blackout-warning-text"
      >
        Screen Capture is Prohibited. Repeated attempts will lock your account.
      </p>
    </div>
  );
}
