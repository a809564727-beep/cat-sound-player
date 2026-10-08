"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, parseNum } from "@/components/ui/field";
import { Card, CardHeader } from "@/components/ui/misc";
import { useFeedback } from "@/components/ui/feedback";
import { QUOTE_STATUSES } from "@/lib/constants";
import { calcQuote, nextQuoteNumber } from "@/lib/domain/quote";
import { useWorkbench } from "@/lib/store";
import type { Quote, QuoteStatus } from "@/lib/types";
import { addDays, money, toDateKey, uid } from "@/lib/utils";

interface ItemRow { id: string; serviceId: string; name: string; unitPrice: string; quantity: string }
interface AddonRow { id: string; name: string; price: string }

const ADDON_PRESETS: Array<[string, number]> = [
  ["源文件交付", 100],
  ["商用授权", 200],
  ["额外尺寸适配", 50],
  ["1 个月售后维护", 300],
];

export function QuoteEditor({ quote, presetProjectId, presetClientId }: { quote?: Quote; presetProjectId?: string; presetClientId?: string }) {
  const router = useRouter();
  const { data, create, update } = useWorkbench();
  const { toast } = useFeedback();

  const presetProject = presetProjectId ? data.projects.find((p) => p.id === presetProjectId) : undefined;
  const presetService = presetProject?.serviceId ? data.services.find((s) => s.id === presetProject.serviceId) : undefined;

  const [clientId, setClientId] = useState(quote?.clientId ?? presetProject?.clientId ?? presetClientId ?? "");
  const [projectId, setProjectId] = useState(quote?.projectId ?? presetProject?.id ?? "");
  const [items, setItems] = useState<ItemRow[]>(() =>
    quote
      ? quote.items.map((i) => ({ id: i.id, serviceId: i.serviceId ?? "", name: i.name, unitPrice: String(i.unitPrice), quantity: String(i.quantity) }))
      : [{ id: uid("qi"), serviceId: presetService?.id ?? "", name: presetService?.name ?? "", unitPrice: presetService ? String(presetService.basePrice) : "", quantity: String(presetProject?.quantity ?? 1) }],
  );
  const [addons, setAddons] = useState<AddonRow[]>(() => quote?.addons.map((a) => ({ id: a.id, name: a.name, price: String(a.price) })) ?? []);
  const [discountType, setDiscountType] = useState<Quote["discountType"]>(quote?.discountType ?? "percent");
  const [discountValue, setDiscountValue] = useState(quote ? String(quote.discountValue || "") : "");
  const [rushFee, setRushFee] = useState(quote ? String(quote.rushFee || "") : "");
  const [revisionFee, setRevisionFee] = useState(quote ? String(quote.revisionFee || "") : "");
  const [otherFee, setOtherFee] = useState(quote ? String(quote.otherFee || "") : "");
  const [otherFeeLabel, setOtherFeeLabel] = useState(quote?.otherFeeLabel ?? "");
  const [validUntil, setValidUntil] = useState(quote?.validUntil ?? toDateKey(addDays(new Date(), 7)));
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [status, setStatus] = useState<QuoteStatus>(quote?.status ?? "draft");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clientProjects = data.projects.filter((p) => p.clientId === clientId);

  const draft = useMemo(
    () => ({
      items: items.map((i) => ({ id: i.id, serviceId: i.serviceId || undefined, name: i.name.trim(), unitPrice: parseNum(i.unitPrice) ?? 0, quantity: parseNum(i.quantity) ?? 0 })),
      addons: addons.map((a) => ({ id: a.id, name: a.name.trim(), price: parseNum(a.price) ?? 0 })),
      discountType,
      discountValue: parseNum(discountValue) ?? 0,
      rushFee: parseNum(rushFee) ?? 0,
      revisionFee: parseNum(revisionFee) ?? 0,
      otherFee: parseNum(otherFee) ?? 0,
    }),
    [items, addons, discountType, discountValue, rushFee, revisionFee, otherFee],
  );
  const totals = calcQuote(draft);

  const setItem = (id: string, patch: Partial<ItemRow>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const setAddon = (id: string, patch: Partial<AddonRow>) => setAddons((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  function pickService(rowId: string, serviceId: string) {
    const s = data.services.find((x) => x.id === serviceId);
    setItem(rowId, s ? { serviceId, name: s.name, unitPrice: String(s.basePrice) } : { serviceId: "" });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!clientId) e.client = "请选择客户";
    if (!items.length) e.items = "至少添加一项服务";
    items.forEach((i) => {
      if (!i.name.trim()) e[`name-${i.id}`] = "请填写名称";
      const p = parseNum(i.unitPrice);
      if (p === undefined || p < 0) e[`price-${i.id}`] = "单价无效";
      const q = parseNum(i.quantity);
      if (q === undefined || q <= 0 || !Number.isInteger(q)) e[`qty-${i.id}`] = "数量需为正整数";
    });
    addons.forEach((a) => {
      if (!a.name.trim()) e[`aname-${a.id}`] = "请填写名称";
      const p = parseNum(a.price);
      if (p === undefined || p < 0) e[`aprice-${a.id}`] = "金额无效";
    });
    const dv = parseNum(discountValue);
    if (discountValue && (dv === undefined || dv < 0)) e.discount = "折扣无效";
    else if (discountType === "percent" && (dv ?? 0) > 100) e.discount = "百分比不能超过 100";
    for (const [k, v] of [["rush", rushFee], ["revision", revisionFee], ["other", otherFee]] as const) {
      const n = parseNum(v);
      if (v && (n === undefined || n < 0)) e[k] = "金额无效";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function save() {
    if (!validate()) {
      toast("请检查表单中标红的字段", "error");
      return;
    }
    const payload = {
      ...draft,
      clientId,
      projectId: projectId || undefined,
      otherFeeLabel: otherFeeLabel.trim() || undefined,
      validUntil: validUntil || undefined,
      notes: notes.trim() || undefined,
      status,
    };
    if (quote) {
      update("quotes", quote.id, payload);
      toast("报价单已保存");
      router.push(`/quotes/${quote.id}`);
    } else {
      const q = create("quotes", { ...payload, number: nextQuoteNumber(data.quotes.map((x) => x.number)) });
      toast("报价单已生成");
      router.push(`/quotes/${q.id}`);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="客户" htmlFor="q-client" required error={errors.client}>
              <Select id="q-client" value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId(""); }} invalid={!!errors.client}>
                <option value="">选择客户</option>
                {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? `（${c.company}）` : ""}</option>)}
              </Select>
            </Field>
            <Field label="关联项目" htmlFor="q-project" hint="选填，关联后可一键同步报价到项目">
              <Select id="q-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!clientId}>
                <option value="">不关联</option>
                {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="服务项目" action={<Button size="sm" variant="outline" onClick={() => setItems((l) => [...l, { id: uid("qi"), serviceId: "", name: "", unitPrice: "", quantity: "1" }])}><Plus size={14} /> 添加服务</Button>} />
          <div className="space-y-3 px-4 pb-4">
            {errors.items && <p className="text-xs text-danger">{errors.items}</p>}
            {items.map((i, idx) => (
              <div key={i.id} className="grid grid-cols-12 gap-2 rounded-lg border border-border p-3" data-testid="quote-item">
                <div className="col-span-12 sm:col-span-4">
                  <Select value={i.serviceId} onChange={(e) => pickService(i.id, e.target.value)} aria-label={`第${idx + 1}项服务`}>
                    <option value="">自定义服务</option>
                    {data.services.filter((s) => s.active || s.id === i.serviceId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </div>
                <div className="col-span-12 sm:col-span-4">
                  <Input value={i.name} onChange={(e) => setItem(i.id, { name: e.target.value })} placeholder="名称" aria-label={`第${idx + 1}项名称`} invalid={!!errors[`name-${i.id}`]} />
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <Input inputMode="decimal" value={i.unitPrice} onChange={(e) => setItem(i.id, { unitPrice: e.target.value })} placeholder="单价" aria-label={`第${idx + 1}项单价`} invalid={!!errors[`price-${i.id}`]} />
                </div>
                <div className="col-span-5 sm:col-span-1">
                  <Input inputMode="numeric" value={i.quantity} onChange={(e) => setItem(i.id, { quantity: e.target.value })} placeholder="数量" aria-label={`第${idx + 1}项数量`} invalid={!!errors[`qty-${i.id}`]} />
                </div>
                <div className="col-span-2 flex items-center justify-end sm:col-span-1">
                  <Button size="icon" variant="ghost" onClick={() => setItems((l) => l.filter((x) => x.id !== i.id))} aria-label="删除此项" disabled={items.length === 1}><Trash2 size={15} /></Button>
                </div>
                <div className="col-span-12 text-right text-xs text-muted">
                  小计 {money((parseNum(i.unitPrice) ?? 0) * (parseNum(i.quantity) ?? 0))}
                  {(errors[`name-${i.id}`] || errors[`price-${i.id}`] || errors[`qty-${i.id}`]) && (
                    <span className="ml-2 text-danger">{errors[`name-${i.id}`] || errors[`price-${i.id}`] || errors[`qty-${i.id}`]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="附加服务" description="源文件、商用授权、售后维护等" action={<Button size="sm" variant="outline" onClick={() => setAddons((l) => [...l, { id: uid("qa"), name: "", price: "" }])}><Plus size={14} /> 添加</Button>} />
          <div className="space-y-2 px-4 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {ADDON_PRESETS.map(([name, price]) => (
                <button key={name} type="button" onClick={() => setAddons((l) => [...l, { id: uid("qa"), name, price: String(price) }])} className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted hover:border-accent hover:text-accent">
                  + {name} ¥{price}
                </button>
              ))}
            </div>
            {addons.map((a) => (
              <div key={a.id} className="flex gap-2">
                <Input value={a.name} onChange={(e) => setAddon(a.id, { name: e.target.value })} placeholder="附加服务名称" aria-label="附加服务名称" invalid={!!errors[`aname-${a.id}`]} />
                <Input value={a.price} onChange={(e) => setAddon(a.id, { price: e.target.value })} placeholder="¥" inputMode="decimal" className="w-28" aria-label="附加服务金额" invalid={!!errors[`aprice-${a.id}`]} />
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setAddons((l) => l.filter((x) => x.id !== a.id))} aria-label="删除附加服务"><Trash2 size={15} /></Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="折扣" htmlFor="q-discount" error={errors.discount} hint="折扣只作用于服务和附加服务">
              <div className="flex gap-2">
                <Select value={discountType} onChange={(e) => setDiscountType(e.target.value as Quote["discountType"])} className="w-28" aria-label="折扣方式">
                  <option value="percent">百分比 %</option>
                  <option value="amount">减免 ¥</option>
                </Select>
                <Input id="q-discount" inputMode="decimal" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === "percent" ? "如 10 表示九折" : "¥"} invalid={!!errors.discount} />
              </div>
            </Field>
            <Field label="加急费" htmlFor="q-rush" error={errors.rush}>
              <div className="flex gap-2">
                <Input id="q-rush" inputMode="decimal" value={rushFee} onChange={(e) => setRushFee(e.target.value)} placeholder="¥" invalid={!!errors.rush} />
                <Button variant="outline" className="h-9" onClick={() => setRushFee(String(Math.round(totals.itemsTotal * 0.3)))} title="按服务小计的 30% 计算"><Zap size={14} /> 30%</Button>
              </div>
            </Field>
            <Field label="修改费" htmlFor="q-revision" error={errors.revision} hint="超出免费修改次数时收取">
              <Input id="q-revision" inputMode="decimal" value={revisionFee} onChange={(e) => setRevisionFee(e.target.value)} placeholder="¥" invalid={!!errors.revision} />
            </Field>
            <Field label="其他费用" htmlFor="q-other" error={errors.other}>
              <div className="flex gap-2">
                <Input value={otherFeeLabel} onChange={(e) => setOtherFeeLabel(e.target.value)} placeholder="名称（如服务器）" aria-label="其他费用名称" />
                <Input id="q-other" inputMode="decimal" value={otherFee} onChange={(e) => setOtherFee(e.target.value)} placeholder="¥" className="w-28" invalid={!!errors.other} />
              </div>
            </Field>
            <Field label="有效期至" htmlFor="q-valid">
              <Input id="q-valid" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </Field>
            <Field label="状态" htmlFor="q-status">
              <Select id="q-status" value={status} onChange={(e) => setStatus(e.target.value as QuoteStatus)}>
                {QUOTE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="备注（显示在报价单上）" htmlFor="q-notes" className="sm:col-span-2">
              <Textarea id="q-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="交付周期、付款方式、包含的修改次数…" />
            </Field>
          </div>
        </Card>
      </div>

      <div>
        <Card className="p-4 lg:sticky lg:top-6">
          <h2 className="text-sm font-semibold">报价汇总</h2>
          <dl className="mt-3 space-y-2 text-sm" data-testid="quote-totals">
            <Row label="服务小计" value={money(totals.itemsTotal)} />
            <Row label="附加服务" value={money(totals.addonsTotal)} />
            <Row label="加急/修改/其他" value={money(totals.feesTotal)} />
            <div className="border-t border-border pt-2"><Row label="原价" value={money(totals.subtotal)} /></div>
            <Row label="优惠" value={totals.discount ? `-${money(totals.discount)}` : money(0)} className="text-success" />
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-medium">最终报价</dt>
              <dd className="text-2xl font-semibold tracking-tight" data-testid="quote-total">{money(totals.total)}</dd>
            </div>
          </dl>
          <Button className="mt-4 w-full" onClick={save}>{quote ? "保存报价单" : "生成报价单"}</Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => router.back()}>取消</Button>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between ${className ?? ""}`}>
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
