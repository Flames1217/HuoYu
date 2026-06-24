import { NextResponse } from "next/server"
import { getSettings } from "@/lib/settings-store";
import { extractFirstReadmeImage, githubFullNameFromProject } from "@/lib/github-readme-images";

export const dynamic = "force-dynamic";

const CACHE_DURATION = 4 * 60 * 60 * 1000;
const GITHUB_FETCH_TIMEOUT = 4000;
const readmeCoverCache: Record<string, { imageUrl: string; timestamp: number }> = {};
const repoMetaCache: Record<string, { repo: any; timestamp: number }> = {};

function localeFromRequest(request: Request) {
  return new URL(request.url).searchParams.get("lang") === "en" ? "en" : "cn";
}

function msg(locale: string, cn: string, en: string) {
  return locale === "en" ? en : cn;
}

function normalizeGithubUrl(url?: string) {
  return (url || "")
    .trim()
    .replace(/\/$/, "")
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "")
    .toLowerCase();
}

function projectIdentityKey(project: any) {
  if (project.githubRepoId) return `id:${String(project.githubRepoId)}`;
  if (project.githubNodeId) return `node:${String(project.githubNodeId)}`;
  if (project.repoFullName) return `repo:${String(project.repoFullName).toLowerCase()}`;
  if (project.githubUrl) return `url:${normalizeGithubUrl(project.githubUrl)}`;
  return `title:${String(project.title || project.id || "").toLowerCase()}`;
}

function githubHeaders(token?: string, accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function decodeBase64Content(content?: string) {
  if (!content) return "";
  try {
    return Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf-8");
  } catch {
    return "";
  }
}

async function fetchWithTimeout(input: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GITHUB_FETCH_TIMEOUT);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      next: { revalidate: Math.floor(CACHE_DURATION / 1000) },
      cache: "force-cache",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchReadmeCoverImage(project: any, token?: string) {
  const repoFullName = githubFullNameFromProject(project);
  if (!repoFullName) return "";

  const cacheKey = `project-readme-cover-${repoFullName.toLowerCase()}`;
  const now = Date.now();
  const cached = readmeCoverCache[cacheKey];
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.imageUrl;
  }

  try {
    const response = await fetchWithTimeout(`https://api.github.com/repos/${repoFullName}/readme`, {
      headers: githubHeaders(token),
    });

    if (!response.ok) return "";
    const readme = await response.json();
    const markdown = decodeBase64Content(readme.content);
    const imageUrl = extractFirstReadmeImage(markdown, repoFullName, readme.download_url);
    if (imageUrl) {
      readmeCoverCache[cacheKey] = { imageUrl, timestamp: now };
    } else {
      delete readmeCoverCache[cacheKey];
    }
    return imageUrl;
  } catch {
    return "";
  }
}

async function fetchGithubRepoMeta(project: any, token?: string) {
  const repoFullName = githubFullNameFromProject(project);
  if (!repoFullName) return null;

  const cacheKey = `project-repo-meta-${repoFullName.toLowerCase()}`;
  const now = Date.now();
  const cached = repoMetaCache[cacheKey];
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.repo;
  }

  try {
    const response = await fetchWithTimeout(`https://api.github.com/repos/${repoFullName}`, {
      headers: githubHeaders(token),
    });

    if (!response.ok) return null;
    const repo = await response.json();
    repoMetaCache[cacheKey] = { repo, timestamp: now };
    return repo;
  } catch {
    return null;
  }
}

function githubTopicsFromRepo(repo: any) {
  return Array.isArray(repo?.topics)
    ? repo.topics.map((topic: any) => String(topic).trim()).filter(Boolean)
    : [];
}

function dedupeProjects(projects: any[]) {
  const seen = new Set<string>();
  return projects.filter((project) => {
    const key = projectIdentityKey(project);

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 处理获取所有已发布的项目的请求 (供前台使用)
 * @param request Request
 * @returns NextResponse
 */
export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  try {

    const settings = await getSettings({});
    const token = process.env.GITHUB_TOKEN || settings.profile?.github_token || "";
    const projects = dedupeProjects(settings.projects || [])
      .filter((project: any) => project.showOnHome === true && project.status !== 'archived')
      .sort((a: any, b: any) => {
        const aPriority = typeof a.priority === "number" ? a.priority : 999;
        const bPriority = typeof b.priority === "number" ? b.priority : 999;
        if (aPriority !== bPriority) return aPriority - bPriority;
        const aTime = new Date(a.pushedAt || a.updatedAt || 0).getTime();
        const bTime = new Date(b.pushedAt || b.updatedAt || 0).getTime();
        return bTime - aTime;
      });
    const projectsWithGithubData = await Promise.all(
      projects.map(async (project: any) => {
        const repo = await fetchGithubRepoMeta(project, token);
        const readmeImageUrl = project.imageUrl
          ? ""
          : await fetchReadmeCoverImage(
              {
                ...project,
                repoFullName: repo?.full_name || project.repoFullName,
                githubUrl: repo?.html_url || project.githubUrl,
              },
              token
            );
        const repoTopics = githubTopicsFromRepo(repo);

        return {
          ...project,
          title: repo?.name || project.title,
          description: repo?.description || project.description,
          imageUrl: project.imageUrl || readmeImageUrl,
          githubUrl: repo?.html_url || project.githubUrl,
          repoName: repo?.name || project.repoName,
          repoFullName: repo?.full_name || project.repoFullName,
          githubRepoId: repo?.id ? String(repo.id) : project.githubRepoId,
          githubNodeId: repo?.node_id || project.githubNodeId,
          tags: repo ? repoTopics : Array.isArray(project.tags) ? project.tags : [],
          language: repo?.language ?? project.language ?? null,
          stars: typeof repo?.stargazers_count === "number" ? repo.stargazers_count : project.stars,
          forks: typeof repo?.forks_count === "number" ? repo.forks_count : project.forks,
          openIssues: typeof repo?.open_issues_count === "number" ? repo.open_issues_count : project.openIssues,
          updatedAt: repo?.updated_at || project.updatedAt,
          pushedAt: repo?.pushed_at || project.pushedAt,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        message: msg(locale, '项目获取成功。', 'Published projects fetched successfully.'),
        data: projectsWithGithubData,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API /api/projects GET] Error fetching published projects:', error);
    return NextResponse.json(
      { success: false, message: msg(locale, '获取项目时服务器内部错误。', 'Internal Server Error while fetching published projects.'), errorDetails: (error as Error).message },
      { status: 500 }
    );
  }
}
