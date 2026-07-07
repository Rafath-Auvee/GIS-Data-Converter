export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type TaskStatus = "pending" | "processing" | "completed" | "failed";

export type ConversionType =
  | "geojson_to_csv"
  | "csv_to_geojson"
  | "geotiff_to_cog"
  | "raster_to_geojson"
  | "geojson_to_raster"
  | "reproject";

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
];

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
}): Promise<UploadAccepted> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("conversion", params.conversion);
  if (params.targetEpsg != null) {
    form.append("target_epsg", String(params.targetEpsg));
  }
  const res = await fetch(`${API_URL}/api/upload`, { method: "POST", body: form });
  return unwrap<UploadAccepted>(res);
}

export async function getTask(taskId: string): Promise<Task> {
  return unwrap<Task>(await fetch(`${API_URL}/api/tasks/${taskId}`));
}

export async function getTaskResult(taskId: string): Promise<TaskResult> {
  return unwrap<TaskResult>(await fetch(`${API_URL}/api/tasks/${taskId}/result`));
}

export function downloadUrl(taskId: string): string {
  return `${API_URL}/api/download/${taskId}`;
}
