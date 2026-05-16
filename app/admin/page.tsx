"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowRight, FiEdit3, FiFolder, FiGithub, FiHome, FiUser } from "react-icons/fi";
import { GiFlame } from "react-icons/gi";
import { withLocalePath, getLocaleFromPathname } from "@/lib/tolgee";
import { useLocaleText } from "@/lib/use-locale-text";

const navs = [
  {
    href: "/admin/profile",
    icon: FiUser,
  },
  {
    href: "/admin/projects",
    icon: FiFolder,
  },
  {
    href: "/admin/footer",
    icon: FiEdit3,
  },
] as const;

export default function AdminDashboard() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const { t } = useLocaleText();

  const translatedNavs = [
    {
      ...navs[0],
      label: t("adminDashboard.navProfile", "个人资料"),
      description: t("adminDashboard.profileDescription", "维护昵称、头像、首页标题、社交链接、GitHub Token 与媒体账号。"),
      tag: t("adminDashboard.profileTag", "Profile"),
    },
    {
      ...navs[1],
      label: t("adminDashboard.navProjects", "项目管理"),
      description: t("adminDashboard.projectsDescription", "同步本人公开仓库，选择要展示到个人主页的项目。"),
      tag: t("adminDashboard.projectsTag", "Repos"),
    },
    {
      ...navs[2],
      label: t("adminDashboard.navFooter", "页脚管理"),
      description: t("adminDashboard.footerDescription", "维护页脚版权作者，备案和版权格式由前台固定渲染。"),
      tag: t("adminDashboard.footerTag", "Footer"),
    },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 py-4">
      <section className="admin-hero">
        <div>
          <div className="admin-kicker">
            <GiFlame className="h-4 w-4" />
            {t("adminDashboard.kicker", "HuoYu Admin")}
          </div>
          <h1>{t("adminLayout.title", "管理中心")}</h1>
          <p>{t("adminDashboard.welcomeDescription", "站点内容、项目展示和主页资料都在这里维护。后台保留必要入口，减少无意义的装饰和占位。")}</p>
        </div>
        <div className="admin-hero-card">
          <FiGithub className="admin-hero-card-icon h-5 w-5" />
          <div>
            <strong>{t("adminDashboard.githubSourceLabel", "GitHub 数据源")}</strong>
            <span>{t("adminDashboard.githubSourceDescription", "仅同步本人公开、非 fork、非 archived 的仓库。")}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {translatedNavs.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={withLocalePath(locale, item.href)} className="admin-entry-card group">
              <div className="flex items-start justify-between gap-4">
                <div className="admin-entry-icon">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="admin-entry-tag">{item.tag}</span>
              </div>
              <h2>{item.label}</h2>
              <p>{item.description}</p>
              <div className="admin-entry-action">
                {t("adminDashboard.enterConfig", "进入配置")}
                <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="zero-admin-surface rounded-2xl p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="admin-metric">
            <span>{t("adminDashboard.contentEntries", "内容入口")}</span>
            <strong>3</strong>
          </div>
          <div className="admin-metric">
            <span>{t("adminDashboard.repoStrategy", "仓库策略")}</span>
            <strong>{t("adminDashboard.publicPersonalRepos", "公开本人仓库")}</strong>
          </div>
          <div className="admin-metric">
            <span>{t("adminDashboard.displayMode", "展示方式")}</span>
            <strong>{t("adminDashboard.manualSelection", "手动勾选")}</strong>
          </div>
        </div>
      </section>

      <Link href={withLocalePath(locale, "/")} className="admin-return-link">
        <FiHome className="h-4 w-4" />
        {t("adminDashboard.backToFront", "回到前台")}
      </Link>
    </div>
  );
}
