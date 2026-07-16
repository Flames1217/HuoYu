"use client";

import { useCallback, useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";

const flameSources = {
  九玄金雷: "/assets/card-flames/九玄金雷.webm",
  青莲地心火: "/assets/card-flames/青莲地心火.webm",
  陨落心炎: "/assets/card-flames/陨落心炎.webm",
  骨灵冷火: "/assets/card-flames/骨灵冷火.webm",
  三千焱炎火: "/assets/card-flames/三千焱炎火.webm",
  海心焰: "/assets/card-flames/海心焰.webm",
  净莲妖火: "/assets/card-flames/净莲妖火.webm",
} as const;

export type CardFlameName = keyof typeof flameSources;

export function FlameCard({
  flame,
  children,
}: {
  flame: CardFlameName;
  children: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { ref: inViewRef, inView } = useInView({
    rootMargin: "160px 0px",
    threshold: 0.05,
  });
  const setVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      inViewRef(node);
    },
    [inViewRef],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView) void video.play().catch(() => undefined);
    else video.pause();
  }, [inView]);

  return (
    <div className="card-flame-host" data-flame-host={flame}>
      {children}
      <video
        ref={setVideoRef}
        className="card-flame-video"
        data-flame={flame}
        src={flameSources[flame]}
        aria-label={flame}
        muted
        loop
        playsInline
        preload="none"
      />
    </div>
  );
}
