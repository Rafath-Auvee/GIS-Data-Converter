"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { LayersIcon, PlusIcon } from "lucide-react";
import {
  ACCEPTED_EXTENSIONS,
  conversionLabel,
  downloadUrl,
  getTask,
  listTasks,
  uploadFile,
  type Task,
} from "@/lib/api";
import { useConverterStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/converter/file-dropzone";
import { ConfigPanel } from "@/components/converter/config-panel";
import { StatusDashboard } from "@/components/converter/status-dashboard";
import { ResultCard } from "@/components/converter/result-card";
import { HistoryList } from "./history-list";
import { ActivityLog, type LogEntry } from "./activity-log";

export function Dashboard() {
  const qc = useQueryClient();
  const {
    conversion,
    targetEpsg,
    resolution,
    band,
    taskId,
    setConversion,
    setTargetEpsg,
    setResolution,
    setBand,
    setTaskId,
  } = useConverterStore();

  const [file, setFile] = React.useState<File | null>(null);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const toastId = React.useRef<string | undefined>(undefined);
  const lastKey = React.useRef<string>("");

  const addLog = React.useCallback(
    (message: string, level: LogEntry["level"] = "info") => {
      setLogs((l) => [...l, { time: new Date().toLocaleTimeString(), message, level }]);
    },
    [],
  );

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Please choose a file first.");
      return uploadFile({
        file,
        conversion,
        targetEpsg: conversion === "reproject" ? targetEpsg ?? undefined : undefined,
        resolution: conversion === "geojson_to_raster" ? resolution ?? undefined : undefined,
        band: conversion === "raster_to_geojson" ? band ?? undefined : undefined,
      });
    },
    onMutate: () => {
      setLogs([]);
      lastKey.current = "";
      addLog(`Uploading "${file?.name}" for ${conversionLabel(conversion)}`);
      toastId.current = toast.loading("Uploading file…");
    },
    onSuccess: (res) => {
      setTaskId(res.task_id);
      addLog(`Task created (${res.task_id.slice(0, 8)}…), queued`, "success");
      toast.loading("Queued for conversion…", { id: toastId.current });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err) => {
      addLog((err as Error).message, "error");
      toast.error((err as Error).message, { id: toastId.current });
    },
  });

  const task = useQuery<Task>({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId as string),
    enabled: !!taskId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "completed" || s === "failed" ? false : 1000;
    },
  });

  const history = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: listTasks,
    refetchInterval: 5000,
  });

  const status = task.data?.status;
  const progress = task.data?.progress ?? 0;

  // Drive the detailed log + toasts off task status/progress transitions.
  // Accumulating a log from the polling query is an intentional external-sync
  // pattern (dedup-guarded via lastKey, so no cascading renders).
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (!taskId || !status) return;
    const key = `${status}:${progress}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    if (status === "processing") {
      addLog(`Processing… ${progress}%`);
      toast.loading(`Converting… ${progress}%`, { id: toastId.current });
    } else if (status === "completed") {
      addLog(
        `Completed -> ${task.data?.output_filename} (${task.data?.output_size ?? 0} bytes)`,
        "success",
      );
      toast.success("Conversion complete!", { id: toastId.current });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    } else if (status === "failed") {
      addLog(`Failed: ${task.data?.error ?? "unknown error"}`, "error");
      toast.error(task.data?.error ?? "Conversion failed.", { id: toastId.current });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    }
  }, [status, progress, taskId, task.data, addLog, qc]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function pickFile(f: File | null) {
    setFile(f);
    setTaskId(null);
    setLogs([]);
  }

  function newConversion() {
    setFile(null);
    setTaskId(null);
    setLogs([]);
    upload.reset();
  }

  function selectHistory(t: Task) {
    setTaskId(t.id);
    setLogs([]);
    lastKey.current = "";
  }

  function handleDeleted(id: string | "all") {
    if (id === "all" || id === taskId) {
      setTaskId(null);
      setLogs([]);
    }
  }

  const busy = upload.isPending || status === "pending" || status === "processing";

  return (
    <div className="flex h-screen w-full">
      <aside className="hidden w-72 shrink-0 flex-col border-r bg-muted/20 md:flex">
        <div className="flex items-center gap-2.5 border-b px-4 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-linear-to-br from-primary to-indigo-400 text-primary-foreground shadow-sm">
            <LayersIcon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">GIS Converter</p>
            <p className="text-xs text-muted-foreground">Geospatial dashboard</p>
          </div>
        </div>
        <div className="p-3">
          <Button variant="outline" className="w-full justify-center" onClick={newConversion}>
            <PlusIcon />
            New conversion
          </Button>
        </div>
        <HistoryList
          tasks={history.data ?? []}
          activeId={taskId}
          onSelect={selectHistory}
          onDeleted={handleDeleted}
        />
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
          <header>
            <h1 className="text-2xl font-bold tracking-tight">GIS Data Converter</h1>
            <p className="text-sm text-muted-foreground">
              Upload a geospatial file, choose a conversion, and download the result.
            </p>
          </header>

          <Card>
            <CardContent className="flex flex-col gap-6 pt-6">
              <FileDropzone
                file={file}
                accept={ACCEPTED_EXTENSIONS[conversion]}
                disabled={busy}
                onFile={pickFile}
              />
              <ConfigPanel
                conversion={conversion}
                targetEpsg={targetEpsg}
                resolution={resolution}
                band={band}
                disabled={busy}
                onConversion={setConversion}
                onEpsg={setTargetEpsg}
                onResolution={setResolution}
                onBand={setBand}
              />
              <div className="flex justify-end">
                <Button onClick={() => upload.mutate()} disabled={!file || busy}>
                  {busy ? "Converting…" : "Convert"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {taskId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <StatusDashboard status={status} progress={progress} error={task.data?.error} />
                {status === "completed" && (
                  <ResultCard
                    filename={task.data?.output_filename ?? null}
                    size={task.data?.output_size ?? null}
                    href={downloadUrl(taskId)}
                  />
                )}
                <ActivityLog logs={logs} />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
