"""Upload endpoint: accept a file + conversion config and create a task."""
from fastapi import APIRouter, File, Form, UploadFile, status

from app.models.task import ConversionType, UploadAccepted

router = APIRouter(prefix="/api", tags=["upload"])


@router.post(
    "/upload",
    response_model=UploadAccepted,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a file and queue a conversion",
    responses={
        202: {"description": "Task accepted and queued for processing."},
        400: {"description": "Invalid file or unsupported conversion."},
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
):
    """Accept a geospatial file and conversion config, then queue a task.

    Example (curl):

        curl -F "file=@us-states.geojson" \\
             -F "conversion=geojson_to_csv" \\
             http://localhost:8000/api/upload

    TODO (Step 2):
      - validate file extension / format against the requested conversion
      - stream the upload into MinIO
      - create a Task record with status=pending
      - dispatch the Celery convert job
      - return the task id
    """
    raise NotImplementedError("Upload handling is wired up in Step 2.")
