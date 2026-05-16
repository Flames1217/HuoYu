"use client"

import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FiBookOpen, FiBookmark, FiClock, FiFeather } from "react-icons/fi"
import { useLocaleText } from "@/lib/use-locale-text"

export function ReadingPreset() {
  const { t } = useLocaleText()
  const localizedItems = [
    { title: t("reading.items.novelTitle", "Battle Through the Heavens"), meta: t("reading.items.novelMeta", "Hot-blooded fantasy / Heavenly flames / Long-term companion") },
    { title: t("reading.items.currentTitle", "Currently reading"), meta: t("reading.items.currentMeta", "Novels, inspiration and daily state") },
    { title: t("reading.items.notesTitle", "Excerpt notes"), meta: t("reading.items.notesMeta", "Fragments, quotes and light notes") },
  ]

  return (
    <div className="life-glass-card h-full w-full overflow-hidden">
      <CardHeader className="bg-transparent pb-2">
        <CardTitle className="flex items-center justify-center gap-3 bg-transparent text-2xl font-black">
          <FiBookOpen className="h-8 w-8 text-emerald-500" />
          {t("reading.title", "Reading Now")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 bg-transparent py-3">
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-md font-semibold">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            {t("reading.list", "Reading list")}
          </h4>
          <ul className="grid grid-cols-1 gap-3">
            {localizedItems.map((item, index) => (
              <li key={item.title} className="min-w-0">
                <div className="group flex min-w-0 flex-row items-center rounded-lg p-2 transition hover:bg-white/24 dark:hover:bg-black/30">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-emerald-400/15 text-emerald-500 shadow">
                    {index === 0 ? <FiBookmark className="h-5 w-5" /> : <FiFeather className="h-5 w-5" />}
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{item.title}</span>
                    <span className="block truncate text-xs font-semibold text-muted-foreground">{item.meta}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-md font-semibold">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            {t("reading.status", "Reading status")}
          </h4>
          <p className="flex items-center gap-2 rounded-lg bg-white/20 p-3 text-sm font-semibold leading-6 text-muted-foreground dark:bg-black/20">
            <FiClock className="h-4 w-4 shrink-0" />
            {t("reading.reserved", "Reserved for reading records, novel progress and excerpt notes.")}
          </p>
        </div>
      </CardContent>
    </div>
  )
}
