import { NextResponse } from "next/server"
import { getSettings } from "@/lib/settings-store"

export const dynamic = "force-dynamic"

const WEGAME_API_URL = "https://www.wegame.com.cn/api/v1/wegame.rail.game.UserCenter/GetAllGameInfo"
const CACHE_DURATION = 4 * 60 * 60 * 1000
const wegameCache: Record<string, { data: any; timestamp: number }> = {}

interface RawWeGameInfo {
  game_id?: string
  game_name?: string
  slogan?: string
  banner_icon_url?: string
  poster_url_h?: string
  poster_url_v?: string
  game_banner_logo?: {
    url?: string
  } | null
  duration?: number | string
  today_duration?: number | string
  latest_login_time?: number | string
  first_play_time?: number | string
}

function isHardReload(request: Request): boolean {
  const cacheControl = request.headers.get("Cache-Control")
  return Boolean(cacheControl?.includes("no-cache") || cacheControl?.includes("max-age=0"))
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapGame(game: RawWeGameInfo) {
  return {
    gameId: game.game_id || "",
    name: game.game_name || "未知游戏",
    slogan: game.slogan || "",
    iconUrl: game.banner_icon_url || game.game_banner_logo?.url || game.poster_url_h || game.poster_url_v || "",
    posterUrl: game.poster_url_h || game.poster_url_v || game.banner_icon_url || game.game_banner_logo?.url || "",
    logoUrl: game.game_banner_logo?.url || "",
    duration: toNumber(game.duration),
    todayDuration: toNumber(game.today_duration),
    latestLoginTime: toNumber(game.latest_login_time),
    firstPlayTime: toNumber(game.first_play_time),
  }
}

export async function GET(request: Request) {
  try {
    const settings = await getSettings({ profile: {} })
    const profile = settings.profile || {}
    const cookie = String(process.env.WEGAME_COOKIE || profile.wegame_cookie || "").trim()
    const tgpId = String(process.env.WEGAME_TGP_ID || profile.wegame_tgp_id || "").trim()

    if (!cookie || !tgpId) {
      return NextResponse.json(
        { success: false, message: "WeGame TGP ID 或 Cookie 未配置" },
        { status: 400 }
      )
    }

    const cacheKey = `wegame-${tgpId}-${cookie.slice(0, 8)}`
    const now = Date.now()
    const cached = wegameCache[cacheKey]
    if (cached && now - cached.timestamp < CACHE_DURATION && !isHardReload(request)) {
      return NextResponse.json({
        success: true,
        cached: true,
        expiresInMs: cached.timestamp + CACHE_DURATION - now,
        data: cached.data,
      })
    }

    const response = await fetch(WEGAME_API_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "*/*",
        "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "Content-Type": "application/json",
        Cookie: cookie,
        Referer: "https://www.wegame.com.cn/root/my-games/index.html",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.5414.120 Safari/537.36 qblink wegame.exe WeGame/6.5.0.3273",
      },
      body: JSON.stringify({
        head: { tgp_id: tgpId },
        dst_tgp_id: tgpId,
        from_src: "client.library",
        not_check_formal: 0,
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: `WeGame 请求失败：${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    if (data?.result?.error_code !== 0) {
      return NextResponse.json(
        { success: false, message: data?.result?.error_message || "WeGame 返回错误" },
        { status: 502 }
      )
    }

    const allGames = Array.isArray(data.formal_game_info)
      ? data.formal_game_info.map(mapGame)
      : []
    const recentGames = [...allGames]
      .filter((game) => game.latestLoginTime > 0)
      .sort((a, b) => b.latestLoginTime - a.latestLoginTime)
      .slice(0, 7)
    const topGames = [...allGames]
      .filter((game) => game.duration > 0)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)

    const responseData = {
        recentGames,
        topGames,
        allGames,
      }

    wegameCache[cacheKey] = { data: responseData, timestamp: now }
    return NextResponse.json({ success: true, cached: false, data: responseData })
  } catch (error) {
    console.error("[API WeGame] Error fetching WeGame data:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "WeGame 数据获取失败" },
      { status: 500 }
    )
  }
}
