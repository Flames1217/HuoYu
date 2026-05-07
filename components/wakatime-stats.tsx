"use client"

import { memo, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { IconType } from "react-icons"
import { FiActivity, FiBarChart2, FiClock, FiCode, FiCpu, FiFileText, FiImage, FiMonitor, FiPieChart, FiZap } from "react-icons/fi"
import { SiCss3, SiGnubash, SiGo, SiHtml5, SiJavascript, SiJson, SiMarkdown, SiPhp, SiPython, SiRust, SiToml, SiTypescript, SiVuedotjs, SiWakatime, SiYaml } from "react-icons/si"
import { toast } from "sonner"

interface WakaTimeItem {
  name?: string
  text?: string
  percent?: number
  total_seconds?: number
  color?: string
  ai_additions?: number
  ai_deletions?: number
  human_additions?: number
  human_deletions?: number
  ai_agent_line_changes?: number
  ai_input_tokens?: number
  ai_output_tokens?: number
  ai_prompt_events?: number
}

interface WakaTimeAi {
  aiAdditions: number
  aiDeletions: number
  humanAdditions: number
  humanDeletions: number
  agentLineChanges: number
  inputTokens: number
  outputTokens: number
  promptEvents: number
  promptLengthAvg: number
  aiLines: number
  humanLines: number
  aiShare: number
  humanShare: number
  projectBreakdown: WakaTimeItem[]
  editorBreakdown: WakaTimeItem[]
}

interface WakaTimeData {
  allTimeText?: string
  allTimeSeconds?: number
  recentText?: string
  recentSeconds?: number
  totalText: string
  dailyAverageText: string
  bestDay?: { date?: string; text?: string } | null
  range?: { text?: string; start?: string; end?: string }
  languages: WakaTimeItem[]
  editors: WakaTimeItem[]
  projects: WakaTimeItem[]
  operatingSystems: WakaTimeItem[]
  categories?: WakaTimeItem[]
  ai?: WakaTimeAi
}

const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3776ab",
  Java: "#e76f00",
  CSS: "#663399",
  HTML: "#e34f26",
  Markdown: "#64748b",
  JSON: "#f97316",
  TOML: "#9ca3af",
  YAML: "#cb171e",
  PHP: "#777bb4",
  Go: "#00add8",
  Rust: "#dea584",
  Shell: "#89e051",
  Vue: "#42b883",
  Other: "#06b6d4",
}

const skillIconMap: Record<string, string> = {
  TypeScript: "ts",
  JavaScript: "js",
  Python: "py",
  Java: "java",
  CSS: "css",
  HTML: "html",
  Markdown: "md",
  PHP: "php",
  Go: "go",
  Rust: "rust",
  Shell: "bash",
  Vue: "vue",
}

const languageIconMap: Record<string, IconType> = {
  TypeScript: SiTypescript,
  JavaScript: SiJavascript,
  Python: SiPython,
  Java: FiCode,
  CSS: SiCss3,
  HTML: SiHtml5,
  Markdown: SiMarkdown,
  JSON: SiJson,
  TOML: SiToml,
  YAML: SiYaml,
  PHP: SiPhp,
  Go: SiGo,
  Rust: SiRust,
  Shell: SiGnubash,
  Bash: SiGnubash,
  Vue: SiVuedotjs,
  Other: FiFileText,
  "Image (svg)": FiImage,
}

function percent(value: unknown) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.min(100, num))
}

function itemSeconds(item: WakaTimeItem) {
  const seconds = Number(item.total_seconds)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0
}

function compactNumber(value: unknown) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return "0"
  return new Intl.NumberFormat("en", { notation: num >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(num)
}

function formatHours(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 min"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function formatCacheTime(ms?: number) {
  const remainingMinutes = Math.max(1, Math.round((ms || 0) / (60 * 1000)))
  const hours = Math.floor(remainingMinutes / 60)
  const minutes = remainingMinutes % 60
  return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`
}

function splitDurationLines(value: string) {
  const match = value.match(/^(.+?\b(?:hours?|hrs?|h))\s+(.+?\b(?:minutes?|mins?|m))$/i)
  return match ? [match[1], match[2]] : null
}

function colorFor(item: WakaTimeItem, index = 0) {
  return item.color || languageColors[item.name || ""] || ["#22c55e", "#06b6d4", "#f59e0b", "#8b5cf6", "#ef4444"][index % 5]
}

function iconForLanguage(name?: string) {
  return languageIconMap[name || ""] || FiFileText
}

function StatTile({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  const durationLines = splitDurationLines(value)

  return (
    <div className="wakatime-surface p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-800/72 dark:text-cyan-100/70">
        {icon}
        {label}
      </div>
      {durationLines ? (
        <p className="mt-2 text-2xl font-black leading-tight text-emerald-950 dark:text-zinc-50">
          <span className="block">{durationLines[0]}</span>
          <span className="block">{durationLines[1]}</span>
        </p>
      ) : (
        <p className="mt-2 text-2xl font-black text-emerald-950 dark:text-zinc-50">{value}</p>
      )}
      {hint && <p className="mt-1 truncate text-xs font-bold text-emerald-800/60 dark:text-slate-300/72">{hint}</p>}
    </div>
  )
}

function BarList({
  title,
  note,
  icon,
  items,
  limit = 5,
}: {
  title: string
  note?: string
  icon: ReactNode
  items: WakaTimeItem[]
  limit?: number
}) {
  const list = items.slice(0, limit)
  const maxSeconds = Math.max(...list.map(itemSeconds), 1)

  return (
    <div className="wakatime-surface p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-black text-emerald-950 dark:text-zinc-50">
          {icon}
          {title}
        </h4>
        {note && <span className="text-xs font-bold text-emerald-800/60 dark:text-slate-300/72">{note}</span>}
      </div>
      <div className="space-y-3">
        {list.length ? (
          list.map((item, index) => {
            const width = Math.max(6, (itemSeconds(item) / maxSeconds) * 100)
            const color = colorFor(item, index)
            return (
              <div key={`${title}-${item.name}-${index}`} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs font-bold">
                  <span className="min-w-0 truncate text-emerald-950 dark:text-slate-100">{item.name || "Unknown"}</span>
                  <span className="shrink-0 text-emerald-700 dark:text-cyan-100/78">{item.text || formatHours(itemSeconds(item))}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-emerald-950/10 dark:bg-white/10">
                  <div
                    className="h-full rounded-full shadow-[0_0_16px_rgba(45,212,191,0.34)]"
                    style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}, #a7f3d0)` }}
                  />
                </div>
              </div>
            )
          })
        ) : (
          <p className="rounded-xl bg-emerald-950/5 p-4 text-sm font-bold text-emerald-800/70 dark:bg-white/5 dark:text-slate-300">暂无数据</p>
        )}
      </div>
    </div>
  )
}

function LanguageChart({ languages }: { languages: WakaTimeItem[] }) {
  const topLanguages = languages.slice(0, 8)
  const maxSeconds = Math.max(...topLanguages.map(itemSeconds), 1)
  const axisTicks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="wakatime-surface p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-black text-emerald-950 dark:text-zinc-50">
          <FiCode className="h-4 w-4 text-cyan-600 dark:text-cyan-200" />
          语言时长
        </h4>
        <span className="text-xs font-bold text-emerald-800/60 dark:text-slate-300/72">Top {topLanguages.length || 0}</span>
      </div>
      <div className="wakatime-language-chart">
        <div className="wakatime-language-plot">
          <div className="wakatime-language-grid">
            {axisTicks.map((tick) => (
              <span key={tick} style={{ left: `${tick * 100}%` }} />
            ))}
          </div>
          {topLanguages.length ? (
            topLanguages.map((language, index) => {
              const width = Math.max(4, (itemSeconds(language) / maxSeconds) * 100)
              const color = colorFor(language, index)
              const LanguageIcon = iconForLanguage(language.name)
              return (
                <div key={`${language.name}-${index}`} className="wakatime-language-row">
                  <div className="wakatime-language-label">
                    <LanguageIcon aria-hidden="true" style={{ color }} />
                    <span>{language.name || "Unknown"}</span>
                  </div>
                  <div className="wakatime-language-bar-cell">
                    <div className="wakatime-language-bar" style={{ width: `${width}%`, backgroundColor: color }} />
                    <span>{language.text || formatHours(itemSeconds(language))}</span>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="rounded-xl bg-emerald-950/5 p-4 text-sm font-bold text-emerald-800/70 dark:bg-white/5 dark:text-slate-300">暂无语言时长数据</p>
          )}
          <div className="wakatime-language-axis">
            {axisTicks.map((tick) => (
              <span key={tick}>{formatHours(maxSeconds * tick)}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AiPanel({ ai }: { ai?: WakaTimeAi }) {
  const aiShare = percent(ai?.aiShare)
  const humanShare = percent(ai?.humanShare)
  const totalLines = Number(ai?.aiLines || 0) + Number(ai?.humanLines || 0)
  const aiProjects = ai?.projectBreakdown?.slice(0, 3) || []
  const aiEditors = ai?.editorBreakdown?.slice(0, 3) || []

  const Breakdown = ({ title, items }: { title: string; items: WakaTimeItem[] }) => (
    <div className="rounded-xl border border-emerald-950/8 bg-white/30 p-3 dark:border-white/10 dark:bg-white/[.035]">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-800/72 dark:text-cyan-100/70">{title}</p>
      <div className="space-y-2">
        {items.length ? (
          items.map((item, index) => {
            const lineChanges = Number(item.ai_additions || 0) + Number(item.ai_deletions || 0) + Number(item.ai_agent_line_changes || 0)
            return (
              <div key={`${title}-${item.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-emerald-950/5 px-2.5 py-2 dark:bg-white/[.04]">
                <span className="min-w-0 truncate text-xs font-black text-emerald-950 dark:text-slate-100">{item.name || "Unknown"}</span>
                <span className="shrink-0 text-xs font-bold text-emerald-700 dark:text-cyan-100/78">{compactNumber(lineChanges)} lines</span>
              </div>
            )
          })
        ) : (
          <p className="rounded-lg bg-emerald-950/5 px-2.5 py-2 text-xs font-bold text-emerald-800/68 dark:bg-white/[.04] dark:text-slate-300/72">暂无 AI 明细</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="wakatime-surface p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-black text-emerald-950 dark:text-zinc-50">
          <FiZap className="h-4 w-4 text-amber-500 dark:text-amber-200" />
          AI 协作
        </h4>
        <span className="text-xs font-bold text-emerald-800/60 dark:text-slate-300/72">{totalLines ? `${compactNumber(totalLines)} lines` : "no lines"}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-950/8 bg-white/36 p-3 dark:border-white/10 dark:bg-white/[.04]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700/72 dark:text-cyan-100/70">AI 变更</p>
          <p className="mt-2 text-xl font-black text-emerald-950 dark:text-zinc-50">{compactNumber(ai?.aiLines)}</p>
          <div className="wakatime-ai-meter mt-2 h-2 overflow-hidden rounded-full bg-emerald-950/10 dark:bg-white/10">
            <div className="wakatime-ai-meter-fill wakatime-ai-meter-fill-ai h-full rounded-full" style={{ width: `${Math.max(aiShare, aiShare ? 5 : 0)}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-emerald-800/68 dark:text-slate-300/75">新增 {compactNumber(ai?.aiAdditions)} / 删除 {compactNumber(ai?.aiDeletions)}</p>
        </div>
        <div className="rounded-xl border border-emerald-950/8 bg-white/36 p-3 dark:border-white/10 dark:bg-white/[.04]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700/72 dark:text-cyan-100/70">人工变更</p>
          <p className="mt-2 text-xl font-black text-emerald-950 dark:text-zinc-50">{compactNumber(ai?.humanLines)}</p>
          <div className="wakatime-ai-meter mt-2 h-2 overflow-hidden rounded-full bg-emerald-950/10 dark:bg-white/10">
            <div className="wakatime-ai-meter-fill wakatime-ai-meter-fill-human h-full rounded-full" style={{ width: `${Math.max(humanShare, humanShare ? 5 : 0)}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-emerald-800/68 dark:text-slate-300/75">新增 {compactNumber(ai?.humanAdditions)} / 删除 {compactNumber(ai?.humanDeletions)}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-emerald-950/5 p-3 dark:bg-white/[.04]">
          <p className="text-xs font-bold text-emerald-800/65 dark:text-slate-300/72">输入 Token</p>
          <p className="mt-1 text-lg font-black text-emerald-950 dark:text-zinc-50">{compactNumber(ai?.inputTokens)}</p>
        </div>
        <div className="rounded-xl bg-emerald-950/5 p-3 dark:bg-white/[.04]">
          <p className="text-xs font-bold text-emerald-800/65 dark:text-slate-300/72">输出 Token</p>
          <p className="mt-1 text-lg font-black text-emerald-950 dark:text-zinc-50">{compactNumber(ai?.outputTokens)}</p>
        </div>
        <div className="rounded-xl bg-emerald-950/5 p-3 dark:bg-white/[.04]">
          <p className="text-xs font-bold text-emerald-800/65 dark:text-slate-300/72">提示次数</p>
          <p className="mt-1 text-lg font-black text-emerald-950 dark:text-zinc-50">{compactNumber(ai?.promptEvents)}</p>
        </div>
        <div className="rounded-xl bg-emerald-950/5 p-3 dark:bg-white/[.04]">
          <p className="text-xs font-bold text-emerald-800/65 dark:text-slate-300/72">平均提示</p>
          <p className="mt-1 text-lg font-black text-emerald-950 dark:text-zinc-50">{compactNumber(ai?.promptLengthAvg)}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Breakdown title="AI 项目" items={aiProjects} />
        <Breakdown title="AI 编辑器" items={aiEditors} />
      </div>
    </div>
  )
}

export const WakaTimeStats = memo(function WakaTimeStats() {
  const [data, setData] = useState<WakaTimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchWakaTime() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/wakatime", { cache: "no-store" })
        const result = await response.json().catch(() => null)
        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "WakaTime 数据获取失败")
        }
        if (!cancelled) {
          setData(result.data)
          if (result.cached) {
            toast.success(`使用 WakaTime 缓存数据，剩余 ${formatCacheTime(result.expiresInMs)}`, {
              position: "top-center",
              duration: 3000,
              id: "wakatime-cache-info",
              icon: <FiClock className="h-4 w-4" />,
              style: { maxWidth: "420px", width: "max-content" },
            })
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "WakaTime 数据获取失败")
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchWakaTime()
    return () => {
      cancelled = true
    }
  }, [])

  const rangeText = data?.range?.text || "last 7 days"

  return (
    <div className="wakatime-card relative overflow-hidden rounded-2xl border border-emerald-900/10 bg-emerald-50/76 p-5 text-emerald-950 shadow-xl shadow-emerald-900/10 dark:border-cyan-300/18 dark:bg-slate-950/76 dark:text-slate-100 dark:shadow-cyan-950/25 md:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(255,255,255,.42),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(74,222,128,.18),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(6,182,212,.1),transparent_34%),linear-gradient(145deg,rgba(236,253,245,.48),rgba(220,252,231,.34))] dark:bg-[radial-gradient(circle_at_12%_10%,rgba(34,211,238,.14),transparent_30%),radial-gradient(circle_at_90%_18%,rgba(132,204,22,.1),transparent_30%),linear-gradient(145deg,rgba(15,23,42,.58),rgba(2,6,23,.44))]" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="mt-2 flex items-center gap-3 text-2xl font-black text-emerald-950 dark:text-zinc-50">
              <SiWakatime className="h-7 w-7 text-[#000000] dark:text-white" />
              WakaTime
            </h3>
          </div>
          <div className="rounded-full border border-emerald-800/10 bg-white/52 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-cyan-200/15 dark:bg-cyan-200/10 dark:text-cyan-100">
            {rangeText}
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-emerald-900/10 dark:bg-white/10" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-amber-600/18 bg-amber-100/52 p-4 text-sm font-semibold leading-7 text-amber-950 dark:border-amber-200/20 dark:bg-amber-200/10 dark:text-amber-50/82">
            <div className="flex items-center gap-2">
              <FiClock className="h-5 w-5" />
              等待 WakaTime 配置
            </div>
            <p className="mt-2 text-amber-900/72 dark:text-amber-50/70">{error}</p>
          </div>
        ) : data ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatTile icon={<FiClock className="h-4 w-4 text-emerald-600 dark:text-cyan-200" />} label="总编程时长" value={data.allTimeText || data.totalText} hint="WakaTime all time" />
                  <StatTile icon={<FiActivity className="h-4 w-4 text-emerald-600 dark:text-emerald-200" />} label="最近编程时长" value={data.recentText || data.totalText} hint={rangeText} />
                  <StatTile icon={<FiCpu className="h-4 w-4 text-violet-500 dark:text-violet-200" />} label="最佳单日" value={data.bestDay?.text || "No data"} hint={data.bestDay?.date} />
                </div>
                <BarList title="项目时长" note="最近 7 天" icon={<FiBarChart2 className="h-4 w-4 text-emerald-600 dark:text-cyan-200" />} items={data.projects} limit={5} />
                <BarList title="编辑器时长" icon={<FiMonitor className="h-4 w-4 text-violet-500 dark:text-violet-200" />} items={data.editors} limit={3} />
              </div>

              <div className="space-y-3">
                <AiPanel ai={data.ai} />
                <BarList title="系统时长" icon={<FiPieChart className="h-4 w-4 text-amber-500 dark:text-amber-200" />} items={data.operatingSystems} limit={3} />
              </div>
            </div>
            <LanguageChart languages={data.languages} />
          </div>
        ) : null}
      </div>
    </div>
  )
})
