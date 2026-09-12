import type { TrainMovement, MaintenanceRequest, ScheduledBlock } from './solver';
import { solveSchedule as localFallbackSolve } from './solver';
import { EDGES } from './networkGraph';

const SOLVER_API_URL = process.env.NEXT_PUBLIC_SOLVER_API_URL || 'http://localhost:8000';

export type SolverEngine = 'python-milp' | 'python-milp-ga' | 'local-fallback';

export interface SolveResult {
  blocks: ScheduledBlock[];
  engine: SolverEngine;
}

/**
 * Calls the real Python (OR-Tools CP-SAT, optionally + DEAP GA) backend.
 * If the backend is unreachable (not started, wrong port, network issue),
 * falls back to the local greedy TS heuristic so the demo never breaks —
 * the returned `engine` field tells the UI which one actually ran, so you
 * can show that honestly instead of pretending.
 */
export async function solveScheduleRemote(
  trains: TrainMovement[],
  requests: MaintenanceRequest[],
  useGA: boolean = false
): Promise<SolveResult> {
  try {
    const res = await fetch(`${SOLVER_API_URL}/api/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trains,
        requests,
        networkEdges: useGA ? EDGES : undefined,
        useGA,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Solver API returned ${res.status}`);
    const blocks: ScheduledBlock[] = await res.json();
    return { blocks, engine: useGA ? 'python-milp-ga' : 'python-milp' };
  } catch (err) {
    console.warn('Python solver unreachable — using local fallback heuristic:', err);
    return { blocks: localFallbackSolve(trains, requests), engine: 'local-fallback' };
  }
}

export async function checkSolverHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${SOLVER_API_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
