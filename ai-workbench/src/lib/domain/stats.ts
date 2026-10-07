import { CHANNELS, DEAL_STATUSES, PROJECT_STATUSES, labelOf } from "../constants";
import type { Client, Payment, Project, ProjectStatus, Service } from "../types";
import { addDays, monthKey, round2, toDateKey } from "../utils";
import { projectAmount, signedAmount } from "./payments";

export const isDeal = (p: Project) => DEAL_STATUSES.includes(p.status);

/** 订单日期：开始日期优先，否则创建时间 */
export const orderDate = (p: Project) => p.startDate ?? toDateKey(p.createdAt);

export function incomeInMonth(payments: Payment[], month: string): number {
  return round2(payments.filter((p) => monthKey(p.paidAt) === month).reduce((s, p) => s + signedAmount(p), 0));
}

export function totalIncome(payments: Payment[]): number {
  return round2(payments.reduce((s, p) => s + signedAmount(p), 0));
}

export function dealsInMonth(projects: Project[], month: string): Project[] {
  return projects.filter((p) => isDeal(p) && monthKey(orderDate(p)) === month);
}

export function averageOrderValue(projects: Project[]): number {
  const deals = projects.filter(isDeal);
  if (!deals.length) return 0;
  return round2(deals.reduce((s, p) => s + projectAmount(p), 0) / deals.length);
}

export interface DayPoint {
  date: string;
  label: string;
  count: number;
  amount: number;
}

/** 最近 N 天新增订单（按创建日期，包含咨询阶段） */
export function recentDaysOrders(projects: Project[], days = 7, now = new Date()): DayPoint[] {
  const points: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(now, -i);
    const key = toDateKey(d);
    const list = projects.filter((p) => toDateKey(p.createdAt) === key);
    points.push({
      date: key,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      count: list.length,
      amount: round2(list.reduce((s, p) => s + projectAmount(p), 0)),
    });
  }
  return points;
}

export interface MonthPoint {
  month: string;
  label: string;
  income: number;
  orders: number;
}

export function monthlyTrend(projects: Project[], payments: Payment[], months = 6, now = new Date()): MonthPoint[] {
  const out: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    out.push({
      month: key,
      label: `${d.getMonth() + 1}月`,
      income: incomeInMonth(payments, key),
      orders: dealsInMonth(projects, key).length,
    });
  }
  return out;
}

export interface NamedValue {
  key: string;
  name: string;
  value: number;
  count: number;
}

export function statusDistribution(projects: Project[]): NamedValue[] {
  return PROJECT_STATUSES.map((s) => {
    const count = projects.filter((p) => p.status === s.value).length;
    return { key: s.value, name: s.label, value: count, count };
  }).filter((x) => x.count > 0);
}

/** 按服务统计实收金额 */
export function revenueByService(projects: Project[], payments: Payment[], services: Service[]): NamedValue[] {
  const projectService = new Map(projects.map((p) => [p.id, p.serviceId ?? "none"]));
  const acc = new Map<string, NamedValue>();
  const nameOf = (id: string) => services.find((s) => s.id === id)?.name ?? "未分类";
  for (const p of projects.filter(isDeal)) {
    const key = p.serviceId ?? "none";
    const cur = acc.get(key) ?? { key, name: nameOf(key), value: 0, count: 0 };
    cur.count += 1;
    acc.set(key, cur);
  }
  for (const pay of payments) {
    const key = projectService.get(pay.projectId);
    if (!key) continue;
    const cur = acc.get(key) ?? { key, name: nameOf(key), value: 0, count: 0 };
    cur.value = round2(cur.value + signedAmount(pay));
    acc.set(key, cur);
  }
  return [...acc.values()].sort((a, b) => b.value - a.value);
}

/** 按客户来源统计实收金额与客户数 */
export function revenueByChannel(clients: Client[], projects: Project[], payments: Payment[]): NamedValue[] {
  const clientChannel = new Map(clients.map((c) => [c.id, c.channel]));
  const projectClient = new Map(projects.map((p) => [p.id, p.clientId]));
  const acc = new Map<string, NamedValue>();
  for (const c of clients) {
    const cur = acc.get(c.channel) ?? { key: c.channel, name: labelOf(CHANNELS, c.channel), value: 0, count: 0 };
    cur.count += 1;
    acc.set(c.channel, cur);
  }
  for (const pay of payments) {
    const cid = projectClient.get(pay.projectId);
    const ch = cid ? clientChannel.get(cid) : undefined;
    if (!ch) continue;
    const cur = acc.get(ch)!;
    cur.value = round2(cur.value + signedAmount(pay));
  }
  return [...acc.values()].sort((a, b) => b.value - a.value || b.count - a.count);
}

/** 转化率 = 成交项目 / (成交 + 已取消 + 销售中)，即全部项目 */
export function conversionRate(projects: Project[]): number {
  if (!projects.length) return 0;
  return projects.filter(isDeal).length / projects.length;
}

/** 完成率 = 已完成 / 已成交 */
export function completionRate(projects: Project[]): number {
  const deals = projects.filter(isDeal);
  if (!deals.length) return 0;
  return deals.filter((p) => p.status === "completed").length / deals.length;
}

export function countByStatus(projects: Project[], statuses: ProjectStatus[]): number {
  return projects.filter((p) => statuses.includes(p.status)).length;
}
