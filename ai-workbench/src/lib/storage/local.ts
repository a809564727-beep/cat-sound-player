import type { WorkbenchData } from "../types";
import type { StorageAdapter } from "./adapter";
import { migrateData } from "./migrate";

export const STORAGE_KEY = "ai-workbench:data";

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private key = STORAGE_KEY) {}

  async load(): Promise<WorkbenchData | null> {
    const raw = window.localStorage.getItem(this.key);
    if (!raw) return null;
    try {
      return migrateData(JSON.parse(raw));
    } catch (e) {
      // 数据损坏时先另存一份原始内容，避免随后的保存把它覆盖掉
      window.localStorage.setItem(`${this.key}:corrupt-${Date.now()}`, raw);
      throw e;
    }
  }

  async save(data: WorkbenchData): Promise<void> {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(data));
    } catch (e) {
      if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22)) {
        throw new Error("本地存储空间已满，请在设置中导出备份后清理旧数据");
      }
      throw e;
    }
  }

  async clear(): Promise<void> {
    window.localStorage.removeItem(this.key);
  }
}
