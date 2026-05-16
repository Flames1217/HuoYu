"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FiExternalLink, FiGithub, FiSearch } from "react-icons/fi";
import { GoRepoForked, GoStar } from "react-icons/go";
import { useLocaleText } from "@/lib/use-locale-text";

interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  tags: string[];
  githubUrl?: string;
  demoUrl?: string;
  repoFullName?: string;
  language?: string | null;
  stars?: number;
  forks?: number;
  updatedAt?: string;
}

function GitHubActionStat({
  type,
  count,
}: {
  type: "star" | "fork";
  count: number;
}) {
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
  "Jupyter Notebook": "#DA5B0B",
};

function languageColor(language?: string | null) {
  return language ? languageColors[language] || "#8b949e" : "#8b949e";
}

function ProjectLanguage({ language }: { language?: string | null }) {
  const label = language || "Unknown";
  const color = languageColor(language);
  const style = { "--project-language-color": color } as CSSProperties;

  return (
    <div className="project-language-pill" style={style}>
      <span className="project-language-dot" />
      <span className="project-language-name">{label}</span>
    </div>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const { t } = useLocaleText();
  const hasGithubStats = Boolean(project.repoFullName);

  return (
    <article className="group relative flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-slate-400/18 bg-slate-950/60 shadow-xl shadow-black/24 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/45 hover:bg-slate-900/75 hover:shadow-cyan-950/25">
      {project.imageUrl ? (
        <a href={project.demoUrl || project.githubUrl || "#"} target="_blank" rel="noreferrer" className="block aspect-[16/9] overflow-hidden bg-slate-900">
          <img
            src={project.imageUrl}
            alt={`${project.title} cover`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </a>
      ) : null}

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-md border border-cyan-300/20 bg-cyan-400/10 px-2 py-0.5 font-mono text-xs text-cyan-100">
            #{String(index + 1).padStart(2, "0")}
          </span>
          {project.repoFullName && <span className="min-w-0 truncate font-mono text-xs text-zinc-500">{project.repoFullName}</span>}
        </div>

        <h3 className="text-lg font-bold tracking-tight text-white">{project.title}</h3>
        <ProjectLanguage language={project.language} />
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">{project.description || t("projectsSection.noDescription", "This repository has no description yet.")}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(project.tags || []).map((tag) => (
            <Badge key={tag} className="project-tag-badge max-w-full truncate rounded-md border">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="mt-auto pt-5">
          <div className="mb-4 flex min-h-5 flex-wrap items-center gap-2">
            {hasGithubStats ? (
              <>
                <GitHubActionStat type="star" count={project.stars || 0} />
                <GitHubActionStat type="fork" count={project.forks || 0} />
              </>
            ) : (
              <span className="text-xs text-zinc-500">{project.language || t("projectsSection.projectFallback", "Project")}</span>
            )}
          </div>

          <div className="flex gap-2">
            {project.githubUrl && (
              <Button asChild size="sm" variant="outline" className="flex-1 border-white/10 bg-white/5 text-zinc-100 hover:border-cyan-300/35 hover:bg-white/10">
                <a href={project.githubUrl} target="_blank" rel="noreferrer">
                  <FiGithub className="mr-1.5 h-4 w-4" />
                  {t("projectsSection.source", "Source")}
                </a>
              </Button>
            )}
            {project.demoUrl && (
              <Button asChild size="sm" className="flex-1 bg-cyan-500 text-white hover:bg-cyan-400">
                <a href={project.demoUrl} target="_blank" rel="noreferrer">
                  <FiExternalLink className="mr-1.5 h-4 w-4" />
                  {t("projectsSection.preview", "Preview")}
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProjectsSection() {
  const { t, locale } = useLocaleText();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects?lang=${locale}`);
        if (!response.ok) throw new Error(t("projectsSection.loadError", "Failed to load projects"));
        const rawData = await response.json();
        const list = Array.isArray(rawData) ? rawData : Array.isArray(rawData?.data) ? rawData.data : [];
        setProjects(
          list.map((project: any) => ({
            id: String(project.id || project.repoFullName || crypto.randomUUID()),
            title: String(project.title || project.repoName || t("projectsSection.untitled", "Untitled project")),
            description: String(project.description || ""),
            imageUrl: project.imageUrl || "",
            tags: Array.isArray(project.tags) ? project.tags.map(String) : [],
            githubUrl: project.githubUrl || "",
            demoUrl: project.demoUrl || "",
            repoFullName: project.repoFullName || "",
            language: project.language || null,
            stars: project.stars || 0,
            forks: project.forks || 0,
            updatedAt: project.updatedAt || project.pushedAt || "",
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : t("projectsSection.loadError", "Failed to load projects"));
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [locale, t]);

  const filteredProjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((project) =>
      [project.title, project.description, project.repoFullName, project.language, ...(project.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [projects, query]);

  if (loading) {
    return <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center text-zinc-400">{t("projectsSection.loading", "Loading projects...")}</div>;
  }

  if (error) {
    return <div className="rounded-lg border border-red-400/20 bg-red-500/10 p-8 text-center text-red-200">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-400/16 bg-slate-950/58 p-5 shadow-xl shadow-black/24 md:flex-row md:items-center md:justify-between">
        <h3 className="text-2xl font-bold text-white">{t("projectsSection.title", "Selected projects")}</h3>
        <div className="relative w-full md:w-80">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("projectsSection.searchPlaceholder", "Search projects, languages or tags")}
            className="h-10 w-full rounded-md border border-white/10 bg-black/34 pl-9 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/60"
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center text-zinc-500">{t("projectsSection.empty", "No projects to show.")}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
