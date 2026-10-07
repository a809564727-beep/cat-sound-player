"use client";

import { useMemo, useState } from "react";
import { ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Card, CardHeader, EmptyState, PageHeader, Segmented } from "@/components/ui/misc";
import { useFeedback } from "@/components/ui/feedback";
import { TaskList } from "@/features/tasks/task-list";
import { TASK_KIND_LABEL, generateTasks, type TaskKind } from "@/lib/domain/tasks";
import { useWorkbench } from "@/lib/store";
import { todayKey } from "@/lib/utils";

const GROUPS: Array<{ key: string; title: string; kinds: TaskKind[] }> = [
  { key: "urgent", title: "紧急：逾期 & 今天要交付", kinds: ["overdue", "deliver", "due_soon"] },
  { key: "follow", title: "客户跟进：报价 & 回复", kinds: ["quote", "reply"] },
  { key: "money", title: "收款", kinds: ["payment"] },
  { key: "todo", title: "手动待办", kinds: ["todo"] },
];

export default function TasksPage() {
  const { data, create } = useWorkbench();
  const { toast } = useFeedback();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(todayKey());
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "auto" | "todo">("all");

  const tasks = useMemo(() => generateTasks(data), [data]);
  const pending = tasks.filter((t) => !t.done);
  const visible = tasks.filter((t) => (filter === "auto" ? t.kind !== "todo" : filter === "todo" ? t.kind === "todo" : true));

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("请输入待办内容");
      return;
    }
    create("todos", { title: title.trim(), dueDate: due || undefined, done: false, projectId: projectId || undefined });
    setTitle("");
    setError("");
    toast("待办已添加");
  }

  const counts = (Object.keys(TASK_KIND_LABEL) as TaskKind[]).map((k) => ({ k, n: pending.filter((t) => t.kind === k).length })).filter((x) => x.n);

  return (
    <>
      <PageHeader
        title="今日任务"
        description={`${new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })} · 共 ${pending.length} 项待处理（根据项目状态自动生成）`}
      />

      <Card className="mb-4 p-4">
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row" noValidate>
          <div className="flex-1">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="添加待办，例如：给 Echo 发第二周封面" aria-label="待办内容" invalid={!!error} />
            {error && <p className="mt-1 text-xs text-danger">{error}</p>}
          </div>
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="sm:w-40" aria-label="截止日期" />
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="sm:w-44" aria-label="关联项目">
            <option value="">不关联项目</option>
            {data.projects.filter((p) => p.status !== "completed" && p.status !== "cancelled").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Button type="submit"><Plus size={16} /> 添加</Button>
        </form>
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: "全部" }, { value: "auto", label: "自动生成" }, { value: "todo", label: "手动待办" }]} />
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          {counts.map(({ k, n }) => <span key={k}>{TASK_KIND_LABEL[k]} {n}</span>)}
        </div>
      </div>

      {visible.length === 0 ? (
        <Card><EmptyState icon={ListChecks} title="今天没有待办 🎉" description="所有项目都在正轨上，去开发新客户吧" /></Card>
      ) : (
        <div className="space-y-4">
          {GROUPS.map((g) => {
            const list = visible.filter((t) => g.kinds.includes(t.kind));
            if (!list.length) return null;
            return (
              <Card key={g.key}>
                <CardHeader title={g.title} description={`${list.filter((t) => !t.done).length} 项`} />
                <TaskList tasks={list} />
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
