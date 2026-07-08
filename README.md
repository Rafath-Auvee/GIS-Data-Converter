# GIS Data Converter

A web-based geospatial data conversion service. Users upload files in one format,
configure conversion options (target format, coordinate system, parameters), and
download the processed results.

> **Status:** All mandatory backend + frontend features are implemented and **verified
> end-to-end on Docker** - all **5 mandatory** conversions plus **all 5 bonus** secondary
> conversions (15 conversion directions in total) run and download successfully. A small,
> committed sample input for every one lives in [`test cases/`](test%20cases/). See
> [steps.md](steps.md) for the full requirements tracker.

## Quick start

```bash
docker compose up -d          # build + start all 6 services
```

Then open **<http://localhost:3000>** (UI), **<http://localhost:8000/docs>** (API docs),
**<http://localhost:9001>** (MinIO console), or **<http://localhost:5050>** (pgAdmin).

---

## 1. Final Stack

### Frontend
- **Next.js 16** (App Router) + React 19
- **shadcn/ui** (Base UI) + **Tailwind v4** - component library & styling
- **react-hot-toast** - toast notifications (loading / progress / complete / error)
- **TanStack Query** - server state / task-status polling
- **Zustand** - UI state
- **Leaflet** + **react-leaflet** - interactive map preview of **GeoJSON** output (bonus)
- **PapaParse** - client-side CSV parsing for the attribute-table preview

**UI structure:** reusable primitives in `frontend/src/components/ui/` (shadcn);
feature components in `frontend/src/components/` - `converter/` (`file-dropzone`,
`config-panel`, `status-dashboard`), `preview/` (`result-preview`, `map-preview`,
`attribute-table`) and `dashboard/` (`dashboard`, `history-list`, `batch-progress`,
`activity-log`). `app/page.tsx` renders the `Dashboard` orchestrator.

### Backend
- **FastAPI + Pydantic v2** - API + auto OpenAPI/Swagger docs
- **Conversion engine:** rasterio, rio-cogeo, geopandas, shapely, pyproj, fiona (built on **GDAL**)

### Async Processing
- **Celery** workers + **Redis** broker - long-running jobs + real-time progress updates

### Storage
- **MinIO** (S3-compatible) - stores uploaded inputs + converted outputs

### Database
- **Postgres + PostGIS** - task metadata & conversion history (browsable via **pgAdmin**)

### Orchestration
- **docker-compose** - one-command dev; also solves GDAL-on-Windows install issues

> **Not implemented (optional bonus):** simple user management (registration / login /
> API keys) and a dedicated COG tile server (e.g. TiTiler) are the only PDF bonus items
> not built. The map preview renders **GeoJSON** output only; raster/COG outputs are
> downloaded rather than tiled in-browser.

> **Cost:** 100% free & open-source. Everything runs locally in Docker - no cloud accounts or paid services required.

---

## 2. Project Tasks

### Backend (Mandatory)
- **File Upload API** - accept uploads via `multipart/form-data`, support multiple geospatial formats
- **Task Management**
  - Generate a unique task ID per conversion job
  - Maintain and expose task status: `pending`, `processing`, `completed`, `failed`
  - Endpoint to fetch conversion results
  - Download endpoint for the output file
- **Conversion Engine** - implement the Top 5 priority conversions (see section 3)
- **Data Validation**
  - Validate uploaded file formats and extensions
  - Validate GeoJSON structure (RFC 7946 compliance)
  - Validate GeoTIFF integrity and read coordinate system metadata
- **API Documentation** - machine-readable (OpenAPI/Swagger)

### Frontend (Mandatory)
- **Upload Interface** - drag-and-drop or click-to-select; visual feedback for accepted file types/sizes
- **Configuration Panel** - input/output format dropdowns, EPSG code selector, basic params (rasterization resolution, band selection)
- **Progress & Status Dashboard** - real-time task status + visual progress bar
- **Results Section** - prominent download button, output file name and size
- **Error Handling** - clear, user-friendly error messages

### Backend (Bonus / Optional)
- Secondary conversions: GeoJSON ↔ Shapefile, GeoJSON ↔ GeoPackage, GeoJSON ↔ KML/KMZ, multi-band GeoTIFF → single-band COGs, GeoJSON ↔ COCO JSON
- Persistence layer - store task metadata + conversion history endpoints
- Simple user management (registration, login, API keys)
- Asynchronous processing - background worker queue with real-time progress (WebSocket/SSE)

### Frontend (Bonus / Optional)
- Interactive map preview (Leaflet) for GeoJSON/COG output + attribute tables
- Batch upload - multiple files converted simultaneously
- History panel - list past tasks, re-download without re-uploading
- Advanced GDAL-like parameters (compression, NoData values, output resolution, tiling)

### Delivered With
- Clear setup/installation instructions
- API endpoint examples (curl/Postman) - see [section 6](#6-api-endpoint-examples-curl--postman)
- Demonstration using the provided sample datasets

---

## 3. The 5 Mandatory Conversions → Library Mapping

| # | Conversion | Description | Library |
|---|------------|-------------|---------|
| 1 | **GeoJSON ↔ CSV** | Export features/properties as spreadsheets; import features from tabular data with coordinates | geopandas + shapely (WKT) |
| 2 | **GeoTIFF → COG** | Optimize rasters into Cloud-Optimized GeoTIFF for fast cloud tile serving | rio-cogeo |
| 3 | **COG / Raster → GeoJSON** | Vectorize raster features (polygonize binary masks) | rasterio (`features.shapes`) |
| 4 | **GeoJSON → Raster** | Rasterize vector features into a grid (for ML datasets) | rasterio (`features.rasterize`) |
| 5 | **Reprojection (EPSG)** | Convert spatial data between coordinate reference systems (e.g. WGS84 → Web Mercator) | geopandas `to_crs` (vector) / rasterio `warp` (raster) + pyproj |

---

## 4. Glossary

### General

| Term | Meaning |
|------|---------|
| **GIS** | Geographic Information System; software for capturing, storing, analyzing, and visualizing spatial/map data. |

### Formats & Tile Server

| Term | Meaning |
|------|---------|
| **GeoJSON** | JSON format for storing vector geographic features (points, lines, polygons) with properties. |
| **GeoTIFF** | A TIFF image with embedded geographic/coordinate info (used for satellite/raster imagery). |
| **TIFF** | Tagged Image File Format, a general high-quality raster image format (no geo info by itself). |
| **COG** | Cloud-Optimized GeoTIFF; a GeoTIFF structured for fast, partial streaming of tiles over HTTP from cloud storage. |
| **TiTiler** | A FastAPI-based server that dynamically renders map tiles from COGs for web maps. |

### Python Libraries

| Library | Purpose |
|---------|---------|
| **rasterio** | Read/write & process raster data. |
| **geopandas** | Pandas for vector geo-data. |
| **rio-cogeo** | Create/validate Cloud-Optimized GeoTIFFs. |
| **shapely** | Geometry operations (points, lines, polygons). |
| **pyproj** | Coordinate-system reprojection (EPSG transforms). |
| **fiona** | Read/write vector file formats (Shapefile, GeoJSON, etc.). |

### Core Engine & Database

| Term | Meaning |
|------|---------|
| **GDAL** | Geospatial Data Abstraction Library; the core C/C++ engine that reads/writes/converts 200+ geo formats (all the libraries above wrap it). |
| **PostGIS** | A PostgreSQL extension that adds spatial data types, indexing, and geographic queries to the database. |

---

## 5. Common Docker Commands

Run these from the project root (where `docker-compose.yml` lives). On a fresh clone, first copy `.env.example` to `.env`.

```bash
docker compose up --build       # build + start everything (foreground, shows logs)
docker compose up -d            # start in background (detached)
docker compose ps               # list running services + health
docker compose logs -f backend  # tail one service's logs
docker compose down             # stop + remove containers (keeps volumes/data)
docker compose down -v          # also delete volumes (wipes db + files)
docker compose build backend    # rebuild just one service after dep changes
```

Once running:

- Frontend app: <http://localhost:3000>
- API docs (Swagger): <http://localhost:8000/docs>
- MinIO console: <http://localhost:9001> (login: `minioadmin` / `minioadmin`)
- pgAdmin: <http://localhost:5050> (login: `admin@admin.com` / `admin`)

---

## 6. API Endpoint Examples (curl / Postman)

A ready-made Postman collection is at [`postman_collection.json`](postman_collection.json)
(import it, then set the `base_url` and `task_id` collection variables). Or use curl:

```bash
# Health check
curl http://localhost:8000/health

# Upload + convert: GeoJSON -> CSV
curl -X POST http://localhost:8000/api/upload \
  -F "file=@data/World Countries Boundary/us-states.geojson" \
  -F "conversion=geojson_to_csv"
# -> {"task_id": "…", "status": "pending"}

# Upload + convert: GeoTIFF -> COG, with advanced GDAL params
curl -X POST http://localhost:8000/api/upload \
  -F "file=@data/OSGeo GeoTIFF Samples/cea.tif" \
  -F "conversion=geotiff_to_cog" \
  -F "compression=lzw" \
  -F "nodata=0" \
  -F "blocksize=256"

# Upload + convert: reprojection to a target EPSG
curl -X POST http://localhost:8000/api/upload \
  -F "file=@data/World Countries Boundary/us-states.geojson" \
  -F "conversion=reproject" \
  -F "target_epsg=3857"

# List conversion history
curl http://localhost:8000/api/tasks

# Poll task status (replace TASK_ID with the id returned from /api/upload)
curl http://localhost:8000/api/tasks/TASK_ID

# Get result metadata (output filename/size + download URL once completed)
curl http://localhost:8000/api/tasks/TASK_ID/result

# Download the converted file
curl -OJ http://localhost:8000/api/download/TASK_ID

# Delete one task (also removes its files from MinIO)
curl -X DELETE http://localhost:8000/api/tasks/TASK_ID

# Clear all history
curl -X DELETE http://localhost:8000/api/tasks
```

> **Tip:** the `data/` paths above are git-ignored. For a guaranteed-present input,
> point `file=@` at any sample under [`test cases/`](test%20cases/) instead, e.g.
> `-F 'file=@test cases/geojson_to_csv/regions.geojson'`.

### API documentation (OpenAPI / Swagger)

- **Interactive Swagger UI:** <http://localhost:8000/docs> - try every endpoint in the
  browser, with request/response schemas for all conversion types.
- **ReDoc:** <http://localhost:8000/redoc>
- **Machine-readable spec:** <http://localhost:8000/openapi.json> (live) - a snapshot is
  also committed at [`docs/openapi.json`](docs/openapi.json) so the spec can be viewed,
  diffed, or imported without the stack running.

---

## 7. Sample Datasets & Test Cases

There are two sets of sample inputs:

### `test cases/` (committed, one per conversion)

Small, self-contained inputs for **every** conversion, each verified end-to-end against
the real engine. This is the fastest way to exercise the API. See
[`test cases/README.md`](test%20cases/README.md) for a per-conversion table and
copy-paste curl/Postman commands.

```text
test cases/<conversion>/<sample file>
  e.g.  test cases/geojson_to_csv/regions.geojson
        test cases/geotiff_to_cog/elevation.tif
```

### `data/` (real-world datasets, git-ignored)

The larger, real datasets named in the project PDF. See [dataset.md](dataset.md) for a
deep-dive on each (source URLs + re-download commands). Actual contents:

| Type | Files (under `data/`) |
|------|-----------------------|
| **Vector (GeoJSON)** | `World Countries Boundary/us-states.geojson`, `GADM Global Administrative Areas/GeoJSON/gadm41_USA_{0,1,2}.json` |
| **Raster (OSGeo samples)** | `OSGeo GeoTIFF Samples/{cea,rgb_byte,usgs_ortho}.tif` |
| **Raster (benchmark)** | `GeoTIFF Benchmark Files/{byte,int16,float32}_50m.tif` |
| **Bonus formats (GADM)** | `.../Geopackage/gadm41_USA.gpkg`, `.../Shapefile/gadm41_USA_*.{shp,zip}`, `.../KMZ/gadm41_USA_*.kmz` |

> `data/` is **gitignored** (large and re-downloadable); the tracked
> [dataset.md](dataset.md) documents where each file comes from so a fresh clone can
> regenerate it. The `test cases/` samples are committed, so they always work out of the box.
