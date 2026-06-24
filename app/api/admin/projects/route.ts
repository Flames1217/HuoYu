import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getSettings, saveSettings } from "@/lib/settings-store";
import { extractReadmeImages, githubFullNameFromProject } from "@/lib/github-readme-images";

export const dynamic = "force-dynamic";

const CACHE_DURATION = 4 * 60 * 60 * 1000;
const GITHUB_FETCH_TIMEOUT = 6000;
const readmeImagesCache: Record<string, { images: any[]; timestamp: number }> = {};

function githubHeaders(token?: string) {
  return {
    Accept: "application/vnd.github+json",
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

async function fetchReadmeImages(project: any, token?: string) {
  const repoFullName = githubFullNameFromProject(project);
  if (!repoFullName) return [];

  const cacheKey = repoFullName.toLowerCase();
  const now = Date.now();
  const cached = readmeImagesCache[cacheKey];
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.images;
  }

  try {
    const response = await fetchWithTimeout(`https://api.github.com/repos/${repoFullName}/readme`, {
      headers: githubHeaders(token),
    });

    if (!response.ok) return [];
    const readme = await response.json();
    const markdown = decodeBase64Content(readme.content);
    const images = extractReadmeImages(markdown, repoFullName, readme.download_url);
    readmeImagesCache[cacheKey] = { images, timestamp: now };
    return images;
  } catch {
    return [];
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getSettings({ projects: [] });
    const token = process.env.GITHUB_TOKEN || settings.profile?.github_token || "";
    const projects = Array.isArray(settings.projects) ? settings.projects : [];
    const projectsWithReadmeImages = await Promise.all(
      projects.map(async (project: any) => {
        const readmeImages = await fetchReadmeImages(project, token);
        return {
          ...project,
          imageUrl: project.imageUrl || readmeImages[0]?.url || "",
          readmeImages,
        };
      })
    );

    return NextResponse.json(projectsWithReadmeImages);
  } catch (error) {
    console.error("[API /api/admin/projects GET] Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const newProjects = await request.json();
    if (!Array.isArray(newProjects)) {
      return NextResponse.json({ message: "Invalid project data format. Expected an array." }, { status: 400 });
    }

    const currentSettings = await getSettings({ projects: [] });
    await saveSettings({
      ...currentSettings,
      projects: newProjects,
    });

    return NextResponse.json({ message: "Projects updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("[API /api/admin/projects POST] Error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: "Invalid JSON in request body." }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
