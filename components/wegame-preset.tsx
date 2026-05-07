"use client"

import { memo, useEffect, useState } from "react"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SiWegame } from "react-icons/si"
import { toast } from "sonner"

interface WeGameInfo {
  gameId: string
  name: string
  slogan: string
  iconUrl: string
  posterUrl: string
  logoUrl: string
  duration: number
  todayDuration: number
  latestLoginTime: number
}

function formatHours(seconds: number) {
  if (!seconds) return "0 小时"
  const hours = seconds / 3600
  return `${hours >= 10 ? hours.toFixed(0) : hours.toFixed(1)} 小时`
}

function formatCacheTime(ms?: number) {
  const remainingMinutes = Math.max(1, Math.round((ms || 0) / (60 * 1000)))
  const hours = Math.floor(remainingMinutes / 60)
  const minutes = remainingMinutes % 60
  return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`
}

function formatLatestLogin(timestamp: number, todayDuration: number) {
  if (todayDuration > 0) return `今日 ${formatHours(todayDuration)}`
  if (!timestamp) return "最近游玩"

  const loginDate = new Date(timestamp * 1000)
  const now = new Date()
  const diffDays = Math.max(0, Math.floor((now.getTime() - loginDate.getTime()) / 86400000))

  if (diffDays === 0) return "今天登录"
  if (diffDays === 1) return "昨天登录"
  if (diffDays < 30) return `${diffDays} 天前登录`
  return `${loginDate.getFullYear()}/${loginDate.getMonth() + 1}/${loginDate.getDate()} 登录`
}

function playedWithinLast14Days(game: WeGameInfo) {
  if (game.todayDuration > 0) return true
  if (!game.latestLoginTime) return false
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000
  return Date.now() - game.latestLoginTime * 1000 <= fourteenDaysMs
}

function GameItem({ game, mode }: { game: WeGameInfo; mode: "recent" | "top" }) {
  const imageUrl = game.iconUrl || game.posterUrl || game.logoUrl || "/images/vapo.gif"
  const meta = mode === "recent" ? formatLatestLogin(game.latestLoginTime, game.todayDuration) : `总游玩 ${formatHours(game.duration)}`

  return (
    <li className="min-w-0">
      <div className="group flex min-w-0 flex-row items-center rounded-lg p-2 transition hover:bg-white/24 dark:hover:bg-black/30">
        <img
          src={imageUrl}
          alt={game.name}
          className="h-10 w-10 shrink-0 rounded object-cover shadow"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = "/images/vapo.gif"
          }}
        />
        <div className="ml-3 min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{game.name}</span>
          <span className="block truncate text-xs font-semibold text-muted-foreground">{meta}</span>
        </div>
      </div>
    </li>
  )
}

export const WeGamePreset = memo(function WeGamePreset() {
  const [recentGames, setRecentGames] = useState<WeGameInfo[]>([])
  const [topGames, setTopGames] = useState<WeGameInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWeGame() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/wegame", { cache: "no-store" })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "WeGame 数据获取失败")
        }
        setRecentGames((data.data?.recentGames || []).filter(playedWithinLast14Days))
        setTopGames(data.data?.topGames || [])
        if (data.cached) {
          toast.success(`使用 WeGame 缓存数据，剩余 ${formatCacheTime(data.expiresInMs)}`, {
            position: "top-center",
            duration: 3000,
            id: "wegame-cache-info",
            icon: <SiWegame className="h-4 w-4" />,
            style: { maxWidth: "420px", width: "max-content" },
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "WeGame 数据获取失败")
        setRecentGames([])
        setTopGames([])
      } finally {
        setLoading(false)
      }
    }

    fetchWeGame()
  }, [])

  return (
    <div className="life-glass-card w-full overflow-hidden">
      <CardHeader className="bg-transparent pb-2">
        <CardTitle className="flex items-center justify-center gap-3 bg-transparent text-2xl font-black">
          <SiWegame className="h-8 w-8 text-[#FAAB00]" />
          每帧热爱
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 bg-transparent py-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-3">
                <div className="h-10 w-10 rounded bg-white/30" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-3/4 rounded bg-white/30" />
                  <div className="h-3 w-1/2 rounded bg-white/30" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-muted-foreground">
            <p className="font-semibold text-foreground">等待 WeGame 配置</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : (
          <>
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-md font-semibold">
                <span className="inline-block h-2 w-2 rounded-full bg-[#00c8ff]" />
                最近游玩
              </h4>
              {recentGames.length ? (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {recentGames.map((game) => (
                    <GameItem key={`recent-${game.gameId}`} game={game} mode="recent" />
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl bg-white/24 p-3 text-sm font-semibold text-muted-foreground dark:bg-black/20">最近 14 天暂无游玩记录</p>
              )}
            </div>
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-md font-semibold">
                <span className="inline-block h-2 w-2 rounded-full bg-[#00e0b8]" />
                最爱玩
              </h4>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {topGames.map((game) => (
                  <GameItem key={`top-${game.gameId}`} game={game} mode="top" />
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </div>
  )
})
