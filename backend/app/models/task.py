"""Task status/type enums and API schemas (with Swagger examples)."""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class TaskStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ConversionType(str, Enum):
    geojson_to_csv = "geojson_to_csv"
    csv_to_geojson = "csv_to_geojson"
    geotiff_to_cog = "geotiff_to_cog"
    raster_to_geojson = "raster_to_geojson"
    geojson_to_raster = "geojson_to_raster"
    reproject = "reproject"


class Task(BaseModel):
    """Full API representation of a conversion job."""

    id: str
    status: TaskStatus
    conversion: ConversionType
    source_filename: str
    output_filename: str | None = None
    output_size: int | None = None
    error: str | None = None
    progress: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "b1c2d3e4-5f60-7a80-9b01-c2d3e4f5a6b7",
                "status": "processing",
                "conversion": "geojson_to_csv",
                "source_filename": "us-states.geojson",
                "output_filename": None,
                "output_size": None,
                "error": None,
                "progress": 40,
                "created_at": "2026-07-05T10:00:00Z",
                "updated_at": "2026-07-05T10:00:05Z",
            }
        }
    }


class UploadAccepted(BaseModel):
    """Returned by POST /api/upload once a task is queued."""

    task_id: str
    status: TaskStatus

    model_config = {
        "json_schema_extra": {
            "example": {
                "task_id": "b1c2d3e4-5f60-7a80-9b01-c2d3e4f5a6b7",
                "status": "pending",
            }
        }
    }


class TaskResult(BaseModel):
    """Result metadata for a completed task."""

    task_id: str
    status: TaskStatus
    output_filename: str | None = None
    output_size: int | None = None
    download_url: str | None = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "task_id": "b1c2d3e4-5f60-7a80-9b01-c2d3e4f5a6b7",
                "status": "completed",
                "output_filename": "us-states.csv",
                "output_size": 20480,
                "download_url": "/api/download/b1c2d3e4-5f60-7a80-9b01-c2d3e4f5a6b7",
            }
        }
    }
