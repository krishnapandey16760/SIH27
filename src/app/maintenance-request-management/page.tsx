import React from 'react';
import AppLayout from '@/components/applayout';
import RequestsPageClient from './components/RequestsPageClient';

// Backend integration: GET /api/maintenance-requests?zone=NR
export default function MaintenanceRequestManagementPage() {
  return (
    <AppLayout>
      <RequestsPageClient />
    </AppLayout>
  );
}