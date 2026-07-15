"use client";

import { useEffect, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { FiArrowUp, FiMoon, FiSun } from "react-icons/fi";
import { useLocaleText } from "@/lib/use-locale-text";

export function PageHeaderControls() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const currentTheme = mounted ? resolvedTheme || theme : undefined;
  const { t } = useLocaleText();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const portalHost = document.querySelector("#page-floating-controls-host");
  if (!portalHost) {
    return null;
  }

  const toggleTheme = () => {
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    const applyTheme = () => flushSync(() => setTheme(nextTheme));
    const startViewTransition = (document as Document & {
      startViewTransition?: (update: () => void) => unknown;
    }).startViewTransition?.bind(document);

    if (startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      startViewTransition(applyTheme);
      return;
    }

    applyTheme();
  };

  return createPortal(
    <div className="page-floating-controls-layer pointer-events-none absolute inset-0 overflow-hidden">
      <div className="page-floating-controls pointer-events-auto absolute flex items-center gap-1 rounded-xl border border-emerald-950/10 bg-emerald-50/90 p-1 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-950/90">
        <LanguageSwitcher />
        <Button
          variant="ghost"
          size="icon"
          className="theme-toggle-button h-8 w-8 rounded-md border-0 bg-transparent text-emerald-950 shadow-none hover:bg-emerald-950/10 hover:text-emerald-950 dark:text-slate-100 dark:hover:bg-white/10"
          onClick={toggleTheme}
          aria-label={t("theme.toggle", "切换主题")}
        >
          {currentTheme === "light" ? <FiMoon className="h-4 w-4" /> : <FiSun className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="back-to-top-button h-8 w-8 rounded-md border-0 bg-transparent text-emerald-950 shadow-none hover:bg-emerald-950/10 hover:text-emerald-950 dark:text-slate-100 dark:hover:bg-white/10"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={t("page.backToTop", "回到顶部")}
        >
          <FiArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>,
    portalHost,
  );
}
