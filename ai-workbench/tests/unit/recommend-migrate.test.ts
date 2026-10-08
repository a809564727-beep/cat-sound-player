import { describe, expect, it } from "vitest";
import { recommend } from "@/lib/domain/recommend";
import { migrateData, DataFormatError } from "@/lib/storage/migrate";
import { createSeedData, SCHEMA_VERSION } from "@/lib/seed";
import { SERVICE_CATEGORIES } from "@/lib/constants";

const tools = createSeedData().tools;

describe("recommend", () => {
  it("returns tools, workflow and estimate for every category", () => {
    for (const c of SERVICE_CATEGORIES) {
      const r = recommend({ category: c.value, quality: "standard" }, tools);
      expect(r.tools.length).toBeGreaterThan(0);
      expect(r.workflow.length).toBeGreaterThanOrEqual(4);
      expect(r.estimatedHours).toBeGreaterThan(0);
      expect(r.estimatedDays).toBeGreaterThanOrEqual(1);
      // 推荐的工具都应能在工具库中找到
      for (const t of r.tools) expect(t.tool, `${c.value}: ${t.name}`).toBeDefined();
    }
  });

  it("warns when time is insufficient", () => {
    const r = recommend({ category: "website", quality: "premium", daysAvailable: 2, baseHours: 16 }, tools);
    expect(r.risks[0].level).toBe("high");
    expect(r.risks[0].text).toContain("时间不足");
  });

  it("warns about overdue deadlines", () => {
    expect(recommend({ category: "image", quality: "standard", daysAvailable: -1 }, tools).risks[0].text).toContain("截止日期已过");
  });

  it("downgrades tools on low budget", () => {
    const normal = recommend({ category: "image", quality: "standard", budget: 200, basePrice: 200 }, tools);
    const cheap = recommend({ category: "image", quality: "standard", budget: 80, basePrice: 200 }, tools);
    expect(normal.tools[0].name).toBe("Midjourney");
    expect(cheap.tools[0].name).toBe("Flux");
    expect(cheap.risks.some((r) => r.text.includes("预算"))).toBe(true);
  });

  it("scales hours and price by quantity", () => {
    const one = recommend({ category: "image", quality: "standard", baseHours: 0.5, basePrice: 40 });
    const twenty = recommend({ category: "image", quality: "standard", baseHours: 0.5, basePrice: 40, quantity: 20 });
    expect(one).toMatchObject({ estimatedHours: 0.5, estimatedDays: 1, suggestedPrice: 40 });
    expect(twenty).toMatchObject({ estimatedHours: 10, estimatedDays: 3, suggestedPrice: 800 });
  });

  it("judges budget against the total for quantity orders", () => {
    // 20 张 × ¥40 = ¥800：预算 ¥750 是合理的，不应降级工具或报"明显低于"
    const ok = recommend({ category: "image", quality: "standard", budget: 750, baseHours: 0.5, basePrice: 40, quantity: 20 });
    expect(ok.tools[0].name).toBe("Midjourney");
    expect(ok.risks.some((r) => r.level === "high")).toBe(false);
    // 预算 ¥300 对 20 张来说太低
    const low = recommend({ category: "image", quality: "standard", budget: 300, baseHours: 0.5, basePrice: 40, quantity: 20 });
    expect(low.tools[0].name).toBe("Flux");
    expect(low.risks[0].text).toContain("明显低于建议价 ¥800");
  });

  it("treats missing or invalid quantity as 1", () => {
    for (const quantity of [undefined, 0, -3]) {
      expect(recommend({ category: "image", quality: "standard", baseHours: 2, basePrice: 200, quantity }).suggestedPrice).toBe(200);
    }
  });

  it("premium takes longer and costs more than basic", () => {
    const b = recommend({ category: "video", quality: "basic", baseHours: 8, basePrice: 600 });
    const p = recommend({ category: "video", quality: "premium", baseHours: 8, basePrice: 600 });
    expect(p.estimatedHours).toBeGreaterThan(b.estimatedHours);
    expect(p.suggestedPrice).toBeGreaterThan(b.suggestedPrice);
    expect(p.workflow.length).toBeGreaterThan(b.workflow.length);
  });
});

describe("migrateData", () => {
  it("round-trips seed data", () => {
    const seed = createSeedData();
    expect(migrateData(JSON.parse(JSON.stringify(seed)))).toEqual(seed);
  });

  it("fills defaults for older/partial data", () => {
    const d = migrateData({ clients: [{ id: "c", name: "A", channel: "wechat" }], projects: [{ id: "p", name: "P", clientId: "c", status: "quoting", createdAt: "2026-01-01" }] });
    expect(d.schemaVersion).toBe(SCHEMA_VERSION);
    expect(d.clients[0].tags).toEqual([]);
    expect(d.projects[0]).toMatchObject({ deliverables: [], revisions: [], priority: "medium", maxRevisions: 2, quantity: 1, statusChangedAt: "2026-01-01" });
    expect(d.services).toEqual([]);
    expect(d.settings.dueSoonDays).toBe(3);
  });

  it("rejects invalid input", () => {
    expect(() => migrateData(null)).toThrow(DataFormatError);
    expect(() => migrateData({ foo: 1 })).toThrow(DataFormatError);
    expect(() => migrateData({ clients: [], projects: [], tools: "x" })).toThrow(DataFormatError);
    expect(() => migrateData({ clients: [], projects: [], schemaVersion: 999 })).toThrow(/更新版本/);
  });
});
