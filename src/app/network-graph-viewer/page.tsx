import React from 'react';
import AppLayout from '@/components/AppLayout';
import NetworkGraphClient from './components/NetworkGraphClient';

// Backend integration: GET /api/network/graph?zone=NR → returns stations, edges, active blocks
export default function NetworkGraphViewer() {
  return (
    <AppLayout>
      <NetworkGraphClient />
    </AppLayout>
  );
}