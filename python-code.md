# Backend Python Code - File by File

A walkthrough of every backend Python file, written so you can explain the project to
your professor. The backend is a **FastAPI** service that runs geospatial conversions in
the background with **Celery**, stores files in **MinIO**, and tracks jobs in **Postgres**.

---

## 1. The big picture (say this first)

> "A user uploads a file and picks a conversion. The API validates it, saves it to object
> storage, records a task in the database, and hands the heavy work to a background worker.
> The browser polls the task until it's done, then downloads the result."

The flow, end to end:

```
Browser
  │  POST /api/upload  (file + conversion + options)
  ▼
FastAPI (upload.py)  ── validate ──► store input in MinIO ──► create Task row (Postgres)
  │                                                              │
  │  returns task_id (202 Accepted)                              │ dispatch job
  ▼                                                              ▼
Browser polls GET /api/tasks/{id}  ◄── status/progress ──  Celery worker (worker.py)
  │                                                              │ download input from MinIO
  │                                                              │ run converter (rasterio/geopandas)
  │                                                              │ upload output to MinIO
  ▼                                                              │ mark task "completed"
GET /api/download/{id}  ◄────────── streams output file ────────┘
```

**Why this architecture?** Conversions can be slow (big rasters). If the API did the work
itself, the request would hang. Instead the API returns instantly and a **separate worker
process** does the conversion, so the app stays responsive. This is the standard
"web + task queue" pattern.

---

## 2. Folder map

```
backend/app/
├─ main.py            app assembly, startup, DB migration
├─ config.py          settings from environment (.env)
├─ db.py              database connection (SQLAlchemy)
├─ worker.py          Celery app + the background conversion task
├─ validation.py      input validation (extension, GeoJSON, GeoTIFF)
├─ models/
│  ├─ task.py         enums + API schemas (Pydantic)
│  └─ task_record.py  database table (SQLAlchemy ORM)
├─ services/
│  └─ storage.py      MinIO (object storage) helpers
├─ conversions/
│  ├─ __init__.py     dispatcher: picks the right converter
│  ├─ geojson_csv.py  GeoJSON <-> CSV
│  ├─ geotiff_cog.py  GeoTIFF -> COG
│  ├─ raster_geojson.py   Raster -> GeoJSON
│  ├─ geojson_raster.py   GeoJSON -> Raster
│  └─ reproject.py    reprojection (EPSG)
└─ routers/
   ├─ upload.py       POST /api/upload
   ├─ tasks.py        GET  /api/tasks/{id}, .../result
   └─ download.py     GET  /api/download/{id}
```

---

## 3. File by file

### `config.py` - settings
Loads configuration (database URL, MinIO keys, Redis URL, upload limit) from environment
variables using **pydantic-settings**. One `settings` object is imported everywhere, so no
passwords are hard-coded.

> *Prof point:* "12-factor config - all settings come from the environment, not the code."

### `db.py` - database connection
Sets up **SQLAlchemy**: the `engine` (the actual Postgres connection), `SessionLocal` (a
factory for per-request DB sessions), and `Base` (the parent class for ORM tables). The
`get_db()` function yields a session and always closes it - FastAPI calls it for each request.

> *Prof point:* "SQLAlchemy is the ORM - it lets us use Python objects instead of raw SQL."

### `services/storage.py` - object storage
A thin wrapper over the **MinIO** client. MinIO is S3-compatible object storage; we use it
to hold uploaded inputs and generated outputs. Functions: `put_bytes` / `put_file` (upload),
`get_file` (download to disk), `open_object` (stream), and `ensure_bucket` (create the bucket
on first run).

> *Prof point:* "Files don't live in the database or on the API's disk - they go to object
> storage, so the API and worker can both reach them and it scales."

### `models/task.py` - enums + API schemas
Defines:
- `TaskStatus` enum: `pending / processing / completed / failed`.
- `ConversionType` enum: the six conversion directions.
- **Pydantic** models (`Task`, `UploadAccepted`, `TaskResult`) that describe the exact JSON
  shapes the API returns. FastAPI uses them to validate responses and auto-build the docs.

> *Prof point:* "Enums stop invalid values; Pydantic validates data and generates the OpenAPI
> schema automatically."

### `models/task_record.py` - the database table
The **SQLAlchemy ORM** model for the `tasks` table. Columns: `id`, `status`, `conversion`,
`source_filename`, `target_epsg`, `resolution`, `band`, `input_key`, `output_key`,
`output_filename`, `output_size`, `error`, `progress`, `created_at`, `updated_at`. This is
the persistence layer - every conversion job is one row.

> *Prof point:* "This is our persistence layer. Each task is a row; the worker updates its
> status and progress as it runs."

### `validation.py` - input validation
Three checks (mandatory requirement "Data Validation"):
- `validate_extension` - is the file type allowed for the chosen conversion?
- `validate_geojson` - is it valid JSON with a correct GeoJSON `type` (RFC 7946)?
- `validate_geotiff` - can rasterio open it, does it have bands + a CRS?

Each raises `ValueError` on bad input, which the upload endpoint turns into an HTTP 400.

> *Prof point:* "We reject bad files early with a clear 400 error, before doing any work."

### `conversions/` - the conversion engine (the core)
Each file uses the **GDAL** ecosystem through friendly Python libraries:

| File | Conversion | Library | Key idea |
|------|-----------|---------|----------|
| `geojson_csv.py` | GeoJSON <-> CSV | geopandas + pandas | geometry stored as WKT text in a column |
| `geotiff_cog.py` | GeoTIFF -> COG | rio-cogeo | re-tile + add overviews for web streaming |
| `raster_geojson.py` | Raster -> GeoJSON | rasterio.features.shapes | polygonize pixels into shapes |
| `geojson_raster.py` | GeoJSON -> Raster | rasterio.features.rasterize | burn shapes into a pixel grid |
| `reproject.py` | Reprojection | geopandas / rasterio.warp | change the EPSG coordinate system |

Every converter has the same simple contract: **take an input path, write an output path.**

### `conversions/__init__.py` - the dispatcher
One function, `run(conversion, input_path, output_dir, target_epsg, resolution, band)`. It
looks at the `ConversionType` and calls the matching converter, decides the output filename,
and returns the output path. This keeps the worker simple - it just calls `run(...)`.

> *Prof point:* "A dispatcher decouples the worker from the individual converters - adding a
> new conversion only touches this file."

### `worker.py` - the background job (Celery)
Defines the **Celery** app (connected to **Redis**) and the `run_conversion` task. When a job
runs, it:
1. marks the task `processing` (progress 10),
2. downloads the input from MinIO to a temp folder (progress 40),
3. calls `run(...)` to do the conversion (progress 80),
4. uploads the output to MinIO and marks the task `completed` (progress 100).
Any exception is caught and the task is marked `failed` with the error message.

> *Prof point:* "This runs in a separate process. Redis is the message broker that passes
> jobs from the API to the worker. Progress is written to the DB so the UI can show it."

### `routers/upload.py` - POST /api/upload
The entry point. It: checks the extension, reads the file, enforces a size limit, runs the
deep GeoJSON/GeoTIFF validation, stores the file in MinIO, creates the `Task` row, dispatches
the Celery job, and returns the `task_id` with **HTTP 202 Accepted** (meaning "accepted, work
in progress").

> *Prof point:* "202 Accepted, not 200 - we acknowledge the request but the work happens
> asynchronously."

### `routers/tasks.py` - GET /api/tasks/{id} and /result
Reads the task row from the database and returns its status/progress (and a result summary).
The frontend calls `/api/tasks/{id}` every second to update the progress bar.

### `routers/download.py` - GET /api/download/{id}
For a completed task, streams the output file back from MinIO with a
`Content-Disposition: attachment` header so the browser downloads it.

> *Prof point:* "We stream from object storage - the file never has to sit on the API server."

### `main.py` - app assembly + startup
Creates the FastAPI `app`, adds CORS (so the browser frontend can call it), and includes the
three routers. On startup (`lifespan`) it creates the database tables, runs a small migration
to add new columns, and ensures the MinIO bucket exists. FastAPI auto-generates the Swagger
docs at `/docs`.

---

## 4. Libraries used (and why)

| Library | Role |
|---------|------|
| **FastAPI** | web framework + automatic OpenAPI/Swagger docs |
| **Pydantic** | data validation + response schemas |
| **SQLAlchemy** | ORM for Postgres (the task table) |
| **Celery + Redis** | background task queue (async processing) |
| **MinIO** | S3-compatible object storage for files |
| **rasterio / rio-cogeo** | raster (GeoTIFF/COG) processing |
| **geopandas / shapely / pyproj / fiona** | vector processing + reprojection |
| **GDAL** | the C engine all the geo libraries wrap |

> **System dependency:** the backend Docker image also installs **`libexpat1`** - `rasterio`
> loads it at import time and the slim Python base image doesn't ship it. Without it, every
> conversion crashes on `import rasterio`. (This was a real bug we hit and fixed.)

---

## 5. Likely questions from a professor

- **"Why a task queue instead of doing it in the request?"** Conversions can take minutes; a
  synchronous request would time out and block the server. Celery offloads it so the API stays
  responsive and can scale workers independently.
- **"How does the progress bar work?"** The worker writes a `progress` number to the task row
  as it moves through stages; the frontend polls `/api/tasks/{id}` every second and reads it.
- **"Why MinIO and not store files in the DB?"** Databases are bad at large binary files.
  Object storage is the standard place for files, and both the API and worker can reach it.
- **"How do you validate input?"** Extension check + JSON/GeoJSON structure (RFC 7946) +
  GeoTIFF integrity (rasterio can open it, has bands and a CRS). Bad input returns HTTP 400.
- **"How is it deployed?"** `docker-compose` runs six containers: API, worker, Postgres,
  Redis, MinIO, and the Next.js frontend. One command starts everything.
- **"How would you add a new conversion?"** Write one function (input path -> output path),
  add it to the dispatcher and the `ConversionType` enum. Nothing else changes.
