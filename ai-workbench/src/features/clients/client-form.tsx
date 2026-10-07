"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useFeedback } from "@/components/ui/feedback";
import { CHANNELS } from "@/lib/constants";
import { useWorkbench } from "@/lib/store";
import type { Channel, Client } from "@/lib/types";

interface FormState {
  name: string;
  company: string;
  channel: Channel;
  wechat: string;
  phone: string;
  email: string;
  tags: string;
  notes: string;
}

const empty: FormState = { name: "", company: "", channel: "xianyu", wechat: "", phone: "", email: "", tags: "", notes: "" };

export function ClientFormDialog({
  open,
  onClose,
  client,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  client?: Client;
  onSaved?: (c: Client) => void;
}) {
  const { data, create, update } = useWorkbench();
  const { toast } = useFeedback();
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      client
        ? {
            name: client.name,
            company: client.company ?? "",
            channel: client.channel,
            wechat: client.wechat ?? "",
            phone: client.phone ?? "",
            email: client.email ?? "",
            tags: client.tags.join("，"),
            notes: client.notes ?? "",
          }
        : empty,
    );
  }, [open, client]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const allTags = [...new Set(data.clients.flatMap((c) => c.tags))].slice(0, 12);

  function validate() {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "请填写客户名称";
    else if (form.name.trim().length > 40) e.name = "名称不超过 40 个字";
    if (form.phone && !/^[\d\s+\-()]{5,20}$/.test(form.phone.trim())) e.phone = "电话格式不正确";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "邮箱格式不正确";
    if (!form.wechat.trim() && !form.phone.trim() && !form.email.trim()) e.wechat = "至少填写一种联系方式（微信/电话/邮箱）";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(ev?: React.FormEvent) {
    ev?.preventDefault();
    if (!validate()) return;
    const payload = {
      name: form.name.trim(),
      company: form.company.trim() || undefined,
      channel: form.channel,
      wechat: form.wechat.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      tags: [...new Set(form.tags.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean))],
      notes: form.notes.trim() || undefined,
    };
    if (client) {
      update("clients", client.id, payload);
      toast("客户已更新");
      onSaved?.({ ...client, ...payload });
    } else {
      const c = create("clients", payload);
      toast("客户已添加");
      onSaved?.(c);
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={client ? "编辑客户" : "新增客户"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => submit()}>{client ? "保存" : "添加客户"}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <Field label="客户名称" htmlFor="c-name" required error={errors.name}>
          <Input id="c-name" value={form.name} onChange={(e) => set("name", e.target.value)} invalid={!!errors.name} placeholder="如：林小姐" />
        </Field>
        <Field label="公司/店铺" htmlFor="c-company">
          <Input id="c-company" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="选填" />
        </Field>
        <Field label="来源渠道" htmlFor="c-channel" required>
          <Select id="c-channel" value={form.channel} onChange={(e) => set("channel", e.target.value as Channel)}>
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="微信" htmlFor="c-wechat" error={errors.wechat}>
          <Input id="c-wechat" value={form.wechat} onChange={(e) => set("wechat", e.target.value)} invalid={!!errors.wechat} />
        </Field>
        <Field label="电话" htmlFor="c-phone" error={errors.phone}>
          <Input id="c-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} invalid={!!errors.phone} inputMode="tel" />
        </Field>
        <Field label="邮箱" htmlFor="c-email" error={errors.email}>
          <Input id="c-email" value={form.email} onChange={(e) => set("email", e.target.value)} invalid={!!errors.email} inputMode="email" />
        </Field>
        <Field label="标签" htmlFor="c-tags" hint="用逗号或空格分隔" className="sm:col-span-2">
          <Input id="c-tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="回头客，高价值" />
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {allTags.map((t) => (
                <button
                  type="button"
                  key={t}
                  className="rounded-md border border-border px-1.5 py-0.5 text-xs text-muted hover:border-accent hover:text-accent"
                  onClick={() => {
                    const cur = form.tags.split(/[,，\s]+/).filter(Boolean);
                    if (!cur.includes(t)) set("tags", [...cur, t].join("，"));
                  }}
                >
                  + {t}
                </button>
              ))}
            </div>
          )}
        </Field>
        <Field label="备注" htmlFor="c-notes" className="sm:col-span-2">
          <Textarea id="c-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="偏好、沟通习惯等" />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Dialog>
  );
}
