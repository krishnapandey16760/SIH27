from datetime import datetime
import random
import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import MaintenanceRequestDB

router = APIRouter(prefix="/api/requests", tags=["Maintenance Requests"])


class MaintenanceRequestCreate(BaseModel):
    id: Optional[str] = None
    requestId: Optional[str] = None
    segment: Optional[str] = None
    segmentId: Optional[str] = None
    fromStation: Optional[str] = None
    toStation: Optional[str] = None
    lineType: str = "UP"
    dept: str
    durationMins: int
    preferredStart: str
    preferredEnd: str
    priority: str = "Medium"
    requestedBy: str = "Section Engineer"
    submittedAt: Optional[str] = None
    status: str = "Pending"
    assignedBlock: Optional[str] = None
    conflictsWith: Optional[str] = None


class MaintenanceRequestUpdate(BaseModel):
    segment: Optional[str] = None
    segmentId: Optional[str] = None
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
        "segmentId": r.segment,
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


def _make_db_item(item: dict, db: Optional[Session] = None) -> MaintenanceRequestDB:
    seg = (item.get("segment") or item.get("segmentId") or "").strip()
    parts = seg.replace("-", "–").split("–")
    from_st = (item.get("fromStation") or (parts[0].strip() if len(parts) > 0 else "")).strip()
    to_st = (item.get("toStation") or (parts[1].strip() if len(parts) > 1 else "")).strip()
    if not seg and (from_st or to_st):
        seg = f"{from_st}–{to_st}"

    row_id = item.get("id") or f"req-{int(time.time() * 1000)}-{random.randint(100, 999)}"
    req_code = item.get("requestId") or f"MR-2026-{random.randint(1000, 9999)}"

    if db is not None:
        while db.query(MaintenanceRequestDB).filter(MaintenanceRequestDB.request_id == req_code).first():
            req_code = f"MR-2026-{random.randint(1000, 9999)}"
        while db.query(MaintenanceRequestDB).filter(MaintenanceRequestDB.id == row_id).first():
            row_id = f"req-{int(time.time() * 1000)}-{random.randint(100, 999)}"

    submitted_at = item.get("submittedAt") or datetime.now().strftime("%d %b %Y")

    return MaintenanceRequestDB(
        id=row_id,
        request_id=req_code,
        segment=seg,
        from_station=from_st,
        to_station=to_st,
        line_type=item.get("lineType") or "UP",
        dept=item.get("dept") or "Civil",
        duration_mins=int(item.get("durationMins") or 60),
        preferred_start=item.get("preferredStart") or "02:00",
        preferred_end=item.get("preferredEnd") or "04:00",
        priority=item.get("priority") or "Medium",
        requested_by=item.get("requestedBy") or "Section Engineer",
        submitted_at=submitted_at,
        status=item.get("status") or "Pending",
        assigned_block=item.get("assignedBlock"),
        conflicts_with=item.get("conflictsWith"),
    )


@router.get("")
def list_requests(db: Session = Depends(get_db)):
    rows = db.query(MaintenanceRequestDB).order_by(MaintenanceRequestDB.created_at.desc()).all()
    return {"requests": [serialize_request(r) for r in rows]}


@router.post("", status_code=201)
def create_request(payload: MaintenanceRequestCreate, db: Session = Depends(get_db)):
    db_item = _make_db_item(payload.model_dump(), db)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"request": serialize_request(db_item)}


@router.patch("/{req_id}")
def update_request(req_id: str, payload: MaintenanceRequestUpdate, db: Session = Depends(get_db)):
    row = (
        db.query(MaintenanceRequestDB)
        .filter((MaintenanceRequestDB.id == req_id) | (MaintenanceRequestDB.request_id == req_id))
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Maintenance request not found")

    updates = payload.model_dump(exclude_unset=True)
    if "segment" in updates or "segmentId" in updates:
        seg = (updates.get("segment") or updates.get("segmentId") or "").strip()
        if seg:
            row.segment = seg
    if "fromStation" in updates and updates["fromStation"] is not None:
        row.from_station = updates["fromStation"]
    if "toStation" in updates and updates["toStation"] is not None:
        row.to_station = updates["toStation"]
    if "lineType" in updates and updates["lineType"] is not None:
        row.line_type = updates["lineType"]
    if "dept" in updates and updates["dept"] is not None:
        row.dept = updates["dept"]
    if "durationMins" in updates and updates["durationMins"] is not None:
        row.duration_mins = updates["durationMins"]
    if "preferredStart" in updates and updates["preferredStart"] is not None:
        row.preferred_start = updates["preferredStart"]
    if "preferredEnd" in updates and updates["preferredEnd"] is not None:
        row.preferred_end = updates["preferredEnd"]
    if "priority" in updates and updates["priority"] is not None:
        row.priority = updates["priority"]
    if "requestedBy" in updates and updates["requestedBy"] is not None:
        row.requested_by = updates["requestedBy"]
    if "status" in updates and updates["status"] is not None:
        row.status = updates["status"]
    if "assignedBlock" in updates:
        row.assigned_block = updates["assignedBlock"]
    if "conflictsWith" in updates:
        row.conflicts_with = updates["conflictsWith"]

    db.commit()
    db.refresh(row)
    return {"request": serialize_request(row)}


@router.delete("/{req_id}")
def delete_request(req_id: str, db: Session = Depends(get_db)):
    row = (
        db.query(MaintenanceRequestDB)
        .filter((MaintenanceRequestDB.id == req_id) | (MaintenanceRequestDB.request_id == req_id))
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Maintenance request not found")

    db.delete(row)
    db.commit()
    return {"deleted": True, "id": req_id}


@router.post("/reset")
def reset_requests(db: Session = Depends(get_db)):
    db.query(MaintenanceRequestDB).delete()
    db.commit()
    return {"requests": []}