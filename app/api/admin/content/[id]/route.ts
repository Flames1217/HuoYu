import { NextResponse } from "next/server";

import { getSettings, saveSettings } from "@/lib/settings-store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ContentItem = {
  id: number;
  title: string;
  contentType: string;
  contentBody?: string;
  status?: string;
  coverImageUrl?: string;
  demoUrl?: string;
  sourceCodeUrl?: string;
  technologies?: string[];
  createdAt?: string;
  updatedAt?: string;
};

function parseContentId(id: string) {
  const parsed = Number.parseInt(id, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getContentList(settings: Record<string, any>) {
  return Array.isArray(settings.contents) ? (settings.contents as ContentItem[]) : [];
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const contentId = parseContentId(id);

  if (contentId === null) {
    return NextResponse.json({ success: false, message: "Invalid or missing content ID." }, { status: 400 });
  }

  try {
    const settings = await getSettings({ contents: [] });
    const contents = getContentList(settings);
    const nextContents = contents.filter((item) => item.id !== contentId);

    if (nextContents.length === contents.length) {
      return NextResponse.json({ success: false, message: `Content with ID ${id} not found.` }, { status: 404 });
    }

    settings.contents = nextContents;
    await saveSettings(settings);

    return NextResponse.json(
      { success: true, message: "Content deleted successfully.", data: { id: contentId } },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error while deleting content.",
        errorDetails: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const contentId = parseContentId(id);

  if (contentId === null) {
    return NextResponse.json({ success: false, message: "Invalid or missing content ID." }, { status: 400 });
  }

  try {
    const settings = await getSettings({ contents: [] });
    const content = getContentList(settings).find((item) => item.id === contentId);

    if (!content) {
      return NextResponse.json({ success: false, message: `Content with ID ${id} not found.` }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Content fetched successfully.", data: content },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error while fetching content.",
        errorDetails: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const contentId = parseContentId(id);

  if (contentId === null) {
    return NextResponse.json({ success: false, message: "Invalid or missing content ID for update." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { title, contentType, contentBody, status } = body;

    if (!title || !contentType) {
      return NextResponse.json(
        { success: false, message: "Missing required fields (title, contentType) for update." },
        { status: 400 }
      );
    }

    const settings = await getSettings({ contents: [] });
    const contents = getContentList(settings);
    const existingIndex = contents.findIndex((item) => item.id === contentId);

    if (existingIndex === -1) {
      return NextResponse.json(
        { success: false, message: `Content with ID ${id} not found for update.` },
        { status: 404 }
      );
    }

    const updatedContent: ContentItem = {
      ...contents[existingIndex],
      title,
      contentType,
      contentBody,
      status,
      updatedAt: new Date().toISOString(),
    };

    settings.contents = [
      ...contents.slice(0, existingIndex),
      updatedContent,
      ...contents.slice(existingIndex + 1),
    ];
    await saveSettings(settings);

    return NextResponse.json(
      { success: true, message: "Content updated successfully.", data: updatedContent },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, message: "Invalid JSON payload for update." }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error while updating content.",
        errorDetails: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
