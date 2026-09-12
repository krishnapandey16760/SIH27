import type { SegmentRow, Bar } from './dashboardData';
import type { TrainMovement, LineType } from './solver';
import { REQUESTS, toSolverRequests } from './maintenanceRequests';
import { solveScheduleRemote, type SolverEngine } from './solverClient';

export interface RealGanttResult {
  rows: SegmentRow[];
  engine: SolverEngine;
}

async function fetchTrainMovements(segmentId: string): Promise<TrainMovement[]> {
  const [from, to] = segmentId.split(/[–-]/); // handles en-dash and hyphen
  try {
    const res = await fetch(
      `/api/timetable?from=${from}&to=${to}&segmentId=${encodeURIComponent(segmentId)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.trainMovements ?? []) as TrainMovement[];
  } catch {
    return []; // CSV not loaded yet / API not reachable — that segment just shows no train bars
  }
}

/**
 * Builds Gantt rows from REAL data: actual train movements (timetable CSV)
 * + actual solver-placed maintenance blocks (Python backend). Only covers
 * segments that currently have a maintenance request — segments with no
 * requests aren't relevant to today's optimization run.
 */
export async function buildRealGanttRows(): Promise<RealGanttResult> {
  const solverRequests = toSolverRequests(REQUESTS);
  const uniqueSegments = Array.from(new Set(solverRequests.map((r) => r.segmentId)));

  const trainsPerSegment = await Promise.all(uniqueSegments.map(fetchTrainMovements));
  const allTrains = trainsPerSegment.flat();

  const { blocks, engine } = await solveScheduleRemote(allTrains, solverRequests, false);

  const rowsMap = new Map<string, SegmentRow>();

  const rowKey = (segmentId: string, lineType: LineType) => `${segmentId}__${lineType}`;

  for (const t of allTrains) {
    const key = rowKey(t.segmentId, t.lineType);
    if (!rowsMap.has(key)) {
      rowsMap.set(key, { id: key, name: t.segmentId, lineType: t.lineType, bars: [] });
    }
    const bar: Bar = {
      id: `train-${t.trainNumber}-${key}`,
      type: 'train',
      label: t.trainNumber,
      startMin: t.startMin,
      endMin: t.endMin,
      tooltip: `${t.trainName} (${t.trainNumber})`,
    };
    rowsMap.get(key)!.bars.push(bar);
  }

  for (const b of blocks) {
    const key = rowKey(b.segmentId, b.lineType as LineType);
    if (!rowsMap.has(key)) {
      rowsMap.set(key, { id: key, name: b.segmentId, lineType: b.lineType as LineType, bars: [] });
    }
    const bar: Bar = {
      id: `block-${b.requestId}`,
      type: b.status === 'Conflict' ? 'conflict' : 'block',
      label: b.requestId,
      startMin: b.startMin,
      endMin: b.endMin,
      tooltip:
        b.status === 'Conflict'
          ? `CONFLICT: ${b.reason}`
          : `${b.requestId} — ${b.status}${b.reason ? ' · ' + b.reason : ''}`,
    };
    rowsMap.get(key)!.bars.push(bar);
  }

  return { rows: Array.from(rowsMap.values()), engine };
}
