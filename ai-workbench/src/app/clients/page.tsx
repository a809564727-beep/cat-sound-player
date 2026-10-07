"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useFeedback } from "@/components/ui/feedback";
import { ClientFormDialog } from "@/features/clients/client-form";
import { CHANNELS, labelOf, toneOf } from "@/lib/constants";
import { useWorkbench } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import type { Client } from "@/lib/types";
import { includesText, money, sum } from "@/lib/utils";

export default function ClientsPage() {
  const { data, remove } = useWorkbench();
  const { summaryOf } = useLookups();
  const { confirm, toast } = useFeedback();
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("");
  const [tag, setTag] = useState("");
  const [editing, setEditing] = useState<Client | undefined>();
  const [formOpen, setFormOpen] = useState(false);

  const allTags = useMemo(() => [...new Set(data.clients.flatMap((c) => c.tags))], [data.clients]);

  const rows = useMemo(() => {
    return data.clients
      .filter((c) => !channel || c.channel === channel)
      .filter((c) => !tag || c.tags.includes(tag))
      .filter((c) => includesText([c.name, c.company, c.wechat, c.phone, c.email, c.notes, ...c.tags], q))
      .map((c) => {
        const projects = data.projects.filter((p) => p.clientId === c.id);
        return { client: c, projectCount: projects.length, revenue: sum(projects.map((p) => summaryOf(p.id).net)) };
      });
  }, [data.clients, data.projects, channel, tag, q, summaryOf]);

  async function handleDelete(c: Client) {
    const count = data.projects.filter((p) => p.clientId === c.id).length;
    const ok = await confirm({
      title: `删除客户「${c.name}」？`,
      description: count
        ? `该客户有 ${count} 个项目，删除后这些项目及其收款、报价记录也会一并删除，且无法恢复。`
        : "删除后无法恢复。",
      confirmText: "删除",
      danger: true,
    });
    if (!ok) return;
    remove("clients", c.id);
    toast("客户已删除");
  }

  const openNew = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="客户"
        description={`共 ${data.clients.length} 位客户`}
        actions={<Button onClick={openNew}><Plus size={16} /> 新增客户</Button>}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索姓名、公司、微信、电话、标签…" className="pl-9" aria-label="搜索客户" />
        </div>
        <div className="flex gap-2">
          <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="sm:w-32" aria-label="按渠道筛选">
            <option value="">全部渠道</option>
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
          <Select value={tag} onChange={(e) => setTag(e.target.value)} className="sm:w-32" aria-label="按标签筛选">
            <option value="">全部标签</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={data.clients.length ? "没有匹配的客户" : "还没有客户"}
            description={data.clients.length ? "换个关键词或清除筛选条件试试" : "添加第一位客户，开始管理你的副业订单"}
            action={!data.clients.length && <Button onClick={openNew}><Plus size={16} /> 新增客户</Button>}
          />
        ) : (
          <>
            {/* 桌面表格 */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-4 py-2.5 font-medium">客户</th>
                    <th className="px-4 py-2.5 font-medium">渠道</th>
                    <th className="px-4 py-2.5 font-medium">联系方式</th>
                    <th className="px-4 py-2.5 font-medium">标签</th>
                    <th className="px-4 py-2.5 text-right font-medium">项目</th>
                    <th className="px-4 py-2.5 text-right font-medium">累计收款</th>
                    <th className="w-20 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ client: c, projectCount, revenue }) => (
                    <tr key={c.id} className="group border-b border-border last:border-0 hover:bg-surface-2/50">
                      <td className="px-4 py-3">
                        <Link href={`/clients/${c.id}`} className="font-medium hover:text-accent">{c.name}</Link>
                        {c.company && <div className="text-xs text-muted">{c.company}</div>}
                      </td>
                      <td className="px-4 py-3"><Badge tone={toneOf(CHANNELS, c.channel)}>{labelOf(CHANNELS, c.channel)}</Badge></td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {c.wechat && <div>微信 {c.wechat}</div>}
                        {c.phone && <div>{c.phone}</div>}
                        {c.email && <div className="max-w-48 truncate">{c.email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">{c.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{projectCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(revenue)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" aria-label={`编辑 ${c.name}`} onClick={() => { setEditing(c); setFormOpen(true); }}><Pencil size={15} /></Button>
                          <Button size="icon" variant="ghost" aria-label={`删除 ${c.name}`} onClick={() => handleDelete(c)}><Trash2 size={15} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 手机卡片 */}
            <ul className="divide-y divide-border md:hidden">
              {rows.map(({ client: c, projectCount, revenue }) => (
                <li key={c.id} className="flex items-start gap-3 p-4">
                  <Link href={`/clients/${c.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      <Badge tone={toneOf(CHANNELS, c.channel)}>{labelOf(CHANNELS, c.channel)}</Badge>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted">{[c.company, c.wechat && `微信 ${c.wechat}`, c.phone].filter(Boolean).join(" · ")}</div>
                    <div className="mt-1 text-xs text-muted">{projectCount} 个项目 · 累计 {money(revenue)}</div>
                  </Link>
                  <div className="flex shrink-0">
                    <Button size="icon" variant="ghost" aria-label={`编辑 ${c.name}`} onClick={() => { setEditing(c); setFormOpen(true); }}><Pencil size={15} /></Button>
                    <Button size="icon" variant="ghost" aria-label={`删除 ${c.name}`} onClick={() => handleDelete(c)}><Trash2 size={15} /></Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <ClientFormDialog open={formOpen} onClose={() => setFormOpen(false)} client={editing} />
    </>
  );
}
