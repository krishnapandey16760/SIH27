import type { SegmentRow, Bar } from './dashboardData';
import type { TrainMovement, LineType, MaintenanceRequest } from './solver';
import { toSolverRequests } from './maintenanceRequests';
import { loadActiveRequests } from './maintenanceRequestsStore';
import { BASE_TRAINS, BASE_REQUESTS } from './liveTrainData';
import { solveScheduleRemote, type SolverEngine } from './solverClient';

export interface RealGanttResult {
  rows: SegmentRow[];
  engine: SolverEngine;
}

const TWO_HOURS_MIN = 120; // 2 hours window

async function fetchTrainMovements(segmentId: string): Promise<TrainMovement[]> {
  const [from, to] = segmentId.split(/[–-]/);
  try {
    const res = await fetch(
      `/api/timetable?from=${from}&to=${to}&segmentId=${encodeURIComponent(segmentId)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.trainMovements ?? []) as TrainMovement[];
  } catch {
    return [];
  }
}

function applyDelays(trains: TrainMovement[], delays: Record<string, number>): TrainMovement[] {
  return trains.map((t) => {
    const d = delays[t.trainNumber] || 0;
    return d === 0 ? t : { ...t, startMin: t.startMin + d, endMin: t.endMin + d };
  });
}

/**
 * Builds Gantt rows strictly contextual to active maintenance blocks:
 * 1. If 0 active blocks exist, returns empty rows (idle track operating normally).
 * 2. If blocks exist, only shows trains on the affected segments within +/- 2 hours
 *    of the maintenance window.
 */
export async function buildRealGanttRows(
  trainDelays: Record<string, number> = {},
  userRequests?: any[]
): Promise<RealGanttResult> {
  // 1. Get active requests (exclude COMPLETED)
  let activeStoreRequests: any[] = [];
  if (userRequests && Array.isArray(userRequests)) {
    activeStoreRequests = userRequests.filter(
      (r) => r.status?.toUpperCase() !== 'COMPLETED'
    );
  } else {
    activeStoreRequests = loadActiveRequests();
  }

  // 2. Agar koi active request nahi hai toh clean empty return karein
  if (activeStoreRequests.length === 0) {
    return { rows: [], engine: 'local-fallback' };
  }

  const csvRequests = toSolverRequests(activeStoreRequests);
  const allRequests: MaintenanceRequest[] =
    userRequests !== undefined ? csvRequests : [...csvRequests, ...BASE_REQUESTS];

  const uniqueSegments = Array.from(new Set(csvRequests.map((r) => r.segmentId)));
  const csvTrainsPerSegment = await Promise.all(uniqueSegments.map(fetchTrainMovements));
  const csvTrains = csvTrainsPerSegment.flat();

  const allTrainsRaw = [...csvTrains, ...BASE_TRAINS];
  const allTrains = applyDelays(allTrainsRaw, trainDelays);

  // 3. Solve for block placement
  const { blocks, engine } = await solveScheduleRemote(allTrains, allRequests, false);

  const rowsMap = new Map<string, SegmentRow>();
  const rowKey = (segmentId: string, lineType: LineType) => `${segmentId}__${lineType}`;

  // 4. Maintenance blocks ko map me add karein aur unke time bounds record karein
  // Structure: segmentKey -> array of { start: number, end: number }
  const maintenanceWindows = new Map<string, Array<{ start: number; end: number }>>();

  for (const b of blocks) {
    const key = rowKey(b.segmentId, b.lineType as LineType);
    if (!rowsMap.has(key)) {
      rowsMap.set(key, { id: key, name: b.segmentId, lineType: b.lineType as LineType, bars: [] });
    }

    if (!maintenanceWindows.has(key)) {
      maintenanceWindows.set(key, []);
    }
    // +/- 2 hours bounds (120 minutes)
    maintenanceWindows.get(key)!.push({
      start: Math.max(0, b.startMin - TWO_HOURS_MIN),
      end: Math.min(1440, b.endMin + TWO_HOURS_MIN),
    });

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

  // 5. Sirf wahi trains add karein jo maintenance wale segment par +/- 2 hours me fall karti hon
  for (const t of allTrains) {
    const key = rowKey(t.segmentId, t.lineType);
    const windows = maintenanceWindows.get(key);

    // Agar is segment par koi maintenance block nahi hai, toh train render nahi hogi
    if (!windows || windows.length === 0) continue;

    // Check karein kya train ka time window block ke +/- 2 hours me overlap karta hai
    const isWithin2Hours = windows.some(
      (win) => t.endMin >= win.start && t.startMin <= win.end
    );

    if (!isWithin2Hours) continue;

    const delayed = (trainDelays[t.trainNumber] || 0) > 0;
    const bar: Bar = {
      id: `train-${t.trainNumber}-${key}`,
      type: 'train',
      label: t.trainNumber,
      startMin: t.startMin,
      endMin: t.endMin,
      tooltip: `${t.trainName} (${t.trainNumber})${
        delayed ? ` — delayed +${trainDelays[t.trainNumber]} min` : ''
      }`,
    };
    rowsMap.get(key)!.bars.push(bar);
  }

  return { rows: Array.from(rowsMap.values()), engine };
}