"use client";

import * as React from "react";
import L from "leaflet";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { FeatureCollection } from "geojson";

function FitBounds({ data }: { data: FeatureCollection }) {
  const map = useMap();
  React.useEffect(() => {
    try {
      const bounds = L.geoJSON(data).getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    } catch {}
  }, [data, map]);
  return null;
}

export default function MapInner({ data }: { data: FeatureCollection }) {
  return (
    <MapContainer
      style={{ height: "340px", width: "100%", borderRadius: "0.5rem" }}
      center={[20, 0]}
      zoom={2}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap contributors &copy; CARTO"
      />
      <GeoJSON
        data={data}
        style={{ color: "#818cf8", weight: 1, fillColor: "#6366f1", fillOpacity: 0.25 }}
        pointToLayer={(_feature, latlng) =>
          L.circleMarker(latlng, {
            radius: 4,
            color: "#818cf8",
            fillColor: "#6366f1",
            fillOpacity: 0.7,
            weight: 1,
          })
        }
      />
      <FitBounds data={data} />
    </MapContainer>
  );
}
