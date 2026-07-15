import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("快照忽略临时 ID 且恢复原值后相等", async () => {
  const { profileFormSnapshot } = await import("../lib/profile-form-snapshot.mjs");
  const original = { nickname: "三千焱", social_links: [{ id: "first", name: "GitHub", url: "https://github.com", icon: "github" }] };
  const restored = { ...original, social_links: [{ ...original.social_links[0], id: "second" }] };

  assert.equal(profileFormSnapshot(original), profileFormSnapshot(restored));
  assert.notEqual(profileFormSnapshot(original), profileFormSnapshot({ ...restored, nickname: "三千焱炎" }));
  assert.equal(profileFormSnapshot(original), profileFormSnapshot({ ...original, wakatime_api_key: "只读环境变量" }));
});

test("个人资料使用真实快照判断是否有未保存更改", async () => {
  const source = await readFile(new URL("../app/admin/profile/page.tsx", import.meta.url), "utf8");

  assert.match(source, /profileFormSnapshot/);
  assert.match(source, /savedSnapshot/);
  assert.match(source, /const hasUnsavedChanges\s*=/);
});

test("个人资料离开前提供保存或放弃选择", async () => {
  const source = await readFile(new URL("../app/admin/profile/page.tsx", import.meta.url), "utf8");

  assert.match(source, /beforeunload/);
  assert.match(source, /pendingNavigation/);
  assert.match(source, /保存并前往/);
  assert.match(source, /放弃更改/);
});

test("个人资料保存操作条始终粘在内容区顶部", async () => {
  const source = await readFile(new URL("../app/admin/profile/page.tsx", import.meta.url), "utf8");

  assert.match(source, /admin-profile-actions/);
  assert.doesNotMatch(source, /<div className="mt-8">\s*<Button type="submit"/);
});

test("统一外链弹窗同时覆盖前台和后台", async () => {
  const source = await readFile(new URL("../components/root-client-shell.tsx", import.meta.url), "utf8");

  assert.match(source, /<ExternalLinkDialog\s*\/>/);
  assert.doesNotMatch(source, /!isAdminPage\s*&&\s*<ExternalLinkDialog/);
});
