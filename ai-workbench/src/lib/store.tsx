"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CollectionKey, ProjectStatus, Settings, WorkbenchData } from "./types";
import type { StorageAdapter } from "./storage/adapter";
import { LocalStorageAdapter } from "./storage/local";
import { migrateData } from "./storage/migrate";
import { createEmptyData, createSeedData } from "./seed";
import { nowISO, uid } from "./utils";

type Entity<K extends CollectionKey> = WorkbenchData[K][number];
type NewEntity<K extends CollectionKey> = Omit<Entity<K>, "id" | "createdAt" | "updatedAt">;

const ID_PREFIX: Record<CollectionKey, string> = {
  clients: "cli",
  projects: "prj",
  services: "svc",
  quotes: "quo",
  payments: "pay",
  tools: "tool",
  todos: "todo",
};

export interface WorkbenchActions {
  create<K extends CollectionKey>(key: K, data: NewEntity<K>): Entity<K>;
  update<K extends CollectionKey>(key: K, id: string, patch: Partial<Entity<K>>): void;
  remove(key: CollectionKey, id: string): void;
  setProjectStatus(id: string, status: ProjectStatus): void;
  updateSettings(patch: Partial<Settings>): void;
  replaceAll(raw: unknown): void;
  resetToSeed(): void;
  clearBusinessData(): void;
}

interface WorkbenchContextValue extends WorkbenchActions {
  data: WorkbenchData;
  ready: boolean;
  saveError: string | null;
}

const WorkbenchContext = createContext<WorkbenchContextValue | null>(null);

/** 删除时的级联规则：保持数据一致，不留下孤儿记录 */
function cascadeRemove(data: WorkbenchData, key: CollectionKey, id: string): WorkbenchData {
  const next = { ...data, [key]: (data[key] as Array<{ id: string }>).filter((x) => x.id !== id) } as WorkbenchData;
  if (key === "clients") {
    const projectIds = new Set(next.projects.filter((p) => p.clientId === id).map((p) => p.id));
    next.projects = next.projects.filter((p) => p.clientId !== id);
    next.payments = next.payments.filter((p) => !projectIds.has(p.projectId));
    next.quotes = next.quotes.filter((q) => q.clientId !== id);
    next.todos = next.todos.map((t) => (t.projectId && projectIds.has(t.projectId) ? { ...t, projectId: undefined } : t));
  }
  if (key === "projects") {
    next.payments = next.payments.filter((p) => p.projectId !== id);
    next.quotes = next.quotes.map((q) => (q.projectId === id ? { ...q, projectId: undefined } : q));
    next.todos = next.todos.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t));
  }
  if (key === "services") {
    next.projects = next.projects.map((p) => (p.serviceId === id ? { ...p, serviceId: undefined } : p));
  }
  return next;
}

export function WorkbenchProvider({ children, adapter }: { children: ReactNode; adapter?: StorageAdapter }) {
  const storage = useMemo(() => adapter ?? new LocalStorageAdapter(), [adapter]);
  const [data, setData] = useState<WorkbenchData>(() => createEmptyData());
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    storage
      .load()
      .then((stored) => {
        if (cancelled) return;
        if (stored) setData(stored);
        else setData(createSeedData()); // 首次打开：加载示例数据
      })
      .catch((e) => {
        console.warn("加载本地数据失败，使用示例数据", e);
        if (!cancelled) {
          setSaveError("本地数据无法读取，已加载示例数据。原始数据已另存为 ai-workbench:data:corrupt-* 键。");
          setData(createSeedData());
        }
      })
      .finally(() => {
        if (!cancelled) {
          loaded.current = true;
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  useEffect(() => {
    if (!loaded.current) return;
    storage
      .save(data)
      .then(() => setSaveError(null))
      .catch((e: Error) => setSaveError(e.message || "保存失败"));
  }, [data, storage]);

  const create = useCallback(<K extends CollectionKey>(key: K, input: NewEntity<K>): Entity<K> => {
    const ts = nowISO();
    const entity = { ...input, id: uid(ID_PREFIX[key]), createdAt: ts, updatedAt: ts } as unknown as Entity<K>;
    setData((d) => ({ ...d, [key]: [entity, ...(d[key] as unknown[])] }));
    return entity;
  }, []);

  const update = useCallback(<K extends CollectionKey>(key: K, id: string, patch: Partial<Entity<K>>) => {
    setData((d) => ({
      ...d,
      [key]: (d[key] as Array<{ id: string }>).map((x) => (x.id === id ? { ...x, ...patch, id, updatedAt: nowISO() } : x)),
    }));
  }, []);

  const remove = useCallback((key: CollectionKey, id: string) => {
    setData((d) => cascadeRemove(d, key, id));
  }, []);

  const setProjectStatus = useCallback((id: string, status: ProjectStatus) => {
    setData((d) => ({
      ...d,
      projects: d.projects.map((p) => {
        if (p.id !== id || p.status === status) return p;
        const ts = nowISO();
        return {
          ...p,
          status,
          statusChangedAt: ts,
          updatedAt: ts,
          completedAt: status === "completed" ? ts : p.completedAt,
          finalPrice: status === "in_progress" && p.finalPrice === undefined ? p.quotedPrice : p.finalPrice,
        };
      }),
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const replaceAll = useCallback((raw: unknown) => {
    setData(migrateData(raw)); // 校验失败会抛出，由调用方提示
  }, []);

  const resetToSeed = useCallback(() => setData(createSeedData()), []);
  const clearBusinessData = useCallback(() => setData((d) => ({ ...createEmptyData(), services: d.services, tools: d.tools, settings: d.settings })), []);

  const value = useMemo<WorkbenchContextValue>(
    () => ({ data, ready, saveError, create, update, remove, setProjectStatus, updateSettings, replaceAll, resetToSeed, clearBusinessData }),
    [data, ready, saveError, create, update, remove, setProjectStatus, updateSettings, replaceAll, resetToSeed, clearBusinessData],
  );

  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
}

export function useWorkbench(): WorkbenchContextValue {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) throw new Error("useWorkbench 必须在 WorkbenchProvider 内使用");
  return ctx;
}
