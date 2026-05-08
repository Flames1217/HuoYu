import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/settings-store';

export const dynamic = 'force-dynamic';

/**
 * 处理创建新内容的请求
 * @param request Request
 * @returns NextResponse
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      contentType,
      contentBody,
      status = 'draft',
      coverImageUrl,
      demoUrl,
      sourceCodeUrl,
      technologiesString,
    } = body;
    if (!title || !contentType) {
      return NextResponse.json({ success: false, message: 'Missing required fields (title, contentType).' }, { status: 400 });
    }
    let technologiesDbArray: string[] = [];
    if (technologiesString && typeof technologiesString === 'string' && technologiesString.trim() !== '') {
      const techArray = technologiesString.split(',').map(tech => tech.trim()).filter(tech => tech);
      if (techArray.length > 0) {
         technologiesDbArray = techArray;
      }
    }
    const settings = await getSettings({ contents: [] });
    const now = new Date().toISOString();
    const newId = (settings.contents?.[0]?.id || 0) + 1;
    const newContent = {
      id: newId,
      title,
      contentType,
      contentBody,
      status,
      coverImageUrl,
      demoUrl,
      sourceCodeUrl,
      technologies: technologiesDbArray,
      createdAt: now,
      updatedAt: now
    };
    settings.contents = [newContent, ...(settings.contents || [])];
    await saveSettings(settings);
    return NextResponse.json({ success: true, message: 'Content created successfully.', data: newContent }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Internal Server Error while creating content.', errorDetails: (error as Error).message }, { status: 500 });
  }
}

/**
 * 处理获取所有内容的请求
 * @param request Request
 * @returns NextResponse
 */
export async function GET(request: Request) {
  try {
    const settings = await getSettings({ contents: [] });
    return NextResponse.json({ success: true, message: 'Content fetched successfully.', data: settings.contents || [] }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Internal Server Error while fetching content.', errorDetails: (error as Error).message }, { status: 500 });
  }
}

// TODO: 实现 PUT, DELETE 等其他内容的API操作

// TODO: 实现 GET, PUT, DELETE 等其他内容的API操作
// export async function GET(request: Request) { ... } 
