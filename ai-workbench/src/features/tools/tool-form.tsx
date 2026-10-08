"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { useFeedback } from "@/components/ui/feedback";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { useWorkbench } from "@/lib/store";
import type { ServiceCategory, Tool } from "@/lib/types";
import { cn } from "@/lib/utils";

const empty = {
  name: "", category: "", url: "", usage: "", pricing: "", openSource: false, local: false,
  suitableFor: [] as ServiceCategory[], experience: "", rating: "4", notes: "",
};

export function ToolFormDialog({ open, onClose, tool }: { open: boolean; onClose: () => void; tool?: Tool }) {
  const { data, create, update } = useWorkbench();
  const { toast } = useFeedback();
  const [f, setF] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setF(
      tool
        ? { name: tool.name, category: tool.category, url: tool.url, usage: tool.usage, pricing: tool.pricing, openSource: tool.openSource, local: tool.local,
            suitableFor: tool.suitableFor, experience: tool.experience ?? "", rating: String(tool.rating), notes: tool.notes ?? "" }
        : empty,
    );
  }, [open, tool]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const categories = [...new Set(data.tools.map((t) => t.category))];

  function submit(ev?: React.FormEvent) {
    ev?.preventDefault();
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "请填写工具名称";
    else if (data.tools.some((t) => t.name.toLowerCase() === f.name.trim().toLowerCase() && t.id !== tool?.id)) e.name = "工具库中已有同名工具";
    if (!f.category.trim()) e.category = "请填写类别";
    if (f.url && !/^https?:\/\/\S+$/i.test(f.url.trim())) e.url = "网址需以 http:// 或 https:// 开头";
    setErrors(e);
    if (Object.keys(e).length) return;
    const payload = {
      name: f.name.trim(), category: f.category.trim(), url: f.url.trim(), usage: f.usage.trim(), pricing: f.pricing.trim(),
      openSource: f.openSource, local: f.local, suitableFor: f.suitableFor, experience: f.experience.trim() || undefined,
      rating: Number(f.rating), notes: f.notes.trim() || undefined,
    };
    if (tool) {
      update("tools", tool.id, payload);
      toast("工具已更新");
    } else {
      create("tools", payload);
      toast("工具已添加");
    }
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={tool ? "编辑工具" : "添加 AI 工具"} size="lg" footer={<><Button variant="outline" onClick={onClose}>取消</Button><Button onClick={() => submit()}>保存</Button></>}>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <Field label="工具名称" htmlFor="t-name" required error={errors.name}>
          <Input id="t-name" value={f.name} onChange={(e) => set("name", e.target.value)} invalid={!!errors.name} />
        </Field>
        <Field label="类别" htmlFor="t-cat" required error={errors.category}>
          <Input id="t-cat" list="tool-categories" value={f.category} onChange={(e) => set("category", e.target.value)} invalid={!!errors.category} placeholder="如：AI 绘画" />
          <datalist id="tool-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="网址" htmlFor="t-url" error={errors.url}>
          <Input id="t-url" value={f.url} onChange={(e) => set("url", e.target.value)} invalid={!!errors.url} placeholder="https://" />
        </Field>
        <Field label="费用" htmlFor="t-price">
          <Input id="t-price" value={f.pricing} onChange={(e) => set("pricing", e.target.value)} placeholder="免费 / $20/月" />
        </Field>
        <Field label="用途" htmlFor="t-usage" className="sm:col-span-2">
          <Input id="t-usage" value={f.usage} onChange={(e) => set("usage", e.target.value)} />
        </Field>
        <Field label="适合哪些项目" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {SERVICE_CATEGORIES.map((c) => {
              const on = f.suitableFor.includes(c.value);
              return (
                <button key={c.value} type="button" aria-pressed={on}
                  onClick={() => set("suitableFor", on ? f.suitableFor.filter((x) => x !== c.value) : [...f.suitableFor, c.value])}
                  className={cn("rounded-md border px-2 py-1 text-xs transition-colors", on ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-fg")}>
                  {c.label}
                </button>
              );
            })}
          </div>
        </Field>
        <div className="flex flex-wrap items-end gap-5 sm:col-span-2">
          <Field label="评分" htmlFor="t-rating">
            <Select id="t-rating" value={f.rating} onChange={(e) => set("rating", e.target.value)} className="w-28">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
            </Select>
          </Field>
          <div className="flex h-9 items-center gap-5">
            <Checkbox id="t-oss" label="开源" checked={f.openSource} onChange={(v) => set("openSource", v)} />
            <Checkbox id="t-local" label="可本地运行" checked={f.local} onChange={(v) => set("local", v)} />
          </div>
        </div>
        <Field label="使用经验" htmlFor="t-exp" className="sm:col-span-2">
          <Textarea id="t-exp" rows={2} value={f.experience} onChange={(e) => set("experience", e.target.value)} placeholder="什么场景好用、踩过什么坑" />
        </Field>
        <Field label="备注" htmlFor="t-notes" className="sm:col-span-2">
          <Textarea id="t-notes" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Dialog>
  );
}
