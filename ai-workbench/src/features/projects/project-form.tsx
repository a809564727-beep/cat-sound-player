"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Plus, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, parseNum } from "@/components/ui/field";
import { useFeedback } from "@/components/ui/feedback";
import { ClientFormDialog } from "@/features/clients/client-form";
import { RecommendPanel } from "@/features/recommend/recommend-panel";
import { PRIORITIES, PROJECT_STATUSES, QUALITY_LEVELS } from "@/lib/constants";
import { useWorkbench } from "@/lib/store";
import type { Priority, Project, ProjectStatus, QualityLevel } from "@/lib/types";
import { diffDays, nowISO, todayKey } from "@/lib/utils";

interface FormState {
  name: string;
  clientId: string;
  serviceId: string;
  requirement: string;
  budget: string;
  quotedPrice: string;
  finalPrice: string;
  startDate: string;
  dueDate: string;
  status: ProjectStatus;
  priority: Priority;
  quality: QualityLevel;
  maxRevisions: string;
  notes: string;
}

const str = (n?: number) => (n === undefined ? "" : String(n));

export function ProjectFormDialog({
  open,
  onClose,
  project,
  defaults,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project;
  defaults?: Partial<Pick<Project, "clientId" | "serviceId" | "status">>;
  onSaved?: (p: Project) => void;
}) {
  const { data, create, update } = useWorkbench();
  const { toast } = useFeedback();
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [clientOpen, setClientOpen] = useState(false);
  const [showRec, setShowRec] = useState(true);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      project
        ? {
            name: project.name,
            clientId: project.clientId,
            serviceId: project.serviceId ?? "",
            requirement: project.requirement,
            budget: str(project.budget),
            quotedPrice: str(project.quotedPrice),
            finalPrice: str(project.finalPrice),
            startDate: project.startDate ?? "",
            dueDate: project.dueDate ?? "",
            status: project.status,
            priority: project.priority,
            quality: project.quality,
            maxRevisions: String(project.maxRevisions),
            notes: project.notes ?? "",
          }
        : {
            name: "",
            clientId: defaults?.clientId ?? "",
            serviceId: defaults?.serviceId ?? "",
            requirement: "",
            budget: "",
            quotedPrice: "",
            finalPrice: "",
            startDate: todayKey(),
            dueDate: "",
            status: defaults?.status ?? "communicating",
            priority: "medium",
            quality: "standard",
            maxRevisions: String(data.services.find((s) => s.id === defaults?.serviceId)?.defaultRevisions ?? 2),
            notes: "",
          },
    );
  }, [open, project]);

  if (!form) return null;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const service = data.services.find((s) => s.id === form.serviceId);

  function onServiceChange(id: string) {
    const s = data.services.find((x) => x.id === id);
    setForm((f) => {
      if (!f) return f;
      return {
        ...f,
        serviceId: id,
        maxRevisions: s ? String(s.defaultRevisions) : f.maxRevisions,
        name: f.name || (s ? s.name : ""),
      };
    });
  }

  function validate(f: FormState) {
    const e: typeof errors = {};
    if (!f.name.trim()) e.name = "请填写项目名称";
    if (!f.clientId) e.clientId = "请选择客户";
    for (const k of ["budget", "quotedPrice", "finalPrice"] as const) {
      const n = parseNum(f[k]);
      if (f[k].trim() && (n === undefined || n < 0)) e[k] = "请输入不小于 0 的数字";
    }
    const mr = parseNum(f.maxRevisions);
    if (mr === undefined || mr < 0 || !Number.isInteger(mr)) e.maxRevisions = "请输入非负整数";
    if (f.startDate && f.dueDate && diffDays(f.dueDate, f.startDate) < 0) e.dueDate = "截止日期不能早于开始日期";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(ev?: React.FormEvent) {
    ev?.preventDefault();
    if (!form || !validate(form)) return;
    const payload = {
      name: form.name.trim(),
      clientId: form.clientId,
      serviceId: form.serviceId || undefined,
      requirement: form.requirement.trim(),
      budget: parseNum(form.budget),
      quotedPrice: parseNum(form.quotedPrice),
      finalPrice: parseNum(form.finalPrice),
      startDate: form.startDate || undefined,
      dueDate: form.dueDate || undefined,
      priority: form.priority,
      quality: form.quality,
      maxRevisions: parseNum(form.maxRevisions) ?? 2,
      notes: form.notes.trim() || undefined,
    };
    if (project) {
      const statusChanged = project.status !== form.status;
      const ts = nowISO();
      update("projects", project.id, {
        ...payload,
        status: form.status,
        ...(statusChanged ? { statusChangedAt: ts, completedAt: form.status === "completed" ? ts : project.completedAt } : {}),
      });
      toast("项目已更新");
      onSaved?.({ ...project, ...payload, status: form.status });
    } else {
      const ts = nowISO();
      const p = create("projects", {
        ...payload,
        status: form.status,
        deliverables: [],
        revisions: [],
        statusChangedAt: ts,
        completedAt: form.status === "completed" ? ts : undefined,
      });
      toast("项目已创建");
      onSaved?.(p);
    }
    onClose();
  }

  const daysAvailable = form.dueDate ? diffDays(form.dueDate, new Date()) : undefined;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={project ? "编辑项目" : "新建项目"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button onClick={() => submit()}>{project ? "保存" : "创建项目"}</Button>
          </>
        }
      >
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          <Field label="服务类型" htmlFor="p-service">
            <Select id="p-service" value={form.serviceId} onChange={(e) => onServiceChange(e.target.value)}>
              <option value="">未分类</option>
              {data.services.filter((s) => s.active || s.id === form.serviceId).map((s) => (
                <option key={s.id} value={s.id}>{s.name}（¥{s.basePrice} 起）</option>
              ))}
            </Select>
          </Field>
          <Field label="项目名称" htmlFor="p-name" required error={errors.name}>
            <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} invalid={!!errors.name} placeholder="如：咖啡店开业海报" />
          </Field>
          <Field label="客户" htmlFor="p-client" required error={errors.clientId}>
            <div className="flex gap-2">
              <Select id="p-client" value={form.clientId} onChange={(e) => set("clientId", e.target.value)} invalid={!!errors.clientId}>
                <option value="">选择客户</option>
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? `（${c.company}）` : ""}</option>
                ))}
              </Select>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setClientOpen(true)} aria-label="快速新增客户" title="新增客户">
                <Plus size={16} />
              </Button>
            </div>
          </Field>
          <Field label="当前状态" htmlFor="p-status">
            <Select id="p-status" value={form.status} onChange={(e) => set("status", e.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="需求说明" htmlFor="p-req" className="sm:col-span-2">
            <Textarea id="p-req" rows={3} value={form.requirement} onChange={(e) => set("requirement", e.target.value)} placeholder="尺寸、用途、风格、数量、参考案例…" />
          </Field>
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <Field label="客户预算" htmlFor="p-budget" error={errors.budget}>
              <Input id="p-budget" inputMode="decimal" value={form.budget} onChange={(e) => set("budget", e.target.value)} invalid={!!errors.budget} placeholder="¥" />
            </Field>
            <Field label="报价" htmlFor="p-quoted" error={errors.quotedPrice}>
              <Input id="p-quoted" inputMode="decimal" value={form.quotedPrice} onChange={(e) => set("quotedPrice", e.target.value)} invalid={!!errors.quotedPrice} placeholder="¥" />
            </Field>
            <Field label="成交价" htmlFor="p-final" error={errors.finalPrice}>
              <Input id="p-final" inputMode="decimal" value={form.finalPrice} onChange={(e) => set("finalPrice", e.target.value)} invalid={!!errors.finalPrice} placeholder="¥" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <Field label="开始时间" htmlFor="p-start">
              <Input id="p-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
            <Field label="截止时间" htmlFor="p-due" error={errors.dueDate}>
              <Input id="p-due" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} invalid={!!errors.dueDate} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <Field label="优先级" htmlFor="p-priority">
              <Select id="p-priority" value={form.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
                {PRIORITIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="质量要求" htmlFor="p-quality">
              <Select id="p-quality" value={form.quality} onChange={(e) => set("quality", e.target.value as QualityLevel)}>
                {QUALITY_LEVELS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="免费修改次数" htmlFor="p-rev" error={errors.maxRevisions}>
              <Input id="p-rev" inputMode="numeric" value={form.maxRevisions} onChange={(e) => set("maxRevisions", e.target.value)} invalid={!!errors.maxRevisions} />
            </Field>
          </div>
          <Field label="备注" htmlFor="p-notes" className="sm:col-span-2">
            <Textarea id="p-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <button type="submit" className="hidden" />
        </form>

        {service && (
          <div className="mt-5 rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
            <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setShowRec((v) => !v)} aria-expanded={showRec}>
              <span className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-accent" /> AI 项目推荐</span>
              <ChevronDown size={16} className={showRec ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
            {showRec && (
              <div className="mt-3">
                <RecommendPanel
                  compact
                  input={{
                    category: service.category,
                    budget: parseNum(form.budget),
                    daysAvailable,
                    quality: form.quality,
                    baseHours: service.estimatedHours,
                    basePrice: service.basePrice,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </Dialog>
      <ClientFormDialog open={clientOpen} onClose={() => setClientOpen(false)} onSaved={(c) => set("clientId", c.id)} />
    </>
  );
}
