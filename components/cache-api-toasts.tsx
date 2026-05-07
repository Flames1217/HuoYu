"use client"

import { memo, useEffect } from "react"
import { SiNeteasecloudmusic, SiSteam } from "react-icons/si"
import { toast } from "sonner"

function formatCacheTime(ms?: number) {
  const remainingMinutes = Math.max(1, Math.round((ms || 0) / (60 * 1000)))
  const hours = Math.floor(remainingMinutes / 60)
  const minutes = remainingMinutes % 60
  return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`
}

export const CacheApiToasts = memo(function CacheApiToasts() {
  useEffect(() => {
    let cancelled = false

    async function showCacheToasts() {
      try {
        const profileResponse = await fetch("/api/profile-public", { cache: "no-store" })
        if (!profileResponse.ok) return

        const profile = await profileResponse.json()
        const requests: Promise<void>[] = []

        if (profile.steam_user_id && profile.steam_api_key) {
          const steamUrl = `/api/steam?userId=${encodeURIComponent(profile.steam_user_id)}&apiKey=${encodeURIComponent(profile.steam_api_key)}`
          requests.push(
            fetch(steamUrl)
              .then((response) => response.json())
              .then((data) => {
                if (!cancelled && data?.cached) {
                  toast.success(`使用 Steam 缓存数据，剩余 ${formatCacheTime(data.expiresInMs)}`, {
                    position: "top-center",
                    duration: 3000,
                    id: "steam-cache-info",
                    icon: <SiSteam className="h-4 w-4" />,
                    style: { maxWidth: "420px", width: "max-content" },
                  })
                }
              })
              .catch(() => undefined)
          )
        }

        if (profile.netease_user_id) {
          const neteaseUrl = `/api/netease-music?uid=${encodeURIComponent(profile.netease_user_id)}`
          requests.push(
            fetch(neteaseUrl)
              .then((response) => response.json())
              .then((data) => {
                if (!cancelled && data?.cached) {
                  toast.success(`使用网易云音乐缓存数据，剩余 ${formatCacheTime(data.expiresInMs)}`, {
                    position: "top-center",
                    duration: 3000,
                    id: "netease-cache-info",
                    icon: <SiNeteasecloudmusic className="h-4 w-4" />,
                    style: { maxWidth: "420px", width: "max-content" },
                  })
                }
              })
              .catch(() => undefined)
          )
        }

        await Promise.all(requests)
      } catch {
        // Cache hints are non-critical UI feedback.
      }
    }

    const timeout = window.setTimeout(showCacheToasts, 700)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [])

  return null
})
