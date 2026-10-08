import { expect, test } from "@playwright/test";
import { confirmDialog, dialog, open, trackErrors } from "./helpers";

test("新建项目（含 AI 推荐）→ 修改状态 → 交付 → 修改记录 → 收款 → 完成", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page, "/projects");
  await page.getByRole("button", { name: "新建项目" }).click();
  const d = dialog(page);

  await d.getByRole("button", { name: "创建项目" }).click();
  await expect(d.getByText("请填写项目名称")).toBeVisible();
  await expect(d.getByText("请选择客户")).toBeVisible();

  await d.getByLabel("服务类型").selectOption({ label: "AI海报（¥200 起）" });
  // 选择服务后自动出现 AI 推荐
  await expect(d.getByTestId("recommend-panel")).toBeVisible();
  await expect(d.getByTestId("recommend-panel").getByText("Midjourney")).toBeVisible();
  await d.getByLabel("项目名称").fill("E2E 奶茶店海报");
  await d.getByRole("combobox", { name: "客户", exact: true }).selectOption({ label: "林小姐（拾光咖啡）" });
  await d.getByLabel("客户预算").fill("500");
  await d.getByLabel("报价", { exact: true }).fill("480");
  await d.getByLabel("开始时间").fill("2026-10-10");
  await d.getByLabel("截止时间").fill("2026-10-01");
  await d.getByRole("button", { name: "创建项目" }).click();
  await expect(d.getByText("截止日期不能早于开始日期")).toBeVisible();
  await d.getByLabel("截止时间").fill("2030-01-01");
  await d.getByRole("button", { name: "创建项目" }).click();
  await expect(dialog(page)).toHaveCount(0);

  await page.getByLabel("搜索项目").fill("奶茶");
  await page.getByRole("link", { name: "E2E 奶茶店海报" }).click();
  await expect(page.getByRole("heading", { name: "E2E 奶茶店海报" })).toBeVisible();

  // 修改状态 → 进行中（自动把报价写入成交价）
  await page.getByTestId("status-select").selectOption({ label: "进行中" });
  await expect(page.getByText("状态已更新为「进行中」")).toBeVisible();
  await expect(page.getByText("最终成交价").locator("..").getByText("¥480")).toBeVisible();

  // 交付物
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await dialog(page).getByLabel("名称").fill("第1版预览");
  await dialog(page).getByLabel("链接地址").fill("not a url");
  await dialog(page).getByRole("button", { name: "保存" }).click();
  await expect(dialog(page).getByText("链接需以 http")).toBeVisible();
  await dialog(page).getByLabel("链接地址").fill("https://drive.google.com/x");
  await dialog(page).getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("第1版预览")).toBeVisible();

  // 修改记录（自动切到修改中）
  await page.getByRole("button", { name: "记录修改" }).click();
  await dialog(page).getByLabel("客户意见").fill("字体再大一点");
  await dialog(page).getByLabel("修改内容").fill("标题放大到 120pt");
  await dialog(page).getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("第 1 版", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("已修改 1 / 3 次")).toBeVisible();
  await expect(page.getByTestId("status-select")).toHaveValue("revising");

  // 收款：定金
  await page.getByRole("button", { name: "记录收款" }).click();
  await dialog(page).getByLabel("金额").fill("240");
  await dialog(page).getByLabel("类型").selectOption({ label: "定金" });
  await dialog(page).getByLabel("付款渠道").selectOption({ label: "支付宝" });
  await dialog(page).getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("已付定金")).toBeVisible();

  // 完成：有未收款时二次确认
  await page.getByRole("button", { name: "标记完成" }).click();
  await expect(page.getByRole("dialog").getByText("还有 ¥240 未收")).toBeVisible();
  await confirmDialog(page, "仍然完成");
  await expect(page.getByTestId("status-select")).toHaveValue("completed");

  // 收尾款
  await page.getByRole("button", { name: "记录收款" }).click();
  await expect(dialog(page).getByLabel("金额")).toHaveValue("240");
  await dialog(page).getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("已付款", { exact: true })).toBeVisible();

  // 刷新后一切仍在
  await page.reload();
  await expect(page.getByText("第1版预览")).toBeVisible();
  await expect(page.getByTestId("status-select")).toHaveValue("completed");
  await expect(page.getByText("已付款", { exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});

test("数量影响 AI 推荐，并带入报价", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page, "/projects");
  await page.getByRole("button", { name: "新建项目" }).click();
  const d = dialog(page);
  await d.getByLabel("服务类型").selectOption({ label: "小红书封面（¥40 起）" });
  const panel = d.getByTestId("recommend-panel");
  await expect(panel.getByText("¥40", { exact: true })).toBeVisible();
  await d.getByLabel("数量").fill("0");
  await d.getByLabel("项目名称").fill("E2E 封面 15 张");
  await d.getByRole("combobox", { name: "客户", exact: true }).selectOption({ label: "Echo" });
  await d.getByRole("button", { name: "创建项目" }).click();
  await expect(d.getByText("请输入正整数")).toBeVisible();
  await d.getByLabel("数量").fill("15");
  // 15 × ¥40 = ¥600，15 × 0.5h = 7.5h
  await expect(panel.getByText("¥600", { exact: true })).toBeVisible();
  await expect(panel.getByText("7.5 小时")).toBeVisible();
  await d.getByRole("button", { name: "创建项目" }).click();
  await page.getByLabel("搜索项目").fill("封面 15");
  await page.getByRole("link", { name: "E2E 封面 15 张" }).click();
  await expect(page.getByText("数量").locator("..").getByText("15")).toBeVisible();
  await page.getByRole("link", { name: "生成报价" }).first().click();
  await expect(page.getByLabel("第1项数量")).toHaveValue("15");
  await expect(page.getByTestId("quote-total")).toHaveText("¥600");
  expect(errors).toEqual([]);
});

test("看板视图可以移动项目状态", async ({ page }) => {
  await open(page, "/projects");
  await page.getByRole("tab", { name: "看板" }).click();
  await expect(page.getByTestId("kanban")).toBeVisible();
  await page.getByLabel("移动「双十一海报套装」").selectOption({ label: "待客户审核" });
  await expect(page.locator('[data-status="client_review"]').getByText("双十一海报套装")).toBeVisible();
  // 视图偏好被记住
  await page.reload();
  await expect(page.getByTestId("kanban")).toBeVisible();
});

test("删除项目需要确认", async ({ page }) => {
  await open(page, "/projects/prj_comfy");
  await page.getByRole("button", { name: "删除项目" }).click();
  await confirmDialog(page, "删除");
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByText("ComfyUI 本地部署")).toHaveCount(0);
});
