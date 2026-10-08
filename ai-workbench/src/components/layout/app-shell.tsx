"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Bot,
  Calculator,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Menu,
  Package,
  Settings,
  Sparkles,
  TriangleAlert,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useWorkbench } from "@/lib/store";
import { generateTasks } from "@/lib/domain/tasks";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme";

export const NAV = [
  { href: "/", label: "首页", icon: LayoutDashboard },
  { href: "/tasks", label: "今日任务", icon: ListChecks, badge: "tasks" as const },
  { href: "/clients", label: "客户", icon: Users },
  { href: "/projects", label: "项目", icon: FolderKanban },
  { href: "/quotes", label: "报价", icon: Calculator },
  { href: "/payments", label: "收款", icon: Wallet },
  { href: "/services", label: "服务库", icon: Package },
  { href: "/tools", label: "AI 工具库", icon: Bot },
  { href: "/recommend", label: "AI 项目推荐", icon: Sparkles },
  { href: "/analytics", label: "收入分析", icon: BarChart3 },
  { href: "/settings", label: "设置与备份", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data, ready } = useWorkbench();
  const pending = ready ? generateTasks(data).filter((t) => !t.done).length : 0;
  return (
    <nav className="flex flex-col gap-0.5" aria-label="主导航">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
              active ? "bg-surface-2 font-medium text-fg" : "text-muted hover:bg-surface-2/70 hover:text-fg",
            )}
            aria-current={active ? "page" : undefined}
          >
            <item.icon size={16} className={active ? "text-accent" : undefined} />
            <span className="flex-1">{item.label}</span>
            {item.badge === "tasks" && pending > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-[10px] leading-4 font-semibold text-accent-fg">{pending}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  const { data } = useWorkbench();
  return (
    <Link href="/" className="flex items-center gap-2 px-1.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
        <Sparkles size={15} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">AI副业工作台</span>
        <span className="block truncate text-[11px] text-muted">{data.settings.businessName}</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { ready, saveError } = useWorkbench();

  useEffect(() => setOpen(false), [pathname]);

  const current = NAV.find((n) => isActive(pathname, n.href));

  return (
    <div className="min-h-dvh md:flex">
      {/* 桌面侧边栏 */}
      <aside className="no-print sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border bg-surface/60 px-3 py-4 md:flex">
        <Brand />
        <div className="mt-6 flex-1 overflow-y-auto scrollbar-thin">
          <NavList />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-[11px] text-subtle">数据保存在本机浏览器</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* 手机顶部栏 */}
      <header className="no-print sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-bg/85 px-3 backdrop-blur md:hidden">
        <button type="button" onClick={() => setOpen(true)} className="rounded-md p-1.5 text-muted hover:bg-surface-2" aria-label="打开菜单" data-testid="mobile-menu">
          <Menu size={20} />
        </button>
        <span className="text-sm font-semibold">{current?.label ?? "AI副业工作台"}</span>
        <ThemeToggle />
      </header>

      {/* 手机抽屉菜单 */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-64 max-w-[80vw] flex-col bg-surface px-3 py-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Brand />
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-muted" aria-label="关闭菜单">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1">
        {saveError && (
          <div className="no-print flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300" role="alert">
            <TriangleAlert size={14} /> {saveError}
          </div>
        )}
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 md:py-8">
          {ready ? children : <LoadingSkeleton />}
        </div>
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="加载中">
      <div className="h-7 w-40 rounded-lg bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-surface-2" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-surface-2" />
    </div>
  );
}
