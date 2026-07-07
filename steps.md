# GIS Data Converter - Requirements Tracker

Status against `GIS_Data_Converter_MiniProject.pdf`.

**Legend:** ✅ done · ⚠️ partial · 🔄 in progress · ⬜ not started

---

## Backend - Mandatory (Core)

| PDF requirement | Status | Notes |
|---|---|---|
| File Upload API (`multipart/form-data`, multi-format) | ✅ | `POST /api/upload` |
| Task ID generation | ✅ | UUID per job |
| Task status (pending/processing/completed/failed) | ✅ | stored in DB, polled by frontend |
| Fetch results endpoint | ✅ | `GET /api/tasks/{id}/result` |
| Download endpoint | ✅ | `GET /api/download/{id}` |
| Conversion Engine - Top 5 | ✅ | **All 5 verified end-to-end** via API (see results below) |
| Validate file formats/extensions | ✅ | `validate_extension` (wired in) |
| Validate GeoJSON (RFC 7946) | ✅ | `validate_geojson` now called in `upload.py` (400 on bad input) |
| Validate GeoTIFF integrity + CRS | ✅ | `validate_geotiff` now called in `upload.py` (400 on bad input) |
| API Documentation (OpenAPI/Swagger) | ✅ | `/docs` with examples |

**Top 5 conversions:** GeoJSON↔CSV, GeoTIFF→COG, Raster→GeoJSON, GeoJSON→Raster, Reprojection.

**Verified end-to-end (on a clean Docker rebuild):**

| Conversion | Input | Output | Result |
|---|---|---|---|
| GeoJSON → CSV | `us-states.geojson` | `us-states.csv` | ✅ completed |
| GeoTIFF → COG | `cea.tif` | `cea_cog.tif` | ✅ completed |
| Raster → GeoJSON | `cea.tif` | `cea.geojson` | ✅ completed |
| GeoJSON → Raster | `us-states.geojson` | `us-states_raster.tif` | ✅ completed |
| Reprojection (3857) | `us-states.geojson` | `us-states_epsg3857.geojson` | ✅ completed |

> Note: the backend image installs **`libexpat1`** (a system lib `rasterio` needs) - without
> it every conversion crashed on `import rasterio`.

---

## Backend - Bonus (Optional)

| PDF requirement | Status | Notes |
|---|---|---|
| Async processing + progress updates | ✅ | Celery + Redis, progress field |
| Database for task metadata | ✅ | Postgres `tasks` table |
| Conversion history endpoint (list past tasks) | ⬜ | No `GET /api/tasks` list yet |
| Secondary conversions (Shapefile / GPKG / KML / multiband / COCO) | ⬜ | Datasets ready in `data/formats/` |
| User management (register / login / API keys) | ⬜ | |

---

## Frontend - Mandatory (Core)

Built with **shadcn/ui** (Base UI) + Tailwind v4. Feature components live in
`frontend/src/components/converter/`. **Sonner** toasts cover loading / progress /
complete / error.

| PDF requirement | Status | Notes |
|---|---|---|
| Drag-and-drop upload + visual feedback | ✅ | `file-dropzone`; shows accepted types + file size |
| Format selection dropdown | ✅ | shadcn `Select` in `config-panel` |
| EPSG selector | ✅ | shown for reprojection |
| Parameter controls (rasterize resolution, band selection) | ✅ | resolution + band inputs, conditional per conversion |
| Real-time progress display | ✅ | shadcn `Progress` + 1s polling + progress toast |
| Download button | ✅ | shadcn `Button` in `result-card` |
| File name + size shown | ✅ | shown in `result-card` |
| User-friendly error messages | ✅ | inline + Sonner error toast + `Alert` on failure |

---

## Frontend - Bonus (Optional)

| PDF requirement | Status | Notes |
|---|---|---|
| Interactive map preview (GeoJSON / COG) | ⬜ | Leaflet installed, not built |
| Attribute table preview | ⬜ | |
| Batch upload | ⬜ | |
| History panel | ⬜ | |
| Advanced GDAL params (compression, NoData, tiling) | ⬜ | |

---

## Delivered With

| PDF requirement | Status | Notes |
|---|---|---|
| Setup / installation instructions | ⚠️ | README has stack + Docker commands; no clean step-by-step |
| API examples (curl / Postman) | ⚠️ | curl snippets in Swagger; no dedicated section/collection |
| Demo using sample datasets | ✅ | All 5 conversions run end-to-end on the sample data |

---

## Remaining to be fully airtight on mandatory

1. ~~Verify the 5 conversions run end-to-end~~ - **done** (all 5 completed via API).
2. ~~Wire the GeoJSON / GeoTIFF validation into the upload flow~~ - **done**.
3. ~~Expose resolution / band controls~~ - **done** (UI + wired through backend to the worker).

✅ **All mandatory backend + frontend requirements are complete and verified.** Everything
that remains (map preview, history panel, batch upload, secondary conversions, user auth) is
strictly **bonus**.
