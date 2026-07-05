"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  CONVERSIONS,
  downloadUrl,
  getTask,
  uploadFile,
  type Task,
} from "@/lib/api";
import { useConverterStore } from "@/lib/store";

function humanSize(bytes: number | null): string {
  if (bytes == null) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

export default function Home() {
  const { conversion, targetEpsg, taskId, setConversion, setTargetEpsg, setTaskId } =
    useConverterStore();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Please choose a file first.");
      return uploadFile({
        file,
        conversion,
        targetEpsg: conversion === "reproject" ? targetEpsg ?? undefined : undefined,
      });
    },
    onSuccess: (res) => setTaskId(res.task_id),
  });

  const task = useQuery<Task>({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId as string),
    enabled: !!taskId,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "completed" || status === "failed" ? false : 1000;
    },
  });

  const status = task.data?.status;
  const progress = task.data?.progress ?? 0;

  function pickFile(f: File | null) {
    setFile(f);
    setTaskId(null);
    upload.reset();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">GIS Data Converter</h1>
        <p className="mt-1 text-sm opacity-70">
          Upload a geospatial file, choose a conversion, and download the result.
        </p>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => fileInput.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
          dragging ? "border-blue-500 bg-blue-500/5" : "border-black/15 dark:border-white/20"
        }`}
      >
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <p className="text-sm">
            <span className="font-medium">{file.name}</span>
            <span className="opacity-60"> — {humanSize(file.size)}</span>
          </p>
        ) : (
          <p className="text-sm opacity-70">
            Drag &amp; drop a file here, or click to browse
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Conversion</span>
          <select
            value={conversion}
            onChange={(e) => setConversion(e.target.value as typeof conversion)}
            className="rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          >
            {CONVERSIONS.map((c) => (
              <option key={c.value} value={c.value} className="text-black">
                {c.label}
              </option>
            ))}
          </select>
        </label>

        {conversion === "reproject" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Target EPSG</span>
            <input
              type="number"
              value={targetEpsg ?? ""}
              onChange={(e) =>
                setTargetEpsg(e.target.value ? Number(e.target.value) : null)
              }
              placeholder="e.g. 3857"
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
            />
          </label>
        )}
      </div>

      <button
        onClick={() => upload.mutate()}
        disabled={!file || upload.isPending}
        className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {upload.isPending ? "Uploading…" : "Convert"}
      </button>

      {upload.isError && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {(upload.error as Error).message}
        </p>
      )}

      {taskId && (
        <section className="mt-8 rounded-xl border border-black/10 p-5 dark:border-white/15">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Task status</h2>
            <span className="rounded-full bg-black/5 px-3 py-0.5 text-xs uppercase tracking-wide dark:bg-white/10">
              {status ?? "loading…"}
            </span>
          </div>

          {(status === "pending" || status === "processing") && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${Math.max(progress, 8)}%` }}
              />
            </div>
          )}

          {status === "failed" && (
            <p className="mt-4 text-sm text-red-600">
              {task.data?.error ?? "Conversion failed."}
            </p>
          )}

          {status === "completed" && (
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="text-sm">
                <p className="font-medium">{task.data?.output_filename}</p>
                <p className="opacity-60">{humanSize(task.data?.output_size ?? null)}</p>
              </div>
              <a
                href={downloadUrl(taskId)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Download
              </a>
            </div>
          )}

          {task.isError && (
            <p className="mt-4 text-sm text-red-600">
              {(task.error as Error).message}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
