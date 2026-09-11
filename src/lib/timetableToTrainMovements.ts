import type { TrainMovement, LineType } from './solver';

/**
 * IMPORTANT: adjust these keys to match YOUR downloaded CSV's actual header
 * names — government/Kaggle exports vary slightly between sources. Run
 * `console.log(Object.keys(parsedRows[0]))` once after loading to check.
 */
const COL = {
  trainNo: 'Train No',
  trainName: 'Train Name',
  seq: 'SEQ',
  stationCode: 'Station Code',
  stationName: 'Station Name',
  arrival: 'Arrival time',
  departure: 'Departure Time',
  distance: 'Distance',
  sourceStation: 'Source Station',
  sourceStationName: 'Source Station Name',
  destinationStation: 'Destination Station',
  destinationStationName: 'Destination Station Name',
};

export interface TimetableRow {
  trainNo: string;
  trainName: string;
  seq: number;
  stationCode: string;
  stationName: string;
  arrivalMin: number | null; // null = train originates here (no arrival)
  departureMin: number | null; // null = train terminates here (no departure)
  distance: number;
  sourceStation: string;
  sourceStationName: string;
  destinationStation: string;
  destinationStationName: string;
}

/** "HH:MM:SS" or "HH:MM" -> minutes from midnight. Returns null for blank/"Source"/"Destination" markers. */
function parseTimeToMinutes(raw: string): number | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  if (clean === '' || clean === 'source' || clean === 'destination' || clean === '00:00:00' && false) {
    // keep 00:00:00 as valid midnight time; only truly blank/text markers are null
  }
  if (clean === '' || clean === 'source' || clean === 'destination') return null;
  const parts = raw.trim().split(':').map(Number);
  if (parts.length < 2 || parts.some((p) => isNaN(p))) return null;
  const [h, m] = parts;
  return h * 60 + m;
}

export const NR_STATIONS = new Set([
  'BRML', 'SXZM', 'HME', 'PTTN', 'MZMA', 'NDAM', 'BDGM', 'SINA',
  'PMPE', 'KAPE', 'RPAP', 'ATPA', 'PJGM', 'BJBA', 'ANT', 'SDUA',
  'QG', 'HRSB', 'BAHL', 'KARI', 'SMBR', 'SGDN', 'SWKE', 'DUGA',
  'BAKK', 'REAI', 'SVDK', 'CRWL', 'MCTM', 'RMJK', 'MNVL', 'SGRR',
  'BLA', 'JAT', 'BBMN', 'VJPJ', 'SMBX', 'GHGL', 'HRNR', 'CKDL',
  'CHNR', 'BDHY', 'KTHU', 'MDPB', 'SJNP', 'PTK', 'PTKC', 'BHRL',
  'DLSR', 'NUPR', 'BLDL', 'JWLS', 'MGRP', 'BRHL', 'GULR', 'TRPL',
  'KPLR', 'KGMR', 'NGRT', 'CMMG', 'PLMX', 'BJPL', 'JDNX', 'SRM',
  'JK', 'PMQ', 'DNN', 'GSP', 'BAT', 'DBNK', 'VKA', 'ATT',
  'ASR', 'BGTN', 'TTO', 'KEMK', 'BEAS', 'JUC', 'JRC', 'HSX',
  'PGW', 'PHR', 'NSS', 'RHU', 'NRO', 'LNK', 'SQR', 'FZR',
  'FZP', 'FDK', 'KKP', 'MKS', 'FKA', 'ABS', 'BTI', 'LDH',
  'KNN', 'SIR', 'NMDA', 'RPAR', 'ANSB', 'NLDM', 'DLPC', 'CDG',
  'KLK', 'SOL', 'SML', 'RPJ', 'PTA', 'DUI', 'SAG', 'JHL',
  'JIND', 'ROK', 'UMB', 'UBC', 'KKDE', 'PNP', 'SNP', 'DLI',
  'NDLS', 'NZM', 'DEC', 'GGN', 'GHH', 'RE', 'GZB', 'MTC',
  'MUT', 'MZN', 'DBD', 'TPZ', 'SRE', 'YJUD', 'HPU', 'GMS',
  'GJL', 'RK', 'LRJ', 'HW', 'RWL', 'DDN', 'YNRK', 'NBD',
  'KTW', 'NGG', 'DPR', 'SEO', 'KNT', 'MB', 'KGB', 'RJK',
  'CH', 'RMU', 'BE', 'BRYC', 'PMR', 'TLH', 'SPN', 'ROZA',
  'AJI'
]);

export function parseTimetableRows(rawRows: Record<string, string>[]): TimetableRow[] {
  return rawRows
    .filter((r) => {
      const code = r[COL.stationCode]?.trim().toUpperCase();
      return r[COL.trainNo] && code && NR_STATIONS.has(code);
    })
    .map((r) => ({
      trainNo: r[COL.trainNo].trim(),
      trainName: (r[COL.trainName] || '').trim(),
      seq: Number(r[COL.seq]) || 0,
      stationCode: r[COL.stationCode].trim().toUpperCase(),
      stationName: (r[COL.stationName] || '').trim(),
      arrivalMin: parseTimeToMinutes(r[COL.arrival]),
      departureMin: parseTimeToMinutes(r[COL.departure]),
      distance: Number(r[COL.distance] ?? 0),
      sourceStation: String(r[COL.sourceStation] ?? '').trim(),
      sourceStationName: String(r[COL.sourceStationName] ?? '').trim(),
      destinationStation: String(r[COL.destinationStation] ?? '').trim(),
      destinationStationName: String(r[COL.destinationStationName] ?? '').trim(),
    }))
    .sort((a, b) => {
      const aIsNR = NR_STATIONS.has(a.stationCode) ? 1 : 0;
      const bIsNR = NR_STATIONS.has(b.stationCode) ? 1 : 0;
      return bIsNR - aIsNR; // NR stations sabse pehle aayenge
    });
}


/**
 * Given all timetable rows, returns every train movement that occupies the
 * given segment (station pair), by finding consecutive stops per train
 * (sorted by seq) whose station codes match fromStation -> toStation (either
 * direction). This is exactly the shape solver.ts expects.
 */
export function getSegmentTrainMovements(
  allRows: TimetableRow[],
  fromStation: string,
  toStation: string,
  segmentId: string
): TrainMovement[] {
  const byTrain = new Map<string, TimetableRow[]>();
  for (const row of allRows) {
    if (!byTrain.has(row.trainNo)) byTrain.set(row.trainNo, []);
    byTrain.get(row.trainNo)!.push(row);
  }

  const movements: TrainMovement[] = [];

  for (const [trainNo, stops] of byTrain) {
    const sorted = [...stops].sort((a, b) => a.seq - b.seq);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];

      const forward = a.stationCode === fromStation && b.stationCode === toStation;
      const backward = a.stationCode === toStation && b.stationCode === fromStation;
      if (!forward && !backward) continue;

      const startMin = a.departureMin ?? a.arrivalMin;
      const endMin = b.arrivalMin ?? b.departureMin;
      if (startMin === null || endMin === null) continue;
      // Skip overnight-wrapping segments for simplicity (endMin < startMin
      // would mean the train crosses midnight — handle separately if needed).
      if (endMin < startMin) continue;

      movements.push({
        trainNumber: trainNo,
        trainName: sorted[0].trainName,
        segmentId,
        lineType: (forward ? 'UP' : 'DOWN') as LineType, // convention: adjust to match your actual UP/DOWN definitions
        startMin,
        endMin,
      });
    }
  }

  return movements;
}

/** All stops (across all trains) at a single station — "what passes through NDLS today". */
export function getStationTimetable(allRows: TimetableRow[], stationCode: string): TimetableRow[] {
  return allRows
    .filter((r) => r.stationCode === stationCode.toUpperCase())
    .sort((a, b) => (a.arrivalMin ?? a.departureMin ?? 0) - (b.arrivalMin ?? b.departureMin ?? 0));
}
