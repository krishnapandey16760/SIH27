import { NextRequest, NextResponse } from 'next/server';

// Expected dataset fields (data.gov.in train timetable):
// Train No, Train Name, SEQ, Station Code, Station Name,
// Arrival time, Departure Time, Distance,
// Source Station, Source Station Name, Destination Station, Destination Station Name
//
// JSON keys are assumed to be snake_case versions of the above
// (train_no, train_name, seq, station_code, station_name, arrival_time,
// departure_time, distance, source_station, source_station_name,
// destination_station, destination_station_name).
// Verify these against one live response — data.gov.in field naming
// is not always perfectly consistent across datasets.

export async function GET(req: NextRequest) {
    const apiKey = process.env.DATA_GOV_API_KEY;
    const resourceId = process.env.DATA_GOV_RESOURCE_ID;

    if (!apiKey || !resourceId) {
        return NextResponse.json(
            { error: 'Server misconfiguration: missing DATA_GOV_API_KEY or DATA_GOV_RESOURCE_ID' },
            { status: 500 }
        );
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = searchParams.get('limit') ?? '100';
    const offset = searchParams.get('offset') ?? '0';

    // Optional filters a caller can pass, e.g.
    // /api/timetable?train_no=12345
    // /api/timetable?station_code=NDLS
    const trainNo = searchParams.get('train_no');
    const stationCode = searchParams.get('station_code');
    const sourceStation = searchParams.get('source_station');
    const destinationStation = searchParams.get('destination_station');

    const params = new URLSearchParams({
        'api-key': apiKey,
        format: 'json',
        limit,
        offset,
    });

    if (trainNo) params.set('filters[train_no]', trainNo);
    if (stationCode) params.set('filters[station_code]', stationCode);
    if (sourceStation) params.set('filters[source_station]', sourceStation);
    if (destinationStation) params.set('filters[destination_station]', destinationStation);

    const url = `https://api.data.gov.in/resource/13051d52-05c2-4130-9e7b-891bdde84076;

    try {
        const res = await fetch(url, {
            next: { revalidate: 300 }, // cache for 5 minutes to avoid hammering the upstream API
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: 'Upstream request failed', status: res.status },
                { status: res.status }
            );
        }

        const data = await res.json();

        // data.gov.in sometimes returns HTTP 200 with an error payload
        // (e.g. invalid key, invalid resource id, invalid filter field)
        if (data?.error || (typeof data?.message === 'string' && data.message.toLowerCase().includes('invalid'))) {
            return NextResponse.json(
                { error: 'Upstream API returned an error', detail: data },
                { status: 502 }
            );
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error('Failed to fetch train timetable data:', err);
        return NextResponse.json(
            { error: 'Internal error while fetching timetable data' },
            { status: 500 }
        );
    }
}
