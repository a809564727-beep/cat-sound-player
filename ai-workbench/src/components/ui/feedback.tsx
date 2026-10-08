"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CircleCheck, TriangleAlert, Info, X } from "lucide-react";
import { Dialog } from "./dialog";
import { Button } from "./button";
import { cn } from "@/lib/utils";

/* ---------------- Toast ---------------- */

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  danger?: boolean;
}

interface FeedbackContextValue {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = ++counter.current;
      setToasts((t) => [...t.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 5000 : 2800);
    },
    [dismiss],
  );

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({ ...opts, resolve });
      }),
    [],
  );

  const close = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6" aria-live="polite">
        {toasts.map((t) => {
          const Icon = t.kind === "success" ? CircleCheck : t.kind === "error" ? TriangleAlert : Info;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 text-sm shadow-lg"
            >
              <Icon size={17} className={cn("mt-px shrink-0", t.kind === "success" ? "text-success" : t.kind === "error" ? "text-danger" : "text-accent")} />
              <span className="min-w-0 flex-1 break-words">{t.message}</span>
              <button type="button" onClick={() => dismiss(t.id)} className="text-subtle hover:text-fg" aria-label="关闭提示">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
      <Dialog
        open={!!confirmState}
        onClose={() => close(false)}
        title={confirmState?.title ?? ""}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => close(false)}>取消</Button>
            <Button variant={confirmState?.danger ? "danger" : "primary"} onClick={() => close(true)} data-autofocus>
              {confirmState?.confirmText ?? "确认"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{confirmState?.description ?? "确定要继续吗？"}</p>
      </Dialog>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback 必须在 FeedbackProvider 内使用");
  return ctx;
}
