"use client";

import { useState } from "react";
import { Clock, Package, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { useFeedback } from "@/components/ui/feedback";
import { ServiceFormDialog } from "@/features/services/service-form";
import { SERVICE_CATEGORIES, labelOf } from "@/lib/constants";
import { useWorkbench } from "@/lib/store";
import type { Service } from "@/lib/types";
import { money } from "@/lib/utils";

export default function ServicesPage() {
  const { data, remove } = useWorkbench();
  const { confirm, toast } = useFeedback();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | undefined>();

  const del = async (s: Service) => {
    const used = data.projects.filter((p) => p.serviceId === s.id).length;
    const ok = await confirm({
      title: `删除服务「${s.name}」？`,
      description: used ? `有 ${used} 个项目使用了该服务，删除后这些项目会变为「未分类」。也可以选择编辑并下架。` : "删除后无法恢复。",
      confirmText: "删除",
      danger: true,
    });
    if (!ok) return;
    remove("services", s.id);
    toast("服务已删除");
  };

  return (
    <>
      <PageHeader
        title="服务库"
        description="你的服务商品：标准价格、工时、交付内容。新建项目和报价时自动带出"
        actions={<Button onClick={() => { setEditing(undefined); setOpen(true); }}><Plus size={16} /> 新增服务</Button>}
      />
      {data.services.length === 0 ? (
        <Card><EmptyState icon={Package} title="还没有服务" action={<Button onClick={() => setOpen(true)}><Plus size={16} /> 新增服务</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.services.map((s) => {
            const used = data.projects.filter((p) => p.serviceId === s.id).length;
            return (
              <Card key={s.id} className={`flex flex-col p-4 ${s.active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{s.name}</h3>
                      <Badge>{labelOf(SERVICE_CATEGORIES, s.category)}</Badge>
                      {!s.active && <Badge tone="red">已下架</Badge>}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                      <span className="text-base font-semibold text-fg">{money(s.basePrice)}<span className="text-xs font-normal text-muted"> 起</span></span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {s.estimatedHours}h</span>
                      <span className="flex items-center gap-1"><RotateCcw size={12} /> {s.defaultRevisions} 次修改</span>
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    <Button size="icon" variant="ghost" aria-label={`编辑 ${s.name}`} onClick={() => { setEditing(s); setOpen(true); }}><Pencil size={15} /></Button>
                    <Button size="icon" variant="ghost" aria-label={`删除 ${s.name}`} onClick={() => del(s)}><Trash2 size={15} /></Button>
                  </div>
                </div>
                <dl className="mt-3 flex-1 space-y-2 text-xs">
                  <div><dt className="text-muted">交付内容</dt><dd className="mt-0.5">{s.deliverables || "—"}</dd></div>
                  <div><dt className="text-muted">适合客户</dt><dd className="mt-0.5">{s.targetCustomers || "—"}</dd></div>
                  {s.cautions && <div><dt className="text-muted">注意事项</dt><dd className="mt-0.5 text-amber-700 dark:text-amber-300">{s.cautions}</dd></div>}
                </dl>
                <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-3">
                  {s.recommendedTools.map((t) => <Badge key={t} tone="violet">{t}</Badge>)}
                  <span className="ml-auto text-[11px] text-subtle">{used} 个项目</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ServiceFormDialog open={open} onClose={() => setOpen(false)} service={editing} />
    </>
  );
}
