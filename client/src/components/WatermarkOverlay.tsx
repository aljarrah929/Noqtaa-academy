import { useState, useEffect } from "react";

interface WatermarkOverlayProps {
  email?: string;
  phoneNumber?: string | null;
  publicId?: string | null;
}

export function WatermarkOverlay({ email, phoneNumber, publicId }: WatermarkOverlayProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset({
        x: Math.floor(Math.random() * 40) - 20,
        y: Math.floor(Math.random() * 40) - 20,
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const identifier = phoneNumber || email || "user";
  const idLabel = publicId || "";

  const lines = [identifier, idLabel].filter(Boolean);
  const text = lines.join(" - ");

  return (
    <div
      className="absolute inset-0 overflow-hidden z-40"
      style={{ pointerEvents: "none" }}
      data-testid="watermark-overlay"
    >
      <div
        className="absolute"
        style={{
          inset: "-50%",
          width: "200%",
          height: "200%",
          transform: `translate(${offset.x}px, ${offset.y}px) rotate(45deg)`,
          transition: "transform 2s ease-in-out",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "60px 80px",
            padding: "40px",
          }}
        >
          {Array.from({ length: 80 }).map((_, i) => (
            <span
              key={i}
              className="text-foreground"
              style={{
                opacity: 0.3,
                fontSize: "14px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                letterSpacing: "0.05em",
              }}
            >
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
