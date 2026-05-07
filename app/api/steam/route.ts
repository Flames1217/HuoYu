import { NextResponse } from 'next/server';
import https from 'node:https';

export const runtime = 'nodejs';

interface SteamGame {
  appid: number;
  name?: string;
  playtime_forever?: number;
  playtime_2weeks?: number;
  img_icon_url?: string;
}

const steamCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_DURATION = 4 * 60 * 60 * 1000;
const STEAM_BASE_URL = 'https://api.steampowered.com';

function isHardReload(request: Request): boolean {
  const cacheControl = request.headers.get('Cache-Control');
  return Boolean(cacheControl?.includes('no-cache') || cacheControl?.includes('max-age=0'));
}

async function fetchSteamAPI(endpoint: string, apiKey: string, params: Record<string, string>) {
  const url = new URL(`${STEAM_BASE_URL}${endpoint}`);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('format', 'json');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const data = await fetchSteamJson(url);
  if (data && data.response) return data.response;
  if (data && Object.keys(data).length === 0) return {};
  throw new Error('Unexpected Steam API response');
}

async function fetchSteamJson(url: URL) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Steam API HTTP error: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    const code = error?.cause?.code || error?.code;
    if (
      code !== 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' &&
      code !== 'UND_ERR_SOCKET' &&
      code !== 'UND_ERR_CONNECT_TIMEOUT'
    ) {
      throw error;
    }

    return fetchSteamJsonWithoutCertVerification(url);
  }
}

function fetchSteamJsonWithoutCertVerification(url: URL) {
  return new Promise<any>((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: { Accept: 'application/json' },
        rejectUnauthorized: false,
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Steam API HTTP error: ${response.statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error('Failed to parse Steam API response'));
          }
        });
      }
    );

    request.setTimeout(10000, () => {
      request.destroy(new Error('Steam API request timed out'));
    });
    request.on('error', reject);
  });
}

async function getRecentlyPlayedGames(apiKey: string, steamId: string) {
  const response = await fetchSteamAPI('/IPlayerService/GetRecentlyPlayedGames/v0001/', apiKey, {
    steamid: steamId,
  });

  return {
    total_count: response.total_count || 0,
    games: Array.isArray(response.games) ? response.games : [],
  };
}

async function getOwnedGames(apiKey: string, steamId: string) {
  const response = await fetchSteamAPI('/IPlayerService/GetOwnedGames/v0001/', apiKey, {
    steamid: steamId,
    include_appinfo: 'true',
    include_played_free_games: 'true',
  });

  const games = Array.isArray(response.games) ? response.games : [];
  const topGames = games
    .sort((a: SteamGame, b: SteamGame) => (b.playtime_forever || 0) - (a.playtime_forever || 0))
    .slice(0, 5);

  return {
    game_count: response.game_count || games.length,
    games: topGames,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const apiKey = searchParams.get('apiKey');
  const isForceRefresh = isHardReload(request);

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Missing Steam userId' }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ success: false, message: 'Missing Steam apiKey' }, { status: 400 });
  }

  const cacheKey = `steam-${userId}-${apiKey.slice(0, 8)}`;
  const now = Date.now();
  const cached = steamCache[cacheKey];
  if (cached && now - cached.timestamp < CACHE_DURATION && !isForceRefresh) {
    return NextResponse.json({
      success: true,
      cached: true,
      expiresInMs: cached.timestamp + CACHE_DURATION - now,
      data: cached.data,
    });
  }

  try {
    const [recentGamesResponse, ownedGamesResponse] = await Promise.all([
      getRecentlyPlayedGames(apiKey, userId),
      getOwnedGames(apiKey, userId),
    ]);

    const combinedData = {
      recentGames: recentGamesResponse.games || [],
      topOwnedGames: ownedGamesResponse.games || [],
    };

    steamCache[cacheKey] = { data: combinedData, timestamp: now };
    return NextResponse.json({ success: true, cached: false, data: combinedData });
  } catch (error: any) {
    console.error('[API Steam] Error fetching data:', error);
    return NextResponse.json(
      { success: false, message: `Failed to fetch Steam data: ${error.message}` },
      { status: 500 }
    );
  }
}
