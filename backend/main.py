"""
RailBlock Optimization Engine — FastAPI backend.

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Frontend calls this at POST /api/solve — see src/lib/solverClient.ts
in the Next.js project.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional

from solver.milp_solver import solve_milp
from solver.ga_refiner import refine_with_ga

app = FastAPI(title="RailBlock Optimization Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict to your deployed Next.js origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)


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


class NetworkEdge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    segmentId: str
    from_: str = Field(alias="from")
    to: str


class SolveRequest(BaseModel):
    trains: list[TrainMovement]
    requests: list[MaintenanceRequestIn]
    networkEdges: Optional[list[NetworkEdge]] = None
    useGA: bool = False


class ScheduledBlock(BaseModel):
    requestId: str
    segmentId: str
    lineType: str
    startMin: int
    endMin: int
    status: Literal["Scheduled", "Shifted", "Conflict"]
    reason: Optional[str] = None


@app.get("/api/health")
def health():
    return {"status": "ok", "engine": "OR-Tools CP-SAT + DEAP GA"}


@app.post("/api/solve", response_model=list[ScheduledBlock])
def solve(payload: SolveRequest):
    trains = [t.model_dump() for t in payload.trains]
    requests = [r.model_dump() for r in payload.requests]

    milp_result = solve_milp(trains, requests)

    if payload.useGA and payload.networkEdges:
        edges = [{"segmentId": e.segmentId, "from": e.from_, "to": e.to} for e in payload.networkEdges]
        return refine_with_ga(milp_result, requests, edges)

    return milp_result
