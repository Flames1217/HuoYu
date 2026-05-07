"use client";

import type React from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/footer";
import { ConsoleBadge } from "@/components/console-badge";
import useAutoThemeByBeijingTime from "@/hooks/use-auto-theme-by-beijing-time";

export function RootClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname ? pathname.startsWith("/admin") : false;

  useAutoThemeByBeijingTime();

  useEffect(() => {
    let cancelled = false;

    async function loadSiteMeta() {
      try {
        const response = await fetch("/api/profile-public", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;

        const nextTitle = String(data.site_title || "HuoYu").trim() || "HuoYu";
        const nextFavicon = String(data.favicon_url || "/images/logo.png").trim() || "/images/logo.png";
        document.title = nextTitle;

        let iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!iconLink) {
          iconLink = document.createElement("link");
          iconLink.rel = "icon";
          document.head.appendChild(iconLink);
        }
        iconLink.href = nextFavicon;
        iconLink.type = nextFavicon.endsWith(".svg") ? "image/svg+xml" : nextFavicon.endsWith(".ico") ? "image/x-icon" : "image/png";
      } catch (error) {
        console.error("[Site Meta] Failed to load site metadata:", error);
      }
    }

    loadSiteMeta();
    return () => {
      cancelled = true;
    };
  }, []);

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
        <I18nProvider>
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
        </I18nProvider>
      </AuthProvider>
    </>
  );
}
