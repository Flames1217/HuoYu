import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getSettings, saveSettings } from "@/lib/settings-store";

export const dynamic = "force-dynamic";

const CACHE_DURATION = 4 * 60 * 60 * 1000;
const githubReposCache: Record<string, { viewer: any; repos: any[]; timestamp: number }> = {};
const readmeCoverCache: Record<string, { imageUrl: string; timestamp: number }> = {};

type Project = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  tags: string[];
  githubUrl: string;
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
  ownerOrigin?: boolean;
  stars?: number;
  forks?: number;
  openIssues?: number;
  updatedAt?: string;
  pushedAt?: string;
};

function repoId(fullName: string) {
  return `github:${fullName}`;
}

function normalizeGithubUrl(url?: string) {
  return (url || "")
    .trim()
    .replace(/\/$/, "")
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "")
    .toLowerCase();
}

function normalizedExcludedRepos(settings: any) {
  return new Set(
    [
      ...(Array.isArray(settings.githubExcludedRepos) ? settings.githubExcludedRepos : []),
      ...(Array.isArray(settings.profile?.github_excluded_repos) ? settings.profile.github_excluded_repos : []),
    ]
      .map((repo) => String(repo).trim().toLowerCase())
      .filter(Boolean)
  );
}

function repoRank(repo: any) {
  const pushedAt = repo.pushed_at ? new Date(repo.pushed_at).getTime() : 0;
  const daysSincePush = pushedAt ? Math.max(0, (Date.now() - pushedAt) / 86400000) : 9999;
  const recentScore = Math.max(0, 180 - daysSincePush);
  return recentScore * 5 + (repo.stargazers_count || 0) * 8 + (repo.forks_count || 0) * 4;
}

function createGithubHeaders(token: string, accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function isHardReload(request: Request): boolean {
  const cacheControl = request.headers.get("Cache-Control");
  return Boolean(cacheControl?.includes("no-cache") || cacheControl?.includes("max-age=0"));
}

function resolveReadmeImageUrl(imageUrl: string, repo: any) {
  const cleaned = imageUrl.trim().replace(/^['"]|['"]$/g, "");
  if (!cleaned || cleaned.startsWith("#") || cleaned.startsWith("data:")) return "";
  if (/^https?:\/\//i.test(cleaned)) return cleaned;

  const defaultBranch = repo.default_branch || "main";
  const normalizedPath = cleaned.replace(/^\.\//, "").replace(/^\/+/, "");
  return `https://raw.githubusercontent.com/${repo.full_name}/${defaultBranch}/${normalizedPath}`;
}

function extractFirstReadmeImage(markdown: string, repo: any) {
  const candidates = [
    ...Array.from(markdown.matchAll(/!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g), (match) => match[1]),
    ...Array.from(markdown.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi), (match) => match[1]),
  ];

  for (const candidate of candidates) {
    const imageUrl = resolveReadmeImageUrl(candidate, repo);
    if (!imageUrl) continue;
    if (/img\.shields\.io|shields\.io|badgen\.net|github-readme-stats|komarev\.com/i.test(imageUrl)) continue;
    return imageUrl;
  }

  return "";
}

async function fetchReadmeCoverImage(token: string, repo: any, forceRefresh = false) {
  const cacheKey = `readme-cover-${repo.full_name}-${repo.default_branch || "main"}`;
  const now = Date.now();
  const cached = readmeCoverCache[cacheKey];
  if (!forceRefresh && cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.imageUrl;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo.full_name}/readme`, {
      headers: {
        ...createGithubHeaders(token, "application/vnd.github.raw"),
      },
    });

    if (!response.ok) return "";
    const markdown = await response.text();
    const imageUrl = extractFirstReadmeImage(markdown, repo);
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

async function mergeRepoProject(token: string, repo: any, existing?: Partial<Project>, index = 0, forceRefresh = false): Promise<Project> {
  const topics = Array.isArray(repo.topics) ? repo.topics : [];
  const isExisting = Boolean(existing);
  if (forceRefresh) await fetchReadmeCoverImage(token, repo, true);

  return {
    id: existing?.id || repoId(repo.full_name),
    title: existing?.title || repo.name,
    description: repo.description || existing?.description || "",
    imageUrl: "",
    tags: topics.slice(0, 6),
    githubUrl: repo.html_url,
    demoUrl: existing?.demoUrl || repo.homepage || "",
    status: existing?.status || "draft",
    showOnHome: isExisting ? existing?.showOnHome ?? false : false,
    priority: typeof existing?.priority === "number" ? existing.priority : index,
    repoName: repo.name,
    repoFullName: repo.full_name,
    language: repo.language,
    ownerLogin: repo.owner?.login || "",
    isFork: repo.fork === true,
    private: repo.private === true,
    ownerOrigin: true,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    openIssues: repo.open_issues_count || 0,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
  };
}

async function fetchAllOwnerRepos(token: string, ownerLogin: string, excludedRepos: Set<string>) {
  const repos: any[] = [];
  let page = 1;

  while (page <= 10) {
    const response = await fetch(
      `https://api.github.com/user/repos?affiliation=owner&visibility=all&sort=updated&per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`GitHub API ${response.status}: ${message.slice(0, 180)}`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  const normalizedOwner = ownerLogin.toLowerCase();
  const ownerPublicRepos = repos
    .filter((repo) => {
      if (!repo) return false;
      if (excludedRepos.has(String(repo.full_name || "").toLowerCase())) return false;
      if (repo.private === true || repo.fork === true || repo.parent || repo.source) return false;
      if (repo.owner?.login?.toLowerCase() !== normalizedOwner) return false;
      if (repo.archived === true || repo.disabled === true) return false;
      return true;
    })
    .sort((a, b) => repoRank(b) - repoRank(a));

  const detailedRepos = await Promise.all(
    ownerPublicRepos.map(async (repo) => {
      try {
        const response = await fetch(`https://api.github.com/repos/${repo.full_name}`, {
          headers: {
            ...createGithubHeaders(token),
          },
        });

        if (!response.ok) return repo;
        return { ...repo, ...(await response.json()) };
      } catch {
        return repo;
      }
    })
  );

  const structurallyOwnedRepos = detailedRepos
    .filter((repo) => {
      if (!repo) return false;
      if (excludedRepos.has(String(repo.full_name || "").toLowerCase())) return false;
      if (repo.private === true || repo.fork === true || repo.parent || repo.source) return false;
      if (repo.owner?.login?.toLowerCase() !== normalizedOwner) return false;
      if (repo.archived === true || repo.disabled === true) return false;
      return true;
    })
    .sort((a, b) => repoRank(b) - repoRank(a));

  const ownerOriginRepos = [];
  for (const repo of structurallyOwnedRepos) {
    if (
      (await repoAppearsOwnerOrigin(token, repo, normalizedOwner)) &&
      (await repoIsNotExternalGeneratedMirror(token, repo, normalizedOwner))
    ) {
      ownerOriginRepos.push(repo);
    }
  }

  return ownerOriginRepos.sort((a, b) => repoRank(b) - repoRank(a));
}

function isBotCommitAuthor(commit: any) {
  const login = String(commit.author?.login || "").toLowerCase();
  const type = String(commit.author?.type || "").toLowerCase();
  const name = String(commit.commit?.author?.name || "").toLowerCase();
  const email = String(commit.commit?.author?.email || "").toLowerCase();

  return (
    type === "bot" ||
    login.endsWith("[bot]") ||
    name.includes("[bot]") ||
    email.includes("[bot]") ||
    login === "dependabot" ||
    login === "renovate-bot" ||
    login === "github-actions"
  );
}

function commitBelongsToOwner(commit: any, normalizedOwner: string) {
  const login = String(commit.author?.login || "").toLowerCase();
  return login === normalizedOwner;
}

async function repoAppearsOwnerOrigin(token: string, repo: any, normalizedOwner: string) {
  const branch = repo.default_branch || "main";
  let page = 1;
  const commitsInNewestFirstOrder: any[] = [];

  while (page <= 20) {
    const response = await fetch(
      `https://api.github.com/repos/${repo.full_name}/commits?sha=${encodeURIComponent(branch)}&per_page=100&page=${page}`,
      { headers: createGithubHeaders(token) }
    );

    if (!response.ok) return false;

    const commits = await response.json();
    if (!Array.isArray(commits) || commits.length === 0) break;
    commitsInNewestFirstOrder.push(...commits);

    if (commits.length < 100) break;
    page += 1;
  }

  const chronologicalCommits = commitsInNewestFirstOrder.reverse();
  let hasOwnerCommit = false;

  for (const commit of chronologicalCommits) {
    if (commitBelongsToOwner(commit, normalizedOwner)) {
      hasOwnerCommit = true;
      continue;
    }

    if (!hasOwnerCommit && !isBotCommitAuthor(commit)) {
      return false;
    }
  }

  return hasOwnerCommit;
}

async function repoIsNotExternalGeneratedMirror(token: string, repo: any, normalizedOwner: string) {
  const branch = repo.default_branch || "main";
  let ownerCommits = 0;
  let externalGeneratedCommits = 0;
  let totalCommits = 0;

  for (let page = 1; page <= 5; page++) {
    const response = await fetch(
      `https://api.github.com/repos/${repo.full_name}/commits?sha=${encodeURIComponent(branch)}&per_page=100&page=${page}`,
      { headers: createGithubHeaders(token) }
    );

    if (!response.ok) return true;

    const commits = await response.json();
    if (!Array.isArray(commits) || commits.length === 0) break;

    for (const commit of commits) {
      totalCommits += 1;
      if (commitBelongsToOwner(commit, normalizedOwner)) {
        ownerCommits += 1;
        continue;
      }

      const authorName = String(commit.commit?.author?.name || "").toLowerCase();
      const authorEmail = String(commit.commit?.author?.email || "").toLowerCase();
      const looksLikeExternalProjectBot =
        authorName.includes("/") &&
        !authorName.startsWith(`${normalizedOwner}/`) &&
        (authorEmail.includes("[bot]") || authorEmail.includes("bot@"));

      if (looksLikeExternalProjectBot) {
        externalGeneratedCommits += 1;
      }
    }

    if (commits.length < 100) break;
  }

  if (totalCommits < 20) return true;
  return !(ownerCommits <= 2 && externalGeneratedCommits / totalCommits >= 0.8);
}

async function fetchGithubUser(token: string) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      ...createGithubHeaders(token),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub user API ${response.status}: ${message.slice(0, 180)}`);
  }

  return response.json();
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getSettings({ profile: {}, projects: [] });
    const token = process.env.GITHUB_TOKEN || settings.profile?.github_token || "";
    if (!token) {
      return NextResponse.json({ message: "GitHub token is not configured." }, { status: 400 });
    }

    const excludedRepos = normalizedExcludedRepos(settings);
    const cacheKey = `github-repos-${token.slice(0, 8)}-${[...excludedRepos].sort().join("|")}`;
    const now = Date.now();
    const cached = githubReposCache[cacheKey];
    const { viewer, repos } =
      cached && now - cached.timestamp < CACHE_DURATION && !isHardReload(request)
        ? cached
        : await (async () => {
            const freshViewer = await fetchGithubUser(token);
            const freshRepos = await fetchAllOwnerRepos(token, freshViewer.login, excludedRepos);
            githubReposCache[cacheKey] = { viewer: freshViewer, repos: freshRepos, timestamp: now };
            return { viewer: freshViewer, repos: freshRepos };
          })();

    settings.profile = {
      ...(settings.profile || {}),
      githubUsername: viewer.login || settings.profile?.githubUsername || "",
    };

    const currentProjects: Project[] = Array.isArray(settings.projects) ? settings.projects : [];
    const currentByRepo = new Map<string, Project>();
    currentProjects.forEach((project) => {
      if (project.repoFullName) currentByRepo.set(project.repoFullName.toLowerCase(), project);
      if (project.githubUrl) currentByRepo.set(normalizeGithubUrl(project.githubUrl), project);
    });

    const syncedProjects = await Promise.all(
      repos.map((repo, index) =>
        mergeRepoProject(
          token,
          repo,
          currentByRepo.get(repo.full_name.toLowerCase()) || currentByRepo.get(normalizeGithubUrl(repo.html_url)),
          index,
          isHardReload(request)
        )
      )
    );

    const syncedKeys = new Set<string>();
    syncedProjects.forEach((project) => {
      if (project.repoFullName) syncedKeys.add(project.repoFullName.toLowerCase());
      syncedKeys.add(normalizeGithubUrl(project.githubUrl));
    });

    const manualProjects = currentProjects.filter((project) => {
      if (project.id?.startsWith("github:")) return false;
      if (project.repoFullName && syncedKeys.has(project.repoFullName.toLowerCase())) return false;
      if (project.githubUrl && syncedKeys.has(normalizeGithubUrl(project.githubUrl))) return false;
      return true;
    });

    settings.projects = [...syncedProjects, ...manualProjects];
    await saveSettings(settings);

    return NextResponse.json({
      message: "Repositories synced.",
      count: syncedProjects.length,
      data: settings.projects,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to sync GitHub repositories." },
      { status: 500 }
    );
  }
}
