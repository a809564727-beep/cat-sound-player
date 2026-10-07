"use client";

import { Clock, ExternalLink, Lightbulb, TriangleAlert, Wallet } from "lucide-react";
import { recommend, type RecommendInput } from "@/lib/domain/recommend";
import { useWorkbench } from "@/lib/store";
import { cn, money } from "@/lib/utils";

const RISK_STYLE = {
  high: "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300",
  medium: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  low: "border-border bg-surface-2/50 text-muted",
};
const RISK_LABEL = { high: "高", medium: "中", low: "提示" };

export function RecommendPanel({ input, compact }: { input: RecommendInput; compact?: boolean }) {
  const { data } = useWorkbench();
  const rec = recommend(input, data.tools);

  return (
    <div className="space-y-4" data-testid="recommend-panel">
      <div className="grid grid-cols-3 gap-2">
        <Metric icon={Clock} label="预计工时" value={`${rec.estimatedHours} 小时`} />
        <Metric icon={Clock} label="预计周期" value={`${rec.estimatedDays} 天`} />
        <Metric icon={Wallet} label="建议报价" value={money(rec.suggestedPrice)} />
      </div>

      <div>
        <h4 className="mb-2 text-xs font-medium text-muted">推荐 AI 工具</h4>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rec.tools.map((t) => (
            <li key={t.name} className="rounded-lg border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t.name}</span>
                {t.tool?.url && (
                  <a href={t.tool.url} target="_blank" rel="noreferrer" className="text-subtle hover:text-accent" aria-label={`打开 ${t.name}`}>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted">{t.reason}</p>
              {t.tool && !compact && <p className="mt-0.5 text-[11px] text-subtle">{t.tool.pricing}</p>}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted"><Lightbulb size={13} /> 建议工作流</h4>
        <ol className="space-y-1.5">
          {rec.workflow.map((step, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">{i + 1}</span>
              <span className="min-w-0">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted"><TriangleAlert size={13} /> 风险提醒</h4>
        <ul className="space-y-1.5">
          {(compact ? rec.risks.slice(0, 4) : rec.risks).map((r, i) => (
            <li key={i} className={cn("rounded-lg border px-3 py-2 text-xs", RISK_STYLE[r.level])}>
              <span className="mr-1.5 font-semibold">[{RISK_LABEL[r.level]}]</span>
              {r.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2/60 px-3 py-2">
      <div className="flex items-center gap-1 text-[11px] text-muted"><Icon size={12} />{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
