![HuoYu](https://socialify.git.ci/Flames1217/HuoYu/image?description=1&forks=1&language=1&name=1&owner=1&pattern=Plus&pulls=1&stargazers=1&theme=Light)

# 🔥 HuoYu

HuoYu 是一个个人主页和数据展示站点。前台集中展示个人资料、社交入口、技能、游戏、音乐、阅读、项目、GitHub 与 WakaTime 数据；后台用于维护站点资料、项目展示和页脚信息。

后台入口统一为 `/admin`。

## 功能特性

- 个人主页：头像、昵称、标语、社交链接、技能图标和主页视觉动效。
- 内容卡片：阅读清单、Steam、WeGame、网易云音乐、GitHub 贡献、WakaTime 编程时长、MBTI 与项目展示。
- 项目展示：同步 GitHub 公开仓库，展示语言、标签、Star/Fork、源码和预览入口。
- 数据缓存：第三方 API 数据统一使用缓存策略，减少刷新时的接口压力。
- 主题体验：前台支持日间与夜间模式。
- 管理后台：通过 `PASSWORD` 登录，维护站点标题、favicon、个人资料、项目和页脚配置。
- 国际化：前台和后台都提供语言切换入口。

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

如果使用 Vercel Marketplace 连接 Upstash，通常会自动注入 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`。如果手动创建 Upstash，则通常使用 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`。

## 本地启动

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

启动后访问：

- 前台：`http://localhost:3000`
- 后台：`http://localhost:3000/admin`

本地如果没有配置 Upstash 连接变量，前台会使用默认空配置，后台保存配置会失败。要完整测试后台保存，请在 `.env.local` 中填入真实的 Upstash REST URL 和 Token。

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
