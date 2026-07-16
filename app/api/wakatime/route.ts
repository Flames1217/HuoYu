import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings-store";
import { getCodexStats } from "@/lib/ai-stats-store";

export const dynamic = "force-dynamic";

const WAKATIME_SUMMARIES_URL =
  "https://wakatime.com/api/v1/users/current/summaries";
const WAKATIME_ALL_TIME_URL =
  "https://wakatime.com/api/v1/users/current/all_time_since_today";
const TIME_ZONE = "Asia/Shanghai";
const CACHE_DURATION = 4 * 60 * 60 * 1000;
const wakatimeCache: Record<string, { data: any; timestamp: number }> = {};

type AnyRecord = Record<string, any>;

function localeFromRequest(request: Request) {
  return new URL(request.url).searchParams.get("lang") === "en" ? "en" : "cn";
}

function msg(locale: string, cn: string, en: string) {
  return locale === "en" ? en : cn;
}

function isHardReload(request: Request): boolean {
  const cacheControl = request.headers.get("Cache-Control");
  return Boolean(
    cacheControl?.includes("no-cache") || cacheControl?.includes("max-age=0"),
  );
}

function numberValue(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function secondsToText(seconds: number) {
  const totalSeconds = Math.max(0, Math.round(seconds));
  if (totalSeconds < 60) return `${totalSeconds} secs`;

  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"}`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest
    ? `${hours} hr${hours === 1 ? "" : "s"} ${rest} min${rest === 1 ? "" : "s"}`
    : `${hours} hr${hours === 1 ? "" : "s"}`;
}

function formatDateInTimeZone(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function daysFromRequest(request: Request) {
  const raw = Number(new URL(request.url).searchParams.get("days"));
  return raw === 7 || raw === 30 || raw === 90 ? raw : 30;
}

function dayRange(days: number) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return {
    start: formatDateInTimeZone(start),
    end: formatDateInTimeZone(end),
  };
}

function isAiOnlyEditor(item: AnyRecord) {
  const aiActivity =
    numberValue(item?.ai_input_tokens) +
    numberValue(item?.ai_output_tokens) +
    numberValue(item?.ai_additions) +
    numberValue(item?.ai_deletions) +
    numberValue(item?.ai_agent_line_changes);
  const humanActivity =
    numberValue(item?.human_additions) + numberValue(item?.human_deletions);
  return aiActivity > 0 && humanActivity === 0;
}

function normalizeAggregateName(key: string, name: string, item: AnyRecord) {
  const normalized = name.trim();
  if (key === "editors") {
    const lower = normalized.toLowerCase().replace(/[\s_-]+/g, "");
    if (
      lower === "codex" ||
      lower === "codexdesktop" ||
      lower === "codexwakatime" ||
      lower === "chatgpt" ||
      lower === "chatgptdesktop"
    )
      return "ChatGPT";
    if (lower === "code" || lower === "vscode" || lower === "visualstudiocode")
      return isAiOnlyEditor(item) ? "ChatGPT" : "VS Code";
  }

  if (key === "operating_systems" && normalized === "Unknown OS") {
    return "Windows";
  }

  return normalized || "Unknown";
}

function aggregateNamed(days: AnyRecord[], key: string, limit = 12) {
  const map = new Map<string, AnyRecord>();

  for (const day of days) {
    const items = Array.isArray(day?.[key]) ? day[key] : [];
    for (const item of items) {
      const name = normalizeAggregateName(
        key,
        String(item?.name || "Unknown"),
        item,
      );
      const prev = map.get(name) || {
        name,
        total_seconds: 0,
        ai_additions: 0,
        ai_deletions: 0,
        human_additions: 0,
        human_deletions: 0,
        ai_agent_line_changes: 0,
        ai_input_tokens: 0,
        ai_output_tokens: 0,
        ai_prompt_events: 0,
        ai_agent_total_cost: 0,
        color: item?.color,
      };

      prev.total_seconds += numberValue(item?.total_seconds);
      prev.ai_additions += numberValue(item?.ai_additions);
      prev.ai_deletions += numberValue(item?.ai_deletions);
      prev.human_additions += numberValue(item?.human_additions);
      prev.human_deletions += numberValue(item?.human_deletions);
      prev.ai_agent_line_changes += numberValue(item?.ai_agent_line_changes);
      prev.ai_input_tokens += numberValue(item?.ai_input_tokens);
      prev.ai_output_tokens += numberValue(item?.ai_output_tokens);
      prev.ai_prompt_events += numberValue(item?.ai_prompt_events);
      prev.ai_agent_total_cost += numberValue(item?.ai_agent_total_cost);
      prev.color = prev.color || item?.color;

      map.set(name, prev);
    }
  }

  const totalSeconds = [...map.values()].reduce(
    (sum, item) => sum + item.total_seconds,
    0,
  );

  return [...map.values()]
    .sort((a, b) => b.total_seconds - a.total_seconds)
    .slice(0, limit)
    .map((item) => ({
      ...item,
      text: secondsToText(item.total_seconds),
      percent: totalSeconds ? (item.total_seconds / totalSeconds) * 100 : 0,
    }));
}

function aggregateAi(
  days: AnyRecord[],
  projects: AnyRecord[],
  editors: AnyRecord[],
) {
  const totals = days.reduce(
    (sum, day) => {
      const grand = day?.grand_total || {};
      sum.aiAdditions += numberValue(grand.ai_additions);
      sum.aiDeletions += numberValue(grand.ai_deletions);
      sum.humanAdditions += numberValue(grand.human_additions);
      sum.humanDeletions += numberValue(grand.human_deletions);
      sum.agentLineChanges += numberValue(grand.ai_agent_line_changes);
      sum.inputTokens += numberValue(grand.ai_input_tokens);
      sum.outputTokens += numberValue(grand.ai_output_tokens);
      sum.promptEvents += numberValue(grand.ai_prompt_events);
      sum.promptLengthSum += numberValue(grand.ai_prompt_length_sum);
      return sum;
    },
    {
      aiAdditions: 0,
      aiDeletions: 0,
      humanAdditions: 0,
      humanDeletions: 0,
      agentLineChanges: 0,
      inputTokens: 0,
      outputTokens: 0,
      promptEvents: 0,
      promptLengthSum: 0,
    },
  );

  const aiLines = totals.aiAdditions + totals.aiDeletions;
  const humanLines = totals.humanAdditions + totals.humanDeletions;
  const allLines = aiLines + humanLines;

  return {
    ...totals,
    aiLines,
    humanLines,
    aiShare: allLines ? (aiLines / allLines) * 100 : 0,
    humanShare: allLines ? (humanLines / allLines) * 100 : 0,
    promptLengthAvg: totals.promptEvents
      ? totals.promptLengthSum / totals.promptEvents
      : 0,
    projectBreakdown: projects
      .filter(
        (item) =>
          numberValue(item.ai_additions) +
            numberValue(item.ai_deletions) +
            numberValue(item.ai_agent_line_changes) >
          0,
      )
      .slice(0, 5),
    editorBreakdown: editors
      .filter(
        (item) =>
          numberValue(item.ai_additions) +
            numberValue(item.ai_deletions) +
            numberValue(item.ai_agent_line_changes) >
          0,
      )
      .slice(0, 5),
  };
}

async function withCodexAi(
  data: AnyRecord,
  range: { start: string; end: string },
) {
  const codexAi = await getCodexStats(range.start, range.end).catch((error) => {
    console.warn("[API WakaTime] Codex AI stats unavailable:", error);
    return null;
  });
  return codexAi
    ? { ...data, ai: { ...data.ai, ...codexAi, source: "codex+wakatime" } }
    : data;
}

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const requestedDays = daysFromRequest(request);
  try {
    const settings = await getSettings({ profile: {} });
    const apiKey = String(
      process.env.WAKATIME_API_KEY || settings.profile?.wakatime_api_key || "",
    ).trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: msg(
            locale,
            "WakaTime API Key 未配置",
            "WakaTime API Key is not configured",
          ),
        },
        { status: 400 },
      );
    }

    const range = dayRange(requestedDays);
    const cacheKey = `wakatime-${apiKey.slice(0, 8)}-${requestedDays}-${range.start}-${range.end}`;
    const now = Date.now();
    const cached = wakatimeCache[cacheKey];
    if (
      cached &&
      now - cached.timestamp < CACHE_DURATION &&
      !isHardReload(request)
    ) {
      const data = await withCodexAi(cached.data, range);
      return NextResponse.json({
        success: true,
        cached: true,
        expiresInMs: cached.timestamp + CACHE_DURATION - now,
        data,
      });
    }

    const summariesUrl = `${WAKATIME_SUMMARIES_URL}?start=${range.start}&end=${range.end}&timezone=${encodeURIComponent(TIME_ZONE)}`;
    const authHeaders = {
      Authorization: `Basic ${Buffer.from(apiKey).toString("base64")}`,
      Accept: "application/json",
    };

    const [summariesResponse, allTimeResponse] = await Promise.all([
      fetch(summariesUrl, {
        cache: "no-store",
        headers: authHeaders,
      }),
      fetch(WAKATIME_ALL_TIME_URL, {
        cache: "no-store",
        headers: authHeaders,
      }),
    ]);

    if (!summariesResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `${msg(locale, "WakaTime summaries 请求失败", "WakaTime summaries request failed")}: ${summariesResponse.status}`,
        },
        { status: summariesResponse.status },
      );
    }

    if (!allTimeResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `${msg(locale, "WakaTime 总时长请求失败", "WakaTime all-time request failed")}: ${allTimeResponse.status}`,
        },
        { status: allTimeResponse.status },
      );
    }

    const summariesPayload = await summariesResponse.json();
    const allTimePayload = await allTimeResponse.json();
    const days: AnyRecord[] = Array.isArray(summariesPayload?.data)
      ? summariesPayload.data
      : [];
    const allTime = allTimePayload?.data || {};

    const recentSeconds = days.reduce(
      (sum: number, day: AnyRecord) =>
        sum + numberValue(day?.grand_total?.total_seconds),
      0,
    );
    const activeDays = days.filter(
      (day: AnyRecord) => numberValue(day?.grand_total?.total_seconds) > 0,
    );
    const dailyAverageSeconds = activeDays.length
      ? recentSeconds / activeDays.length
      : 0;
    const bestDay = activeDays.reduce(
      (best: AnyRecord | null, day: AnyRecord) => {
        if (!best) return day;
        return numberValue(day?.grand_total?.total_seconds) >
          numberValue(best?.grand_total?.total_seconds)
          ? day
          : best;
      },
      null,
    );

    const languages = aggregateNamed(days, "languages", 12)
      .filter((item) => String((item as AnyRecord).name) !== "Other")
      .slice(0, 10);
    const editors = aggregateNamed(days, "editors", 8);
    const projects = aggregateNamed(days, "projects", 10);
    const operatingSystems = aggregateNamed(days, "operating_systems", 5);
    const categories = aggregateNamed(days, "categories", 6);

    const responseData = {
      allTimeText: allTime.text || "0 secs",
      allTimeSeconds: numberValue(allTime.total_seconds),
      recentText: secondsToText(recentSeconds),
      recentSeconds,
      totalText: secondsToText(recentSeconds),
      dailyAverageText: secondsToText(dailyAverageSeconds),
      totalHours: Number((recentSeconds / 3600).toFixed(1)),
      dailyAverageHours: Number((dailyAverageSeconds / 3600).toFixed(1)),
      bestDay: bestDay
        ? {
            date: bestDay.range?.date || bestDay.range?.start || "",
            text: secondsToText(
              numberValue(bestDay.grand_total?.total_seconds),
            ),
          }
        : null,
      range: {
        start: range.start,
        end: range.end,
        days: requestedDays,
        text: msg(
          locale,
          `最近 ${requestedDays} 天`,
          `last ${requestedDays} days`,
        ),
      },
      languages,
      editors,
      projects,
      operatingSystems,
      categories,
      ai: aggregateAi(days, projects, editors),
    };

    wakatimeCache[cacheKey] = { data: responseData, timestamp: now };
    return NextResponse.json({
      success: true,
      cached: false,
      data: await withCodexAi(responseData, range),
    });
  } catch (error) {
    console.error("[API WakaTime] Error fetching WakaTime data:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : msg(
                locale,
                "WakaTime 数据获取失败",
                "Failed to fetch WakaTime data",
              ),
      },
      { status: 500 },
    );
  }
}
