"use client";

import type { TaskStatus } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export function StatusDashboard({
  status,
  progress,
  error,
}: {
  status: TaskStatus | undefined;
  progress: number;
  error: string | null | undefined;
}) {
  const active = status === "pending" || status === "processing";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Task status</span>
        <Badge
          variant={
            status === "failed"
              ? "destructive"
              : status === "completed"
                ? "default"
                : "secondary"
          }
        >
          {active && <Loader2Icon className="size-3 animate-spin" />}
          {status ? STATUS_LABEL[status] : "…"}
        </Badge>
      </div>

      {active && (
        <div className="flex flex-col gap-1">
          <Progress value={Math.max(progress, 5)} className="w-full" />
          <span className="text-right text-xs text-muted-foreground tabular-nums">
            {progress}%
          </span>
        </div>
      )}

      {status === "failed" && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Conversion failed</AlertTitle>
          <AlertDescription>{error ?? "An unknown error occurred."}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
