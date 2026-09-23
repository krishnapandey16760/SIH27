"""
GA refinement layer (DEAP).

Enhanced with:
1. STRICT SAME-SEGMENT UP/DOWN CORRIDOR SYNCHRONIZATION
2. COMMON STATION / JUNCTION CONSOLIDATION (Minimum Time Span)
- Forces identical start times for UP and DOWN blocks on the same segment.
- Bundles 2 or more requests sharing a junction station into the minimum possible window.
- Synchronizes GA mutations across linked corridors to maintain asset availability.
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
SAME_SEGMENT_DESYNC_PENALTY = 400.0  # Dominant penalty if UP and DOWN tracks on same segment diverge
HUB_STATION_DESYNC_PENALTY = 350.0   # Dominant penalty if requests sharing a common station diverge in time


def _overlaps(a_start, a_end, b_start, b_end):
    return a_start < b_end and a_end > b_start


def _build_adjacency_links(network_edges):
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
    routes: dict[str, dict] = {}
    for t in trains or []:
        entry = routes.setdefault(t["trainNumber"], {"name": t.get("trainName", t["trainNumber"]), "segments": set()})
        entry["segments"].add(t["segmentId"])
    return routes


def _build_route_links(train_routes):
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
    intervals: dict[str, list[tuple[int, int]]] = {}
    for t in trains or []:
        intervals.setdefault(t["segmentId"], []).append((t["startMin"], t["endMin"]))
    return intervals


def _segment_busy(intervals_by_segment, segment_id, window_start, window_end, buffer_mins):
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

    requests_by_segment: dict[str, list[int]] = {}
    for idx, r in enumerate(requests):
        requests_by_segment.setdefault(r["segmentId"], []).append(idx)

    # Common Junction Grouping
    seg_to_stations: dict[str, set[str]] = {}
    for e in network_edges or []:
        seg_to_stations.setdefault(e["segmentId"], set()).update([e["from"], e["to"]])

    station_to_request_idxs: dict[str, list[int]] = {}
    for idx, r in enumerate(requests):
        stations = seg_to_stations.get(r["segmentId"], set())
        if not stations:
            stations = set(r["segmentId"].replace("–", "-").split("-"))
        for stn in stations:
            station_to_request_idxs.setdefault(stn, []).append(idx)

    hub_groups = [
        (stn, sorted(set(idxs)))
        for stn, idxs in station_to_request_idxs.items()
        if len(set(idxs)) >= 2
    ]

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
        if random.random() < 0.6:
            ind = [seed_starts.get(r["id"], r["preferredStart"]) for r in requests]
        else:
            ind = [random_start(i) for i in range(n)]

        # Initial alignment for same segment and hub groups
        for i in range(n):
            for j in range(i + 1, n):
                if requests[i]["segmentId"] == requests[j]["segmentId"]:
                    ind[j] = ind[i]
        for _, idxs in hub_groups:
            first_val = ind[idxs[0]]
            for j in idxs[1:]:
                ind[j] = first_val
        return creator.Individual(ind)

    def fitness(individual):
        total = 0.0

        # Base deviation cost from preferred window
        for i, r in enumerate(requests):
            dev = abs(individual[i] - r["preferredStart"])
            total += dev * PRIORITY_WEIGHT.get(r["priority"], 10)

        # 1. STRICT SAME-SEGMENT UP/DOWN ALIGNMENT PENALTY
        for i in range(n):
            for j in range(i + 1, n):
                r1, r2 = requests[i], requests[j]
                if r1["segmentId"] == r2["segmentId"] and r1["lineType"] != r2["lineType"]:
                    time_diff = abs(individual[i] - individual[j])
                    if time_diff > 0:
                        total += time_diff * SAME_SEGMENT_DESYNC_PENALTY

        # 2. COMMON STATION / JUNCTION MINIMUM-TIME CONSOLIDATION
        for stn, idxs in hub_groups:
            starts = [individual[i] for i in idxs]
            span = max(starts) - min(starts)
            if span > 0:
                total += span * HUB_STATION_DESYNC_PENALTY

        # 3. Pairwise cross-segment conflict / alignment
        for i in range(n):
            for j in range(i + 1, n):
                r1, r2 = requests[i], requests[j]
                if r1["segmentId"] == r2["segmentId"]:
                    continue
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

        # 4. Route-group term
        for idxs, _reason in route_groups:
            starts = [individual[i] for i in idxs]
            ends = [individual[i] + requests[i]["durationMins"] for i in idxs]
            common_start, common_end = max(starts), min(ends)
            if common_start >= common_end:
                continue

            full_start, full_end = min(starts), max(ends)
            group_segments = {requests[i]["segmentId"] for i in idxs}
            busy = any(
                _segment_busy(seg_busy, seg, full_start, full_end, BUSY_BUFFER_MINS)
                for seg in group_segments
            )
            scale = len(group_segments) - 1
            if busy:
                total += CASCADE_PENALTY * scale
            else:
                total -= ALIGNMENT_BONUS * scale

        return (total,)

    def mutate(individual):
        for i in range(n):
            if random.random() < 0.25:
                dur = requests[i]["durationMins"]
                shift = random.randint(-30, 30)
                new_start = max(0, min(DAY_MINUTES - dur, individual[i] + shift))
                individual[i] = new_start

                # Keep same-segment blocks in lockstep
                for j in range(n):
                    if j != i and requests[j]["segmentId"] == requests[i]["segmentId"]:
                        j_dur = requests[j]["durationMins"]
                        individual[j] = max(0, min(DAY_MINUTES - j_dur, new_start))

                # Keep common junction blocks in lockstep
                for stn, idxs in hub_groups:
                    if i in idxs:
                        for j in idxs:
                            j_dur = requests[j]["durationMins"]
                            individual[j] = max(0, min(DAY_MINUTES - j_dur, new_start))
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

    # Re-enforce exact match for same physical segments and common junction hubs
    for i in range(n):
        for j in range(i + 1, n):
            if requests[i]["segmentId"] == requests[j]["segmentId"]:
                best[j] = best[i]
    for _, idxs in hub_groups:
        hub_min_start = min(best[k] for k in idxs)
        for k in idxs:
            best[k] = hub_min_start

    aligned_with: dict[str, str] = {}

    # Check same segment corridor bundle
    for i in range(n):
        for j in range(i + 1, n):
            if requests[i]["segmentId"] == requests[j]["segmentId"] and requests[i]["lineType"] != requests[j]["lineType"]:
                aligned_with[requests[i]["id"]] = "Corridor bundle: UP & DOWN tracks synchronized"
                aligned_with[requests[j]["id"]] = "Corridor bundle: UP & DOWN tracks synchronized"

    # Check common junction consolidation
    for stn, idxs in hub_groups:
        for k in idxs:
            if requests[k]["id"] not in aligned_with:
                aligned_with[requests[k]["id"]] = f"Consolidated Mega-Block around junction {stn}"

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
                if requests[i]["id"] not in aligned_with:
                    aligned_with[requests[i]["id"]] = f"bundled into the {reason}"

    refined = []
    for i, r in enumerate(requests):
        start = int(best[i])
        end = start + r["durationMins"]
        if start == r["preferredStart"]:
            status = "Scheduled"
            reason = aligned_with.get(r["id"], None)
        elif r["id"] in aligned_with:
            status = "Shifted"
            reason = f"{aligned_with[r['id']]} during a shared low-traffic window"
        else:
            status = "Shifted"
            reason = "Refined by GA to minimize cross-segment network congestion"
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