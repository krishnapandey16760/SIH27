import type { MaintenanceRequest as SolverMaintenanceRequest } from './solver';

export type Dept = 'Civil' | 'OHE' | 'S&T';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type Status = 'Pending' | 'Scheduled' | 'Active' | 'Completed' | 'Cancelled' | 'Conflict';
export type LineType = 'UP' | 'DOWN' | 'BOTH';

export interface UIMaintenanceRequest {
  id: string;
  requestId: string;
  segment: string; // e.g. 'NDLS–GZB' — matches segmentId used by solver/network graph
  fromStation: string;
  toStation: string;
  lineType: LineType;
  dept: Dept;
  durationMins: number;
  preferredStart: string; // 'HH:MM' — display format used by the table UI
  preferredEnd: string;
  priority: Priority;
  requestedBy: string;
  submittedAt: string;
  status: Status;
  assignedBlock?: string;
  conflictsWith?: string;
}

export const REQUESTS: UIMaintenanceRequest[] = [];

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Converts the UI-shaped request list into the solver's expected input shape. */
export function toSolverRequests(requests: UIMaintenanceRequest[]): SolverMaintenanceRequest[] {
  const result: SolverMaintenanceRequest[] = [];
  for (const r of requests) {
    const start = timeToMinutes(r.preferredStart);
    let end = timeToMinutes(r.preferredEnd);
    if (end <= start) end += 1440;

    const baseId = r.assignedBlock || r.requestId;
    if (r.lineType === 'BOTH') {
      result.push(
        {
          id: `${baseId}-UP`,
          segmentId: r.segment,
          lineType: 'UP',
          dept: r.dept,
          priority: r.priority,
          durationMins: r.durationMins,
          preferredStart: start,
          preferredEnd: end,
        },
        {
          id: `${baseId}-DOWN`,
          segmentId: r.segment,
          lineType: 'DOWN',
          dept: r.dept,
          priority: r.priority,
          durationMins: r.durationMins,
          preferredStart: start,
          preferredEnd: end,
        }
      );
    } else {
      result.push({
        id: baseId,
        segmentId: r.segment,
        lineType: r.lineType as 'UP' | 'DOWN',
        dept: r.dept,
        priority: r.priority,
        durationMins: r.durationMins,
        preferredStart: start,
        preferredEnd: end,
      });
    }
  }
  return result;
}
