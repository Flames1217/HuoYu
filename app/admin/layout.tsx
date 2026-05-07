"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 240;

const navLinks = [
  { href: "/admin", label: "\u9996\u9875", IconComponent: FiHome, exact: true },
  { href: "/admin/profile", label: "\u4e2a\u4eba\u8d44\u6599", IconComponent: FiUser },
  { href: "/admin/projects", label: "\u9879\u76ee\u7ba1\u7406", IconComponent: FiFolder },
  { href: "/admin/footer", label: "\u9875\u811a\u7ba1\u7406", IconComponent: FiEdit3 },
  { href: "/", label: "\u56de\u5230\u524d\u53f0", IconComponent: FiHome, external: true },
];

function AdminBrand() {
  return (
    <Link href="/admin" className="admin-brand">
      <div className="admin-brand-mark">
        <GiFlame className="h-5 w-5" />
      </div>
      <div>
        <p className="admin-brand-title">{"\u7ba1\u7406\u4e2d\u5fc3"}</p>
        <p className="admin-brand-subtitle">HuoYu</p>
      </div>
    </Link>
  );
}

function AdminNav({
  pathname,
  onNavigate,
}: {
  pathname: string | null;
  onNavigate?: () => void;
}) {
  return (
    <SidebarMenu className="space-y-1 px-3 py-3">
      {navLinks.map((linkItem) => {
        const isActive = linkItem.exact
          ? pathname === linkItem.href
          : !linkItem.external && pathname?.startsWith(linkItem.href);

        return (
          <SidebarMenuItem key={linkItem.href}>
            <Link href={linkItem.href} onClick={onNavigate}>
              <SidebarMenuButton
                isActive={isActive}
                className={cn("admin-nav-item", isActive && "admin-nav-item-active")}
              >
                <linkItem.IconComponent className="admin-nav-icon" />
                <span>{linkItem.label}</span>
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

  useEffect(() => {
    navLinks.filter((link) => !link.external).forEach((link) => router.prefetch(link.href));
  }, [router]);

  if (status === "loading") {
    return (
      <div className="zero-admin zero-admin-shell flex min-h-screen items-center justify-center">
        <AiOutlineLoading3Quarters className="mr-3 h-8 w-8 animate-spin text-cyan-300" />
        {"\u6b63\u5728\u68c0\u67e5\u767b\u5f55\u72b6\u6001..."}
      </div>
    );
  }

  if (!session) {
    return (
      <SidebarProvider defaultOpen={false}>
        <AdminPasswordLogin />
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="zero-admin zero-admin-shell fixed inset-0 overflow-y-auto">
        <aside className="admin-sidebar hidden lg:flex" style={{ width: SIDEBAR_WIDTH }}>
          <SidebarHeader className="border-b border-white/10 px-4 py-4">
            <AdminBrand />
          </SidebarHeader>
          <SidebarContent className="flex-1 overflow-y-auto py-2">
            <AdminNav pathname={pathname} />
          </SidebarContent>
        </aside>

        <div className="admin-mobile-bar lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="admin-icon-button">
                <FiMenu className="h-5 w-5" />
                <span className="sr-only">{"\u6253\u5f00\u5bfc\u822a"}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-slate-700/50 bg-slate-950 px-0 text-slate-100">
              <SidebarHeader className="border-b border-white/10 px-4 py-4">
                <AdminBrand />
              </SidebarHeader>
              <SidebarContent className="py-2">
                <AdminNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
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
