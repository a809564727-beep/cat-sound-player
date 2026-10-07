import { describe, expect, it } from "vitest";
import { summarizePayments } from "@/lib/domain/payments";
import type { Payment } from "@/lib/types";

const pay = (amount: number, kind: Payment["kind"]): Payment => ({
  id: Math.random().toString(), createdAt: "", updatedAt: "", projectId: "p", amount, kind, method: "wechat", paidAt: "2026-10-01",
});

describe("summarizePayments", () => {
  const project = { finalPrice: 1000, quotedPrice: 1200 };

  it("is unpaid with no payments and uses finalPrice over quotedPrice", () => {
    const s = summarizePayments(project, []);
    expect(s).toMatchObject({ amount: 1000, net: 0, outstanding: 1000, status: "unpaid" });
  });

  it("falls back to quotedPrice", () => {
    expect(summarizePayments({ quotedPrice: 800 }, []).amount).toBe(800);
  });

  it("detects deposit-only", () => {
    expect(summarizePayments(project, [pay(500, "deposit")]).status).toBe("deposit");
  });

  it("detects partial payment", () => {
    const s = summarizePayments(project, [pay(500, "deposit"), pay(200, "progress")]);
    expect(s).toMatchObject({ status: "partial", net: 700, outstanding: 300 });
  });

  it("detects fully paid", () => {
    expect(summarizePayments(project, [pay(500, "deposit"), pay(500, "final")]).status).toBe("paid");
  });

  it("detects refunds", () => {
    const s = summarizePayments(project, [pay(500, "deposit"), pay(500, "refund")]);
    expect(s).toMatchObject({ status: "refunded", net: 0, refunded: 500 });
  });

  it("partial refund keeps partial status", () => {
    const s = summarizePayments(project, [pay(1000, "final"), pay(200, "refund")]);
    expect(s).toMatchObject({ status: "partial", net: 800, outstanding: 200 });
  });
});
