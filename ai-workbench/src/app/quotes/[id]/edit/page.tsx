"use client";

import { useParams } from "next/navigation";
import { FileX } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { QuoteEditor } from "@/features/quotes/quote-editor";
import { useWorkbench } from "@/lib/store";

export default function EditQuotePage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useWorkbench();
  const quote = data.quotes.find((q) => q.id === id);
  if (!quote) return <Card><EmptyState icon={FileX} title="报价单不存在" action={<LinkButton href="/quotes">返回报价列表</LinkButton>} /></Card>;
  return (
    <>
      <PageHeader title={`编辑报价 ${quote.number}`} />
      <QuoteEditor key={quote.id} quote={quote} />
    </>
  );
}
