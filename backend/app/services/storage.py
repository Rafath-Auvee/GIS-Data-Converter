"""MinIO (S3-compatible) object storage helpers."""
import io
from pathlib import Path

from minio import Minio

from app.config import settings

client = Minio(
    settings.minio_endpoint,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=settings.minio_secure,
)


def ensure_bucket() -> None:
    """Create the configured bucket if it does not already exist."""
    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)


def put_bytes(
    data: bytes, object_name: str, content_type: str = "application/octet-stream"
) -> None:
    """Store an in-memory blob as an object."""
    client.put_object(
        settings.minio_bucket,
        object_name,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )


def put_file(
    local_path: Path, object_name: str, content_type: str = "application/octet-stream"
) -> None:
    """Upload a file from disk to an object."""
    client.fput_object(
        settings.minio_bucket, object_name, str(local_path), content_type=content_type
    )


def get_file(object_name: str, local_path: Path) -> None:
    """Download an object to a local path."""
    client.fget_object(settings.minio_bucket, object_name, str(local_path))


def open_object(object_name: str):
    """Return a streamable urllib3 response for the object (caller must close it)."""
    return client.get_object(settings.minio_bucket, object_name)
