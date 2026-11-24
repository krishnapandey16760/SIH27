"""
Constraint solver using Google OR-Tools CP-SAT.

Core goals:
1. Maximum asset availability (synchronizes UP & DOWN blocks on the same segment when feasible,
   with zero block-to-block overlap on any track).
2. Zero train collision on static train data across the 24-hour (1440-min) timeline,
   respecting urgency (priority) and preferredStart.
3. Minimum-train fallback: if no zero-train slot exists in 24 hours, schedules in the
   block-free slot with the fewest overlapping trains closest to preferredStart.
"""

from collections import defaultdict
from ortools.sat.python import cp_model

PRIORITY_WEIGHT = {"Critical": 100, "High": 50, "Medium": 20, "Low": 5}
DAY_MINUTES = 1440
FULL_SOLVE_TIME_LIMIT = 5.0


def _find_free_windows(fixed_intervals: list[tuple[int, int]], duration: int, day_minutes: int = DAY_MINUTES):
    occupied = sorted((max(0, s), min(day_minutes, e)) for s, e in fixed_intervals)
    free = []
    cursor = 0
    for s, e in occupied:
        if s - cursor >= duration:
            free.append((cursor, s))
        cursor = max(cursor, e)
    if day_minutes - cursor >= duration:
        free.append((cursor, day_minutes))
    return free


def _find_zero_train_slot(fixed_intervals: list[tuple[int, int]], req: dict, day_minutes: int = DAY_MINUTES):
    dur = req["durationMins"]
    gaps = _find_free_windows(fixed_intervals, dur, day_minutes)
    if not gaps:
        return None

    best_start, best_dist = None, None
    pref = req["preferredStart"]
    for gs, ge in gaps:
        candidate = min(max(pref, gs), ge - dur)
        dist = abs(candidate - pref)
        if best_dist is None or dist < best_dist:
            best_dist, best_start = dist, candidate
    return best_start


def _find_min_train_slot(
    train_intervals: list[tuple[int, int]],
    block_intervals: list[tuple[int, int]],
    req: dict,
    day_minutes: int = DAY_MINUTES,
) -> tuple[int, int]:
    """
    Fallback when no zero-train slot exists in 24 hours.
    Finds a start time with zero block-to-block overlap that minimizes:
      1. Number of overlapping trains
      2. Total overlapping train minutes
      3. Distance from preferredStart
    """
    dur = req["durationMins"]
    pref = req["preferredStart"]
    latest_start = max(0, day_minutes - dur)

    best_start = min(max(0, pref), latest_start)
    best_score = None

    for s in range(latest_start + 1):
        e = s + dur
        # Strictly avoid overlapping any already-scheduled maintenance block on this track
        if any(s < be and e > bs for bs, be in block_intervals):
            continue

        train_count = 0
        overlap_mins = 0
        for ts, te in train_intervals:
            ov = min(e, te) - max(s, ts)
            if ov > 0:
                train_count += 1
                overlap_mins += ov

        score = (train_count, overlap_mins, abs(s - pref))
        if best_score is None or score < best_score:
            best_score = score
            best_start = s

    final_trains = sum(
        1 for ts, te in train_intervals if min(best_start + dur, te) - max(best_start, ts) > 0
    )
    return best_start, final_trains


def solve_segment_corridor(trains_by_line: dict, requests: list[dict]):
    """
    1. Tries exact CP-SAT solve: zero train collision + zero block collision +
       UP/DOWN synchronization on the same segment for maximum asset availability.
    2. If infeasible, falls back per request (by urgency) to:
       a) Zero-train slot on its own track closest to preferredStart.
       b) Minimum-train slot in the 24-hour day if no zero-train slot exists.
    """
    model = cp_model.CpModel()
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

        w = PRIORITY_WEIGHT.get(req["priority"], 10)
        dev = model.NewIntVar(0, DAY_MINUTES, f"dev_{req['id']}")
        model.AddAbsEquality(dev, s_var - req["preferredStart"])
        cost_terms.append(dev * w)

    # Zero train collision & zero block-to-block collision on each track
    for line_type, blk_intervals in intervals_by_line.items():
        trn_intervals = []
        for t in trains_by_line.get(line_type, []):
            ts = max(0, t["startMin"])
            te = min(DAY_MINUTES, t["endMin"])
            if te > ts:
                trn_intervals.append(
                    model.NewIntervalVar(ts, te - ts, te, f"train_{t['trainNumber']}_{ts}")
                )
        model.AddNoOverlap(trn_intervals + blk_intervals)

    # Synchronize UP & DOWN on the same segment to maximize corridor availability
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
        has_both = bool(up_reqs and down_reqs)
        return {
            r["id"]: (solver.Value(starts[r["id"]]), 0, has_both)
            for r in requests
        }

    # Fallback: schedule by urgency (Critical -> High -> Medium -> Low)
    sorted_reqs = sorted(
        requests,
        key=lambda r: (-PRIORITY_WEIGHT.get(r["priority"], 10), r["preferredStart"]),
    )
    scheduled_blocks_by_line: dict[str, list[tuple[int, int]]] = defaultdict(list)
    placements = {}

    for r in sorted_reqs:
        line = r["lineType"]
        dur = r["durationMins"]
        train_ivs = [
            (max(0, t["startMin"]), min(DAY_MINUTES, t["endMin"]))
            for t in trains_by_line.get(line, [])
            if min(DAY_MINUTES, t["endMin"]) > max(0, t["startMin"])
        ]
        block_ivs = scheduled_blocks_by_line[line]

        # Tier A: Zero-train & zero-block window near preferredStart
        slot = _find_zero_train_slot(train_ivs + block_ivs, r)
        if slot is not None:
            scheduled_blocks_by_line[line].append((slot, slot + dur))
            placements[r["id"]] = (slot, 0, False)
        else:
            # Tier B: No zero-train window in 24h -> pick window with fewest trains
            min_slot, train_cnt = _find_min_train_slot(train_ivs, block_ivs, r)
            scheduled_blocks_by_line[line].append((min_slot, min_slot + dur))
            placements[r["id"]] = (min_slot, train_cnt, False)

    return placements


def solve_milp(trains: list[dict], requests: list[dict]) -> list[dict]:
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

        placements = solve_segment_corridor(data["trains"], seg_requests)

        for req in seg_requests:
            s, overlapping_trains, synced = placements[req["id"]]
            e = s + req["durationMins"]
            status = "Scheduled" if s == req["preferredStart"] else "Shifted"

            if overlapping_trains > 0:
                reason = (
                    f"No zero-train window available in 24h; scheduled in minimum-train window "
                    f"({overlapping_trains} train(s) affected)"
                )
            elif status == "Shifted":
                sync_note = " (UP & DOWN synchronized)" if synced else ""
                reason = f"Aligned to zero-train window for maximum asset availability{sync_note}"
            else:
                reason = "UP & DOWN synchronized in preferred zero-train window" if synced else None

            results.append({
                "requestId": req["id"],
                "segmentId": segment_id,
                "lineType": req["lineType"],
                "startMin": s,
                "endMin": e,
                "status": status,
                "reason": reason,
            })

    return results