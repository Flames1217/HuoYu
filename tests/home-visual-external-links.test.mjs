import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("后台可保存日间和夜间背景视频地址", async () => {
  const admin = await readFile(new URL("../app/admin/profile/page.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/admin/profile/route.ts", import.meta.url), "utf8");

  assert.match(admin, /day_background_video_url/);
  assert.match(admin, /night_background_video_url/);
  assert.match(route, /day_background_video_url/);
  assert.match(route, /night_background_video_url/);
});

test("首页使用主题视频并移除旧叶子和异火雨", async () => {
  const home = await readFile(new URL("../components/home-page.tsx", import.meta.url), "utf8");

  assert.match(home, /ThemeBackgroundVideo/);
  assert.doesNotMatch(home, /zero-leaf-layer/);
  assert.doesNotMatch(home, /zero-flame-meteor-layer/);
  assert.match(home, /三千焱/);
});

test("七种异火只装饰七个主要卡片", async () => {
  const home = await readFile(new URL("../components/home-page.tsx", import.meta.url), "utf8");

  for (const flame of ["九玄金雷", "青莲地心火", "陨落心炎", "骨灵冷火", "三千焱炎火", "海心焰", "净莲妖火"]) {
    assert.match(home, new RegExp(`flame="${flame}"`));
  }
});

test("异火缩小并被卡片圆角裁剪", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /\.card-flame-host\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.card-flame-video\s*\{[^}]*top:\s*0\.5rem[^}]*width:\s*clamp\(4\.5rem,\s*7vw,\s*6\.5rem\)/s);
});

test("昵称使用完整覆盖中文的现有手写字体", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /\.hero-nickname-badge\s*\{[^}]*font-family:\s*"YeZiChuanQiuShaXingKai"/s);
});

test("主题切换使用明显的缩放与柔焦转场", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /::view-transition-old\(root\)[^}]*animation:\s*huoyu-theme-out\s+520ms/s);
  assert.match(css, /@keyframes huoyu-theme-in\s*\{[^}]*filter:\s*blur\(8px\)[^}]*transform:\s*scale\(1\.015\)/s);
});

test("公共页面统一拦截外链且保留确认跳转出口", async () => {
  const shell = await readFile(new URL("../components/root-client-shell.tsx", import.meta.url), "utf8");
  const dialog = await readFile(new URL("../components/external-link-dialog.tsx", import.meta.url), "utf8");

  assert.match(shell, /<ExternalLinkDialog\s*\/>/);
  assert.match(dialog, /closest\("a\[href\]"\)/);
  assert.match(dialog, /data-external-link-skip/);
  assert.match(dialog, /target="_blank"/);
});
