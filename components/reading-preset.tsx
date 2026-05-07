"use client"

import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FiBookOpen, FiBookmark, FiClock, FiFeather } from "react-icons/fi"

const readingItems = [
  { title: "斗破苍穹", meta: "热血爽文 / 异火 / 长期陪伴感" },
  { title: "最近在读", meta: "小说、灵感和日常状态" },
  { title: "书摘记录", meta: "碎片句子和轻痕备忘" },
]

export function ReadingPreset() {
  return (
    <div className="life-glass-card h-full w-full overflow-hidden">
      <CardHeader className="bg-transparent pb-2">
        <CardTitle className="flex items-center justify-center gap-3 bg-transparent text-2xl font-black">
          <FiBookOpen className="h-8 w-8 text-emerald-500" />
          正在阅读
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 bg-transparent py-3">
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-md font-semibold">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            阅读清单
          </h4>
          <ul className="grid grid-cols-1 gap-3">
            {readingItems.map((item, index) => (
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
            阅读状态
          </h4>
          <p className="flex items-center gap-2 rounded-lg bg-white/20 p-3 text-sm font-semibold leading-6 text-muted-foreground dark:bg-black/20">
            <FiClock className="h-4 w-4 shrink-0" />
            预留为阅读记录、小说进度和摘抄展示。
          </p>
        </div>
      </CardContent>
    </div>
  )
}
