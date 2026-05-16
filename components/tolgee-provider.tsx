"use client";

import type React from "react";
import { useEffect } from "react";
import { TolgeeProvider, useTolgee } from "@tolgee/react";
import { getTolgee, getTolgeeStaticData, localeToLanguageTag, type Locale } from "@/lib/tolgee";

const tolgee = getTolgee();
const tolgeeStaticData = getTolgeeStaticData();

function TolgeeLanguageSync({ locale }: { locale: Locale }) {
  const tolgeeInstance = useTolgee();

  useEffect(() => {
    const language = localeToLanguageTag(locale);

    if (typeof tolgeeInstance.changeLanguage === "function") {
      void tolgeeInstance.changeLanguage(language);
    }
  }, [locale, tolgeeInstance]);

  return null;
}

export function AppTolgeeProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return (
    <TolgeeProvider
      tolgee={tolgee}
      ssr={{
        language: localeToLanguageTag(locale),
        staticData: tolgeeStaticData,
      }}
    >
      <TolgeeLanguageSync locale={locale} />
      {children}
    </TolgeeProvider>
  );
}
