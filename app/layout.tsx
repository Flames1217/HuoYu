import type React from "react";
import fs from "fs";
import path from "path";
import "./globals.css";
import { RootClientShell } from "@/components/root-client-shell";

const SETTINGS_PATH = path.resolve(process.cwd(), "settings.json");

function readSiteMeta() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return { title: "HuoYu", favicon: "/images/logo.png" };
    }
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
    const profile = settings.profile || {};
    return {
      title: String(profile.site_title || "HuoYu").trim() || "HuoYu",
      favicon: String(profile.favicon_url || "/images/logo.png").trim() || "/images/logo.png",
    };
  } catch {
    return { title: "HuoYu", favicon: "/images/logo.png" };
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteMeta = readSiteMeta();

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
