import AdminLayout from "@/app/admin/layout";
import { locales, type Locale } from "@/lib/tolgee";

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const layoutKey = isLocale(locale) ? locale : "cn";

  return <AdminLayout key={layoutKey}>{children}</AdminLayout>;
}
