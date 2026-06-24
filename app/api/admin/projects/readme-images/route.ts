import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getSettings } from "@/lib/settings-store";
import { extractReadmeImages, githubFullNameFromProject } from "@/lib/github-readme-images";

export const dynamic = "force-dynamic";

const GITHUB_FETCH_TIMEOUT = 6000;

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
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const repoFullName = githubFullNameFromProject(body);

    if (!repoFullName) {
      return NextResponse.json({ message: "缺少 GitHub 仓库地址" }, { status: 400 });
    }

    const settings = await getSettings({});
    const token = process.env.GITHUB_TOKEN || settings.profile?.github_token || "";
    const response = await fetchWithTimeout(`https://api.github.com/repos/${repoFullName}/readme`, {
      headers: githubHeaders(token),
    });

    if (!response.ok) {
      return NextResponse.json({ message: "README 获取失败" }, { status: response.status });
    }

    const readme = await response.json();
    const markdown = decodeBase64Content(readme.content);
    const images = extractReadmeImages(markdown, repoFullName, readme.download_url);

    return NextResponse.json({ images });
  } catch (error) {
    console.error("[API /api/admin/projects/readme-images POST] Error:", error);
    return NextResponse.json({ message: "README 图片获取失败" }, { status: 500 });
  }
}
