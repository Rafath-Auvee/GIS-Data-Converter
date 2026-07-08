"use client";

import { useQueries } from "@tanstack/react-query";
import { CheckCircle2Icon, DownloadIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { conversionLabel, downloadUrl, getTask, type Task } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function StatusIcon({ status }: { status: Task["status"] }) {
  if (status === "completed") return <CheckCircle2Icon className="size-4 text-emerald-500" />;
  if (status === "failed") return <XCircleIcon className="size-4 text-destructive" />;
  return <Loader2Icon className="size-4 animate-spin text-primary" />;
}

export function BatchProgress({ taskIds }: { taskIds: string[] }) {
  const results = useQueries({
    queries: taskIds.map((id) => ({
      queryKey: ["task", id],
      queryFn: () => getTask(id),
      refetchInterval: (q: { state: { data?: Task } }) => {
        const s = q.state.data?.status;
        return s === "completed" || s === "failed" ? false : 1000;
      },
    })),
  });

  const tasks = results.map((r) => r.data).filter((t): t is Task => Boolean(t));
  const done = tasks.filter((t) => t.status === "completed" || t.status === "failed").length;
  const succeeded = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Batch progress · {done}/{taskIds.length} finished
        </p>
        {done === taskIds.length && (
          <Badge variant="outline">
            {succeeded} succeeded · {done - succeeded} failed
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {results.map((r, i) => {
          const t = r.data;
          const id = taskIds[i];
          return (
            <div
              key={id}
              className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
            >
              {t ? <StatusIcon status={t.status} /> : <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {t?.source_filename ?? `Task ${id.slice(0, 8)}…`}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {t ? conversionLabel(t.conversion) : "loading…"}
                  {t?.status === "failed" && t.error ? ` · ${t.error}` : ""}
                </p>
              </div>
              {t?.status === "completed" ? (
                <Button size="sm" variant="ghost" nativeButton={false} render={<a href={downloadUrl(id)} download />}>
                  <DownloadIcon />
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">{t?.progress ?? 0}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
