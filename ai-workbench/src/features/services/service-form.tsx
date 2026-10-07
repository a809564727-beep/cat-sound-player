"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea, parseNum } from "@/components/ui/field";
import { useFeedback } from "@/components/ui/feedback";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { useWorkbench } from "@/lib/store";
import type { Service, ServiceCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ServiceFormDialog({ open, onClose, service }: { open: boolean; onClose: () => void; service?: Service }) {
  const { data, create, update } = useWorkbench();
  const { toast } = useFeedback();
  const [f, setF] = useState({
    name: "", category: "image" as ServiceCategory, basePrice: "", estimatedHours: "", deliverables: "", defaultRevisions: "2",
    targetCustomers: "", recommendedTools: [] as string[], cautions: "", active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setF(
      service
        ? {
            name: service.name, category: service.category, basePrice: String(service.basePrice), estimatedHours: String(service.estimatedHours),
            deliverables: service.deliverables, defaultRevisions: String(service.defaultRevisions), targetCustomers: service.targetCustomers,
            recommendedTools: service.recommendedTools, cautions: service.cautions, active: service.active,
          }
        : { name: "", category: "image", basePrice: "", estimatedHours: "", deliverables: "", defaultRevisions: "2", targetCustomers: "", recommendedTools: [], cautions: "", active: true },
    );
  }, [open, service]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const toggleTool = (name: string) => set("recommendedTools", f.recommendedTools.includes(name) ? f.recommendedTools.filter((t) => t !== name) : [...f.recommendedTools, name]);

  function submit(ev?: React.FormEvent) {
    ev?.preventDefault();
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "请填写服务名称";
    else if (data.services.some((s) => s.name === f.name.trim() && s.id !== service?.id)) e.name = "已存在同名服务";
    const price = parseNum(f.basePrice);
    if (price === undefined || price < 0) e.basePrice = "请输入有效价格";
    const hours = parseNum(f.estimatedHours);
    if (hours === undefined || hours <= 0) e.estimatedHours = "请输入大于 0 的工时";
    const rev = parseNum(f.defaultRevisions);
    if (rev === undefined || rev < 0 || !Number.isInteger(rev)) e.defaultRevisions = "请输入非负整数";
    setErrors(e);
    if (Object.keys(e).length) return;
    const payload = {
      name: f.name.trim(), category: f.category, basePrice: price!, estimatedHours: hours!, deliverables: f.deliverables.trim(),
      defaultRevisions: rev!, targetCustomers: f.targetCustomers.trim(), recommendedTools: f.recommendedTools, cautions: f.cautions.trim(), active: f.active,
    };
    if (service) {
      update("services", service.id, payload);
      toast("服务已更新");
    } else {
      create("services", payload);
      toast("服务已添加");
    }
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={service ? "编辑服务" : "新增服务"} size="lg" footer={<><Button variant="outline" onClick={onClose}>取消</Button><Button onClick={() => submit()}>保存</Button></>}>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <Field label="服务名称" htmlFor="s-name" required error={errors.name}>
          <Input id="s-name" value={f.name} onChange={(e) => set("name", e.target.value)} invalid={!!errors.name} />
        </Field>
        <Field label="类别" htmlFor="s-cat" hint="决定 AI 推荐使用的规则">
          <Select id="s-cat" value={f.category} onChange={(e) => set("category", e.target.value as ServiceCategory)}>
            {SERVICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          <Field label="基础价格 ¥" htmlFor="s-price" required error={errors.basePrice}>
            <Input id="s-price" inputMode="decimal" value={f.basePrice} onChange={(e) => set("basePrice", e.target.value)} invalid={!!errors.basePrice} />
          </Field>
          <Field label="预计工时（小时）" htmlFor="s-hours" required error={errors.estimatedHours}>
            <Input id="s-hours" inputMode="decimal" value={f.estimatedHours} onChange={(e) => set("estimatedHours", e.target.value)} invalid={!!errors.estimatedHours} />
          </Field>
          <Field label="默认修改次数" htmlFor="s-rev" required error={errors.defaultRevisions}>
            <Input id="s-rev" inputMode="numeric" value={f.defaultRevisions} onChange={(e) => set("defaultRevisions", e.target.value)} invalid={!!errors.defaultRevisions} />
          </Field>
        </div>
        <Field label="交付内容" htmlFor="s-deliv" className="sm:col-span-2">
          <Textarea id="s-deliv" rows={2} value={f.deliverables} onChange={(e) => set("deliverables", e.target.value)} />
        </Field>
        <Field label="适合客户" htmlFor="s-target" className="sm:col-span-2">
          <Input id="s-target" value={f.targetCustomers} onChange={(e) => set("targetCustomers", e.target.value)} />
        </Field>
        <Field label="推荐 AI 工具" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {data.tools.map((t) => {
              const on = f.recommendedTools.includes(t.name);
              return (
                <button key={t.id} type="button" onClick={() => toggleTool(t.name)} aria-pressed={on}
                  className={cn("rounded-md border px-2 py-1 text-xs transition-colors", on ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-fg")}>
                  {t.name}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="注意事项" htmlFor="s-caution" className="sm:col-span-2">
          <Textarea id="s-caution" rows={2} value={f.cautions} onChange={(e) => set("cautions", e.target.value)} />
        </Field>
        <Checkbox id="s-active" label="上架（在新建项目/报价中可选）" checked={f.active} onChange={(v) => set("active", v)} />
        <button type="submit" className="hidden" />
      </form>
    </Dialog>
  );
}
