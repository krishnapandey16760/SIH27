"""
RailBlock Optimization Engine — FastAPI backend.

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from typing import Literal, Optional

from database import engine, Base, get_db
from models import MaintenanceRequestDB
from backend.requests_router import router as requests_router
from solver.milp_solver import solve_milp
from solver.ga_refiner import refine_with_ga

app = FastAPI(title="RailBlock Optimization Engine")

Base.metadata.create_all(bind=engine)
app.include_router(requests_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _parse_time_to_mins(val: int | str) -> int:
    if isinstance(val, int):
        return val
    text = str(val).strip()
    if ":" in text:
        parts = text.split(":", 1)
        return int(parts[0]) * 60 + int(parts[1])
    return int(float(text))


def _mins_to_hhmm(mins: int) -> str:
    clamped = max(0, min(1440, int(mins)))
    h, m = divmod(clamped, 60)
    return f"{h:02d}:{m:02d}"


class TrainMovement(BaseModel):
    trainNumber: str
    trainName: str
    segmentId: str
    lineType: Literal["UP", "DOWN"]
    startMin: int
    endMin: int


class MaintenanceRequestIn(BaseModel):
    id: str
    segmentId: str
    lineType: Literal["UP", "DOWN"]
    dept: str
    priority: Literal["Critical", "High", "Medium", "Low"]
    durationMins: int
    preferredStart: int
    preferredEnd: int

    @field_validator("preferredStart", "preferredEnd", mode="before")
    @classmethod
    def normalize_minutes(cls, v):
        return _parse_time_to_mins(v)


class SolveRequest(BaseModel):
    trains: list[TrainMovement]
    requests: Optional[list[MaintenanceRequestIn]] = None
    useGA: bool = False
    syncDb: bool = True


class ScheduledBlock(BaseModel):
    requestId: str
    segmentId: str
    lineType: str
    startMin: int
    endMin: int
    status: Literal["Scheduled", "Shifted"]
    reason: Optional[str] = None


@app.get("/api/health")
def health():
    return {"status": "ok", "engine": "OR-Tools CP-SAT + DEAP GA"}


@app.post("/api/solve", response_model=list[ScheduledBlock])
def solve(payload: SolveRequest, db: Session = Depends(get_db)):
    trains = [t.model_dump() for t in payload.trains]

    if payload.requests is not None:
        requests = [r.model_dump() for r in payload.requests]
    else:
        db_items = db.query(MaintenanceRequestDB).all()
        requests = [
            {
                "id": item.id,
                "segmentId": item.segment,
                "lineType": item.line_type or "UP",
                "dept": item.dept,
                "priority": item.priority if item.priority in {"Critical", "High", "Medium", "Low"} else "Medium",
                "durationMins": int(item.duration_mins),
                "preferredStart": _parse_time_to_mins(item.preferred_start),
                "preferredEnd": _parse_time_to_mins(item.preferred_end),
            }
            for item in db_items
        ]

    if not requests:
        return []

    milp_result = solve_milp(trains, requests)
    final_result = (
        refine_with_ga(milp_result, requests, trains=trains)
        if payload.useGA
        else milp_result
    )

    if payload.syncDb and final_result:
        updated = False
        for res in final_result:
            req_id = res["requestId"]
            db_item = (
                db.query(MaintenanceRequestDB)
                .filter(
                    (MaintenanceRequestDB.id == req_id)
                    | (MaintenanceRequestDB.request_id == req_id)
                )
                .first()
            )
            if db_item:
                db_item.status = res["status"]
                db_item.assigned_block = f"{_mins_to_hhmm(res['startMin'])} - {_mins_to_hhmm(res['endMin'])}"
                reason = res.get("reason") or ""
                db_item.conflicts_with = reason if "affected" in reason else None
                updated = True
        if updated:
            db.commit()

    return final_result