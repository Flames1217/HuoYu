import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getSettings({});
    const profile = settings.profile || {};
    const social_links = profile.social_links || [];
    const rss_url = profile.rss_url || '';
    const folo_url = profile.folo_url || '';
    
    // 优先从profile对象中获取steam_user_id和netease_user_id
    const steam_user_id = profile.steam_user_id || settings.steam_user_id || process.env.STEAM_USER_ID || '';
    const netease_user_id = profile.netease_user_id || settings.netease_user_id || process.env.NETEASE_USER_ID || '';
    const {
      github_token,
      netease_music_u,
      steam_api_key,
      wegame_cookie,
      wakatime_api_key,
      ...publicProfile
    } = profile;

    return NextResponse.json({
      ...publicProfile,
      social_links,
      rss_url,
      folo_url,
      steam_user_id,
      netease_user_id
    });
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return NextResponse.json({ message: 'Error fetching profile data' }, { status: 500 });
  }
}
