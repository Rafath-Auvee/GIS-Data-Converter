"""FastAPI application entrypoint.

Exposes the upload / task / download API and auto-generated OpenAPI docs at /docs.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import download, tasks, upload

# Groups shown in the Swagger UI (/docs), each with a short description.
tags_metadata = [
    {"name": "upload", "description": "Upload a geospatial file and start a conversion job."},
    {"name": "tasks", "description": "Check conversion task status and fetch result metadata."},
    {"name": "download", "description": "Download the converted output file."},
    {"name": "system", "description": "Service health checks."},
]

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
)

# Open CORS for local frontend development (tighten before any real deployment).
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
    """Liveness probe."""
    return {"status": "ok"}
