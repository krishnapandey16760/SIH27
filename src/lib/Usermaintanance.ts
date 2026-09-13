'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  loadRequests,
  saveRequests,
  addRequest as addRequestStore,
  updateRequestStatus as updateStatusStore,
} from './maintenanceRequestsStore';
import type { UIMaintenanceRequest, Status } from './maintenanceRequests';

export function useMaintenanceRequests() {
  const [requests, setRequestsState] = useState<UIMaintenanceRequest[]>([]);

  useEffect(() => {
    setRequestsState(loadRequests());
    // Keep in sync if another component (or another tab) changes the store.
    const handler = () => setRequestsState(loadRequests());
    window.addEventListener('maintenance-requests-updated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('maintenance-requests-updated', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const addRequest = useCallback((req: UIMaintenanceRequest) => {
    setRequestsState(addRequestStore(req));
  }, []);

  const updateStatus = useCallback((id: string, status: Status) => {
    setRequestsState(updateStatusStore(id, status));
  }, []);

  const setRequests = useCallback((r: UIMaintenanceRequest[]) => {
    saveRequests(r);
    setRequestsState(r);
  }, []);

  return { requests, addRequest, updateStatus, setRequests };
}
