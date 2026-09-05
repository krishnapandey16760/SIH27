import React from 'react';
import AppLayout from '@/components/applayout';
import * as NetworkGraphModule from './components/NetworkGraphClient';

// Backend integration: GET /api/network/graph?zone=NR -> returns stations, edges, active blocks
export default function NetworkGraphViewer() {
  const Component: any = (NetworkGraphModule as any).default || Object.values(NetworkGraphModule)[0];
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}