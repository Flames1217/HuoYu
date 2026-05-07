"use client"

import { memo, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SiNeteasecloudmusic } from "react-icons/si"
import { toast } from "sonner"

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

function formatCacheTime(ms?: number) {
  const remainingMinutes = Math.max(1, Math.round((ms || 0) / (60 * 1000)))
  const hours = Math.floor(remainingMinutes / 60)
  const minutes = remainingMinutes % 60
  return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`
}

export const NeteaseMusicStats = memo(function NeteaseMusicStats() {
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
            toast.success(`使用网易云音乐缓存数据，剩余 ${formatCacheTime(parsed.timestamp + CACHE_EXPIRY - now)}`, {
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
        const profileRes = await fetch("/api/profile-public", { cache: "no-store" })
        const profile = await profileRes.json()
        const uid = profile.netease_user_id

        if (!uid) {
          setError("未配置网易云音乐用户 ID")
          return
        }

        const res = await fetch(`/api/netease-music?uid=${encodeURIComponent(uid)}`)
        const data = await res.json()
        if (!res.ok || !Array.isArray(data.data)) {
          throw new Error(data.message || "网易云音乐数据获取失败")
        }

        setRecords(data.data)
        if (data.cached) {
          toast.success(`使用网易云音乐缓存数据，剩余 ${formatCacheTime(data.expiresInMs)}`, {
            position: "top-center",
            duration: 3000,
            id: "netease-cache-info",
            icon: <SiNeteasecloudmusic className="h-4 w-4" />,
            style: { maxWidth: "420px", width: "max-content" },
          })
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify({ records: data.data, timestamp: now }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "网易云音乐数据获取失败")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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
      return <p className="rounded-xl bg-white/20 p-4 text-sm font-semibold text-muted-foreground">暂无听歌记录</p>
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
                  {song.artists.join(" / ")} · {song.playCount}次
                </p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    )
  }, [error, loading, records])

  return (
    <Card className="life-glass-card flex w-full flex-col overflow-hidden">
      <CardHeader className="bg-transparent pb-2">
        <CardTitle className="flex items-center justify-center gap-3 text-2xl font-black">
          <SiNeteasecloudmusic className="h-8 w-8 text-red-500" />
          聆听世界
        </CardTitle>
      </CardHeader>
      <CardContent className="w-full bg-transparent pt-3">
        <h4 className="mb-3 flex items-center gap-2 text-md font-semibold">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          最近一周听歌
        </h4>
        {content}
      </CardContent>
    </Card>
  )
})
