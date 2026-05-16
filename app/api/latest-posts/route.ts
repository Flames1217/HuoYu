import { NextResponse } from "next/server"
import Parser, { Item as RssParserItem } from "rss-parser"

interface Post {
  title: string
  url: string
  date?: string
  summary?: string
}

const RSS_URL = "https://blog.viper3.top/rss.xml"
const SITEMAP_URL = "https://blog.viper3.top/sitemap.xml"
const ARTICLE_URL_PATTERN = /^https:\/\/blog\.viper3\.top\/index\.php\/archives\/\d+\/?$/

function localeFromRequest(request: Request) {
  return new URL(request.url).searchParams.get("lang") === "en" ? "en" : "cn"
}

function msg(locale: string, cn: string, en: string) {
  return locale === "en" ? en : cn
}

function createSummary(htmlContent: string | undefined, maxLength = 100): string | undefined {
  if (!htmlContent) return undefined

  const textContent = htmlContent
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (textContent.length > maxLength) {
    return `${textContent.substring(0, maxLength)}...`
  }

  return textContent
}

function normalizeUrl(url: string) {
  return url.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/?$/, "/")
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
}

function stripSiteTitle(title: string) {
  return decodeHtmlEntities(title)
    .replace(/\s*[-–—]\s*小霜南风\s*$/i, "")
    .replace(/\s*»\s*小霜南风\s*$/i, "")
    .trim()
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.text()
}

function parseSitemapPosts(xml: string): Post[] {
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) || []

  return urlBlocks
    .map((block): Post | null => {
      const loc = block.match(/<loc>([\s\S]*?)<\/loc>/)?.[1]?.trim()
      if (!loc || !ARTICLE_URL_PATTERN.test(loc)) return null

      return {
        title: "",
        url: loc,
        date: block.match(/<lastmod>([\s\S]*?)<\/lastmod>/)?.[1]?.trim(),
      }
    })
    .filter((post): post is Post => Boolean(post))
}

async function fetchPostTitle(url: string) {
  try {
    const html = await fetchText(url)
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    const title = ogTitle || html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]
    return title ? stripSiteTitle(title) : undefined
  } catch (error) {
    console.warn(`Failed to fetch post title for ${url}:`, error)
    return undefined
  }
}

export async function GET(request: Request) {
  const locale = localeFromRequest(request)
  try {
    const parser = new Parser()
    const [rssXml, sitemapXml] = await Promise.all([
      fetchText(RSS_URL),
      fetchText(SITEMAP_URL).catch(() => ""),
    ])
    const feed = await parser.parseString(rssXml)

    const postMap = new Map<string, Post>()

    const rssPosts: Post[] = (feed.items || [])
      .map((item: RssParserItem & { contentSnippet?: string; content?: string }): Post => ({
        title: item.title || "Untitled Post",
        url: item.link || "#",
        date: item.isoDate || item.pubDate,
        summary: createSummary(item.contentSnippet || item.content),
      }))
      .filter((post) => post.url && post.url !== "#")

    for (const post of rssPosts) {
      postMap.set(normalizeUrl(post.url), post)
    }

    for (const post of parseSitemapPosts(sitemapXml)) {
      const key = normalizeUrl(post.url)
      if (!postMap.has(key)) {
        postMap.set(key, post)
      }
    }

    const postsMissingTitle = [...postMap.values()].filter((post) => !post.title)
    const fetchedTitles = await Promise.all(postsMissingTitle.map((post) => fetchPostTitle(post.url)))
    postsMissingTitle.forEach((post, index) => {
      post.title = fetchedTitles[index] || `${msg(locale, "文章", "Post")} #${post.url.match(/\/archives\/(\d+)/)?.[1] || ""}`.trim()
    })

    const posts = [...postMap.values()]
      .sort((a: Post, b: Post) => {
        if (!a.date || !b.date) return 0
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })

    return NextResponse.json(posts)
  } catch (error: any) {
    console.error("Error fetching or parsing RSS feed:", error)
    return NextResponse.json(
      { message: error.message || msg(locale, "获取最新文章失败", "Error fetching latest posts from RSS feed") },
      { status: 500 },
    )
  }
}
