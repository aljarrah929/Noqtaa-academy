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

      {/* أزرار التحكم بالسرعة */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200" dir="rtl">
        <span className="text-sm font-semibold text-gray-700 ml-2">سرعة الفيديو:</span>
        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3].map((rate) => (
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