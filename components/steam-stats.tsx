"use client"

import { memo, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocaleText } from "@/lib/use-locale-text"
import { toast } from "sonner"
import { SiSteam } from "react-icons/si"

interface GameData {
  appid: number
  name: string
  playtime_forever: number
  img_icon_url?: string
  playtime_2weeks?: number
}

interface SteamSocialLink {
  type?: string
  url?: string
}

interface SteamStatsProps {
  initialProfile?: {
    steam_user_id?: string
    social_links?: SteamSocialLink[]
    socialLinks?: SteamSocialLink[]
  }
}

const STEAM_CACHE_KEY = "steam_stats_data"
const CACHE_EXPIRY = 4 * 60 * 60 * 1000

type Translate = ReturnType<typeof useLocaleText>["t"]

function formatCacheTime(ms: number | undefined, t: Translate) {
  const remainingMinutes = Math.max(1, Math.round((ms || 0) / (60 * 1000)))
  const hours = Math.floor(remainingMinutes / 60)
  const minutes = remainingMinutes % 60
  return hours > 0 ? t("cache.timeHoursMinutes", "{{hours}}h {{minutes}}m", { hours, minutes }) : t("cache.timeMinutes", "{{minutes}}m", { minutes })
}

function showReadableSteamCacheToast(ms: number | undefined, t: Translate) {
  toast.success(t("cache.steam", "Using cached Steam data, {{time}} remaining", { time: formatCacheTime(ms, t) }), {
    position: "top-center",
    duration: 3000,
    id: "steam-cache-info",
    icon: <SiSteam className="h-4 w-4" />,
    style: { maxWidth: "400px", width: "max-content" },
  })
}

function isHardReload() {
  if (typeof window === "undefined") return false
  const navigation = window.performance?.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined
  return navigation?.type === "reload" && window.sessionStorage.getItem("force_refresh") === "true"
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (event) => {
    if ((event as any).ctrlKey) {
      sessionStorage.setItem("force_refresh", "true")
    }
  })

  window.addEventListener("load", () => {
    window.setTimeout(() => sessionStorage.removeItem("force_refresh"), 1000)
  })
}

export const SteamStats = memo(function SteamStats({ initialProfile }: SteamStatsProps) {
  const [games, setGames] = useState<GameData[]>([])
  const [ownedGames, setOwnedGames] = useState<GameData[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [steamProfileUrl, setSteamProfileUrl] = useState<string | null>(null)
  const { t, ready, locale } = useLocaleText()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function fetchSteamStats() {
      setLoading(true)
      setError(null)

      const now = Date.now()
      const cachedData = localStorage.getItem(STEAM_CACHE_KEY)
      const forceRefresh = isHardReload()
      let parsedCache: any = null

      if (cachedData && !forceRefresh) {
        try {
          parsedCache = JSON.parse(cachedData)
          if (parsedCache.timestamp && now - parsedCache.timestamp < CACHE_EXPIRY) {
            setGames(parsedCache.data?.recentGames || [])
            setOwnedGames(parsedCache.data?.topOwnedGames || [])
            setSteamProfileUrl(parsedCache.steamProfileUrl || null)
            setLoading(false)
            showReadableSteamCacheToast(parsedCache.timestamp + CACHE_EXPIRY - now, t)
            return
          }
        } catch {
          localStorage.removeItem(STEAM_CACHE_KEY)
        }
      }

      try {
        const profileData = initialProfile
          ? initialProfile
          : await (async () => {
              const profileResponse = await fetch("/api/profile-public", { cache: "no-store" })
              if (!profileResponse.ok) throw new Error("Failed to fetch profile data")
              return profileResponse.json()
            })()
        const userId = profileData.steam_user_id

        const socialLinks = Array.isArray(profileData.socialLinks)
          ? profileData.socialLinks
          : Array.isArray(profileData.social_links)
            ? profileData.social_links
            : []
        const steamLink = socialLinks.find((link: any) => link.type?.toLowerCase() === "steam")
        if (steamLink?.url) setSteamProfileUrl(steamLink.url)

        if (!userId) {
          setError(t("steam.userIdMissing"))
          setGames([])
          setOwnedGames([])
          return
        }

        const steamResponse = await fetch(`/api/steam?userId=${encodeURIComponent(userId)}&lang=${locale}`)
        const result = await steamResponse.json().catch(() => null)
        if (!steamResponse.ok || !result?.success) {
          throw new Error(result?.message || t("steam.errorFetching"))
        }

        setGames(result.data?.recentGames || [])
        setOwnedGames(result.data?.topOwnedGames || [])

        if (result.cached) {
          showReadableSteamCacheToast(result.expiresInMs, t)
        }

        localStorage.setItem(
          STEAM_CACHE_KEY,
          JSON.stringify({
            data: result.data,
            steamProfileUrl: steamLink?.url || steamProfileUrl,
            timestamp: now,
          })
        )
      } catch (err) {
        if (parsedCache?.data && !forceRefresh) {
          setGames(parsedCache.data?.recentGames || [])
          setOwnedGames(parsedCache.data?.topOwnedGames || [])
          setSteamProfileUrl(parsedCache.steamProfileUrl || null)
          setError(null)
          toast.warning(t("steam.localCacheFallback", "Steam request failed, using older local cache data"), {
            position: "top-center",
            duration: 3500,
            id: "steam-cache-info",
            icon: <SiSteam className="h-4 w-4" />,
            style: { maxWidth: "420px", width: "max-content" },
          })
          return
        }
        setError(err instanceof Error ? err.message : t("steam.errorFetching"))
        setGames([])
        setOwnedGames([])
      } finally {
        setLoading(false)
      }
    }

    if (ready) fetchSteamStats()
  }, [initialProfile, locale, ready, t])

  if (!mounted || loading || !ready) {
    return (
      <Card className="life-glass-card w-full overflow-hidden">
        <CardHeader className="bg-transparent">
          <CardTitle className="flex items-center justify-center gap-2 bg-transparent text-xl">
            <SiSteam className="h-7 w-7" />
            Steam
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-center py-4">
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-3">
                <div className="h-10 w-10 rounded bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderGame = (game: GameData, mode: "recent" | "total") => (
    <li key={`${mode}-${game.appid}`} className="min-w-0">
      <a
        href={`https://store.steampowered.com/app/${game.appid}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex min-w-0 flex-row items-center rounded-lg p-2 transition hover:bg-white/20 dark:hover:bg-black/30"
      >
        <img
          src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
          alt={game.name}
          className="h-10 w-10 shrink-0 rounded object-cover shadow"
          onError={(event) => {
            event.currentTarget.src = "/images/vapo.gif"
          }}
        />
        <div className="ml-3 min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{game.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {mode === "recent"
              ? t("steam.hoursPlayedRecent", { hours: game.playtime_2weeks !== undefined ? (game.playtime_2weeks / 60).toFixed(1) : "N/A" })
              : t("steam.hoursPlayedTotal", { hours: game.playtime_forever !== undefined ? (game.playtime_forever / 60).toFixed(1) : "N/A" })}
          </span>
        </div>
      </a>
    </li>
  )

  return (
    <Card className="life-glass-card w-full overflow-hidden">
      <CardHeader className="bg-transparent pb-2">
        <CardTitle className="flex items-center justify-center gap-3 bg-transparent text-2xl font-bold">
          <SiSteam className="h-8 w-8" />
          {t("steam.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 bg-transparent py-3">
        {error ? <p className="rounded-xl bg-white/20 p-3 text-sm font-semibold text-muted-foreground">{error}</p> : null}

        <div>
          <h4 className="mb-2 flex items-center gap-2 text-md font-semibold">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            {t("steam.recentActivity")}
          </h4>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => renderGame(game, "recent"))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-2 text-md font-semibold">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            {t("steam.topOwnedGames")}
          </h4>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ownedGames.map((game) => renderGame(game, "total"))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
})
