![HuoYu](https://socialify.git.ci/Flames1217/HuoYu/image?description=1&forks=1&language=1&name=1&owner=1&pattern=Plus&pulls=1&stargazers=1&theme=Light)

# 🔥 HuoYu丨火域

灵感来自《斗破苍穹》中萧炎在大千世界创立的无尽火域。

HuoYu 是一个个人主页和数据展示站点。前台集中展示个人资料、社交入口、技能、游戏、音乐、阅读、项目、GitHub 与 WakaTime 数据；后台用于维护站点资料、项目展示和页脚信息。

当前已切换到基于 locale 前缀的访问方式：

- 前台首页：`/cn`、`/en`
- 后台首页：`/cn/admin`、`/en/admin`

仓库里正在从本地词典方案迁移到 Tolgee Cloud；目前已完成路由、Provider 和环境变量占位改造，组件级翻译调用仍在逐步替换中。

## 功能特性

- 个人主页：头像、昵称、标语、社交链接、技能图标和主页视觉动效。
- 内容卡片：阅读清单、Steam、WeGame、网易云音乐、GitHub 贡献、WakaTime 编程时长、MBTI 与项目展示。
- 项目展示：同步 GitHub 公开仓库，展示语言、标签、Star/Fork、源码和预览入口。
- 数据缓存：第三方 API 数据统一使用缓存策略，减少刷新时的接口压力。
- 主题体验：前台支持日间与夜间模式。
- 管理后台：通过 `PASSWORD` 登录，维护站点标题、favicon、个人资料、项目和页脚配置。
- 国际化：前台和后台都提供语言切换入口，并已预留 Tolgee Cloud 接入结构。

## 数据与配置

项目已弃用仓库里的 `settings.json`。站点标题、格言、头像、社交链接、项目列表、页脚等可在线编辑内容现在存储在 Upstash Redis 中。

当前配置分层如下：

- Upstash Redis：保存可在线编辑的站点配置，默认 key 为 `huoyu:settings`。
- Vercel 环境变量：保存敏感密钥，例如登录密码、NextAuth 密钥、第三方 API Key、Cookie。
- 公开接口：只返回前台需要展示的数据，不返回 `STEAM_API_KEY`、`NETEASE_MUSIC_U` 等敏感字段。

这样做的原因是：Upstash 适合保存可编辑配置，但真正的密钥仍放在环境变量里更稳，避免后台配置接口、日志或公开接口误返回密钥。

## 环境变量

真实密钥只放在 `.env.local` 或部署平台环境变量中，不要提交到仓库。

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `PASSWORD` | 是 | 管理后台登录密码 |
| `NEXTAUTH_SECRET` | 是 | NextAuth 会话签名密钥 |
| `UPSTASH_REDIS_REST_URL` | 二选一 | Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | 二选一 | Upstash REST Token |
| `KV_REST_API_URL` | 二选一 | Vercel Marketplace Upstash 提供的 REST URL |
| `KV_REST_API_TOKEN` | 二选一 | Vercel Marketplace Upstash 提供的 REST Token |
| `SETTINGS_REDIS_KEY` | 否 | 站点配置 Redis key，默认 `huoyu:settings` |
| `GITHUB_TOKEN` | 按需 | GitHub API Token，用于同步仓库和贡献数据 |
| `STEAM_API_KEY` | 按需 | Steam Web API Key |
| `STEAM_USER_ID` | 按需 | Steam 用户 ID。也可以在后台资料里维护 |
| `NETEASE_USER_ID` | 按需 | 网易云音乐用户 ID。也可以在后台资料里维护 |
| `NETEASE_MUSIC_U` | 按需 | 网易云音乐登录 Cookie 中的 `MUSIC_U` |
| `WAKATIME_API_KEY` | 按需 | WakaTime API Key |
| `WEGAME_TGP_ID` | 按需 | WeGame Cookie 中的 `tgp_id` |
| `WEGAME_COOKIE` | 按需 | WeGame 完整 Cookie |
| `NEXT_PUBLIC_FEED_URL` | 按需 | RSS 区块使用的公开 feed 地址 |
| `NEXT_PUBLIC_TOLGEE_API_URL` | 否 | Tolgee Cloud API 地址，默认 `https://app.tolgee.io` |
| `NEXT_PUBLIC_TOLGEE_API_KEY` | 否 | Tolgee Cloud 前端 API Key |
| `NEXT_PUBLIC_TOLGEE_PROJECT_ID` | 否 | Tolgee Cloud Project ID，某些远端读取场景会用到 |

如果使用 Vercel Marketplace 连接 Upstash，通常会自动注入 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`。如果手动创建 Upstash，则通常使用 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`。

Tolgee Cloud 当前为预接入状态：

- 前端运行只需要 `NEXT_PUBLIC_TOLGEE_API_URL`、`NEXT_PUBLIC_TOLGEE_API_KEY` 与 `NEXT_PUBLIC_TOLGEE_PROJECT_ID`。
- 翻译补全、Tolgee 推送等脚本还需要服务端变量，见文末“翻译与 Tolgee 说明”。
- 未填真实 Tolgee Key 时，页面仍会优先走本地语言包，避免开发阶段直接中断。

## 本地启动

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

启动后访问：

- 前台：`http://localhost:3000/cn` 或 `http://localhost:3000/en`
- 后台：`http://localhost:3000/cn/admin` 或 `http://localhost:3000/en/admin`

本地如果没有配置 Upstash 连接变量，前台会使用默认空配置，后台保存配置会失败。要完整测试后台保存，请在 `.env.local` 中填入真实的 Upstash REST URL 和 Token。

如果暂时没有 Tolgee Cloud 密钥，也不会影响当前项目启动；只是在组件全部迁移完成前，项目仍会保留兼容用的本地翻译桥接层。

## 常用命令

```bash
pnpm dev
pnpm build
pnpm start
```

## 部署

推荐部署到 Vercel。

部署要求：

- 在 Vercel 项目中连接 Upstash Redis。
- 确认 Vercel 环境变量中存在 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`，或手动配置 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`。
- 配置 `PASSWORD` 和 `NEXTAUTH_SECRET`。
- 按需配置 GitHub、Steam、网易云音乐、WakaTime、WeGame 等第三方服务密钥。

推送到 `main` 后，Vercel 会自动部署。

## 目录说明

```text
app/              Next.js App Router 页面与接口
components/       前台与后台组件
lib/              数据处理、配置存储和工具函数
public/           静态资源与预览图片
```

## 说明

HuoYu 是个人站点项目，部分第三方数据依赖对应服务的账号、API Key 或 Cookie。若某个服务未配置，前台会尽量使用已有缓存或隐藏对应数据。

## 翻译与 Tolgee 说明

本项目当前使用 `cn/en/es/fr/ja` 五个本地语言包，文件位于 `lib/locales/`。页面运行时会优先读取本地语言包，再回退到 Tolgee，因此即使 Tolgee Cloud 暂时没有完整远端译文，也不会影响前台和后台切换语言。

需要额外配置的翻译相关环境变量如下：

| 变量 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_TOLGEE_API_URL` | 前端 Tolgee SDK 使用的 API 地址，默认 `https://app.tolgee.io` |
| `NEXT_PUBLIC_TOLGEE_API_KEY` | 前端 Tolgee SDK 使用的公开 API Key |
| `NEXT_PUBLIC_TOLGEE_PROJECT_ID` | 前端 Tolgee SDK 使用的项目 ID |
| `TOLGEE_API_URL` | Tolgee CLI / 同步脚本使用的服务端 API 地址 |
| `TOLGEE_API_KEY` | Tolgee CLI / 同步脚本使用的服务端 API Key，不能暴露到前端 |
| `TOLGEE_PROJECT_ID` | Tolgee 项目 ID |
| `MTRAN_API_URL` | 本地翻译补全脚本使用的翻译接口地址 |
| `MTRAN_API_KEY` | 本地翻译补全脚本使用的翻译接口密钥，不能提交到仓库 |

常用命令：

```bash
pnpm translate:fill-en-defaults
pnpm translate:fill-en
node scripts/translate-locales-from-en.mjs
node scripts/sync-tolgee-direct.mjs
```

如果 Tolgee 项目触发 `plan_translation_limit_exceeded`，说明远端翻译记录数已经达到当前套餐上限。此时本地语言包仍然完整可用，但 Tolgee Cloud 不能再新增缺失语言记录；可以先用下面的方式只覆盖远端已存在的翻译记录：

```bash
TOLGEE_SYNC_EXISTING_TRANSLATIONS_ONLY=true node scripts/sync-tolgee-direct.mjs
```

释放额度或升级 Tolgee 套餐后，再正常运行 `node scripts/sync-tolgee-direct.mjs` 即可把新增 key 和缺失语言一起推上去。
