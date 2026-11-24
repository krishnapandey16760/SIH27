import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/requests/reset`, { method: 'POST' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reset requests in DB' }, { status: 502 });
  }
}
