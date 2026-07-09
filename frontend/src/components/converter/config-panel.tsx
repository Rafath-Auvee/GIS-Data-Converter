"use client";

import * as React from "react";
import { CONVERSIONS, type ConversionType } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COMPRESSIONS = ["deflate", "lzw", "zstd", "webp", "jpeg", "none"];
const BLOCK_SIZES = [128, 256, 512, 1024];

const EPSG_PRESETS = [
  { value: 4326, label: "EPSG:4326 — WGS84 (lat/lon)" },
  { value: 3857, label: "EPSG:3857 — Web Mercator" },
  { value: 32646, label: "EPSG:32646 — UTM 46N (Bangladesh)" },
  { value: 5070, label: "EPSG:5070 — NAD83 / US Albers" },
  { value: 4269, label: "EPSG:4269 — NAD83 (lat/lon)" },
];
const EPSG_PRESET_VALUES = EPSG_PRESETS.map((p) => p.value);

export function ConfigPanel({
  conversion,
  targetEpsg,
  resolution,
  band,
  compression,
  nodata,
  blocksize,
  disabled,
  onConversion,
  onEpsg,
  onResolution,
  onBand,
  onCompression,
  onNodata,
  onBlocksize,
}: {
  conversion: ConversionType;
  targetEpsg: number | null;
  resolution: number | null;
  band: number | null;
  compression: string;
  nodata: number | null;
  blocksize: number;
  disabled?: boolean;
  onConversion: (c: ConversionType) => void;
  onEpsg: (v: number | null) => void;
  onResolution: (v: number | null) => void;
  onBand: (v: number | null) => void;
  onCompression: (v: string) => void;
  onNodata: (v: number | null) => void;
  onBlocksize: (v: number) => void;
}) {
  const isReproject = conversion === "reproject";
  const isRasterize = conversion === "geojson_to_raster";
  const isPolygonize = conversion === "raster_to_geojson";
  const isCog = conversion === "geotiff_to_cog";
  const showAdvanced = isCog || isRasterize;

  const [epsgMode, setEpsgMode] = React.useState(
    targetEpsg != null && EPSG_PRESET_VALUES.includes(targetEpsg)
      ? String(targetEpsg)
      : "custom",
  );

  function handleEpsgSelect(v: string | null) {
    if (!v) return;
    setEpsgMode(v);
    if (v !== "custom") onEpsg(Number(v));
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="conversion">Conversion (input format → output format)</Label>
        <Select
          value={conversion}
          onValueChange={(v) => onConversion(v as ConversionType)}
          disabled={disabled}
        >
          <SelectTrigger id="conversion" className="w-full">
            <SelectValue placeholder="Select a conversion" />
          </SelectTrigger>
          <SelectContent>
            {CONVERSIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isReproject && (
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="epsg">Target coordinate system (EPSG)</Label>
          <Select value={epsgMode} onValueChange={handleEpsgSelect} disabled={disabled}>
            <SelectTrigger id="epsg" className="w-full">
              <SelectValue placeholder="Select target EPSG" />
            </SelectTrigger>
            <SelectContent>
              {EPSG_PRESETS.map((p) => (
                <SelectItem key={p.value} value={String(p.value)}>
                  {p.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom EPSG code…</SelectItem>
            </SelectContent>
          </Select>
          {epsgMode === "custom" && (
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Enter any EPSG code, e.g. 32633"
              value={targetEpsg ?? ""}
              disabled={disabled}
              onChange={(e) => onEpsg(e.target.value ? Number(e.target.value) : null)}
            />
          )}
        </div>
      )}

      {isRasterize && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="resolution">Resolution (deg/pixel)</Label>
          <Input
            id="resolution"
            type="number"
            step="0.001"
            min="0"
            placeholder="e.g. 0.05"
            value={resolution ?? ""}
            disabled={disabled}
            onChange={(e) => onResolution(e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      )}

      {isPolygonize && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="band">Band to vectorize</Label>
          <Input
            id="band"
            type="number"
            min="1"
            placeholder="1"
            value={band ?? ""}
            disabled={disabled}
            onChange={(e) => onBand(e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      )}

      {showAdvanced && (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Advanced GDAL options
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="compression">Compression</Label>
              <Select
                value={compression}
                onValueChange={(v) => onCompression(v ?? "deflate")}
                disabled={disabled}
              >
                <SelectTrigger id="compression" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPRESSIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nodata">NoData value</Label>
              <Input
                id="nodata"
                type="number"
                step="1"
                placeholder="none"
                value={nodata ?? ""}
                disabled={disabled}
                onChange={(e) => onNodata(e.target.value ? Number(e.target.value) : null)}
              />
            </div>

            {isCog && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="blocksize">Tile block size</Label>
                <Select
                  value={String(blocksize)}
                  onValueChange={(v) => onBlocksize(Number(v ?? blocksize))}
                  disabled={disabled}
                >
                  <SelectTrigger id="blocksize" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOCK_SIZES.map((b) => (
                      <SelectItem key={b} value={String(b)}>
                        {b} px
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
