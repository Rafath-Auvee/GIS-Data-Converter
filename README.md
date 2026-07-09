# 🗺️ GIS Data Converter

> Upload a geospatial file → pick a conversion → download the result.
> A web app that converts between **15 geospatial formats** (vector + raster), with live
> progress, map preview, and conversion history.

![status](https://img.shields.io/badge/status-all%2015%20conversions%20verified-brightgreen)
![backend](https://img.shields.io/badge/backend-FastAPI%20%2B%20Celery-009688)
![frontend](https://img.shields.io/badge/frontend-Next.js%2016-black)
![cost](https://img.shields.io/badge/cost-100%25%20free%20%26%20local-blue)

**✅ Every mandatory + bonus conversion is implemented and verified end-to-end on real data.**
See the full tracker in [steps.md](steps.md).

---

## ⚡ Quick start

```bash
cp .env.example .env       # first time only
docker compose up -d       # build + start all 7 services
```

| Open | URL | Login |
|------|-----|-------|
| 🖥️ **App** | <http://localhost:3000> | — |
| 📘 **API docs** (Swagger) | <http://localhost:8000/docs> | — |
| 🪣 **MinIO** (file storage) | <http://localhost:9001> | `minioadmin` / `minioadmin` |
| 🐘 **pgAdmin** (database) | <http://localhost:5050> | `admin@admin.com` / `admin` |

---

## 🧭 How it works

You never wait on the web request — heavy conversions run in the background and the UI polls for progress.

```
   YOU (browser)
      │  1. POST /api/upload  (file + conversion + options)
      ▼
 ┌─────────────┐   2. validate → store input in MinIO → save Task row (Postgres)
 │   BACKEND   │   3. drop job on the Redis queue
 │  (FastAPI)  │───────────────► returns { task_id, "pending" }   (instant, 202)
 └─────────────┘
      │  4. UI polls  GET /api/tasks/{id}  every 1s
      │
      ▼                          ┌─────────────┐  5. pull input from MinIO
  status / progress  ◄───────────│   WORKER    │     run converter (GDAL libs)
  (pending→…→completed)          │  (Celery)   │     push output to MinIO
      │                          └─────────────┘     mark task "completed"
      │  6. when completed:
      ▼
  GET /api/download/{id}  ◄────── streams the output file ← MinIO
      │
      ▼
  🗺️ Map / 📋 Table / ⬇️ Download   (preview depends on output type)
```

---

## 🏗️ Architecture (7 Docker services)

```
                        ┌──────────────┐
   browser  ──HTTP──►   │   frontend   │   Next.js 16 · :3000
                        └──────┬───────┘
                               │ REST (JSON)
                        ┌──────▼───────┐        ┌──────────┐
                        │   backend    │──jobs─►│  redis   │  queue
                        │   FastAPI    │◄───────│          │
                        │    :8000     │        └────┬─────┘
                        └──┬────────┬──┘             │ dequeues
                    SQL    │        │  S3 API   ┌─────▼──────┐
                           │        │           │   worker   │  Celery
                    ┌──────▼──┐  ┌──▼──────┐    │ (converts) │
                    │   db    │  │  minio  │◄───┤ same SQL + │
                    │ Postgres│  │   S3    │───►│  S3 access │
                    │ +PostGIS│  │ :9000/1 │    └────────────┘
                    └────┬────┘  └─────────┘
                         │
                    ┌────▼────┐
                    │ pgadmin │  inspect the db · :5050
                    └─────────┘
```

- **backend** & **worker** run the *same* image, different command
  (`uvicorn` vs `celery`) — that's why backend hot-reloads but the worker needs a restart.
- **redis** = the job queue (backend drops jobs, worker picks them up).
- **minio** = S3-style object storage for input + output files.
- **db** = Postgres (+PostGIS) storing every task; browse it in **pgAdmin**.

---

## 🔄 The conversions

**5 mandatory + 5 bonus pairs = 15 directions**, all verified. Preview depends on the *output* type:

```
 output .geojson  →  🗺️ Map + 📋 Table
 output .csv      →  📋 Table
 output .tif/.zip/.gpkg/.kml/.json(coco)  →  ⬇️ Download only
```

### ⭐ Mandatory (Top 5)

| Conversion | Does what | Library | Preview |
|---|---|---|---|
| **GeoJSON ↔ CSV** | features ⇄ spreadsheet (WKT / lat-lon columns) | geopandas + shapely | 📋 / 🗺️📋 |
| **GeoTIFF → COG** | optimize raster for cloud tile streaming | rio-cogeo | ⬇️ |
| **Raster → GeoJSON** | vectorize pixels into polygons | rasterio `shapes` | 🗺️📋 |
| **GeoJSON → Raster** | burn shapes into a pixel grid (ML masks) | rasterio `rasterize` | ⬇️ |
| **Reprojection (EPSG)** | change coordinate system (e.g. WGS84→Web Mercator) | pyproj / rasterio warp | 🗺️📋 or ⬇️ |

### 🎁 Bonus (secondary)

| Conversion | Note |
|---|---|
| **GeoJSON ↔ Shapefile** | zipped `.shp/.shx/.dbf/.prj/.cpg` |
| **GeoJSON ↔ GeoPackage** | single-file spatial DB · lossless |
| **GeoJSON ↔ KML/KMZ** | Google Earth format |
| **Multi-band → COGs** | split e.g. RGB/NIR into one COG per band (zip) |
| **GeoJSON ↔ COCO JSON** | bridge GIS polygons ⇄ ML annotations |

> 💡 **Lossless vs lossy:** GeoPackage/Shapefile/KML round-trips keep everything. Anything
> through **Raster** (rasterize/vectorize) is lossy by nature — attributes drop and edges
> pixelate. **COCO** keeps geometry but flattens to the ML schema (no GIS attributes).

---

## ✨ Features

**Mandatory**
- 📤 Drag-and-drop upload with type/size feedback
- ⚙️ Config panel — conversion picker, EPSG dropdown, resolution/band
- 📊 Live progress bar + status (`pending → processing → completed / failed`)
- ⬇️ Result card — download button, filename, size
- ⚠️ Clear, friendly error messages

**Bonus (all built except user auth)**
- 🗺️ **Map preview** (Leaflet) for GeoJSON output
- 📋 **Attribute table** preview (GeoJSON props / CSV rows)
- 📦 **Batch upload** — many files at once, one progress row each
- 🎛️ **Advanced GDAL params** — compression, NoData, tile block size
- 🕑 **History panel** — re-download or delete past tasks
- 🔔 Toasts + a live terminal-style activity log

> **Not built (optional):** user management (login/API keys) and an in-browser COG tile
> server. Raster/COG outputs are downloaded, not tiled on the map.

---

## 🧱 Tech stack

```
FRONTEND   Next.js 16 · React 19 · Tailwind v4 · shadcn/ui
           TanStack Query (polling) · Zustand · react-hot-toast
           Leaflet (map) · PapaParse (CSV)

BACKEND    FastAPI + Pydantic v2 · Celery + Redis (async jobs)
           GDAL stack → rasterio · rio-cogeo · geopandas · shapely · pyproj · fiona

DATA       Postgres + PostGIS (tasks)  ·  MinIO (files)

DEVOPS     docker-compose (7 services) — also solves GDAL-on-Windows pain
```

> 💯 **100% free & open-source.** Everything runs locally in Docker — no cloud, no paid keys.

---

## 🔌 API examples (curl)

A ready-made **Postman collection** is at [`postman_collection.json`](postman_collection.json)
(import it, set `base_url`, run any *Upload* — it auto-saves the `task_id`).

```bash
# health check
curl http://localhost:8000/health

# upload + convert  (returns { "task_id": "…", "status": "pending" })
curl -X POST http://localhost:8000/api/upload \
  -F 'file=@test cases/geojson_to_csv/regions.geojson' \
  -F 'conversion=geojson_to_csv'

# GeoTIFF → COG with advanced GDAL params
curl -X POST http://localhost:8000/api/upload \
  -F 'file=@test cases/geotiff_to_cog/elevation.tif' \
  -F 'conversion=geotiff_to_cog' -F 'compression=lzw' -F 'nodata=0' -F 'blocksize=256'

# reproject to Web Mercator
curl -X POST http://localhost:8000/api/upload \
  -F 'file=@test cases/reproject/regions.geojson' \
  -F 'conversion=reproject' -F 'target_epsg=3857'

# poll · result · download   (swap TASK_ID for the id above)
curl http://localhost:8000/api/tasks/TASK_ID
curl http://localhost:8000/api/tasks/TASK_ID/result
curl -OJ http://localhost:8000/api/download/TASK_ID

# history · delete one · clear all
curl http://localhost:8000/api/tasks
curl -X DELETE http://localhost:8000/api/tasks/TASK_ID
curl -X DELETE http://localhost:8000/api/tasks
```

**Interactive docs:** Swagger <http://localhost:8000/docs> · ReDoc <http://localhost:8000/redoc>
· spec `/openapi.json` (committed snapshot at [`docs/openapi.json`](docs/openapi.json)).

---

## 🐳 Common commands

```bash
docker compose up -d               # start everything (background)
docker compose ps                  # list services + health
docker compose logs -f backend     # tail one service
docker compose restart worker      # ⚠️ needed after editing conversion code
docker compose restart frontend    # if a UI change doesn't hot-reload (Windows)
docker compose down                # stop (keeps data)
docker compose down -v             # stop + wipe db/files
```

> 🪤 **Reload gotcha:** backend auto-reloads; the **worker never does** (restart it after
> touching `app/conversions/`); the frontend *usually* hot-reloads but can miss changes on
> Windows bind mounts — restart it if so.

---

## 📂 Sample data

Two sets of inputs:

**`test cases/`** — committed, one small sample per conversion. Fastest way to test; always
present. See [`test cases/README.md`](test%20cases/README.md).
```
test cases/geojson_to_csv/regions.geojson
test cases/geotiff_to_cog/elevation.tif
test cases/multiband_to_cogs/rgb.tif   … etc.
```

**`data/`** — the larger real-world datasets from the project PDF *(git-ignored,
re-downloadable; documented in [dataset.md](dataset.md))*:

| Type | Files under `data/` |
|------|---------------------|
| **Vector** | `World Countries Boundary/us-states.geojson`, `GADM…/GeoJSON/gadm41_USA_{0,1,2}.json` |
| **Raster (OSGeo)** | `OSGeo GeoTIFF Samples/{cea,rgb_byte,usgs_ortho}.tif` |
| **Raster (benchmark)** | `GeoTIFF Benchmark Files/{byte,int16,float32}_50m.tif` |
| **Bonus formats (GADM)** | `.gpkg`, `Shapefile/*.{shp,zip}`, `KMZ/*.kmz` |

---

## 📚 Glossary

| Term | In one line |
|------|-------------|
| **GIS** | Software for storing, analyzing & mapping spatial data. |
| **Vector** | The world as *shapes* — points, lines, polygons + attributes (GeoJSON, Shapefile…). |
| **Raster** | The world as a *pixel grid* — each cell holds a value (GeoTIFF, COG). |
| **GeoJSON** | Text (JSON) format for vector features. The web standard. |
| **GeoTIFF** | A TIFF image with embedded map coordinates. |
| **COG** | Cloud-Optimized GeoTIFF — internally tiled so the web streams pieces, not the whole file. |
| **EPSG** | A numeric code for a coordinate system (e.g. `4326`=WGS84, `3857`=Web Mercator). |
| **GDAL** | The core C/C++ engine that reads/writes 200+ geo formats; every Python lib below wraps it. |
| **rasterio / rio-cogeo** | Read/process rasters · make & validate COGs. |
| **geopandas / shapely / fiona** | Vector data as DataFrames · geometry ops · read/write vector files. |
| **pyproj** | Reproject between coordinate systems. |
| **PostGIS** | Postgres extension adding spatial types & queries. |

---

## 📖 More docs

- [steps.md](steps.md) — full requirements checklist (mandatory + bonus, what's done)
- [dataset.md](dataset.md) — where each real dataset comes from + re-download commands
- [`test cases/README.md`](test%20cases/README.md) — per-conversion sample + curl commands
