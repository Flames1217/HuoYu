import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const SETTINGS_PATH = path.resolve(process.cwd(), 'settings.json')

function readSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    // Initialize with a basic structure if the file doesn't exist
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ profile: {} }, null, 2))
  }
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'))
}

function writeSettings(settings: any) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

// Interface matches the one in profile-public and database structure
interface ProfileData {
  site_title?: string | null;
  favicon_url?: string | null;
  avatar_url?: string | null;
  skill_icon_row1?: string | null;
  skill_icon_row2?: string | null;
  introduction?: string | null;
  social_links?: Array<{ name: string; url: string; icon: string }> | null;
  mbti_type?: string | null;
  mbti_title?: string | null;
  mbti_image_url?: string | null;
  mbti_traits?: string[] | null;
  rss_url?: string | null;
  steam_user_id?: string | null;
  steam_api_key?: string | null;
  github_token?: string | null;
  netease_user_id?: string | null;
  netease_music_u?: string | null;
  wegame_tgp_id?: string | null;
  wegame_cookie?: string | null;
  wakatime_api_key?: string | null;
  // created_at and updated_at are managed by DB
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = readSettings()
    const profileFromSettings = settings.profile || {}
    
    // Sensitive credentials live in env files. Keep them out of settings.json.
    const steam_api_key = process.env.STEAM_API_KEY || ''
    const netease_music_u = process.env.NETEASE_MUSIC_U || ''
    const github_token = process.env.GITHUB_TOKEN || ''
    const wegame_tgp_id = process.env.WEGAME_TGP_ID || ''
    const wegame_cookie = process.env.WEGAME_COOKIE || ''
    const wakatime_api_key = process.env.WAKATIME_API_KEY || ''

    // The profile data sent to frontend will include rss_url if it's in settings.profile
    const responsePayload: ProfileData = {
      ...profileFromSettings, // This spread includes rss_url if present in settings.profile
      steam_api_key,          // Add env var explicitly
      netease_music_u,        // Add env var explicitly
      github_token,
      wegame_tgp_id,
      wegame_cookie,
      wakatime_api_key,
    }

    return NextResponse.json(responsePayload, { status: 200 })
  } catch (error) {
    console.error("[API Admin Profile] Error fetching profile data:", error)
    return NextResponse.json({ message: 'Error fetching profile data' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dataFromClient: ProfileData = await request.json()
    const settings = readSettings()

    // Keep credentials out of settings.json. Configure them in .env.local / deployment env.
    const {
      steam_api_key,
      netease_music_u,
      github_token,
      wegame_tgp_id,
      wegame_cookie,
      wakatime_api_key,
      ...profileDataToSave
    } = dataFromClient

    // Ensure settings.profile exists
    if (!settings.profile) {
      settings.profile = {}
    }

    // Merge the received profile data (which includes rss_url) into settings.profile
    // rss_url from dataFromClient will correctly update settings.profile.rss_url
    settings.profile = { ...settings.profile, ...profileDataToSave }

    writeSettings(settings)
    return NextResponse.json({ message: 'Profile updated successfully' }, { status: 200 })
  } catch (error) {
    console.error("[API Admin Profile] Error updating profile data:", error)
    let message = 'Error updating profile'
    if (error instanceof Error) {
        message = error.message
    }
    return NextResponse.json({ message }, { status: 500 })
  }
}
