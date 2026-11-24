import { type UIMaintenanceRequest, type Status } from './maintenanceRequests';

let memoryCache: UIMaintenanceRequest[] = [];

function notifyUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('maintenance-requests-updated'));
  }
}

export function getCachedRequests(): UIMaintenanceRequest[] {
  return memoryCache;
}

export async function fetchRequestsFromDB(): Promise<UIMaintenanceRequest[]> {
  try {
    const res = await fetch('/api/requests', { cache: 'no-store' });
    if (!res.ok) return memoryCache;
    const data = await res.json();
    if (Array.isArray(data.requests)) {
      memoryCache = data.requests;
    }
    return memoryCache;
  } catch {
    return memoryCache;
  }
}

export function loadRequests(): UIMaintenanceRequest[] {
  return memoryCache;
}

export async function saveRequests(requests: UIMaintenanceRequest[]): Promise<UIMaintenanceRequest[]> {
  memoryCache = requests;
  notifyUpdated();
  return memoryCache;
}

export async function addRequest(request: UIMaintenanceRequest): Promise<UIMaintenanceRequest[]> {
  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (res.ok) {
      const data = await res.json();
      const created: UIMaintenanceRequest = data.request ?? request;
      memoryCache = [created, ...memoryCache.filter((r) => r.id !== created.id)];
      notifyUpdated();
      return memoryCache;
    }
  } catch {
    // fallback to optimistic update if backend is temporarily unreachable
  }
  memoryCache = [request, ...memoryCache];
  notifyUpdated();
  return memoryCache;
}

export async function updateRequestStatus(id: string, status: Status): Promise<UIMaintenanceRequest[]> {
  try {
    const res = await fetch(`/api/requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      const updatedItem: UIMaintenanceRequest | undefined = data.request;
      memoryCache = memoryCache.map((r) =>
        r.id === id || r.requestId === id ? (updatedItem ?? { ...r, status }) : r
      );
      notifyUpdated();
      return memoryCache;
    }
  } catch {
    // fallback optimistic update
  }
  memoryCache = memoryCache.map((r) => (r.id === id ? { ...r, status } : r));
  notifyUpdated();
  return memoryCache;
}

export async function deleteRequestFromDB(id: string): Promise<UIMaintenanceRequest[]> {
  try {
    await fetch(`/api/requests/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch {
    // ignore network error
  }
  memoryCache = memoryCache.filter((r) => r.id !== id && r.requestId !== id);
  notifyUpdated();
  return memoryCache;
}

export async function resetToSeed(): Promise<UIMaintenanceRequest[]> {
  try {
    const res = await fetch('/api/requests/reset', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.requests)) {
        memoryCache = data.requests;
        notifyUpdated();
        return memoryCache;
      }
    }
  } catch {
    // ignore
  }
  memoryCache = [];
  notifyUpdated();
  return memoryCache;
}

export function loadActiveRequests(): UIMaintenanceRequest[] {
  return memoryCache.filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled');
}

export async function loadActiveRequestsFromDB(): Promise<UIMaintenanceRequest[]> {
  const all = await fetchRequestsFromDB();
  return all.filter((r) => r.status !== 'Completed' && r.status !== 'Cancelled');
}
