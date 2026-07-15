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

test("页面控制组挂载到 body 并固定在右下角", async () => {
  const source = await readFile(new URL("../components/page-header-controls.tsx", import.meta.url), "utf8");

  assert.match(source, /createPortal/);
  assert.match(source, /page-floating-controls/);
  assert.match(source, /document\.body/);
});
