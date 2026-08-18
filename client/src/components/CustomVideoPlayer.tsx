import React from "react";
import { Plyr } from "plyr-react";
import "plyr-react/plyr.css"; // ملف الستايل الأساسي اللي بيعطي الشكل الاحترافي

interface CustomVideoPlayerProps {
  src: string;
}

export default function CustomVideoPlayer({ src }: CustomVideoPlayerProps) {
  // إعدادات المشغل (بنفعل فيها زر الإعدادات، والسرعة، والشريط الاحترافي)
  const plyrOptions = {
    controls: [
      "play-large", // الزر الكبير بالنص
      "play", // زر التشغيل/الإيقاف تحت
      "progress", // شريط التقدم (الـ Timeline)
      "current-time", // الوقت الحالي
      "duration", // الوقت الكلي
      "mute", // كتم الصوت
      "volume", // شريط الصوت
      "settings", // أيقونة الإعدادات ⚙️ (مهمة جداً)
      "pip", // صورة داخل صورة (Picture-in-Picture)
      "fullscreen", // زر الشاشة الكاملة
    ],
    settings: ["speed", "quality", "loop"], // الخيارات اللي بتطلع لما تكبس على الإعدادات
    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] }, // سرعات الفيديو
  };

  const videoSource = {
    type: "video" as const,
    sources: [
      {
        src: src,
        // type: "video/mp4", // اختياري حسب نوع فيديوهاتك
      },
    ],
  };

  return (
    // غلفنا المشغل بـ div عشان نعطيه حواف دائرية وظل متناسق مع تصميم المنصة
    <div className="rounded-xl overflow-hidden shadow-lg border border-border w-full">
      <Plyr source={videoSource} options={plyrOptions} />
    </div>
  );
}