import type { TrainMovement, MaintenanceRequest } from './solver';

/**
 * Deliberately realistic baseline: each train's normal window ends only
 * 10–20 minutes before its paired maintenance block starts. Under
 * normal conditions there's no conflict. Adding a delay of ~20-30+ min
 * to the train pushes its interval into the block's window, giving the
 * solver something real to resolve — which is the point of the demo.
 */

export const BASE_TRAINS: TrainMovement[] = [
  {
    trainNumber: '12559',
    trainName: 'Shiv Ganga Express',
    segmentId: 'GZB–ALD',
    lineType: 'UP',
    startMin: 300, // 05:00
    endMin: 390, // 06:30
  },
  {
    trainNumber: '12050',
    trainName: 'Gatimaan Express',
    segmentId: 'NDLS–AGC',
    lineType: 'UP',
    startMin: 360, // 06:00
    endMin: 450, // 07:30
  },
  {
    trainNumber: '12216',
    trainName: 'Garib Rath Express',
    segmentId: 'MTJ–CNB',
    lineType: 'DOWN',
    startMin: 480, // 08:00
    endMin: 570, // 09:30
  },
];

export const BASE_REQUESTS: MaintenanceRequest[] = [
  {
    id: 'DEMO-Civil-042',
    segmentId: 'GZB–ALD',
    lineType: 'UP',
    dept: 'Civil',
    priority: 'High',
    durationMins: 190,
    preferredStart: 410, // 06:50 — 20 min buffer after train 12559
    preferredEnd: 600,
  },
  {
    id: 'DEMO-Civil-044',
    segmentId: 'NDLS–AGC',
    lineType: 'UP',
    dept: 'Civil',
    priority: 'Critical',
    durationMins: 180,
    preferredStart: 465, // 07:45 — 15 min buffer after train 12050
    preferredEnd: 645,
  },
  {
    id: 'DEMO-ST-010',
    segmentId: 'MTJ–CNB',
    lineType: 'DOWN',
    dept: 'S&T',
    priority: 'High',
    durationMins: 150,
    preferredStart: 585, // 09:45 — 15 min buffer after train 12216
    preferredEnd: 735,
  },
];
