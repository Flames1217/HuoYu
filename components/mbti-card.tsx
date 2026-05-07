"use client"

import { memo, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

interface MBTIProfile {
  mbti_type?: string
  mbti_image_url?: string
  mbti_traits?: string[]
  mbti_title?: string
}

export const MBTICard = memo(function MBTICard() {
  const { t } = useTranslation()
  const [mbti, setMbti] = useState<MBTIProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMbti() {
      setLoading(true)
      try {
        const res = await fetch("/api/profile-public")
        if (!res.ok) throw new Error("MBTI fetch failed")
        const data = await res.json()
        setMbti({
          mbti_type: data.mbti_type || "",
          mbti_image_url: data.mbti_image_url || "",
          mbti_traits: Array.isArray(data.mbti_traits) ? data.mbti_traits : [],
          mbti_title: data.mbti_title || "",
        })
      } catch {
        setMbti(null)
      } finally {
        setLoading(false)
      }
    }

    fetchMbti()
  }, [])

  if (loading) {
    return (
      <div className="life-glass-card flex min-h-[360px] w-full items-center justify-center p-7">
        <div className="h-8 w-3/4 animate-pulse rounded bg-white/20" />
      </div>
    )
  }

  const mbtiType = mbti?.mbti_type || t("mbti.type")
  const mbtiTitle = "拥抱世界"
  const mbtiTraits =
    mbti?.mbti_traits && mbti.mbti_traits.length > 0
      ? mbti.mbti_traits
      : [t("mbti.trait1"), t("mbti.trait2"), t("mbti.trait3"), t("mbti.trait4")]
  const mbtiImage = mbti?.mbti_image_url || "/images/mbti-avatar.png"
  const mbtiTitleIcon = "/images/ODF.png"
  const personalityLogo = "https://www.16personalities.com/static/images/system/logo.svg"
  const traitEmoji = ["🎨", "🌱", "🤝", "🧭"]

  return (
    <div className="life-glass-card group relative flex min-h-[380px] w-full flex-col overflow-hidden p-7 transition duration-300">
      <div className="mb-7 flex items-center justify-center gap-3">
        <img src={mbtiTitleIcon} alt="" className="h-8 w-8 shrink-0 object-contain" loading="lazy" />
        <h2 className="text-2xl font-black tracking-tight text-emerald-950 dark:text-white">
          {mbtiTitle}
        </h2>
      </div>

      <div className="grid flex-1 items-center gap-7 sm:grid-cols-[1fr_136px]">
        <div className="space-y-5">
          <h4 className="text-sm font-black tracking-wide text-emerald-950/84 dark:text-zinc-100">
            {mbtiType} 性格特征
          </h4>
          <ul className="grid gap-4 sm:grid-cols-2">
            {mbtiTraits.slice(0, 4).map((trait, index) => (
              <li
                key={index}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-emerald-900/10 bg-white/32 px-4 py-3 text-sm font-semibold leading-6 text-emerald-950/82 shadow-sm dark:border-white/10 dark:bg-white/[.08] dark:text-zinc-200"
              >
                <span className="text-lg leading-none">{traitEmoji[index] || "✨"}</span>
                <span>{trait}</span>
              </li>
            ))}
          </ul>
        </div>

        <img
          src={mbtiImage}
          alt={`${mbtiType} Avatar`}
          className="mx-auto h-32 w-32 object-contain opacity-95 sm:mx-0"
          loading="lazy"
        />
      </div>

      <a
        href="https://www.16personalities.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto flex items-center justify-center gap-2 pt-6 text-center text-xs font-semibold text-emerald-950/62 transition hover:text-emerald-900 dark:text-zinc-400 dark:hover:text-violet-200"
      >
        <span>在</span>
        <img src={personalityLogo} alt="16personalities" className="h-5 w-auto object-contain" loading="lazy" />
        <span>了解更多关于 {mbtiType} 性格</span>
      </a>
    </div>
  )
})
