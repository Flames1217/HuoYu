"use client";

import type React from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { AppTolgeeProvider } from "@/components/tolgee-provider";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/footer";
import { ConsoleBadge } from "@/components/console-badge";
import useAutoThemeByBeijingTime from "@/hooks/use-auto-theme-by-beijing-time";
import { getLocaleFromPathname, isAdminPath, localeToLanguageTag } from "@/lib/tolgee";

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

  useAutoThemeByBeijingTime();

  useEffect(() => {
    document.documentElement.lang = localeToLanguageTag(locale);
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
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            {isAdminPage ? (
              <div className="flex-grow">{children}</div>
            ) : (
              <div className="front-page-shell zero-space flex min-h-screen flex-col">
                <div className="flex-grow">
                  {children}
                  <Script src="https://api.vvhan.com/api/script/yinghua" strategy="lazyOnload" />
                </div>
                <Footer />
              </div>
            )}
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
