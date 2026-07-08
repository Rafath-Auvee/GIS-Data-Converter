export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type TaskStatus = "pending" | "processing" | "completed" | "failed";

export type ConversionType =
  | "geojson_to_csv"
  | "csv_to_geojson"
  | "geotiff_to_cog"
  | "raster_to_geojson"
  | "geojson_to_raster"
  | "reproject"
  | "geojson_to_shapefile"
  | "shapefile_to_geojson"
  | "geojson_to_gpkg"
  | "gpkg_to_geojson"
  | "geojson_to_kml"
  | "kml_to_geojson"
  | "multiband_to_cogs"
  | "geojson_to_coco"
  | "coco_to_geojson";

export interface UploadAccepted {
  task_id: string;
  status: TaskStatus;
}

export interface Task {
  id: string;
  status: TaskStatus;
  conversion: ConversionType;
  source_filename: string;
  output_filename: string | null;
  output_size: number | null;
  error: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface TaskResult {
  task_id: string;
  status: TaskStatus;
  output_filename: string | null;
  output_size: number | null;
  download_url: string | null;
}

export const CONVERSIONS: { value: ConversionType; label: string }[] = [
  { value: "geojson_to_csv", label: "GeoJSON → CSV" },
  { value: "csv_to_geojson", label: "CSV → GeoJSON" },
  { value: "geotiff_to_cog", label: "GeoTIFF → COG" },
  { value: "raster_to_geojson", label: "Raster → GeoJSON" },
  { value: "geojson_to_raster", label: "GeoJSON → Raster" },
  { value: "reproject", label: "Reprojection (EPSG)" },
  { value: "geojson_to_shapefile", label: "GeoJSON → Shapefile (zip)" },
  { value: "shapefile_to_geojson", label: "Shapefile (zip) → GeoJSON" },
  { value: "geojson_to_gpkg", label: "GeoJSON → GeoPackage" },
  { value: "gpkg_to_geojson", label: "GeoPackage → GeoJSON" },
  { value: "geojson_to_kml", label: "GeoJSON → KML" },
  { value: "kml_to_geojson", label: "KML/KMZ → GeoJSON" },
  { value: "multiband_to_cogs", label: "Multi-band → single-band COGs (zip)" },
  { value: "geojson_to_coco", label: "GeoJSON → COCO JSON" },
  { value: "coco_to_geojson", label: "COCO JSON → GeoJSON" },
];

export const ACCEPTED_EXTENSIONS: Record<ConversionType, string[]> = {
  geojson_to_csv: [".geojson", ".json"],
  csv_to_geojson: [".csv"],
  geotiff_to_cog: [".tif", ".tiff"],
  raster_to_geojson: [".tif", ".tiff"],
  geojson_to_raster: [".geojson", ".json"],
  reproject: [".geojson", ".json", ".gpkg", ".kml", ".tif", ".tiff"],
  geojson_to_shapefile: [".geojson", ".json"],
  shapefile_to_geojson: [".zip"],
  geojson_to_gpkg: [".geojson", ".json"],
  gpkg_to_geojson: [".gpkg"],
  geojson_to_kml: [".geojson", ".json"],
  kml_to_geojson: [".kml", ".kmz"],
  multiband_to_cogs: [".tif", ".tiff"],
  geojson_to_coco: [".geojson", ".json"],
  coco_to_geojson: [".json"],
};

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      detail = res.statusText;
    }
    throw new Error(`${res.status} - ${detail}`);
  }
  return (await res.json()) as T;
}

export async function uploadFile(params: {
  file: File;
  conversion: ConversionType;
  targetEpsg?: number;
  resolution?: number;
  band?: number;
  compression?: string;
  nodata?: number;
  blocksize?: number;
}): Promise<UploadAccepted> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("conversion", params.conversion);
  if (params.targetEpsg != null) form.append("target_epsg", String(params.targetEpsg));
  if (params.resolution != null) form.append("resolution", String(params.resolution));
  if (params.band != null) form.append("band", String(params.band));
  if (params.compression != null) form.append("compression", params.compression);
  if (params.nodata != null) form.append("nodata", String(params.nodata));
  if (params.blocksize != null) form.append("blocksize", String(params.blocksize));
  const res = await fetch(`${API_URL}/api/upload`, { method: "POST", body: form });
  return unwrap<UploadAccepted>(res);
}

export async function getTask(taskId: string): Promise<Task> {
  return unwrap<Task>(await fetch(`${API_URL}/api/tasks/${taskId}`));
}

export async function getTaskResult(taskId: string): Promise<TaskResult> {
  return unwrap<TaskResult>(await fetch(`${API_URL}/api/tasks/${taskId}/result`));
}

export async function listTasks(): Promise<Task[]> {
  return unwrap<Task[]>(await fetch(`${API_URL}/api/tasks`));
}

export function conversionLabel(value: ConversionType): string {
  return CONVERSIONS.find((c) => c.value === value)?.label ?? value;
}

export async function deleteTask(taskId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/tasks/${taskId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete task (${res.status})`);
}

export async function clearTasks(): Promise<void> {
  const res = await fetch(`${API_URL}/api/tasks`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to clear history (${res.status})`);
}

export function downloadUrl(taskId: string): string {
  return `${API_URL}/api/download/${taskId}`;
}
