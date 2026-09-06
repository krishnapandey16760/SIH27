import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const apiKey = process.env.DATA_GOV_API_KEY;
    const resourceId = process.env.DATA_GOV_RESOURCE_ID;

    const url = `https://api.data.gov.in/resource/${resourceId}?api-key=${apiKey}&format=json&limit=100`;

    const res = await fetch(url);

    if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: res.status });
    }

    const data = await res.json();

    return NextResponse.json(data);
}