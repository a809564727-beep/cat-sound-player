"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Calculator, CircleCheck, FolderX, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState, KV } from "@/components/ui/misc";
import { useFeedback } from "@/components/ui/feedback";
import { ProjectFormDialog } from "@/features/projects/project-form";
import { DeliverablesCard, RevisionsCard } from "@/features/projects/delivery";
import { DueText, PaymentBadge, PriorityBadge, StatusBadge } from "@/features/projects/badges";
import { PaymentFormDialog } from "@/features/payments/payment-form";
import { RecommendPanel } from "@/features/recommend/recommend-panel";
import { PAYMENT_KINDS, PAYMENT_METHODS, PROJECT_STATUSES, QUALITY_LEVELS, QUOTE_STATUSES, labelOf, toneOf } from "@/lib/constants";
import { calcQuote } from "@/lib/domain/quote";
import { useWorkbench } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import type { Payment, ProjectStatus } from "@/lib/types";
import { cn, diffDays, formatDate, money } from "@/lib/utils";

/** 主流程（不含已取消），用于进度条 */
const FLOW: ProjectStatus[] = ["communicating", "quoting", "confirming", "in_progress", "client_review", "revising", "delivered", "completed"];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, remove, setProjectStatus } = useWorkbench();
  const { clientById, serviceById, summaryOf, paymentsOf } = useLookups();
  const { confirm, toast } = useFeedback();
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editingPay, setEditingPay] = useState<Payment | undefined>();

  const project = data.projects.find((p) => p.id === id);
  if (!project) {
    return (
      <Card>
        <EmptyState icon={FolderX} title="项目不存在" description="可能已被删除" action={<LinkButton href="/projects">返回项目列表</LinkButton>} />
      </Card>
    );
  }

  const client = clientById.get(project.clientId);
  const service = project.serviceId ? serviceById.get(project.serviceId) : undefined;
  const summary = summaryOf(project.id);
  const payments = [...paymentsOf(project.id)].sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1));
  const quotes = data.quotes.filter((q) => q.projectId === project.id);
  const flowIndex = FLOW.indexOf(project.status);

  const changeStatus = (s: ProjectStatus) => {
    setProjectStatus(project.id, s);
    toast(`状态已更新为「${labelOf(PROJECT_STATUSES, s)}」`);
  };

  const complete = async () => {
    if (summary.outstanding > 0) {
      const ok = await confirm({
        title: "还有未收款项",
        description: `该项目还有 ${money(summary.outstanding)} 未收，仍然标记为已完成吗？之后可以在今日任务里看到催款提醒。`,
        confirmText: "仍然完成",
      });
      if (!ok) return;
    }
    changeStatus("completed");
  };

  const del = async () => {
    const ok = await confirm({
      title: `删除项目「${project.name}」？`,
      description: `相关的 ${payments.length} 条收款记录会一起删除，报价单会保留但取消关联。此操作无法恢复。`,
      confirmText: "删除",
      danger: true,
    });
    if (!ok) return;
    remove("projects", project.id);
    toast("项目已删除");
    router.push("/projects");
  };

  const delPayment = async (p: Payment) => {
    if (!(await confirm({ title: "删除这条收款记录？", description: `${money(p.amount)} · ${formatDate(p.paidAt)}`, confirmText: "删除", danger: true }))) return;
    remove("payments", p.id);
    toast("收款记录已删除");
  };

  return (
    <>
      <Link href="/projects" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg"><ArrowLeft size={14} /> 项目</Link>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
            <StatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {client ? <Link href={`/clients/${client.id}`} className="hover:text-accent">{client.name}</Link> : "未知客户"}
            {" · "}{service?.name ?? "未分类"}{" · "}<DueText due={project.dueDate} status={project.status} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={project.status}
            onChange={(e) => changeStatus(e.target.value as ProjectStatus)}
            className="h-9 cursor-pointer rounded-lg border border-border bg-surface px-2 text-sm"
            aria-label="修改项目状态"
            data-testid="status-select"
          >
            {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {project.status !== "completed" && project.status !== "cancelled" && (
            <Button variant="outline" onClick={complete}><CircleCheck size={16} /> 标记完成</Button>
          )}
          <LinkButton href={`/quotes/new?projectId=${project.id}`}><Calculator size={16} /> 生成报价</LinkButton>
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil size={16} /> 编辑</Button>
          <Button variant="ghost" onClick={del} aria-label="删除项目"><Trash2 size={16} /></Button>
        </div>
      </div>

      {/* 进度条 */}
      {project.status !== "cancelled" ? (
        <div className="mb-5 overflow-x-auto pb-1" data-scroll-ok>
          <ol className="flex min-w-[640px] items-center gap-1">
            {FLOW.map((s, i) => (
              <li key={s} className="flex-1">
                <button
                  type="button"
                  onClick={() => changeStatus(s)}
                  className={cn(
                    "w-full cursor-pointer rounded-md px-1 py-1.5 text-[11px] font-medium transition-colors",
                    i < flowIndex ? "bg-accent-soft text-accent" : i === flowIndex ? "bg-accent text-accent-fg" : "bg-surface-2 text-subtle hover:text-fg",
                  )}
                  title={`设为「${labelOf(PROJECT_STATUSES, s)}」`}
                >
                  {labelOf(PROJECT_STATUSES, s)}
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="mb-5 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">项目已取消{project.notes ? `：${project.notes}` : ""}</div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="项目信息" />
            <div className="px-4 pb-4">
              <p className="mb-4 rounded-lg bg-surface-2/60 p-3 text-sm leading-relaxed whitespace-pre-wrap">{project.requirement || <span className="text-subtle">暂无需求说明</span>}</p>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KV label="客户预算">{money(project.budget)}</KV>
                <KV label="报价">{money(project.quotedPrice)}</KV>
                <KV label="最终成交价">{money(project.finalPrice)}</KV>
                <KV label="质量要求">{labelOf(QUALITY_LEVELS, project.quality)}</KV>
                <KV label="开始时间">{formatDate(project.startDate)}</KV>
                <KV label="截止时间">{formatDate(project.dueDate)}</KV>
                <KV label="完成时间">{formatDate(project.completedAt)}</KV>
                <KV label="免费修改">{project.maxRevisions} 次</KV>
              </dl>
              {project.notes && project.status !== "cancelled" && <p className="mt-4 text-sm"><span className="text-muted">备注：</span>{project.notes}</p>}
            </div>
          </Card>
          <DeliverablesCard project={project} />
          <RevisionsCard project={project} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="收款"
              action={<Button size="sm" variant="outline" onClick={() => { setEditingPay(undefined); setPayOpen(true); }}><Plus size={14} /> 记录收款</Button>}
            />
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between">
                <PaymentBadge status={summary.status} />
                <span className="text-xs text-muted">应收 {money(summary.amount)}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-success transition-all" style={{ width: `${summary.amount ? Math.min(100, (summary.net / summary.amount) * 100) : 0}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <span>已收 <b className="text-success">{money(summary.net)}</b></span>
                <span>未收 <b className={summary.outstanding ? "text-warning" : undefined}>{money(summary.outstanding)}</b></span>
              </div>
              {payments.length > 0 && (
                <ul className="mt-3 divide-y divide-border border-t border-border">
                  {payments.map((p) => (
                    <li key={p.id} className="group flex items-center justify-between gap-2 py-2 text-sm">
                      <div className="min-w-0">
                        <div className={p.kind === "refund" ? "text-danger" : undefined}>{p.kind === "refund" ? "-" : ""}{money(p.amount)}</div>
                        <div className="text-xs text-muted">{formatDate(p.paidAt)} · {labelOf(PAYMENT_KINDS, p.kind)} · {labelOf(PAYMENT_METHODS, p.method)}</div>
                      </div>
                      <div className="flex">
                        <Button size="icon" variant="ghost" aria-label="编辑收款" onClick={() => { setEditingPay(p); setPayOpen(true); }}><Pencil size={14} /></Button>
                        <Button size="icon" variant="ghost" aria-label="删除收款" onClick={() => delPayment(p)}><Trash2 size={14} /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {service && (
            <Card>
              <CardHeader title={<span className="flex items-center gap-1.5"><Sparkles size={14} className="text-accent" /> AI 项目推荐</span>} description={`基于「${service.name}」· ${labelOf(QUALITY_LEVELS, project.quality)}`} />
              <div className="px-4 pb-4">
                <RecommendPanel
                  compact
                  input={{
                    category: service.category,
                    budget: project.budget,
                    daysAvailable: project.dueDate && !["delivered", "completed", "cancelled"].includes(project.status) ? diffDays(project.dueDate, new Date()) : undefined,
                    quality: project.quality,
                    baseHours: service.estimatedHours,
                    basePrice: service.basePrice,
                  }}
                />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="报价单" action={<LinkButton size="sm" href={`/quotes/new?projectId=${project.id}`}><Plus size={14} /> 新建</LinkButton>} />
            {quotes.length === 0 ? (
              <p className="px-4 pb-4 text-xs text-muted">暂无报价单</p>
            ) : (
              <ul className="divide-y divide-border px-4 pb-2">
                {quotes.map((q) => (
                  <li key={q.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/quotes/${q.id}`} className="hover:text-accent">{q.number}</Link>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums">{money(calcQuote(q).total)}</span>
                      <Badge tone={toneOf(QUOTE_STATUSES, q.status)}>{labelOf(QUOTE_STATUSES, q.status)}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <ProjectFormDialog open={editOpen} onClose={() => setEditOpen(false)} project={project} />
      <PaymentFormDialog open={payOpen} onClose={() => setPayOpen(false)} projectId={project.id} payment={editingPay} />
    </>
  );
}
