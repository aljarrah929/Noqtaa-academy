import React from "react";
import { Plyr } from "plyr-react";
import "plyr-react/plyr.css";

interface CustomVideoPlayerProps {
  src: string;
}

export default function CustomVideoPlayer({ src }: CustomVideoPlayerProps) {
  const plyrOptions = {
    controls: [
      "play-large",
      "play",
      "progress",
      "current-time",
      "duration",
      "mute",
      "volume",
      "settings",
      "pip",
      "fullscreen",
    ],
    settings: ["speed", "quality", "loop"],
    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
  };

  const videoSource = {
    type: "video" as const,
    sources: [
      { src: src },
    ],
  };

  return (
    <div className="rounded-xl overflow-hidden shadow-lg border border-border w-full" data-testid="custom-plyr-wrapper">
      <Plyr source={videoSource} options={plyrOptions} />
    </div>
  );
}