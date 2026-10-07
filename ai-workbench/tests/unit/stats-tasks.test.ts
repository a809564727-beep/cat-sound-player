import { describe, expect, it } from "vitest";
import { createSeedData } from "@/lib/seed";
import {
  averageOrderValue,
  completionRate,
  conversionRate,
  incomeInMonth,
  recentDaysOrders,
  revenueByChannel,
  revenueByService,
  statusDistribution,
  totalIncome,
} from "@/lib/domain/stats";
import { generateTasks } from "@/lib/domain/tasks";
import { monthKey } from "@/lib/utils";

const now = new Date(2026, 9, 15, 12);
const data = createSeedData(now);

describe("seed data", () => {
  it("has the required volume of realistic data", () => {
    expect(data.clients.length).toBeGreaterThanOrEqual(10);
    expect(data.projects.length).toBeGreaterThanOrEqual(15);
    expect(data.services.length).toBeGreaterThanOrEqual(10);
    expect(data.tools.length).toBeGreaterThanOrEqual(20);
  });

  it("has referential integrity", () => {
    const clientIds = new Set(data.clients.map((c) => c.id));
    const serviceIds = new Set(data.services.map((s) => s.id));
    const projectIds = new Set(data.projects.map((p) => p.id));
    for (const p of data.projects) {
      expect(clientIds.has(p.clientId)).toBe(true);
      if (p.serviceId) expect(serviceIds.has(p.serviceId)).toBe(true);
    }
    for (const pay of data.payments) expect(projectIds.has(pay.projectId)).toBe(true);
    for (const q of data.quotes) expect(clientIds.has(q.clientId)).toBe(true);
  });

  it("includes all required preset tools", () => {
    const names = data.tools.map((t) => t.name.split(" ")[0]);
    for (const n of ["ChatGPT", "Claude", "Codex", "Gemini", "DeepSeek", "Midjourney", "Flux", "Kling", "MiniMax", "ElevenLabs", "Dify", "Coze", "Remotion", "FFmpeg", "MoneyPrinterTurbo", "OpenMontage"]) {
      expect(names).toContain(n);
    }
  });
});

describe("stats", () => {
  it("computes income per month and total, refunds negative", () => {
    const month = monthKey(now);
    const manual = data.payments.filter((p) => monthKey(p.paidAt) === month).reduce((s, p) => s + (p.kind === "refund" ? -p.amount : p.amount), 0);
    expect(incomeInMonth(data.payments, month)).toBe(manual);
    expect(totalIncome(data.payments)).toBe(data.payments.reduce((s, p) => s + p.amount, 0));
    expect(totalIncome([...data.payments, { ...data.payments[0], id: "r", kind: "refund", amount: 100 }])).toBe(totalIncome(data.payments) - 100);
  });

  it("rates are within [0, 1]", () => {
    for (const r of [conversionRate(data.projects), completionRate(data.projects)]) {
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(1);
    }
    expect(conversionRate([])).toBe(0);
    expect(completionRate([])).toBe(0);
    expect(averageOrderValue([])).toBe(0);
  });

  it("7-day series has 7 points ending today", () => {
    const w = recentDaysOrders(data.projects, 7, now);
    expect(w).toHaveLength(7);
    expect(w[6].label).toBe("10/15");
  });

  it("status distribution counts every project", () => {
    expect(statusDistribution(data.projects).reduce((s, x) => s + x.count, 0)).toBe(data.projects.length);
  });

  it("revenue rankings sum to total income", () => {
    const total = totalIncome(data.payments);
    expect(revenueByService(data.projects, data.payments, data.services).reduce((s, x) => s + x.value, 0)).toBeCloseTo(total);
    expect(revenueByChannel(data.clients, data.projects, data.payments).reduce((s, x) => s + x.value, 0)).toBeCloseTo(total);
  });
});

describe("generateTasks", () => {
  const tasks = generateTasks(data, now);
  const kinds = new Set(tasks.map((t) => t.kind));

  it("produces each category of reminder from seed data", () => {
    for (const k of ["overdue", "deliver", "reply", "payment", "quote", "todo"]) expect(kinds.has(k as never)).toBe(true);
  });

  it("flags the overdue video project first", () => {
    expect(tasks[0].kind).toBe("overdue");
    expect(tasks[0].projectId).toBe("prj_shop-video");
  });

  it("asks to collect the PPT balance", () => {
    expect(tasks.some((t) => t.kind === "payment" && t.projectId === "prj_ppt")).toBe(true);
  });

  it("sorts completed todos last", () => {
    const firstDone = tasks.findIndex((t) => t.done);
    expect(firstDone).toBeGreaterThan(-1);
    expect(tasks.slice(firstDone).every((t) => t.done)).toBe(true);
  });

  it("does not remind about cancelled or completed-and-paid projects", () => {
    expect(tasks.some((t) => t.projectId === "prj_miniapp-check")).toBe(false);
    expect(tasks.some((t) => t.projectId === "prj_coffee")).toBe(false);
  });
});
