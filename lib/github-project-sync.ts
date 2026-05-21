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

async function fetchAllOwnerRepos(token: string, ownerLogin: string, excludedRepos: Set<string>) {
  const repos: any[] = [];
  let page = 1;

  while (page <= 10) {
    const response = await fetch(
      `https://api.github.com/user/repos?affiliation=owner&visibility=all&sort=updated&per_page=100&page=${page}`,
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
      const detailedRepo = await fetchGithubRepo(token, repo.full_name);
      return detailedRepo ? { ...repo, ...detailedRepo } : repo;
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
      { headers: createGithubHeaders(token), cache: "no-store" }
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
      { headers: createGithubHeaders(token), cache: "no-store" }
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

  return {
    id: existing?.id || repoProjectId(repo),
    title: repo.name,
    description: repo.description || "",
    imageUrl: "",
    tags: topics.slice(0, 6),
    githubUrl: repo.html_url,
    demoUrl: existing?.demoUrl || repo.homepage || "",
    status: existing?.status || "draft",
    showOnHome: isExisting ? existing?.showOnHome ?? false : false,
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
          const freshRepos = await fetchAllOwnerRepos(token, freshViewer.login, excludedRepos);
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
