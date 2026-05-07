"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { FiAlertCircle, FiExternalLink, FiGithub, FiRefreshCw, FiSave, FiSearch, FiStar } from "react-icons/fi";
import { GoRepoForked, GoStar } from "react-icons/go";

interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  tags: string[];
  githubUrl?: string;
  demoUrl?: string;
  status?: "published" | "draft" | "archived";
  showOnHome?: boolean;
  priority?: number;
  repoName?: string;
  repoFullName?: string;
  language?: string | null;
  ownerLogin?: string;
  isFork?: boolean;
  private?: boolean;
  stars?: number;
  forks?: number;
  openIssues?: number;
  updatedAt?: string;
  pushedAt?: string;
}

const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  PHP: "#4F5D95",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  C: "#555555",
  "C++": "#f34b7d",
  Markdown: "#083fa1",
};

function languageColor(language?: string | null) {
  return language ? languageColors[language] || "#8b949e" : "#6b7280";
}

function projectRank(project: Project) {
  const pushedAt = new Date(project.pushedAt || project.updatedAt || 0).getTime();
  const daysSincePush = pushedAt ? Math.max(0, (Date.now() - pushedAt) / 86400000) : 9999;
  const recentScore = Math.max(0, 180 - daysSincePush);
  return recentScore * 5 + (project.stars || 0) * 8 + (project.forks || 0) * 4;
}

function normalizeProject(project: any, index: number): Project {
  return {
    id: String(project.id || project.repoFullName || crypto.randomUUID()),
    title: String(project.title || project.repoName || project.repoFullName || "Untitled"),
    description: String(project.description || ""),
    imageUrl: project.imageUrl || "",
    tags: Array.isArray(project.tags) ? project.tags.map(String) : [],
    githubUrl: project.githubUrl || "",
    demoUrl: project.demoUrl || "",
    status: project.status || "published",
    showOnHome: project.showOnHome === true,
    priority: typeof project.priority === "number" ? project.priority : index,
    repoName: project.repoName || project.title || "",
    repoFullName: project.repoFullName || "",
    language: project.language || null,
    ownerLogin: project.ownerLogin || "",
    isFork: project.isFork === true,
    private: project.private === true,
    stars: project.stars || 0,
    forks: project.forks || 0,
    openIssues: project.openIssues || 0,
    updatedAt: project.updatedAt || project.pushedAt || "",
    pushedAt: project.pushedAt || "",
  };
}

function GitHubActionStat({ type, count }: { type: "star" | "fork"; count: number }) {
  const Icon = type === "star" ? GoStar : GoRepoForked;
  const label = type === "star" ? "Star" : "Fork";

  return (
    <span className="github-action-stat" aria-label={`${label} ${count}`}>
      <span className="github-action-main">
        <Icon className="github-action-icon" />
        {label}
      </span>
      <span className="github-action-count">{count}</span>
    </span>
  );
}

function LanguagePill({ language }: { language?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/35 px-2 py-1 text-xs text-slate-300">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor(language) }} />
      {language || "Unknown"}
    </span>
  );
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState("");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/projects");
      if (!response.ok) throw new Error("项目数据加载失败");
      const data = await response.json();
      setProjects(Array.isArray(data) ? data.map(normalizeProject) : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "项目数据加载失败");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    return projects
      .slice()
      .sort((a, b) => {
        const rankDiff = projectRank(b) - projectRank(a);
        if (rankDiff !== 0) return rankDiff;
        return (a.priority ?? 999) - (b.priority ?? 999);
      })
      .filter((project) => {
        if (!term) return true;
        return [project.title, project.description, project.repoFullName, project.language, ...(project.tags || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [projects, query]);

  const stats = useMemo(() => {
    const visible = projects.filter((project) => project.showOnHome === true).length;
    const stars = projects.reduce((total, project) => total + (project.stars || 0), 0);
    return { total: projects.length, visible, stars };
  }, [projects]);

  const filteredProjectIds = useMemo(() => filteredProjects.map((project) => project.id), [filteredProjects]);
  const selectedInFiltered = useMemo(
    () => filteredProjects.filter((project) => project.showOnHome === true).length,
    [filteredProjects]
  );
  const allFilteredSelected = filteredProjects.length > 0 && selectedInFiltered === filteredProjects.length;
  const partialFilteredSelected = selectedInFiltered > 0 && selectedInFiltered < filteredProjects.length;

  const updateProject = (projectId: string, patch: Partial<Project>) => {
    setProjects((items) => items.map((project) => (project.id === projectId ? { ...project, ...patch } : project)));
  };

  const toggleSelectAllFiltered = (checked: boolean | "indeterminate") => {
    const nextChecked = checked === true;
    const idSet = new Set(filteredProjectIds);
    setProjects((items) =>
      items.map((project) => (idSet.has(project.id) ? { ...project, showOnHome: nextChecked } : project))
    );
  };

  const syncGithubRepos = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/admin/github-repos", {
        method: "POST",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "GitHub 仓库同步失败");
      setProjects(Array.isArray(data.data) ? data.data.map(normalizeProject) : []);
      toast.success(`已同步 ${data.count || 0} 个本人公开非 fork 仓库`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "GitHub 仓库同步失败");
    } finally {
      setSyncing(false);
    }
  };

  const saveProjects = async () => {
    setSaving(true);
    try {
      const payload = projects.map((project, index) => ({
        ...project,
        priority: typeof project.priority === "number" ? project.priority : index,
        status: project.showOnHome === false ? "draft" : "published",
      }));
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "保存失败");
      toast.success("项目展示设置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-slate-300">
        <AiOutlineLoading3Quarters className="mr-3 h-8 w-8 animate-spin text-cyan-300" />
        正在加载项目控制台...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-5 py-4 text-slate-100">
      <section className="zero-admin-surface overflow-hidden rounded-2xl">
        <div className="border-b border-slate-300/10 px-5 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="admin-kicker">
                <FiGithub className="h-4 w-4" />
                GitHub 仓库同步
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white">项目管理</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                只同步本人公开、非 fork、非 archived 的仓库。勾选“前台展示”后才会出现在主页。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={syncGithubRepos} disabled={syncing} size="sm" className="bg-cyan-500 text-white hover:bg-cyan-400">
                {syncing ? <AiOutlineLoading3Quarters className="mr-2 h-4 w-4 animate-spin" /> : <FiRefreshCw className="mr-2 h-4 w-4" />}
                同步 GitHub
              </Button>
              <Button onClick={saveProjects} disabled={saving} size="sm" variant="outline" className="border-slate-500/40 bg-slate-800/55 text-slate-100 hover:bg-slate-700/65">
                {saving ? <AiOutlineLoading3Quarters className="mr-2 h-4 w-4 animate-spin" /> : <FiSave className="mr-2 h-4 w-4" />}
                保存展示
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-300/10 p-4 md:grid-cols-3">
          <div className="admin-metric">
            <span>仓库数量</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="admin-metric">
            <span>前台展示</span>
            <strong className="text-emerald-300">{stats.visible}</strong>
          </div>
          <div className="admin-metric">
            <span>Stars</span>
            <strong className="flex items-center gap-2 text-amber-300">
              <FiStar className="h-5 w-5" />
              {stats.stars}
            </strong>
          </div>
        </div>

        <div className="border-b border-slate-300/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-2xl flex-1">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索仓库、语言、标签..." className="pl-9" />
            </div>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-500/20 bg-slate-950/35 px-3 py-2 text-xs text-slate-300">
              <Checkbox
                checked={allFilteredSelected ? true : partialFilteredSelected ? "indeterminate" : false}
                onCheckedChange={toggleSelectAllFiltered}
                className="border-slate-500"
              />
              全选当前列表（{selectedInFiltered}/{filteredProjects.length}）
            </label>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {filteredProjects.map((project) => (
            <article key={project.id} className="admin-project-row">
              <div className="admin-project-meta">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-100">
                  <Checkbox
                    checked={project.showOnHome === true}
                    onCheckedChange={(checked) => updateProject(project.id, { showOnHome: Boolean(checked) })}
                    className="border-slate-500"
                  />
                  前台展示
                </label>

                <div className="space-y-2 rounded-xl border border-slate-500/20 bg-slate-950/28 p-3">
                  <p className="truncate font-mono text-xs text-cyan-100" title={project.repoFullName || project.githubUrl || project.title}>
                    {project.repoFullName || project.githubUrl || project.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <GitHubActionStat type="star" count={project.stars || 0} />
                    <GitHubActionStat type="fork" count={project.forks || 0} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <LanguagePill language={project.language} />
                    {project.githubUrl && (
                      <a href={project.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-200 hover:text-cyan-50">
                        GitHub <FiExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="admin-project-fields">
                <Input value={project.title} onChange={(event) => updateProject(project.id, { title: event.target.value })} className="font-semibold" />
                <Textarea
                  value={project.description}
                  onChange={(event) => updateProject(project.id, { description: event.target.value })}
                  placeholder="仓库简介"
                  className="resize-y text-sm leading-6"
                />
                <Input
                  value={(project.tags || []).join(", ")}
                  onChange={(event) =>
                    updateProject(project.id, {
                      tags: event.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="标签，用英文逗号分隔"
                  className="text-sm"
                />
              </div>

              <div className="admin-project-side">
                <Input
                  type="number"
                  value={project.priority ?? 0}
                  onChange={(event) => updateProject(project.id, { priority: Number(event.target.value) })}
                  title="排序值，越小越靠前"
                />
                <Input value={project.demoUrl || ""} onChange={(event) => updateProject(project.id, { demoUrl: event.target.value })} placeholder="演示地址" />
                {project.showOnHome === false && (
                  <div className="flex items-start gap-1.5 rounded-lg border border-amber-300/18 bg-amber-400/8 p-2 text-[11px] leading-4 text-amber-100">
                    <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    当前不会显示在前台。
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
