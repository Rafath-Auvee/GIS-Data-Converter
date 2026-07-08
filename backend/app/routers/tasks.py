from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.task import Task, TaskResult
from app.models.task_record import TaskRecord
from app.services import storage

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
    "/tasks",
    response_model=list[Task],
    summary="List recent tasks (conversion history)",
)
def list_tasks(db: Session = Depends(get_db), limit: int = 100):
    recs = (
        db.query(TaskRecord)
        .order_by(TaskRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_to_task(r) for r in recs]


@router.get(
    "/tasks/{task_id}",
    response_model=Task,
    summary="Get task status",
    responses={404: {"description": "Task not found."}},
)
def get_task(task_id: str, db: Session = Depends(get_db)):
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


def _cleanup_objects(rec: TaskRecord) -> None:
    if rec.input_key:
        storage.remove_object(rec.input_key)
    if rec.output_key:
        storage.remove_object(rec.output_key)


@router.delete(
    "/tasks",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear all tasks (delete entire history)",
)
def clear_tasks(db: Session = Depends(get_db)):
    for rec in db.query(TaskRecord).all():
        _cleanup_objects(rec)
        db.delete(rec)
    db.commit()


@router.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete one task",
    responses={404: {"description": "Task not found."}},
)
def delete_task(task_id: str, db: Session = Depends(get_db)):
    rec = db.get(TaskRecord, task_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    _cleanup_objects(rec)
    db.delete(rec)
    db.commit()
