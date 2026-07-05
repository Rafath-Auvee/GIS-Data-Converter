"""Celery application for asynchronous conversion jobs."""
from celery import Celery

from app.config import settings

celery_app = Celery(
    "gis_converter",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

# TODO (async phase): define the `convert` task that
#   1. marks the Task as processing,
#   2. downloads the source object from MinIO,
#   3. runs the matching converter from app.conversions,
#   4. uploads the output and marks the Task completed (or failed),
#   5. emits progress updates.
