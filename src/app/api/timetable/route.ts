import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseCSV } from '@/lib/csvParser';
import { parseTimetableRows, TimetableRow } from '@/lib/timetableToTrainMovements';

const CSV_PATH = path.join(process.cwd(), 'src', 'data', 'train_schedule.csv');

// Key NR hub stations
const NR_STATIONS = new Set([
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
  'AJI', 'LKO', 'BSB', 'FD', 'AY', 'PBH', 'SLN', 'RBL', 'CNB'
]);

export interface GroupedTrain {
  trainNo: string;
  trainName: string;
  sourceStation: string;
  sourceStationName: string;
  destinationStation: string;
  destinationStationName: string;
  totalStops: number;
  route: TimetableRow[];
}

let cachedGroupedTrains: GroupedTrain[] | null = null;

function loadGroupedTrains(): GroupedTrain[] {
  if (cachedGroupedTrains) return cachedGroupedTrains;

  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const parsed = parseCSV(raw);
  const rows: TimetableRow[] = parseTimetableRows(parsed);

  const trainMap = new Map<string, TimetableRow[]>();
  for (const row of rows) {
    const tNo = row.trainNo.trim();
    if (!trainMap.has(tNo)) {
      trainMap.set(tNo, []);
    }
    trainMap.get(tNo)!.push(row);
  }

  const groupedList: GroupedTrain[] = [];

  for (const [trainNo, stops] of trainMap.entries()) {
    stops.sort((a, b) => a.seq - b.seq);
    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];

    // Check 1: Official Indian Railways NR train number prefix (14xxx, 24xxx, 04xxx, 64xxx)
    const isNRByNumber = /^(14|24|04|64|54|74)\d{3}$/.test(trainNo);

    // Check 2: Stops at or originates/terminates at an NR station
    const touchesNRStation =
      stops.some((s) => NR_STATIONS.has(s.stationCode.toUpperCase())) ||
      NR_STATIONS.has(firstStop.sourceStation?.toUpperCase()) ||
      NR_STATIONS.has(lastStop.destinationStation?.toUpperCase());

    // Include if it's an official NR train OR traverses Northern Railway territory
    if (isNRByNumber || touchesNRStation) {
      groupedList.push({
        trainNo,
        trainName: firstStop.trainName,
        sourceStation: firstStop.sourceStation || firstStop.stationCode,
        sourceStationName: firstStop.sourceStationName || firstStop.stationName,
        destinationStation: lastStop.destinationStation || lastStop.stationCode,
        destinationStationName: lastStop.destinationStationName || lastStop.stationName,
        totalStops: stops.length,
        route: stops,
      });
    }
  }

  // Sorting Priority:
  // 1. 5-digit trains first
  // 2. Official NR trains (14xxx/24xxx) prioritized
  // 3. Ascending train number
  groupedList.sort((a, b) => {
    const aLen = a.trainNo.length;
    const bLen = b.trainNo.length;

    // 5-digit trains first, 3/4 digit trains pushed to bottom
    if (aLen === 5 && bLen !== 5) return -1;
    if (aLen !== 5 && bLen === 5) return 1;

    // Inside 5-digit trains, prioritize Northern Railway home trains (starting with 14 or 24)
    const aIsNRPrime = /^(14|24)/.test(a.trainNo) ? 1 : 0;
    const bIsNRPrime = /^(14|24)/.test(b.trainNo) ? 1 : 0;
    if (aIsNRPrime !== bIsNRPrime) return bIsNRPrime - aIsNRPrime;

    return a.trainNo.localeCompare(b.trainNo, undefined, { numeric: true });
  });

  cachedGroupedTrains = groupedList;
  return cachedGroupedTrains;
}

export async function GET(req: NextRequest) {
  try {
    const trains = loadGroupedTrains();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q')?.toLowerCase();

    if (search) {
      const filtered = trains.filter(
        (t) =>
          t.trainNo.toLowerCase().includes(search) ||
          t.trainName.toLowerCase().includes(search) ||
          t.sourceStationName.toLowerCase().includes(search) ||
          t.destinationStationName.toLowerCase().includes(search)
      );
      return NextResponse.json({ total: filtered.length, trains: filtered.slice(0, 2000) });
    }

    // Return the top 300 trains (all sorted 5-digit NR trains)
    return NextResponse.json({ total: trains.length, trains: trains.slice(0, 2000) });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to process CSV file' }, { status: 500 });
  }
}