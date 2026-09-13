"""
GA refinement layer (DEAP).

Why this exists on top of the MILP solver: milp_solver.py optimizes each
segment+line group INDEPENDENTLY (that's what makes it fast and exactly
solvable). But maintenance blocks on DIFFERENT segments can interact in
two opposite ways that the per-segment MILP can't see at all - and this
can happen even when the segments don't touch each other directly, as
long as some train's journey passes through more than one of them:

  1. BAD cascade: if a train genuinely needs one of the linked segments
     around the proposed time (i.e. it's scheduled to be running on it
     then), closing multiple linked segments in an overlapping window
     compounds the disruption for that train's journey.
  2. GOOD alignment: if NONE of the linked segments has a train
     scheduled on it during a given window, closing all of them in
     that SAME window is actually BETTER than staggering them - any
     train whose route uses several of these segments only faces ONE
     combined disruption instead of several separate ones later in its
     journey (this mirrors how real railways bundle related possession
     work into a single "mega-block" during quiet hours).

Two segments are considered "linked" (worth checking for the above) if
EITHER of these is true:
  (a) They are network-adjacent - they share a station (per
      networkGraph.ts's edges, passed in as `network_edges`).
  (b) They are route-linked - at least one train's timetable (i.e. its
      movements across multiple segments, present in the SAME `trains`
      list milp_solver.py already uses) shows it travels on BOTH
      segments, even if they are several hops apart and never share a
      station directly.

Beyond the PAIRWISE check above (which already existed), this version
ALSO looks at each train's FULL route as a single group: if a train's
journey touches 3+ segments that all have maintenance requests, pairwise
bonuses alone don't reliably push the GA toward aligning all of them
together (pairwise overlap doesn't guarantee a single common window
across 3+ intervals - e.g. A overlaps B, B overlaps C, but A and C might
not overlap each other at all). So there is now an EXPLICIT route-group
term: for every train whose route touches N>=2 requested segments, if
all N of their proposed windows share one common time window (i.e.
max(starts) < min(ends) across all of them) and none of those N
segments is actually busy then, the whole group gets an extra reward
scaled by how many segments got bundled together - and an extra penalty,
scaled the same way, if they overlap while one of the segments IS busy.
This directly rewards fitting an entire route into one shared window,
not just any two segments of it.

"Busy" is read directly off each segment's own train movements (the
same start/end times milp_solver.py treats as hard, non-overlappable
intervals) - no separate station-arrival/departure bookkeeping is
needed, since a train's occupancy of a segment already IS the interval
during which it is using (or about to enter/just left) either endpoint
station of that segment.

No training involved: DEAP evolves a solution fresh, per request, using
the fitness function defined below.
"""

import random
from deap import base, creator, tools, algorithms

if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
    creator.create("Individual", list, fitness=creator.FitnessMin)

DAY_MINUTES = 1440
PRIORITY_WEIGHT = {"Critical": 100, "High": 50, "Medium": 20, "Low": 5}

CASCADE_PENALTY = 200     # linked segments overlap WHILE a train needs one of them -> bad
ALIGNMENT_BONUS = 60      # linked segments overlap during a window where all are free -> good
BUSY_BUFFER_MINS = 20     # safety margin around each train's occupancy when judging "free"


def _overlaps(a_start, a_end, b_start, b_end):
    return a_start < b_end and a_end > b_start


def _build_adjacency_links(network_edges):
    """
    network_edges: [{segmentId, from, to}, ...]
    Returns {(segA, segB) sorted tuple -> reason string} for segment
    pairs that share a station.
    """
    by_station: dict[str, list[str]] = {}
    for e in network_edges or []:
        by_station.setdefault(e["from"], []).append(e["segmentId"])
        by_station.setdefault(e["to"], []).append(e["segmentId"])

    links: dict[tuple[str, str], str] = {}
    for station, segs in by_station.items():
        for i in range(len(segs)):
            for j in range(i + 1, len(segs)):
                if segs[i] == segs[j]:
                    continue
                pair = tuple(sorted((segs[i], segs[j])))
                links.setdefault(pair, f"adjacent at {station}")
    return links


def _build_train_routes(trains):
    """
    trains: the same TrainMovement list passed to milp_solver.py - each
    entry has trainNumber + segmentId, so a train that traverses several
    segments simply appears once per segment it's on.

    Returns {trainNumber -> (trainName, ordered-ish list of segmentIds)}.
    Order isn't guaranteed here (trains list isn't necessarily sorted per
    train), that's fine - we only need the SET of segments each train
    touches, not the sequence, for the grouping logic below.
    """
    routes: dict[str, dict] = {}
    for t in trains or []:
        entry = routes.setdefault(t["trainNumber"], {"name": t.get("trainName", t["trainNumber"]), "segments": set()})
        entry["segments"].add(t["segmentId"])
    return routes


def _build_route_links(train_routes):
    """
    Returns {(segA, segB) sorted tuple -> reason string} for segment
    pairs that at least one train's route touches both of, regardless of
    whether those segments are adjacent.
    """
    links: dict[tuple[str, str], str] = {}
    for train_number, info in train_routes.items():
        segs = sorted(info["segments"])
        for i in range(len(segs)):
            for j in range(i + 1, len(segs)):
                pair = (segs[i], segs[j])
                links.setdefault(pair, f"shared route of train {train_number} ({info['name']})")
    return links


def _merge_links(adjacency_links, route_links):
    merged = dict(adjacency_links)
    for pair, reason in route_links.items():
        if pair in merged:
            merged[pair] = merged[pair] + "; also " + reason
        else:
            merged[pair] = reason
    return merged


def _segment_busy_intervals(trains):
    """{segmentId -> [(startMin, endMin), ...]} straight from train movements."""
    intervals: dict[str, list[tuple[int, int]]] = {}
    for t in trains or []:
        intervals.setdefault(t["segmentId"], []).append((t["startMin"], t["endMin"]))
    return intervals


def _segment_busy(intervals_by_segment, segment_id, window_start, window_end, buffer_mins):
    """True if any train occupies `segment_id` within `buffer_mins` of the
    proposed [window_start, window_end] closure window."""
    lo, hi = window_start - buffer_mins, window_end + buffer_mins
    for s, e in intervals_by_segment.get(segment_id, []):
        if s < hi and e > lo:
            return True
    return False


def refine_with_ga(
    milp_results: list[dict],
    requests: list[dict],
    network_edges: list[dict] | None = None,
    trains: list[dict] | None = None,
    generations: int = 60,
    pop_size: int = 80,
) -> list[dict]:
    if not requests:
        return milp_results

    n = len(requests)
    adjacency_links = _build_adjacency_links(network_edges)
    train_routes = _build_train_routes(trains)
    route_links = _build_route_links(train_routes)
    linked_pairs = _merge_links(adjacency_links, route_links)
    seg_busy = _segment_busy_intervals(trains)
    seed_starts = {b["requestId"]: b["startMin"] for b in milp_results}

    # requestId -> index, and segmentId -> [request indices] (usually one,
    # but harmless if several requests share a segment).
    requests_by_segment: dict[str, list[int]] = {}
    for idx, r in enumerate(requests):
        requests_by_segment.setdefault(r["segmentId"], []).append(idx)

    # Route-level groups: for each train, every request index sitting on a
    # segment that train's route touches - only kept when it spans 2+
    # DISTINCT segments (a route sitting entirely on one requested segment
    # isn't a cross-segment case).
    route_groups: list[tuple[list[int], str]] = []
    for train_number, info in train_routes.items():
        segs_with_requests = [seg for seg in info["segments"] if seg in requests_by_segment]
        if len(segs_with_requests) < 2:
            continue
        idxs = sorted({idx for seg in segs_with_requests for idx in requests_by_segment[seg]})
        if len(idxs) >= 2:
            route_groups.append((idxs, f"route of train {train_number} ({info['name']})"))

    def random_start(idx: int) -> int:
        dur = requests[idx]["durationMins"]
        return random.randint(0, max(0, DAY_MINUTES - dur))

    def make_individual():
        if random.random() < 0.4:
            return creator.Individual(
                [seed_starts.get(r["id"], r["preferredStart"]) for r in requests]
            )
        return creator.Individual([random_start(i) for i in range(n)])

    def fitness(individual):
        total = 0.0
        for i, r in enumerate(requests):
            dev = abs(individual[i] - r["preferredStart"])
            total += dev * PRIORITY_WEIGHT.get(r["priority"], 10)

        # --- pairwise term: any two linked segments overlapping ---
        for i in range(n):
            for j in range(i + 1, n):
                r1, r2 = requests[i], requests[j]
                if r1["segmentId"] == r2["segmentId"]:
                    continue  # same segment already fully handled by MILP's hard constraint
                pair = tuple(sorted((r1["segmentId"], r2["segmentId"])))
                if pair not in linked_pairs:
                    continue

                s1, e1 = individual[i], individual[i] + r1["durationMins"]
                s2, e2 = individual[j], individual[j] + r2["durationMins"]
                if not _overlaps(s1, e1, s2, e2):
                    continue

                window_start, window_end = min(s1, s2), max(e1, e2)
                busy = _segment_busy(
                    seg_busy, r1["segmentId"], window_start, window_end, BUSY_BUFFER_MINS
                ) or _segment_busy(
                    seg_busy, r2["segmentId"], window_start, window_end, BUSY_BUFFER_MINS
                )
                if busy:
                    total += CASCADE_PENALTY
                else:
                    total -= ALIGNMENT_BONUS

        # --- route-group term: reward/penalize fitting a WHOLE route into
        # one shared window, not just any one pair of it ---
        for idxs, _reason in route_groups:
            starts = [individual[i] for i in idxs]
            ends = [individual[i] + requests[i]["durationMins"] for i in idxs]
            common_start, common_end = max(starts), min(ends)
            if common_start >= common_end:
                continue  # these requests don't all share one common window

            full_start, full_end = min(starts), max(ends)
            group_segments = {requests[i]["segmentId"] for i in idxs}
            busy = any(
                _segment_busy(seg_busy, seg, full_start, full_end, BUSY_BUFFER_MINS)
                for seg in group_segments
            )
            scale = len(group_segments) - 1  # bigger bundled routes -> bigger stake
            if busy:
                total += CASCADE_PENALTY * scale
            else:
                total -= ALIGNMENT_BONUS * scale
        return (total,)

    def mutate(individual):
        for i in range(n):
            if random.random() < 0.2:
                dur = requests[i]["durationMins"]
                shift = random.randint(-30, 30)
                individual[i] = max(0, min(DAY_MINUTES - dur, individual[i] + shift))
        return (individual,)

    toolbox = base.Toolbox()
    toolbox.register("individual", make_individual)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)
    toolbox.register("evaluate", fitness)
    toolbox.register("mate", tools.cxTwoPoint)
    toolbox.register("mutate", mutate)
    toolbox.register("select", tools.selTournament, tournsize=3)

    pop = toolbox.population(n=pop_size)
    for ind in pop:
        ind.fitness.values = toolbox.evaluate(ind)

    algorithms.eaSimple(pop, toolbox, cxpb=0.6, mutpb=0.3, ngen=generations, verbose=False)
    best = tools.selBest(pop, 1)[0]

    # Work out, per request, a human-readable reason - prefer a full
    # route-group alignment explanation over a plain pairwise one when
    # both apply, since it's the more complete story.
    aligned_with: dict[str, str] = {}

    for idxs, reason in route_groups:
        starts = [best[i] for i in idxs]
        ends = [best[i] + requests[i]["durationMins"] for i in idxs]
        common_start, common_end = max(starts), min(ends)
        if common_start >= common_end:
            continue
        full_start, full_end = min(starts), max(ends)
        group_segments = {requests[i]["segmentId"] for i in idxs}
        busy = any(
            _segment_busy(seg_busy, seg, full_start, full_end, BUSY_BUFFER_MINS)
            for seg in group_segments
        )
        if not busy:
            for i in idxs:
                aligned_with[requests[i]["id"]] = f"bundled into the {reason}"

    for i in range(n):
        for j in range(i + 1, n):
            r1, r2 = requests[i], requests[j]
            if r1["segmentId"] == r2["segmentId"]:
                continue
            pair = tuple(sorted((r1["segmentId"], r2["segmentId"])))
            reason = linked_pairs.get(pair)
            if reason is None:
                continue
            s1, e1 = best[i], best[i] + r1["durationMins"]
            s2, e2 = best[j], best[j] + r2["durationMins"]
            if not _overlaps(s1, e1, s2, e2):
                continue
            window_start, window_end = min(s1, s2), max(e1, e2)
            busy = _segment_busy(
                seg_busy, r1["segmentId"], window_start, window_end, BUSY_BUFFER_MINS
            ) or _segment_busy(
                seg_busy, r2["segmentId"], window_start, window_end, BUSY_BUFFER_MINS
            )
            if not busy:
                aligned_with.setdefault(r1["id"], f"aligned via {reason}")
                aligned_with.setdefault(r2["id"], f"aligned via {reason}")

    refined = []
    for i, r in enumerate(requests):
        start = int(best[i])
        end = start + r["durationMins"]
        if start == r["preferredStart"]:
            status, reason = "Scheduled", None
        elif r["id"] in aligned_with:
            status = "Shifted"
            reason = (
                f"{aligned_with[r['id']]} during a free window, to reduce total "
                "disruptions for shared traffic"
            )
        else:
            status = "Shifted"
            reason = "Refined by GA to reduce cross-segment network congestion"
        refined.append(
            {
                "requestId": r["id"],
                "segmentId": r["segmentId"],
                "lineType": r["lineType"],
                "startMin": start,
                "endMin": end,
                "status": status,
                "reason": reason,
            }
        )
    return refined
