"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, parseNum } from "@/components/ui/field";
import { useFeedback } from "@/components/ui/feedback";
import { DEAL_STATUSES, PAYMENT_KINDS, PAYMENT_METHODS } from "@/lib/constants";
import { useWorkbench } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import type { Payment, PaymentKind, PaymentMethod } from "@/lib/types";
import { money, todayKey } from "@/lib/utils";

export function PaymentFormDialog({
  open,
  onClose,
  projectId,
  payment,
}: {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  payment?: Payment;
}) {
  const { data, create, update } = useWorkbench();
  const { summaryOf, clientName } = useLookups();
  const { toast } = useFeedback();
  const [pid, setPid] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<PaymentKind>("deposit");
  const [method, setMethod] = useState<PaymentMethod>("wechat");
  const [paidAt, setPaidAt] = useState(todayKey());
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (payment) {
      setPid(payment.projectId);
      setAmount(String(payment.amount));
      setKind(payment.kind);
      setMethod(payment.method);
      setPaidAt(payment.paidAt);
      setNote(payment.note ?? "");
    } else {
      const initial = projectId ?? "";
      setPid(initial);
      setKind("deposit");
      setMethod("wechat");
      setPaidAt(todayKey());
      setNote("");
      if (initial) {
        const s = summaryOf(initial);
        setKind(s.net > 0 ? "final" : "deposit");
        setAmount(s.outstanding > 0 ? String(s.net > 0 ? s.outstanding : Math.round(s.amount / 2)) : "");
      } else setAmount("");
    }
    // 只在打开时初始化
  }, [open, payment, projectId]);

  const summary = pid ? summaryOf(pid) : undefined;
  // 可选项目：已报价的项目（含已成交），以及当前编辑的项目
  const projectOptions = data.projects.filter((p) => p.id === pid || DEAL_STATUSES.includes(p.status) || p.quotedPrice !== undefined);

  function submit(ev?: React.FormEvent) {
    ev?.preventDefault();
    const e: Record<string, string> = {};
    const n = parseNum(amount);
    if (!pid) e.project = "请选择项目";
    if (n === undefined || n <= 0) e.amount = "请输入大于 0 的金额";
    if (!paidAt) e.paidAt = "请选择日期";
    if (kind === "refund" && summary && n !== undefined && n > summary.net + (payment?.kind === "refund" ? payment.amount : 0))
      e.amount = `退款金额不能超过已收金额 ${money(summary.net)}`;
    setErrors(e);
    if (Object.keys(e).length) return;
    const payload = { projectId: pid, amount: n!, kind, method, paidAt, note: note.trim() || undefined };
    if (payment) {
      update("payments", payment.id, payload);
      toast("收款记录已更新");
    } else {
      create("payments", payload);
      toast(kind === "refund" ? "退款已记录" : "收款已记录");
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={payment ? "编辑收款记录" : "记录收款"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => submit()}>保存</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <Field label="项目" htmlFor="pay-project" required error={errors.project} className="sm:col-span-2">
          <Select id="pay-project" value={pid} onChange={(e) => setPid(e.target.value)} disabled={!!projectId && !payment} invalid={!!errors.project}>
            <option value="">选择项目</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {clientName(p.clientId)}</option>
            ))}
          </Select>
        </Field>
        {summary && (
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-2/60 p-3 text-xs sm:col-span-2">
            <div><div className="text-muted">应收</div><div className="mt-0.5 font-semibold">{money(summary.amount)}</div></div>
            <div><div className="text-muted">已收</div><div className="mt-0.5 font-semibold text-success">{money(summary.net)}</div></div>
            <div><div className="text-muted">未收</div><div className="mt-0.5 font-semibold text-warning">{money(summary.outstanding)}</div></div>
          </div>
        )}
        <Field label="金额" htmlFor="pay-amount" required error={errors.amount}>
          <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!errors.amount} placeholder="¥" />
        </Field>
        <Field label="类型" htmlFor="pay-kind">
          <Select id="pay-kind" value={kind} onChange={(e) => setKind(e.target.value as PaymentKind)}>
            {PAYMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </Select>
        </Field>
        <Field label="付款渠道" htmlFor="pay-method">
          <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </Select>
        </Field>
        <Field label="日期" htmlFor="pay-date" required error={errors.paidAt}>
          <Input id="pay-date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} invalid={!!errors.paidAt} />
        </Field>
        <Field label="备注" htmlFor="pay-note" className="sm:col-span-2">
          <Textarea id="pay-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Dialog>
  );
}
