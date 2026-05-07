import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const SETTINGS_PATH = path.resolve(process.cwd(), "settings.json")
const CACHE_DURATION = 4 * 60 * 60 * 1000
const contributionsCache: Record<string, { data: any; timestamp: number }> = {}

const levelMap: Record<string, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
}

function isHardReload(request: Request): boolean {
  const cacheControl = request.headers.get("Cache-Control")
  return Boolean(cacheControl?.includes("no-cache") || cacheControl?.includes("max-age=0"))
}

function readSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return { profile: {} }
  }
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"))
}

function resolveGithubConfig(username?: string | null) {
  const settings = readSettings()
  const profile = settings.profile || {}
  const configuredUsername = profile.githubUsername || settings.githubUsername || ""
  const normalizedUsername = username && username !== "GitHub" ? username : configuredUsername
  return {
    username: normalizedUsername,
    token: process.env.GITHUB_TOKEN || profile.github_token || settings.github_token || "",
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedUsername = searchParams.get("username")
  const { username, token } = resolveGithubConfig(requestedUsername)

  if (!username) {
    return NextResponse.json({ success: false, message: "Missing GitHub username" }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json({ success: false, message: "Missing GitHub token" }, { status: 400 })
  }

  const cacheKey = `github-contributions-${username}`
  const now = Date.now()
  const cached = contributionsCache[cacheKey]
  if (cached && now - cached.timestamp < CACHE_DURATION && !isHardReload(request)) {
    return NextResponse.json({
      success: true,
      cached: true,
      expiresInMs: cached.timestamp + CACHE_DURATION - now,
      data: cached.data,
    })
  }

  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              firstDay
              contributionDays {
                date
                contributionCount
                contributionLevel
                weekday
              }
            }
          }
        }
      }
    }
  `

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "HuoYu",
      },
      body: JSON.stringify({ query, variables: { username } }),
    })

    const result = await response.json().catch(() => null)
    if (!response.ok || result?.errors?.length) {
      const message = result?.errors?.[0]?.message || `GitHub GraphQL API ${response.status}`
      throw new Error(message)
    }

    const calendar = result?.data?.user?.contributionsCollection?.contributionCalendar
    if (!calendar) {
      throw new Error("GitHub contribution calendar data is empty")
    }

    const weeks = (calendar.weeks || []).map((week: any) => ({
      firstDay: week.firstDay,
      contributionDays: (week.contributionDays || []).map((day: any) => ({
        date: day.date,
        count: day.contributionCount || 0,
        level: levelMap[day.contributionLevel] ?? 0,
        weekday: day.weekday,
      })),
    }))

    const data = {
      username,
      totalContributions: calendar.totalContributions || 0,
      weeks,
    }

    contributionsCache[cacheKey] = { data, timestamp: now }
    return NextResponse.json({ success: true, cached: false, data })
  } catch (error: any) {
    console.error("[API GitHub Contributions] Request failed:", error)
    return NextResponse.json(
      { success: false, message: error.message || "GitHub contribution data fetching failed" },
      { status: 500 }
    )
  }
}
