"use client";

import { useMemo, useState } from "react";
import { Bot, ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge, Card, EmptyState, PageHeader, Stars } from "@/components/ui/misc";
import { useFeedback } from "@/components/ui/feedback";
import { ToolFormDialog } from "@/features/tools/tool-form";
import { SERVICE_CATEGORIES, labelOf } from "@/lib/constants";
import { useWorkbench } from "@/lib/store";
import type { Tool } from "@/lib/types";
import { includesText } from "@/lib/utils";

export default function ToolsPage() {
  const { data, remove } = useWorkbench();
  const { confirm, toast } = useFeedback();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [suit, setSuit] = useState("");
  const [flag, setFlag] = useState("");
  const [sort, setSort] = useState<"rating" | "name">("rating");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tool | undefined>();

  const categories = useMemo(() => [...new Set(data.tools.map((t) => t.category))], [data.tools]);
  const rows = useMemo(
    () =>
      data.tools
        .filter((t) => !category || t.category === category)
        .filter((t) => !suit || t.suitableFor.includes(suit as Tool["suitableFor"][number]))
        .filter((t) => (flag === "oss" ? t.openSource : flag === "local" ? t.local : true))
        .filter((t) => includesText([t.name, t.usage, t.category, t.experience, t.notes, t.pricing], q))
        .sort((a, b) => (sort === "rating" ? b.rating - a.rating || a.name.localeCompare(b.name) : a.name.localeCompare(b.name))),
    [data.tools, category, suit, flag, q, sort],
  );

  const del = async (t: Tool) => {
    if (!(await confirm({ title: `删除工具「${t.name}」？`, description: "删除后无法恢复。", confirmText: "删除", danger: true }))) return;
    remove("tools", t.id);
    toast("工具已删除");
  };

  return (
    <>
      <PageHeader
        title="AI 工具库"
        description={`收录 ${data.tools.length} 个工具，记录费用、适用场景与使用经验`}
        actions={<Button onClick={() => { setEditing(undefined); setOpen(true); }}><Plus size={16} /> 添加工具</Button>}
      />
      <div className="mb-4 flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索工具名、用途、经验…" className="pl-9" aria-label="搜索工具" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="lg:w-32" aria-label="按类别筛选">
            <option value="">全部类别</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={suit} onChange={(e) => setSuit(e.target.value)} className="lg:w-36" aria-label="按适用项目筛选">
            <option value="">全部项目类型</option>
            {SERVICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Select value={flag} onChange={(e) => setFlag(e.target.value)} className="lg:w-28" aria-label="开源/本地">
            <option value="">不限</option>
            <option value="oss">开源</option>
            <option value="local">可本地运行</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as "rating" | "name")} className="lg:w-28" aria-label="排序">
            <option value="rating">按评分</option>
            <option value="name">按名称</option>
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><EmptyState icon={Bot} title={data.tools.length ? "没有匹配的工具" : "工具库为空"} action={!data.tools.length && <Button onClick={() => setOpen(true)}><Plus size={16} /> 添加工具</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => (
            <Card key={t.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate font-semibold">{t.name}</h3>
                    {t.url && <a href={t.url} target="_blank" rel="noreferrer" className="text-subtle hover:text-accent" aria-label={`访问 ${t.name}`}><ExternalLink size={13} /></a>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone="blue">{t.category}</Badge>
                    {t.openSource && <Badge tone="green">开源</Badge>}
                    {t.local && <Badge tone="cyan">本地</Badge>}
                    <span className="text-xs"><Stars value={t.rating} /></span>
                  </div>
                </div>
                <div className="flex shrink-0">
                  <Button size="icon" variant="ghost" aria-label={`编辑 ${t.name}`} onClick={() => { setEditing(t); setOpen(true); }}><Pencil size={15} /></Button>
                  <Button size="icon" variant="ghost" aria-label={`删除 ${t.name}`} onClick={() => del(t)}><Trash2 size={15} /></Button>
                </div>
              </div>
              <p className="mt-3 text-sm">{t.usage}</p>
              <p className="mt-1 text-xs text-muted">费用：{t.pricing || "—"}</p>
              {t.experience && <p className="mt-2 rounded-lg bg-surface-2/60 px-2.5 py-1.5 text-xs text-muted">💡 {t.experience}</p>}
              {t.notes && <p className="mt-1 text-xs text-subtle">{t.notes}</p>}
              <div className="mt-auto flex flex-wrap gap-1 pt-3">
                {t.suitableFor.map((s) => <span key={s} className="text-[11px] text-subtle">#{labelOf(SERVICE_CATEGORIES, s)}</span>)}
              </div>
            </Card>
          ))}
        </div>
      )}
      <ToolFormDialog open={open} onClose={() => setOpen(false)} tool={editing} />
    </>
  );
}
