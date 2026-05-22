![HuoYu](https://socialify.git.ci/Flames1217/HuoYu/image?description=1&forks=1&language=1&name=1&owner=1&pattern=Plus&pulls=1&stargazers=1&theme=Light)

# HuoYu | 火域

HuoYu 是一个个人主页和数据展示站点。前台集中展示个人资料、社交入口、技能、游戏、音乐、阅读、项目、GitHub、WakaTime 等数据；后台用于维护站点资料、项目展示和页脚信息。

当前访问方式使用 locale 前缀：

- 前台首页：`/cn`、`/en`、`/es`、`/fr`、`/ja`
- 后台首页：`/cn/admin`、`/en/admin`、`/es/admin`、`/fr/admin`、`/ja/admin`

## 功能

- 个人主页：头像、昵称、标语、社交链接、技能图标和主页视觉动效。
- 内容卡片：阅读清单、Steam、WeGame、网易云音乐、GitHub 贡献、WakaTime 编程时长、MBTI 与项目展示。
- 项目展示：同步 GitHub 公开仓库，展示语言、标签、Star/Fork、最近更新时间、源码和预览入口。
- 后台管理：通过 `PASSWORD` 登录，维护站点标题、favicon、个人资料、项目和页脚配置。
- 数据缓存：第三方 API 数据统一使用缓存策略，减少刷新时的接口压力。
- 国际化：内置 `cn/en/es/fr/ja` 本地语言包，并接入 Tolgee 作为翻译管理后台；前后台语言切换会同步 locale 路由和 Tolgee 状态。

## 技术栈

- Next.js App Router
- React
- Tailwind CSS
- NextAuth
- Upstash Redis
- Tolgee
- MTranServer

## 从零开始部署

### 1. 准备运行环境

本地开发建议准备：

- Node.js 20 或更高版本
- pnpm
- Git
- 一个 Upstash Redis 实例，或 Vercel Marketplace 里的 Upstash KV/Redis

安装依赖：

```bash
git clone git@github.com:Flames1217/HuoYu.git
cd HuoYu
pnpm install
```

复制环境变量示例：

```bash
cp .env.example .env.local
```

Windows PowerShell 可以用：

```powershell
Copy-Item .env.example .env.local
```

### 2. 配置最小必填环境变量

最小可运行配置只需要后台登录、会话密钥和 Redis。

```env
PASSWORD=your_admin_password
NEXTAUTH_SECRET=your_random_nextauth_secret
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
```

如果使用 Vercel Marketplace 自动连接 Upstash，通常会拿到下面这组变量，也可以替代上面的 Upstash 变量：

```env
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
```

`NEXTAUTH_SECRET` 可以用下面的方式生成：

```bash
openssl rand -base64 32
```

没有 `openssl` 时，也可以用任意足够长的随机字符串。

### 3. 本地启动

```bash
pnpm dev
```

打开：

- 前台：`http://localhost:3000/cn`
- 后台：`http://localhost:3000/cn/admin`

后台登录密码就是 `.env.local` 里的 `PASSWORD`。

### 4. 后台配置站点内容

登录后台后建议按这个顺序配置：

1. 个人资料：昵称、头像、主页标题、技能图标、社交链接。
2. 项目管理：配置 GitHub Token 后同步仓库，勾选要展示的项目。
3. 页脚管理：配置备案、自定义文本和链接组。

这些可在线编辑的站点配置会保存到 Redis，默认 key 是：

```env
SETTINGS_REDIS_KEY=huoyu:settings
```

如果同一个 Redis 里跑多个站点，记得把 `SETTINGS_REDIS_KEY` 改成不同值。

### 5. 自动同步 GitHub 项目

项目展示会自动同步 GitHub 仓库元数据。同步内容包括仓库名、简介、语言、topics、Star/Fork、GitHub 地址和最近更新时间。

同步逻辑使用 GitHub 仓库 ID 作为稳定身份，不再只依赖 `owner/name`。所以仓库从 `claude-switcher` 改名为 `ClaudeHub` 后，后台原来勾选的“前台展示”、排序值和演示地址会保留，前台显示的库名与简介会跟随 GitHub 最新数据刷新。

项目里已经提供内部同步接口：

```text
GET /api/cron/github-repos
Authorization: Bearer your_random_cron_secret
```

部署时请配置：

```env
CRON_SECRET=your_random_cron_secret
```

仓库内置 GitHub Actions 定时任务：`.github/workflows/sync-github-repos.yml`。它会每 8 小时请求一次 `/api/cron/github-repos`，也就是每天 3 次。你需要在 GitHub 仓库 Settings -> Secrets and variables -> Actions 里配置：

| Secret | 说明 |
| --- | --- |
| `SITE_URL` | 站点正式访问地址，例如 `https://huoyu.example.com` |
| `CRON_SECRET` | 和部署平台环境变量里的 `CRON_SECRET` 保持一致 |

如果你使用 Vercel Pro，也可以改用 Vercel Cron；但 Vercel Hobby 免费版 Cron 通常只支持每天一次，所以默认使用 GitHub Actions 来满足 8 小时同步一次的需求。

## 环境变量

真实密钥只放在 `.env.local` 或部署平台环境变量中，不要提交到仓库。

### 必填

| 变量 | 说明 |
| --- | --- |
| `PASSWORD` | 管理后台登录密码 |
| `NEXTAUTH_SECRET` | NextAuth 会话签名密钥 |
| `CRON_SECRET` | GitHub 项目自动同步接口使用的 Bearer Token |
| `UPSTASH_REDIS_REST_URL` | Upstash REST URL，和 `KV_REST_API_URL` 二选一 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST Token，和 `KV_REST_API_TOKEN` 二选一 |
| `KV_REST_API_URL` | Vercel Marketplace Upstash REST URL，和 `UPSTASH_REDIS_REST_URL` 二选一 |
| `KV_REST_API_TOKEN` | Vercel Marketplace Upstash REST Token，和 `UPSTASH_REDIS_REST_TOKEN` 二选一 |

### 站点配置

| 变量 | 说明 |
| --- | --- |
| `SETTINGS_REDIS_KEY` | 站点配置 Redis key，默认 `huoyu:settings` |
| `NEXT_PUBLIC_FEED_URL` | RSS 区块使用的公开 feed 地址 |

### 第三方数据源

这些变量都是按需填写。没配置时，对应卡片会尽量使用缓存、显示等待配置，或隐藏不可用数据。

| 变量 | 说明 |
| --- | --- |
| `GITHUB_TOKEN` | GitHub API Token，用于同步仓库和拉取贡献数据 |
| `STEAM_API_KEY` | Steam Web API Key |
| `STEAM_USER_ID` | Steam 64 位用户 ID，也可以在后台资料里维护 |
| `NETEASE_USER_ID` | 网易云音乐用户 ID，也可以在后台资料里维护 |
| `NETEASE_MUSIC_U` | 网易云音乐登录 Cookie 中的 `MUSIC_U` |
| `WAKATIME_API_KEY` | WakaTime API Key |
| `WEGAME_TGP_ID` | WeGame Cookie 中的 `tgp_id` |
| `WEGAME_COOKIE` | WeGame 完整 Cookie |

### Tolgee 前端变量

这些变量给前端 Tolgee SDK 使用。

| 变量 | 说明 |
| --- | --- |
| `NEXT_PUBLIC_TOLGEE_API_URL` | Tolgee API 地址，默认 `https://app.tolgee.io` |
| `NEXT_PUBLIC_TOLGEE_API_KEY` | Tolgee 前端 API Key |
| `NEXT_PUBLIC_TOLGEE_PROJECT_ID` | Tolgee 项目 ID |

当前页面运行时会优先读取 `lib/locales/` 里的本地语言包，再回退到 Tolgee。因此即使没有填写 Tolgee 前端变量，站点也能正常切换语言。

### Tolgee 同步脚本变量

这些变量只给本地脚本或 CI 使用，不要暴露给前端。

| 变量 | 说明 |
| --- | --- |
| `TOLGEE_API_URL` | Tolgee CLI / 同步脚本使用的 API 地址 |
| `TOLGEE_API_KEY` | Tolgee CLI / 同步脚本使用的服务端 API Key |
| `TOLGEE_PROJECT_ID` | Tolgee 项目 ID |
| `TOLGEE_SYNC_EXISTING_TRANSLATIONS_ONLY` | 设为 `true` 时，只覆盖 Tolgee 里已存在的翻译记录，不新增记录 |

### MTranServer 翻译接口变量

项目使用开源的 MTranServer 作为本地翻译补全接口。它只在维护语言包时需要，正常访问站点不需要启动 MTranServer。

| 变量 | 说明 |
| --- | --- |
| `MTRAN_API_URL` | MTranServer 地址，例如 `http://127.0.0.1:8989` 或自己的公网反代地址 |
| `MTRAN_API_KEY` | MTranServer 的 API Token，对应服务端 `MT_API_TOKEN` |
| `MTRAN_BATCH_SIZE` | 批量翻译大小，默认脚本内使用 `50` |
| `TARGET_LOCALES` | 只补指定语言，例如 `es,fr,ja`；不填时补全部目标语言 |

## 部署 MTranServer

MTranServer 是一个低资源、可私有部署的离线翻译服务器。推荐用 Docker Compose 部署。

新建一个目录，例如 `mtranserver/`，写入 `compose.yml`：

```yaml
services:
  mtranserver:
    image: xxnuo/mtranserver:latest
    container_name: mtranserver
    restart: unless-stopped
    ports:
      - "8989:8989"
    environment:
      - MT_HOST=0.0.0.0
      - MT_PORT=8989
      - MT_ENABLE_UI=true
      - MT_OFFLINE=false
      - MT_API_TOKEN=your_translation_api_key
    volumes:
      - ./models:/app/models
```

启动：

```bash
docker compose up -d
```

然后在 HuoYu 的 `.env.local` 中配置：

```env
MTRAN_API_URL=http://127.0.0.1:8989
MTRAN_API_KEY=your_translation_api_key
```

HuoYu 的翻译脚本会调用：

```text
POST /translate/batch
Header: Authorization: your_translation_api_key
Body: { "from": "en", "to": "ja", "texts": ["..."], "html": false }
```

如果你给 MTranServer 配了 Nginx、Cloudflare Tunnel 或其他反向代理，需要确认：

- `/translate/batch` 路径没有被改写。
- `Authorization` 请求头会透传到 MTranServer。
- 请求体大小足够容纳批量文本。

首次翻译某个语言对时，MTranServer 可能需要下载模型。建议先在 MTranServer 自带 UI 或 API 文档里测试一次 `en -> es/fr/ja`，让模型预热完成，再运行 HuoYu 的翻译脚本。

如果把 MTranServer 暴露到公网，请务必配置 `MT_API_TOKEN`，并建议再加一层反向代理、HTTPS 和访问控制。

## 翻译维护流程

本项目语言包位于：

```text
lib/locales/cn.json
lib/locales/en.json
lib/locales/es.json
lib/locales/fr.json
lib/locales/ja.json
```

推荐维护流程：

```bash
pnpm translate:fill-en-defaults
pnpm translate:fill-en
node scripts/translate-locales-from-en.mjs
node scripts/sync-tolgee-direct.mjs
```

各命令用途：

- `pnpm translate:fill-en-defaults`：从代码里的英文 fallback 填补 `en.json`。
- `pnpm translate:fill-en`：使用 MTranServer 把中文补成英文。
- `node scripts/translate-locales-from-en.mjs`：从英文翻译并补齐 `es/fr/ja`。
- `node scripts/sync-tolgee-direct.mjs`：把本地语言包同步到 Tolgee。

如果 Tolgee 返回：

```text
plan_translation_limit_exceeded
```

说明远端翻译记录数已经达到当前套餐上限。此时本地语言包仍然完整可用，但 Tolgee Cloud 不能新增缺失语言记录。可以先只覆盖远端已存在的翻译：

```bash
TOLGEE_SYNC_EXISTING_TRANSLATIONS_ONLY=true node scripts/sync-tolgee-direct.mjs
```

Windows PowerShell 使用：

```powershell
$env:TOLGEE_SYNC_EXISTING_TRANSLATIONS_ONLY='true'; node scripts\sync-tolgee-direct.mjs
```

释放额度或升级 Tolgee 套餐后，再正常运行：

```bash
node scripts/sync-tolgee-direct.mjs
```

## 常用命令

```bash
pnpm dev
pnpm build
pnpm start
pnpm tolgee:extract
pnpm tolgee:sync
pnpm tolgee:pull
pnpm tolgee:push
```

## Vercel 部署

推荐部署到 Vercel。

部署步骤：

1. Fork 或导入本仓库到 Vercel。
2. 在 Vercel 项目里连接 Upstash Redis，或手动填写 Upstash REST 变量。
3. 配置 `PASSWORD`、`NEXTAUTH_SECRET` 和 `CRON_SECRET`。
4. 配置 `GITHUB_TOKEN`，用于同步项目仓库、仓库改名后的稳定识别和 GitHub 贡献数据。
5. 在 GitHub Actions Secrets 中配置 `SITE_URL` 和 `CRON_SECRET`，让 `.github/workflows/sync-github-repos.yml` 能每 8 小时触发一次线上同步。
6. 按需配置 Steam、网易云音乐、WakaTime、WeGame 等第三方服务密钥。
7. 按需配置 Tolgee 前端变量。
8. 部署完成后访问 `/cn/admin` 登录后台维护内容。

MTranServer 不建议直接跑在 Vercel Serverless 里。它更适合单独部署在 VPS、NAS、Docker 主机或内网服务器上，然后只在维护翻译时由本地脚本调用。

## README 维护清单

后续改功能时，如果碰到下面任一类变化，要同时更新 README 和 `.env.example`：

- 新增、删除或改名环境变量，例如 `CRON_SECRET`、`GITHUB_TOKEN`、Tolgee、MTranServer、Steam、WakaTime、WeGame、网易云音乐相关变量。
- 新增外部服务或第三方平台配置，例如 Upstash Redis、Tolgee、MTranServer、GitHub Actions、Vercel、反向代理。
- 新增定时任务、Webhook、后台任务或受保护接口，例如 `/api/cron/github-repos` 和 GitHub Actions Secrets。
- 新增或修改维护脚本、CLI 命令、翻译流程和 Tolgee 同步策略。
- 改动部署方式、平台限制、免费额度限制或必须手动配置的后台步骤。
- 改动用户可见的核心能力，例如项目展示字段、仓库同步规则、语言切换行为、后台资料来源和数据缓存策略。
- 改动 Redis 数据结构、站点配置 key、后台在线配置项或敏感凭据读取方式。

README 不需要记录每个 UI 细节，但凡用户从 0 部署、排障、迁移或维护时会需要知道的信息，都要及时补进去。

## 目录说明

```text
app/              Next.js App Router 页面与接口
components/       前台与后台组件
lib/              数据处理、配置存储、Tolgee 和本地语言包
public/           静态资源与预览图片
scripts/          翻译补全与 Tolgee 同步脚本
```

## 注意事项

- `.env.local`、Cookie、Token 和 API Key 不要提交到仓库。
- `NEXT_PUBLIC_*` 变量会暴露到浏览器，不能放服务端密钥。
- WeGame 和网易云音乐 Cookie 可能会过期，数据异常时先检查 Cookie。
- Steam、WakaTime、GitHub 等接口有频率限制，生产环境建议保留缓存策略。
- Tolgee 套餐额度会影响远端译文补全，但不会影响本地语言包渲染。

## 参考链接

- [MTranServer GitHub](https://github.com/xxnuo/MTranServer)
- [MTranServer Docker 镜像](https://hub.docker.com/r/xxnuo/mtranserver)
- [MTranServer `/translate/batch` API 文档](https://cyo9cw1y5t.apifox.cn/334002037e0)
- [Tolgee](https://tolgee.io/)
- [Upstash Redis](https://upstash.com/)
