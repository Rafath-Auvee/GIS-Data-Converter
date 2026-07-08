"use client";

import { Button } from "@/components/ui/button";
import { CircleCheckIcon, DownloadIcon } from "lucide-react";

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

export function ResultCard({
  filename,
  size,
  href,
}: {
  filename: string | null;
  size: number | null;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-3">
        <CircleCheckIcon className="size-5 text-green-600" />
        <div>
          <p className="text-sm font-medium break-all">{filename ?? "output"}</p>
          <p className="text-xs text-muted-foreground">{humanSize(size)}</p>
        </div>
      </div>
      <Button nativeButton={false} render={<a href={href} download />}>
        <DownloadIcon />
        Download
      </Button>
    </div>
  );
}
