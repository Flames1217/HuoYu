import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_PATH = path.resolve(process.cwd(), 'settings.json');

function readSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
}

export async function GET() {
  try {
    const settings = readSettings();
    const profile = settings.profile || {};
    const social_links = profile.social_links || [];
    const rss_url = profile.rss_url || '';
    const folo_url = profile.folo_url || '';
    const steam_api_key = process.env.STEAM_API_KEY || '';
    
    // 优先从profile对象中获取steam_user_id和netease_user_id
    const steam_user_id = profile.steam_user_id || settings.steam_user_id || process.env.STEAM_USER_ID || '';
    const netease_user_id = profile.netease_user_id || settings.netease_user_id || process.env.NETEASE_USER_ID || '';
    const netease_music_u = process.env.NETEASE_MUSIC_U || '';
    const { github_token, wegame_cookie, wakatime_api_key, ...publicProfile } = profile;

    return NextResponse.json({
      ...publicProfile,
      social_links,
      rss_url,
      folo_url,
      steam_api_key,
      steam_user_id,
      netease_user_id,
      netease_music_u
    });
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return NextResponse.json({ message: 'Error fetching profile data' }, { status: 500 });
  }
}
