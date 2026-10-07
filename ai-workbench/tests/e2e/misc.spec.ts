import { expect, test } from "@playwright/test";
import { confirmDialog, dialog, open, trackErrors } from "./helpers";

const PAGES = ["/", "/tasks", "/clients", "/clients/cli_echo", "/projects", "/projects/prj_bnb-site", "/quotes", "/quotes/new", "/quotes/quo_kb", "/quotes/quo_kb/edit", "/payments", "/services", "/tools", "/recommend", "/analytics", "/settings"];

test("所有页面加载无控制台错误", async ({ page }) => {
  const errors = trackErrors(page);
  for (const p of PAGES) {
    await open(page, p);
    await expect(page.locator("h1").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("添加 AI 工具并按条件筛选", async ({ page }) => {
  await open(page, "/tools");
  await expect(page.getByText("收录 20 个工具")).toBeVisible();
  await page.getByRole("button", { name: "添加工具" }).click();
  await dialog(page).getByLabel("工具名称").fill("Claude");
  await dialog(page).getByRole("button", { name: "保存" }).click();
  await expect(dialog(page).getByText("工具库中已有同名工具")).toBeVisible();
  await dialog(page).getByLabel("工具名称").fill("Sora");
  await dialog(page).getByLabel("类别").fill("AI 视频");
  await dialog(page).getByLabel("网址").fill("https://sora.com");
  await dialog(page).getByLabel("用途").fill("文生视频");
  await dialog(page).getByRole("button", { name: "视频" }).click();
  await dialog(page).getByText("开源").click();
  await dialog(page).getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("收录 21 个工具")).toBeVisible();
  await page.getByLabel("搜索工具").fill("sora");
  await expect(page.getByRole("heading", { name: "Sora" })).toBeVisible();
  await page.reload();
  await open(page, "/tools");
  await page.getByLabel("开源/本地").selectOption("oss");
  await expect(page.getByRole("heading", { name: "Sora" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Midjourney" })).toHaveCount(0);
});

test("服务库新增与编辑", async ({ page }) => {
  await open(page, "/services");
  await page.getByRole("button", { name: "新增服务" }).click();
  await dialog(page).getByLabel("服务名称").fill("AI 头像定制");
  await dialog(page).getByLabel("基础价格 ¥").fill("99");
  await dialog(page).getByLabel("预计工时（小时）").fill("1");
  await dialog(page).getByRole("button", { name: "Midjourney" }).click();
  await dialog(page).getByRole("button", { name: "保存" }).click();
  await expect(page.getByRole("heading", { name: "AI 头像定制" })).toBeVisible();
  await page.getByRole("button", { name: "编辑 AI 头像定制" }).click();
  await dialog(page).getByLabel("基础价格 ¥").fill("129");
  await dialog(page).getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("¥129")).toBeVisible();
});

test("今日任务：自动生成提醒 + 手动待办", async ({ page }) => {
  await open(page, "/tasks");
  await expect(page.getByText("「产品宣传短视频 30s」已逾期")).toBeVisible();
  await expect(page.getByText("催收 张晓 尾款")).toBeVisible();
  await expect(page.getByText("给 赵总 报价")).toBeVisible();
  await page.getByRole("button", { name: "添加" }).click();
  await expect(page.getByText("请输入待办内容")).toBeVisible();
  await page.getByLabel("待办内容").fill("E2E 待办：发朋友圈作品");
  await page.getByRole("button", { name: "添加" }).click();
  const item = page.getByTestId("task-item").filter({ hasText: "E2E 待办" });
  await item.getByRole("button", { name: "标记为完成" }).click();
  await expect(item.getByRole("button", { name: "标记为未完成" })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("task-item").filter({ hasText: "E2E 待办" }).getByRole("button", { name: "标记为未完成" })).toBeVisible();
});

test("AI 项目推荐根据时间给出风险提醒", async ({ page }) => {
  await open(page, "/recommend");
  await page.getByLabel("服务类型").selectOption({ label: "AI网站" });
  await page.getByLabel("截止日期").fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  await expect(page.getByText(/时间不足/)).toBeVisible();
  await page.getByLabel("客户预算 ¥").fill("500");
  await expect(page.getByText(/明显低于建议价/)).toBeVisible();
});

test("深色模式切换并记住", async ({ page }) => {
  await open(page, "/");
  const html = page.locator("html");
  const toggle = page.getByTestId("theme-toggle").first();
  // system(浅色) → light → dark
  await toggle.click();
  await toggle.click();
  await expect(html).toHaveClass(/dark/);
  await page.reload();
  await expect(html).toHaveClass(/dark/);
});

test("导出备份 / 恢复示例数据", async ({ page }) => {
  await open(page, "/settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^ai-workbench-backup-.*\.json$/);

  await page.getByRole("button", { name: "清空" }).click();
  await confirmDialog(page, "清空");
  await open(page, "/clients");
  await expect(page.getByText("还没有客户")).toBeVisible();
  await open(page, "/");
  await expect(page.getByText("这里空空的")).toBeVisible();

  // 导入刚才的备份
  await open(page, "/settings");
  await page.getByTestId("import-input").setInputFiles(await file.path());
  await confirmDialog(page, "覆盖导入");
  await open(page, "/clients");
  await expect(page.getByText("共 10 位客户")).toBeVisible();

  // 导入非法文件给出错误提示
  await open(page, "/settings");
  await page.getByTestId("import-input").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{oops") });
  await expect(page.getByText("文件不是有效的 JSON")).toBeVisible();
});
