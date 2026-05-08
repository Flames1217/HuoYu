import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getSettings, saveSettings } from '@/lib/settings-store'

export const dynamic = 'force-dynamic'

// 与公开资料接口和历史数据结构保持一致。
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
  // created_at 和 updated_at 由存储层维护。
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getSettings({ profile: {} })
    const profileFromSettings = settings.profile || {}
    
    // 敏感凭据只从环境变量读取，不写入站点配置。
    const steam_api_key = process.env.STEAM_API_KEY || ''
    const netease_music_u = process.env.NETEASE_MUSIC_U || ''
    const github_token = process.env.GITHUB_TOKEN || ''
    const wegame_tgp_id = process.env.WEGAME_TGP_ID || ''
    const wegame_cookie = process.env.WEGAME_COOKIE || ''
    const wakatime_api_key = process.env.WAKATIME_API_KEY || ''

    // 返回给后台表单的数据会合并可编辑资料和环境变量中的只读密钥。
    const responsePayload: ProfileData = {
      ...profileFromSettings,
      steam_api_key,
      netease_music_u,
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
    const settings = await getSettings({ profile: {} })

    // 敏感凭据不保存到站点配置，请在 .env.local 或部署平台环境变量中配置。
    const {
      steam_api_key,
      netease_music_u,
      github_token,
      wegame_tgp_id,
      wegame_cookie,
      wakatime_api_key,
      ...profileDataToSave
    } = dataFromClient

    // 确保 profile 容器存在。
    if (!settings.profile) {
      settings.profile = {}
    }

    // 将后台提交的可编辑资料合并回 Upstash 中的站点配置。
    settings.profile = { ...settings.profile, ...profileDataToSave }

    await saveSettings(settings)
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
