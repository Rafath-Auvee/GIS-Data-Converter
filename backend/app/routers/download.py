"""Download endpoint: stream the converted output file."""
from fastapi import APIRouter

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
def download_output(task_id: str):
    """Stream the converted output file for a completed task from MinIO.

    Example (curl):

        curl -OJ http://localhost:8000/api/download/<task_id>

    TODO (Step 2): look up the output object and stream it back with the correct
    Content-Type and Content-Disposition headers.
    """
    raise NotImplementedError
