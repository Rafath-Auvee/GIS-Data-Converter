"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ACCEPTED_EXTENSIONS,
  downloadUrl,
  getTask,
  uploadFile,
  type Task,
} from "@/lib/api";
import { useConverterStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileDropzone } from "./file-dropzone";
import { ConfigPanel } from "./config-panel";
import { StatusDashboard } from "./status-dashboard";
import { ResultCard } from "./result-card";

export function Converter() {
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
    reset,
  } = useConverterStore();
  const [file, setFile] = React.useState<File | null>(null);
  const toastId = React.useRef<string | number | undefined>(undefined);

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
      toastId.current = toast.loading("Uploading file…");
    },
    onSuccess: (res) => {
      setTaskId(res.task_id);
      toast.loading("Queued for conversion…", { id: toastId.current });
    },
    onError: (err) => {
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

  const status = task.data?.status;
  const progress = task.data?.progress ?? 0;

  // Drive the progress / complete / error toasts off the task status.
  React.useEffect(() => {
    if (!taskId || !status) return;
    if (status === "pending" || status === "processing") {
      toast.loading(`Converting… ${progress}%`, { id: toastId.current });
    } else if (status === "completed") {
      toast.success("Conversion complete!", { id: toastId.current });
    } else if (status === "failed") {
      toast.error(task.data?.error ?? "Conversion failed.", { id: toastId.current });
    }
  }, [status, progress, taskId, task.data?.error]);

  function pickFile(f: File | null) {
    setFile(f);
    setTaskId(null);
    upload.reset();
  }

  const busy = upload.isPending || status === "pending" || status === "processing";

  return (
    <Card>
      <CardHeader>
        <CardTitle>GIS Data Converter</CardTitle>
        <CardDescription>
          Upload a geospatial file, choose a conversion, and download the result.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
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

        {upload.isError && (
          <p className="text-sm text-destructive">{(upload.error as Error).message}</p>
        )}

        {taskId && (
          <>
            <Separator />
            <StatusDashboard status={status} progress={progress} error={task.data?.error} />
            {status === "completed" && (
              <ResultCard
                filename={task.data?.output_filename ?? null}
                size={task.data?.output_size ?? null}
                href={downloadUrl(taskId)}
              />
            )}
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        {taskId && !busy && (
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              setFile(null);
            }}
          >
            Reset
          </Button>
        )}
        <Button onClick={() => upload.mutate()} disabled={!file || busy}>
          {busy ? "Converting…" : "Convert"}
        </Button>
      </CardFooter>
    </Card>
  );
}
