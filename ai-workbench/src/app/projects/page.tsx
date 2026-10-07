"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Kanban, List, Plus, Search } from "lucide-react";
import { Card, EmptyState, PageHeader, Segmented } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useFeedback } from "@/components/ui/feedback";
import { ProjectFormDialog } from "@/features/projects/project-form";
import { DueText, PaymentBadge, PriorityBadge, StatusBadge } from "@/features/projects/badges";
import { PROJECT_STATUSES, PRIORITIES, labelOf } from "@/lib/constants";
import { useWorkbench } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import type { Project, ProjectStatus } from "@/lib/types";
import { cn, includesText, money } from "@/lib/utils";
import { projectAmount } from "@/lib/domain/payments";

type View = "list" | "board";
const VIEW_KEY = "ai-workbench:projects-view";
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };

export default function ProjectsPage() {
  const { data, setProjectStatus } = useWorkbench();
  const { clientName, serviceName, summaryOf } = useLookups();
  const { toast } = useFeedback();
  const [view, setView] = useState<View>("list");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [priority, setPriority] = useState("");
  const [hideClosed, setHideClosed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "list" || v === "board") setView(v);
    } catch {
      /* ignore */
    }
  }, []);

  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const rows = useMemo(() => {
    return data.projects
      .filter((p) => !status || p.status === status)
      .filter((p) => !serviceId || p.serviceId === serviceId)
      .filter((p) => !priority || p.priority === priority)
      .filter((p) => !hideClosed || (p.status !== "completed" && p.status !== "cancelled"))
      .filter((p) => includesText([p.name, p.requirement, p.notes, clientName(p.clientId), serviceName(p.serviceId)], q))
      .sort((a, b) => {
        const closedA = a.status === "completed" || a.status === "cancelled";
        const closedB = b.status === "completed" || b.status === "cancelled";
        if (closedA !== closedB) return closedA ? 1 : -1;
        if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
        if (!!a.dueDate !== !!b.dueDate) return a.dueDate ? -1 : 1;
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      });
  }, [data.projects, status, serviceId, priority, hideClosed, q, clientName, serviceName]);

  const moveTo = (id: string, s: ProjectStatus) => {
    setProjectStatus(id, s);
    toast(`已移动到「${labelOf(PROJECT_STATUSES, s)}」`);
  };

  return (
    <>
      <PageHeader
        title="项目"
        description={`共 ${data.projects.length} 个项目，进行中 ${data.projects.filter((p) => ["in_progress", "client_review", "revising"].includes(p.status)).length} 个`}
        actions={
          <>
            <Segmented value={view} onChange={changeView} options={[{ value: "list", label: "列表", icon: List }, { value: "board", label: "看板", icon: Kanban }]} />
            <Button onClick={() => setFormOpen(true)}><Plus size={16} /> 新建项目</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索项目、客户、需求…" className="pl-9" aria-label="搜索项目" />
        </div>
        <div className="grid grid-cols-3 gap-2 lg:flex">
          {view === "list" && (
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="lg:w-32" aria-label="按状态筛选">
              <option value="">全部状态</option>
              {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          )}
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="lg:w-36" aria-label="按服务筛选">
            <option value="">全部服务</option>
            {data.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="lg:w-28" aria-label="按优先级筛选">
            <option value="">全部优先级</option>
            {PRIORITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted select-none">
          <input type="checkbox" checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} className="accent-[var(--accent)]" />
          隐藏已完成/已取消
        </label>
      </div>

      {data.projects.length === 0 ? (
        <Card>
          <EmptyState icon={FolderKanban} title="还没有项目" description="创建第一个项目，系统会根据服务类型推荐 AI 工具和工作流" action={<Button onClick={() => setFormOpen(true)}><Plus size={16} /> 新建项目</Button>} />
        </Card>
      ) : view === "list" ? (
        <ProjectList rows={rows} clientName={clientName} serviceName={serviceName} summaryOf={summaryOf} onStatus={moveTo} />
      ) : (
        <Board rows={rows} clientName={clientName} onMove={moveTo} />
      )}

      <ProjectFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  );
}

type Lookups = ReturnType<typeof useLookups>;

function ProjectList({ rows, clientName, serviceName, summaryOf, onStatus }: { rows: Project[]; clientName: Lookups["clientName"]; serviceName: Lookups["serviceName"]; summaryOf: Lookups["summaryOf"]; onStatus: (id: string, s: ProjectStatus) => void }) {
  if (!rows.length) return <Card><EmptyState icon={Search} title="没有匹配的项目" description="调整搜索或筛选条件" /></Card>;
  return (
    <Card>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">项目</th>
              <th className="px-4 py-2.5 font-medium">客户</th>
              <th className="px-4 py-2.5 font-medium">状态</th>
              <th className="px-4 py-2.5 font-medium">截止</th>
              <th className="px-4 py-2.5 text-right font-medium">金额</th>
              <th className="px-4 py-2.5 font-medium">收款</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                <td className="max-w-xs px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/projects/${p.id}`} className="truncate font-medium hover:text-accent">{p.name}</Link>
                    <PriorityBadge priority={p.priority} />
                  </div>
                  <div className="text-xs text-muted">{serviceName(p.serviceId)}</div>
                </td>
                <td className="px-4 py-3 text-muted">{clientName(p.clientId)}</td>
                <td className="px-4 py-3">
                  <select
                    value={p.status}
                    onChange={(e) => onStatus(p.id, e.target.value as ProjectStatus)}
                    className="cursor-pointer rounded-md border border-transparent bg-transparent py-0.5 text-xs hover:border-border"
                    aria-label={`修改「${p.name}」状态`}
                  >
                    {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs"><DueText due={p.dueDate} status={p.status} /></td>
                <td className="px-4 py-3 text-right tabular-nums">{money(projectAmount(p) || undefined)}</td>
                <td className="px-4 py-3"><PaymentBadge status={summaryOf(p.id).status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-border md:hidden">
        {rows.map((p) => (
          <li key={p.id} className="p-4">
            <Link href={`/projects/${p.id}`} className="block">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 font-medium">{p.name}</span>
                <StatusBadge status={p.status} />
              </div>
              <div className="mt-1 text-xs text-muted">{clientName(p.clientId)} · {serviceName(p.serviceId)}</div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <DueText due={p.dueDate} status={p.status} />
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">{money(projectAmount(p) || undefined)}</span>
                  <PaymentBadge status={summaryOf(p.id).status} />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Board({ rows, clientName, onMove }: { rows: Project[]; clientName: Lookups["clientName"]; onMove: (id: string, s: ProjectStatus) => void }) {
  const [dragOver, setDragOver] = useState<ProjectStatus | null>(null);
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6" data-testid="kanban">
      <div className="flex gap-3">
        {PROJECT_STATUSES.map((col) => {
          const items = rows.filter((p) => p.status === col.value);
          return (
            <div
              key={col.value}
              data-status={col.value}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col.value);
              }}
              onDragLeave={() => setDragOver((d) => (d === col.value ? null : d))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) onMove(id, col.value);
              }}
              className={cn(
                "flex w-64 shrink-0 flex-col rounded-xl border bg-surface-2/40 p-2 transition-colors",
                dragOver === col.value ? "border-accent bg-accent-soft/40" : "border-transparent",
              )}
            >
              <div className="flex items-center justify-between px-1.5 py-1">
                <StatusBadge status={col.value} />
                <span className="text-xs text-subtle tabular-nums">{items.length}</span>
              </div>
              <div className="mt-1 flex min-h-24 flex-col gap-2">
                {items.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                    className="cursor-grab rounded-lg border border-border bg-surface p-3 shadow-[var(--shadow)] active:cursor-grabbing"
                  >
                    <Link href={`/projects/${p.id}`} className="block text-sm font-medium hover:text-accent">{p.name}</Link>
                    <div className="mt-1 text-xs text-muted">{clientName(p.clientId)}</div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <DueText due={p.dueDate} status={p.status} />
                      <span className="tabular-nums text-muted">{money(projectAmount(p) || undefined)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <PriorityBadge priority={p.priority} />
                      <select
                        value={p.status}
                        onChange={(e) => onMove(p.id, e.target.value as ProjectStatus)}
                        className="ml-auto max-w-28 cursor-pointer rounded-md border border-border bg-surface px-1 py-0.5 text-[11px] text-muted"
                        aria-label={`移动「${p.name}」`}
                      >
                        {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-subtle">拖到这里</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
