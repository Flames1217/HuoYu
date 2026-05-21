import { NextResponse } from "next/server";
import { syncGithubProjects } from "@/lib/github-project-sync";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization") || "";
  const headerSecret = request.headers.get("x-cron-secret") || "";
  return authorization === `Bearer ${cronSecret}` || headerSecret === cronSecret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncGithubProjects({ forceRefresh: true });
    return NextResponse.json({
      message: "GitHub repositories synced.",
      count: result.count,
      syncedAt: result.syncedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to sync GitHub repositories." },
      { status: 500 }
    );
  }
}
