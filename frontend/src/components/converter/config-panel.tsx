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

export function ConfigPanel({
  conversion,
  targetEpsg,
  resolution,
  band,
  disabled,
  onConversion,
  onEpsg,
  onResolution,
  onBand,
}: {
  conversion: ConversionType;
  targetEpsg: number | null;
  resolution: number | null;
  band: number | null;
  disabled?: boolean;
  onConversion: (c: ConversionType) => void;
  onEpsg: (v: number | null) => void;
  onResolution: (v: number | null) => void;
  onBand: (v: number | null) => void;
}) {
  const isReproject = conversion === "reproject";
  const isRasterize = conversion === "geojson_to_raster";
  const isPolygonize = conversion === "raster_to_geojson";

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
    </div>
  );
}
