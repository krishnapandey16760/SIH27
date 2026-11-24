from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime, timezone
from database import Base

class MaintenanceRequestDB(Base):
    __tablename__ = "maintenance_requests"

    id = Column(String, primary_key=True, index=True)
    segment_id = Column(String, nullable=False, index=True)
    line_type = Column(String, nullable=False, default="UP")
    dept = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    duration_mins = Column(Integer, nullable=False)
    preferred_start = Column(Integer, nullable=False)
    preferred_end = Column(Integer, nullable=False)
    scheduled_start = Column(Integer, nullable=True)
    scheduled_end = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default="Pending")
    title = Column(String, nullable=True)
    description = Column(String, nullable=True)
    requested_by = Column(String, nullable=True)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )