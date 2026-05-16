"use client"

import { memo, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SiNeteasecloudmusic } from "react-icons/si"
import { toast } from "sonner"
import { useLocaleText } from "@/lib/use-locale-text"

interface SongRecord {
  rank: number
  id: number
  name: string
  artists: string[]
  album: string
  playCount: number
  cover: string
}

const CACHE_KEY = "netease_music_recent_records"
const CACHE_EXPIRY = 4 * 60 * 60 * 1000

interface NeteaseMusicStatsProps {
  initialUserId?: string
}

function formatCacheTime(ms: number | undefined, t: ReturnType<typeof useLocaleText>["t"]) {
  const remainingMinutes = Math.max(1, Math.round((ms || 0) / (60 * 1000)))
  const hours = Math.floor(remainingMinutes / 60)
  const minutes = remainingMinutes % 60
  return hours > 0 ? t("cache.timeHoursMinutes", "{{hours}}h {{minutes}}m", { hours, minutes }) : t("cache.timeMinutes", "{{minutes}}m", { minutes })
}

export const NeteaseMusicStats = memo(function NeteaseMusicStats({ initialUserId }: NeteaseMusicStatsProps) {
  const { t, locale } = useLocaleText()
  const [records, setRecords] = useState<SongRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      const now = Date.now()
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (parsed.timestamp && now - parsed.timestamp < CACHE_EXPIRY) {
            setRecords(parsed.records || [])
            setLoading(false)
            toast.success(t("neteaseMusic.cacheUsed", "Using cached NetEase Cloud Music data, {{time}} remaining", { time: formatCacheTime(parsed.timestamp + CACHE_EXPIRY - now, t) }), {
              position: "top-center",
              duration: 3000,
              id: "netease-cache-info",
              icon: <SiNeteasecloudmusic className="h-4 w-4" />,
              style: { maxWidth: "420px", width: "max-content" },
            })
            return
          }
        } catch {
          localStorage.removeItem(CACHE_KEY)
        }
      }

      try {
        const uid = initialUserId || await (async () => {
          const profileRes = await fetch("/api/profile-public", { cache: "no-store" })
          const profile = await profileRes.json()
          return profile.netease_user_id
        })()

        if (!uid) {
          setError(t("neteaseMusic.noUserId", "NetEase Cloud Music user ID is not configured"))
          return
        }

        const res = await fetch(`/api/netease-music?uid=${encodeURIComponent(uid)}&lang=${locale}`)
        const data = await res.json()
        if (!res.ok || !Array.isArray(data.data)) {
          throw new Error(data.message || t("neteaseMusic.fetchError", "Failed to fetch NetEase Cloud Music data"))
        }

        setRecords(data.data)
        if (data.cached) {
          toast.success(t("neteaseMusic.cacheUsed", "Using cached NetEase Cloud Music data, {{time}} remaining", { time: formatCacheTime(data.expiresInMs, t) }), {
            position: "top-center",
            duration: 3000,
            id: "netease-cache-info",
            icon: <SiNeteasecloudmusic className="h-4 w-4" />,
            style: { maxWidth: "420px", width: "max-content" },
          })
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify({ records: data.data, timestamp: now }))
      } catch (err) {
        setError(err instanceof Error ? err.message : t("neteaseMusic.fetchError", "Failed to fetch NetEase Cloud Music data"))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [initialUserId, locale, t])

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(9)].map((_, index) => (
            <div key={index} className="flex animate-pulse items-center gap-3 rounded-lg p-2">
              <div className="h-10 w-10 rounded bg-white/30" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="h-4 w-3/4 rounded bg-white/30" />
                <div className="h-3 w-1/2 rounded bg-white/30" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (error) {
      return <p className="rounded-xl bg-white/20 p-4 text-sm font-semibold text-muted-foreground">{error}</p>
    }

    if (records.length === 0) {
      return <p className="rounded-xl bg-white/20 p-4 text-sm font-semibold text-muted-foreground">{t("neteaseMusic.noRecords", "No listening records yet")}</p>
    }

    return (
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {records.map((song) => (
          <li key={song.id} className="min-w-0">
            <a
              href={`https://music.163.com/song?id=${song.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-w-0 items-center gap-3 rounded-lg p-2 transition hover:bg-white/24 dark:hover:bg-black/30"
            >
              <img src={song.cover} alt={song.name} className="h-10 w-10 shrink-0 rounded object-cover shadow" loading="lazy" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{song.name}</p>
                <p className="truncate text-xs font-semibold text-muted-foreground">
                  {song.artists.join(" / ")} · {song.playCount} {t("neteaseMusic.playCountUnit", "plays")}
                </p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    )
  }, [error, loading, records, t])

  return (
    <Card className="life-glass-card flex w-full flex-col overflow-hidden">
      <CardHeader className="bg-transparent pb-2">
        <CardTitle className="flex items-center justify-center gap-3 text-2xl font-black">
          <SiNeteasecloudmusic className="h-8 w-8 text-red-500" />
          {t("neteaseMusic.title", "Listening World")}
        </CardTitle>
      </CardHeader>
      <CardContent className="w-full bg-transparent pt-3">
        <h4 className="mb-3 flex items-center gap-2 text-md font-semibold">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          {t("neteaseMusic.recentPlaysTitle", "Songs played this week")}
        </h4>
        {content}
      </CardContent>
    </Card>
  )
})
