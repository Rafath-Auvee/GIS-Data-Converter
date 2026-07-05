// Zustand store for converter UI state.
import { create } from "zustand";
import type { ConversionType } from "./api";

interface ConverterState {
  conversion: ConversionType;
  targetEpsg: number | null;
  taskId: string | null;
  setConversion: (c: ConversionType) => void;
  setTargetEpsg: (e: number | null) => void;
  setTaskId: (id: string | null) => void;
  reset: () => void;
}

export const useConverterStore = create<ConverterState>((set) => ({
  conversion: "geojson_to_csv",
  targetEpsg: 3857,
  taskId: null,
  setConversion: (conversion) => set({ conversion }),
  setTargetEpsg: (targetEpsg) => set({ targetEpsg }),
  setTaskId: (taskId) => set({ taskId }),
  reset: () => set({ taskId: null }),
}));
