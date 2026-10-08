import type { Quote } from "../types";
import { round2 } from "../utils";

export interface QuoteTotals {
  /** 服务小计（单价×数量） */
  itemsTotal: number;
  /** 附加服务 */
  addonsTotal: number;
  /** 加急+修改+其他费用 */
  feesTotal: number;
  /** 原价 = 服务 + 附加 + 费用 */
  subtotal: number;
  /** 优惠金额 */
  discount: number;
  /** 最终报价 */
  total: number;
}

type QuoteLike = Pick<
  Quote,
  "items" | "addons" | "discountType" | "discountValue" | "rushFee" | "revisionFee" | "otherFee"
>;

const nn = (n: number | undefined) => (Number.isFinite(n) && (n as number) > 0 ? (n as number) : 0);

/**
 * 报价计算规则：
 * - 折扣只作用于"服务 + 附加服务"，不作用于加急费/修改费/其他费用（这些是成本性收费）
 * - 百分比折扣限制在 0–100，金额折扣不超过可折扣金额
 */
export function calcQuote(q: QuoteLike): QuoteTotals {
  const itemsTotal = round2(q.items.reduce((s, i) => s + nn(i.unitPrice) * nn(i.quantity), 0));
  const addonsTotal = round2(q.addons.reduce((s, a) => s + nn(a.price), 0));
  const feesTotal = round2(nn(q.rushFee) + nn(q.revisionFee) + nn(q.otherFee));
  const discountable = itemsTotal + addonsTotal;
  let discount = 0;
  if (q.discountType === "percent") {
    const pct = Math.min(100, nn(q.discountValue));
    discount = (discountable * pct) / 100;
  } else {
    discount = Math.min(discountable, nn(q.discountValue));
  }
  discount = round2(discount);
  const subtotal = round2(discountable + feesTotal);
  return { itemsTotal, addonsTotal, feesTotal, subtotal, discount, total: round2(subtotal - discount) };
}

/** 生成报价单号：Q-YYYYMMDD-序号 */
export function nextQuoteNumber(existing: string[], now = new Date()): string {
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const prefix = `Q-${d}-`;
  const max = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
