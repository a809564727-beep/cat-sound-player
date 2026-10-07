import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl font-semibold text-subtle">404</div>
      <p className="mt-3 text-sm text-muted">页面不存在</p>
      <LinkButton href="/" className="mt-6">返回首页</LinkButton>
    </div>
  );
}
