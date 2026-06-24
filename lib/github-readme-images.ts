export interface ReadmeImageCandidate {
  url: string;
  alt: string;
}

const README_IMAGE_BLOCKLIST = /img\.shields\.io|shields\.io|badgen\.net|github-readme-stats|komarev\.com/i;

export function githubFullNameFromProject(project: any) {
  if (project.repoFullName) return String(project.repoFullName).trim();

  const githubUrl = String(project.githubUrl || "").trim();
  const match = githubUrl.match(/github\.com[:/]+([^/\s]+)\/([^/\s?#.]+)(?:\.git)?/i);
  return match ? `${match[1]}/${match[2]}` : "";
}

function readmeBasePath(readmeDownloadUrl?: string) {
  const match = readmeDownloadUrl?.match(/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/(.+)$/);
  if (!match) return "";

  const pathParts = match[1].split("/");
  pathParts.pop();
  return pathParts.length > 0 ? `${pathParts.join("/")}/` : "";
}

export function resolveReadmeImageUrl(imageUrl: string, repoFullName: string, readmeDownloadUrl?: string) {
  const cleaned = imageUrl.trim().replace(/^['"]|['"]$/g, "");
  if (!cleaned || cleaned.startsWith("#") || cleaned.startsWith("data:")) return "";
  if (/^https?:\/\//i.test(cleaned)) return cleaned;

  const branch =
    readmeDownloadUrl?.match(/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/([^/]+)\//)?.[1] ||
    "main";
  const normalizedPath = cleaned.startsWith("/")
    ? cleaned.replace(/^\/+/, "")
    : `${readmeBasePath(readmeDownloadUrl)}${cleaned.replace(/^\.\//, "")}`;

  return `https://raw.githubusercontent.com/${repoFullName}/${branch}/${normalizedPath}`;
}

export function extractReadmeImages(markdown: string, repoFullName: string, readmeDownloadUrl?: string) {
  const seen = new Set<string>();
  const candidates: ReadmeImageCandidate[] = [];

  const addCandidate = (rawUrl: string, alt: string) => {
    const url = resolveReadmeImageUrl(rawUrl, repoFullName, readmeDownloadUrl);
    if (!url || README_IMAGE_BLOCKLIST.test(url) || seen.has(url)) return;

    seen.add(url);
    candidates.push({ url, alt: alt.trim() || "README image" });
  };

  for (const match of markdown.matchAll(/!\[([^\]]*)]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    addCandidate(match[2], match[1]);
  }

  for (const match of markdown.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    const altMatch = match[0].match(/\salt=["']([^"']*)["']/i);
    addCandidate(match[1], altMatch?.[1] || "");
  }

  return candidates;
}

export function extractFirstReadmeImage(markdown: string, repoFullName: string, readmeDownloadUrl?: string) {
  return extractReadmeImages(markdown, repoFullName, readmeDownloadUrl)[0]?.url || "";
}
