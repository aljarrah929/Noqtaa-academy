import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { WatermarkOverlay } from "@/components/WatermarkOverlay";

interface ProtectedVideoProps {
  src: string;
  onError?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  watermarkEmail?: string;
  watermarkPhone?: string | null;
  watermarkId?: string | null;
}

export function ProtectedVideo({ src, onError, watermarkEmail, watermarkPhone, watermarkId }: ProtectedVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [speed, setSpeed] = useState(1); // حالة حفظ السرعة للواجهة
  
  const wasPlayingRef = useRef(false);
  const savedTimeRef = useRef(0);
  const currentSpeedRef = useRef(1); // حفظ السرعة عشان ما تضيع لما الفيديو يقفل ويفتح
  const unblockTimerRef = useRef<number | null>(null);
  const originalSrcRef = useRef(src);

  useEffect(() => {
    originalSrcRef.current = src;
  }, [src]);

  // دالة تغيير السرعة يدوياً
  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    currentSpeedRef.current = newSpeed;
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  const blockNow = () => {
    if (unblockTimerRef.current) {
      window.clearTimeout(unblockTimerRef.current);
      unblockTimerRef.current = null;
    }

    const v = videoRef.current;
    if (v) {
      wasPlayingRef.current = !v.paused && !v.ended;
      savedTimeRef.current = v.currentTime;
      v.pause();
      v.removeAttribute("src");
      while (v.firstChild) {
        v.removeChild(v.firstChild);
      }
      v.load();
    }
    setBlocked(true);
  };

  const unblockSoon = () => {
    if (unblockTimerRef.current) window.clearTimeout(unblockTimerRef.current);

    unblockTimerRef.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v) {
        v.src = originalSrcRef.current;
        v.load();

        const restorePlayback = () => {
          v.currentTime = savedTimeRef.current;
          v.playbackRate = currentSpeedRef.current; // استرجاع السرعة اللي اختارها الطالب
          if (wasPlayingRef.current) {
            v.play().catch(() => {});
          }
          v.removeEventListener("loadedmetadata", restorePlayback);
        };
        v.addEventListener("loadedmetadata", restorePlayback);
      }

      setBlocked(false);
      unblockTimerRef.current = null;
    }, 500);
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") blockNow();
      else unblockSoon();
    };

    const onBlur = () => blockNow();
    const onFocus = () => unblockSoon();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      if (unblockTimerRef.current) window.clearTimeout(unblockTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* مشغل الفيديو */}
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black" data-testid="protected-video-container">
        <video
          ref={videoRef}
          src={src}
          controls
          controlsList="nodownload noremoteplayback" // شلنا noplaybackrate عشان المتصفح يسمح بالتسريع
          disablePictureInPicture
          playsInline
          onContextMenu={(e) => e.preventDefault()}
          onError={onError}
          className="w-full h-full"
          data-testid="protected-video-element"
        />

        {watermarkEmail && (
          <WatermarkOverlay
            email={watermarkEmail}
            phoneNumber={watermarkPhone}
            publicId={watermarkId}
          />
        )}

        {blocked && (
          <div
            className="absolute inset-0 bg-black flex items-center justify-center z-50"
            data-testid="video-privacy-shield"
          >
            <div className="text-center text-white">
              <Lock className="w-12 h-12 mx-auto mb-3 opacity-60" />
              <p className="text-lg font-medium">Video Protected</p>
              <p className="text-sm opacity-70 mt-1">Click here to continue watching</p>
            </div>
          </div>
        )}
      </div>

      {/* أزرار التحكم بالسرعة */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200" dir="rtl">
        <span className="text-sm font-semibold text-gray-700 ml-2">سرعة الفيديو:</span>
        {[1, 1.25, 1.5, 1.75, 2].map((rate) => (
          <button
            key={rate}
            onClick={() => handleSpeedChange(rate)}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              speed === rate
                ? "bg-blue-600 text-white shadow"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
            }`}
          >
            {rate}x
          </button>
        ))}
      </div>
    </div>
  );
}