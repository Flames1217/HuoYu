import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { syncGithubProjects } from "@/lib/github-project-sync";

export const dynamic = "force-dynamic";

function isHardReload(request: Request): boolean {
  const cacheControl = request.headers.get("Cache-Control");
  return Boolean(cacheControl?.includes("no-cache") || cacheControl?.includes("max-age=0"));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncGithubProjects({ forceRefresh: isHardReload(request) });

    return NextResponse.json({
      message: "Repositories synced.",
      count: result.count,
      data: result.data,
      syncedAt: result.syncedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to sync GitHub repositories." },
      { status: 500 }
    );
  }
}
