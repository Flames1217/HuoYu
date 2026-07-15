import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("自动主题逻辑运行在 ThemeProvider 内", async () => {
  const source = await readFile(new URL("../components/root-client-shell.tsx", import.meta.url), "utf8");

  assert.match(source, /function AutoThemeController\(\)[\s\S]*?useAutoThemeByBeijingTime\(\)/);
  assert.match(source, /<ThemeProvider[^>]*>[\s\S]*?<AutoThemeController\s*\/>/);
});

test("手动主题切换不会触发自动主题逻辑重跑", async () => {
  const source = await readFile(new URL("../hooks/use-auto-theme-by-beijing-time.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /resolvedTheme/);
  assert.doesNotMatch(source, /\[\s*setTheme\s*\]/);
  assert.doesNotMatch(source, /setInterval/);
  assert.match(source, /setTimeout/);
});

test("页面控制组挂载到页面壳层并固定在右下角", async () => {
  const source = await readFile(new URL("../components/page-header-controls.tsx", import.meta.url), "utf8");
  const shell = await readFile(new URL("../components/root-client-shell.tsx", import.meta.url), "utf8");

  assert.match(source, /createPortal/);
  assert.match(source, /page-floating-controls-layer/);
  assert.match(source, /page-floating-controls/);
  assert.match(source, /document\.querySelector\("#page-floating-controls-host"\)/);
  assert.doesNotMatch(source, /document\.body/);
  assert.match(shell, /id="page-floating-controls-host"/);
  assert.doesNotMatch(shell, /id="page-floating-controls-host"[^>]*aria-hidden/);
});

test("页面控制组提供平滑回顶按钮", async () => {
  const source = await readFile(new URL("../components/page-header-controls.tsx", import.meta.url), "utf8");

  assert.match(source, /back-to-top-button/);
  assert.match(source, /window\.scrollTo\(\{\s*top:\s*0,\s*behavior:\s*"smooth"\s*\}\)/);
});

test("主题切换使用单次页面快照转场", async () => {
  const controls = await readFile(new URL("../components/page-header-controls.tsx", import.meta.url), "utf8");
  const shell = await readFile(new URL("../components/root-client-shell.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(controls, /startViewTransition/);
  assert.doesNotMatch(controls, /huoyu:theme-transition-start/);
  assert.doesNotMatch(shell, /ThemeTransitionStage|huoyu:theme-transition-start|theme-page-transition-active/);
  assert.match(css, /::view-transition-old\(root\)/);
  assert.doesNotMatch(css, /theme-page-transition-active\s+\*/);
});

test("页面不使用全局平滑滚动且外层卡片不参与悬停位移", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.doesNotMatch(css, /html\s*\{\s*scroll-behavior:\s*smooth/);
  assert.match(css, /\.theme-page-transition\s*\{[^}]*overflow:\s*clip/);
  assert.match(css, /\.front-landing\s+:is\([^}]*\.zero-panel[^}]*\):hover\s*\{\s*transform:\s*none\s*!important/);
});

test("主卡片保持透明并用外层玻璃模糊隔离背景点阵", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /html\.light[\s\S]*?background-color:\s*rgba\([^)]*,\s*0\.[0-9]+\)\s*!important/);
  assert.match(css, /html\.dark[\s\S]*?background-color:\s*rgba\([^)]*,\s*0\.[0-9]+\)\s*!important/);
  assert.match(css, /\.front-landing\s+:is\([^}]*\.zero-panel[^}]*\)\s*\{[\s\S]*?backdrop-filter:\s*blur\(/);
  assert.match(css, /\.front-landing\.front-landing[^}]*:is\(article, li, a, \[class\*="rounded"\]\)\s*\{\s*backdrop-filter:\s*none\s*!important/);
});
