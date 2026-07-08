"use client";

import { cn } from "@/lib/utils";

export type LogEntry = {
  time: string;
  message: string;
  level: "info" | "success" | "error";
};

export function ActivityLog({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">Detailed log</p>
      <div className="max-h-52 overflow-y-auto rounded-lg border bg-zinc-950 p-3 font-mono text-xs leading-relaxed">
        {logs.map((l, i) => (
          <div key={i} className="flex gap-2">
            <span className="shrink-0 text-zinc-500">{l.time}</span>
            <span
              className={cn(
                "text-zinc-300",
                l.level === "error" && "text-red-400",
                l.level === "success" && "text-emerald-400",
              )}
            >
              {l.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
