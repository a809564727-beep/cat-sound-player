export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function uid(prefix = ""): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix ? `${prefix}_${rand}` : rand;
}

export function nowISO(): string {
  return new Date().toISOString();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** 本地时区的 YYYY-MM-DD */
export function toDateKey(d: Date | string): string {
  const date = typeof d === "string" ? parseDate(d) : d;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 解析 YYYY-MM-DD 为本地零点；完整 ISO 原样解析 */
export function parseDate(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

export function todayKey(now = new Date()): string {
  return toDateKey(now);
}

export function addDays(base: Date | string, days: number): Date {
  const d = typeof base === "string" ? parseDate(base) : new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** a - b，单位：天（按本地日期计算，忽略时分秒） */
export function diffDays(a: Date | string, b: Date | string): number {
  const da = parseDate(toDateKey(typeof a === "string" ? parseDate(a) : a));
  const db = parseDate(toDateKey(typeof b === "string" ? parseDate(b) : b));
  return Math.round((da.getTime() - db.getTime()) / 86400000);
}

export function monthKey(d: Date | string): string {
  return toDateKey(d).slice(0, 7);
}

export function formatDate(s?: string): string {
  if (!s) return "—";
  const d = parseDate(s);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDateTime(s?: string): string {
  if (!s) return "—";
  const d = parseDate(s);
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatDate(s)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "3天后" / "今天" / "逾期2天" */
export function relativeDue(due?: string, now = new Date()): string {
  if (!due) return "无截止";
  const n = diffDays(due, now);
  if (n === 0) return "今天到期";
  if (n === 1) return "明天到期";
  if (n > 0) return `${n}天后`;
  return `逾期${-n}天`;
}

export function money(n?: number, opts: { sign?: boolean } = {}): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const s = Math.round(n * 100) / 100;
  const str = s.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${opts.sign && s > 0 ? "+" : ""}¥${str}`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sum(nums: number[]): number {
  return round2(nums.reduce((a, b) => a + b, 0));
}

export function percent(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function includesText(haystack: Array<string | undefined>, needle: string): boolean {
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  return haystack.some((h) => h?.toLowerCase().includes(q));
}
