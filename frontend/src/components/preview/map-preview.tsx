"use client";

import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";

const MapInner = dynamic(() => import("./map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[340px] items-center justify-center rounded-lg border text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function MapPreview({ data }: { data: FeatureCollection }) {
  return <MapInner data={data} />;
}
