"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { IconType } from "react-icons";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { FiEdit3, FiFolder, FiHome, FiMenu, FiUser } from "react-icons/fi";
import { GiFlame } from "react-icons/gi";

import { AdminPasswordLogin } from "@/components/admin-password-login";
import { PageHeaderControls } from "@/components/page-header-controls";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { getLocaleFromPathname, stripLocalePrefix, withLocalePath, type Locale } from "@/lib/tolgee";
import { useLocaleText } from "@/lib/use-locale-text";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 240;

type AdminNavLink = {
  href: string;
  label: string;
  fallback: string;
  IconComponent: IconType;
  exact?: boolean;
  external?: boolean;
};

const navLinks = [
  { href: "/admin", label: "navHome", fallback: "首页", IconComponent: FiHome, exact: true },
  { href: "/admin/profile", label: "navProfile", fallback: "个人资料", IconComponent: FiUser },
  { href: "/admin/projects", label: "navProjects", fallback: "项目管理", IconComponent: FiFolder },
  { href: "/admin/footer", label: "navFooter", fallback: "页脚管理", IconComponent: FiEdit3 },
  { href: "/", label: "backToFront", fallback: "回到前台", IconComponent: FiHome, external: true },
] satisfies readonly AdminNavLink[];

function AdminBrand({ href, title }: { href: string; title: string }) {
  return (
    <Link href={href} className="admin-brand">
      <div className="admin-brand-mark">
        <GiFlame className="h-5 w-5" />
      </div>
      <div>
        <p className="admin-brand-title">{title}</p>
        <p className="admin-brand-subtitle">HuoYu</p>
      </div>
    </Link>
  );
}

function AdminNav({
  pathname,
  locale,
  onNavigate,
}: {
  pathname: string | null;
  locale: Locale;
  onNavigate?: () => void;
}) {
  const normalizedPathname = stripLocalePrefix(pathname);
  const { t } = useLocaleText();

  const translatedNavLinks = [
    { ...navLinks[0], text: t("adminLayout.navHome", navLinks[0].fallback) },
    { ...navLinks[1], text: t("adminLayout.navProfile", navLinks[1].fallback) },
    { ...navLinks[2], text: t("adminLayout.navProjects", navLinks[2].fallback) },
    { ...navLinks[3], text: t("adminLayout.navFooter", navLinks[3].fallback) },
    { ...navLinks[4], text: t("adminLayout.backToFront", navLinks[4].fallback) },
  ] as const;

  return (
    <SidebarMenu className="space-y-1 px-3 py-3">
      {translatedNavLinks.map((linkItem) => {
        const targetHref = withLocalePath(locale, linkItem.href);
        const isActive = linkItem.exact
          ? normalizedPathname === linkItem.href
          : !linkItem.external && normalizedPathname.startsWith(linkItem.href);

        return (
          <SidebarMenuItem key={linkItem.href}>
            <Link href={targetHref} onClick={onNavigate}>
              <SidebarMenuButton
                isActive={isActive}
                className={cn("admin-nav-item", isActive && "admin-nav-item-active")}
              >
                <linkItem.IconComponent className="admin-nav-icon" />
                <span>{linkItem.text}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const locale = getLocaleFromPathname(pathname);
  const { t } = useLocaleText();
  const adminHomeHref = useMemo(() => withLocalePath(locale, "/admin"), [locale]);

  useEffect(() => {
    navLinks.forEach((link) => router.prefetch(withLocalePath(locale, link.href)));
  }, [locale, router]);

  if (status === "loading") {
    return (
      <div className="zero-admin zero-admin-shell flex min-h-screen items-center justify-center">
        <AiOutlineLoading3Quarters className="mr-3 h-8 w-8 animate-spin text-cyan-300" />
        {t("adminLayout.loadingSession", "正在检查登录状态...")}
      </div>
    );
  }

  if (!session) {
    return (
      <SidebarProvider defaultOpen={false}>
        <PageHeaderControls />
        <AdminPasswordLogin />
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="zero-admin zero-admin-shell fixed inset-0 overflow-y-auto">
        <aside className="admin-sidebar hidden lg:flex" style={{ width: SIDEBAR_WIDTH }}>
          <SidebarHeader className="border-b border-white/10 px-4 py-4">
            <AdminBrand href={adminHomeHref} title={t("adminLayout.title", "管理中心")} />
          </SidebarHeader>
          <SidebarContent className="flex-1 overflow-y-auto py-2">
            <AdminNav pathname={pathname} locale={locale} />
          </SidebarContent>
        </aside>

        <div className="admin-mobile-bar lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="admin-icon-button">
                <FiMenu className="h-5 w-5" />
                <span className="sr-only">{t("adminLayout.openNavigation", "打开导航")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-slate-700/50 bg-slate-950 px-0 text-slate-100">
              <SidebarHeader className="border-b border-white/10 px-4 py-4">
                <AdminBrand href={adminHomeHref} title={t("adminLayout.title", "管理中心")} />
              </SidebarHeader>
              <SidebarContent className="py-2">
                <AdminNav pathname={pathname} locale={locale} onNavigate={() => setMobileOpen(false)} />
              </SidebarContent>
            </SheetContent>
          </Sheet>
        </div>

        <div className="admin-content" style={{ marginLeft: SIDEBAR_WIDTH }}>
          <PageHeaderControls />
          <main className="admin-main">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
