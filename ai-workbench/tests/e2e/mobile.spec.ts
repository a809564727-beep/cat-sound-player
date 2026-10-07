import { expect, test } from "@playwright/test";
import { dialog, open, trackErrors } from "./helpers";

const PAGES = ["/", "/tasks", "/clients", "/clients/cli_echo", "/projects", "/projects/prj_shop-video", "/quotes", "/quotes/new", "/quotes/quo_kb", "/payments", "/services", "/tools", "/recommend", "/analytics", "/settings"];

test("手机端所有页面无横向溢出", async ({ page }) => {
  const errors = trackErrors(page);
  for (const p of PAGES) {
    await open(page, p);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${p} 横向溢出 ${overflow}px`).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
});

test("手机端菜单导航与表单可用", async ({ page }) => {
  await open(page, "/");
  await page.getByTestId("mobile-menu").click();
  await page.getByRole("link", { name: "客户", exact: true }).click();
  await expect(page).toHaveURL(/\/clients$/);
  await page.getByRole("button", { name: "新增客户" }).click();
  await dialog(page).getByLabel("客户名称").fill("手机端客户");
  await dialog(page).getByLabel("微信").fill("m_user");
  await dialog(page).getByRole("button", { name: "添加客户" }).click();
  await expect(page.getByText("共 11 位客户")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
