"use client"

import { useRouter, usePathname } from "next/navigation"
import { useTolgee } from "@tolgee/react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { defaultLocale, localeOptions, type Locale, getLocaleFromPathname, localeToLanguageTag, withLocalePath } from "@/lib/tolgee"
import { useLocaleText } from "@/lib/use-locale-text"
import { RiTranslate2 } from "react-icons/ri"

export function LanguageSwitcher() {
  const router = useRouter()
  const tolgee = useTolgee()
  const pathname = usePathname() || `/${defaultLocale}`
  const currentLocale = getLocaleFromPathname(pathname)
  const { t } = useLocaleText()
  const routeTimerRef = useRef<number | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)

  useEffect(() => {
    return () => {
      if (routeTimerRef.current) {
        window.clearTimeout(routeTimerRef.current)
      }
    }
  }, [])

  const changeLanguage = (locale: Locale) => {
    if (locale === currentLocale || isSwitching) return

    const nextPath = withLocalePath(locale, pathname)
    setIsSwitching(true)
    window.dispatchEvent(new CustomEvent("huoyu:locale-transition-start"))
    void tolgee.changeLanguage(localeToLanguageTag(locale))

    if (routeTimerRef.current) {
      window.clearTimeout(routeTimerRef.current)
    }

    routeTimerRef.current = window.setTimeout(() => {
      router.replace(nextPath, { scroll: false })
      routeTimerRef.current = null
      window.setTimeout(() => setIsSwitching(false), 360)
    }, 140)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 h-9">
          <RiTranslate2 className="h-5 w-5" />
          <span className="sr-only">{t("language.toggle", "Switch language")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {localeOptions.map((option) => (
          <DropdownMenuItem
            key={option.locale}
            onClick={() => changeLanguage(option.locale)}
            disabled={currentLocale === option.locale || isSwitching}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
