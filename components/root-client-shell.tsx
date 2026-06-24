"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { AppTolgeeProvider } from "@/components/tolgee-provider";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/footer";
import { ConsoleBadge } from "@/components/console-badge";
import useAutoThemeByBeijingTime from "@/hooks/use-auto-theme-by-beijing-time";
import { getLocaleFromPathname, isAdminPath, localeToLanguageTag } from "@/lib/tolgee";

type LocaleTransitionStage = "idle" | "exiting" | "entering";
type ThemeTransitionStage = "idle" | "active";

export function RootClientShell({
  children,
  initialSiteMeta,
}: {
  children: React.ReactNode;
  initialSiteMeta?: {
    title?: string;
    favicon?: string;
  };
}) {
  const pathname = usePathname();
  const isAdminPage = isAdminPath(pathname);
  const locale = getLocaleFromPathname(pathname);
  const previousLocaleRef = useRef(locale);
  const transitionFrameRef = useRef<number | null>(null);
  const themeTransitionTimerRef = useRef<number | null>(null);
  const [transitionStage, setTransitionStage] = useState<LocaleTransitionStage>("idle");
  const [themeTransitionStage, setThemeTransitionStage] = useState<ThemeTransitionStage>("idle");

  useAutoThemeByBeijingTime();

  useEffect(() => {
    document.documentElement.lang = localeToLanguageTag(locale);
  }, [locale]);

  useEffect(() => {
    const handleLocaleTransitionStart = () => {
      if (transitionFrameRef.current !== null) {
        window.cancelAnimationFrame(transitionFrameRef.current);
      }
      setTransitionStage("exiting");
    };

    const handleThemeTransitionStart = () => {
      if (themeTransitionTimerRef.current !== null) {
        window.clearTimeout(themeTransitionTimerRef.current);
      }

      setThemeTransitionStage("active");
      themeTransitionTimerRef.current = window.setTimeout(() => {
        setThemeTransitionStage("idle");
        themeTransitionTimerRef.current = null;
      }, 520);
    };

    window.addEventListener("huoyu:locale-transition-start", handleLocaleTransitionStart);
    window.addEventListener("huoyu:theme-transition-start", handleThemeTransitionStart);

    return () => {
      window.removeEventListener("huoyu:locale-transition-start", handleLocaleTransitionStart);
      window.removeEventListener("huoyu:theme-transition-start", handleThemeTransitionStart);
      if (transitionFrameRef.current !== null) {
        window.cancelAnimationFrame(transitionFrameRef.current);
      }
      if (themeTransitionTimerRef.current !== null) {
        window.clearTimeout(themeTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (previousLocaleRef.current === locale) return;

    previousLocaleRef.current = locale;
    setTransitionStage("entering");
    transitionFrameRef.current = window.requestAnimationFrame(() => {
      transitionFrameRef.current = window.requestAnimationFrame(() => {
        setTransitionStage("idle");
      });
    });
  }, [locale]);

  useEffect(() => {
    const nextTitle = String(initialSiteMeta?.title || "HuoYu").trim() || "HuoYu";
    const nextFavicon = String(initialSiteMeta?.favicon || "/images/logo.png").trim() || "/images/logo.png";
    document.title = nextTitle;

    let iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!iconLink) {
      iconLink = document.createElement("link");
      iconLink.rel = "icon";
      document.head.appendChild(iconLink);
    }
    iconLink.href = nextFavicon;
    iconLink.type = nextFavicon.endsWith(".svg") ? "image/svg+xml" : nextFavicon.endsWith(".ico") ? "image/x-icon" : "image/png";
  }, [initialSiteMeta?.favicon, initialSiteMeta?.title]);

  useEffect(() => {
    if (isAdminPage) {
      const sakuraCanvas = document.getElementById("canvas_sakura");
      if (sakuraCanvas && sakuraCanvas.parentElement) {
        sakuraCanvas.parentElement.removeChild(sakuraCanvas);
      }
    }
  }, [isAdminPage]);

  return (
    <>
      <ConsoleBadge />
      <AuthProvider>
        <AppTolgeeProvider locale={locale}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <div className={`theme-page-transition theme-page-transition-${themeTransitionStage} ${isAdminPage ? "theme-page-transition-admin" : ""}`}>
              <div className={`locale-page-transition locale-page-transition-${transitionStage}`}>
                {isAdminPage ? (
                  <div className="flex-grow">{children}</div>
                ) : (
                  <div className="front-page-shell zero-space flex min-h-screen flex-col">
                    <div className="flex-grow">
                      {children}
                    </div>
                    <Footer />
                  </div>
                )}
              </div>
            </div>
            <Toaster
              position="top-center"
              richColors
              closeButton
              expand={true}
              visibleToasts={5}
              toastOptions={{
                style: {
                  marginBottom: "10px",
                },
              }}
            />
          </ThemeProvider>
        </AppTolgeeProvider>
      </AuthProvider>
    </>
  );
}
