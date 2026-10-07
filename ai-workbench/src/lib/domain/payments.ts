import type { Payment, PaymentStatus, Project } from "../types";
import { round2 } from "../utils";

/** 项目应收金额：优先最终成交价，其次报价 */
export function projectAmount(p: Pick<Project, "finalPrice" | "quotedPrice">): number {
  return p.finalPrice ?? p.quotedPrice ?? 0;
}

export interface PaymentSummary {
  amount: number;
  received: number;
  refunded: number;
  /** 实收 = 收款 - 退款 */
  net: number;
  outstanding: number;
  status: PaymentStatus;
}

export function summarizePayments(project: Pick<Project, "finalPrice" | "quotedPrice">, payments: Payment[]): PaymentSummary {
  const amount = projectAmount(project);
  const received = round2(payments.filter((p) => p.kind !== "refund").reduce((s, p) => s + p.amount, 0));
  const refunded = round2(payments.filter((p) => p.kind === "refund").reduce((s, p) => s + p.amount, 0));
  const net = round2(received - refunded);
  const outstanding = round2(Math.max(0, amount - net));

  let status: PaymentStatus;
  if (refunded > 0 && net <= 0) status = "refunded";
  else if (net <= 0) status = "unpaid";
  else if (amount > 0 && net >= amount) status = "paid";
  else if (payments.filter((p) => p.kind !== "refund").every((p) => p.kind === "deposit")) status = "deposit";
  else status = "partial";

  return { amount, received, refunded, net, outstanding, status };
}

export function paymentsByProject(payments: Payment[]): Map<string, Payment[]> {
  const map = new Map<string, Payment[]>();
  for (const p of payments) {
    const list = map.get(p.projectId) ?? [];
    list.push(p);
    map.set(p.projectId, list);
  }
  return map;
}

/** 收款对收入的贡献（退款为负） */
export function signedAmount(p: Payment): number {
  return p.kind === "refund" ? -p.amount : p.amount;
}
