import { create } from "zustand";
import type { ConversionType } from "./api";

interface ConverterState {
  conversion: ConversionType;
  targetEpsg: number | null;
  resolution: number | null;
  band: number | null;
  compression: string;
  nodata: number | null;
  blocksize: number;
  taskId: string | null;
  setConversion: (c: ConversionType) => void;
  setTargetEpsg: (e: number | null) => void;
  setResolution: (r: number | null) => void;
  setBand: (b: number | null) => void;
  setCompression: (c: string) => void;
  setNodata: (n: number | null) => void;
  setBlocksize: (b: number) => void;
  setTaskId: (id: string | null) => void;
  reset: () => void;
}

export const useConverterStore = create<ConverterState>((set) => ({
  conversion: "geojson_to_csv",
  targetEpsg: 3857,
  resolution: 0.05,
  band: 1,
  compression: "deflate",
  nodata: null,
  blocksize: 512,
  taskId: null,
  setConversion: (conversion) => set({ conversion }),
  setTargetEpsg: (targetEpsg) => set({ targetEpsg }),
  setResolution: (resolution) => set({ resolution }),
  setBand: (band) => set({ band }),
  setCompression: (compression) => set({ compression }),
  setNodata: (nodata) => set({ nodata }),
  setBlocksize: (blocksize) => set({ blocksize }),
  setTaskId: (taskId) => set({ taskId }),
  reset: () => set({ taskId: null }),
}));
