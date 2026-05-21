import { useRef, useState } from "react";

interface ProtectedVideoProps {
  src: string;
  onError?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  // خلينا هدول عشان لو كان الأب (Parent) بيبعثهم ما يضرب الكود
  watermarkEmail?: string;
  watermarkPhone?: string | null;
  watermarkId?: string | null;
}

export function ProtectedVideo({ src, onError }: ProtectedVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [speed, setSpeed] = useState(1);

  // دالة تغيير السرعة يدوياً
  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* مشغل الفيديو */}
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black" data-testid="protected-video-container">
        <video
          ref={videoRef}
          src={src}
          controls
          controlsList="nodownload noremoteplayback" // مخفيين زر التنزيل والبث الخارجي
          disablePictureInPicture
          playsInline
          onError={onError}
          className="w-full h-full"
          data-testid="protected-video-element"
        />
      </div>
      </div>
     
  );
}