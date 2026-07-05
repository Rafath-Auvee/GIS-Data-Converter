"""Download endpoint: stream the converted output file from MinIO."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.task_record import TaskRecord
from app.services import storage

router = APIRouter(prefix="/api", tags=["download"])


@router.get(
    "/download/{task_id}",
    summary="Download the converted output",
    responses={
        200: {
            "description": "The converted file stream.",
            "content": {"application/octet-stream": {}},
        },
        404: {"description": "Task or output file not found."},
    },
)
def download_output(task_id: str, db: Session = Depends(get_db)):
    """Stream the converted output file for a completed task from MinIO."""
    rec = db.get(TaskRecord, task_id)
    if rec is None or rec.status != "completed" or not rec.output_key:
        raise HTTPException(status_code=404, detail="No completed output for this task.")

    response = storage.open_object(rec.output_key)

    def _stream():
        try:
            yield from response.stream(32 * 1024)
        finally:
            response.close()
            response.release_conn()

    headers = {"Content-Disposition": f'attachment; filename="{rec.output_filename}"'}
    return StreamingResponse(
        _stream(), media_type="application/octet-stream", headers=headers
    )
