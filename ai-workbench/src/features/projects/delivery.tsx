"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, FileText, GitBranch, HardDrive, Link2, Pencil, Plus, Star, Trash2, History, TriangleAlert } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/misc";
import { useFeedback } from "@/components/ui/feedback";
import { DELIVERABLE_TYPES, labelOf } from "@/lib/constants";
import { useWorkbench } from "@/lib/store";
import type { Deliverable, DeliverableType, Project, Revision } from "@/lib/types";
import { formatDateTime, nowISO, uid } from "@/lib/utils";

const TYPE_ICON: Record<DeliverableType, typeof FileText> = {
  file: FileText,
  link: Link2,
  github: GitBranch,
  gdrive: HardDrive,
  netdisk: HardDrive,
  other: Link2,
};

function isUrl(s: string) {
  return /^https?:\/\/\S+$/i.test(s.trim());
}

/* ---------------- 交付物 ---------------- */

export function DeliverablesCard({ project }: { project: Project }) {
  const { update } = useWorkbench();
  const { confirm, toast } = useFeedback();
  const [editing, setEditing] = useState<Deliverable | null>(null);
  const [open, setOpen] = useState(false);

  const save = (list: Deliverable[]) => update("projects", project.id, { deliverables: list });

  const markFinal = (d: Deliverable) => {
    save(project.deliverables.map((x) => ({ ...x, isFinal: x.id === d.id ? !d.isFinal : false })));
    toast(d.isFinal ? "已取消最终版标记" : "已标记为最终版本");
  };

  const del = async (d: Deliverable) => {
    if (!(await confirm({ title: "删除交付物？", description: `「${d.label}」将被删除。`, confirmText: "删除", danger: true }))) return;
    save(project.deliverables.filter((x) => x.id !== d.id));
    toast("交付物已删除");
  };

  return (
    <Card>
      <CardHeader
        title="交付物"
        description="文件、链接、GitHub、网盘…可标记最终版本"
        action={<Button size="sm" variant="outline" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={14} /> 添加</Button>}
      />
      {project.deliverables.length === 0 ? (
        <EmptyState title="还没有交付物" description="交付时在这里记录文件和链接，方便日后查找" className="py-6" />
      ) : (
        <ul className="divide-y divide-border px-2 pb-2">
          {project.deliverables.map((d) => {
            const Icon = TYPE_ICON[d.type];
            return (
              <li key={d.id} className="flex items-center gap-3 px-2 py-2.5">
                <Icon size={16} className="shrink-0 text-subtle" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{d.label}</span>
                    <Badge>{labelOf(DELIVERABLE_TYPES, d.type)}</Badge>
                    {d.isFinal && <Badge tone="green"><Check size={11} /> 最终版</Badge>}
                  </div>
                  {isUrl(d.url) ? (
                    <a href={d.url} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 truncate text-xs text-accent hover:underline">
                      <span className="truncate">{d.url}</span> <ExternalLink size={11} className="shrink-0" />
                    </a>
                  ) : (
                    <div className="mt-0.5 truncate text-xs text-muted">{d.url}</div>
                  )}
                </div>
                <div className="flex shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => markFinal(d)} aria-label={d.isFinal ? "取消最终版" : "标记为最终版"} title={d.isFinal ? "取消最终版" : "标记为最终版"}>
                    <Star size={15} className={d.isFinal ? "fill-amber-400 text-amber-400" : undefined} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(d); setOpen(true); }} aria-label="编辑交付物"><Pencil size={15} /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(d)} aria-label="删除交付物"><Trash2 size={15} /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <DeliverableDialog
        open={open}
        onClose={() => setOpen(false)}
        initial={editing}
        onSubmit={(d) => {
          let list = editing ? project.deliverables.map((x) => (x.id === d.id ? d : x)) : [...project.deliverables, d];
          if (d.isFinal) list = list.map((x) => ({ ...x, isFinal: x.id === d.id }));
          save(list);
          toast(editing ? "交付物已更新" : "交付物已添加");
        }}
      />
    </Card>
  );
}

function DeliverableDialog({ open, onClose, initial, onSubmit }: { open: boolean; onClose: () => void; initial: Deliverable | null; onSubmit: (d: Deliverable) => void }) {
  const [type, setType] = useState<DeliverableType>("link");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setType(initial?.type ?? "link");
    setLabel(initial?.label ?? "");
    setUrl(initial?.url ?? "");
    setIsFinal(initial?.isFinal ?? false);
  }, [open, initial]);

  function submit(ev?: React.FormEvent) {
    ev?.preventDefault();
    const e: Record<string, string> = {};
    if (!label.trim()) e.label = "请填写名称";
    if (!url.trim()) e.url = type === "file" ? "请填写文件名或存放位置" : "请填写链接";
    else if (type !== "file" && type !== "other" && !isUrl(url)) e.url = "链接需以 http:// 或 https:// 开头";
    setErrors(e);
    if (Object.keys(e).length) return;
    onSubmit({ id: initial?.id ?? uid("dl"), type, label: label.trim(), url: url.trim(), isFinal, createdAt: initial?.createdAt ?? nowISO() });
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={initial ? "编辑交付物" : "添加交付物"} size="sm" footer={<><Button variant="outline" onClick={onClose}>取消</Button><Button onClick={() => submit()}>保存</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="类型" htmlFor="dl-type">
          <Select id="dl-type" value={type} onChange={(e) => setType(e.target.value as DeliverableType)}>
            {DELIVERABLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="名称" htmlFor="dl-label" required error={errors.label}>
          <Input id="dl-label" value={label} onChange={(e) => setLabel(e.target.value)} invalid={!!errors.label} placeholder="如：第2版预览 / 最终源文件" />
        </Field>
        <Field label={type === "file" ? "文件名/存放位置" : "链接地址"} htmlFor="dl-url" required error={errors.url}>
          <Input id="dl-url" value={url} onChange={(e) => setUrl(e.target.value)} invalid={!!errors.url} placeholder={type === "file" ? "D:/交付/海报_final.psd" : "https://"} />
        </Field>
        <Checkbox id="dl-final" label="这是最终版本" checked={isFinal} onChange={setIsFinal} />
        <button type="submit" className="hidden" />
      </form>
    </Dialog>
  );
}

/* ---------------- 修改记录 ---------------- */

export function RevisionsCard({ project }: { project: Project }) {
  const { update, setProjectStatus } = useWorkbench();
  const { confirm, toast } = useFeedback();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Revision | null>(null);
  const used = project.revisions.length;
  const over = used > project.maxRevisions;

  const save = (list: Revision[]) => update("projects", project.id, { revisions: list.map((r, i) => ({ ...r, version: i + 1 })) });

  const del = async (r: Revision) => {
    if (!(await confirm({ title: `删除第 ${r.version} 版修改记录？`, confirmText: "删除", danger: true }))) return;
    save(project.revisions.filter((x) => x.id !== r.id));
    toast("修改记录已删除");
  };

  return (
    <Card>
      <CardHeader
        title="修改记录"
        description={
          <span className={over ? "text-danger" : undefined}>
            已修改 {used} / {project.maxRevisions} 次{over ? "，已超出免费次数，可收取修改费" : used === project.maxRevisions ? "，免费次数已用完" : ""}
          </span>
        }
        action={<Button size="sm" variant="outline" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={14} /> 记录修改</Button>}
      />
      {used >= project.maxRevisions && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <TriangleAlert size={14} className="shrink-0" /> 再次修改前建议先和客户确认修改费用
        </div>
      )}
      {used === 0 ? (
        <EmptyState icon={History} title="暂无修改记录" description="每次客户提出修改意见时记录下来，自动统计修改次数" className="py-6" />
      ) : (
        <ol className="relative mx-4 mb-4 border-l border-border pl-5">
          {[...project.revisions].reverse().map((r) => (
            <li key={r.id} className="relative pb-4 last:pb-0">
              <span className="absolute top-0.5 -left-[27px] flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-surface bg-accent" />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">第 {r.version} 版 <span className="ml-1 text-xs font-normal text-muted">{formatDateTime(r.createdAt)}</span></div>
                  <p className="mt-1 text-sm"><span className="text-muted">客户意见：</span>{r.clientFeedback}</p>
                  <p className="mt-0.5 text-sm"><span className="text-muted">修改内容：</span>{r.changes || "—"}</p>
                </div>
                <div className="flex shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }} aria-label="编辑修改记录"><Pencil size={14} /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(r)} aria-label="删除修改记录"><Trash2 size={14} /></Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <RevisionDialog
        open={open}
        onClose={() => setOpen(false)}
        initial={editing}
        nextVersion={used + 1}
        canSetRevising={!editing && project.status !== "revising"}
        onSubmit={(r, setRevising) => {
          save(editing ? project.revisions.map((x) => (x.id === r.id ? r : x)) : [...project.revisions, r]);
          if (setRevising) setProjectStatus(project.id, "revising");
          toast(editing ? "修改记录已更新" : `已记录第 ${r.version} 版修改`);
        }}
      />
    </Card>
  );
}

function RevisionDialog({
  open,
  onClose,
  initial,
  nextVersion,
  canSetRevising,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial: Revision | null;
  nextVersion: number;
  canSetRevising: boolean;
  onSubmit: (r: Revision, setRevising: boolean) => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [changes, setChanges] = useState("");
  const [setRevising, setSetRevising] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setFeedback(initial?.clientFeedback ?? "");
    setChanges(initial?.changes ?? "");
    setSetRevising(true);
  }, [open, initial]);

  function submit() {
    if (!feedback.trim()) {
      setError("请填写客户意见");
      return;
    }
    onSubmit(
      { id: initial?.id ?? uid("rv"), version: initial?.version ?? nextVersion, clientFeedback: feedback.trim(), changes: changes.trim(), createdAt: initial?.createdAt ?? nowISO() },
      canSetRevising && setRevising,
    );
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={initial ? `编辑第 ${initial.version} 版` : `记录第 ${nextVersion} 版修改`} size="sm" footer={<><Button variant="outline" onClick={onClose}>取消</Button><Button onClick={submit}>保存</Button></>}>
      <div className="space-y-4">
        <Field label="客户意见" htmlFor="rv-feedback" required error={error}>
          <Textarea id="rv-feedback" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} invalid={!!error} placeholder="客户提出的修改要求" />
        </Field>
        <Field label="修改内容" htmlFor="rv-changes" hint="可以稍后改完再补充">
          <Textarea id="rv-changes" rows={3} value={changes} onChange={(e) => setChanges(e.target.value)} placeholder="你做了哪些修改" />
        </Field>
        {canSetRevising && <Checkbox id="rv-status" label="同时把项目状态改为「修改中」" checked={setRevising} onChange={setSetRevising} />}
      </div>
    </Dialog>
  );
}
