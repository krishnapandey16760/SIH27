"""
GA refinement layer (DEAP).

Why this exists on top of the MILP solver: milp_solver.py optimizes each
segment+line group INDEPENDENTLY (that's what makes it fast and exactly
solvable). But two maintenance blocks on DIFFERENT, network-adjacent
segments running at the same time can compound real-world congestion —
that's a cross-segment effect the per-segment MILP can't see.

This GA takes the MILP's result as a starting seed and searches for
placement adjustments that reduce that cross-segment cascade penalty,
using the network graph's adjacency (segments sharing a station are
considered "adjacent"). This is a genuine extra optimization pass, not
a fake re-randomization — again, no training involved: DEAP evolves a
solution fresh, per request, using the fitness function defined below.
"""

import random
from deap import base, creator, tools, algorithms

if not hasattr(creator, "FitnessMin"):
    creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
    creator.create("Individual", list, fitness=creator.FitnessMin)

DAY_MINUTES = 1440
PRIORITY_WEIGHT = {"Critical": 100, "High": 50, "Medium": 20, "Low": 5}
CASCADE_PENALTY = 200


def _overlaps(a_start, a_end, b_start, b_end):
    return a_start < b_end and a_end > b_start


def _build_adjacent_pairs(network_edges):
    """network_edges: [{segmentId, from, to}, ...] -> set of segmentId pairs sharing a station."""
    by_station: dict[str, list[str]] = {}
    for e in network_edges or []:
        by_station.setdefault(e["from"], []).append(e["segmentId"])
        by_station.setdefault(e["to"], []).append(e["segmentId"])

    pairs = set()
    for segs in by_station.values():
        for i in range(len(segs)):
            for j in range(i + 1, len(segs)):
                pairs.add(tuple(sorted((segs[i], segs[j]))))
    return pairs


def refine_with_ga(
    milp_results: list[dict],
    requests: list[dict],
    network_edges: list[dict] | None = None,
    generations: int = 60,
    pop_size: int = 80,
) -> list[dict]:
    if not requests:
        return milp_results

    n = len(requests)
    adjacent_pairs = _build_adjacent_pairs(network_edges)
    seed_starts = {b["requestId"]: b["startMin"] for b in milp_results}

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

        for i in range(n):
            for j in range(i + 1, n):
                r1, r2 = requests[i], requests[j]
                pair = tuple(sorted((r1["segmentId"], r2["segmentId"])))
                if pair in adjacent_pairs:
                    s1, e1 = individual[i], individual[i] + r1["durationMins"]
                    s2, e2 = individual[j], individual[j] + r2["durationMins"]
                    if _overlaps(s1, e1, s2, e2):
                        total += CASCADE_PENALTY
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

    refined = []
    for i, r in enumerate(requests):
        start = int(best[i])
        end = start + r["durationMins"]
        refined.append(
            {
                "requestId": r["id"],
                "segmentId": r["segmentId"],
                "lineType": r["lineType"],
                "startMin": start,
                "endMin": end,
                "status": "Scheduled" if start == r["preferredStart"] else "Shifted",
                "reason": None
                if start == r["preferredStart"]
                else "Refined by GA to reduce cross-segment network congestion",
            }
        )
    return refined
