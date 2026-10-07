"use client";

import { useMemo, useState } from "react";
import { AreaTrend, BarSeries, Donut, RankBars } from "@/components/charts";
import { Card, CardHeader, PageHeader, Segmented, StatCard } from "@/components/ui/misc";
import { PAYMENT_METHODS } from "@/lib/constants";
import {
  averageOrderValue,
  completionRate,
  conversionRate,
  incomeInMonth,
  isDeal,
  monthlyTrend,
  revenueByChannel,
  revenueByService,
  totalIncome,
} from "@/lib/domain/stats";
import { signedAmount } from "@/lib/domain/payments";
import { useWorkbench } from "@/lib/store";
import { money, monthKey, percent, round2 } from "@/lib/utils";

const METHOD_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#f97316", "#a1a1aa"];

export default function AnalyticsPage() {
  const { data } = useWorkbench();
  const [range, setRange] = useState<"6" | "12">("6");

  const s = useMemo(() => {
    const now = new Date();
    const thisMonth = monthKey(now);
    const deals = data.projects.filter(isDeal);
    const byMethod = PAYMENT_METHODS.map((m, i) => ({
      name: m.label,
      value: round2(data.payments.filter((p) => p.method === m.value).reduce((acc, p) => acc + signedAmount(p), 0)),
      color: METHOD_COLORS[i],
    })).filter((x) => x.value > 0);
    return {
      monthIncome: incomeInMonth(data.payments, thisMonth),
      total: totalIncome(data.payments),
      avg: averageOrderValue(data.projects),
      conversion: conversionRate(data.projects),
      completion: completionRate(data.projects),
      dealCount: deals.length,
      completed: deals.filter((p) => p.status === "completed").length,
      trend: monthlyTrend(data.projects, data.payments, Number(range), now),
      services: revenueByService(data.projects, data.payments, data.services),
      channels: revenueByChannel(data.clients, data.projects, data.payments),
      byMethod,
    };
  }, [data, range]);

  return (
    <>
      <PageHeader
        title="收入分析"
        description="收入按实际收款日期统计（退款计为负数）"
        actions={<Segmented value={range} onChange={setRange} options={[{ value: "6", label: "近 6 个月" }, { value: "12", label: "近 12 个月" }]} />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="本月收入" value={money(s.monthIncome)} />
        <StatCard label="历史总收入" value={money(s.total)} />
        <StatCard label="平均客单价" value={money(s.avg)} hint={`${s.dealCount} 个成交订单`} />
        <StatCard label="订单转化率" value={percent(s.conversion)} hint={`成交 ${s.dealCount} / 全部 ${data.projects.length}`} />
        <StatCard label="项目完成率" value={percent(s.completion)} hint={`完成 ${s.completed} / 成交 ${s.dealCount}`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="月度收入趋势" description={`近 ${range} 个月合计 ${money(s.trend.reduce((a, b) => a + b.income, 0))}`} />
          <div className="px-2 pb-3"><AreaTrend data={s.trend} xKey="label" yKey="income" name="收入" /></div>
        </Card>
        <Card>
          <CardHeader title="月度成交订单" />
          <div className="px-2 pb-3"><BarSeries data={s.trend} xKey="label" yKey="orders" name="成交订单" height={220} /></div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="服务收入排名" description="按已收款统计" />
          <div className="px-4 pb-4"><RankBars data={s.services.slice(0, 8)} extra={(d) => `${d.count ?? 0} 单`} /></div>
        </Card>
        <Card>
          <CardHeader title="客户来源排名" description="各渠道带来的收入与客户数" />
          <div className="px-4 pb-4"><RankBars data={s.channels} extra={(d) => `${d.count ?? 0} 位`} /></div>
        </Card>
        <Card>
          <CardHeader title="收款渠道分布" />
          <div className="px-4 pb-4">
            {s.byMethod.length ? (
              <>
                <Donut data={s.byMethod} height={160} />
                <ul className="mt-3 space-y-1.5 text-xs">
                  {s.byMethod.map((m) => (
                    <li key={m.name} className="flex justify-between">
                      <span className="flex items-center gap-1.5 text-muted"><span className="h-2 w-2 rounded-full" style={{ background: m.color }} />{m.name}</span>
                      <span className="tabular-nums">{money(m.value)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="py-6 text-center text-xs text-muted">暂无收款</p>
            )}
          </div>
        </Card>
      </div>
      <p className="mt-4 text-center text-[11px] text-subtle">
        口径说明：订单转化率 = 已成交项目 / 全部项目；项目完成率 = 已完成 / 已成交；平均客单价按已成交项目的成交价（无成交价时用报价）计算。
      </p>
    </>
  );
}
