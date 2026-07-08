"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DownloadIcon, Trash2Icon } from "lucide-react";
import {
  clearTasks,
  conversionLabel,
  deleteTask,
  downloadUrl,
  type Task,
  type TaskStatus,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<TaskStatus, "default" | "secondary" | "destructive"> = {
  completed: "default",
  failed: "destructive",
  processing: "secondary",
  pending: "secondary",
};

export function HistoryList({
  tasks,
  activeId,
  onSelect,
  onDeleted,
}: {
  tasks: Task[];
  activeId: string | null;
  onSelect: (t: Task) => void;
  onDeleted: (id: string | "all") => void;
}) {
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onDeleted(id);
      toast.success("Task deleted");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const clear = useMutation({
    mutationFn: () => clearTasks(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onDeleted("all");
      toast.success("History cleared");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="flex-1 overflow-y-auto px-2 pb-4">
      <div className="flex items-center justify-between px-2 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          History
        </p>
        {tasks.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Delete all conversion history?")) clear.mutate();
            }}
            disabled={clear.isPending}
            className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
          >
            Clear all
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="px-2 py-4 text-xs text-muted-foreground">No conversions yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {tasks.map((t) => (
            <li key={t.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(t)}
                onKeyDown={(e) => e.key === "Enter" && onSelect(t)}
                className={cn(
                  "group cursor-pointer rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:bg-accent",
                  activeId === t.id && "border-border bg-accent",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs font-medium">
                    Task {t.id.slice(0, 8)}…
                  </span>
                  <Badge variant={STATUS_VARIANT[t.status]} className="shrink-0 text-[10px]">
                    {t.status}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-muted-foreground">
                    {conversionLabel(t.conversion)} · {t.source_filename}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {t.status === "completed" && (
                      <a
                        href={downloadUrl(t.id)}
                        download
                        onClick={(e) => e.stopPropagation()}
                        title="Download result"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <DownloadIcon className="size-3.5" />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        del.mutate(t.id);
                      }}
                      title="Delete task"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
