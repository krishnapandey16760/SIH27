// src/app/api/logs/route.ts
import { NextResponse } from 'next/server';

// Server memory mein dynamically logs store rahenge
let logsDatabase: any[] = [
  {
    id: 'LOG-INIT',
    type: 'system',
    title: 'Northern Railway System Initialized',
    description: 'Central Monitoring & Topology service active.',
    user: 'System Admin',
    role: 'Admin',
    timestamp: 'System Boot',
    status: 'Completed',
    section: 'NR HQ Baroda House'
  }
];

// GET: Sabhi dynamic logs fetch karne ke liye
export async function GET() {
  return NextResponse.json({ success: true, data: logsDatabase });
}

// POST: Real login ya maintenance action ka log add karne ke liye
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      type: body.type || 'user',
      title: body.title,
      description: body.description,
      user: body.user,
      role: body.role || 'Officer',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: body.status || 'Completed',
      section: body.section || 'General NR Division'
    };

    // Naya log sabse upar add hoga
    logsDatabase = [newLog, ...logsDatabase];

    return NextResponse.json({ success: true, newLog }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  }
}