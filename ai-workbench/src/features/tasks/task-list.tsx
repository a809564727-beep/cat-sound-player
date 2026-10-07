"use client";

import Link from "next/link";
import { AlarmClock, CircleAlert, CircleDollarSign, Calculator, MessageCircle, Send, Square, SquareCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { TASK_KIND_LABEL, type GeneratedTask, type TaskKind } from "@/lib/domain/tasks";
import type { Tone } from "@/lib/constants";
import { useWorkbench } from "@/lib/store";
import { useFeedback } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

const KIND_META: Record<TaskKind, { icon: typeof AlarmClock; tone: Tone }> = {
  overdue: { icon: CircleAlert, tone: "red" },
  due_soon: { icon: AlarmClock, tone: "amber" },
  deliver: { icon: Send, tone: "blue" },
  reply: { icon: MessageCircle, tone: "violet" },
  payment: { icon: CircleDollarSign, tone: "green" },
  quote: { icon: Calculator, tone: "orange" },
  todo: { icon: Square, tone: "gray" },
};

export function TaskList({ tasks, compact }: { tasks: GeneratedTask[]; compact?: boolean }) {
  const { update, remove } = useWorkbench();
  const { toast } = useFeedback();
  return (
    <ul className="divide-y divide-border">
      {tasks.map((t) => {
        const meta = KIND_META[t.kind];
        const Icon = t.kind === "todo" ? (t.done ? SquareCheck : Square) : meta.icon;
        const body = (
          <div className="min-w-0 flex-1">
            <div className={cn("text-sm", t.done && "text-subtle line-through")}>{t.title}</div>
            <div className="mt-0.5 truncate text-xs text-muted">{t.detail}</div>
          </div>
        );
        return (
          <li key={t.id} className="flex items-center gap-3 px-4 py-2.5" data-testid="task-item">
            {t.todoId ? (
              <button
                type="button"
                onClick={() => {
                  update("todos", t.todoId!, { done: !t.done });
                  if (!t.done) toast("已完成 🎉");
                }}
                className={cn("shrink-0 cursor-pointer", t.done ? "text-success" : "text-subtle hover:text-fg")}
                aria-label={t.done ? "标记为未完成" : "标记为完成"}
              >
                <Icon size={18} />
              </button>
            ) : (
              <Icon size={18} className={cn("shrink-0", meta.tone === "red" ? "text-danger" : "text-subtle")} />
            )}
            {t.projectId && !t.todoId ? <Link href={`/projects/${t.projectId}`} className="min-w-0 flex-1 hover:text-accent">{body}</Link> : body}
            {!compact && <Badge tone={meta.tone} className="hidden sm:inline-flex">{TASK_KIND_LABEL[t.kind]}</Badge>}
            {t.todoId && !compact && (
              <Button size="icon" variant="ghost" onClick={() => { remove("todos", t.todoId!); toast("待办已删除"); }} aria-label="删除待办"><Trash2 size={14} /></Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
