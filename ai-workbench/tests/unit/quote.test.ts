import { describe, expect, it } from "vitest";
import { calcQuote, nextQuoteNumber } from "@/lib/domain/quote";

const base = { items: [], addons: [], discountType: "percent" as const, discountValue: 0, rushFee: 0, revisionFee: 0, otherFee: 0 };

describe("calcQuote", () => {
  it("sums items, addons and fees", () => {
    const t = calcQuote({
      ...base,
      items: [{ id: "1", name: "海报", unitPrice: 200, quantity: 2 }],
      addons: [{ id: "a", name: "源文件", price: 100 }],
      rushFee: 50,
      revisionFee: 30,
      otherFee: 20,
    });
    expect(t).toEqual({ itemsTotal: 400, addonsTotal: 100, feesTotal: 100, subtotal: 600, discount: 0, total: 600 });
  });

  it("applies percent discount only to items + addons", () => {
    const t = calcQuote({ ...base, items: [{ id: "1", name: "x", unitPrice: 1000, quantity: 1 }], rushFee: 300, discountType: "percent", discountValue: 10 });
    expect(t.discount).toBe(100);
    expect(t.total).toBe(1200);
  });

  it("caps amount discount at the discountable amount", () => {
    const t = calcQuote({ ...base, items: [{ id: "1", name: "x", unitPrice: 100, quantity: 1 }], rushFee: 50, discountType: "amount", discountValue: 500 });
    expect(t.discount).toBe(100);
    expect(t.total).toBe(50);
  });

  it("clamps percent above 100 and ignores negative values", () => {
    const t = calcQuote({ ...base, items: [{ id: "1", name: "x", unitPrice: 100, quantity: 1 }], discountValue: 150, rushFee: -20 });
    expect(t.discount).toBe(100);
    expect(t.feesTotal).toBe(0);
    expect(t.total).toBe(0);
  });

  it("handles floating point money correctly", () => {
    const t = calcQuote({ ...base, items: [{ id: "1", name: "x", unitPrice: 0.1, quantity: 3 }] });
    expect(t.total).toBe(0.3);
  });
});

describe("nextQuoteNumber", () => {
  const day = new Date(2026, 9, 7);
  it("starts at 001", () => expect(nextQuoteNumber([], day)).toBe("Q-20261007-001"));
  it("increments within the same day only", () => {
    expect(nextQuoteNumber(["Q-20261007-001", "Q-20261007-004", "Q-20261006-009"], day)).toBe("Q-20261007-005");
  });
});
