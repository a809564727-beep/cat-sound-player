/**
 * 核心领域模型。
 * 所有实体都带 id / createdAt / updatedAt，方便未来迁移到云数据库（多租户时再加 workspaceId）。
 */

export type ID = string;
/** ISO 8601 字符串，日期字段统一使用 YYYY-MM-DD，时间戳使用完整 ISO */
export type ISODate = string;

export interface BaseEntity {
  id: ID;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type Channel = "xianyu" | "xiaohongshu" | "wechat" | "taobao" | "referral" | "zbj" | "douyin" | "other";

export interface Client extends BaseEntity {
  name: string;
  company?: string;
  channel: Channel;
  wechat?: string;
  phone?: string;
  email?: string;
  tags: string[];
  notes?: string;
}

export type ProjectStatus =
  | "communicating" // 待沟通
  | "quoting" // 待报价
  | "confirming" // 待确认
  | "in_progress" // 进行中
  | "client_review" // 待客户审核
  | "revising" // 修改中
  | "delivered" // 已交付
  | "completed" // 已完成
  | "cancelled"; // 已取消

export type Priority = "low" | "medium" | "high" | "urgent";
export type QualityLevel = "basic" | "standard" | "premium";

export type DeliverableType = "file" | "link" | "github" | "gdrive" | "netdisk" | "other";

export interface Deliverable {
  id: ID;
  type: DeliverableType;
  label: string;
  url: string;
  isFinal: boolean;
  createdAt: ISODate;
}

export interface Revision {
  id: ID;
  version: number;
  clientFeedback: string;
  changes: string;
  createdAt: ISODate;
}

export interface Project extends BaseEntity {
  name: string;
  clientId: ID;
  serviceId?: ID;
  requirement: string;
  budget?: number;
  quotedPrice?: number;
  finalPrice?: number;
  startDate?: ISODate;
  dueDate?: ISODate;
  status: ProjectStatus;
  priority: Priority;
  quality: QualityLevel;
  /** 数量（张/页/条…），按件计价的服务用于估算工时和报价 */
  quantity: number;
  /** 合同约定的免费修改次数 */
  maxRevisions: number;
  notes?: string;
  deliverables: Deliverable[];
  revisions: Revision[];
  /** 进入当前状态的时间，用于"客户多久没回复"之类的提醒 */
  statusChangedAt: ISODate;
  completedAt?: ISODate;
}

export interface Service extends BaseEntity {
  name: string;
  /** 关联推荐规则的类别键 */
  category: ServiceCategory;
  basePrice: number;
  estimatedHours: number;
  deliverables: string;
  defaultRevisions: number;
  targetCustomers: string;
  recommendedTools: string[];
  cautions: string;
  active: boolean;
}

export type ServiceCategory =
  | "image"
  | "video"
  | "document"
  | "website"
  | "knowledge"
  | "agent"
  | "workflow"
  | "report"
  | "operation"
  | "devenv"
  | "consulting";

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";

export interface QuoteItem {
  id: ID;
  serviceId?: ID;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface QuoteExtra {
  id: ID;
  name: string;
  price: number;
}

export interface Quote extends BaseEntity {
  number: string;
  clientId: ID;
  projectId?: ID;
  items: QuoteItem[];
  addons: QuoteExtra[];
  discountType: "percent" | "amount";
  discountValue: number;
  rushFee: number;
  revisionFee: number;
  otherFee: number;
  otherFeeLabel?: string;
  validUntil?: ISODate;
  notes?: string;
  status: QuoteStatus;
}

export type PaymentMethod = "wechat" | "alipay" | "bank" | "xianyu" | "taobao" | "other";
export type PaymentKind = "deposit" | "progress" | "final" | "refund";
export type PaymentStatus = "unpaid" | "deposit" | "partial" | "paid" | "refunded";

export interface Payment extends BaseEntity {
  projectId: ID;
  amount: number;
  kind: PaymentKind;
  method: PaymentMethod;
  paidAt: ISODate;
  note?: string;
}

export interface Tool extends BaseEntity {
  name: string;
  category: string;
  url: string;
  usage: string;
  pricing: string;
  openSource: boolean;
  local: boolean;
  suitableFor: ServiceCategory[];
  experience?: string;
  rating: number;
  notes?: string;
}

export interface Todo extends BaseEntity {
  title: string;
  dueDate?: ISODate;
  done: boolean;
  projectId?: ID;
}

export interface Settings {
  businessName: string;
  ownerName: string;
  contact: string;
  quoteFooter: string;
  /** 客户超过 N 天未回复就提醒 */
  replyReminderDays: number;
  /** 截止前 N 天算"快到期" */
  dueSoonDays: number;
}

export interface WorkbenchData {
  schemaVersion: number;
  clients: Client[];
  projects: Project[];
  services: Service[];
  quotes: Quote[];
  payments: Payment[];
  tools: Tool[];
  todos: Todo[];
  settings: Settings;
}

export type CollectionKey = Exclude<keyof WorkbenchData, "schemaVersion" | "settings">;
