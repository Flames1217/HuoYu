import { getSettings, saveSettings } from "@/lib/settings-store";

const CACHE_DURATION = 4 * 60 * 60 * 1000;

const githubReposCache: Record<string, { viewer: any; repos: any[]; timestamp: number }> = {};

export type Project = {
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
};

type SyncOptions = {
  forceRefresh?: boolean;
};

function repoProjectId(repo: any) {
  return repo.id ? `github:${repo.id}` : `github:${repo.full_name}`;
}

function normalizeGithubUrl(url?: string) {
  return (url || "")
    .trim()
    .replace(/\/$/, "")
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "")
    .toLowerCase();
}

function githubFullNameFromProject(project: Partial<Project>) {
  if (project.repoFullName) return String(project.repoFullName).trim();

  const githubUrl = String(project.githubUrl || "").trim();
  const match = githubUrl.match(/github\.com[:/]+([^/\s]+)\/([^/\s?#.]+)(?:\.git)?/i);
  return match ? `${match[1]}/${match[2]}` : "";
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

async function fetchGithubRepo(token: string, fullName: string) {
  const response = await fetch(`https://api.github.com/repos/${fullName}`, {
    headers: createGithubHeaders(token),
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) return null;
  return response.json();
}

function repoIdentityKeys(repo: any) {
  return [
    repo?.id ? `id:${repo.id}` : "",
    repo?.node_id ? `node:${repo.node_id}` : "",
    repo?.full_name ? `repo:${String(repo.full_name).toLowerCase()}` : "",
    repo?.html_url ? `url:${normalizeGithubUrl(repo.html_url)}` : "",
  ].filter(Boolean);
}

function projectIdentityKeys(project: Partial<Project>) {
  return [
    project.githubRepoId ? `id:${project.githubRepoId}` : "",
    project.githubNodeId ? `node:${project.githubNodeId}` : "",
    project.repoFullName ? `repo:${String(project.repoFullName).toLowerCase()}` : "",
    project.githubUrl ? `url:${normalizeGithubUrl(project.githubUrl)}` : "",
  ].filter(Boolean);
}

async function indexExistingProjects(token: string, projects: Project[]) {
  const index = new Map<string, Project>();

  for (const project of projects) {
    for (const key of projectIdentityKeys(project)) {
      index.set(key, project);
    }
  }

  await Promise.all(
    projects.map(async (project) => {
      if (!project.id?.startsWith("github:")) return;
      const fullName = githubFullNameFromProject(project);
      if (!fullName) return;

      const repo = await fetchGithubRepo(token, fullName);
      if (!repo) return;

      project.githubRepoId = String(repo.id || project.githubRepoId || "");
      project.githubNodeId = repo.node_id || project.githubNodeId || "";

      for (const key of repoIdentityKeys(repo)) {
        index.set(key, project);
      }
    })
  );

  return index;
}

async function fetchAllOwnerRepos(token: string, excludedRepos: Set<string>) {
  const repos: any[] = [];
  let page = 1;

  while (page <= 10) {
    const response = await fetch(
      `https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&visibility=all&sort=updated&per_page=100&page=${page}`,
      {
        headers: createGithubHeaders(token),
        cache: "no-store",
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

  const availableRepos = repos
    .filter((repo) => {
      if (!repo) return false;
      if (excludedRepos.has(String(repo.full_name || "").toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => repoRank(b) - repoRank(a));

  const detailedRepos = await Promise.all(
    availableRepos.map(async (repo) => {
      const detailedRepo = await fetchGithubRepo(token, repo.full_name);
      return detailedRepo ? { ...repo, ...detailedRepo } : repo;
    })
  );

  return detailedRepos
    .filter((repo) => {
      if (!repo) return false;
      if (excludedRepos.has(String(repo.full_name || "").toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => repoRank(b) - repoRank(a));
}

async function fetchGithubUser(token: string) {
  const response = await fetch("https://api.github.com/user", {
    headers: createGithubHeaders(token),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub user API ${response.status}: ${message.slice(0, 180)}`);
  }

  return response.json();
}

function mergeRepoProject(repo: any, existing: Partial<Project> | undefined, index: number, syncedAt: string): Project {
  const topics = Array.isArray(repo.topics) ? repo.topics : [];
  const isExisting = Boolean(existing);
  const nextStatus = existing?.status || (repo.archived === true || repo.disabled === true ? "archived" : "draft");

  return {
    id: existing?.id || repoProjectId(repo),
    title: repo.name,
    description: repo.description || "",
    imageUrl: existing?.imageUrl || "",
    tags: topics.slice(0, 6),
    githubUrl: repo.html_url,
    demoUrl: existing?.demoUrl || repo.homepage || "",
    status: nextStatus,
    showOnHome: nextStatus === "archived" ? false : isExisting ? existing?.showOnHome ?? false : false,
    priority: typeof existing?.priority === "number" ? existing.priority : index,
    repoName: repo.name,
    repoFullName: repo.full_name,
    githubRepoId: repo.id ? String(repo.id) : existing?.githubRepoId || "",
    githubNodeId: repo.node_id || existing?.githubNodeId || "",
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
    syncedAt,
  };
}

function findExistingProject(index: Map<string, Project>, repo: any) {
  for (const key of repoIdentityKeys(repo)) {
    const existing = index.get(key);
    if (existing) return existing;
  }

  return undefined;
}

export async function syncGithubProjects(options: SyncOptions = {}) {
  const settings = await getSettings({ profile: {}, projects: [] });
  const token = process.env.GITHUB_TOKEN || settings.profile?.github_token || "";
  if (!token) {
    throw new Error("GitHub token is not configured.");
  }

  const excludedRepos = normalizedExcludedRepos(settings);
  const cacheKey = `github-repos-${token.slice(0, 8)}-${[...excludedRepos].sort().join("|")}`;
  const now = Date.now();
  const cached = githubReposCache[cacheKey];
  const { viewer, repos } =
    cached && now - cached.timestamp < CACHE_DURATION && !options.forceRefresh
      ? cached
      : await (async () => {
          const freshViewer = await fetchGithubUser(token);
          const freshRepos = await fetchAllOwnerRepos(token, excludedRepos);
          githubReposCache[cacheKey] = { viewer: freshViewer, repos: freshRepos, timestamp: now };
          return { viewer: freshViewer, repos: freshRepos };
        })();

  settings.profile = {
    ...(settings.profile || {}),
    githubUsername: viewer.login || settings.profile?.githubUsername || "",
  };

  const currentProjects: Project[] = Array.isArray(settings.projects) ? settings.projects : [];
  const existingIndex = await indexExistingProjects(token, currentProjects);
  const syncedAt = new Date().toISOString();
  const syncedProjects = repos.map((repo, index) => mergeRepoProject(repo, findExistingProject(existingIndex, repo), index, syncedAt));

  const syncedKeys = new Set<string>();
  syncedProjects.forEach((project) => {
    for (const key of projectIdentityKeys(project)) syncedKeys.add(key);
  });

  const manualProjects = currentProjects.filter((project) => {
    if (project.id?.startsWith("github:")) return false;
    return !projectIdentityKeys(project).some((key) => syncedKeys.has(key));
  });

  settings.projects = [...syncedProjects, ...manualProjects];
  await saveSettings(settings);

  return {
    count: syncedProjects.length,
    data: settings.projects,
    syncedAt,
  };
}
