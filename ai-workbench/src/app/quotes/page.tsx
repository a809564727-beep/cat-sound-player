"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Calculator, Plus, Search } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { QUOTE_STATUSES, labelOf, toneOf } from "@/lib/constants";
import { calcQuote } from "@/lib/domain/quote";
import { useWorkbench } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { diffDays, formatDate, includesText, money, percent, sum } from "@/lib/utils";

export default function QuotesPage() {
  const { data } = useWorkbench();
  const { clientName, projectById } = useLookups();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const rows = useMemo(
    () =>
      data.quotes
        .map((quote) => ({ quote, total: calcQuote(quote).total }))
        .filter(({ quote }) => !status || quote.status === status)
        .filter(({ quote }) => includesText([quote.number, clientName(quote.clientId), quote.projectId ? projectById.get(quote.projectId)?.name : "", ...quote.items.map((i) => i.name)], q))
        .sort((a, b) => (a.quote.createdAt < b.quote.createdAt ? 1 : -1)),
    [data.quotes, status, q, clientName, projectById],
  );

  const decided = data.quotes.filter((x) => x.status === "accepted" || x.status === "rejected");
  const accepted = data.quotes.filter((x) => x.status === "accepted");
  const pending = data.quotes.filter((x) => x.status === "sent" || x.status === "draft");

  return (
    <>
      <PageHeader title="报价" description="生成清晰的报价单，可打印或导出 PDF 发给客户" actions={<LinkButton href="/quotes/new" variant="primary"><Plus size={16} /> 新建报价</LinkButton>} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="报价单总数" value={data.quotes.length} />
        <StatCard label="待回复金额" value={money(sum(pending.map((x) => calcQuote(x).total)))} hint={`${pending.length} 份草稿/已发送`} />
        <StatCard label="已接受金额" value={money(sum(accepted.map((x) => calcQuote(x).total)))} />
        <StatCard label="报价成功率" value={decided.length ? percent(accepted.length / decided.length) : "—"} hint="已接受 / 已有结果" />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索编号、客户、服务…" className="pl-9" aria-label="搜索报价" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-32" aria-label="按状态筛选">
          <option value="">全部状态</option>
          {QUOTE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={Calculator} title={data.quotes.length ? "没有匹配的报价单" : "还没有报价单"} description="选择客户和服务，系统自动计算折扣、加急费和最终报价" action={!data.quotes.length && <LinkButton href="/quotes/new" variant="primary"><Plus size={16} /> 新建报价</LinkButton>} />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(({ quote, total }) => {
              const expired = quote.validUntil && (quote.status === "sent" || quote.status === "draft") && diffDays(quote.validUntil, new Date()) < 0;
              return (
                <li key={quote.id}>
                  <Link href={`/quotes/${quote.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-surface-2/50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{clientName(quote.clientId)}</span>
                        <span className="text-xs text-muted">{quote.number}</span>
                        {expired && <Badge tone="red">已过期</Badge>}
                      </div>
                      <div className="truncate text-xs text-muted">
                        {quote.items.map((i) => i.name).join("、")} · {formatDate(quote.createdAt)}
                        {quote.projectId && projectById.get(quote.projectId) ? ` · 项目：${projectById.get(quote.projectId)!.name}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold tabular-nums">{money(total)}</span>
                      <Badge tone={toneOf(QUOTE_STATUSES, quote.status)}>{labelOf(QUOTE_STATUSES, quote.status)}</Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
