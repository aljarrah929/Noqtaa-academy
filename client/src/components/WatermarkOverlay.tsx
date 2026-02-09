import { useState, useEffect } from "react";

interface WatermarkOverlayProps {
  email?: string;
  phoneNumber?: string | null;
  publicId?: string | null;
}

export function WatermarkOverlay({ email, phoneNumber, publicId }: WatermarkOverlayProps) {
  const [position, setPosition] = useState({ top: 10, left: 10 });

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition({
        top: Math.floor(Math.random() * 80) + 5,
        left: Math.floor(Math.random() * 70) + 5,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const identifier = phoneNumber || email || "user";
  const idLabel = publicId || "";
  const lines = [identifier, idLabel].filter(Boolean);
  const text = lines.join(" - ");

  return (
    <div
      className="absolute inset-0"
      style={{
        pointerEvents: "none",
        zIndex: 50,
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
          opacity: 0.4,
          color: "rgba(255, 255, 255, 0.95)",
          textShadow: "0 1px 4px rgba(0, 0, 0, 0.5)",
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
