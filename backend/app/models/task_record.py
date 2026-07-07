"""SQLAlchemy ORM model for persisted conversion tasks."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text

from app.db import Base


class TaskRecord(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    status = Column(String, nullable=False, default="pending")
    conversion = Column(String, nullable=False)
    source_filename = Column(String, nullable=False)
    target_epsg = Column(Integer, nullable=True)
    resolution = Column(Float, nullable=True)
    band = Column(Integer, nullable=True)
    input_key = Column(String, nullable=False)
    output_key = Column(String, nullable=True)
    output_filename = Column(String, nullable=True)
    output_size = Column(Integer, nullable=True)
    error = Column(Text, nullable=True)
    progress = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
