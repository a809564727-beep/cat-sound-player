import { expect, test } from "@playwright/test";
import { dialog, open, trackErrors } from "./helpers";

test("创建报价：自动计算原价、优惠、最终报价，并生成报价单", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page, "/quotes/new");
  await page.getByRole("button", { name: "生成报价单" }).click();
  await expect(page.getByText("请选择客户")).toBeVisible();

  await page.getByRole("combobox", { name: "客户", exact: true }).selectOption({ label: "Echo" });
  await page.getByLabel("第1项服务").selectOption({ label: "小红书封面" });
  await expect(page.getByLabel("第1项单价")).toHaveValue("40");
  await page.getByLabel("第1项数量").fill("10");
  await page.getByRole("button", { name: "+ 源文件交付 ¥100" }).click();
  await page.getByLabel("折扣方式").selectOption("percent");
  await page.getByLabel("折扣", { exact: true }).fill("10");
  await page.getByLabel("加急费").fill("60");
  // 服务 400 + 附加 100 + 加急 60 = 560，九折只作用于 500 → 优惠 50 → 510
  const totals = page.getByTestId("quote-totals");
  await expect(totals.getByText("¥560")).toBeVisible();
  await expect(totals.getByText("-¥50")).toBeVisible();
  await expect(page.getByTestId("quote-total")).toHaveText("¥510");

  await page.getByRole("button", { name: "生成报价单" }).click();
  await expect(page).toHaveURL(/\/quotes\/quo_/);
  const sheet = page.getByTestId("quote-sheet");
  await expect(sheet.getByText("报价单", { exact: true })).toBeVisible();
  await expect(sheet.getByText("¥510")).toBeVisible();
  await expect(sheet.getByText("9 折")).toBeVisible();
  await expect(page.getByRole("button", { name: "打印 / PDF" })).toBeVisible();

  // 从报价创建项目
  await page.getByRole("button", { name: "创建项目" }).click();
  await expect(page).toHaveURL(/\/projects\/prj_/);
  await expect(page.getByText("报价").locator("..").getByText("¥510").first()).toBeVisible();

  await open(page, "/quotes");
  await expect(page.getByText("¥510")).toBeVisible();
  expect(errors).toEqual([]);
});

test("记录收款后收入统计更新", async ({ page }) => {
  const errors = trackErrors(page);
  await open(page, "/analytics");
  const monthCard = page.getByText("本月收入").locator("..").locator("..");
  const before = Number((await monthCard.locator("div.text-2xl").innerText()).replace(/[¥,]/g, ""));

  await open(page, "/payments");
  await page.getByRole("button", { name: "记录收款" }).first().click();
  await dialog(page).getByRole("button", { name: "保存" }).click();
  await expect(dialog(page).getByText("请选择项目")).toBeVisible();
  await dialog(page).getByLabel("项目").selectOption({ label: "年终汇报 PPT 优化（20页） · 张晓" });
  await expect(dialog(page).getByText("未收")).toBeVisible();
  await dialog(page).getByLabel("金额").fill("180");
  await dialog(page).getByLabel("类型").selectOption({ label: "尾款/全款" });
  await dialog(page).getByLabel("付款渠道").selectOption({ label: "闲鱼" });
  await dialog(page).getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("收款已记录")).toBeVisible();

  // PPT 项目变为已付款
  const row = page.getByRole("row", { name: /年终汇报/ });
  await expect(row.getByText("已付款")).toBeVisible();

  await page.getByRole("tab", { name: "收款记录" }).click();
  await expect(page.getByText("+¥180")).toBeVisible();

  await open(page, "/analytics");
  await expect(monthCard.locator("div.text-2xl")).toHaveText(`¥${(before + 180).toLocaleString("zh-CN")}`);
  await expect(page.getByText("服务收入排名")).toBeVisible();
  await expect(page.getByText("客户来源排名")).toBeVisible();
  await expect(page.locator(".recharts-surface").first()).toBeVisible();

  // 今日任务中的催款提醒消失
  await open(page, "/tasks");
  await expect(page.getByText("催收 张晓 尾款")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("退款不能超过已收金额", async ({ page }) => {
  await open(page, "/projects/prj_ppt");
  await page.getByRole("button", { name: "记录收款" }).click();
  await dialog(page).getByLabel("类型").selectOption({ label: "退款" });
  await dialog(page).getByLabel("金额").fill("500");
  await dialog(page).getByRole("button", { name: "保存" }).click();
  await expect(dialog(page).getByText("退款金额不能超过已收金额")).toBeVisible();
});
