"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Calculator, CircleDollarSign, FolderKanban, Plus, ReceiptText, ShoppingBag, TrendingUp, UserPlus } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState, Segmented, StatCard, TONE_HEX } from "@/components/ui/misc";
import { BarSeries, Donut } from "@/components/charts";
import { ProjectFormDialog } from "@/features/projects/project-form";
import { ClientFormDialog } from "@/features/clients/client-form";
import { DueText, PaymentBadge, StatusBadge } from "@/features/projects/badges";
import { TaskList } from "@/features/tasks/task-list";
import { ACTIVE_STATUSES, CHANNELS, PROJECT_STATUSES, labelOf, toneOf } from "@/lib/constants";
import { generateTasks } from "@/lib/domain/tasks";
import { averageOrderValue, dealsInMonth, incomeInMonth, recentDaysOrders, statusDistribution } from "@/lib/domain/stats";
import { projectAmount } from "@/lib/domain/payments";
import { useWorkbench } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import type { Project } from "@/lib/types";
import { diffDays, formatDate, money, monthKey, sum } from "@/lib/utils";

type PipeTab = "active" | "quote" | "deliver" | "unpaid";

export default function DashboardPage() {
  const { data } = useWorkbench();
  const { clientName, summaryOf, serviceName } = useLookups();
  const [tab, setTab] = useState<PipeTab>("active");
  const [projectOpen, setProjectOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);

  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const m = useMemo(() => {
    const income = incomeInMonth(data.payments, thisMonth);
    const lastIncome = incomeInMonth(data.payments, lastMonth);
    const deals = dealsInMonth(data.projects, thisMonth);
    const tasks = generateTasks(data);
    const active = data.projects.filter((p) => ACTIVE_STATUSES.includes(p.status));
    const quote = data.projects.filter((p) => p.status === "quoting" || p.status === "communicating");
    const deliver = data.projects.filter(
      (p) => (p.status === "in_progress" || p.status === "revising") && p.dueDate && diffDays(p.dueDate, now) <= data.settings.dueSoonDays,
    );
    const unpaid = data.projects.filter((p) => ["in_progress", "client_review", "revising", "delivered", "completed"].includes(p.status) && summaryOf(p.id).outstanding > 0);
    return {
      income,
      lastIncome,
      deals,
      avg: averageOrderValue(deals.length ? deals : data.projects),
      tasks,
      active,
      quote,
      deliver,
      unpaid,
      unpaidTotal: sum(unpaid.map((p) => summaryOf(p.id).outstanding)),
      week: recentDaysOrders(data.projects, 7, now),
      status: statusDistribution(data.projects).map((s) => ({ ...s, color: TONE_HEX[toneOf(PROJECT_STATUSES, s.key as Project["status"])] })),
      recentClients: [...data.clients].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5),
    };
    // now 每次渲染都会变化，这里按数据变化重新计算即可
  }, [data, thisMonth, lastMonth, summaryOf]);

  const incomeDelta = m.lastIncome ? (m.income - m.lastIncome) / m.lastIncome : undefined;
  const pendingTasks = m.tasks.filter((t) => !t.done);
  const pipe: Record<PipeTab, Project[]> = { active: m.active, quote: m.quote, deliver: m.deliver, unpaid: m.unpaid };
  const hour = now.getHours();
  const greet = hour < 6 ? "夜深了" : hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{greet}{data.settings.ownerName ? `，${data.settings.ownerName}` : ""} 👋</h1>
          <p className="mt-1 text-sm text-muted">
            今天有 <Link href="/tasks" className="font-medium text-accent hover:underline">{pendingTasks.length} 项任务</Link>，{m.active.length} 个项目进行中
            {m.deliver.length > 0 && <>，<span className="text-warning">{m.deliver.length} 个即将到期</span></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setClientOpen(true)}><UserPlus size={16} /> 新客户</Button>
          <LinkButton href="/quotes/new"><Calculator size={16} /> 报价</LinkButton>
          <Button onClick={() => setProjectOpen(true)}><Plus size={16} /> 新建项目</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="本月收入"
          icon={TrendingUp}
          value={money(m.income)}
          tone={incomeDelta === undefined ? undefined : incomeDelta >= 0 ? "up" : "down"}
          hint={incomeDelta === undefined ? "上月无收入" : `较上月 ${incomeDelta >= 0 ? "+" : ""}${Math.round(incomeDelta * 100)}%`}
        />
        <StatCard label="本月订单数" icon={ShoppingBag} value={m.deals.length} hint={`成交额 ${money(sum(m.deals.map(projectAmount)))}`} />
        <StatCard label="平均客单价" icon={ReceiptText} value={money(m.avg)} hint={m.deals.length ? "本月成交订单" : "历史成交订单"} />
        <StatCard label="待收款" icon={CircleDollarSign} value={money(m.unpaidTotal)} tone={m.unpaidTotal ? "down" : undefined} hint={`${m.unpaid.length} 个项目`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="今日待办" description="根据截止日期、客户回复和收款情况自动生成" action={<Link href="/tasks" className="flex items-center gap-1 text-xs text-muted hover:text-fg">全部 <ArrowRight size={13} /></Link>} />
          {m.tasks.length ? <TaskList tasks={m.tasks.slice(0, 6)} compact /> : <EmptyState title="今天没有待办 🎉" className="py-8" />}
        </Card>
        <Card>
          <CardHeader title="项目状态分布" description={`共 ${data.projects.length} 个项目`} />
          <div className="px-4 pb-4">
            {m.status.length ? (
              <>
                <Donut data={m.status} height={170} centerValue={m.active.length} centerLabel="进行中" />
                <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  {m.status.map((s) => (
                    <li key={s.key} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-muted"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
                      <span className="tabular-nums">{s.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState title="暂无项目" className="py-8" />
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="项目看板" action={<Link href="/projects" className="flex items-center gap-1 text-xs text-muted hover:text-fg">全部项目 <ArrowRight size={13} /></Link>} />
          <div className="overflow-x-auto px-4 pb-2">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "active", label: `进行中 ${m.active.length}` },
                { value: "quote", label: `待报价 ${m.quote.length}` },
                { value: "deliver", label: `待交付 ${m.deliver.length}` },
                { value: "unpaid", label: `待收款 ${m.unpaid.length}` },
              ]}
            />
          </div>
          {pipe[tab].length === 0 ? (
            <EmptyState icon={FolderKanban} title="这里空空的" className="py-8" />
          ) : (
            <ul className="divide-y divide-border">
              {pipe[tab].slice(0, 6).map((p) => {
                const s = summaryOf(p.id);
                return (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-2/50">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="truncate text-xs text-muted">{clientName(p.clientId)} · {serviceName(p.serviceId)}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs">
                        {tab === "unpaid" ? (
                          <><span className="text-warning tabular-nums">未收 {money(s.outstanding)}</span><PaymentBadge status={s.status} /></>
                        ) : tab === "quote" ? (
                          <><span className="text-muted">{p.budget ? `预算 ${money(p.budget)}` : "预算未知"}</span><StatusBadge status={p.status} /></>
                        ) : (
                          <><DueText due={p.dueDate} status={p.status} /><StatusBadge status={p.status} /></>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="最近客户" action={<Link href="/clients" className="flex items-center gap-1 text-xs text-muted hover:text-fg">全部 <ArrowRight size={13} /></Link>} />
          {m.recentClients.length === 0 ? (
            <EmptyState title="还没有客户" action={<Button size="sm" onClick={() => setClientOpen(true)}>添加客户</Button>} className="py-8" />
          ) : (
            <ul className="divide-y divide-border">
              {m.recentClients.map((c) => (
                <li key={c.id}>
                  <Link href={`/clients/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2/50">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{c.name.slice(0, 1)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      <div className="truncate text-xs text-muted">{c.company ?? "个人"} · {formatDate(c.createdAt)}</div>
                    </div>
                    <Badge tone={toneOf(CHANNELS, c.channel)}>{labelOf(CHANNELS, c.channel)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="最近 7 天新增订单" description={`共 ${sum(m.week.map((d) => d.count))} 单（含咨询中）· 金额 ${money(sum(m.week.map((d) => d.amount)))}`} action={<Link href="/analytics" className="flex items-center gap-1 text-xs text-muted hover:text-fg">收入分析 <ArrowRight size={13} /></Link>} />
        <div className="px-2 pb-3">
          <BarSeries data={m.week} xKey="label" yKey="count" name="订单数" height={180} />
        </div>
      </Card>

      <ProjectFormDialog open={projectOpen} onClose={() => setProjectOpen(false)} />
      <ClientFormDialog open={clientOpen} onClose={() => setClientOpen(false)} />
    </>
  );
}
