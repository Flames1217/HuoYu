import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const settingsFilePath = path.resolve(process.cwd(), "settings.json");

const defaultFooterItems = [
  {
    type: "beian",
    icpBeian:
      '<span style="display: inline-flex; align-items: center; white-space: nowrap;">   <img src="https://img.viper3.top/user/ICP.ico" alt="ICP" style="height: 1em; margin-right: 0.25em;">   京ICP备2023015801号 </span>',
    mengIcpBeian:
      '<span style="display: inline-flex; align-items: center; white-space: nowrap;">   <img src="https://img.viper3.top/user/cuteICP.ico" alt="萌ICP" style="height: 1em; margin-right: 0.25em;">   萌ICP备20251217号 </span>',
    icpBeianUrl: "https://beian.miit.gov.cn/",
    mengIcpBeianUrl: "https://icp.gov.moe/?keyword=20251217",
  },
  {
    type: "copyright",
    authorName: "Viper373",
    startYear: 2025,
  },
  {
    type: "customText",
    text: '<div style="font-size:15px;font-weight:bold;background:linear-gradient(90deg,#ff0000 0%,#ff8000 6.25%,#ffff00 12.5%,#80ff00 18.75%,#00ff00 25%,#00ff80 31.25%,#00ffff 37.5%,#0080ff 43.75%,#0000ff 50%,#8000ff 56.25%,#ff00ff 62.5%,#ff0080 68.75%,#ff0000 75%,#ff8000 81.25%,#ffff00 87.5%,#80ff00 93.75%,#00ff00 100%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:rainbow 6s linear infinite;text-align:center;font-family:sans-serif;padding:0.5em">平平无奇的爬虫开发者</div> <style> @keyframes rainbow{   0%{background-position:0% 50%}   100%{background-position:200% 50%} } </style>',
  },
];

async function readSettings() {
  try {
    const fileContents = await fs.readFile(settingsFilePath, "utf8");
    return JSON.parse(fileContents);
  } catch (error: any) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

function normalizeFooter(rawFooter: any) {
  if (Array.isArray(rawFooter?.items)) {
    const items = rawFooter.items.map((item: any) => ({ ...item }));
    if (!items.some((item: any) => item.type === "copyright")) {
      items.push({ type: "copyright", authorName: rawFooter?.authorName || "Viper373", startYear: 2025 });
    }
    return { items };
  }

  return {
    items: defaultFooterItems.map((item) =>
      item.type === "copyright"
        ? { ...item, authorName: rawFooter?.authorName || "Viper373" }
        : { ...item },
    ),
  };
}

export async function GET() {
  try {
    const settings = await readSettings();
    return NextResponse.json(normalizeFooter(settings.footer));
  } catch (error) {
    console.error("[Footer API] Failed to read settings:", error);
    return NextResponse.json({ message: "读取页脚配置失败" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ message: "未授权" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const settings = await readSettings();
    const currentFooter = normalizeFooter(settings.footer);

    let nextFooter;
    if (Array.isArray(body?.items)) {
      nextFooter = normalizeFooter(body);
    } else {
      const authorName = String(body?.authorName || "").trim();
      if (!authorName) {
        return NextResponse.json({ message: "作者名不能为空" }, { status: 400 });
      }
      const startYear = Number(body?.startYear) || 2025;
      nextFooter = {
        items: currentFooter.items.map((item: any) =>
          item.type === "copyright" ? { ...item, authorName, startYear } : item,
        ),
      };
    }

    settings.footer = nextFooter;
    await fs.writeFile(settingsFilePath, JSON.stringify(settings, null, 2), "utf8");

    return NextResponse.json(nextFooter);
  } catch (error) {
    console.error("[Footer API] Failed to update settings:", error);
    return NextResponse.json({ message: "更新页脚配置失败" }, { status: 500 });
  }
}
