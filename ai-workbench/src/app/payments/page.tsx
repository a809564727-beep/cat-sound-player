"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Card, EmptyState, PageHeader, Segmented, StatCard } from "@/components/ui/misc";
import { useFeedback } from "@/components/ui/feedback";
import { PaymentFormDialog } from "@/features/payments/payment-form";
import { PaymentBadge, StatusBadge } from "@/features/projects/badges";
import { PAYMENT_KINDS, PAYMENT_METHODS, PAYMENT_STATUSES, labelOf } from "@/lib/constants";
import { incomeInMonth, isDeal } from "@/lib/domain/stats";
import { useWorkbench } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import type { Payment } from "@/lib/types";
import { formatDate, money, monthKey, sum } from "@/lib/utils";

export default function PaymentsPage() {
  const { data, remove } = useWorkbench();
  const { clientName, projectById, summaryOf } = useLookups();
  const { confirm, toast } = useFeedback();
  const [tab, setTab] = useState<"receivable" | "records">("receivable");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | undefined>();
  const [presetProject, setPresetProject] = useState<string | undefined>();

  const receivables = useMemo(
    () =>
      data.projects
        .filter((p) => isDeal(p) || data.payments.some((x) => x.projectId === p.id))
        .map((p) => ({ project: p, summary: summaryOf(p.id) }))
        .filter((r) => !statusFilter || r.summary.status === statusFilter)
        .sort((a, b) => b.summary.outstanding - a.summary.outstanding),
    [data.projects, data.payments, statusFilter, summaryOf],
  );

  const records = useMemo(
    () => data.payments.filter((p) => !methodFilter || p.method === methodFilter).sort((a, b) => (a.paidAt < b.paidAt ? 1 : a.paidAt > b.paidAt ? -1 : a.createdAt < b.createdAt ? 1 : -1)),
    [data.payments, methodFilter],
  );

  const allDeals = data.projects.filter(isDeal).map((p) => summaryOf(p.id));
  const receivableTotal = sum(allDeals.map((s) => s.amount));
  const receivedTotal = sum(allDeals.map((s) => s.net));
  const outstandingTotal = sum(allDeals.map((s) => s.outstanding));

  const openNew = (projectId?: string) => {
    setEditing(undefined);
    setPresetProject(projectId);
    setFormOpen(true);
  };

  const del = async (p: Payment) => {
    if (!(await confirm({ title: "删除这条收款记录？", description: `${money(p.amount)} · ${formatDate(p.paidAt)}`, confirmText: "删除", danger: true }))) return;
    remove("payments", p.id);
    toast("收款记录已删除");
  };

  return (
    <>
      <PageHeader title="收款" description="跟踪每个项目的应收、已收和未收" actions={<Button onClick={() => openNew()}><Plus size={16} /> 记录收款</Button>} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="本月实收" value={money(incomeInMonth(data.payments, monthKey(new Date())))} />
        <StatCard label="应收总额（已成交）" value={money(receivableTotal)} />
        <StatCard label="已收" value={money(receivedTotal)} tone="up" hint={receivableTotal ? `回款率 ${Math.round((receivedTotal / receivableTotal) * 100)}%` : undefined} />
        <StatCard label="未收" value={money(outstandingTotal)} tone={outstandingTotal ? "down" : undefined} hint={`${allDeals.filter((s) => s.outstanding > 0).length} 个项目待收`} />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmented value={tab} onChange={setTab} options={[{ value: "receivable", label: "应收账款" }, { value: "records", label: "收款记录" }]} />
        {tab === "receivable" ? (
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-32" aria-label="按付款状态筛选">
            <option value="">全部状态</option>
            {PAYMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        ) : (
          <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="w-32" aria-label="按渠道筛选">
            <option value="">全部渠道</option>
            {PAYMENT_METHODS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        )}
      </div>

      <Card>
        {tab === "receivable" ? (
          receivables.length === 0 ? (
            <EmptyState icon={Wallet} title="暂无应收项目" description="项目进入「进行中」后会出现在这里" />
          ) : (
            <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-4 py-2.5 font-medium">项目</th>
                    <th className="px-4 py-2.5 text-right font-medium">报价/成交</th>
                    <th className="px-4 py-2.5 text-right font-medium">已收</th>
                    <th className="px-4 py-2.5 text-right font-medium">未收</th>
                    <th className="px-4 py-2.5 font-medium">付款状态</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {receivables.map(({ project: p, summary: s }) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                      <td className="px-4 py-3">
                        <Link href={`/projects/${p.id}`} className="font-medium hover:text-accent">{p.name}</Link>
                        <div className="flex items-center gap-2 text-xs text-muted">{clientName(p.clientId)} <StatusBadge status={p.status} /></div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(s.amount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-success">{money(s.net)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${s.outstanding ? "text-warning" : "text-muted"}`}>{money(s.outstanding)}</td>
                      <td className="px-4 py-3"><PaymentBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {s.outstanding > 0 && <Button size="sm" variant="outline" onClick={() => openNew(p.id)}>收款</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 手机卡片：已收/未收/收款按钮一屏可见 */}
            <ul className="divide-y divide-border md:hidden">
              {receivables.map(({ project: p, summary: s }) => (
                <li key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/projects/${p.id}`} className="min-w-0 font-medium hover:text-accent">{p.name}</Link>
                    <PaymentBadge status={s.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">{clientName(p.clientId)} <StatusBadge status={p.status} /></div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div><div className="text-muted">应收</div><div className="mt-0.5 tabular-nums">{money(s.amount)}</div></div>
                      <div><div className="text-muted">已收</div><div className="mt-0.5 tabular-nums text-success">{money(s.net)}</div></div>
                      <div><div className="text-muted">未收</div><div className={`mt-0.5 tabular-nums ${s.outstanding ? "text-warning" : "text-muted"}`}>{money(s.outstanding)}</div></div>
                    </div>
                    {s.outstanding > 0 && <Button size="sm" variant="outline" onClick={() => openNew(p.id)}>收款</Button>}
                  </div>
                </li>
              ))}
            </ul>
            </>
          )
        ) : records.length === 0 ? (
          <EmptyState icon={Wallet} title="还没有收款记录" action={<Button onClick={() => openNew()}><Plus size={16} /> 记录收款</Button>} />
        ) : (
          <ul className="divide-y divide-border">
            {records.map((r) => {
              const p = projectById.get(r.projectId);
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={`font-semibold tabular-nums ${r.kind === "refund" ? "text-danger" : ""}`}>{r.kind === "refund" ? "-" : "+"}{money(r.amount)}</span>
                      <span className="text-xs text-muted">{labelOf(PAYMENT_KINDS, r.kind)} · {labelOf(PAYMENT_METHODS, r.method)}</span>
                    </div>
                    <div className="truncate text-xs text-muted">
                      {formatDate(r.paidAt)} · {p ? <Link href={`/projects/${p.id}`} className="hover:text-accent">{p.name}</Link> : "项目已删除"} · {p ? clientName(p.clientId) : ""}
                      {r.note ? ` · ${r.note}` : ""}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" aria-label="编辑收款" onClick={() => { setEditing(r); setPresetProject(undefined); setFormOpen(true); }}><Pencil size={15} /></Button>
                  <Button size="icon" variant="ghost" aria-label="删除收款" onClick={() => del(r)}><Trash2 size={15} /></Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <PaymentFormDialog open={formOpen} onClose={() => setFormOpen(false)} payment={editing} projectId={presetProject} />
    </>
  );
}
