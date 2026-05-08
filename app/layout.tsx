import type React from "react";
import "./globals.css";
import { RootClientShell } from "@/components/root-client-shell";
import { getSettings } from "@/lib/settings-store";

export const dynamic = "force-dynamic";

async function readSiteMeta() {
  try {
    const settings = await getSettings({ profile: {} });
    const profile = settings.profile || {};
    return {
      title: String(profile.site_title || "HuoYu").trim() || "HuoYu",
      favicon: String(profile.favicon_url || "/images/logo.png").trim() || "/images/logo.png",
    };
  } catch {
    return { title: "HuoYu", favicon: "/images/logo.png" };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteMeta = await readSiteMeta();

  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <title>{siteMeta.title}</title>
        <meta name="description" content="HuoYu personal homepage and dashboard." />
        <link rel="icon" href={siteMeta.favicon} />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/jetbrains-mono@5.2.6/index.min.css" />
      </head>
      <body className="custom-font flex flex-col min-h-screen">
        <RootClientShell>{children}</RootClientShell>
      </body>
    </html>
  );
}
