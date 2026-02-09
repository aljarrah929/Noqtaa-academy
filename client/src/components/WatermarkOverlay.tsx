import { useState, useEffect } from "react";

interface WatermarkOverlayProps {
  email?: string;
  phoneNumber?: string | null;
  publicId?: string | null;
}

export function WatermarkOverlay({ email, phoneNumber, publicId }: WatermarkOverlayProps) {
  const [position, setPosition] = useState({ top: 10, left: 10 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition({
        top: Math.floor(Math.random() * 80) + 5,
        left: Math.floor(Math.random() * 70) + 5,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const identifier = phoneNumber || email || "user";
  const idLabel = publicId || "";
  const lines = [identifier, idLabel].filter(Boolean);
  const text = lines.join(" - ");

  return (
    <div
      className={isFullscreen ? "fixed inset-0" : "absolute inset-0"}
      style={{
        pointerEvents: "none",
        zIndex: isFullscreen ? 999999 : 40,
        overflow: "hidden",
      }}
      data-testid="watermark-overlay"
    >
      <span
        style={{
          position: "absolute",
          top: `${position.top}%`,
          left: `${position.left}%`,
          fontSize: "15px",
          fontWeight: 500,
          opacity: 0.25,
          color: "rgba(255, 255, 255, 0.9)",
          textShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          transition: "top 1.5s ease-in-out, left 1.5s ease-in-out",
          letterSpacing: "0.03em",
        }}
        data-testid="watermark-text"
      >
        {text}
      </span>
    </div>
  );
}
