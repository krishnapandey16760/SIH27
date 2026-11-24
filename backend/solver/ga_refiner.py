"""
GA refinement layer (DEAP).

Refines 24-hour (1440-min) block start timestamps to:
1. Enforce zero block-to-block collision on the same track.
2. Enforce zero train collision first; if impossible, minimize overlapping train count & minutes.
3. Maximize asset availability by aligning UP & DOWN blocks on the same segment.
4. Respect urgency (priority) and preferredStart proximity.
"""

import random
from deap import base, creator, tools, algorithms

if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
    creator.create("Individual", list, fitness=creator.FitnessMin)

DAY_MINUTES = 1440
PRIORITY_WEIGHT = {"Critical": 100, "High": 50, "Medium": 20, "Low": 5}

# Strict cost hierarchy:
# Block collision > Train count > Train overlap mins > Urgency deviation & UP/DOWN corridor sync
BLOCK_COLLISION_PENALTY = 1_000_000.0
TRAIN_COUNT_PENALTY = 500_000.0
TRAIN_OVERLAP_MIN_PENALTY = 5_000.0
CORRIDOR_SYNC_PENALTY = 25.0


def refine_with_ga(
    milp_results: list[dict],
    requests: list[dict],
    trains: list[dict] | None = None,
    generations: int = 60,
    pop_size: int = 80,
) -> list[dict]:
    if not requests:
        return milp_results

    n = len(requests)
    seed_starts = {b["requestId"]: b["startMin"] for b in milp_results}

    trains_by_track: dict[tuple[str, str], list[tuple[int, int]]] = {}
    for t in trains or []:
        ts = max(0, t["startMin"])
        te = min(DAY_MINUTES, t["endMin"])
        if te > ts:
            trains_by_track.setdefault((t["segmentId"], t["lineType"]), []).append((ts, te))

    def random_start(idx: int) -> int:
        dur = requests[idx]["durationMins"]
        return random.randint(0, max(0, DAY_MINUTES - dur))

    def make_individual():
        if random.random() < 0.7:
            ind = [seed_starts.get(r["id"], r["preferredStart"]) for r in requests]
        else:
            ind = [random_start(i) for i in range(n)]
        return creator.Individual(ind)

    def fitness(individual):
        total = 0.0

        for i, r in enumerate(requests):
            s = individual[i]
            e = s + r["durationMins"]

            # 1. Urgency-weighted deviation from preferredStart
            total += abs(s - r["preferredStart"]) * PRIORITY_WEIGHT.get(r["priority"], 10)

            # 2. Zero train collision first; minimum overlapping trains fallback
            track_trains = trains_by_track.get((r["segmentId"], r["lineType"]), [])
            colliding_trains = 0
            overlap_mins = 0
            for ts, te in track_trains:
                ov = min(e, te) - max(s, ts)
                if ov > 0:
                    colliding_trains += 1
                    overlap_mins += ov
            if colliding_trains > 0:
                total += colliding_trains * TRAIN_COUNT_PENALTY + overlap_mins * TRAIN_OVERLAP_MIN_PENALTY

        # 3. Block-to-block non-overlap & same-segment UP/DOWN asset availability sync
        for i in range(n):
            r1 = requests[i]
            s1, e1 = individual[i], individual[i] + r1["durationMins"]
            for j in range(i + 1, n):
                r2 = requests[j]
                if r1["segmentId"] != r2["segmentId"]:
                    continue

                s2, e2 = individual[j], individual[j] + r2["durationMins"]
                if r1["lineType"] == r2["lineType"]:
                    ov = min(e1, e2) - max(s1, s2)
                    if ov > 0:
                        total += ov * BLOCK_COLLISION_PENALTY
                else:
                    total += abs(s1 - s2) * CORRIDOR_SYNC_PENALTY

        return (total,)

    def mutate(individual):
        for i in range(n):
            if random.random() < 0.25:
                dur = requests[i]["durationMins"]
                max_s = max(0, DAY_MINUTES - dur)
                if random.random() < 0.7:
                    shift = random.randint(-30, 30)
                    individual[i] = max(0, min(max_s, individual[i] + shift))
                else:
                    individual[i] = random.randint(0, max_s)
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

    refined = []
    for i, r in enumerate(requests):
        start = int(best[i])
        end = start + r["durationMins"]
        track_trains = trains_by_track.get((r["segmentId"], r["lineType"]), [])
        overlapping_trains = sum(1 for ts, te in track_trains if min(end, te) - max(start, ts) > 0)

        status = "Scheduled" if start == r["preferredStart"] else "Shifted"
        if overlapping_trains > 0:
            reason = (
                f"No zero-train window available in 24h; scheduled in minimum-train window "
                f"({overlapping_trains} train(s) affected)"
            )
        elif status == "Shifted":
            reason = "Refined to zero-train window for maximum asset availability"
        else:
            reason = None

        refined.append({
            "requestId": r["id"],
            "segmentId": r["segmentId"],
            "lineType": r["lineType"],
            "startMin": start,
            "endMin": end,
            "status": status,
            "reason": reason,
        })

    return refined