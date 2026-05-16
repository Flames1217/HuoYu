"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { FiMoon, FiSun } from "react-icons/fi";
import { isAdminPath } from "@/lib/tolgee";
import { useLocaleText } from "@/lib/use-locale-text";

export function PageHeaderControls() {
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const adminPage = isAdminPath(pathname);
  const currentTheme = mounted ? resolvedTheme || theme : undefined;
  const { t } = useLocaleText();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className={`fixed ${adminPage ? "top-3 right-3" : "top-4 right-4"} z-[1000] flex items-center gap-2`}>
      <LanguageSwitcher />
      <Button
        variant="ghost"
        size="icon"
        className="theme-toggle-button h-8 w-8 rounded-md border-0 bg-transparent text-emerald-950 shadow-none hover:bg-emerald-950/10 hover:text-emerald-950 dark:text-slate-100 dark:hover:bg-white/10"
        onClick={() => setTheme(currentTheme === "light" ? "dark" : "light")}
        aria-label={t("theme.toggle", "切换主题")}
      >
        {currentTheme === "light" ? <FiMoon className="h-4 w-4" /> : <FiSun className="h-4 w-4" />}
      </Button>
    </div>
  );
}
