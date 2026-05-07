"use client";

import Link from "next/link";
import { FiArrowRight, FiEdit3, FiFolder, FiGithub, FiHome, FiUser } from "react-icons/fi";
import { GiFlame } from "react-icons/gi";

const navs = [
  {
    href: "/admin/profile",
    icon: FiUser,
    label: "\u4e2a\u4eba\u8d44\u6599",
    desc: "\u7ef4\u62a4\u6635\u79f0\u3001\u5934\u50cf\u3001\u9996\u9875\u6807\u9898\u3001\u793e\u4ea4\u94fe\u63a5\u3001GitHub Token \u4e0e\u5a92\u4f53\u8d26\u53f7\u3002",
    tag: "Profile",
  },
  {
    href: "/admin/projects",
    icon: FiFolder,
    label: "\u9879\u76ee\u7ba1\u7406",
    desc: "\u540c\u6b65\u672c\u4eba\u516c\u5f00\u4ed3\u5e93\uff0c\u9009\u62e9\u8981\u5c55\u793a\u5230\u4e2a\u4eba\u4e3b\u9875\u7684\u9879\u76ee\u3002",
    tag: "Repos",
  },
  {
    href: "/admin/footer",
    icon: FiEdit3,
    label: "\u9875\u811a\u7ba1\u7406",
    desc: "\u7ef4\u62a4\u9875\u811a\u7248\u6743\u4f5c\u8005\uff0c\u5907\u6848\u548c\u7248\u6743\u683c\u5f0f\u7531\u524d\u53f0\u56fa\u5b9a\u6e32\u67d3\u3002",
    tag: "Footer",
  },
];

export default function AdminDashboard() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 py-4">
      <section className="admin-hero">
        <div>
          <div className="admin-kicker">
            <GiFlame className="h-4 w-4" />
            HuoYu Admin
          </div>
          <h1>{"\u7ba1\u7406\u4e2d\u5fc3"}</h1>
          <p>{"\u7ad9\u70b9\u5185\u5bb9\u3001\u9879\u76ee\u5c55\u793a\u548c\u4e3b\u9875\u8d44\u6599\u90fd\u5728\u8fd9\u91cc\u7ef4\u62a4\u3002\u540e\u53f0\u4fdd\u7559\u5fc5\u8981\u5165\u53e3\uff0c\u51cf\u5c11\u65e0\u610f\u4e49\u7684\u88c5\u9970\u548c\u5360\u4f4d\u3002"}</p>
        </div>
        <div className="admin-hero-card">
          <FiGithub className="admin-hero-card-icon h-5 w-5" />
          <div>
            <strong>GitHub {"\u6570\u636e\u6e90"}</strong>
            <span>{"\u4ec5\u540c\u6b65\u672c\u4eba\u516c\u5f00\u3001\u975e fork\u3001\u975e archived \u7684\u4ed3\u5e93\u3002"}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {navs.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="admin-entry-card group">
              <div className="flex items-start justify-between gap-4">
                <div className="admin-entry-icon">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="admin-entry-tag">{item.tag}</span>
              </div>
              <h2>{item.label}</h2>
              <p>{item.desc}</p>
              <div className="admin-entry-action">
                {"\u8fdb\u5165\u914d\u7f6e"}
                <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="zero-admin-surface rounded-2xl p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="admin-metric">
            <span>{"\u5185\u5bb9\u5165\u53e3"}</span>
            <strong>3</strong>
          </div>
          <div className="admin-metric">
            <span>{"\u4ed3\u5e93\u7b56\u7565"}</span>
            <strong>{"\u516c\u5f00\u672c\u4eba\u4ed3\u5e93"}</strong>
          </div>
          <div className="admin-metric">
            <span>{"\u5c55\u793a\u65b9\u5f0f"}</span>
            <strong>{"\u624b\u52a8\u52fe\u9009"}</strong>
          </div>
        </div>
      </section>

      <Link href="/" className="admin-return-link">
        <FiHome className="h-4 w-4" />
        {"\u56de\u5230\u524d\u53f0"}
      </Link>
    </div>
  );
}
