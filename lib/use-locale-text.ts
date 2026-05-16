"use client";

import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useTranslate } from "@tolgee/react";
import cnMessages from "@/lib/locales/cn.json";
import enMessages from "@/lib/locales/en.json";
import esMessages from "@/lib/locales/es.json";
import frMessages from "@/lib/locales/fr.json";
import jaMessages from "@/lib/locales/ja.json";
import { getLocaleFromPathname, localeToLanguageTag, type Locale } from "@/lib/tolgee";

function getByPath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);
}

type TranslateParams = Record<string, string | number | bigint | boolean | Date | null | undefined>;

type LooseTranslateParams = Record<string, unknown>;

const localeMessages: Record<Locale, unknown> = {
  cn: cnMessages,
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  ja: jaMessages,
};

function normalizeParams(params?: LooseTranslateParams): TranslateParams | undefined {
  if (!params) return undefined;

  const normalized: TranslateParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (
      value === null ||
      value === undefined ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "bigint" ||
      typeof value === "boolean" ||
      value instanceof Date
    ) {
      normalized[key] = value;
    } else {
      normalized[key] = String(value);
    }
  }

  return normalized;
}

function interpolate(value: string, params?: TranslateParams) {
  if (!params) return value;

  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const nextValue = params[key];
    return nextValue === undefined || nextValue === null ? "" : String(nextValue);
  });
}

export function useLocaleText() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const language = localeToLanguageTag(locale);
  const { t: tolgeeT, isLoading } = useTranslate();

  const t = useCallback(
    (key: string, fallbackOrParams?: string | LooseTranslateParams, maybeParams?: LooseTranslateParams) => {
      const fallback = typeof fallbackOrParams === "string" ? fallbackOrParams : key;
      const rawParams = typeof fallbackOrParams === "string" ? maybeParams : fallbackOrParams;
      const params = normalizeParams(rawParams);
      const messages = localeMessages[locale] || cnMessages;
      const value = getByPath(messages, key);
      const cnValue = getByPath(cnMessages, key);

      if (typeof value === "string") {
        return interpolate(value, params);
      }

      try {
        const translated = tolgeeT(key, params);
        if (typeof translated === "string" && translated !== key) {
          return translated;
        }
      } catch {
        // Tolgee 在未完成初始化或缺少 key 时走本地兼容词典回退。
      }

      return interpolate(typeof cnValue === "string" ? cnValue : fallback, params);
    },
    [locale, tolgeeT]
  );

  return useMemo(
    () => ({
      t,
      ready: !isLoading,
      locale,
      language,
      i18n: {
        language,
      },
    }),
    [isLoading, language, locale, t]
  );
}
