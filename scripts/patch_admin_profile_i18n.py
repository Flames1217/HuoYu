from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROFILE_PAGE = ROOT / "app" / "admin" / "profile" / "page.tsx"
CN_JSON = ROOT / "lib" / "locales" / "cn.json"
EN_JSON = ROOT / "lib" / "locales" / "en.json"


def patch_profile_page() -> None:
    content = PROFILE_PAGE.read_text(encoding="utf-8")
    target_line = '          <p className="text-xs text-muted-foreground mt-1">请先在 GitHub Settings > Developer settings > Personal access tokens 生成后再粘贴。</p>'
    replacement_line = '          <p className="text-xs text-muted-foreground mt-1">{t(\'adminProfile.githubTokenHelpGenerate\', \'请先在 GitHub Settings > Developer settings > Personal access tokens 生成后再粘贴。\')}</p>'

    if replacement_line in content:
        return

    if target_line in content:
        PROFILE_PAGE.write_text(content.replace(target_line, replacement_line), encoding="utf-8")


def patch_locales() -> None:
    cn = json.loads(CN_JSON.read_text(encoding="utf-8"))
    en = json.loads(EN_JSON.read_text(encoding="utf-8"))

    cn.setdefault("adminProfile", {}).update(
        {
            "toastFetchError": "加载个人资料失败",
            "toastCouldNotLoad": "暂时无法加载个人资料",
            "toastCouldNotSave": "暂时无法保存个人资料",
            "siteSectionTitle": "站点信息",
            "siteSectionDescription": "控制浏览器标签页标题和 favicon 图标。",
            "siteTitleLabel": "站点标题",
            "faviconUrlLabel": "Favicon URL",
            "faviconUrlHelpPrefix": "支持站内路径或完整图片地址，例如 ",
            "faviconUrlHelpMiddle": "、",
            "faviconUrlHelpSuffix": "。",
            "heroSectionTitle": "首页首屏信息",
            "heroSectionDescription": "控制个人主页首屏的昵称、标题和技能图标。",
            "nicknameLabel": "昵称",
            "heroTitleLine1Label": "第一行",
            "heroTitleLine2Label": "第二行",
            "skillIconRow1Label": "技能图标第一行",
            "skillIconRow2Label": "技能图标第二行",
            "skillIconHelpPrefix": "到 ",
            "skillIconHelpMiddle": " 查看可用图标名，只填写 URL 里 ",
            "skillIconHelpSuffix": " 后面的内容，多个用英文逗号分隔。",
            "skillIconExamplePrefix": "例如 ",
            "skillIconExampleMiddle": " 会生成 ",
            "skillIconExampleSuffix": "。",
            "githubTokenLabel": "GitHub Token",
            "githubTokenPlaceholder": "用于同步本人 GitHub 仓库，需要 repo/read:user 权限",
            "githubTokenHelpEnv": "请配置到 .env.local 的 GITHUB_TOKEN，后台只读取环境变量，不写入站点配置。",
            "githubTokenHelpGenerate": "请先在 GitHub Settings > Developer settings > Personal access tokens 生成后再粘贴。",
            "socialLinkColorLabel": "颜色",
            "mbtiImageUrlHelp": "如果使用图床或外部站点图片，请先生成可公开访问的直链后再粘贴。",
            "mbtiTraitPlaceholder": "特质 {{index}}",
            "foloUrlHelp": "请先在 Follow/Folo 页面生成分享链接，再粘贴到这里。",
            "steamApiKeyPlaceholder": "你的 Steam Web API Key",
            "steamApiKeyHelp": "请配置到 .env.local 的 STEAM_API_KEY，避免把密钥写进仓库。",
            "neteaseMusicUPlaceholder": "你的网易云 MUSIC_U Cookie",
            "neteaseMusicUHelp": "请配置到 .env.local 的 NETEASE_MUSIC_U，避免把 Cookie 写进仓库。",
            "wegameTgpIdLabel": "WeGame TGP ID",
            "wegameTgpIdPlaceholder": "例如：290717074",
            "wegameHelpPrefix": "登录",
            "wegameTgpIdHelpSuffix": "，F12 查看 Cookie 中的 tgp_id，并配置到 .env.local 的 WEGAME_TGP_ID。",
            "wegameCookieLabel": "WeGame Cookie",
            "wegameCookiePlaceholder": "粘贴 GetAllGameInfo 请求里的完整 Cookie",
            "wegameCookieHelpSuffix": "，F12 查看 Cookie 中的 tgp_id，并复制完整 Cookie 配置到 .env.local 的 WEGAME_COOKIE。",
            "wakatimeApiKeyLabel": "WakaTime API Key",
            "wakatimeApiKeyPlaceholder": "粘贴 WakaTime Settings 里的 API Key",
            "wakatimeHelpPrefix": "到 ",
            "wakatimeHelpSuffix": " 页面复制 API Key，并配置到 .env.local 的 WAKATIME_API_KEY。",
        }
    )

    en["adminProfile"] = {
        "title": "Profile Management",
        "description": "Manage your personal information, social links, and homepage profile content.",
        "saveButton": "Save changes",
        "savingButton": "Saving...",
        "savingProfileButton": "Saving profile...",
        "loading": "Loading profile...",
        "loadError": "Failed to load profile: {{error}}",
        "retryButton": "Retry",
        "avatarUrlLabel": "Avatar URL",
        "avatarUrlPlaceholder": "Enter your avatar image URL",
        "introductionLabel": "Introduction",
        "introductionPlaceholder": "Write a short introduction about yourself",
        "signatureSvgUrl1Label": "Signature SVG URL 1",
        "signatureSvgUrl1Placeholder": "First typing-effect SVG URL",
        "signatureSvgUrl2Label": "Signature SVG URL 2",
        "signatureSvgUrl2Placeholder": "Second typing-effect SVG URL",
        "githubUsernameLabel": "GitHub username",
        "githubUsernameDescription": "Enter your GitHub username",
        "githubUsernamePlaceholder": "Example: Viper373",
        "toastProfileUpdated": "Profile updated",
        "toastFetchError": "Failed to load profile",
        "toastCouldNotLoad": "Could not load profile right now",
        "toastCouldNotSave": "Could not save profile right now",
        "mbtiTypeLabel": "MBTI type",
        "mbtiTypePlaceholder": "Example: INFJ-T, ENFP",
        "mbtiTitleLabel": "MBTI title",
        "mbtiTitlePlaceholder": "Example: Advocate",
        "mbtiImageUrlLabel": "MBTI image URL",
        "mbtiImageUrlPlaceholder": "Paste an MBTI-related image URL",
        "mbtiImageUrlHelp": "If you use an image host or external site, generate a publicly accessible direct link before pasting it here.",
        "mbtiTraitsLabel": "MBTI traits (one per line)",
        "mbtiTraitsPlaceholder": "Creative perspective\nCommitted to self-improvement",
        "mbtiTraitPlaceholder": "Trait {{index}}",
        "rssUrlLabel": "RSS feed URL",
        "rssUrlPlaceholder": "Example: https://yourblog.com/rss.xml",
        "foloUrlLabel": "Folo feed URL",
        "foloUrlPlaceholder": "Example: https://app.follow.is/share/feeds/your_feed_id",
        "foloUrlHelp": "Generate a share link on the Follow/Folo page first, then paste it here.",
        "steamUserIdLabel": "Steam user ID",
        "steamUserIdPlaceholder": "Example: 7656119...",
        "neteaseUserIdLabel": "NetEase Music user ID",
        "neteaseUserIdPlaceholder": "Example: 12345678",
        "socialLinksTitle": "Social links",
        "addSocialLinkButton": "Add social link",
        "socialLinkNameLabel": "Name",
        "socialLinkNamePlaceholder": "Example: GitHub",
        "socialLinkUrlLabel": "URL",
        "socialLinkUrlPlaceholder": "Example: https://github.com/user",
        "socialLinkIconLabel": "Icon name (from react-icons)",
        "socialLinkIconPlaceholder": "Example: SiGithub, FaBlog, MdEmail",
        "removeSocialLinkButton": "Remove social link",
        "toastLoadSuccess": "Profile loaded",
        "toastLoadError": "Error loading profile",
        "toastSaveSuccess": "Profile saved successfully!",
        "toastSaveError": "Failed to save profile",
        "toastSaving": "Saving profile...",
        "loadingProfile": "Loading profile...",
        "signatureSvgLine1Label": "Signature SVG (line 1)",
        "signatureSvgLine1Placeholder": "Example: your name | your slogan",
        "signatureSvgLine1Description": "Text used for the first SVG in the signature area.",
        "signatureSvgLine2Label": "Signature SVG (line 2)",
        "signatureSvgLine2Placeholder": "Example: first line text; separate the second line with a semicolon",
        "signatureSvgLine2Description": "Text used for the second SVG in the signature area. Use semicolons (;) to separate multiple lines.",
        "introductionOptionalLabel": "Introduction (optional)",
        "socialLinksLabel": "Social links",
        "mbtiSectionTitle": "MBTI Profile Settings",
        "mbtiTraitsDescription": "Four customizable descriptions, for example \"charismatic leader\".",
        "mediaStatsTitle": "RSS / Steam / NetEase Music Settings",
        "steamApiKeyLabel": "Steam API key",
        "neteaseMusicULabel": "NetEase Music MUSIC_U",
        "saveProfileButton": "Save profile",
        "siteSectionTitle": "Site information",
        "siteSectionDescription": "Control the browser tab title and favicon icon.",
        "siteTitleLabel": "Site title",
        "faviconUrlLabel": "Favicon URL",
        "faviconUrlHelpPrefix": "Supports an internal path or a full image URL, for example ",
        "faviconUrlHelpMiddle": " or ",
        "faviconUrlHelpSuffix": ".",
        "heroSectionTitle": "Homepage hero content",
        "heroSectionDescription": "Control the nickname, headline, and skill icons in the homepage hero section.",
        "nicknameLabel": "Nickname",
        "heroTitleLine1Label": "First line",
        "heroTitleLine2Label": "Second line",
        "skillIconRow1Label": "Skill icons row 1",
        "skillIconRow2Label": "Skill icons row 2",
        "skillIconHelpPrefix": "Go to ",
        "skillIconHelpMiddle": " to view available icon names. Only fill in the part after ",
        "skillIconHelpSuffix": " in the URL, separated by commas.",
        "skillIconExamplePrefix": "For example, ",
        "skillIconExampleMiddle": " generates ",
        "skillIconExampleSuffix": ".",
        "githubTokenLabel": "GitHub token",
        "githubTokenPlaceholder": "Used to sync your own GitHub repositories and requires repo/read:user permissions",
        "githubTokenHelpEnv": "Configure it in .env.local as GITHUB_TOKEN. The admin reads only environment variables and does not write it into site settings.",
        "githubTokenHelpGenerate": "Create one in GitHub Settings > Developer settings > Personal access tokens before pasting it here.",
        "socialLinkColorLabel": "Color",
        "mbtiImageUrlHelp": "If you use an image host or external site, generate a publicly accessible direct link before pasting it here.",
        "steamApiKeyPlaceholder": "Your Steam Web API key",
        "steamApiKeyHelp": "Configure it in .env.local as STEAM_API_KEY to avoid committing the key to the repository.",
        "neteaseMusicUPlaceholder": "Your NetEase Music MUSIC_U cookie",
        "neteaseMusicUHelp": "Configure it in .env.local as NETEASE_MUSIC_U to avoid committing the cookie to the repository.",
        "wegameTgpIdLabel": "WeGame TGP ID",
        "wegameTgpIdPlaceholder": "Example: 290717074",
        "wegameHelpPrefix": "Sign in to ",
        "wegameTgpIdHelpSuffix": ", inspect the tgp_id value in Cookies via F12, and configure it in .env.local as WEGAME_TGP_ID.",
        "wegameCookieLabel": "WeGame cookie",
        "wegameCookiePlaceholder": "Paste the full Cookie from the GetAllGameInfo request",
        "wegameCookieHelpSuffix": ", inspect the tgp_id value in Cookies via F12, and copy the full Cookie into .env.local as WEGAME_COOKIE.",
        "wakatimeApiKeyLabel": "WakaTime API key",
        "wakatimeApiKeyPlaceholder": "Paste the API key from WakaTime Settings",
        "wakatimeHelpPrefix": "Go to ",
        "wakatimeHelpSuffix": " and copy the API key, then configure it in .env.local as WAKATIME_API_KEY.",
        "validation": {
            "avatarUrlInvalid": "Invalid avatar URL format",
            "signatureSvgUrl1Invalid": "Invalid Signature SVG URL 1 format",
            "signatureSvgUrl2Invalid": "Invalid Signature SVG URL 2 format",
            "mbtiImageUrlInvalid": "Invalid MBTI image URL format",
            "rssUrlInvalid": "Invalid RSS feed URL format",
            "foloUrlInvalid": "Invalid Folo feed URL format",
            "socialLinkUrlInvalid": "Invalid social link URL format (link {{index}})",
            "socialLinkNameRequired": "Social link name is required (link {{index}})",
            "socialLinkIconRequired": "Social link icon is required (link {{index}})"
        }
    }

    CN_JSON.write_text(json.dumps(cn, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    EN_JSON.write_text(json.dumps(en, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    patch_profile_page()
    patch_locales()
    print("patched admin profile i18n")
