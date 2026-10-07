import { expect, type Page } from "@playwright/test";

/** 收集控制台错误，测试结束时断言为空 */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

export async function open(page: Page, path: string) {
  await page.goto(path);
  // 等待 store 从 localStorage 加载完成（骨架屏消失）
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

export function dialog(page: Page) {
  return page.getByRole("dialog");
}

export async function confirmDialog(page: Page, button: string) {
  const d = page.getByRole("dialog").last();
  await d.getByRole("button", { name: button, exact: true }).click();
}
