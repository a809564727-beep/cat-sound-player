"use client";

import type { ReactNode } from "react";
import { WorkbenchProvider } from "@/lib/store";
import { FeedbackProvider } from "@/components/ui/feedback";
import { ThemeProvider } from "./theme";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WorkbenchProvider>
        <FeedbackProvider>{children}</FeedbackProvider>
      </WorkbenchProvider>
    </ThemeProvider>
  );
}
