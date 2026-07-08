import tempfile
from pathlib import Path

from celery import Celery

from app.config import settings
from app.conversions import run as run_conversion
from app.db import SessionLocal
from app.models.task_record import TaskRecord
from app.services import storage


celery_app = Celery(
    "gis_converter",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)


@celery_app.task(name="run_conversion")
def run_conversion_task(task_id: str) -> None:


    db = SessionLocal()
    try:
        task = db.get(TaskRecord, task_id)
        if task is None:
            return

        task.status = "processing"
        task.progress = 10
        db.commit()

        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = Path(tmp)
            input_path = tmpdir / task.source_filename
            storage.get_file(task.input_key, input_path)

            task.progress = 40
            db.commit()

            output_path = run_conversion(
                task.conversion,
                input_path,
                tmpdir,
                target_epsg=task.target_epsg,
                resolution=task.resolution,
                band=task.band,
                compression=task.compression,
                nodata=task.nodata,
                blocksize=task.blocksize,
            )

            task.progress = 80
            db.commit()

            output_key = f"outputs/{task_id}/{output_path.name}"
            storage.put_file(output_path, output_key)

            task.output_key = output_key
            task.output_filename = output_path.name
            task.output_size = output_path.stat().st_size
            task.status = "completed"
            task.progress = 100
            db.commit()
    except Exception as exc:
        db.rollback()
        task = db.get(TaskRecord, task_id)
        if task is not None:
            task.status = "failed"
            task.error = str(exc)
            db.commit()
    finally:
        db.close()
