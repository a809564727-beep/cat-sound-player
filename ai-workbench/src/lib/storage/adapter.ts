import type { WorkbenchData } from "../types";

/**
 * 存储适配器接口。
 * 当前实现：LocalStorageAdapter（浏览器本地）。
 * 未来接入云数据库/多租户时，实现同样的接口（例如 SupabaseAdapter / ApiAdapter），
 * 在 store 初始化时替换即可，页面与业务逻辑无需改动。
 */
export interface StorageAdapter {
  load(): Promise<WorkbenchData | null>;
  save(data: WorkbenchData): Promise<void>;
  clear(): Promise<void>;
}
