import { REQUESTS as SEED_REQUESTS, type UIMaintenanceRequest, type Status } from './maintenanceRequests';

const STORAGE_KEY = 'railblock_maintenance_requests';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function loadRequests(): UIMaintenanceRequest[] {
  if (!isBrowser()) return SEED_REQUESTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_REQUESTS));
      return SEED_REQUESTS;
    }
    return JSON.parse(raw) as UIMaintenanceRequest[];
  } catch {
    return SEED_REQUESTS;
  }
}

export function saveRequests(requests: UIMaintenanceRequest[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  // Notify any mounted hook instances (e.g. Gantt + table open at once) to re-read.
  window.dispatchEvent(new CustomEvent('maintenance-requests-updated'));
}

export function addRequest(request: UIMaintenanceRequest): UIMaintenanceRequest[] {
  const updated = [request, ...loadRequests()];
  saveRequests(updated);
  return updated;
}

export function updateRequestStatus(id: string, status: Status): UIMaintenanceRequest[] {
  const updated = loadRequests().map((r) => (r.id === id ? { ...r, status } : r));
  saveRequests(updated);
  return updated;
}

export function resetToSeed(): UIMaintenanceRequest[] {
  saveRequests(SEED_REQUESTS);
  return SEED_REQUESTS;
}

/**
 * Requests that still need track time — excludes Completed/Cancelled work,
 * which should no longer occupy a slot on the Gantt chart or be sent to
 * the solver. This is what fixes "completed request still shows on Gantt".
 */
export function loadActiveRequests(): UIMaintenanceRequest[] {
  return loadRequests().filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled');
}
