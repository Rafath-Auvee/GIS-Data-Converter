import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.db import Base, engine
from app.routers import download, tasks, upload
from app.services import storage

tags_metadata = [
    {"name": "upload", "description": "Upload a geospatial file and start a conversion job."},
    {"name": "tasks", "description": "Check conversion task status and fetch result metadata."},
    {"name": "download", "description": "Download the converted output file."},
    {"name": "system", "description": "Service health checks."},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.models import task_record

    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS resolution double precision"))
        conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS band integer"))
        conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS compression varchar"))
        conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS nodata double precision"))
        conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocksize integer"))

    for attempt in range(10):
        try:
            storage.ensure_bucket()
            break
        except Exception:
            if attempt == 9:
                raise
            time.sleep(2)

    yield


app = FastAPI(
    title="GIS Data Converter",
    description=(
        "Web-based geospatial data conversion service.\n\n"
        "Upload a file, pick a conversion (GeoJSON↔CSV, GeoTIFF→COG, "
        "Raster→GeoJSON, GeoJSON→Raster, or Reprojection), then poll the task "
        "and download the result."
    ),
    version="0.1.0",
    license_info={"name": "MIT"},
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(tasks.router)
app.include_router(download.router)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}
