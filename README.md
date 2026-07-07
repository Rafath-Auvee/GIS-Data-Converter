# GIS Data Converter

A web-based geospatial data conversion service. Users upload files in one format,
configure conversion options (target format, coordinate system, parameters), and
download the processed results.

> **Status:** All mandatory backend + frontend features are implemented and **verified
> end-to-end on Docker** - all 5 conversions (GeoJSON↔CSV, GeoTIFF→COG, Raster→GeoJSON,
> GeoJSON→Raster, Reprojection) run and download successfully. See
> [steps.md](steps.md) for the full requirements tracker and
> [python-code.md](python-code.md) for a file-by-file backend explanation.

## Quick start

```bash
docker compose up -d          # build + start all 6 services
```

Then open **<http://localhost:3000>** (UI), **<http://localhost:8000/docs>** (API docs),
or **<http://localhost:9001>** (MinIO console).

---

## 1. Final Stack

### Frontend
- **Next.js 16** (App Router) + React 19
- **shadcn/ui** (Base UI) + **Tailwind v4** - component library & styling
- **Sonner** - toast notifications (loading / progress / complete / error)
- **TanStack Query** - server state / task-status polling
- **Zustand** - UI state
- **Leaflet** - interactive map + GeoJSON/COG preview (bonus)

**UI structure:** reusable primitives in `frontend/src/components/ui/` (shadcn);
feature components in `frontend/src/components/converter/` -
`file-dropzone`, `config-panel`, `status-dashboard`, `result-card`, and the
`converter` orchestrator rendered by `app/page.tsx`.

### Backend
- **FastAPI + Pydantic v2** - API + auto OpenAPI/Swagger docs
- **Conversion engine:** rasterio, rio-cogeo, geopandas, shapely, pyproj, fiona (built on **GDAL**)

### Async Processing
- **Celery** workers + **Redis** broker - long-running jobs + real-time progress updates

### Storage & Tiling
- **MinIO** (S3-compatible) - uploads + output COG storage
- **TiTiler** - serves COG tiles to Leaflet for map preview

### Database
- **Postgres + PostGIS** - task metadata & conversion history

### Auth
- **JWT** (optional - added last)

### Orchestration
- **docker-compose** - one-command dev; also solves GDAL-on-Windows install issues

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
- API endpoint examples (curl/Postman)
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
- MinIO console: <http://localhost:9001>

---

## 6. Sample Datasets

Test data lives in [`data/`](data/). See [data/README.md](data/README.md) for the full
source URLs, licenses, and a re-download script. Summary:

| Type | Files |
|------|-------|
| **Vector** | `us-states.geojson`, `ne_countries.geojson`, `ne_populated_places.geojson`, `gadm41_USA.gpkg` |
| **Tabular** | `cities.csv` |
| **Raster** | `cea.tif`, `usgs_ortho.tif`, `rgb_byte.tif`, `benchmark/{byte,int16,float32}_50m.tif` |
| **Bonus formats** | Shapefile, `gdal_sample.gpkg`, `sample.kml` |

> The datasets are **gitignored** (large and re-downloadable); only `data/README.md`
> is tracked, so a fresh clone can regenerate `data/` from the documented sources.
