"use client";

import * as React from "react";
import { UploadIcon, FileIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function humanSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

function dedup(list: File[]): File[] {
  const seen = new Set<string>();
  const out: File[] = [];
  for (const f of list) {
    const key = `${f.name}:${f.size}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(f);
    }
  }
  return out;
}

export function FileDropzone({
  files,
  accept,
  disabled,
  onFiles,
}: {
  files: File[];
  accept: string[];
  disabled?: boolean;
  onFiles: (f: File[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  function add(list: FileList | null) {
    if (!list || list.length === 0) return;
    onFiles(dedup([...files, ...Array.from(list)]));
  }

  function removeAt(index: number) {
    onFiles(files.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) add(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept.join(",")}
          className="hidden"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
        <UploadIcon className="size-8 text-muted-foreground" />
        <p className="text-sm">
          <span className="font-medium text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted-foreground">
          Accepted: {accept.join(", ")} · multiple files allowed
        </p>
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </p>
            {files.length > 1 && !disabled && (
              <button
                type="button"
                onClick={() => onFiles([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>
          {files.map((f, i) => (
            <div
              key={`${f.name}:${f.size}:${i}`}
              className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
            >
              <FileIcon className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-xs text-muted-foreground">{humanSize(f.size)}</p>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${f.name}`}
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
