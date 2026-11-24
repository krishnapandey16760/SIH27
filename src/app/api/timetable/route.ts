import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseCSV } from '@/lib/csvParser';
import { parseTimetableRows, getSegmentTrainMovements, TimetableRow } from '@/lib/timetableToTrainMovements';

const CSV_PATH = path.join(process.cwd(), 'src', 'data', 'train_schedule.csv');

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

let cachedRows: TimetableRow[] | null = null;
let cachedGroupedTrains: GroupedTrain[] | null = null;

function loadTimetableRows(): TimetableRow[] {
  if (cachedRows) return cachedRows;
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const parsed = parseCSV(raw);
  cachedRows = parseTimetableRows(parsed);
  return cachedRows;
}

function loadGroupedTrains(): GroupedTrain[] {
  if (cachedGroupedTrains) return cachedGroupedTrains;

  const rows = loadTimetableRows();
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

  // Prioritize Northern Railway home trains (14xxx / 24xxx), then ascending train number
  groupedList.sort((a, b) => {
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
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const segmentId = searchParams.get('segmentId');

    // Support segment movement queries used by realGanttData.ts
    if (from && to && segmentId) {
      const rows = loadTimetableRows();
      const trainMovements = getSegmentTrainMovements(rows, from, to, segmentId);
      return NextResponse.json({ trainMovements });
    }

    const trains = loadGroupedTrains();
    const search = searchParams.get('q')?.toLowerCase();

    if (search) {
      const filtered = trains.filter(
        (t) =>
          t.trainNo.toLowerCase().includes(search) ||
          t.trainName.toLowerCase().includes(search) ||
          t.sourceStationName.toLowerCase().includes(search) ||
          t.destinationStationName.toLowerCase().includes(search)
      );
      return NextResponse.json({ total: filtered.length, trains: filtered });
    }

    return NextResponse.json({ total: trains.length, trains });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to process CSV file' }, { status: 500 });
  }
}
