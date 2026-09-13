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


class SplitWindow(BaseModel):
    startMin: int
    endMin: int


class AdminResolution(BaseModel):
    suggestedWindows: list[SplitWindow] = []
    blockingRequestIds: list[str] = []
    recommendDeferToAnotherDay: bool = False


class ScheduledBlock(BaseModel):
    requestId: str
    segmentId: str
    lineType: str
    startMin: int
    endMin: int
    status: Literal["Scheduled", "Shifted", "Split", "Conflict"]
    reason: Optional[str] = None
    splitWindows: Optional[list[SplitWindow]] = None
    adminResolution: Optional[AdminResolution] = None


@app.get("/api/health")
def health():
    return {"status": "ok", "engine": "OR-Tools CP-SAT + DEAP GA"}


@app.post("/api/solve", response_model=list[ScheduledBlock])
def solve(payload: SolveRequest):
    trains = [t.model_dump() for t in payload.trains]
    requests = [r.model_dump() for r in payload.requests]

    milp_result = solve_milp(trains, requests)

    # Conflict/Split results are already final decisions (or admin-facing
    # data) - the GA layer only deals in single, movable time windows, so
    # requests that didn't get a normal Scheduled/Shifted placement are
    # excluded from what it re-optimizes and passed through untouched.
    passthrough_statuses = {"Conflict", "Split"}
    passthrough_results = [r for r in milp_result if r["status"] in passthrough_statuses]
    passthrough_ids = {r["requestId"] for r in passthrough_results}
    ga_eligible_requests = [r for r in requests if r["id"] not in passthrough_ids]

    if payload.useGA and payload.networkEdges and ga_eligible_requests:
        edges = [{"segmentId": e.segmentId, "from": e.from_, "to": e.to} for e in payload.networkEdges]
        refined = refine_with_ga(milp_result, ga_eligible_requests, edges, trains=trains)
        return refined + passthrough_results

    return milp_result
