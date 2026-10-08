import { Badge } from "@/components/ui/misc";
import { PAYMENT_STATUSES, PRIORITIES, PROJECT_STATUSES, labelOf, toneOf } from "@/lib/constants";
import type { PaymentStatus, Priority, ProjectStatus } from "@/lib/types";
import { diffDays, relativeDue, cn } from "@/lib/utils";
import { ACTIVE_STATUSES } from "@/lib/constants";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={toneOf(PROJECT_STATUSES, status)}>{labelOf(PROJECT_STATUSES, status)}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={toneOf(PAYMENT_STATUSES, status)}>{labelOf(PAYMENT_STATUSES, status)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === "low" || priority === "medium") return null;
  return <Badge tone={toneOf(PRIORITIES, priority)}>{labelOf(PRIORITIES, priority)}</Badge>;
}

export function DueText({ due, status, className }: { due?: string; status: ProjectStatus; className?: string }) {
  if (!due) return <span className={cn("text-subtle", className)}>无截止</span>;
  const active = ACTIVE_STATUSES.includes(status);
  const left = diffDays(due, new Date());
  const color = !active ? "text-muted" : left < 0 ? "text-danger" : left <= 2 ? "text-warning" : "text-muted";
  return <span className={cn(color, className)}>{active ? relativeDue(due) : due}</span>;
}
