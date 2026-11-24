'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getCachedRequests,
  fetchRequestsFromDB,
  saveRequests,
  addRequest as addRequestStore,
  updateRequestStatus as updateStatusStore,
  deleteRequestFromDB,
  resetToSeed as resetStore,
} from './maintenanceRequestsStore';

import type { UIMaintenanceRequest, Status } from './maintenanceRequests';

export function useMaintenanceRequests() {
  const [requests, setRequestsState] = useState<UIMaintenanceRequest[]>(() => getCachedRequests());
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    const latest = await fetchRequestsFromDB();
    setRequestsState(latest);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => setRequestsState(getCachedRequests());
    window.addEventListener('maintenance-requests-updated', handler);
    return () => {
      window.removeEventListener('maintenance-requests-updated', handler);
    };
  }, [refresh]);

  const addRequest = useCallback(async (req: UIMaintenanceRequest) => {
    const updated = await addRequestStore(req);
    setRequestsState(updated);
  }, []);

  const updateStatus = useCallback(async (id: string, status: Status) => {
    const updated = await updateStatusStore(id, status);
    setRequestsState(updated);
  }, []);

  const deleteRequest = useCallback(async (id: string) => {
    const updated = await deleteRequestFromDB(id);
    setRequestsState(updated);
  }, []);

  const resetRequests = useCallback(async () => {
    const updated = await resetStore();
    setRequestsState(updated);
  }, []);

  const setRequests = useCallback(async (r: UIMaintenanceRequest[]) => {
    const updated = await saveRequests(r);
    setRequestsState(updated);
  }, []);

  return {
    requests,
    loading,
    refresh,
    addRequest,
    updateStatus,
    deleteRequest,
    resetRequests,
    setRequests,
  };
}
