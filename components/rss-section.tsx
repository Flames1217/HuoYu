"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useLocaleText } from "@/lib/use-locale-text"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FiRss } from "react-icons/fi"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Parser from "rss-parser"

interface RSSItem {
  title: string
  link: string
  date: string
  source: string
}

interface FeedItem extends Parser.Item {
  title?: string
  link?: string
  pubDate?: string
}

export function RSSSection() {
  const { t } = useLocaleText()
  const [rssItems, setRssItems] = useState<RSSItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFeed = async () => {
      const parser = new Parser<Record<string, unknown>, FeedItem>()
      try {
        const feedUrl = process.env.NEXT_PUBLIC_FEED_URL
        if (!feedUrl) {
          setError(t("rss.feedUrlError"))
          setLoading(false)
          return
        }
        const proxyUrl = `/api/cors-proxy?url=${encodeURIComponent(feedUrl)}`
        const feed = await parser.parseURL(proxyUrl)
        setRssItems(feed.items.slice(0, 5).map((item: FeedItem) => ({
          title: item.title || t("rss.unknownTitle"),
          link: item.link || "#",
          date: item.pubDate ? new Date(item.pubDate).toLocaleDateString() : t("rss.unknownDate"),
          source: (feed.title || t("rss.unknownSource")),
        })))
      } catch (err) {
        console.error("Failed to fetch RSS feed:", err)
        setError(t("rss.fetchError"))
      }
      setLoading(false)
    }

    fetchFeed()
  }, [t])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  }

  if (loading) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiRss className="h-5 w-5" />
            {t("rss.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiRss className="h-5 w-5" />
            {t("rss.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (rssItems.length === 0) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiRss className="h-5 w-5" />
            {t("rss.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">{t("rss.noArticles")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiRss className="h-5 w-5" />
            {t("rss.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {rssItems.map((item, index) => (
              <motion.div key={index} variants={itemVariants} className="border-b pb-3 last:border-0 last:pb-0">
                <Link
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:text-primary transition-colors"
                >
                  <h4 className="font-medium">{item.title}</h4>
                  <div className="text-sm text-muted-foreground flex items-center justify-between mt-1">
                    <span>{item.source}</span>
                    <span>{item.date}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" asChild>
              <Link href={process.env.NEXT_PUBLIC_FEED_URL || "#"} target="_blank" rel="noopener noreferrer">
                {t("rss.viewAll")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
