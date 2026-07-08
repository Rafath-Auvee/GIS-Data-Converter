import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app import validation
from app.config import settings
from app.db import get_db
from app.models.task import ConversionType, UploadAccepted
from app.models.task_record import TaskRecord
from app.services import storage
from app.worker import run_conversion_task

router = APIRouter(prefix="/api", tags=["upload"])


@router.post(
    "/upload",
    response_model=UploadAccepted,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a file and queue a conversion",
    responses={
        202: {"description": "Task accepted and queued for processing."},
        400: {"description": "Invalid file or unsupported conversion."},
        413: {"description": "Uploaded file exceeds the size limit."},
    },
)
async def upload_file(
    file: UploadFile = File(..., description="The geospatial file to convert."),
    conversion: ConversionType = Form(
        ..., description="Which conversion to run.", examples=["geojson_to_csv"]
    ),
    target_epsg: int | None = Form(
        None, description="Target EPSG code (used by reprojection).", examples=[3857]
    ),
    resolution: float | None = Form(
        None,
        description="Rasterization resolution in CRS units (GeoJSON -> Raster).",
        examples=[0.05],
    ),
    band: int | None = Form(
        None, description="Raster band to vectorize (Raster -> GeoJSON).", examples=[1]
    ),
    compression: str | None = Form(
        None,
        description="GDAL compression codec for raster output (deflate/lzw/zstd/webp/jpeg/none).",
        examples=["deflate"],
    ),
    nodata: float | None = Form(
        None, description="NoData value for raster output.", examples=[0]
    ),
    blocksize: int | None = Form(
        None,
        description="Internal COG tile block size, a multiple of 16 (GeoTIFF -> COG).",
        examples=[512],
    ),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    try:
        ext = validation.validate_extension(conversion.value, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    data = await file.read()
    limit = settings.max_upload_size_mb * 1024 * 1024
    if len(data) > limit:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File is {len(data) // (1024 * 1024)} MB; "
                f"limit is {settings.max_upload_size_mb} MB."
            ),
        )

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(data)
        tmp_path = Path(tmp.name)
    try:
        if ext in {".geojson", ".json"} and conversion.value in validation.GEOJSON_INPUT_CONVERSIONS:
            validation.validate_geojson(tmp_path)
        elif ext in {".tif", ".tiff"}:
            validation.validate_geotiff(tmp_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    task_id = str(uuid.uuid4())
    input_key = f"inputs/{task_id}/{file.filename}"
    storage.put_bytes(data, input_key)

    task = TaskRecord(
        id=task_id,
        status="pending",
        conversion=conversion.value,
        source_filename=file.filename,
        target_epsg=target_epsg,
        resolution=resolution,
        band=band,
        compression=compression,
        nodata=nodata,
        blocksize=blocksize,
        input_key=input_key,
        progress=0,
    )
    db.add(task)
    db.commit()

    run_conversion_task.delay(task_id)

    return UploadAccepted(task_id=task_id, status="pending")
