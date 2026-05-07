import { NextResponse } from 'next/server';

const neteaseCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_DURATION = 4 * 60 * 60 * 1000;

function isHardReload(request: Request): boolean {
  const cacheControl = request.headers.get('Cache-Control');
  return Boolean(cacheControl?.includes('no-cache') || cacheControl?.includes('max-age=0'));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid') || process.env.NETEASE_USER_ID;
  const musicU = process.env.NETEASE_MUSIC_U;
  const baseURL = 'https://neteasecloudmusicapi.viper3.top';
  const isForceRefresh = isHardReload(request);

  if (!uid) {
    return NextResponse.json({ code: 400, message: 'Missing uid parameter' }, { status: 400 });
  }

  if (!musicU) {
    return NextResponse.json({ code: 400, message: 'MUSIC_U is not configured' }, { status: 400 });
  }

  const cacheKey = `netease-${uid}-${musicU.slice(0, 8)}`;
  const now = Date.now();
  const cached = neteaseCache[cacheKey];
  if (cached && now - cached.timestamp < CACHE_DURATION && !isForceRefresh) {
    return NextResponse.json({
      code: 200,
      cached: true,
      expiresInMs: cached.timestamp + CACHE_DURATION - now,
      data: cached.data,
    });
  }

  try {
    const apiUrl = `${baseURL}/user/record?uid=${uid}&type=1&cookie=MUSIC_U=${encodeURIComponent(musicU)}`;
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Referer: 'https://music.163.com/',
      },
    });

    const data = await res.json();
    if (data.code !== 200) {
      return NextResponse.json({ code: data.code, message: data.message || 'NetEase API error' }, { status: 500 });
    }

    const weekData = data.weekData || [];
    const top10 = weekData.slice(0, 10).map((record: any, idx: number) => {
      const song = record.song;
      return {
        rank: idx + 1,
        id: song.id,
        name: song.name,
        artists: song.ar.map((artist: any) => artist.name),
        album: song.al.name,
        playCount: record.playCount,
        score: record.score,
        duration: song.dt,
        cover: song.al.picUrl,
      };
    });

    neteaseCache[cacheKey] = { data: top10, timestamp: now };
    return NextResponse.json({ code: 200, cached: false, data: top10 });
  } catch (error: any) {
    console.error('[API NetEase] Request failed:', error);
    return NextResponse.json({ code: 500, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
