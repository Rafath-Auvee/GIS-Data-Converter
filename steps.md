# GIS Data Converter - Deliverables Checklist

Status against `GIS_Data_Converter_MiniProject.pdf`.

**Legend:** ✅ complete · ⚠️ partial · ⬜ pending

---

## 1. Core Functionalities (Mandatory)

### Backend

| Requirement | Status | Notes |
|---|---|---|
| File Upload API (multipart, multi-format) | ✅ | `POST /api/upload` |
| Task ID generation | ✅ | UUID per job |
| Task status (pending/processing/completed/failed) | ✅ | Postgres, polled by UI |
| Fetch results endpoint | ✅ | `GET /api/tasks/{id}/result` |
| Download endpoint | ✅ | `GET /api/download/{id}` |
| Conversion Engine - Top 5 | ✅ | all verified end-to-end |
| Validate formats / extensions | ✅ | wired in `upload.py` |
| Validate GeoJSON (RFC 7946) | ✅ | wired in `upload.py` |
| Validate GeoTIFF integrity + CRS | ✅ | wired in `upload.py` |
| API Documentation (OpenAPI/Swagger) | ✅ | `/docs` |

### Frontend

| Requirement | Status | Notes |
|---|---|---|
| Drag-and-drop upload + visual feedback | ✅ | accepted types + file size |
| Config panel (format, EPSG, resolution/band) | ✅ | conditional per conversion |
| Real-time progress display | ✅ | progress bar + 1s polling |
| Result download button + filename/size | ✅ | |
| User-friendly error messages | ✅ | inline + toasts + alert |

### Delivered With

| Requirement | Status | Notes |
|---|---|---|
| Clear setup / installation instructions | ✅ | README Quick Start (`docker compose up -d`) |
| API endpoint examples (curl / Postman) | ⚠️ | only in Swagger; no dedicated section |
| Demonstration using sample datasets | ✅ | all 5 conversions verified |

**Verdict:** mandatory complete - the one remaining required item is the curl/Postman
examples doc (⚠️).

**Top 5 verified end-to-end (clean Docker build):**

| Conversion | Input | Output |
|---|---|---|
| GeoJSON → CSV | us-states.geojson | us-states.csv |
| GeoTIFF → COG | cea.tif | cea_cog.tif |
| Raster → GeoJSON | cea.tif | cea.geojson |
| GeoJSON → Raster | us-states.geojson | us-states_raster.tif |
| Reprojection (3857) | us-states.geojson | us-states_epsg3857.geojson |

---

## 2. Optional / Advanced Features (Bonus)

### Backend

| Requirement | Status | Notes |
|---|---|---|
| Async processing + progress | ✅ | Celery + Redis (progress via polling, not WS/SSE) |
| Database for task metadata | ✅ | Postgres `tasks` table |
| Conversion history endpoints | ✅ | `GET /api/tasks` |
| Secondary conversions (Shapefile / GPKG / KML / multiband / COCO) | ✅ | **all 5** implemented (8 conversion types, both directions), verified end-to-end |
| Simple user management (registration / login / API keys) | ⬜ | |

### Frontend

| Requirement | Status | Notes |
|---|---|---|
| Conversion history panel | ✅ | sidebar with re-download + delete |
| Interactive map preview (GeoJSON / COG) | ✅ | react-leaflet, dark CARTO basemap, auto-fit bounds |
| Attribute table preview (CSV / GeoJSON) | ✅ | tabbed with map, sourced from GeoJSON properties or parsed CSV |
| Batch upload | ✅ | multi-file dropzone, concurrent per-file tasks, live per-file progress |
| Advanced GDAL params (compression, NoData, tiling, resolution) | ✅ | compression/nodata/blocksize wired through upload → worker → COG/rasterize |

---

## Extra (built, not required by the PDF)

- Toast notifications (react-hot-toast): loading / progress / complete / error
- Detailed activity log (live terminal-style event feed per task)
- Delete history (one task or clear all) with MinIO object cleanup
- Dark-theme sidebar dashboard UI (shadcn + Tailwind v4 + Inter/JetBrains Mono)
- Upload size limit (413) + orphaned-object cleanup

---

## Pending Tasks

### Required (to fully satisfy the PDF)

- [ ] **API endpoint examples (curl / Postman)** - a "Delivered With" deliverable;
      currently only inside Swagger, no dedicated section/collection.

### Optional / Bonus (not required)

**Backend**

- [x] **Secondary conversions** - **DONE (all 5)**, verified end-to-end:
  - [x] GeoJSON ↔ Shapefile (zipped)
  - [x] GeoJSON ↔ GeoPackage
  - [x] GeoJSON ↔ KML/KMZ
  - [x] Multi-band GeoTIFF → single-band COGs (zipped)
  - [x] GeoJSON → COCO JSON
- [ ] **Simple user management** (registration / login / API keys)

**Frontend**

- [x] **Interactive map preview** - `react-leaflet` + dark CARTO basemap, renders GeoJSON output with auto-fit bounds
- [x] **Attribute table preview** - table view of GeoJSON feature properties or parsed CSV rows (first 50 rows)
- [x] **Batch upload** - multi-file dropzone, uploads run concurrently, each gets its own task + live progress row
- [x] **Advanced GDAL params** - compression (deflate/lzw/zstd/webp/jpeg/none), NoData value, COG tile block size; verified end-to-end against actual output files with rasterio

> **All mandatory core functionality is complete and verified, plus all optional bonus features
> except user management.** The only pending *required* item is the curl/Postman examples.
