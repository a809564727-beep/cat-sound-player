"use client";

import { useEffect, useRef, useState } from "react";
import { Database, Download, RotateCcw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, parseNum } from "@/components/ui/field";
import { Card, CardHeader, PageHeader } from "@/components/ui/misc";
import { useFeedback } from "@/components/ui/feedback";
import { ThemeToggle } from "@/components/layout/theme";
import { useWorkbench } from "@/lib/store";
import { todayKey } from "@/lib/utils";

export default function SettingsPage() {
  const { data, updateSettings, replaceAll, resetToSeed, clearBusinessData } = useWorkbench();
  const { confirm, toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState(() => ({
    businessName: data.settings.businessName,
    ownerName: data.settings.ownerName,
    contact: data.settings.contact,
    quoteFooter: data.settings.quoteFooter,
    replyReminderDays: String(data.settings.replyReminderDays),
    dueSoonDays: String(data.settings.dueSoonDays),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [size, setSize] = useState(0);

  useEffect(() => {
    setSize(new Blob([JSON.stringify(data)]).size);
  }, [data]);

  useEffect(() => {
    setF({
      businessName: data.settings.businessName,
      ownerName: data.settings.ownerName,
      contact: data.settings.contact,
      quoteFooter: data.settings.quoteFooter,
      replyReminderDays: String(data.settings.replyReminderDays),
      dueSoonDays: String(data.settings.dueSoonDays),
    });
  }, [data.settings]);

  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  function save(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!f.businessName.trim()) err.businessName = "请填写工作室名称";
    const r = parseNum(f.replyReminderDays);
    const d = parseNum(f.dueSoonDays);
    if (r === undefined || r < 1 || !Number.isInteger(r)) err.replyReminderDays = "请输入正整数";
    if (d === undefined || d < 0 || !Number.isInteger(d)) err.dueSoonDays = "请输入非负整数";
    setErrors(err);
    if (Object.keys(err).length) return;
    updateSettings({ businessName: f.businessName.trim(), ownerName: f.ownerName.trim(), contact: f.contact.trim(), quoteFooter: f.quoteFooter.trim(), replyReminderDays: r!, dueSoonDays: d! });
    toast("设置已保存");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-workbench-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("备份文件已下载");
  }

  async function importData(file: File) {
    try {
      const json = JSON.parse(await file.text());
      const ok = await confirm({ title: "导入备份？", description: `将用「${file.name}」覆盖当前所有数据。建议先导出一份当前数据作为备份。`, confirmText: "覆盖导入", danger: true });
      if (!ok) return;
      replaceAll(json);
      toast("数据已导入");
    } catch (e) {
      toast(e instanceof SyntaxError ? "文件不是有效的 JSON" : (e as Error).message || "导入失败", "error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <PageHeader title="设置与备份" description="工作室信息会显示在报价单上；数据只保存在当前浏览器，请定期导出备份" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="工作室信息" />
          <form onSubmit={save} className="space-y-4 px-4 pb-4" noValidate>
            <Field label="工作室名称" htmlFor="st-name" required error={errors.businessName}>
              <Input id="st-name" value={f.businessName} onChange={(e) => set("businessName", e.target.value)} invalid={!!errors.businessName} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="你的称呼" htmlFor="st-owner">
                <Input id="st-owner" value={f.ownerName} onChange={(e) => set("ownerName", e.target.value)} placeholder="用于首页问候和报价单" />
              </Field>
              <Field label="联系方式" htmlFor="st-contact">
                <Input id="st-contact" value={f.contact} onChange={(e) => set("contact", e.target.value)} />
              </Field>
            </div>
            <Field label="报价单底部说明" htmlFor="st-footer">
              <Textarea id="st-footer" rows={3} value={f.quoteFooter} onChange={(e) => set("quoteFooter", e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="客户几天未回复提醒" htmlFor="st-reply" error={errors.replyReminderDays}>
                <Input id="st-reply" inputMode="numeric" value={f.replyReminderDays} onChange={(e) => set("replyReminderDays", e.target.value)} invalid={!!errors.replyReminderDays} />
              </Field>
              <Field label="截止前几天算「快到期」" htmlFor="st-due" error={errors.dueSoonDays}>
                <Input id="st-due" inputMode="numeric" value={f.dueSoonDays} onChange={(e) => set("dueSoonDays", e.target.value)} invalid={!!errors.dueSoonDays} />
              </Field>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted">主题 <ThemeToggle withLabel /></span>
              <Button type="submit">保存设置</Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="数据管理" description={`当前数据约 ${(size / 1024).toFixed(1)} KB，保存在浏览器 localStorage`} />
          <div className="space-y-4 px-4 pb-4">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[["客户", data.clients.length], ["项目", data.projects.length], ["收款", data.payments.length], ["报价", data.quotes.length]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface-2/60 py-2"><div className="text-base font-semibold">{v}</div><div className="text-muted">{k}</div></div>
              ))}
            </div>
            <div className="space-y-2">
              <Row icon={Download} title="导出备份" desc="下载全部数据为 JSON 文件，可在其他电脑导入">
                <Button variant="outline" size="sm" onClick={exportData}>导出</Button>
              </Row>
              <Row icon={Upload} title="导入备份" desc="从 JSON 备份文件恢复（会覆盖当前数据）">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>选择文件</Button>
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" data-testid="import-input" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
              </Row>
              <Row icon={RotateCcw} title="恢复示例数据" desc="用内置的示例数据替换当前数据">
                <Button variant="outline" size="sm" onClick={async () => {
                  if (await confirm({ title: "恢复示例数据？", description: "当前所有数据将被示例数据替换，无法撤销。", confirmText: "恢复", danger: true })) {
                    resetToSeed();
                    toast("已恢复示例数据");
                  }
                }}>恢复</Button>
              </Row>
              <Row icon={Trash2} title="清空业务数据" desc="删除客户、项目、报价、收款、待办；保留服务库、工具库和设置">
                <Button variant="danger" size="sm" onClick={async () => {
                  if (await confirm({ title: "清空所有业务数据？", description: "客户、项目、报价、收款和待办将被永久删除。建议先导出备份。", confirmText: "清空", danger: true })) {
                    clearBusinessData();
                    toast("业务数据已清空");
                  }
                }}>清空</Button>
              </Row>
            </div>
            <p className="flex items-start gap-2 rounded-lg bg-surface-2/60 p-3 text-xs text-muted">
              <Database size={14} className="mt-0.5 shrink-0" />
              数据只存在本机浏览器中，清除浏览器数据或换电脑会丢失。建议每周导出一次备份。未来版本可接入云数据库自动同步。
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}

function Row({ icon: Icon, title, desc, children }: { icon: typeof Download; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <Icon size={16} className="shrink-0 text-subtle" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      {children}
    </div>
  );
}
