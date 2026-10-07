"use client";

import { useState } from "react";
import { FolderPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, parseNum } from "@/components/ui/field";
import { Card, CardHeader, PageHeader } from "@/components/ui/misc";
import { ProjectFormDialog } from "@/features/projects/project-form";
import { RecommendPanel } from "@/features/recommend/recommend-panel";
import { QUALITY_LEVELS } from "@/lib/constants";
import { useWorkbench } from "@/lib/store";
import type { QualityLevel } from "@/lib/types";
import { addDays, diffDays, toDateKey } from "@/lib/utils";

export default function RecommendPage() {
  const { data } = useWorkbench();
  const services = data.services.filter((s) => s.active);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [budget, setBudget] = useState("");
  const [due, setDue] = useState(toDateKey(addDays(new Date(), 5)));
  const [quality, setQuality] = useState<QualityLevel>("standard");
  const [open, setOpen] = useState(false);
  const service = data.services.find((s) => s.id === serviceId);

  return (
    <>
      <PageHeader title="AI 项目推荐" description="输入服务类型、预算、时间和质量要求，获得工具组合、工作流、工期估算和风险提醒（规则引擎，离线可用）" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="h-fit p-4">
          <div className="space-y-4">
            <Field label="服务类型" htmlFor="r-service">
              <Select id="r-service" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="客户预算 ¥" htmlFor="r-budget" hint="留空表示未知">
              <Input id="r-budget" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder={service ? `基础价 ${service.basePrice}` : ""} />
            </Field>
            <Field label="截止日期" htmlFor="r-due" hint={due ? `还有 ${diffDays(due, new Date())} 天` : undefined}>
              <Input id="r-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
            <Field label="质量要求" htmlFor="r-quality">
              <Select id="r-quality" value={quality} onChange={(e) => setQuality(e.target.value as QualityLevel)}>
                {QUALITY_LEVELS.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
              </Select>
            </Field>
            <Button className="w-full" variant="outline" onClick={() => setOpen(true)} disabled={!service}><FolderPlus size={16} /> 用此服务新建项目</Button>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title={<span className="flex items-center gap-1.5"><Sparkles size={15} className="text-accent" /> 推荐方案</span>} description={service ? `${service.name} · ${service.deliverables}` : "请先在服务库中添加服务"} />
          <div className="px-4 pb-4">
            {service && (
              <RecommendPanel
                input={{
                  category: service.category,
                  budget: parseNum(budget),
                  daysAvailable: due ? diffDays(due, new Date()) : undefined,
                  quality,
                  baseHours: service.estimatedHours,
                  basePrice: service.basePrice,
                }}
              />
            )}
          </div>
        </Card>
      </div>
      <ProjectFormDialog open={open} onClose={() => setOpen(false)} defaults={{ serviceId }} />
    </>
  );
}
