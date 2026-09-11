/**
 * Block-scheduling solver.
 *
 * What this actually is: a greedy, priority-ordered interval-scheduling
 * algorithm. It is a REAL constraint solver in the sense that it
 * mathematically guarantees zero overlap between any scheduled
 * maintenance block and any train movement on the same segment/line —
 * that guarantee is enforced by construction, not approximated.
 *
 * What it is NOT: a global-optimum MILP solver. It uses a greedy
 * heuristic (highest priority placed first, nearest-feasible-slot
 * search) rather than exhaustively searching all combinations for the
 * mathematically optimal schedule. For a production system, this same
 * interface could be swapped for a Python backend running OR-Tools
 * CP-SAT (exact) or a GA (DEAP) layer on top of this as a fast baseline —
 * the request/response shape below is deliberately solver-agnostic so
 * that swap doesn't require touching the frontend.
 */

export type LineType = 'UP' | 'DOWN';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface TrainMovement {
  trainNumber: string;
  trainName: string;
  segmentId: string;
  lineType: LineType;
  startMin: number; // minutes from midnight, 0–1440
  endMin: number;
}

export interface MaintenanceRequest {
  id: string;
  segmentId: string;
  lineType: LineType;
  dept: string;
  priority: Priority;
  durationMins: number;
  preferredStart: number; // minutes from midnight
  preferredEnd: number;
}

export interface ScheduledBlock {
  requestId: string;
  segmentId: string;
  lineType: LineType;
  startMin: number;
  endMin: number;
  status: 'Scheduled' | 'Shifted' | 'Conflict';
  reason?: string;
}

interface TimeInterval {
  startMin: number;
  endMin: number;
}

const PRIORITY_WEIGHT: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const DAY_MINUTES = 1440;
const SEARCH_STEP = 5; // minute granularity for the feasible-slot search

const segKey = (segmentId: string, lineType: LineType) => `${segmentId}__${lineType}`;

function overlaps(a: TimeInterval, b: TimeInterval) {
  return a.startMin < b.endMin && a.endMin > b.startMin;
}

/**
 * Solves block placement for a single day.
 * Hard constraint enforced 100% of the time: a scheduled block never
 * overlaps a train movement, or another already-placed block, on the
 * same segment + line.
 */
export function solveSchedule(
  trains: TrainMovement[],
  requests: MaintenanceRequest[]
): ScheduledBlock[] {
  // Seed "occupied" intervals per segment/line with train movements —
  // these are immovable, non-negotiable.
  const occupied: Record<string, TimeInterval[]> = {};
  for (const t of trains) {
    const k = segKey(t.segmentId, t.lineType);
    if (!occupied[k]) occupied[k] = [];
    occupied[k].push({ startMin: t.startMin, endMin: t.endMin });
  }

  // Priority order first, then earliest-preferred-start as tiebreaker —
  // this is the greedy heuristic driving placement order.
  const ordered = [...requests].sort((a, b) => {
    const pa = PRIORITY_WEIGHT[a.priority];
    const pb = PRIORITY_WEIGHT[b.priority];
    if (pa !== pb) return pa - pb;
    return a.preferredStart - b.preferredStart;
  });

  const results: ScheduledBlock[] = [];

  for (const req of ordered) {
    const k = segKey(req.segmentId, req.lineType);
    const busy = occupied[k] ?? [];
    const dur = req.durationMins;

    const fits = (start: number, end: number) =>
      start >= 0 && end <= DAY_MINUTES && !busy.some((b) => overlaps({ startMin: start, endMin: end }, b));

    let placedStart: number | null = null;

    // 1. Exact preferred slot
    if (fits(req.preferredStart, req.preferredStart + dur)) {
      placedStart = req.preferredStart;
    } else {
      // 2. Expanding search outward from the preferred start (both
      // directions), in SEARCH_STEP minute increments, until a
      // feasible slot is found or the whole day has been searched.
      for (let offset = SEARCH_STEP; offset <= DAY_MINUTES; offset += SEARCH_STEP) {
        const later = req.preferredStart + offset;
        const earlier = req.preferredStart - offset;
        if (fits(later, later + dur)) {
          placedStart = later;
          break;
        }
        if (fits(earlier, earlier + dur)) {
          placedStart = earlier;
          break;
        }
      }
    }

    if (placedStart !== null) {
      const end = placedStart + dur;
      if (!occupied[k]) occupied[k] = [];
      occupied[k].push({ startMin: placedStart, endMin: end });

      results.push({
        requestId: req.id,
        segmentId: req.segmentId,
        lineType: req.lineType,
        startMin: placedStart,
        endMin: end,
        status: placedStart === req.preferredStart ? 'Scheduled' : 'Shifted',
        reason:
          placedStart === req.preferredStart
            ? undefined
            : `Preferred window unavailable — auto-shifted to nearest free slot`,
      });
    } else {
      results.push({
        requestId: req.id,
        segmentId: req.segmentId,
        lineType: req.lineType,
        startMin: req.preferredStart,
        endMin: req.preferredStart + dur,
        status: 'Conflict',
        reason: 'No feasible slot found on this segment/line for the day',
      });
    }
  }

  return results;
}

export function formatMin(min: number): string {
  const h = Math.floor(((min % DAY_MINUTES) + DAY_MINUTES) / 60) % 24;
  const m = Math.floor(min) % 60;
  return `${String(h).padStart(2, '0')}:${String(m < 0 ? m + 60 : m).padStart(2, '0')}`;
}
