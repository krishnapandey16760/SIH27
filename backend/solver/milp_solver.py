"""
Real constraint solver using Google OR-Tools CP-SAT.

WHAT THIS SOLVER DOES, IN LAYERS:

1. HARD CONSTRAINT (unchanged): within each (segmentId, lineType) group,
   CP-SAT's native interval-scheduling constraint (NewIntervalVar +
   AddNoOverlap) guarantees zero overlap between any train movement and
   any maintenance block, by construction.

2. SMARTER OBJECTIVE: the solver doesn't just try to stay as close as
   possible to each request's preferredStart. It ALSO samples a
   precomputed traffic-density curve for the segment (how much train
   activity is happening around a given minute of the day) and prefers
   genuinely quiet windows - weighted by priority, so a Critical block
   gets pushed toward real safety margin more strongly than a Low one
   does. Both objectives (deviation-from-preferred, traffic-density) are
   combined in one weighted sum.

3. CONFLICT RESOLUTION, tried in this order, per un-placeable request:
   a. DROP/DEFER by priority - repeatedly drop the LOWEST-priority
      remaining request in the group and retry, until a feasible "core"
      schedule exists for the rest.
   b. RESCUE as a single slot - try to fit each dropped request back in
      on its own, searching the FULL day (not just near preferredStart)
      against the now-fixed core schedule.
   c. DURATION SPLIT - if it won't fit as one contiguous slot, try to
      split its duration across up to 3 smaller windows elsewhere in the
      day (each piece kept above a sane minimum length, closest-to-
      preferred gaps used first). Real possession work can often be done
      in more than one sitting, so this is tried before giving up.
   d. GENUINE CONFLICT - if even a split doesn't fully cover the required
      duration anywhere in the day, the request is marked Conflict and
      handed admin-facing resolution data: the best (even if partial)
      free windows found, which already-scheduled LOWER-priority
      requests are sitting near its preferred time (candidates to bump),
      and a flag recommending the admin defer it to another day instead
      - since this solver only models a single day's timetable and has
      no visibility into other days' train traffic.

No training required - this solves each day's instance fresh from the
input data.

KNOWN LIMITATIONS (stated honestly, not hidden):
- "Defer to another day" is a RECOMMENDATION only - this solver has no
  multi-day train data, so it can't actually pick or verify a specific
  alternate day.
- The isolation loop calls CP-SAT once per dropped request, so a group
  with many simultaneous conflicts is slower to solve; per-attempt time
  budget is capped lower during isolation to bound worst-case runtime.
- The "admin resolution" / "Split" data is only useful once a frontend
  UI actually surfaces it and lets an admin act on it - that UI does not
  exist yet in RequestsPageClient/RequestDetailDrawer.
"""

from collections import defaultdict
from ortools.sat.python import cp_model

PRIORITY_WEIGHT = {"Critical": 100, "High": 50, "Medium": 20, "Low": 5}
# How strongly each priority avoids traffic-dense times, independent of
# how strongly it resists moving away from its preferred time. Critical
# blocks get a real safety margin; Low ones can sit closer to traffic.
TRAFFIC_WEIGHT = {"Critical": 6, "High": 4, "Medium": 2, "Low": 1}
DAY_MINUTES = 1440
ISOLATION_TIME_LIMIT = 2.0   # per-attempt budget while searching for a feasible core
FULL_SOLVE_TIME_LIMIT = 5.0  # budget for the first, everyone-included attempt
MIN_SPLIT_PART_MINS = 30     # don't offer a split piece shorter than this
MAX_SPLIT_PARTS = 3


def _traffic_density_curve(trains_data, day_minutes=DAY_MINUTES, smoothing_mins=45):
    """
    density[m] = how many trains are running at-or-near minute m (within
    `smoothing_mins` on either side). Used so the solver can tell "this
    time of day is genuinely quiet" apart from "this time of day happens
    to be far from what was requested".
    """
    density = [0] * day_minutes
    for t in trains_data:
        s = max(0, t["startMin"] - smoothing_mins)
        e = min(day_minutes, t["endMin"] + smoothing_mins)
        for m in range(s, e):
            density[m] += 1
    return density


def _solve_group(trains_data, requests, density, time_limit=FULL_SOLVE_TIME_LIMIT, day_minutes=DAY_MINUTES):
    """
    Solve one (segmentId, lineType) group for exactly the given
    `requests` (a SUBSET of the group's full request list, in general -
    that's what makes conflict isolation possible). Returns
    (status, {requestId: startMin}).
    """
    model = cp_model.CpModel()

    train_intervals = []
    for t in trains_data:
        dur = max(1, t["endMin"] - t["startMin"])
        iv = model.NewIntervalVar(t["startMin"], dur, t["endMin"], f"train_{t['trainNumber']}")
        train_intervals.append(iv)

    block_intervals = []
    starts: dict[str, cp_model.IntVar] = {}
    cost_terms = []
    max_density = max(density) if density else 0

    for req in requests:
        dur = req["durationMins"]
        latest_start = max(0, day_minutes - dur)
        start_var = model.NewIntVar(0, latest_start, f"start_{req['id']}")
        end_var = model.NewIntVar(dur, day_minutes, f"end_{req['id']}")
        interval = model.NewIntervalVar(start_var, dur, end_var, f"block_{req['id']}")
        starts[req["id"]] = start_var
        block_intervals.append(interval)

        weight = PRIORITY_WEIGHT.get(req["priority"], 10)
        deviation = model.NewIntVar(0, day_minutes, f"dev_{req['id']}")
        model.AddAbsEquality(deviation, start_var - req["preferredStart"])
        cost_terms.append(deviation * weight)

        # Sample the traffic-density curve at the block's midpoint, so the
        # solver is rewarded for finding a genuinely quiet time - not just
        # penalized for drifting from preferredStart.
        mid = model.NewIntVar(0, day_minutes - 1, f"mid_{req['id']}")
        model.Add(mid == start_var + dur // 2)
        traffic_at_mid = model.NewIntVar(0, max_density, f"traffic_{req['id']}")
        model.AddElement(mid, density, traffic_at_mid)
        cost_terms.append(traffic_at_mid * TRAFFIC_WEIGHT.get(req["priority"], 1))

    model.AddNoOverlap(train_intervals + block_intervals)
    model.Minimize(sum(cost_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return status, {rid: solver.Value(v) for rid, v in starts.items()}
    return status, {}


def _find_free_windows(fixed_intervals, duration, day_minutes=DAY_MINUTES):
    """Gaps of at least `duration` minutes, given a list of {startMin, endMin}."""
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
    """Best free slot for one request against an already-fixed set of
    intervals, searching the WHOLE day - not just near preferredStart."""
    dur = req["durationMins"]
    gaps = _find_free_windows(fixed_intervals, dur, day_minutes)
    if not gaps:
        return None
    best_start, best_score = None, None
    for gs, ge in gaps:
        candidate = min(max(req["preferredStart"], gs), ge - dur)
        score = abs(candidate - req["preferredStart"])
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
    """
    Try to cover req's full duration using up to `max_parts` separate
    windows elsewhere in the day (closest-to-preferred gaps used first),
    each piece at least `min_part_mins` long. Returns a list of
    {startMin, endMin} pieces summing to the full duration, or None if
    the duration can't be fully covered this way.
    """
    dur = req["durationMins"]
    if dur <= min_part_mins:
        return None  # too short to meaningfully split in the first place

    gaps = _find_free_windows(fixed_intervals, min_part_mins, day_minutes)
    if len(gaps) < 2:
        return None  # need at least 2 usable gaps to call it a "split"

    gaps_sorted = sorted(
        gaps,
        key=lambda g: min(abs(g[0] - req["preferredStart"]), abs(g[1] - req["preferredStart"])),
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
        return None  # couldn't cover the full duration even split up

    pieces.sort(key=lambda p: p["startMin"])
    return pieces


def _build_admin_alternatives(trains_data, resolved_others, starts, req, day_minutes=DAY_MINUTES):
    """
    For a request that genuinely couldn't be placed (not even split),
    build the data an admin would need to make a call:
      - suggestedWindows: best free-ish windows elsewhere in the day
        (against trains + everything already resolved), even if none of
        them alone is long enough.
      - blockingRequestIds: already-scheduled LOWER-priority requests
        sitting near this one's preferred time - candidates the admin
        could choose to bump/move instead.
    """
    dur = req["durationMins"]
    fixed = [{"startMin": t["startMin"], "endMin": t["endMin"]} for t in trains_data]
    for other in resolved_others:
        s = starts[other["id"]]
        fixed.append({"startMin": s, "endMin": s + other["durationMins"]})

    gaps = _find_free_windows(fixed, min(dur, MIN_SPLIT_PART_MINS), day_minutes)
    windows = []
    for gs, ge in gaps:
        piece_len = min(ge - gs, dur)
        candidate = min(max(req["preferredStart"], gs), ge - piece_len)
        windows.append({"startMin": candidate, "endMin": candidate + piece_len})
    windows.sort(key=lambda w: abs(w["startMin"] - req["preferredStart"]))
    windows = windows[:3]

    req_weight = PRIORITY_WEIGHT.get(req["priority"], 10)
    blocking = []
    for other in resolved_others:
        other_weight = PRIORITY_WEIGHT.get(other["priority"], 10)
        s = starts[other["id"]]
        if other_weight < req_weight and abs(s - req["preferredStart"]) <= 180:
            blocking.append(other["id"])

    return windows, blocking


def _solve_with_conflict_isolation(trains_data, requests):
    """
    Returns (starts, split_results, still_conflicted):
      starts:          {requestId: startMin} for requests placed as one block
      split_results:   {requestId: [{startMin, endMin}, ...]} for requests
                       placed across multiple windows
      still_conflicted: [request dict, ...] genuinely un-placeable requests
    """
    density = _traffic_density_curve(trains_data)

    active = list(requests)
    status, starts = _solve_group(trains_data, active, density, time_limit=FULL_SOLVE_TIME_LIMIT)
    removed = []

    while status not in (cp_model.OPTIMAL, cp_model.FEASIBLE) and active:
        active.sort(key=lambda r: PRIORITY_WEIGHT.get(r["priority"], 10))  # least critical first
        removed.append(active.pop(0))
        status, starts = _solve_group(trains_data, active, density, time_limit=ISOLATION_TIME_LIMIT)

    starts = dict(starts or {})

    # Try to place dropped requests, most-critical first, against the now-fixed core.
    removed.sort(key=lambda r: -PRIORITY_WEIGHT.get(r["priority"], 10))
    fixed_intervals = [{"startMin": t["startMin"], "endMin": t["endMin"]} for t in trains_data]
    for req in active:
        s = starts[req["id"]]
        fixed_intervals.append({"startMin": s, "endMin": s + req["durationMins"]})

    split_results: dict[str, list[dict]] = {}
    still_conflicted = []

    for req in removed:
        rescued_start = _find_single_slot(fixed_intervals, req)
        if rescued_start is not None:
            starts[req["id"]] = rescued_start
            fixed_intervals.append({"startMin": rescued_start, "endMin": rescued_start + req["durationMins"]})
            continue

        pieces = _try_duration_split(fixed_intervals, req)
        if pieces is not None:
            split_results[req["id"]] = pieces
            fixed_intervals.extend(pieces)
            continue

        still_conflicted.append(req)

    return starts, split_results, still_conflicted


def solve_milp(trains: list[dict], requests: list[dict]) -> list[dict]:
    """
    trains:   [{trainNumber, trainName, segmentId, lineType, startMin, endMin}, ...]
    requests: [{id, segmentId, lineType, dept, priority, durationMins,
                preferredStart, preferredEnd}, ...]
    returns:  [{requestId, segmentId, lineType, startMin, endMin, status,
                reason, splitWindows, adminResolution}, ...]
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

        group_requests = g["requests"]
        trains_data = g["trains"]
        starts, split_results, still_conflicted = _solve_with_conflict_isolation(trains_data, group_requests)

        for req in group_requests:
            if req["id"] in split_results:
                pieces = split_results[req["id"]]
                results.append(
                    {
                        "requestId": req["id"],
                        "segmentId": segment_id,
                        "lineType": line_type,
                        "startMin": pieces[0]["startMin"],
                        "endMin": pieces[-1]["endMin"],
                        "status": "Split",
                        "reason": f"No single window fit - split into {len(pieces)} parts across the day to avoid overlap",
                        "splitWindows": pieces,
                        "adminResolution": None,
                    }
                )
                continue

            if req["id"] not in starts:
                continue
            s = starts[req["id"]]
            e = s + req["durationMins"]
            reason = None
            if s != req["preferredStart"]:
                reason = "Auto-shifted by MILP solver to a non-overlapping, lower-traffic time"
            results.append(
                {
                    "requestId": req["id"],
                    "segmentId": segment_id,
                    "lineType": line_type,
                    "startMin": s,
                    "endMin": e,
                    "status": "Scheduled" if s == req["preferredStart"] else "Shifted",
                    "reason": reason,
                    "splitWindows": None,
                    "adminResolution": None,
                }
            )

        resolved_others = [r for r in group_requests if r["id"] in starts]
        for req in still_conflicted:
            windows, blocking = _build_admin_alternatives(trains_data, resolved_others, starts, req)
            results.append(
                {
                    "requestId": req["id"],
                    "segmentId": segment_id,
                    "lineType": line_type,
                    "startMin": req["preferredStart"],
                    "endMin": req["preferredStart"] + req["durationMins"],
                    "status": "Conflict",
                    "reason": "No slot - even split across the day - fits on this segment/line",
                    "splitWindows": None,
                    "adminResolution": {
                        "suggestedWindows": windows,
                        "blockingRequestIds": blocking,
                        "recommendDeferToAnotherDay": True,
                    },
                }
            )

    return results
