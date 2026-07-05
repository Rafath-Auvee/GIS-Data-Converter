"""Task endpoints: fetch status and result metadata."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.task import Task, TaskResult
from app.models.task_record import TaskRecord

router = APIRouter(prefix="/api", tags=["tasks"])


def _to_task(rec: TaskRecord) -> Task:
    return Task(
        id=rec.id,
        status=rec.status,
        conversion=rec.conversion,
        source_filename=rec.source_filename,
        output_filename=rec.output_filename,
        output_size=rec.output_size,
        error=rec.error,
        progress=rec.progress,
        created_at=rec.created_at,
        updated_at=rec.updated_at,
    )


@router.get(
    "/tasks/{task_id}",
    response_model=Task,
    summary="Get task status",
    responses={404: {"description": "Task not found."}},
)
def get_task(task_id: str, db: Session = Depends(get_db)):
    """Return current status and metadata for a conversion task."""
    rec = db.get(TaskRecord, task_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    return _to_task(rec)


@router.get(
    "/tasks/{task_id}/result",
    response_model=TaskResult,
    summary="Get task result metadata",
    responses={404: {"description": "Task not found."}},
)
def get_task_result(task_id: str, db: Session = Depends(get_db)):
    """Return result metadata (output filename, size, download URL) for a task."""
    rec = db.get(TaskRecord, task_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    return TaskResult(
        task_id=rec.id,
        status=rec.status,
        output_filename=rec.output_filename,
        output_size=rec.output_size,
        download_url=f"/api/download/{rec.id}" if rec.status == "completed" else None,
    )
