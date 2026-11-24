from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from database import get_db
from models import MaintenanceRequestDB

router = APIRouter(prefix="/api/requests", tags=["Maintenance Requests"])


class RequestPayload(BaseModel):
    id: Optional[str] = None
    requestId: Optional[str] = None
    segment: str
    fromStation: Optional[str] = None
    toStation: Optional[str] = None
    lineType: str = "UP"
    dept: str
    durationMins: int
    preferredStart: str
    preferredEnd: str
    priority: str
    requestedBy: str = "Controller"
    submittedAt: Optional[str] = None
    status: str = "Pending"
    assignedBlock: Optional[str] = None
    conflictsWith: Optional[str] = None


class RequestUpdate(BaseModel):
    segment: Optional[str] = None
    fromStation: Optional[str] = None
    toStation: Optional[str] = None
    lineType: Optional[str] = None
    dept: Optional[str] = None
    durationMins: Optional[int] = None
    preferredStart: Optional[str] = None
    preferredEnd: Optional[str] = None
    priority: Optional[str] = None
    requestedBy: Optional[str] = None
    status: Optional[str] = None
    assignedBlock: Optional[str] = None
    conflictsWith: Optional[str] = None


def serialize_request(r: MaintenanceRequestDB) -> dict:
    return {
        "id": r.id,
        "requestId": r.request_id,
        "segment": r.segment,
        "fromStation": r.from_station,
        "toStation": r.to_station,
        "lineType": r.line_type,
        "dept": r.dept,
        "durationMins": r.duration_mins,
        "preferredStart": r.preferred_start,
        "preferredEnd": r.preferred_end,
        "priority": r.priority,
        "requestedBy": r.requested_by,
        "submittedAt": r.submitted_at,
        "status": r.status,
        "assignedBlock": r.assigned_block,
        "conflictsWith": r.conflicts_with,
    }


def _make_db_item(item: dict) -> MaintenanceRequestDB:
    seg = item["segment"]
    parts = seg.replace("-", "–").split("–")
    from_st = item.get("fromStation") or (parts[0].strip() if len(parts) > 0 else "")
    to_st = item.get("toStation") or (parts[1].strip() if len(parts) > 1 else "")
    return MaintenanceRequestDB(
        id=item.get("id") or f"req-{uuid.uuid4().hex[:6]}",
        request_id=item.get("requestId") or f"MR-2026-{uuid.uuid4().hex[:4].upper()}",
        segment=seg,
        from_station=from_st,
        to_station=to_st,
        line_type=item.get("lineType", "UP"),
        dept=item["dept"],
        duration_mins=item["durationMins"],
        preferred_start=item["preferredStart"],
        preferred_end=item["preferredEnd"],
        priority=item["priority"],
        requested_by=item.get("requestedBy", "Controller"),
        submitted_at=item.get("submittedAt") or datetime.now().strftime("%d %b %Y"),
        status=item.get("status", "Pending"),
        assigned_block=item.get("assignedBlock"),
        conflicts_with=item.get("conflictsWith"),
    )


@router.get("")
def list_requests(db: Session = Depends(get_db)):
    items = db.query(MaintenanceRequestDB).order_by(MaintenanceRequestDB.created_at.desc()).all()
    return {"requests": [serialize_request(r) for r in items]}


@router.post("", status_code=201)
def create_request(payload: RequestPayload, db: Session = Depends(get_db)):
    db_item = _make_db_item(payload.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"request": serialize_request(db_item)}


@router.post("/reset")
def reset_requests(db: Session = Depends(get_db)):
    db.query(MaintenanceRequestDB).delete()
    db.commit()
    return {"requests": []}


@router.patch("/{req_id}")
def update_request(req_id: str, payload: RequestUpdate, db: Session = Depends(get_db)):
    item = (
        db.query(MaintenanceRequestDB)
        .filter((MaintenanceRequestDB.id == req_id) | (MaintenanceRequestDB.request_id == req_id))
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Request not found")

    field_map = {
        "segment": "segment",
        "fromStation": "from_station",
        "toStation": "to_station",
        "lineType": "line_type",
        "dept": "dept",
        "durationMins": "duration_mins",
        "preferredStart": "preferred_start",
        "preferredEnd": "preferred_end",
        "priority": "priority",
        "requestedBy": "requested_by",
        "status": "status",
        "assignedBlock": "assigned_block",
        "conflictsWith": "conflicts_with",
    }
    updates = payload.model_dump(exclude_unset=True)
    for camel_key, value in updates.items():
        setattr(item, field_map[camel_key], value)

    db.commit()
    db.refresh(item)
    return {"request": serialize_request(item)}


@router.delete("/{req_id}")
def delete_request(req_id: str, db: Session = Depends(get_db)):
    item = (
        db.query(MaintenanceRequestDB)
        .filter((MaintenanceRequestDB.id == req_id) | (MaintenanceRequestDB.request_id == req_id))
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Request not found")
    db.delete(item)
    db.commit()
    return {"deleted": True, "id": req_id}
