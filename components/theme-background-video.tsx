"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ThemeBackgroundVideo({ dayUrl, nightUrl }: { dayUrl?: string; nightUrl?: string }) {
  const { resolvedTheme } = useTheme();
  const hasVideo = Boolean(dayUrl || nightUrl);
  const src = resolvedTheme === "light" ? dayUrl : nightUrl;

  useEffect(() => {
    document.documentElement.classList.toggle("has-theme-background", hasVideo);
    return () => document.documentElement.classList.remove("has-theme-background");
  }, [hasVideo]);

  if (!src) return null;

  return (
    <div className="theme-background-video" aria-hidden="true">
      <video key={src} src={src} autoPlay muted loop playsInline preload="metadata" />
    </div>
  );
}
