"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import type { FeatureCollection } from "geojson";
import { DownloadIcon, MapIcon, TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPreview } from "./map-preview";
import { AttributeTable } from "./attribute-table";

type Tab = "map" | "table";

const MAX_ROWS = 50;

interface Preview {
  geojson: FeatureCollection | null;
  table: { columns: string[]; rows: Record<string, unknown>[] } | null;
  supported: boolean;
}

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

function isFeatureCollection(value: unknown): value is FeatureCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "FeatureCollection" &&
    Array.isArray((value as { features?: unknown }).features)
  );
}

async function loadPreview(href: string, isCsv: boolean): Promise<Preview> {
  const res = await fetch(href);
  if (!res.ok) throw new Error(`Failed to load output (${res.status})`);
  if (isCsv) {
    const text = await res.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    return {
      geojson: null,
      table: { columns: parsed.meta.fields ?? [], rows: parsed.data.slice(0, MAX_ROWS) },
      supported: true,
    };
  }
  const json = (await res.json()) as unknown;
  if (!isFeatureCollection(json)) {
    return { geojson: null, table: null, supported: false };
  }
  const feats = json.features;
  const columns = Array.from(new Set(feats.flatMap((f) => Object.keys(f.properties ?? {}))));
  const rows = feats.slice(0, MAX_ROWS).map((f) => (f.properties ?? {}) as Record<string, unknown>);
  return { geojson: json, table: { columns, rows }, supported: true };
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors [&_svg]:size-3.5",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export function ResultPreview({
  filename,
  size,
  href,
}: {
  filename: string | null;
  size: number | null;
  href: string;
}) {
  const ext = (filename ?? "").toLowerCase().split(".").pop() ?? "";
  const isCsv = ext === "csv";
  const previewable = isCsv || ext === "geojson" || ext === "json";

  const [tab, setTab] = React.useState<Tab | null>(null);

  const { data, isFetching, error } = useQuery({
    queryKey: ["preview", href],
    queryFn: () => loadPreview(href, isCsv),
    enabled: previewable,
    staleTime: Infinity,
    retry: false,
  });

  const canMap = !!data?.geojson;
  const canTable = !!data?.table;
  const effectiveTab: Tab = (tab ?? (canMap ? "map" : "table"));
  const unsupported = data != null && !data.supported;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-3">
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium">{filename ?? "output"}</p>
          <p className="text-xs text-muted-foreground">{humanSize(size)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canMap && (
            <TabButton active={effectiveTab === "map"} onClick={() => setTab("map")}>
              <MapIcon /> Map
            </TabButton>
          )}
          {canTable && (
            <TabButton active={effectiveTab === "table"} onClick={() => setTab("table")}>
              <TableIcon /> Table
            </TabButton>
          )}
          <Button size="sm" nativeButton={false} render={<a href={href} download />}>
            <DownloadIcon /> Download
          </Button>
        </div>
      </div>

      {isFetching && !data && <p className="text-sm text-muted-foreground">Loading preview…</p>}
      {error && (
        <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
      )}
      {unsupported && (
        <p className="text-sm text-muted-foreground">
          Preview is not available for this output. Use Download to get the file.
        </p>
      )}
      {effectiveTab === "map" && canMap && data?.geojson && <MapPreview data={data.geojson} />}
      {effectiveTab === "table" && canTable && data?.table && (
        <AttributeTable columns={data.table.columns} rows={data.table.rows} />
      )}
    </div>
  );
}
