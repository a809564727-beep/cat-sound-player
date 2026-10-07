"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemePref = "light" | "dark" | "system";
const KEY = "ai-workbench:theme";

const ThemeContext = createContext<{ pref: ThemePref; setPref: (p: ThemePref) => void; isDark: boolean } | null>(null);

function systemDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>("system");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as ThemePref | null;
      if (saved === "light" || saved === "dark" || saved === "system") setPrefState(saved);
    } catch {
      /* 隐私模式等情况下忽略 */
    }
  }, []);

  useEffect(() => {
    const apply = () => {
      const dark = pref === "dark" || (pref === "system" && systemDark());
      document.documentElement.classList.toggle("dark", dark);
      setIsDark(dark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pref]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* ignore */
    }
  }, []);

  return <ThemeContext.Provider value={{ pref, setPref, isDark }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme 必须在 ThemeProvider 内使用");
  return ctx;
}

const NEXT: Record<ThemePref, ThemePref> = { light: "dark", dark: "system", system: "light" };
const LABEL: Record<ThemePref, string> = { light: "浅色", dark: "深色", system: "跟随系统" };

export function ThemeToggle({ withLabel }: { withLabel?: boolean }) {
  const { pref, setPref } = useTheme();
  const Icon = pref === "light" ? Sun : pref === "dark" ? Moon : Monitor;
  return (
    <button
      type="button"
      onClick={() => setPref(NEXT[pref])}
      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-muted hover:bg-surface-2 hover:text-fg"
      title={`主题：${LABEL[pref]}（点击切换）`}
      aria-label={`切换主题，当前：${LABEL[pref]}`}
      data-testid="theme-toggle"
    >
      <Icon size={16} />
      {withLabel && <span>{LABEL[pref]}</span>}
    </button>
  );
}
