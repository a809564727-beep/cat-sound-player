"use client";

import { useMemo } from "react";
import { useWorkbench } from "./store";
import { paymentsByProject, summarizePayments, type PaymentSummary } from "./domain/payments";
import type { Client, Project, Service } from "./types";

/** 常用的派生查找表，避免每个页面重复计算 */
export function useLookups() {
  const { data } = useWorkbench();
  return useMemo(() => {
    const clientById = new Map<string, Client>(data.clients.map((c) => [c.id, c]));
    const serviceById = new Map<string, Service>(data.services.map((s) => [s.id, s]));
    const projectById = new Map<string, Project>(data.projects.map((p) => [p.id, p]));
    const payMap = paymentsByProject(data.payments);
    const summaryById = new Map<string, PaymentSummary>(data.projects.map((p) => [p.id, summarizePayments(p, payMap.get(p.id) ?? [])]));
    return {
      clientById,
      serviceById,
      projectById,
      paymentsOf: (projectId: string) => payMap.get(projectId) ?? [],
      summaryOf: (projectId: string) => summaryById.get(projectId)!,
      clientName: (id?: string) => (id ? clientById.get(id)?.name : undefined) ?? "未知客户",
      serviceName: (id?: string) => (id ? serviceById.get(id)?.name : undefined) ?? "未分类",
    };
  }, [data]);
}
