import type { TrainMovement } from './solver';
import { REQUESTS, toSolverRequests } from './maintenanceRequests';
import { EDGES } from './networkGraph';
import { solveScheduleRemote, type SolveResult } from './solverClient';

/**
 * Connects: maintenance requests + train movement (timetable) + network
 * graph -> real Python solver. This is what "Run Optimization" and the
 * Optimization Panel should call instead of generating fake numbers.
 */
export async function runFullOptimization(useGA: boolean = false): Promise<SolveResult> {
  const solverRequests = toSolverRequests(REQUESTS);

  // Pull real train movements for each segment this batch of requests touches,
  // from the timetable API built earlier (/api/timetable).
  const uniqueSegments = Array.from(new Set(solverRequests.map((r) => r.segmentId)));

  const trainMovementLists = await Promise.all(
    uniqueSegments.map(async (segmentId) => {
      const [from, to] = segmentId.split(/[–-]/); // handles both '–' (en dash) and '-' (hyphen)
      try {
        const res = await fetch(
          `/api/timetable?from=${from}&to=${to}&segmentId=${encodeURIComponent(segmentId)}`
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.trainMovements ?? []) as TrainMovement[];
      } catch {
        return []; // if the CSV isn't loaded yet, that segment just has no train constraints
      }
    })
  );

  const trains: TrainMovement[] = trainMovementLists.flat();

  return solveScheduleRemote(trains, solverRequests, useGA);
}
