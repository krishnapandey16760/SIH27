from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime, timezone
from database import Base


class MaintenanceRequestDB(Base):
    __tablename__ = "maintenance_requests"

    id = Column(String, primary_key=True, index=True)
    request_id = Column(String, unique=True, nullable=False, index=True)
    segment = Column(String, nullable=False, index=True)
    from_station = Column(String, nullable=False)
    to_station = Column(String, nullable=False)
    line_type = Column(String, nullable=False, default="UP")
    dept = Column(String, nullable=False)          # Civil, OHE, S&T
    duration_mins = Column(Integer, nullable=False)
    preferred_start = Column(String, nullable=False)  # 'HH:MM'
    preferred_end = Column(String, nullable=False)    # 'HH:MM'
    priority = Column(String, nullable=False)         # Critical, High, Medium, Low
    requested_by = Column(String, nullable=False)
    submitted_at = Column(String, nullable=False)
    status = Column(String, nullable=False, default="Pending")
    assigned_block = Column(String, nullable=True)
    conflicts_with = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))