"use client";

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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="epsg">Target EPSG code</Label>
          <Input
            id="epsg"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 3857"
            value={targetEpsg ?? ""}
            disabled={disabled}
            onChange={(e) => onEpsg(e.target.value ? Number(e.target.value) : null)}
          />
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
