"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArchive,
  FiChevronDown,
  FiClock,
  FiDownload,
  FiEdit3,
  FiExternalLink,
  FiGithub,
  FiImage,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiStar,
  FiX,
} from "react-icons/fi";
import { GoRepoForked, GoStar } from "react-icons/go";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useLocaleText } from "@/lib/use-locale-text";

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
  githubRepoId?: string;
  githubNodeId?: string;
  language?: string | null;
  ownerLogin?: string;
  isFork?: boolean;
  private?: boolean;
  ownerOrigin?: boolean;
  stars?: number;
  forks?: number;
  openIssues?: number;
  updatedAt?: string;
  pushedAt?: string;
  syncedAt?: string;
}

interface ReadmeImageCandidate {
  url: string;
  alt: string;
}

type VisibilityFilter = "all" | "visible" | "hidden";
type RepoTypeFilter = "all" | "public" | "private" | "fork" | "archived";
type SortKey = "priority" | "updated" | "stars" | "forks" | "name" | "language" | "visible";
type SortDirection = "asc" | "desc";

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

function normalizeProject(project: any, index: number): Project {
  return {
    id: String(project.id || project.repoFullName || crypto.randomUUID()),
    title: String(project.title || project.repoName || project.repoFullName || "Untitled"),
    description: String(project.description || ""),
    imageUrl: project.imageUrl || "",
    tags: Array.isArray(project.tags) ? project.tags.map(String) : [],
    githubUrl: project.githubUrl || "",
    demoUrl: project.demoUrl || "",
    status: project.status || "draft",
    showOnHome: project.showOnHome === true,
    priority: typeof project.priority === "number" ? project.priority : index,
    repoName: project.repoName || project.title || "",
    repoFullName: project.repoFullName || "",
    githubRepoId: project.githubRepoId ? String(project.githubRepoId) : "",
    githubNodeId: project.githubNodeId || "",
    language: project.language || null,
    ownerLogin: project.ownerLogin || "",
    isFork: project.isFork === true,
    private: project.private === true,
    ownerOrigin: project.ownerOrigin === true,
    stars: project.stars || 0,
    forks: project.forks || 0,
    openIssues: project.openIssues || 0,
    updatedAt: project.updatedAt || project.pushedAt || "",
    pushedAt: project.pushedAt || "",
    syncedAt: project.syncedAt || "",
  };
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function projectSearchText(project: Project) {
  return [
    project.title,
    project.description,
    project.repoFullName,
    project.repoName,
    project.language,
    project.ownerLogin,
    ...(project.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function compareProjects(a: Project, b: Project, sortKey: SortKey, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;
  const value = (project: Project) => {
    if (sortKey === "priority") return project.priority ?? 999;
    if (sortKey === "updated") return new Date(project.pushedAt || project.updatedAt || 0).getTime();
    if (sortKey === "stars") return project.stars || 0;
    if (sortKey === "forks") return project.forks || 0;
    if (sortKey === "visible") return project.showOnHome ? 1 : 0;
    if (sortKey === "language") return project.language || "";
    return project.title || project.repoName || "";
  };

  const left = value(a);
  const right = value(b);
  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * multiplier;
  }
  return String(left).localeCompare(String(right), "zh-CN") * multiplier;
}

function repoBadges(project: Project) {
  return [
    project.private ? "Private" : "Public",
    project.isFork ? "Fork" : "",
    project.status === "archived" ? "Archived" : "",
  ].filter(Boolean);
}

function LanguagePill({ language }: { language?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/25 bg-white/45 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-950/35 dark:text-slate-300">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor(language) }} />
      {language || "Unknown"}
    </span>
  );
}

function SortButton({
  active,
  direction,
  children,
  onClick,
}: {
  active: boolean;
  direction: SortDirection;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-left font-bold transition hover:bg-cyan-400/10"
    >
      {children}
      <FiChevronDown className={`h-3.5 w-3.5 transition ${active && direction === "asc" ? "rotate-180" : ""} ${active ? "opacity-100" : "opacity-25"}`} />
    </button>
  );
}

export default function AdminProjectsPage() {
  const { t } = useLocaleText();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [repoTypeFilter, setRepoTypeFilter] = useState<RepoTypeFilter>("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [coverProjectId, setCoverProjectId] = useState<string | null>(null);
  const [manualCoverUrl, setManualCoverUrl] = useState("");
  const [loadingImagesByProjectId, setLoadingImagesByProjectId] = useState<Record<string, boolean>>({});
  const [readmeImagesByProjectId, setReadmeImagesByProjectId] = useState<Record<string, ReadmeImageCandidate[]>>({});

  const coverProject = useMemo(
    () => projects.find((project) => project.id === coverProjectId) || null,
    [projects, coverProjectId],
  );

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/projects");
      if (!response.ok) throw new Error(t("adminProjects.toastFetchError", "项目数据加载失败"));
      const data = await response.json();
      const normalizedProjects = Array.isArray(data) ? data.map(normalizeProject) : [];
      const readmeImages = Array.isArray(data)
        ? data.reduce((items: Record<string, ReadmeImageCandidate[]>, project: any, index: number) => {
            const normalized = normalizedProjects[index];
            if (normalized && Array.isArray(project.readmeImages)) {
              items[normalized.id] = project.readmeImages;
            }
            return items;
          }, {})
        : {};

      setProjects(normalizedProjects);
      setReadmeImagesByProjectId(readmeImages);
      setSelectedIds([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("adminProjects.toastFetchError", "项目数据加载失败"));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const languages = useMemo(() => {
    return Array.from(new Set(projects.map((project) => project.language).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    return projects
      .filter((project) => {
        if (term && !projectSearchText(project).includes(term)) return false;
        if (visibilityFilter === "visible" && project.showOnHome !== true) return false;
        if (visibilityFilter === "hidden" && project.showOnHome === true) return false;
        if (repoTypeFilter === "public" && project.private === true) return false;
        if (repoTypeFilter === "private" && project.private !== true) return false;
        if (repoTypeFilter === "fork" && project.isFork !== true) return false;
        if (repoTypeFilter === "archived" && project.status !== "archived") return false;
        if (languageFilter !== "all" && project.language !== languageFilter) return false;
        return true;
      })
      .sort((a, b) => compareProjects(a, b, sortKey, sortDirection));
  }, [languageFilter, projects, query, repoTypeFilter, sortDirection, sortKey, visibilityFilter]);

  const stats = useMemo(() => {
    const visible = projects.filter((project) => project.showOnHome === true).length;
    const privateCount = projects.filter((project) => project.private === true).length;
    const forkCount = projects.filter((project) => project.isFork === true).length;
    const archived = projects.filter((project) => project.status === "archived").length;
    return { total: projects.length, visible, privateCount, forkCount, archived };
  }, [projects]);

  const filteredIds = useMemo(() => filteredProjects.map((project) => project.id), [filteredProjects]);
  const selectedInFiltered = filteredIds.filter((id) => selectedIds.includes(id));
  const allFilteredSelected = filteredIds.length > 0 && selectedInFiltered.length === filteredIds.length;
  const partialFilteredSelected = selectedInFiltered.length > 0 && selectedInFiltered.length < filteredIds.length;

  const updateProject = (projectId: string, patch: Partial<Project>) => {
    setProjects((items) =>
      items.map((project) => (project.id === projectId ? { ...project, ...patch } : project)),
    );
  };

  const setSelectedVisibility = (visible: boolean) => {
    const idSet = new Set(selectedIds);
    setProjects((items) =>
      items.map((project) => {
        if (!idSet.has(project.id)) return project;
        if (project.status === "archived") return { ...project, showOnHome: false };
        return { ...project, showOnHome: visible, status: visible ? "published" : "draft" };
      }),
    );
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "priority" || key === "name" || key === "language" ? "asc" : "desc");
  };

  const toggleSelectAllFiltered = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedIds(Array.from(new Set([...selectedIds, ...filteredIds])));
      return;
    }
    const filteredIdSet = new Set(filteredIds);
    setSelectedIds((ids) => ids.filter((id) => !filteredIdSet.has(id)));
  };

  const fetchReadmeImages = async (project: Project) => {
    setLoadingImagesByProjectId((items) => ({ ...items, [project.id]: true }));
    try {
      const response = await fetch("/api/admin/projects/readme-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName: project.repoFullName,
          githubUrl: project.githubUrl,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("adminProjects.readmeImagesFetchError", "README 图片获取失败"));

      const images = Array.isArray(data.images) ? data.images : [];
      setReadmeImagesByProjectId((items) => ({ ...items, [project.id]: images }));
      if (!project.imageUrl && images[0]?.url) {
        updateProject(project.id, { imageUrl: images[0].url });
        setManualCoverUrl(images[0].url);
      }
      if (images.length === 0) toast.info(t("adminProjects.readmeImagesEmpty", "这个 README 里没有可用图片"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("adminProjects.readmeImagesFetchError", "README 图片获取失败"));
    } finally {
      setLoadingImagesByProjectId((items) => ({ ...items, [project.id]: false }));
    }
  };

  const openCoverPicker = (project: Project) => {
    setCoverProjectId(project.id);
    setManualCoverUrl(project.imageUrl || "");
    if (!readmeImagesByProjectId[project.id]?.length) {
      fetchReadmeImages(project);
    }
  };

  const syncGithubRepos = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/admin/github-repos", {
        method: "POST",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("adminProjects.toastSyncError", "GitHub 仓库同步失败"));
      const syncedProjects = Array.isArray(data.data) ? data.data.map(normalizeProject) : [];
      setProjects(syncedProjects);
      setSelectedIds([]);
      toast.success(t("adminProjects.toastSyncSuccess", "已同步 {{count}} 个 GitHub 仓库", { count: data.count || 0 }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("adminProjects.toastSyncError", "GitHub 仓库同步失败"));
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
        status: project.status === "archived" ? "archived" : project.showOnHome === true ? "published" : "draft",
      }));
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || t("adminProjects.toastSaveError", "保存失败"));
      toast.success(t("adminProjects.toastSaveSuccess", "项目展示设置已保存"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("adminProjects.toastSaveError", "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const header = ["repo", "title", "visible", "language", "private", "fork", "archived", "stars", "forks", "updated"];
    const rows = filteredProjects.map((project) => [
      project.repoFullName || project.githubUrl || project.title,
      project.title,
      project.showOnHome ? "yes" : "no",
      project.language || "",
      project.private ? "yes" : "no",
      project.isFork ? "yes" : "no",
      project.status === "archived" ? "yes" : "no",
      String(project.stars || 0),
      String(project.forks || 0),
      project.updatedAt || "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "projects.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-slate-300">
        <AiOutlineLoading3Quarters className="mr-3 h-8 w-8 animate-spin text-cyan-300" />
        {t("adminProjects.loadingProjectsInitial", "正在加载项目控制台...")}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-5 py-4">
      <section className="zero-admin-surface overflow-hidden rounded-2xl">
        <div className="border-b border-slate-300/10 px-5 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="admin-kicker">
                <FiGithub className="h-4 w-4" />
                GitHub Repositories
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight">{t("adminProjects.titleMain", "项目管理")}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                表格化管理所有 GitHub 仓库，使用筛选、排序、批量操作和封面弹窗来决定哪些项目展示到前台。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={syncGithubRepos} disabled={syncing} size="sm" className="bg-cyan-500 text-white hover:bg-cyan-400">
                {syncing ? <AiOutlineLoading3Quarters className="mr-2 h-4 w-4 animate-spin" /> : <FiRefreshCw className="mr-2 h-4 w-4" />}
                同步全部仓库
              </Button>
              <Button onClick={saveProjects} disabled={saving} size="sm" variant="outline" className="admin-secondary-button">
                {saving ? <AiOutlineLoading3Quarters className="mr-2 h-4 w-4 animate-spin" /> : <FiSave className="mr-2 h-4 w-4" />}
                {saving ? "保存中..." : "保存设置"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-300/10 p-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["仓库总数", stats.total],
            ["前台展示", stats.visible],
            ["私有仓库", stats.privateCount],
            ["Fork", stats.forkCount],
            ["归档", stats.archived],
          ].map(([label, value]) => (
            <div key={label} className="admin-metric">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-b border-slate-300/10 p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_170px_170px_170px_160px_160px]">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索仓库、描述、语言、标签..."
                className="pl-9"
              />
            </div>
            <Select value={visibilityFilter} onValueChange={(value) => setVisibilityFilter(value as VisibilityFilter)}>
              <SelectTrigger><SelectValue placeholder="展示状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部展示状态</SelectItem>
                <SelectItem value="visible">仅前台展示</SelectItem>
                <SelectItem value="hidden">仅隐藏</SelectItem>
              </SelectContent>
            </Select>
            <Select value={repoTypeFilter} onValueChange={(value) => setRepoTypeFilter(value as RepoTypeFilter)}>
              <SelectTrigger><SelectValue placeholder="仓库类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="fork">Fork</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger><SelectValue placeholder="语言" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部语言</SelectItem>
                {languages.map((language) => (
                  <SelectItem key={language} value={language}>{language}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
              <SelectTrigger><SelectValue placeholder="排序字段" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">按优先级</SelectItem>
                <SelectItem value="updated">按更新时间</SelectItem>
                <SelectItem value="stars">按 Star</SelectItem>
                <SelectItem value="forks">按 Fork</SelectItem>
                <SelectItem value="name">按名称</SelectItem>
                <SelectItem value="language">按语言</SelectItem>
                <SelectItem value="visible">按展示</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
              <SelectTrigger><SelectValue placeholder="方向" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">升序</SelectItem>
                <SelectItem value="desc">降序</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="admin-secondary-button" disabled={selectedIds.length === 0} onClick={() => setSelectedVisibility(true)}>
              批量展示
            </Button>
            <Button size="sm" variant="outline" className="admin-secondary-button" disabled={selectedIds.length === 0} onClick={() => setSelectedVisibility(false)}>
              批量隐藏
            </Button>
            <Button size="sm" variant="outline" className="admin-secondary-button" onClick={exportCsv}>
              <FiDownload className="mr-2 h-4 w-4" />
              导出当前 CSV
            </Button>
            <span className="ml-auto text-xs text-slate-400">
              当前 {filteredProjects.length} 项，已选 {selectedIds.length} 项
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="overflow-hidden rounded-2xl border border-slate-300/15 bg-white/35 dark:bg-slate-950/20">
            <Table>
              <TableHeader className="bg-white/55 dark:bg-slate-950/45">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allFilteredSelected ? true : partialFilteredSelected ? "indeterminate" : false}
                      onCheckedChange={toggleSelectAllFiltered}
                    />
                  </TableHead>
                  <TableHead className="min-w-[310px]">
                    <SortButton active={sortKey === "name"} direction={sortDirection} onClick={() => toggleSort("name")}>仓库</SortButton>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <SortButton active={sortKey === "visible"} direction={sortDirection} onClick={() => toggleSort("visible")}>展示</SortButton>
                  </TableHead>
                  <TableHead className="min-w-[150px]">
                    <SortButton active={sortKey === "language"} direction={sortDirection} onClick={() => toggleSort("language")}>语言</SortButton>
                  </TableHead>
                  <TableHead className="w-[100px] text-right">
                    <SortButton active={sortKey === "stars"} direction={sortDirection} onClick={() => toggleSort("stars")}>Star</SortButton>
                  </TableHead>
                  <TableHead className="w-[100px] text-right">
                    <SortButton active={sortKey === "forks"} direction={sortDirection} onClick={() => toggleSort("forks")}>Fork</SortButton>
                  </TableHead>
                  <TableHead className="w-[130px]">
                    <SortButton active={sortKey === "updated"} direction={sortDirection} onClick={() => toggleSort("updated")}>更新</SortButton>
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <SortButton active={sortKey === "priority"} direction={sortDirection} onClick={() => toggleSort("priority")}>排序</SortButton>
                  </TableHead>
                  <TableHead className="w-[180px]">封面</TableHead>
                  <TableHead className="w-[160px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => {
                  const selected = selectedIds.includes(project.id);
                  return (
                    <TableRow key={project.id} className="border-slate-300/10">
                      <TableCell>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) =>
                            setSelectedIds((ids) =>
                              checked === true ? Array.from(new Set([...ids, project.id])) : ids.filter((id) => id !== project.id),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0 space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={project.title}
                              onChange={(event) => updateProject(project.id, { title: event.target.value })}
                              className="h-9 font-bold"
                            />
                            {project.githubUrl && (
                              <a href={project.githubUrl} target="_blank" rel="noreferrer" className="shrink-0 text-cyan-600 hover:text-cyan-400">
                                <FiExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          <p className="truncate font-mono text-xs text-slate-500" title={project.repoFullName || project.githubUrl}>
                            {project.repoFullName || project.githubUrl || project.id}
                          </p>
                          <Textarea
                            value={project.description}
                            onChange={(event) => updateProject(project.id, { description: event.target.value })}
                            placeholder="仓库简介"
                            rows={2}
                            className="resize-y text-xs leading-5"
                          />
                          <Input
                            value={(project.tags || []).join(", ")}
                            onChange={(event) =>
                              updateProject(project.id, {
                                tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean),
                              })
                            }
                            placeholder="标签，用英文逗号分隔"
                            className="h-8 text-xs"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <Switch
                            checked={project.showOnHome === true}
                            disabled={project.status === "archived"}
                            onCheckedChange={(checked) =>
                              updateProject(project.id, {
                                showOnHome: checked,
                                status: project.status === "archived" ? "archived" : checked ? "published" : "draft",
                              })
                            }
                          />
                          <span className={`text-xs font-bold ${project.showOnHome ? "text-emerald-500" : "text-slate-400"}`}>
                            {project.showOnHome ? "前台展示" : "隐藏"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <LanguagePill language={project.language} />
                          <div className="flex flex-wrap gap-1">
                            {repoBadges(project).map((badge) => (
                              <span key={badge} className="rounded-md border border-slate-500/20 px-1.5 py-0.5 text-[11px] text-slate-500">
                                {badge}
                              </span>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span className="inline-flex items-center justify-end gap-1">
                          <GoStar className="h-4 w-4 text-amber-500" />
                          {project.stars || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span className="inline-flex items-center justify-end gap-1">
                          <GoRepoForked className="h-4 w-4 text-cyan-500" />
                          {project.forks || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <FiClock className="h-3.5 w-3.5" />
                          {formatDate(project.pushedAt || project.updatedAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={project.priority ?? 0}
                          onChange={(event) => updateProject(project.id, { priority: Number(event.target.value) })}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openCoverPicker(project)}
                          className="group block w-[150px] overflow-hidden rounded-xl border border-slate-300/20 bg-white/45 text-left transition hover:border-cyan-300/70 dark:bg-slate-950/35"
                        >
                          {project.imageUrl ? (
                            <img src={project.imageUrl} alt={`${project.title} cover`} className="aspect-video w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex aspect-video w-full items-center justify-center text-xs text-slate-400">
                              <FiImage className="mr-1 h-4 w-4" />
                              选择封面
                            </div>
                          )}
                          <div className="truncate px-2 py-1 text-xs text-slate-500 group-hover:text-cyan-600">
                            {project.imageUrl ? "更换封面" : "未设置"}
                          </div>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <Input
                            value={project.demoUrl || ""}
                            onChange={(event) => updateProject(project.id, { demoUrl: event.target.value })}
                            placeholder="预览链接"
                            className="h-8 text-xs"
                          />
                          <Button type="button" size="sm" variant="outline" className="admin-secondary-button h-8" onClick={() => openCoverPicker(project)}>
                            <FiEdit3 className="mr-2 h-3.5 w-3.5" />
                            编辑封面
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredProjects.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-400/30 p-10 text-center text-sm text-slate-500">
              没有符合当前筛选条件的仓库。
            </div>
          )}
        </div>
      </section>

      <Dialog open={Boolean(coverProject)} onOpenChange={(open) => !open && setCoverProjectId(null)}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto border-cyan-300/25 bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          {coverProject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FiImage className="h-5 w-5 text-cyan-500" />
                  选择仓库封面
                </DialogTitle>
                <DialogDescription>
                  {coverProject.repoFullName || coverProject.title} 的封面会保存到项目配置里，前台优先使用这里选中的图片。
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-2xl border border-slate-300/20 bg-slate-100 dark:bg-slate-900">
                    {coverProject.imageUrl ? (
                      <img src={coverProject.imageUrl} alt={`${coverProject.title} cover`} className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="flex aspect-video items-center justify-center text-sm text-slate-500">当前没有封面</div>
                    )}
                  </div>
                  <Input
                    value={manualCoverUrl}
                    onChange={(event) => setManualCoverUrl(event.target.value)}
                    placeholder="手动输入图片 URL"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="flex-1 bg-cyan-500 text-white hover:bg-cyan-400"
                      onClick={() => updateProject(coverProject.id, { imageUrl: manualCoverUrl.trim() })}
                    >
                      应用 URL
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="admin-secondary-button"
                      onClick={() => {
                        setManualCoverUrl("");
                        updateProject(coverProject.id, { imageUrl: "" });
                      }}
                    >
                      <FiX className="mr-2 h-4 w-4" />
                      清空
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loadingImagesByProjectId[coverProject.id]}
                    onClick={() => fetchReadmeImages(coverProject)}
                    className="admin-secondary-button w-full"
                  >
                    {loadingImagesByProjectId[coverProject.id] ? <AiOutlineLoading3Quarters className="mr-2 h-4 w-4 animate-spin" /> : <FiRefreshCw className="mr-2 h-4 w-4" />}
                    刷新 README 图片
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black">README 图片候选</h3>
                    <span className="text-xs text-slate-500">
                      {(readmeImagesByProjectId[coverProject.id] || []).length} 张
                    </span>
                  </div>
                  {(readmeImagesByProjectId[coverProject.id] || []).length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {(readmeImagesByProjectId[coverProject.id] || []).map((image) => {
                        const selected = image.url === coverProject.imageUrl;
                        return (
                          <button
                            type="button"
                            key={image.url}
                            onClick={() => {
                              updateProject(coverProject.id, { imageUrl: image.url });
                              setManualCoverUrl(image.url);
                            }}
                            className={`overflow-hidden rounded-2xl border bg-slate-100 text-left transition dark:bg-slate-900 ${
                              selected ? "border-cyan-400 ring-2 ring-cyan-300/35" : "border-slate-300/20 hover:border-cyan-300"
                            }`}
                          >
                            <img src={image.url} alt={image.alt || "README image"} className="aspect-video w-full object-cover" loading="lazy" />
                            <div className="truncate px-3 py-2 text-xs text-slate-500">{image.alt || image.url}</div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-400/30 p-10 text-center text-sm text-slate-500">
                      README 中暂时没有可选图片，可以刷新一次，或者左侧手动填写图片 URL。
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" className="bg-cyan-500 text-white hover:bg-cyan-400" onClick={() => setCoverProjectId(null)}>
                  完成
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
