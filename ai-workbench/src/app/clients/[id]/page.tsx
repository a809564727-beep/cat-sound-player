"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, FolderKanban, Mail, MessageCircle, Pencil, Phone, Plus, Trash2, UserX } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState, StatCard } from "@/components/ui/misc";
import { useFeedback } from "@/components/ui/feedback";
import { ClientFormDialog } from "@/features/clients/client-form";
import { ProjectFormDialog } from "@/features/projects/project-form";
import { DueText, PaymentBadge, StatusBadge } from "@/features/projects/badges";
import { CHANNELS, QUOTE_STATUSES, labelOf, toneOf } from "@/lib/constants";
import { calcQuote } from "@/lib/domain/quote";
import { projectAmount } from "@/lib/domain/payments";
import { isDeal } from "@/lib/domain/stats";
import { useWorkbench } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { formatDate, money, sum } from "@/lib/utils";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, remove } = useWorkbench();
  const { serviceName, summaryOf } = useLookups();
  const { confirm, toast } = useFeedback();
  const [editOpen, setEditOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const client = data.clients.find((c) => c.id === id);
  if (!client) {
    return <Card><EmptyState icon={UserX} title="客户不存在" description="可能已被删除" action={<LinkButton href="/clients">返回客户列表</LinkButton>} /></Card>;
  }

  const projects = data.projects.filter((p) => p.clientId === client.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const quotes = data.quotes.filter((q) => q.clientId === client.id);
  const deals = projects.filter(isDeal);
  const received = sum(projects.map((p) => summaryOf(p.id).net));
  const outstanding = sum(projects.filter((p) => p.status !== "cancelled").map((p) => (isDeal(p) ? summaryOf(p.id).outstanding : 0)));

  const del = async () => {
    const ok = await confirm({
      title: `删除客户「${client.name}」？`,
      description: projects.length ? `将同时删除 ${projects.length} 个项目及其收款、报价记录，无法恢复。` : "删除后无法恢复。",
      confirmText: "删除",
      danger: true,
    });
    if (!ok) return;
    remove("clients", client.id);
    toast("客户已删除");
    router.push("/clients");
  };

  return (
    <>
      <Link href="/clients" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg"><ArrowLeft size={14} /> 客户</Link>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
            <Badge tone={toneOf(CHANNELS, client.channel)}>{labelOf(CHANNELS, client.channel)}</Badge>
            {client.tags.map((t) => <Badge key={t}>{t}</Badge>)}
          </div>
          {client.company && <p className="mt-1 text-sm text-muted">{client.company}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {client.wechat && <span className="flex items-center gap-1"><MessageCircle size={14} /> {client.wechat}</span>}
            {client.phone && <a href={`tel:${client.phone}`} className="flex items-center gap-1 hover:text-fg"><Phone size={14} /> {client.phone}</a>}
            {client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-1 break-all hover:text-fg"><Mail size={14} /> {client.email}</a>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setProjectOpen(true)}><Plus size={16} /> 新建项目</Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil size={16} /> 编辑</Button>
          <Button variant="ghost" onClick={del} aria-label="删除客户"><Trash2 size={16} /></Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="项目总数" value={projects.length} hint={`成交 ${deals.length} 个`} />
        <StatCard label="成交总额" value={money(sum(deals.map(projectAmount)))} />
        <StatCard label="已收款" value={money(received)} />
        <StatCard label="未收款" value={money(outstanding)} tone={outstanding > 0 ? "down" : undefined} hint={outstanding > 0 ? "记得跟进" : "已结清"} />
      </div>

      {client.notes && (
        <Card className="mb-4 p-4 text-sm"><span className="text-muted">备注：</span>{client.notes}</Card>
      )}

      <Card className="mb-4">
        <CardHeader title="历史项目" description={`首次合作 ${formatDate(projects[projects.length - 1]?.createdAt)}`} />
        {projects.length === 0 ? (
          <EmptyState icon={FolderKanban} title="还没有项目" action={<Button size="sm" onClick={() => setProjectOpen(true)}><Plus size={14} /> 新建项目</Button>} className="py-6" />
        ) : (
          <ul className="divide-y divide-border">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-surface-2/50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className="font-medium">{p.name}</span><StatusBadge status={p.status} /></div>
                    <div className="text-xs text-muted">{serviceName(p.serviceId)} · 创建于 {formatDate(p.createdAt)} · <DueText due={p.dueDate} status={p.status} /></div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="tabular-nums">{money(projectAmount(p) || undefined)}</span>
                    <PaymentBadge status={summaryOf(p.id).status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {quotes.length > 0 && (
        <Card>
          <CardHeader title="报价单" />
          <ul className="divide-y divide-border">
            {quotes.map((q) => (
              <li key={q.id}>
                <Link href={`/quotes/${q.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-2/50">
                  <span>{q.number} <span className="text-xs text-muted">· {formatDate(q.createdAt)}</span></span>
                  <span className="flex items-center gap-2"><span className="tabular-nums">{money(calcQuote(q).total)}</span><Badge tone={toneOf(QUOTE_STATUSES, q.status)}>{labelOf(QUOTE_STATUSES, q.status)}</Badge></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ClientFormDialog open={editOpen} onClose={() => setEditOpen(false)} client={client} />
      <ProjectFormDialog open={projectOpen} onClose={() => setProjectOpen(false)} defaults={{ clientId: client.id }} />
    </>
  );
}
