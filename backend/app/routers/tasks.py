"""Task endpoints: fetch status and result metadata."""
from fastapi import APIRouter

from app.models.task import Task, TaskResult

router = APIRouter(prefix="/api", tags=["tasks"])


@router.get(
    "/tasks/{task_id}",
    response_model=Task,
    summary="Get task status",
    responses={404: {"description": "Task not found."}},
)
def get_task(task_id: str):
    """Return current status and metadata for a conversion task.

    Example (curl):

        curl http://localhost:8000/api/tasks/<task_id>

    TODO (Step 2): load the Task record from the database and return it.
    """
    raise NotImplementedError


@router.get(
    "/tasks/{task_id}/result",
    response_model=TaskResult,
    summary="Get task result metadata",
    responses={404: {"description": "Task not found or not yet completed."}},
)
def get_task_result(task_id: str):
    """Return result metadata (output filename, size, download URL) for a task.

    TODO (Step 2).
    """
    raise NotImplementedError
