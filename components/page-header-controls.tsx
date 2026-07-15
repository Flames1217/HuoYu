"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { FiMoon, FiSun } from "react-icons/fi";
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

  const toggleTheme = () => {
    window.dispatchEvent(new CustomEvent("huoyu:theme-transition-start"));
    setTheme(currentTheme === "light" ? "dark" : "light");
  };

  return createPortal(
    <div className="page-floating-controls fixed z-[1000] flex items-center gap-1 rounded-xl border border-emerald-950/10 bg-emerald-50/90 p-1 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-950/90">
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
    </div>,
    document.body,
  );
}
