"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SiGithub } from "react-icons/si";
import { SocialIcons } from "@/components/social-icons";
import { ProjectsSection } from "@/components/projects-section";
import { MBTICard } from "@/components/mbti-card";
import { SteamStats } from "@/components/steam-stats";
import { NeteaseMusicStats } from "@/components/netease-music-stats";
import { RSSSubscription } from "@/components/rss-subscription";
import { WeGamePreset } from "@/components/wegame-preset";
import { ReadingPreset } from "@/components/reading-preset";
import { PageHeaderControls } from "@/components/page-header-controls";
import { WakaTimeStats } from "@/components/wakatime-stats";
import { CacheApiToasts } from "@/components/cache-api-toasts";
import { FlameCard } from "@/components/card-flame";
import { ThemeBackgroundVideo } from "@/components/theme-background-video";
import { useLocaleText } from "@/lib/use-locale-text";

interface SocialLink {
  name: string;
  url: string;
  icon: string;
}

interface HomePageProfileData {
  avatarUrl?: string;
  nickname?: string;
  introduction?: string;
  githubUsername?: string;
  heroTitleLine1?: string;
  heroTitleLine2?: string;
  skillIconRow1?: string;
  skillIconRow2?: string;
  socialLinks?: SocialLink[];
  steam_user_id?: string;
  netease_user_id?: string;
  mbti_type?: string;
  mbti_image_url?: string;
  mbti_traits?: string[];
  mbti_title?: string;
  folo_url?: string;
  dayBackgroundVideoUrl?: string;
  nightBackgroundVideoUrl?: string;
}

const defaultIntro = "一个破烂爬虫开发者 | 前端又菜又爱玩 | 啥都会点 | 9年老烟民 🤣";
const defaultHeroTitleLine1 = "心中有火";
const defaultHeroTitleLine2 = "前方有光";
const defaultNickname = "三千焱";
const defaultAvatarUrl =
  "https://img.viper3.top/%E6%96%97%E7%A0%B4%E8%8B%8D%E7%A9%B9/%E8%90%A7%E7%82%8E%E6%89%8B%E7%BB%98.jpg";
const defaultHeroTitleLine1Aliases = [defaultHeroTitleLine1, "心中有火"];
const defaultHeroTitleLine2Aliases = [defaultHeroTitleLine2, "前方有光"];

const skillIconRows = [
  {
    ids: "html,css,js,nextjs,nodejs,java,php,py,fastapi,flask,wordpress,md,regex,pytorch",
    alt: "HTML, CSS, JavaScript, Next.js, Node.js, Java, PHP, Python, FastAPI, Flask, WordPress, Markdown, Regex, PyTorch",
  },
  {
    ids: "mysql,postgres,mongodb,redis,kafka,rabbitmq,docker,linux,git,maven,vim,anaconda,ps,pr",
    alt: "MySQL, PostgreSQL, MongoDB, Redis, Kafka, RabbitMQ, Docker, Linux, Git, Maven, Vim, Anaconda, Photoshop, Premiere Pro",
  },
];

function normalizeSkillIconIds(value?: string) {
  return (value || "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(",");
}

const defaultProfileData: HomePageProfileData = {
  avatarUrl: defaultAvatarUrl,
  nickname: defaultNickname,
  introduction: defaultIntro,
  githubUsername: "Flames1217",
  heroTitleLine1: defaultHeroTitleLine1,
  heroTitleLine2: defaultHeroTitleLine2,
  skillIconRow1: skillIconRows[0].ids,
  skillIconRow2: skillIconRows[1].ids,
  socialLinks: [],
  steam_user_id: "",
  netease_user_id: "",
  mbti_type: "",
  mbti_image_url: "",
  mbti_traits: [],
  mbti_title: "",
  folo_url: "",
  dayBackgroundVideoUrl: "",
  nightBackgroundVideoUrl: "",
};

function ShellCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`zero-panel rounded-2xl border border-slate-500/20 bg-slate-950/58 shadow-2xl shadow-black/28 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({
  title,
  accent,
  description,
}: {
  title: string;
  accent: string;
  description?: string;
}) {
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center">
      <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">
        {title} <span className="zero-gradient-text">{accent}</span>
      </h2>
      {description && <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-zinc-400 md:text-base">{description}</p>}
    </div>
  );
}

function GitHubActivity({ username }: { username?: string }) {
  const { t, locale } = useLocaleText();
  const [calendar, setCalendar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;

    async function fetchContributions() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/github-contributions?username=${encodeURIComponent(username || "")}`, { cache: "no-store" });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "GitHub contribution data fetching failed");
        }
        if (!cancelled) setCalendar(result.data);
      } catch (err) {
        if (!cancelled) {
          setCalendar(null);
          setError(err instanceof Error ? err.message : "GitHub contribution data fetching failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchContributions();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const monthLabels = useMemo(() => {
    if (!calendar?.weeks) return [];
    let lastMonth = "";
    return calendar.weeks.map((week: any, index: number) => {
      const month = new Date(`${week.firstDay}T00:00:00`).toLocaleString("en-US", { month: "short" });
      if (month === lastMonth) return { index, label: "" };
      lastMonth = month;
      return { index, label: month };
    });
  }, [calendar]);

  function contributionTooltip(count: number, date: string) {
    return count > 0
      ? t("front.githubHasContributions", "{{date}} has {{count}} contributions", { date, count })
      : t("front.githubNoContributions", "{{date}} has no contributions", { date });
  }

  if (!username) {
    return <div className="rounded-xl border border-emerald-950/10 bg-white/35 p-4 text-sm font-bold text-emerald-900 dark:border-white/10 dark:bg-white/[.05] dark:text-slate-300">{t("front.githubWaiting", "Waiting for GitHub username")}</div>;
  }

  if (loading) {
    return <div className="github-activity-frame h-44 animate-pulse" />;
  }

  if (error || !calendar?.weeks?.length) {
    return <div className="github-activity-frame text-sm font-black text-emerald-950 dark:text-slate-100">{error || "GitHub contribution data is empty"}</div>;
  }

  return (
    <div className="github-activity-frame">
      <div className="github-calendar-months" style={{ gridTemplateColumns: `repeat(${calendar.weeks.length}, minmax(0, 1fr))` }}>
        {monthLabels.map((month: any) => (
          <span key={`${month.index}-${month.label}`} style={{ gridColumn: month.index + 1 }}>
            {month.label}
          </span>
        ))}
      </div>
      <div className="github-calendar-body">
        <div className="github-calendar-weekdays">
          <span />
          <span>Mon</span>
          <span />
          <span>Wed</span>
          <span />
          <span>Fri</span>
          <span />
        </div>
        <div className="github-calendar-weeks" style={{ gridTemplateColumns: `repeat(${calendar.weeks.length}, minmax(0, 1fr))` }}>
          {calendar.weeks.map((week: any, weekIndex: number) => (
            <div className="github-calendar-week" key={week.firstDay}>
              {week.contributionDays.map((day: any) => (
                <button
                  type="button"
                  key={day.date}
                  className="github-calendar-day"
                  data-level={day.level}
                  aria-label={contributionTooltip(day.count, day.date)}
                  onMouseEnter={(event) => {
                    const targetRect = event.currentTarget.getBoundingClientRect();
                    const frameRect = event.currentTarget.closest(".github-activity-frame")?.getBoundingClientRect();
                    const rawX = targetRect.left - (frameRect?.left || 0) + targetRect.width / 2;
                    const frameWidth = frameRect?.width || 0;
                    setTooltip({
                      text: contributionTooltip(day.count, day.date),
                      x: frameWidth ? Math.min(frameWidth - 120, Math.max(120, rawX)) : rawX,
                      y: targetRect.top - (frameRect?.top || 0) - 10,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="github-calendar-footer">
        <span>{t("front.githubTotalContributions", "{{count}} contributions in the last year", { count: calendar.totalContributions })}</span>
        <span className="github-calendar-legend">
          Less
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} data-level={level} />
          ))}
          More
        </span>
      </div>
      {tooltip ? (
        <div className="github-calendar-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      ) : null}
    </div>
  );
}

function GitHubSignals({ username }: { username?: string }) {
  const { t } = useLocaleText();
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <FlameCard flame="九玄金雷">
      <ShellCard className="space-y-4 p-4 md:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
          <h3 className="mt-1 flex items-center gap-2 text-2xl font-black text-white">
            <SiGithub className="h-6 w-6" />
            {t("front.githubTitle", "GitHub Contributions")}
          </h3>
          </div>
          {username && (
            <a
              className="github-profile-link"
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${username} on GitHub`}
            >
              @{username}
            </a>
          )}
        </div>
        <GitHubActivity username={username} />
      </ShellCard>
      </FlameCard>

      <div className="github-wakatime-compact">
        <WakaTimeStats />
      </div>
    </div>
  );
}

export default function Home() {
  const { t, locale } = useLocaleText();
  const [profileData, setProfileData] = useState<HomePageProfileData>(defaultProfileData);
  const localizeDefaultText = (value: string | undefined, key: string, fallback: string, aliases: string[]) => {
    const nextValue = value || fallback;
    return locale !== "cn" && aliases.includes(nextValue) ? t(key, fallback) : nextValue;
  };
  const displayIntro =
    locale === "en" && (!profileData.introduction || profileData.introduction === defaultIntro)
      ? t("front.defaultIntro", defaultIntro)
      : profileData.introduction || defaultIntro;
  const displayHeroTitleLine1 = localizeDefaultText(
    profileData.heroTitleLine1,
    "front.heroTitleLine1",
    defaultHeroTitleLine1,
    defaultHeroTitleLine1Aliases
  );
  const displayHeroTitleLine2 = localizeDefaultText(
    profileData.heroTitleLine2,
    "front.heroTitleLine2",
    defaultHeroTitleLine2,
    defaultHeroTitleLine2Aliases
  );

  useEffect(() => {
    async function fetchProfileForPage() {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 3500);
      try {
        const response = await fetch("/api/profile-public", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to fetch profile data");
        const data = await response.json();
        setProfileData({
          avatarUrl: data.avatar_url || defaultProfileData.avatarUrl,
          nickname: data.nickname || defaultNickname,
          introduction: locale === "en" && (!data.introduction || data.introduction === defaultIntro) ? t("front.defaultIntro", defaultIntro) : data.introduction || defaultIntro,
          githubUsername: data.githubUsername || "Flames1217",
          heroTitleLine1: data.hero_title_line1 || defaultHeroTitleLine1,
          heroTitleLine2: data.hero_title_line2 || defaultHeroTitleLine2,
          skillIconRow1: normalizeSkillIconIds(data.skill_icon_row1) || skillIconRows[0].ids,
          skillIconRow2: normalizeSkillIconIds(data.skill_icon_row2) || skillIconRows[1].ids,
          socialLinks: data.social_links || [],
          steam_user_id: data.steam_user_id || "",
          netease_user_id: data.netease_user_id || "",
          mbti_type: data.mbti_type || "",
          mbti_image_url: data.mbti_image_url || "",
          mbti_traits: Array.isArray(data.mbti_traits) ? data.mbti_traits : [],
          mbti_title: data.mbti_title || "",
          folo_url: data.folo_url || "",
          dayBackgroundVideoUrl: data.day_background_video_url || "",
          nightBackgroundVideoUrl: data.night_background_video_url || "",
        });
      } catch {
        setProfileData({
          ...defaultProfileData,
          introduction: locale === "en" ? t("front.defaultIntro", defaultIntro) : defaultIntro,
          heroTitleLine1: defaultHeroTitleLine1,
          heroTitleLine2: defaultHeroTitleLine2,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    fetchProfileForPage();
  }, [locale, t]);

  return (
    <>
      <CacheApiToasts />
      <PageHeaderControls />
      <main className="front-landing min-h-screen overflow-hidden text-zinc-100">
        <ThemeBackgroundVideo dayUrl={profileData.dayBackgroundVideoUrl} nightUrl={profileData.nightBackgroundVideoUrl} />
        <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-center px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 flex w-full flex-col items-center text-center"
          >
            <div className="mb-10 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-violet-500/30 blur-2xl" />
                <img
                  src={profileData.avatarUrl || defaultAvatarUrl}
                  alt="Avatar"
                  className="relative h-28 w-28 rounded-3xl border border-white/20 object-cover shadow-2xl shadow-violet-950/40"
                />
              </div>
              <div className="flex flex-col items-center gap-3 sm:items-start">
                <div className="hero-nickname-badge inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1.5 text-sm font-semibold text-cyan-50 shadow-lg shadow-cyan-950/20">
                  {profileData.nickname || defaultNickname}
                </div>
                <div className="flame-motto-art" aria-label={`${t("front.mottoLine1", "The flame endures")}, ${t("front.mottoLine2", "The youth stands")}`}>
                  <span>{t("front.mottoLine1", "The flame endures")}</span>
                  <span>{t("front.mottoLine2", "The youth stands")}</span>
                </div>
              </div>
            </div>

            <h1 className="hero-lyric-title" aria-label={`${displayHeroTitleLine1} ${displayHeroTitleLine2}`}>
              <span className="hero-lyric-line hero-lyric-line-top">{displayHeroTitleLine1}</span>
              <span className="hero-lyric-line hero-lyric-line-bottom">{displayHeroTitleLine2}</span>
            </h1>
            <p className="mt-10 max-w-2xl text-base font-semibold leading-8 text-zinc-400 md:text-lg">{displayIntro}</p>

            <div className="mt-10">
              <SocialIcons initialLinks={profileData.socialLinks} />
            </div>

            <div className="mt-12 flex w-full max-w-4xl flex-col items-center gap-4 px-3">
              <a href="https://skillicons.dev" target="_blank" rel="noreferrer" className="block max-w-full" aria-label="Skill icons: languages and frameworks">
                <img
                  src={`https://skillicons.dev/icons?i=${profileData.skillIconRow1 || skillIconRows[0].ids}&theme=dark&perline=14`}
                  alt={skillIconRows[0].alt}
                  className="h-auto max-w-full"
                  loading="lazy"
                />
              </a>
              <a href="https://skillicons.dev" target="_blank" rel="noreferrer" className="block max-w-full" aria-label="Skill icons: data, tools and media">
                <img
                  src={`https://skillicons.dev/icons?i=${profileData.skillIconRow2 || skillIconRows[1].ids}&theme=dark&perline=14`}
                  alt={skillIconRows[1].alt}
                  className="h-auto max-w-full"
                  loading="lazy"
                />
              </a>
            </div>
          </motion.div>
        </section>

        <section className="zero-reveal mx-auto w-full max-w-[1480px] px-6 py-20">
          <SectionTitle title={t("front.lifeTitle", "Life")} accent={t("front.lifeAccent", "Signals")} description={t("front.lifeDescription", "Games, music, reading, subscriptions and personal status collected in one screen.")} />
          <div className="space-y-8">
            <div className="grid items-stretch gap-6 lg:grid-cols-2">
              <FlameCard flame="青莲地心火"><RSSSubscription initialFoloUrl={profileData.folo_url} /></FlameCard>
              <FlameCard flame="骨灵冷火"><ReadingPreset /></FlameCard>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <FlameCard flame="陨落心炎"><SteamStats initialProfile={{ social_links: profileData.socialLinks, steam_user_id: profileData.steam_user_id }} /></FlameCard>
                <FlameCard flame="海心焰"><WeGamePreset /></FlameCard>
              </div>
              <div className="space-y-6">
                <FlameCard flame="三千焱炎火"><MBTICard initialMbti={{ mbti_type: profileData.mbti_type, mbti_image_url: profileData.mbti_image_url, mbti_traits: profileData.mbti_traits, mbti_title: profileData.mbti_title }} /></FlameCard>
                <FlameCard flame="净莲妖火"><NeteaseMusicStats initialUserId={profileData.netease_user_id} /></FlameCard>
              </div>
            </div>
          </div>
        </section>

        <section className="zero-reveal mx-auto w-full max-w-[1280px] px-4 py-14">
          <SectionTitle title={t("front.devTitle", "Developer")} accent={t("front.devAccent", "Activity")} />
          <GitHubSignals username={profileData.githubUsername} />
        </section>

        <section className="zero-reveal mx-auto w-full max-w-7xl px-4 py-24">
          <SectionTitle title={t("front.projectsTitle", "Selected")} accent={t("front.projectsAccent", "Projects")} description={t("front.projectsDescription", "Repositories selected in the admin panel, ranked by maintenance activity, stars and forks.")} />
          <ProjectsSection />
        </section>
      </main>
    </>
  );
}
