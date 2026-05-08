import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getSettings, saveSettings } from "@/lib/settings-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getSettings({ projects: [] });
    return NextResponse.json(settings.projects || []);
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
