"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { QuoteEditor } from "@/features/quotes/quote-editor";

function NewQuote() {
  const params = useSearchParams();
  return (
    <>
      <PageHeader title="新建报价" description="选择客户和服务，自动计算原价、优惠与最终报价" />
      <QuoteEditor presetProjectId={params.get("projectId") ?? undefined} presetClientId={params.get("clientId") ?? undefined} />
    </>
  );
}

export default function NewQuotePage() {
  return (
    <Suspense>
      <NewQuote />
    </Suspense>
  );
}
