import { useEffect, useRef, useState, useCallback } from "react";
import { Lock, Maximize, Minimize } from "lucide-react";
import { WatermarkOverlay } from "@/components/WatermarkOverlay";
import { Button } from "@/components/ui/button";

interface ProtectedVideoProps {
  src: string;
  onError?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  watermarkEmail?: string;
  watermarkPhone?: string | null;
  watermarkId?: string | null;
}

export function ProtectedVideo({ src, onError, watermarkEmail, watermarkPhone, watermarkId }: ProtectedVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wasPlayingRef = useRef(false);
  const savedTimeRef = useRef(0);
  const unblockTimerRef = useRef<number | null>(null);
  const originalSrcRef = useRef(src);

  useEffect(() => {
    originalSrcRef.current = src;
  }, [src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!playerContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

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
    <div
      ref={playerContainerRef}
      className="relative w-full aspect-video rounded-lg overflow-hidden bg-black"
      data-testid="protected-video-container"
    >
      <style>{`
        video.protected-player::-webkit-media-controls-fullscreen-button {
          display: none !important;
        }
        video.protected-player::-webkit-media-controls-enclosure {
          overflow: hidden !important;
        }
      `}</style>

      <video
        ref={videoRef}
        src={src}
        controls
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        playsInline
        onContextMenu={(e) => e.preventDefault()}
        onError={onError}
        className="protected-player w-full h-full"
        data-testid="protected-video-element"
      />

      {watermarkEmail && (
        <WatermarkOverlay
          email={watermarkEmail}
          phoneNumber={watermarkPhone}
          publicId={watermarkId}
        />
      )}

      <Button
        size="icon"
        variant="ghost"
        onClick={toggleFullscreen}
        className="absolute bottom-2 right-2 bg-black/50 text-white border-none"
        style={{ zIndex: 60 }}
        data-testid="button-custom-fullscreen"
      >
        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
      </Button>

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
