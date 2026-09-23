"""
Real constraint solver using Google OR-Tools CP-SAT.

Enhanced with:
1. STRICT SAME-SEGMENT CORRIDOR ALIGNMENT (UP == DOWN)
2. COMMON JUNCTION PRE-ANCHORING (Consolidated Mega-Blocks)
- Groups by physical segmentId.
- Enforces start_var(UP) == start_var(DOWN) on the same segment.
- Pre-anchors requests sharing a common railway junction into a synchronized window.
"""

from collections import defaultdict
from ortools.sat.python import cp_model

PRIORITY_WEIGHT = {"Critical": 100, "High": 50, "Medium": 20, "Low": 5}
TRAFFIC_WEIGHT = {"Critical": 6, "High": 4, "Medium": 2, "Low": 1}
DAY_MINUTES = 1440
FULL_SOLVE_TIME_LIMIT = 5.0
ISOLATION_TIME_LIMIT = 2.0
MIN_SPLIT_PART_MINS = 30
MAX_SPLIT_PARTS = 3


def _traffic_density_curve(trains_data, day_minutes=DAY_MINUTES, smoothing_mins=45):
    density = [0] * day_minutes
    for t in trains_data:
        s = max(0, t["startMin"] - smoothing_mins)
        e = min(day_minutes, t["endMin"] + smoothing_mins)
        for m in range(s, e):
            density[m] += 1
    return density


def _find_free_windows(fixed_intervals, duration, day_minutes=DAY_MINUTES):
    occupied = sorted((iv["startMin"], iv["endMin"]) for iv in fixed_intervals)
    free = []
    cursor = 0
    for s, e in occupied:
        if s - cursor >= duration:
            free.append((cursor, s))
        cursor = max(cursor, e)
    if day_minutes - cursor >= duration:
        free.append((cursor, day_minutes))
    return free


def _find_single_slot(fixed_intervals, req, day_minutes=DAY_MINUTES):
    dur = req["durationMins"]
    gaps = _find_free_windows(fixed_intervals, dur, day_minutes)
    if not gaps:
        return None
    best_start, best_score = None, None
    anchor = req.get("targetAnchor", req["preferredStart"])
    for gs, ge in gaps:
        candidate = min(max(anchor, gs), ge - dur)
        score = abs(candidate - anchor)
        if best_score is None or score < best_score:
            best_score, best_start = score, candidate
    return best_start


def _try_duration_split(
    fixed_intervals,
    req,
    day_minutes=DAY_MINUTES,
    max_parts=MAX_SPLIT_PARTS,
    min_part_mins=MIN_SPLIT_PART_MINS,
):
    dur = req["durationMins"]
    if dur <= min_part_mins:
        return None

    gaps = _find_free_windows(fixed_intervals, min_part_mins, day_minutes)
    if len(gaps) < 2:
        return None

    anchor = req.get("targetAnchor", req["preferredStart"])
    gaps_sorted = sorted(
        gaps,
        key=lambda g: min(abs(g[0] - anchor), abs(g[1] - anchor)),
    )

    remaining = dur
    pieces = []
    for gs, ge in gaps_sorted:
        if remaining <= 0 or len(pieces) >= max_parts:
            break
        take = min(ge - gs, remaining)
        if take < min_part_mins:
            continue
        pieces.append({"startMin": gs, "endMin": gs + take})
        remaining -= take

    if remaining > 0:
        return None

    pieces.sort(key=lambda p: p["startMin"])
    return pieces


def _build_admin_alternatives(trains_data, resolved_others, starts, req, day_minutes=DAY_MINUTES):
    dur = req["durationMins"]
    fixed = [{"startMin": t["startMin"], "endMin": t["endMin"]} for t in trains_data]
    for other in resolved_others:
        s = starts[other["id"]]
        fixed.append({"startMin": s, "endMin": s + other["durationMins"]})

    gaps = _find_free_windows(fixed, min(dur, MIN_SPLIT_PART_MINS), day_minutes)
    windows = []
    anchor = req.get("targetAnchor", req["preferredStart"])
    for gs, ge in gaps:
        piece_len = min(ge - gs, dur)
        candidate = min(max(anchor, gs), ge - piece_len)
        windows.append({"startMin": candidate, "endMin": candidate + piece_len})
    windows.sort(key=lambda w: abs(w["startMin"] - anchor))
    windows = windows[:3]

    req_weight = PRIORITY_WEIGHT.get(req["priority"], 10)
    blocking = []
    for other in resolved_others:
        other_weight = PRIORITY_WEIGHT.get(other["priority"], 10)
        s = starts[other["id"]]
        if other_weight < req_weight and abs(s - anchor) <= 180:
            blocking.append(other["id"])

    return windows, blocking


def solve_segment_corridor(segment_id: str, trains_by_line: dict, requests: list[dict]):
    """
    Solves all requests on a physical segment across both UP and DOWN lines simultaneously.
    Enforces identical startMin when both tracks have maintenance work.
    """
    model = cp_model.CpModel()
    all_trains = [t for line in trains_by_line.values() for t in line]
    density = _traffic_density_curve(all_trains)
    max_density = max(density) if density else 0

    starts = {}
    intervals_by_line = defaultdict(list)
    cost_terms = []

    for req in requests:
        dur = req["durationMins"]
        latest_start = max(0, DAY_MINUTES - dur)
        s_var = model.NewIntVar(0, latest_start, f"start_{req['id']}")
        e_var = model.NewIntVar(dur, DAY_MINUTES, f"end_{req['id']}")
        iv = model.NewIntervalVar(s_var, dur, e_var, f"block_{req['id']}")

        starts[req["id"]] = s_var
        intervals_by_line[req["lineType"]].append(iv)

        # Deviation penalty from preferred window or common junction anchor
        anchor = req.get("targetAnchor", req["preferredStart"])
        w = PRIORITY_WEIGHT.get(req["priority"], 10)
        dev = model.NewIntVar(0, DAY_MINUTES, f"dev_{req['id']}")
        model.AddAbsEquality(dev, s_var - anchor)
        cost_terms.append(dev * w)

        # Traffic penalty
        mid = model.NewIntVar(0, DAY_MINUTES - 1, f"mid_{req['id']}")
        model.Add(mid == s_var + dur // 2)
        traffic_at_mid = model.NewIntVar(0, max_density, f"traffic_{req['id']}")
        model.AddElement(mid, density, traffic_at_mid)
        cost_terms.append(traffic_at_mid * TRAFFIC_WEIGHT.get(req["priority"], 1))

    # Line-specific non-overlap constraints with trains
    for line_type, blk_intervals in intervals_by_line.items():
        trn_intervals = [
            model.NewIntervalVar(t["startMin"], max(1, t["endMin"] - t["startMin"]), t["endMin"], f"train_{t['trainNumber']}")
            for t in trains_by_line.get(line_type, [])
        ]
        model.AddNoOverlap(trn_intervals + blk_intervals)

    # STRICT SAME-SEGMENT UP & DOWN SYNCHRONIZATION
    up_reqs = [r for r in requests if r["lineType"] == "UP"]
    down_reqs = [r for r in requests if r["lineType"] == "DOWN"]

    if up_reqs and down_reqs:
        master_start = starts[up_reqs[0]["id"]]
        for r_up in up_reqs[1:]:
            model.Add(starts[r_up["id"]] == master_start)
        for r_down in down_reqs:
            model.Add(starts[r_down["id"]] == master_start)

    model.Minimize(sum(cost_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = FULL_SOLVE_TIME_LIMIT
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {r["id"]: solver.Value(starts[r["id"]]) for r in requests}, {}

    starts_out = {}
    conflicts_out = []
    for r in requests:
        line_trains = trains_by_line.get(r["lineType"], [])
        fixed = [{"startMin": t["startMin"], "endMin": t["endMin"]} for t in line_trains]
        slot = _find_single_slot(fixed, r)
        if slot is not None:
            starts_out[r["id"]] = slot
        else:
            conflicts_out.append(r)

    return starts_out, conflicts_out


def solve_milp(trains: list[dict], requests: list[dict]) -> list[dict]:
    """
    Solves maintenance scheduling with physical segment grouping, UP/DOWN synchronization,
    and common junction anchoring for multi-request consolidation.
    """
    # 1. Pre-detect and anchor common stations
    station_map = defaultdict(list)
    for r in requests:
        stns = r["segmentId"].replace("–", "-").split("-")
        for s in stns:
            station_map[s].append(r)

    for stn, req_list in station_map.items():
        if len(req_list) >= 2:
            common_anchor = min(r["preferredStart"] for r in req_list)
            for r in req_list:
                r["targetAnchor"] = common_anchor

    # 2. Group trains and requests by physical segment
    segments_data = defaultdict(lambda: {"trains": defaultdict(list), "requests": []})

    for t in trains:
        segments_data[t["segmentId"]]["trains"][t["lineType"]].append(t)
    for r in requests:
        segments_data[r["segmentId"]]["requests"].append(r)

    results: list[dict] = []

    for segment_id, data in segments_data.items():
        seg_requests = data["requests"]
        if not seg_requests:
            continue

        trains_by_line = data["trains"]
        starts, conflicts = solve_segment_corridor(segment_id, trains_by_line, seg_requests)

        has_both_tracks = (
            any(r["lineType"] == "UP" for r in seg_requests) and
            any(r["lineType"] == "DOWN" for r in seg_requests)
        )

        for req in seg_requests:
            if req["id"] in starts:
                s = starts[req["id"]]
                e = s + req["durationMins"]
                reason = None
                if s != req["preferredStart"]:
                    sync_text = " (Synchronized UP & DOWN corridor block)" if has_both_tracks else ""
                    reason = f"Aligned to low-traffic window for max asset availability{sync_text}"

                results.append({
                    "requestId": req["id"],
                    "segmentId": segment_id,
                    "lineType": req["lineType"],
                    "startMin": s,
                    "endMin": e,
                    "status": "Scheduled" if s == req["preferredStart"] else "Shifted",
                    "reason": reason,
                    "splitWindows": None,
                    "adminResolution": None,
                })
            else:
                all_seg_trains = [t for line in trains_by_line.values() for t in line]
                windows, blocking = _build_admin_alternatives(all_seg_trains, [], starts, req)
                results.append({
                    "requestId": req["id"],
                    "segmentId": segment_id,
                    "lineType": req["lineType"],
                    "startMin": req["preferredStart"],
                    "endMin": req["preferredStart"] + req["durationMins"],
                    "status": "Conflict",
                    "reason": "Simultaneous UP/DOWN corridor block impossible due to high opposing train traffic",
                    "splitWindows": None,
                    "adminResolution": {
                        "suggestedWindows": windows,
                        "blockingRequestIds": blocking,
                        "recommendDeferToAnotherDay": True,
                    },
                })

    return results