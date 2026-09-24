import type { TrainMovement, MaintenanceRequest } from './solver';

/**
 * Baseline schedules for live demo.
 * Tracks included: GZB-ALD, NDLS-AGC, MTJ-CNB, GZB-HPU, SRE-MZN, MZN-MTC.
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
    preferredStart: 410, // 06:50
    preferredEnd: 600,
  },
  {
    id: 'DEMO-Civil-044',
    segmentId: 'NDLS–AGC',
    lineType: 'UP',
    dept: 'Civil',
    priority: 'Critical',
    durationMins: 180,
    preferredStart: 465, // 07:45
    preferredEnd: 645,
  },
  {
    id: 'DEMO-ST-010',
    segmentId: 'MTJ–CNB',
    lineType: 'DOWN',
    dept: 'S&T',
    priority: 'High',
    durationMins: 150,
    preferredStart: 585, // 09:45
    preferredEnd: 735,
  },
  {
    id: 'DEMO-OHE-019',
    segmentId: 'GZB–HPU',
    lineType: 'UP',
    dept: 'OHE',
    priority: 'High',
    durationMins: 120,
    preferredStart: 520, // 08:40
    preferredEnd: 640,
  },
  {
    id: 'DEMO-Civil-051',
    segmentId: 'SRE–MZN',
    lineType: 'UP',
    dept: 'Civil',
    priority: 'Critical',
    durationMins: 140,
    preferredStart: 640, // 10:40
    preferredEnd: 780,
  },
  {
    id: 'DEMO-ST-022',
    segmentId: 'MZN–MTC',
    lineType: 'DOWN',
    dept: 'S&T',
    priority: 'Medium',
    durationMins: 110,
    preferredStart: 720, // 12:00
    preferredEnd: 830,
  },
];