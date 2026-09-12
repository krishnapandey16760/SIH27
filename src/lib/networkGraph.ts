/**
 * Network graph for the NR zone: stations are nodes, track segments are
 * weighted edges (weight = typical travel time in minutes). This is the
 * missing link between your isolated /network-graph visualization and
 * the actual solver — it lets conflicts detected by solver.ts propagate
 * outward to find downstream impact, and lets you compute reroutes.
 */

export interface StationNode {
  code: string; // e.g. 'NDLS'
  name: string;
}

export interface TrackEdge {
  segmentId: string; // matches segmentId used in solver.ts / liveTrainData.ts, e.g. 'GZB–ALD'
  from: string; // station code
  to: string; // station code
  travelMins: number; // typical travel time, used as edge weight
}

export const STATIONS: StationNode[] = [
  { code: 'NDLS', name: 'New Delhi' },
  { code: 'GZB', name: 'Ghaziabad' },
  { code: 'ALD', name: 'Prayagraj (Allahabad)' },
  { code: 'CNB', name: 'Kanpur Central' },
  { code: 'LKO', name: 'Lucknow' },
  { code: 'AGC', name: 'Agra Cantt' },
  { code: 'MTJ', name: 'Mathura Jn' },
  { code: 'GKP', name: 'Gorakhpur' },
];

export const EDGES: TrackEdge[] = [
  { segmentId: 'NDLS–GZB', from: 'NDLS', to: 'GZB', travelMins: 40 },
  { segmentId: 'GZB–ALD', from: 'GZB', to: 'ALD', travelMins: 210 },
  { segmentId: 'ALD–CNB', from: 'ALD', to: 'CNB', travelMins: 150 },
  { segmentId: 'CNB–LKO', from: 'CNB', to: 'LKO', travelMins: 80 },
  { segmentId: 'NDLS–AGC', from: 'NDLS', to: 'AGC', travelMins: 130 },
  { segmentId: 'AGC–MTJ', from: 'AGC', to: 'MTJ', travelMins: 60 },
  { segmentId: 'MTJ–CNB', from: 'MTJ', to: 'CNB', travelMins: 170 },
  { segmentId: 'LKO–GKP', from: 'LKO', to: 'GKP', travelMins: 180 },
];

// Build an adjacency list once for fast traversal.
type Adjacency = Record<string, { neighbor: string; segmentId: string; travelMins: number }[]>;

function buildAdjacency(edges: TrackEdge[]): Adjacency {
  const adj: Adjacency = {};
  for (const e of edges) {
    if (!adj[e.from]) adj[e.from] = [];
    if (!adj[e.to]) adj[e.to] = [];
    // Track edges are typically bidirectional for graph-traversal purposes
    // (UP/DOWN lines are handled separately by the solver).
    adj[e.from].push({ neighbor: e.to, segmentId: e.segmentId, travelMins: e.travelMins });
    adj[e.to].push({ neighbor: e.from, segmentId: e.segmentId, travelMins: e.travelMins });
  }
  return adj;
}

const ADJACENCY = buildAdjacency(EDGES);

/**
 * Cascade impact detection.
 * Given a segment that currently has a conflict (from solveSchedule),
 * find every other segment within `maxHops` of it in the network graph.
 * This answers: "if this segment is disrupted, what else is at risk?"
 */
export function getDownstreamImpact(segmentId: string, maxHops: number = 2): string[] {
  const edge = EDGES.find((e) => e.segmentId === segmentId);
  if (!edge) return [];

  const visited = new Set<string>([edge.from, edge.to]);
  const impactedSegments = new Set<string>();
  let frontier = [edge.from, edge.to];

  for (let hop = 0; hop < maxHops; hop++) {
    const nextFrontier: string[] = [];
    for (const station of frontier) {
      for (const link of ADJACENCY[station] ?? []) {
        impactedSegments.add(link.segmentId);
        if (!visited.has(link.neighbor)) {
          visited.add(link.neighbor);
          nextFrontier.push(link.neighbor);
        }
      }
    }
    frontier = nextFrontier;
  }

  impactedSegments.delete(segmentId); // don't report the source segment as "impacted"
  return Array.from(impactedSegments);
}

/**
 * Alternate routing (Dijkstra, simple weighted shortest path).
 * Given a blocked set of segments, find the shortest remaining path
 * between two stations, or null if no path exists.
 */
export function findAlternateRoute(
  fromStation: string,
  toStation: string,
  blockedSegmentIds: string[] = []
): { path: string[]; segments: string[]; totalMins: number } | null {
  const blocked = new Set(blockedSegmentIds);
  const dist: Record<string, number> = { [fromStation]: 0 };
  const prev: Record<string, { station: string; segmentId: string } | null> = { [fromStation]: null };
  const visited = new Set<string>();
  const queue = new Set<string>(STATIONS.map((s) => s.code));

  while (queue.size > 0) {
    let current: string | null = null;
    let currentDist = Infinity;
    for (const s of queue) {
      if (dist[s] !== undefined && dist[s] < currentDist) {
        currentDist = dist[s];
        current = s;
      }
    }
    if (current === null) break;
    queue.delete(current);
    visited.add(current);
    if (current === toStation) break;

    for (const link of ADJACENCY[current] ?? []) {
      if (blocked.has(link.segmentId) || visited.has(link.neighbor)) continue;
      const newDist = (dist[current] ?? Infinity) + link.travelMins;
      if (newDist < (dist[link.neighbor] ?? Infinity)) {
        dist[link.neighbor] = newDist;
        prev[link.neighbor] = { station: current, segmentId: link.segmentId };
      }
    }
  }

  if (dist[toStation] === undefined) return null;

  const path: string[] = [];
  const segments: string[] = [];
  let cur: string | null = toStation;
  while (cur !== null) {
    path.unshift(cur);
    const p = prev[cur];
    if (p) segments.unshift(p.segmentId);
    cur = p ? p.station : null;
  }

  return { path, segments, totalMins: dist[toStation] };
}
