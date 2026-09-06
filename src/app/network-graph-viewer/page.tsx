import React from 'react';
import AppLayout from '@/components/AppLayout';
import NetworkGraphClient from './components/NetworkGraphClient';

export const metadata = {
  title: 'Northern Railway Network Topology | SIH 2026',
  description: 'Real-time track monitoring, block management, and station telemetry for Northern Railway divisions.',
};

// Backend integration: GET /api/network/graph?zone=NR → returns stations, edges, active blocks
export default function NetworkGraphViewerPage() {
  return (
    <AppLayout>
      <main className="p-6 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Northern Railway Operations Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time infrastructure visualization, block tracking, and interlocking status across Delhi, Ambala, Firozpur, Lucknow, and Moradabad divisions.
          </p>
        </div>

        {/* Interactive Network Graph Client Component */}
        <NetworkGraphClient />
      </main>
    </AppLayout>
  );
}