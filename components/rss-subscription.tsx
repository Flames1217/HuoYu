"use client";

import { useEffect, useState } from "react";
import { useLocaleText } from "@/lib/use-locale-text";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FiAlertCircle, FiCalendar, FiCopy, FiExternalLink, FiFileText, FiRss } from "react-icons/fi";

const RSS_TITLE_ICON = "https://img.viper3.top/%E5%B0%8F%E9%9C%9C%E5%8D%97%E9%A3%8E/%E5%B0%8F%E9%9C%9C%E5%8D%97%E9%A3%8E%E9%80%8F%E6%98%8E.jpg";
const RSS_FEED_URL = "https://blog.viper3.top/rss.xml";

interface Post {
  title: string;
  url: string;
  date?: string;
  summary?: string;
}

interface RSSSubscriptionProps {
  placement?: "hero" | "section";
  initialFoloUrl?: string | null;
}

export function RSSSubscription({ placement = "section", initialFoloUrl = null }: RSSSubscriptionProps) {
  const [copied, setCopied] = useState(false);
  const [rssUrl, setRssUrl] = useState<string | null>(null);
  const [foloUrl, setFoloUrl] = useState<string | null>(null);
  const [rssLoading, setRssLoading] = useState(true);
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const { t, locale } = useLocaleText();

  useEffect(() => {
    const fetchRssUrl = async () => {
      if (initialFoloUrl !== null) {
        setRssUrl(RSS_FEED_URL);
        setFoloUrl(initialFoloUrl);
        setRssLoading(false);
        return;
      }

      try {
        setRssLoading(true);
        const res = await fetch("/api/profile-public");
        if (!res.ok) throw new Error("Failed to fetch profile data for RSS URL");
        const data = await res.json();
        setRssUrl(RSS_FEED_URL);
        setFoloUrl(data.folo_url || null);
      } catch (e: any) {
        console.error("Error fetching rss_url or folo_url:", e);
        setRssUrl(RSS_FEED_URL);
        setFoloUrl(null);
      } finally {
        setRssLoading(false);
      }
    };

    const fetchLatestPosts = async () => {
      try {
        setPostsLoading(true);
        setPostsError(null);
        const res = await fetch(`/api/latest-posts?lang=${locale}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: "Failed to fetch latest posts" }));
          throw new Error(errorData.message || "Failed to fetch latest posts");
        }
        const data = await res.json();
        setLatestPosts(Array.isArray(data) ? data : []);
      } catch (e: any) {
        console.error("Error fetching latest posts:", e);
        setPostsError(e.message || "Could not load posts.");
      } finally {
        setPostsLoading(false);
      }
    };

    fetchRssUrl();
    fetchLatestPosts();
  }, [initialFoloUrl, locale]);

  const handleCopy = () => {
    if (!rssUrl) return;
    navigator.clipboard
      .writeText(rssUrl)
      .then(() => {
        setCopied(true);
        toast.success(t("rss.copiedToClipboard"));
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        toast.error(t("rss.copyFailed"));
        console.error("Failed to copy: ", err);
      });
  };

  const handleFollow = () => {
    window.open(foloUrl || rssUrl || RSS_FEED_URL, "_blank");
  };

  if (rssLoading) {
    return (
      <Card className="rss-showcase-card flex min-h-[320px] w-full flex-col justify-center gap-4 rounded-[28px] p-6">
        <Skeleton className="h-12 w-1/3 rounded-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </Card>
    );
  }

  const isHero = placement === "hero";
  const panelSize = isHero ? "h-[420px]" : "h-[600px]";
  const layoutClass = isHero ? "grid h-full min-h-0 gap-0 md:grid-cols-[0.92fr_1.08fr]" : "flex h-full min-h-0 flex-col";

  return (
    <Card className={`rss-showcase-card ${panelSize} w-full overflow-hidden rounded-[28px] p-0`}>
      <div className="rss-flower rss-flower-a" />
      <div className="rss-flower rss-flower-b" />
      <div className="rss-flower rss-flower-c" />

      <div className={layoutClass}>
        <div className={`rss-subscribe-pane flex flex-col justify-between gap-4 p-5 ${isHero ? "md:p-7" : ""}`}>
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/50 bg-white/70 shadow-lg">
                <img src={RSS_TITLE_ICON} alt="" className="h-full w-full scale-125 object-cover" loading="lazy" />
              </span>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700/70">RSS Preview</p>
                <h3 className="text-xl font-black tracking-tight text-emerald-950 md:text-2xl">{t("rss.subscribeTitle", "Subscribe to Xiaoshuang Nanfeng")}</h3>
              </div>
            </div>

            <p className="mb-4 text-left text-sm font-semibold leading-6 text-emerald-950/78">
              {t("rss.subscribeDescription", "Scattered petals and quiet notes.")}
            </p>

            <div className="rss-feed-url mb-3 flex items-center gap-2 rounded-2xl px-4 py-2.5">
              <FiRss className="h-4 w-4 shrink-0 text-emerald-700" />
              <span className="min-w-0 truncate font-mono text-sm font-semibold text-emerald-950">{rssUrl || RSS_FEED_URL}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCopy} size="sm" className="rss-action rss-action-copy">
                <FiCopy className="mr-2 h-4 w-4" />
                {copied ? t("rss.copiedButton") : t("rss.copyButtonText")}
              </Button>
              <Button size="sm" className="rss-action rss-action-folo" onClick={handleFollow}>
                <FiExternalLink className="mr-2 h-4 w-4" />
                folo
              </Button>
            </div>
          </div>

          {isHero && <div className="rss-note rounded-2xl p-4 text-left text-sm leading-6 text-emerald-950/72">
            {t("rss.readerNote", "Subscribe with a reader to get blog updates as soon as they publish. This preview reads the Typecho RSS feed directly.")}
          </div>}
        </div>

        <div className={`rss-preview-pane flex min-h-0 flex-1 flex-col p-5 ${isHero ? "md:p-7" : "pt-0"}`}>
          <div className="mb-3 flex items-center justify-between gap-4">
            <h4 className="flex items-center text-base font-black text-emerald-950">
              <FiFileText className="mr-2 h-5 w-5 text-emerald-700" />
              {t("rss.latestPosts", "Latest posts")}
            </h4>
            <span className="rounded-full border border-emerald-700/18 bg-white/48 px-3 py-1 text-xs font-bold text-emerald-900/70">
              {latestPosts.length} posts
            </span>
          </div>

          <div className="rss-post-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            {postsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-emerald-900/10 bg-white/35 p-4">
                    <Skeleton className="mb-3 h-4 w-1/3" />
                    <Skeleton className="mb-2 h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : postsError ? (
              <div className="flex items-center rounded-2xl border border-red-400/30 bg-red-50/50 p-4 text-sm font-semibold text-red-700">
                <FiAlertCircle className="mr-2 h-5 w-5" />
                {postsError}
              </div>
            ) : latestPosts.length > 0 ? (
              <ul className="space-y-3">
                {latestPosts.map((post, index) => (
                  <li key={post.url || index} className="rss-post-card">
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-emerald-900/58">
                      <span className="text-emerald-700">#{String(index + 1).padStart(2, "0")}</span>
                      {post.date && (
                        <span className="inline-flex items-center gap-1">
                          <FiCalendar className="h-3 w-3" />
                          {new Date(post.date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-black text-emerald-950 transition-colors hover:text-teal-700"
                      title={post.title}
                    >
                      {post.title}
                    </a>
                    {post.summary && <p className="mt-1 line-clamp-1 text-xs leading-5 text-emerald-950/62">{post.summary}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-emerald-900/10 bg-white/35 p-4 text-sm font-semibold text-emerald-950/70">
                {t("rss.noPosts", "No latest posts yet")}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
