# 🔥 HuoYu | 无尽火域

一个可部署到 Vercel 的多语言个人主页：前台聚合 GitHub、Steam、WeGame、网易云音乐、RSS、WakaTime 与 Codex 使用数据，后台统一维护个人资料、项目、主题视频和页脚。

![HuoYu](https://socialify.git.ci/Flames1217/HuoYu/image?description=1&forks=1&language=1&name=1&owner=1&pattern=Plus&pulls=1&stargazers=1&theme=Light)

[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge)](https://github.com/Flames1217/HuoYu/actions)
[![Vercel](https://img.shields.io/badge/Vercel-deployed-000000?style=for-the-badge&logo=vercel)](https://viper3.top)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](./LICENSE)

## 功能

- 多语言前台与后台：`cn`、`en`、`es`、`fr`、`ja`。
- 后台配置个人资料、社交链接、技能、项目、主题视频和页脚。
- GitHub 项目与贡献、Steam、WeGame、网易云音乐、RSS、WakaTime 数据聚合。
- WakaTime 编程统计与 Codex Token、项目、模型、会话、API 等价成本合并展示。
- 日间/夜间自动主题、手动覆盖、背景视频、异火卡片装饰和统一外链确认弹窗。
- Upstash Redis 保存配置、同步缓存和 Codex 聚合数据。

## 服务组成

| 服务             | 必需 | 用途                                          |
| ---------------- | ---- | --------------------------------------------- |
| Vercel           | 是   | 部署 Next.js 主站和 API                       |
| Upstash Redis    | 是   | 保存后台配置、项目数据与 AI 会话摘要          |
| GitHub Actions   | 推荐 | 每 8 小时同步一次 GitHub 项目元数据           |
| Tolgee           | 可选 | 管理和同步多语言词条                          |
| MTranServer      | 可选 | 批量补全本地语言包，主站运行不依赖它          |
| WakaTime         | 可选 | 编程时长、项目、语言、编辑器和代码变更统计    |
| Codex 本机同步器 | 可选 | 空闲时增量上传 Token 数值摘要，不上传提示正文 |

最小部署只需要 Vercel 和 Upstash。`lib/locales/` 已包含本地语言包，Tolgee 或 MTranServer 不在线时不影响页面访问。

## 部署顺序

### 1. 准备项目

```bash
git clone https://github.com/Flames1217/HuoYu.git
cd HuoYu
pnpm install
cp .env.example .env.local
```

需要 Node.js 20+ 和 pnpm。

### 2. 创建 Upstash Redis

在 Upstash 控制台创建 Redis，或从 Vercel Marketplace 添加 Upstash 集成。

手动创建时配置：

```env
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
```

Vercel Marketplace 通常自动注入：

```env
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
```

两组变量任选一组。默认 Redis key：

```env
SETTINGS_REDIS_KEY=huoyu:settings
AI_SESSIONS_REDIS_KEY=huoyu:ai:sessions
```

### 3. 配置主站环境变量

本地 `.env.local` 和 Vercel Project Settings → Environment Variables 至少配置：

```env
PASSWORD=your_admin_password
NEXTAUTH_SECRET=your_random_nextauth_secret
CRON_SECRET=your_random_cron_secret
GITHUB_TOKEN=your_github_token
```

- `PASSWORD`：后台登录密码。
- `NEXTAUTH_SECRET`：NextAuth 会话密钥。
- `CRON_SECRET`：保护 GitHub 自动同步接口。
- `GITHUB_TOKEN`：读取 GitHub 仓库和贡献数据，推荐使用只读 fine-grained token。

第三方数据源按需配置：

```env
STEAM_API_KEY=
STEAM_USER_ID=
NETEASE_USER_ID=
NETEASE_MUSIC_U=
NETEASE_API_BASE_URL=https://api-cloudmusic.viper3.top
WAKATIME_API_KEY=
WEGAME_TGP_ID=
WEGAME_COOKIE=
NEXT_PUBLIC_FEED_URL=
```

### 4. 配置翻译服务（可选）

站点运行直接读取 `lib/locales/`，不配置翻译服务也能完整显示多语言。

需要 Tolgee 管理词条时配置服务端变量：

```env
TOLGEE_API_URL=https://tolgee.example.com
TOLGEE_API_KEY=your_tolgee_server_api_key
TOLGEE_PROJECT_ID=1
TOLGEE_SKIP_NEW_KEYS=false
TOLGEE_SYNC_CONCURRENCY=1
```

需要前端 Tolgee 调试时再添加项目级 Client Key：

```env
NEXT_PUBLIC_TOLGEE_API_URL=https://tolgee.example.com
NEXT_PUBLIC_TOLGEE_API_KEY=your_tolgee_project_client_key
NEXT_PUBLIC_TOLGEE_PROJECT_ID=1
```

不要把 PAT 或服务端密钥放进 `NEXT_PUBLIC_*`。

MTranServer 仅用于本地翻译脚本：

```env
MTRAN_API_URL=https://tran.example.com
MTRAN_API_KEY=your_translation_api_key
```

MTranServer 推荐部署到 VPS、NAS 或 Docker 主机，不建议放在 Vercel Serverless。

### 5. 部署到 Vercel

把仓库导入 Vercel，复制 `.env.local` 中需要的生产环境变量后部署。

- 前台：`https://your-domain/cn`
- 后台：`https://your-domain/cn/admin`
- 其他语言：将 `cn` 换成 `en`、`es`、`fr` 或 `ja`

首次登录后台后依次配置个人资料、项目管理和页脚管理。

### 6. 配置 Codex AI 统计（可选）

同步接口默认复用已经配置的 `CRON_SECRET`，不需要新增环境变量。需要把权限拆开时，再给 Vercel 添加独立密钥：

```env
AI_SYNC_SECRET=your_random_ai_sync_secret
```

Windows 本机安装隐藏同步任务。未配置 `AI_SYNC_SECRET` 时，`Secret` 填 Vercel 中现有的 `CRON_SECRET`：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-codex-ai-sync.ps1 `
  -Endpoint "https://your-domain/api/ai-sync" `
  -Secret "your_random_ai_sync_secret"
```

任务每小时尝试一次，只在电脑空闲时运行，通过 `wscript.exe` 隐藏启动。同步器按文件修改时间增量解析，只上传以下摘要：

- 会话 ID、日期、项目目录名、模型和客户端名称。
- 输入、缓存输入、输出、推理 Token 和提示次数。
- 不上传提示正文、回复正文、文件内容或工具输出。

统计结果按会话 ID 覆盖写入 Upstash，移动或归档会话不会重复计数。

Codex 订阅与 API 计费并不等价。需要显示“API 等价成本”时，按实际模型价格配置每百万 Token 单价；不配置时页面显示 `—`：

```env
AI_INPUT_USD_PER_MILLION=
AI_CACHED_INPUT_USD_PER_MILLION=
AI_OUTPUT_USD_PER_MILLION=
```

### 7. 配置 GitHub 自动同步（推荐）

仓库内置 `.github/workflows/sync-github-repos.yml`，每 8 小时请求：

```text
GET /api/cron/github-repos
Authorization: Bearer your_random_cron_secret
```

在 GitHub 仓库 Settings → Secrets and variables → Actions 添加：

| Secret        | 示例                            |
| ------------- | ------------------------------- |
| `SITE_URL`    | `https://your-domain`           |
| `CRON_SECRET` | 与 Vercel 的 `CRON_SECRET` 一致 |

## 翻译维护

本地语言包：

```text
lib/locales/cn.json
lib/locales/en.json
lib/locales/es.json
lib/locales/fr.json
lib/locales/ja.json
```

常用命令：

```bash
pnpm translate:fill-en-defaults
pnpm translate:fill-en
node scripts/translate-locales-from-en.mjs
node scripts/sync-tolgee-direct.mjs
```

首次允许 Tolgee 创建新 key：

```bash
TOLGEE_SKIP_NEW_KEYS=false node scripts/sync-tolgee-direct.mjs
```

只更新已有翻译：

```bash
TOLGEE_SYNC_EXISTING_TRANSLATIONS_ONLY=true node scripts/sync-tolgee-direct.mjs
```

## 本地开发与检查

```bash
pnpm dev
node --test tests/*.test.mjs
pnpm build
```

## 目录

```text
app/          页面与 API
components/   前台和后台组件
lib/          Redis、数据处理、本地语言包
public/       静态资源与异火视频
scripts/      翻译、同步和维护脚本
tests/        Node.js 回归检查
```

## 致谢

### 核心框架

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)

### 界面与交互

[![Radix UI](https://img.shields.io/badge/Radix%20UI-161618?style=for-the-badge&logo=radixui&logoColor=white)](https://www.radix-ui.com/)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![React Icons](https://img.shields.io/badge/React%20Icons-E91E63?style=for-the-badge&logo=react&logoColor=white)](https://react-icons.github.io/react-icons/)
[![Recharts](https://img.shields.io/badge/Recharts-22B5BF?style=for-the-badge&logo=chartdotjs&logoColor=white)](https://recharts.org/)
[![dnd kit](https://img.shields.io/badge/dnd%20kit-635BFF?style=for-the-badge)](https://dndkit.com/)
[![React Hook Form](https://img.shields.io/badge/React%20Hook%20Form-EC5990?style=for-the-badge&logo=reacthookform&logoColor=white)](https://react-hook-form.com/)
[![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)
[![Sonner](https://img.shields.io/badge/Sonner-111111?style=for-the-badge)](https://sonner.emilkowal.ski/)
[![tsParticles](https://img.shields.io/badge/tsParticles-0B7285?style=for-the-badge)](https://particles.js.org/)
[![Embla Carousel](https://img.shields.io/badge/Embla%20Carousel-7C3AED?style=for-the-badge)](https://www.embla-carousel.com/)

### 数据、认证与部署

[![NextAuth.js](https://img.shields.io/badge/NextAuth.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://next-auth.js.org/)
[![Upstash Redis](https://img.shields.io/badge/Upstash%20Redis-00E9A3?style=for-the-badge&logo=upstash&logoColor=black)](https://upstash.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://docs.github.com/actions)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tolgee](https://img.shields.io/badge/Tolgee-FFCC00?style=for-the-badge)](https://tolgee.io/)
[![MTranServer](https://img.shields.io/badge/MTranServer-2563EB?style=for-the-badge)](https://github.com/xxnuo/MTranServer)

### 内容与统计来源

[![Steam](https://img.shields.io/badge/Steam-000000?style=for-the-badge&logo=steam&logoColor=white)](https://store.steampowered.com/)
[![WakaTime](https://img.shields.io/badge/WakaTime-000000?style=for-the-badge&logo=wakatime&logoColor=white)](https://wakatime.com/)
[![Codex](https://img.shields.io/badge/OpenAI%20Codex-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/codex/)
[![网易云音乐](https://img.shields.io/badge/网易云音乐-D43C33?style=for-the-badge&logo=neteasecloudmusic&logoColor=white)](https://music.163.com/)
[![WeGame](https://img.shields.io/badge/WeGame-FF6A00?style=for-the-badge)](https://www.wegame.com.cn/)
[![react-github-calendar](https://img.shields.io/badge/react--github--calendar-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/grubersjoe/react-github-calendar)
[![rss-parser](https://img.shields.io/badge/rss--parser-F26522?style=for-the-badge&logo=rss&logoColor=white)](https://github.com/rbren/rss-parser)

## 安全提醒

- 不要提交 `.env.local`、Cookie、Token、API Key 或本机 AI 同步配置。
- `NEXT_PUBLIC_*` 会暴露给浏览器，只能放公开项目级配置。
- WeGame 与网易云 Cookie 会过期，数据异常时先检查凭据。
- Codex 成本是按配置单价计算的 API 等价估算，不代表 ChatGPT/Codex 订阅账单。

## License

[MIT](./LICENSE)
