import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";

interface ProtectedVideoProps {
  src: string;
  onError?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
}

export function ProtectedVideo({ src, onError }: ProtectedVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [blocked, setBlocked] = useState(false);
  const wasPlayingRef = useRef(false);
  const unblockTimerRef = useRef<number | null>(null);

  const blockNow = () => {
    if (unblockTimerRef.current) {
      window.clearTimeout(unblockTimerRef.current);
      unblockTimerRef.current = null;
    }

    const v = videoRef.current;
    if (v) {
      wasPlayingRef.current = !v.paused && !v.ended;
      v.pause();
    }
    setBlocked(true);
  };

  const unblockSoon = () => {
    if (unblockTimerRef.current) window.clearTimeout(unblockTimerRef.current);

    unblockTimerRef.current = window.setTimeout(() => {
      setBlocked(false);

      const v = videoRef.current;
      if (v && wasPlayingRef.current) {
        v.play().catch(() => {
        });
      }
      unblockTimerRef.current = null;
    }, 400);
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
    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={src}
        controls
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        playsInline
        onContextMenu={(e) => e.preventDefault()}
        onError={onError}
        className="w-full h-full"
        data-testid="protected-video-element"
      />

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
  );
}
