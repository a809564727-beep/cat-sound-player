"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, FileX, FolderPlus, Pencil, Printer, RefreshCw, Trash2 } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/misc";
import { useFeedback } from "@/components/ui/feedback";
import { PRESALE_STATUSES, QUOTE_STATUSES } from "@/lib/constants";
import { calcQuote } from "@/lib/domain/quote";
import { useWorkbench } from "@/lib/store";
import type { QuoteStatus } from "@/lib/types";
import { formatDate, money, nowISO } from "@/lib/utils";

export default function QuoteViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, update, remove, create, setProjectStatus } = useWorkbench();
  const { confirm, toast } = useFeedback();
  const quote = data.quotes.find((q) => q.id === id);
  if (!quote) return <Card><EmptyState icon={FileX} title="报价单不存在" action={<LinkButton href="/quotes">返回报价列表</LinkButton>} /></Card>;

  const client = data.clients.find((c) => c.id === quote.clientId);
  const project = quote.projectId ? data.projects.find((p) => p.id === quote.projectId) : undefined;
  const t = calcQuote(quote);
  const { settings } = data;

  const fees = [
    quote.rushFee ? ["加急费", quote.rushFee] : null,
    quote.revisionFee ? ["修改费", quote.revisionFee] : null,
    quote.otherFee ? [quote.otherFeeLabel || "其他费用", quote.otherFee] : null,
  ].filter(Boolean) as Array<[string, number]>;

  const syncToProject = async () => {
    if (!project) return;
    const ok = await confirm({ title: "同步报价到项目？", description: `将项目「${project.name}」的报价设为 ${money(t.total)}${PRESALE_STATUSES.includes(project.status) ? "，并把状态改为「待确认」" : ""}。` });
    if (!ok) return;
    update("projects", project.id, { quotedPrice: t.total, ...(quote.status === "accepted" ? { finalPrice: t.total } : {}) });
    if (PRESALE_STATUSES.includes(project.status)) setProjectStatus(project.id, "confirming");
    toast("已同步到项目");
  };

  const createProject = () => {
    const first = quote.items[0];
    const service = first?.serviceId ? data.services.find((s) => s.id === first.serviceId) : undefined;
    const ts = nowISO();
    const p = create("projects", {
      name: quote.items.map((i) => i.name).join(" + ").slice(0, 40) || "新项目",
      clientId: quote.clientId,
      serviceId: service?.id,
      requirement: quote.notes ?? "",
      quotedPrice: t.total,
      finalPrice: quote.status === "accepted" ? t.total : undefined,
      status: quote.status === "accepted" ? "in_progress" : "confirming",
      priority: "medium",
      quality: "standard",
      maxRevisions: service?.defaultRevisions ?? 2,
      deliverables: [],
      revisions: [],
      statusChangedAt: ts,
    });
    update("quotes", quote.id, { projectId: p.id });
    toast("已根据报价创建项目");
    router.push(`/projects/${p.id}`);
  };

  const copyText = async () => {
    const lines = [
      `【${settings.businessName}】报价单 ${quote.number}`,
      `客户：${client?.name ?? ""}`,
      ...quote.items.map((i) => `· ${i.name} ¥${i.unitPrice} × ${i.quantity}`),
      ...quote.addons.map((a) => `· ${a.name} ¥${a.price}`),
      ...fees.map(([n, v]) => `· ${n} ¥${v}`),
      t.discount ? `原价 ${money(t.subtotal)}，优惠 -${money(t.discount)}` : "",
      `最终报价：${money(t.total)}`,
      quote.validUntil ? `有效期至 ${formatDate(quote.validUntil)}` : "",
      quote.notes ?? "",
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast("报价文字已复制，可直接粘贴发给客户");
    } catch {
      toast("复制失败，请手动选择文字复制", "error");
    }
  };

  const del = async () => {
    if (!(await confirm({ title: `删除报价单 ${quote.number}？`, confirmText: "删除", danger: true }))) return;
    remove("quotes", quote.id);
    toast("报价单已删除");
    router.push("/quotes");
  };

  return (
    <>
      <div className="no-print mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/quotes" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"><ArrowLeft size={14} /> 报价</Link>
        <div className="flex flex-wrap gap-2">
          <select
            value={quote.status}
            onChange={(e) => { update("quotes", quote.id, { status: e.target.value as QuoteStatus }); toast("状态已更新"); }}
            className="h-9 cursor-pointer rounded-lg border border-border bg-surface px-2 text-sm"
            aria-label="报价状态"
          >
            {QUOTE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <Button variant="outline" onClick={copyText}><Copy size={15} /> 复制文字</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer size={15} /> 打印 / PDF</Button>
          {project ? (
            <Button variant="outline" onClick={syncToProject}><RefreshCw size={15} /> 同步到项目</Button>
          ) : (
            <Button variant="outline" onClick={createProject}><FolderPlus size={15} /> 创建项目</Button>
          )}
          <LinkButton href={`/quotes/${quote.id}/edit`}><Pencil size={15} /> 编辑</LinkButton>
          <Button variant="ghost" onClick={del} aria-label="删除报价单"><Trash2 size={15} /></Button>
        </div>
      </div>

      <article className="print-area mx-auto max-w-3xl rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow)] sm:p-10" data-testid="quote-sheet">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-medium tracking-widest text-accent">QUOTATION</div>
            <h1 className="mt-1 text-2xl font-semibold">报价单</h1>
            <p className="mt-1 text-sm text-muted">编号 {quote.number}</p>
          </div>
          <div className="text-sm sm:text-right">
            <div className="font-semibold">{settings.businessName}</div>
            {settings.ownerName && <div className="text-muted">{settings.ownerName}</div>}
            <div className="text-muted">{settings.contact}</div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 py-6 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted">客户</div>
            <div className="mt-0.5 font-medium">{client?.name ?? "—"}</div>
            {client?.company && <div className="text-muted">{client.company}</div>}
          </div>
          <div>
            <div className="text-xs text-muted">报价日期</div>
            <div className="mt-0.5">{formatDate(quote.createdAt)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">有效期至</div>
            <div className="mt-0.5">{formatDate(quote.validUntil)}</div>
          </div>
        </section>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs text-muted">
                <th className="py-2 font-medium">项目</th>
                <th className="py-2 text-right font-medium">单价</th>
                <th className="py-2 text-right font-medium">数量</th>
                <th className="py-2 text-right font-medium">金额</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((i) => (
                <tr key={i.id} className="border-b border-border">
                  <td className="py-2.5">{i.name}</td>
                  <td className="py-2.5 text-right tabular-nums">{money(i.unitPrice)}</td>
                  <td className="py-2.5 text-right tabular-nums">{i.quantity}</td>
                  <td className="py-2.5 text-right tabular-nums">{money(i.unitPrice * i.quantity)}</td>
                </tr>
              ))}
              {quote.addons.map((a) => (
                <tr key={a.id} className="border-b border-border">
                  <td className="py-2.5">{a.name} <span className="text-xs text-muted">（附加）</span></td>
                  <td className="py-2.5 text-right tabular-nums">{money(a.price)}</td>
                  <td className="py-2.5 text-right tabular-nums">1</td>
                  <td className="py-2.5 text-right tabular-nums">{money(a.price)}</td>
                </tr>
              ))}
              {fees.map(([n, v]) => (
                <tr key={n} className="border-b border-border">
                  <td className="py-2.5">{n}</td>
                  <td className="py-2.5 text-right tabular-nums">{money(v)}</td>
                  <td className="py-2.5 text-right tabular-nums">1</td>
                  <td className="py-2.5 text-right tabular-nums">{money(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted">原价</span><span className="tabular-nums">{money(t.subtotal)}</span></div>
          <div className="flex justify-between">
            <span className="text-muted">优惠{quote.discountType === "percent" && quote.discountValue ? `（${100 - quote.discountValue >= 0 ? ((100 - quote.discountValue) / 10).toFixed(1).replace(/\.0$/, "") : 0} 折）` : ""}</span>
            <span className="tabular-nums text-success">-{money(t.discount)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <span className="font-medium">最终报价</span>
            <span className="text-2xl font-semibold tabular-nums">{money(t.total)}</span>
          </div>
        </div>

        {(quote.notes || settings.quoteFooter) && (
          <footer className="mt-8 space-y-2 border-t border-border pt-4 text-xs leading-relaxed text-muted">
            {quote.notes && <p><span className="font-medium text-fg">备注：</span>{quote.notes}</p>}
            {settings.quoteFooter && <p>{settings.quoteFooter}</p>}
          </footer>
        )}
      </article>
      {project && (
        <p className="no-print mt-3 text-center text-xs text-muted">
          关联项目：<Link href={`/projects/${project.id}`} className="text-accent hover:underline">{project.name}</Link>
        </p>
      )}
    </>
  );
}
