import { DevTools, FormatSimple, Tolgee } from "@tolgee/web";
import cnMessages from "@/lib/locales/cn.json";
import enMessages from "@/lib/locales/en.json";
import esMessages from "@/lib/locales/es.json";
import frMessages from "@/lib/locales/fr.json";
import jaMessages from "@/lib/locales/ja.json";

export const locales = ["cn", "en", "es", "fr", "ja"] as const;
export const defaultLocale = "cn" as const;
export type Locale = (typeof locales)[number];

const languageTagMap = {
  cn: "zh-Hans",
  en: "en",
  es: "es",
  fr: "fr",
  ja: "ja",
} as const satisfies Record<Locale, string>;

export const localeOptions = [
  { locale: "cn", label: "简体中文", shortLabel: "中文" },
  { locale: "en", label: "English", shortLabel: "EN" },
  { locale: "es", label: "Español", shortLabel: "ES" },
  { locale: "fr", label: "Français", shortLabel: "FR" },
  { locale: "ja", label: "日本語", shortLabel: "JA" },
] as const satisfies ReadonlyArray<{ locale: Locale; label: string; shortLabel: string }>;

function toTolgeeMessageSyntax(value: unknown): any {
  if (typeof value === "string") {
    return value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, "{$1}");
  }

  if (Array.isArray(value)) {
    return value.map(toTolgeeMessageSyntax);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nextValue]) => [key, toTolgeeMessageSyntax(nextValue)])
    );
  }

  return value;
}

export function isLocale(value: string | undefined | null): value is Locale {
  return locales.includes(value as Locale);
}

export function getLocaleFromPathname(pathname: string | null): Locale {
  const firstSegment = pathname?.split("/").filter(Boolean)[0];
  return isLocale(firstSegment) ? firstSegment : defaultLocale;
}

export function stripLocalePrefix(pathname: string | null) {
  const pathParts = (pathname || "/").split("/").filter(Boolean);
  const restParts = isLocale(pathParts[0]) ? pathParts.slice(1) : pathParts;
  return `/${restParts.join("/")}`.replace(/\/$/, "") || "/";
}

export function withLocalePath(locale: Locale, pathname: string | null) {
  const normalizedPath = stripLocalePrefix(pathname);
  return normalizedPath === "/" ? `/${locale}` : `/${locale}${normalizedPath}`;
}

export function isAdminPath(pathname: string | null) {
  const normalizedPath = stripLocalePrefix(pathname);
  return normalizedPath === "/admin" || normalizedPath.startsWith("/admin/");
}

export function localeToLanguageTag(locale: Locale) {
  return languageTagMap[locale];
}

export function languageTagToLocale(language: string | undefined | null): Locale {
  if (!language) {
    return defaultLocale;
  }

  if (language === "zh-Hans" || language === "zh-CN" || language === "zh" || language.startsWith("zh-")) {
    return "cn";
  }

  return isLocale(language) ? language : "en";
}

export function getTolgeeStaticData() {
  return {
    "zh-Hans": toTolgeeMessageSyntax(cnMessages),
    en: toTolgeeMessageSyntax(enMessages),
    es: toTolgeeMessageSyntax(esMessages),
    fr: toTolgeeMessageSyntax(frMessages),
    ja: toTolgeeMessageSyntax(jaMessages),
  } as const;
}

export function createTolgee() {
  const apiUrl = process.env.NEXT_PUBLIC_TOLGEE_API_URL?.trim() || "https://app.tolgee.io";
  const apiKey = process.env.NEXT_PUBLIC_TOLGEE_API_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_TOLGEE_PROJECT_ID?.trim();

  const instance = Tolgee().use(FormatSimple());

  if (process.env.NODE_ENV !== "production") {
    instance.use(DevTools());
  }

  return instance.init({
    apiUrl,
    apiKey,
    projectId,
    language: localeToLanguageTag(defaultLocale),
    fallbackLanguage: localeToLanguageTag(defaultLocale),
    defaultLanguage: localeToLanguageTag(defaultLocale),
    availableLanguages: locales.map(localeToLanguageTag),
    staticData: getTolgeeStaticData(),
  });
}

let tolgeeSingleton: ReturnType<typeof createTolgee> | null = null;

export function getTolgee() {
  if (!tolgeeSingleton) {
    tolgeeSingleton = createTolgee();
  }

  return tolgeeSingleton;
}

export function hasTolgeeCredentials() {
  return Boolean(process.env.NEXT_PUBLIC_TOLGEE_API_KEY?.trim());
}
