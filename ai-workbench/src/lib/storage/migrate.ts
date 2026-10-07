import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "../seed";
import type { WorkbenchData } from "../types";

const COLLECTIONS = ["clients", "projects", "services", "quotes", "payments", "tools", "todos"] as const;

export class DataFormatError extends Error {}

/**
 * 校验并迁移任意来源（localStorage / 导入的备份文件）的数据。
 * 新增字段时：提高 SCHEMA_VERSION，并在这里补默认值，保证老数据可读。
 */
export function migrateData(raw: unknown): WorkbenchData {
  if (!raw || typeof raw !== "object") throw new DataFormatError("数据格式不正确：不是有效的 JSON 对象");
  const obj = raw as Record<string, unknown>;
  for (const key of COLLECTIONS) {
    if (obj[key] !== undefined && !Array.isArray(obj[key])) throw new DataFormatError(`数据格式不正确：${key} 应为数组`);
  }
  if (!Array.isArray(obj.clients) || !Array.isArray(obj.projects)) {
    throw new DataFormatError("数据格式不正确：缺少 clients 或 projects");
  }
  const version = typeof obj.schemaVersion === "number" ? obj.schemaVersion : 0;
  if (version > SCHEMA_VERSION) throw new DataFormatError("数据来自更新版本的工作台，请先升级应用");

  const data: WorkbenchData = {
    schemaVersion: SCHEMA_VERSION,
    clients: (obj.clients as WorkbenchData["clients"]).map((c) => ({ ...c, tags: Array.isArray(c.tags) ? c.tags : [] })),
    projects: (obj.projects as WorkbenchData["projects"]).map((p) => ({
      ...p,
      deliverables: Array.isArray(p.deliverables) ? p.deliverables : [],
      revisions: Array.isArray(p.revisions) ? p.revisions : [],
      priority: p.priority ?? "medium",
      quality: p.quality ?? "standard",
      maxRevisions: typeof p.maxRevisions === "number" ? p.maxRevisions : 2,
      statusChangedAt: p.statusChangedAt ?? p.updatedAt ?? p.createdAt,
    })),
    services: ((obj.services as WorkbenchData["services"]) ?? []).map((s) => ({
      ...s,
      recommendedTools: Array.isArray(s.recommendedTools) ? s.recommendedTools : [],
      active: s.active ?? true,
    })),
    quotes: ((obj.quotes as WorkbenchData["quotes"]) ?? []).map((q) => ({
      ...q,
      items: Array.isArray(q.items) ? q.items : [],
      addons: Array.isArray(q.addons) ? q.addons : [],
    })),
    payments: (obj.payments as WorkbenchData["payments"]) ?? [],
    tools: ((obj.tools as WorkbenchData["tools"]) ?? []).map((t) => ({
      ...t,
      suitableFor: Array.isArray(t.suitableFor) ? t.suitableFor : [],
    })),
    todos: (obj.todos as WorkbenchData["todos"]) ?? [],
    settings: { ...DEFAULT_SETTINGS, ...((obj.settings as object) ?? {}) },
  };
  return data;
}
