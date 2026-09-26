import type { MaintenanceRequest as SolverMaintenanceRequest } from './solver';

// Backend integration (future): GET /api/maintenance-requests?zone=NR
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

export const REQUESTS: UIMaintenanceRequest[] = [
  {
    id: 'req-001',
    requestId: 'MR-2026-0841',
    segment: 'NDLS–GZB',
    fromStation: 'NDLS',
    toStation: 'GZB',
    lineType: 'UP',
    dept: 'Civil',
    durationMins: 180,
    preferredStart: '01:00',
    preferredEnd: '04:00',
    priority: 'High',
    requestedBy: 'A.K. Sharma',
    submittedAt: '04 Sep 2026',
    status: 'Scheduled',
    assignedBlock: 'Civil-041',
  },
  {
    id: 'req-002',
    requestId: 'MR-2026-0842',
    segment: 'NDLS–GZB',
    fromStation: 'NDLS',
    toStation: 'GZB',
    lineType: 'DOWN',
    dept: 'OHE',
    durationMins: 150,
    preferredStart: '02:00',
    preferredEnd: '04:30',
    priority: 'Critical',
    requestedBy: 'P. Verma',
    submittedAt: '04 Sep 2026',
    status: 'Active',
    assignedBlock: 'OHE-017',
  },
  {
    id: 'req-003',
    requestId: 'MR-2026-0843',
    segment: 'GZB–ALD',
    fromStation: 'GZB',
    toStation: 'ALD',
    lineType: 'UP',
    dept: 'Civil',
    durationMins: 210,
    preferredStart: '03:00',
    preferredEnd: '06:30',
    priority: 'High',
    requestedBy: 'R. Singh',
    submittedAt: '04 Sep 2026',
    status: 'Conflict',
    assignedBlock: 'Civil-042',
    conflictsWith: 'Train 12559',
  },
  {
    id: 'req-004',
    requestId: 'MR-2026-0844',
    segment: 'GZB–ALD',
    fromStation: 'GZB',
    toStation: 'ALD',
    lineType: 'DOWN',
    dept: 'S&T',
    durationMins: 120,
    preferredStart: '12:00',
    preferredEnd: '14:00',
    priority: 'Medium',
    requestedBy: 'S. Gupta',
    submittedAt: '04 Sep 2026',
    status: 'Scheduled',
    assignedBlock: 'ST-008',
  },
  {
    id: 'req-005',
    requestId: 'MR-2026-0845',
    segment: 'GZB–HPU',
    fromStation: 'GZB',
    toStation: 'HPU',
    lineType: 'UP',
    dept: 'OHE',
    durationMins: 120,
    preferredStart: '08:40',
    preferredEnd: '10:40',
    priority: 'Critical',
    requestedBy: 'M. Tiwari',
    submittedAt: '24 Sep 2026',
    status: 'Active',
    assignedBlock: 'OHE-019',
  },
  {
    id: 'req-006',
    requestId: 'MR-2026-0846',
    segment: 'SRE–MZN',
    fromStation: 'SRE',
    toStation: 'MZN',
    lineType: 'UP',
    dept: 'Civil',
    durationMins: 60,
    preferredStart: '14:00',
    preferredEnd: '15:00',
    priority: 'Critical',
    requestedBy: 'Abhijeet',
    submittedAt: '24 Sep 2026',
    status: 'Scheduled',
    assignedBlock: 'Civil-051',
  },
  {
    id: 'req-007',
    requestId: 'MR-2026-0847',
    segment: 'MZN–MTC',
    fromStation: 'MZN',
    toStation: 'MTC',
    lineType: 'DOWN',
    dept: 'S&T',
    durationMins: 60,
    preferredStart: '15:00',
    preferredEnd: '16:00',
    priority: 'Medium',
    requestedBy: 'Vinayak',
    submittedAt: '24 Sep 2026',
    status: 'Active',
    assignedBlock: 'ST-022',
  },
];

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Converts the UI-shaped request list into the solver's expected input shape. */
export function toSolverRequests(requests: UIMaintenanceRequest[]): SolverMaintenanceRequest[] {
  return requests
    .filter((r) => r.lineType !== 'BOTH') // solver works per UP/DOWN line; split 'BOTH' upstream if needed
    .map((r) => ({
      id: r.assignedBlock || r.requestId,
      segmentId: r.segment,
      lineType: r.lineType as 'UP' | 'DOWN',
      dept: r.dept,
      priority: r.priority,
      durationMins: r.durationMins,
      preferredStart: timeToMinutes(r.preferredStart),
      preferredEnd: timeToMinutes(r.preferredEnd),
    }));
}