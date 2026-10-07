import { ACTIVE_STATUSES, PRESALE_STATUSES } from "../constants";
import type { Client, Payment, Project, Settings, Todo } from "../types";
import { diffDays, relativeDue, money } from "../utils";
import { paymentsByProject, summarizePayments } from "./payments";

export type TaskKind = "overdue" | "due_soon" | "deliver" | "reply" | "payment" | "quote" | "todo";

export interface GeneratedTask {
  id: string;
  kind: TaskKind;
  title: string;
  detail: string;
  projectId?: string;
  clientId?: string;
  /** 越小越紧急 */
  urgency: number;
  todoId?: string;
  done?: boolean;
}

export const TASK_KIND_LABEL: Record<TaskKind, string> = {
  overdue: "已逾期",
  due_soon: "快到期",
  deliver: "需交付",
  reply: "待客户回复",
  payment: "待收款",
  quote: "待报价",
  todo: "手动待办",
};

/**
 * 根据当前数据自动生成"今天该做什么"。
 * 规则都是确定性的，便于测试；未来可以把这部分替换成 AI 生成的建议。
 */
export function generateTasks(
  input: { projects: Project[]; clients: Client[]; payments: Payment[]; todos: Todo[]; settings: Settings },
  now = new Date(),
): GeneratedTask[] {
  const { projects, clients, payments, todos, settings } = input;
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "未知客户";
  const byProject = paymentsByProject(payments);
  const tasks: GeneratedTask[] = [];

  for (const p of projects) {
    const who = clientName(p.clientId);
    const executing = ACTIVE_STATUSES.includes(p.status);

    if (executing && p.dueDate) {
      const left = diffDays(p.dueDate, now);
      if (left < 0) {
        tasks.push({
          id: `overdue-${p.id}`,
          kind: "overdue",
          title: `「${p.name}」已逾期`,
          detail: `${who} · ${relativeDue(p.dueDate, now)}，尽快交付或与客户沟通延期`,
          projectId: p.id,
          clientId: p.clientId,
          urgency: left,
        });
      } else if (left <= settings.dueSoonDays) {
        const needDeliver = p.status === "in_progress" || p.status === "revising";
        tasks.push({
          id: `due-${p.id}`,
          kind: needDeliver ? "deliver" : "due_soon",
          title: needDeliver ? `交付「${p.name}」` : `「${p.name}」快到期`,
          detail: `${who} · ${relativeDue(p.dueDate, now)}`,
          projectId: p.id,
          clientId: p.clientId,
          urgency: 10 + left,
        });
      }
    }

    // 等客户回复：成交前阶段 或 待客户审核，超过 N 天没有状态变化
    const waiting = PRESALE_STATUSES.includes(p.status) || p.status === "client_review";
    if (waiting && p.status !== "quoting") {
      const idle = diffDays(now, p.statusChangedAt);
      if (idle >= settings.replyReminderDays) {
        tasks.push({
          id: `reply-${p.id}`,
          kind: "reply",
          title: `跟进 ${who}`,
          detail: `「${p.name}」${p.status === "client_review" ? "等待审核" : "等待回复"}已 ${idle} 天`,
          projectId: p.id,
          clientId: p.clientId,
          urgency: 30 - idle,
        });
      }
    }

    if (p.status === "quoting") {
      tasks.push({
        id: `quote-${p.id}`,
        kind: "quote",
        title: `给 ${who} 报价`,
        detail: `「${p.name}」${p.budget ? `客户预算 ${money(p.budget)}` : "预算未知"}`,
        projectId: p.id,
        clientId: p.clientId,
        urgency: 25,
      });
    }

    if (p.status === "delivered" || p.status === "completed") {
      const s = summarizePayments(p, byProject.get(p.id) ?? []);
      if (s.outstanding > 0 && s.status !== "refunded") {
        tasks.push({
          id: `pay-${p.id}`,
          kind: "payment",
          title: `催收 ${who} 尾款`,
          detail: `「${p.name}」未收 ${money(s.outstanding)}`,
          projectId: p.id,
          clientId: p.clientId,
          urgency: 20,
        });
      }
    }
  }

  for (const t of todos) {
    if (t.done && t.dueDate && diffDays(now, t.dueDate) > 0) continue; // 过去已完成的不再显示
    if (!t.done && t.dueDate && diffDays(t.dueDate, now) > settings.dueSoonDays) continue; // 太远的未来待办
    tasks.push({
      id: `todo-${t.id}`,
      kind: "todo",
      title: t.title,
      detail: t.dueDate ? relativeDue(t.dueDate, now) : "今日待办",
      projectId: t.projectId,
      urgency: t.dueDate ? 15 + diffDays(t.dueDate, now) : 15,
      todoId: t.id,
      done: t.done,
    });
  }

  return tasks.sort((a, b) => Number(!!a.done) - Number(!!b.done) || a.urgency - b.urgency);
}
