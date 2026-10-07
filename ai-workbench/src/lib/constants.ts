import type {
  Channel,
  DeliverableType,
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
  Priority,
  ProjectStatus,
  QualityLevel,
  QuoteStatus,
  ServiceCategory,
} from "./types";

type Tone = "gray" | "blue" | "violet" | "amber" | "green" | "red" | "cyan" | "pink" | "orange";

export interface Option<T extends string> {
  value: T;
  label: string;
  tone?: Tone;
}

export const CHANNELS: Option<Channel>[] = [
  { value: "xianyu", label: "闲鱼", tone: "amber" },
  { value: "xiaohongshu", label: "小红书", tone: "red" },
  { value: "wechat", label: "微信", tone: "green" },
  { value: "taobao", label: "淘宝", tone: "orange" },
  { value: "referral", label: "朋友介绍", tone: "violet" },
  { value: "zbj", label: "猪八戒", tone: "blue" },
  { value: "douyin", label: "抖音", tone: "pink" },
  { value: "other", label: "其他", tone: "gray" },
];

export const PROJECT_STATUSES: Option<ProjectStatus>[] = [
  { value: "communicating", label: "待沟通", tone: "gray" },
  { value: "quoting", label: "待报价", tone: "amber" },
  { value: "confirming", label: "待确认", tone: "orange" },
  { value: "in_progress", label: "进行中", tone: "blue" },
  { value: "client_review", label: "待客户审核", tone: "violet" },
  { value: "revising", label: "修改中", tone: "pink" },
  { value: "delivered", label: "已交付", tone: "cyan" },
  { value: "completed", label: "已完成", tone: "green" },
  { value: "cancelled", label: "已取消", tone: "red" },
];

/** 已成交（进入执行或之后）的状态 */
export const DEAL_STATUSES: ProjectStatus[] = ["in_progress", "client_review", "revising", "delivered", "completed"];
/** 成交前（销售漏斗中）的状态 */
export const PRESALE_STATUSES: ProjectStatus[] = ["communicating", "quoting", "confirming"];
/** 执行中的状态 */
export const ACTIVE_STATUSES: ProjectStatus[] = ["in_progress", "client_review", "revising"];
/** 已结束 */
export const CLOSED_STATUSES: ProjectStatus[] = ["completed", "cancelled"];

export const PRIORITIES: Option<Priority>[] = [
  { value: "low", label: "低", tone: "gray" },
  { value: "medium", label: "中", tone: "blue" },
  { value: "high", label: "高", tone: "amber" },
  { value: "urgent", label: "紧急", tone: "red" },
];

export const QUALITY_LEVELS: Option<QualityLevel>[] = [
  { value: "basic", label: "基础（快、便宜）" },
  { value: "standard", label: "标准" },
  { value: "premium", label: "精品（高质量）" },
];

export const PAYMENT_METHODS: Option<PaymentMethod>[] = [
  { value: "wechat", label: "微信" },
  { value: "alipay", label: "支付宝" },
  { value: "bank", label: "银行卡" },
  { value: "xianyu", label: "闲鱼" },
  { value: "taobao", label: "淘宝" },
  { value: "other", label: "其他" },
];

export const PAYMENT_KINDS: Option<PaymentKind>[] = [
  { value: "deposit", label: "定金" },
  { value: "progress", label: "进度款" },
  { value: "final", label: "尾款/全款" },
  { value: "refund", label: "退款" },
];

export const PAYMENT_STATUSES: Option<PaymentStatus>[] = [
  { value: "unpaid", label: "未付款", tone: "gray" },
  { value: "deposit", label: "已付定金", tone: "amber" },
  { value: "partial", label: "部分付款", tone: "blue" },
  { value: "paid", label: "已付款", tone: "green" },
  { value: "refunded", label: "退款", tone: "red" },
];

export const QUOTE_STATUSES: Option<QuoteStatus>[] = [
  { value: "draft", label: "草稿", tone: "gray" },
  { value: "sent", label: "已发送", tone: "blue" },
  { value: "accepted", label: "已接受", tone: "green" },
  { value: "rejected", label: "已拒绝", tone: "red" },
];

export const DELIVERABLE_TYPES: Option<DeliverableType>[] = [
  { value: "file", label: "交付文件" },
  { value: "link", label: "交付链接" },
  { value: "github", label: "GitHub" },
  { value: "gdrive", label: "Google Drive" },
  { value: "netdisk", label: "网盘" },
  { value: "other", label: "其他" },
];

export const SERVICE_CATEGORIES: Option<ServiceCategory>[] = [
  { value: "image", label: "图片设计" },
  { value: "video", label: "视频" },
  { value: "document", label: "文档/PPT/简历" },
  { value: "website", label: "网站开发" },
  { value: "knowledge", label: "知识库" },
  { value: "agent", label: "AI Agent" },
  { value: "workflow", label: "自动化工作流" },
  { value: "report", label: "行业报告" },
  { value: "operation", label: "内容代运营" },
  { value: "devenv", label: "环境/工具配置" },
  { value: "consulting", label: "咨询/验收" },
];

export function labelOf<T extends string>(options: Option<T>[], value: T | undefined): string {
  return options.find((o) => o.value === value)?.label ?? "—";
}

export function toneOf<T extends string>(options: Option<T>[], value: T | undefined): Tone {
  return options.find((o) => o.value === value)?.tone ?? "gray";
}

export type { Tone };
