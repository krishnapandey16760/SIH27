import type { TrainMovement, LineType } from './solver';

/**
 * Column mapping for data.gov.in / Indian Railways timetable CSV.
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
  arrival: number | null; // minutes from midnight (null at origin)
  departure: number | null; // minutes from midnight (null at destination)
  arrivalMin: number | null; // alias expected by train-movements UI
  departureMin: number | null; // alias expected by train-movements UI
  arrivalTime: string | null; // formatted "HH:MM"
  departureTime: string | null; // formatted "HH:MM"
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
  if (clean === '' || clean === 'source' || clean === 'destination') return null;
  const parts = raw.trim().split(':').map(Number);
  if (parts.length < 2 || parts.some((p) => isNaN(p))) return null;
  const [h, m] = parts;
  return h * 60 + m;
}

/** Formats minutes from midnight into "HH:MM". */
export function formatMinutesToTime(mins: number | null): string {
  if (mins === null || isNaN(mins)) return '--:--';
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const NR_STATIONS = new Set([
  'BRML', 'SXZM', 'HME', 'PTTN', 'MZMA', 'NDAM', 'BDGM', 'SINA',
  'PMPE', 'KAPE', 'RPAP', 'ATPA', 'PJGM', 'BJBA', 'ANT', 'SDUA',
  'QG', 'HRSB', 'BAHL', 'KARI', 'SMBR', 'SGDN', 'SWKE', 'DUGA',
  'BAKK', 'REAI', 'SVDK', 'CRWL', 'MCTM', 'RMJK', 'MNVL', 'SGRR',
  'BLA', 'JAT', 'BBMN', 'VJPJ', 'SMBX', 'GHGL', 'HRNR', 'CKDL',
  'CHNR', 'BDHY', 'KTHU', 'KTH', 'UHP', 'MDPB', 'SJNP', 'PTK', 'PTKC', 'BHRL',
  'DLSR', 'NUPR', 'BLDL', 'JWLS', 'MGRP', 'BRHL', 'GULR', 'TRPL',
  'KPLR', 'KGMR', 'NGRT', 'CMMG', 'PLMX', 'BJPL', 'JDNX', 'SRM',
  'JK', 'PMQ', 'DNN', 'GSP', 'BAT', 'DBNK', 'VKA', 'ATT',
  'ASR', 'BGTN', 'TTO', 'KEMK', 'BEAS', 'JUC', 'JRC', 'HSX',
  'PGW', 'PHR', 'NSS', 'RHU', 'NRO', 'LNK', 'SQR', 'FZR',
  'FZP', 'FDK', 'KKP', 'MKS', 'FKA', 'ABS', 'BTI', 'MOT', 'GNA', 'LDH',
  'KNN', 'SIR', 'NMDA', 'RPAR', 'ANSB', 'NLDM', 'DLPC', 'CDG',
  'KLK', 'SOL', 'SML', 'RPJ', 'PTA', 'DUI', 'SAG', 'JHL',
  'JIND', 'ROK', 'UMB', 'UBC', 'KKDE', 'PNP', 'SNP', 'DLI',
  'NDLS', 'NZM', 'ANVT', 'DEE', 'DEC', 'DSA', 'TKJ', 'DSJ', 'SSB', 'SZM', 'DBSI', 'ANDI',
  'GGN', 'GHH', 'RE', 'GZB', 'MTC', 'MUT', 'MZN', 'MOZ', 'DBD', 'TPZ', 'SRE', 'YJUD',
  'HPU', 'GMS', 'GJL', 'RK', 'LRJ', 'HW', 'RWL', 'DDN', 'YNRK', 'RMR', 'KGM',
  'NBD', 'KTW', 'NGG', 'DPR', 'SEO', 'KNT', 'MB', 'KGB', 'RJK',
  'CH', 'RMU', 'BE', 'BRYC', 'PMR', 'TLH', 'SPN', 'ROZA', 'AJI',
  'BLM', 'STP', 'AO', 'GNO', 'AMRO',
  'LKO', 'BBK', 'RBL', 'AME', 'MBDP', 'PBH', 'SLN', 'FD', 'AY', 'AYC', 'SHG', 'JNU', 'BSB', 'CNB'
]);

export function parseTimetableRows(rawRows: Record<string, string>[]): TimetableRow[] {
  return rawRows
    .filter((r) => {
      const trainNo = String(r[COL.trainNo] ?? '').trim().replace(/['"]/g, '');
      const code = r[COL.stationCode]?.trim().toUpperCase();
      // Keep all valid regular 5-digit trains (10000–99999) with a valid station code
      return /^[1-9]\d{4}$/.test(trainNo) && Boolean(code);
    })
    .map((r) => {
      const trainNo = String(r[COL.trainNo]).trim().replace(/['"]/g, '');
      const seq = Number(r[COL.seq]) || 0;
      const stationCode = r[COL.stationCode].trim().toUpperCase();
      const sourceStation = String(r[COL.sourceStation] ?? '').trim().toUpperCase();
      const destinationStation = String(r[COL.destinationStation] ?? '').trim().toUpperCase();

      const rawArrival = String(r[COL.arrival] ?? '').trim();
      const rawDeparture = String(r[COL.departure] ?? '').trim();

      const isOriginArrival = seq === 1 && (rawArrival === '00:00:00' || rawArrival === '00:00');
      const isDestDeparture = stationCode === destinationStation && (rawDeparture === '00:00:00' || rawDeparture === '00:00');

      const arrival = isOriginArrival ? null : parseTimeToMinutes(rawArrival);
      const departure = isDestDeparture ? null : parseTimeToMinutes(rawDeparture);

      return {
        trainNo,
        trainName: (r[COL.trainName] || '').trim(),
        seq,
        stationCode,
        stationName: (r[COL.stationName] || '').trim(),
        arrival,
        departure,
        arrivalMin: arrival,
        departureMin: departure,
        arrivalTime: arrival !== null ? formatMinutesToTime(arrival) : null,
        departureTime: departure !== null ? formatMinutesToTime(departure) : null,
        distance: Number(r[COL.distance] ?? 0),
        sourceStation,
        sourceStationName: String(r[COL.sourceStationName] ?? '').trim(),
        destinationStation,
        destinationStationName: String(r[COL.destinationStationName] ?? '').trim(),
      };
    })
    .sort((a, b) => a.trainNo.localeCompare(b.trainNo) || a.seq - b.seq);
}

/**
 * Given all timetable rows, returns every train movement that traverses the
 * given segment (station pair), matching both adjacent stops and express trains
 * that pass intermediate halts between fromStation and toStation.
 */
export function getSegmentTrainMovements(
  allRows: TimetableRow[],
  fromStation: string,
  toStation: string,
  segmentId: string
): TrainMovement[] {
  const from = fromStation.trim().toUpperCase();
  const to = toStation.trim().toUpperCase();

  const byTrain = new Map<string, TimetableRow[]>();
  for (const row of allRows) {
    if (!byTrain.has(row.trainNo)) byTrain.set(row.trainNo, []);
    byTrain.get(row.trainNo)!.push(row);
  }

  const movements: TrainMovement[] = [];

  for (const [trainNo, stops] of byTrain) {
    const sorted = [...stops].sort((a, b) => a.seq - b.seq);
    const idxFrom = sorted.findIndex((s) => s.stationCode === from);
    const idxTo = sorted.findIndex((s) => s.stationCode === to);

    if (idxFrom === -1 || idxTo === -1 || idxFrom === idxTo) continue;

    const forward = idxFrom < idxTo;
    const startStop = sorted[idxFrom];
    const endStop = sorted[idxTo];

    const startMin = startStop.departure ?? startStop.arrival;
    const endMin = endStop.arrival ?? endStop.departure;
    if (startMin === null || endMin === null) continue;

    // Handle overnight trains crossing midnight (e.g., 23:40 -> 01:15)
    const adjustedEndMin = endMin < startMin ? endMin + 1440 : endMin;

    movements.push({
      trainNumber: trainNo,
      trainName: sorted[0].trainName,
      segmentId,
      lineType: (forward ? 'UP' : 'DOWN') as LineType,
      startMin,
      endMin: adjustedEndMin,
    });
  }

  return movements;
}

/** All stops (across all trains) at a single station — "what passes through NDLS today". */
export function getStationTimetable(allRows: TimetableRow[], stationCode: string): TimetableRow[] {
  return allRows
    .filter((r) => r.stationCode === stationCode.toUpperCase())
    .sort((a, b) => (a.arrival ?? a.departure ?? 0) - (b.arrival ?? b.departure ?? 0));
}
