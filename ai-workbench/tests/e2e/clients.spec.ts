import { expect, test } from "@playwright/test";
import { confirmDialog, dialog, open, trackErrors } from "./helpers";

test("新建、编辑、搜索、删除客户，数据刷新后仍在", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page, "/clients");
  await expect(page.getByText("共 10 位客户")).toBeVisible();

  // 新建：先验证表单校验
  await page.getByRole("button", { name: "新增客户" }).first().click();
  await dialog(page).getByRole("button", { name: "添加客户" }).click();
  await expect(dialog(page).getByText("请填写客户名称")).toBeVisible();
  await expect(dialog(page).getByText("至少填写一种联系方式")).toBeVisible();

  await dialog(page).getByLabel("客户名称").fill("测试客户小王");
  await dialog(page).getByLabel("来源渠道").selectOption({ label: "抖音" });
  await dialog(page).getByLabel("微信").fill("wang_test");
  await dialog(page).getByLabel("邮箱").fill("bad-email");
  await dialog(page).getByRole("button", { name: "添加客户" }).click();
  await expect(dialog(page).getByText("邮箱格式不正确")).toBeVisible();
  await dialog(page).getByLabel("邮箱").fill("wang@test.com");
  await dialog(page).getByLabel("标签").fill("新客户 高价值");
  await dialog(page).getByRole("button", { name: "添加客户" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByText("共 11 位客户")).toBeVisible();

  // 刷新后仍存在
  await page.reload();
  await open(page, "/clients");
  await page.getByLabel("搜索客户").fill("小王");
  await expect(page.getByRole("link", { name: "测试客户小王" })).toBeVisible();

  // 编辑
  await page.getByRole("button", { name: "编辑 测试客户小王" }).click();
  await dialog(page).getByLabel("客户名称").fill("测试客户老王");
  await dialog(page).getByRole("button", { name: "保存" }).click();
  await page.getByLabel("搜索客户").fill("老王");
  await expect(page.getByRole("link", { name: "测试客户老王" })).toBeVisible();

  // 客户详情 → 历史项目区域
  await page.getByRole("link", { name: "测试客户老王" }).click();
  await expect(page.getByRole("heading", { name: "测试客户老王" })).toBeVisible();
  await expect(page.getByText("还没有项目")).toBeVisible();
  await page.goBack();

  // 删除：取消时不删除，确认后删除
  await page.getByLabel("搜索客户").fill("老王");
  await page.getByRole("button", { name: "删除 测试客户老王" }).click();
  await confirmDialog(page, "取消");
  await expect(page.getByRole("link", { name: "测试客户老王" })).toBeVisible();
  await page.getByRole("button", { name: "删除 测试客户老王" }).click();
  await confirmDialog(page, "删除");
  await expect(page.getByText("没有匹配的客户")).toBeVisible();
  await page.reload();
  await open(page, "/clients");
  await expect(page.getByText("共 10 位客户")).toBeVisible();

  expect(errors).toEqual([]);
});

test("删除有项目的客户会级联删除项目", async ({ page }) => {
  await open(page, "/clients/cli_lin");
  await page.getByRole("button", { name: "删除客户" }).click();
  await expect(page.getByRole("dialog").getByText("将同时删除 1 个项目")).toBeVisible();
  await confirmDialog(page, "删除");
  await expect(page).toHaveURL(/\/clients$/);
  await open(page, "/projects");
  await expect(page.getByText("咖啡店开业海报")).toHaveCount(0);
});
