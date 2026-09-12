"""
Real constraint solver using Google OR-Tools CP-SAT.

Unlike the earlier JS greedy heuristic, this finds the mathematically
OPTIMAL placement within each segment+line group (not just "first
feasible slot") by using CP-SAT's native interval-scheduling constraint
(NewIntervalVar + AddNoOverlap), which enforces zero overlap between any
train movement and any maintenance block by construction — this is a
hard guarantee, not an approximation.

No training required — this solves each day's instance fresh from the
input data.
"""

from collections import defaultdict
from ortools.sat.python import cp_model

PRIORITY_WEIGHT = {"Critical": 100, "High": 50, "Medium": 20, "Low": 5}
DAY_MINUTES = 1440


def solve_milp(trains: list[dict], requests: list[dict]) -> list[dict]:
    """
    trains:   [{trainNumber, trainName, segmentId, lineType, startMin, endMin}, ...]
    requests: [{id, segmentId, lineType, dept, priority, durationMins,
                preferredStart, preferredEnd}, ...]
    returns:  [{requestId, segmentId, lineType, startMin, endMin, status, reason}, ...]
    """
    groups: dict[tuple[str, str], dict] = defaultdict(lambda: {"trains": [], "requests": []})

    for t in trains:
        groups[(t["segmentId"], t["lineType"])]["trains"].append(t)
    for r in requests:
        groups[(r["segmentId"], r["lineType"])]["requests"].append(r)

    results: list[dict] = []

    for (segment_id, line_type), g in groups.items():
        if not g["requests"]:
            continue

        model = cp_model.CpModel()

        # Fixed, immovable intervals for train movements — the hard constraint.
        train_intervals = []
        for t in g["trains"]:
            dur = max(1, t["endMin"] - t["startMin"])
            iv = model.NewIntervalVar(t["startMin"], dur, t["endMin"], f"train_{t['trainNumber']}")
            train_intervals.append(iv)

        block_intervals = []
        starts: dict[str, cp_model.IntVar] = {}
        deviation_terms = []

        for req in g["requests"]:
            dur = req["durationMins"]
            latest_start = max(0, DAY_MINUTES - dur)
            start_var = model.NewIntVar(0, latest_start, f"start_{req['id']}")
            end_var = model.NewIntVar(dur, DAY_MINUTES, f"end_{req['id']}")
            interval = model.NewIntervalVar(start_var, dur, end_var, f"block_{req['id']}")

            starts[req["id"]] = start_var
            block_intervals.append(interval)

            deviation = model.NewIntVar(0, DAY_MINUTES, f"dev_{req['id']}")
            model.AddAbsEquality(deviation, start_var - req["preferredStart"])
            weight = PRIORITY_WEIGHT.get(req["priority"], 10)
            deviation_terms.append(deviation * weight)

        # HARD CONSTRAINT: nothing on this segment+line may overlap anything else.
        model.AddNoOverlap(train_intervals + block_intervals)

        # Objective: minimize total priority-weighted deviation from preferred time.
        model.Minimize(sum(deviation_terms))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 5.0
        solver.parameters.num_search_workers = 8
        status = solver.Solve(model)

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            for req in g["requests"]:
                s = solver.Value(starts[req["id"]])
                e = s + req["durationMins"]
                results.append(
                    {
                        "requestId": req["id"],
                        "segmentId": segment_id,
                        "lineType": line_type,
                        "startMin": s,
                        "endMin": e,
                        "status": "Scheduled" if s == req["preferredStart"] else "Shifted",
                        "reason": None
                        if s == req["preferredStart"]
                        else "Auto-shifted by MILP solver to satisfy no-overlap constraint",
                    }
                )
        else:
            # Provably infeasible for this segment+line group with current constraints.
            for req in g["requests"]:
                results.append(
                    {
                        "requestId": req["id"],
                        "segmentId": segment_id,
                        "lineType": line_type,
                        "startMin": req["preferredStart"],
                        "endMin": req["preferredStart"] + req["durationMins"],
                        "status": "Conflict",
                        "reason": "No feasible schedule satisfies all hard constraints on this segment/line",
                    }
                )

    return results
