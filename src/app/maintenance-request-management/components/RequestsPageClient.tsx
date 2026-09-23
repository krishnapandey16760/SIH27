'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Download,
  Plus,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  CheckSquare,
  Square,
  CheckCircle,
  XCircle,
  Play,
  Eye,
  Edit3,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Lock,
  RotateCcw,
  Archive,
  Clock,
  Split as SplitIcon
} from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/statusbadge';
import PriorityBadge from '@/components/ui/prioritybadge';
import DeptBadge from '@/components/ui/deptbadge';
import RequestDetailDrawer from './RequestDetailDrawer';
import NewRequestModal from './NewRequestModal';
import { useRole } from '@/context/RoleContext';
import RoleSwitcher from '../../components/RoleSwitcher';
import { type UIMaintenanceRequest, type Status } from '@/lib/maintenanceRequests';
import { useMaintenanceRequests } from '@/lib/useMaintenanceRequests';

type SortKey = keyof UIMaintenanceRequest;

const ITEMS_PER_PAGE_OPTIONS = [10, 15, 25, 50];

const ALL_STATUSES: Status[] = [
  'Pending',
  'Scheduled',
  'Active',
  'Split' as unknown as Status,
  'Completed',
  'Cancelled',
  'Conflict'
];

const minutesToClock = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Helper: Check if request is considered inactive / archived
const isArchived = (status?: string): boolean => {
  const s = status?.toUpperCase();
  return s === 'COMPLETED' || s === 'CANCELLED' || s === 'REJECTED';
};

export default function RequestsPageClient() {
  const { role } = useRole();
  const canChangeStatus = role === 'Sr. Divisional Engineer';

  const { requests, addRequest, updateStatus: updateStatusStore, setRequests } = useMaintenanceRequests();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('submittedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [drawerRequest, setDrawerRequest] = useState<UIMaintenanceRequest | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const updateStatus = (id: string, newStatus: Status) => {
    updateStatusStore(id, newStatus);
    const req = requests.find((r) => r.id === id);
    const targetName = req?.requestId ?? id;

    if (isArchived(newStatus as string)) {
      toast.info(`${targetName} archived to Request History`, {
        description: `Marked as ${newStatus} by ${role}`,
      });
    } else {
      toast.success(`${targetName} marked as ${newStatus}`, {
        description: `Updated by ${role}`,
      });
    }

    if (drawerRequest?.id === id) {
      setDrawerRequest((prev) => (prev ? { ...prev, status: newStatus } : prev));
    }
  };

  const applyWindow = (id: string, window: { startMin: number; endMin: number }) => {
    const target = requests.find((r) => r.id === id);
    setRequests(
      requests.map((r) =>
        r.id === id
          ? ({
              ...r,
              status: 'Scheduled' as Status,
              preferredStart: minutesToClock(window.startMin),
              preferredEnd: minutesToClock(window.endMin),
              adminResolution: undefined,
            } as UIMaintenanceRequest)
          : r
      )
    );
    toast.success(`Applied suggested window to ${target?.requestId ?? id}`, {
      description: `${minutesToClock(window.startMin)} – ${minutesToClock(window.endMin)}`,
    });
    if (drawerRequest?.id === id) {
      setDrawerRequest((prev) =>
        prev
          ? ({
              ...prev,
              status: 'Scheduled' as Status,
              preferredStart: minutesToClock(window.startMin),
              preferredEnd: minutesToClock(window.endMin),
            } as UIMaintenanceRequest)
          : prev
      );
    }
  };

  const bumpRequest = (id: string, blockingRequestId: string) => {
    const target = requests.find((r) => r.id === id);
    setRequests(
      requests.map((r) => (r.id === blockingRequestId ? { ...r, status: 'Pending' as Status } : r))
    );
    toast.info(`${blockingRequestId} moved back to Pending to free up space for ${target?.requestId ?? id}`, {
      description: 'Re-run optimization so both requests get a fresh, valid schedule.',
    });
  };

  const deferToAnotherDay = (id: string) => {
    const target = requests.find((r) => r.id === id);
    updateStatus(id, 'Pending');
    toast.info(`${target?.requestId ?? id} marked Pending`, {
      description: 'Resubmit it for a different day - this segment/line has no room left today.',
    });
  };

  // Separate Active from Inactive/Archived (Completed, Cancelled, Rejected)
  const historyRequests = useMemo(() => {
    return requests.filter((r) => isArchived(r.status as string));
  }, [requests]);

  const activeRequests = useMemo(() => {
    return requests.filter((r) => !isArchived(r.status as string));
  }, [requests]);

  const filtered = useMemo(() => {
    return activeRequests.filter((r) => {
      const matchSearch =
        !search ||
        r.requestId.toLowerCase().includes(search.toLowerCase()) ||
        r.segment.toLowerCase().includes(search.toLowerCase()) ||
        r.requestedBy.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === 'All' || r.dept === deptFilter;
      const matchPriority = priorityFilter === 'All' || r.priority === priorityFilter;
      const matchStatus = statusFilter === 'All' || (r.status as string) === statusFilter;
      return matchSearch && matchDept && matchPriority && matchStatus;
    });
  }, [activeRequests, search, deptFilter, priorityFilter, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginated = sorted.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === paginated.length && paginated.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map((r) => r.id)));
  };

  const handleBulkApprove = () => {
    setRequests(
      requests.map((r) => (selectedIds.has(r.id) ? { ...r, status: 'Scheduled' as Status } : r))
    );
    toast.success(`${selectedIds.size} requests approved and queued for block assignment`);
    setSelectedIds(new Set());
  };

  const handleBulkReject = () => {
    setRequests(
      requests.map((r) => (selectedIds.has(r.id) ? { ...r, status: 'Cancelled' as Status } : r))
    );
    toast.error(`${selectedIds.size} requests cancelled and archived to Request History`);
    setSelectedIds(new Set());
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown size={11} className="text-muted-foreground/50" />;
    return sortDir === 'asc' ? (
      <ChevronUp size={11} className="text-primary" />
    ) : (
      <ChevronDown size={11} className="text-primary" />
    );
  };

  // Safe string comparisons to avoid ts(2367) error
  const TOTAL_CONFLICTS = useMemo(
    () => activeRequests.filter((r) => (r.status as string) === 'Conflict').length,
    [activeRequests]
  );
  const TOTAL_SPLITS = useMemo(
    () => activeRequests.filter((r) => (r.status as string) === 'Split').length,
    [activeRequests]
  );

  return (
    <div className="space-y-6 fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maintenance Requests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeRequests.length} active · {historyRequests.length} archived/completed · NR Zone ·{' '}
            {TOTAL_CONFLICTS > 0 && (
              <span className="text-negative font-medium">{TOTAL_CONFLICTS} conflicts require attention</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RoleSwitcher />
          <button className="btn-secondary text-sm" onClick={() => toast.info('Refreshing requests…')}>
            <RefreshCw size={13} />
            Refresh
          </button>
          <button className="btn-secondary text-sm" onClick={() => toast.info('Exporting CSV…')}>
            <Download size={13} />
            Export
          </button>
          <button className="btn-primary text-sm" onClick={() => setShowNewModal(true)}>
            <Plus size={13} />
            New Request
          </button>
        </div>
      </div>

      {!canChangeStatus && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-xs text-muted-foreground">
          <Lock size={12} />
          Status changes are restricted to Sr. Divisional Engineer — switch role above to try it.
        </div>
      )}

      {/* Conflict Alert */}
      {TOTAL_CONFLICTS > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-negative-tint border border-negative/25">
          <AlertTriangle size={16} className="text-negative shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">{TOTAL_CONFLICTS} maintenance blocks</span> have train conflicts.
            Review and resolve before the next operating window.
          </p>
          <button className="btn-ghost text-xs text-negative ml-auto" onClick={() => setStatusFilter('Conflict')}>
            View Conflicts
          </button>
        </div>
      )}

      {/* Split Alert */}
      {TOTAL_SPLITS > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 border border-accent/25">
          <SplitIcon size={16} className="text-accent shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">{TOTAL_SPLITS} maintenance blocks</span> were split across multiple
            windows because no single slot was free.
          </p>
          <button className="btn-ghost text-xs text-accent ml-auto" onClick={() => setStatusFilter('Split')}>
            View Split Blocks
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ID, segment, requester…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-field pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="select-field text-xs"
            style={{ width: 120 }}
          >
            <option value="All">All Depts</option>
            <option value="Civil">Civil</option>
            <option value="OHE">OHE</option>
            <option value="S&T">S&T</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="select-field text-xs"
            style={{ width: 130 }}
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="select-field text-xs"
            style={{ width: 130 }}
          >
            <option value="All">All Statuses</option>
            {ALL_STATUSES.filter((s) => !isArchived(s as string)).map((s) => (
              <option key={s as string} value={s as string}>
                {s as string}
              </option>
            ))}
          </select>

          {(deptFilter !== 'All' || priorityFilter !== 'All' || statusFilter !== 'All' || search) && (
            <button
              className="btn-ghost text-xs text-negative"
              onClick={() => {
                setDeptFilter('All');
                setPriorityFilter('All');
                setStatusFilter('All');
                setSearch('');
                setPage(1);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ================= PRIMARY BLOCK: ACTIVE REQUESTS ================= */}
      <div className="card-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Active & Scheduled Requests</h2>
          </div>
          <span className="status-badge bg-primary/15 text-primary">
            {activeRequests.length} In Pipeline
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm" style={{ minWidth: 1200 }}>
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-10 px-3 py-3 text-left">
                  <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                    {selectedIds.size === paginated.length && paginated.length > 0 ? (
                      <CheckSquare size={15} className="text-primary" />
                    ) : (
                      <Square size={15} />
                    )}
                  </button>
                </th>
                {[
                  { key: 'requestId' as SortKey, label: 'Request ID', w: 130 },
                  { key: 'segment' as SortKey, label: 'Segment', w: 110 },
                  { key: 'dept' as SortKey, label: 'Dept', w: 80 },
                  { key: 'lineType' as SortKey, label: 'Line', w: 70 },
                  { key: 'durationMins' as SortKey, label: 'Duration', w: 90 },
                  { key: 'priority' as SortKey, label: 'Priority', w: 90 },
                  { key: 'preferredStart' as SortKey, label: 'Preferred Window', w: 150 },
                  { key: 'requestedBy' as SortKey, label: 'Requested By', w: 130 },
                  { key: 'status' as SortKey, label: 'Status', w: 150 },
                  { key: 'assignedBlock' as SortKey, label: 'Assigned Block', w: 120 },
                ].map((col) => (
                  <th
                    key={`th-${col.key}`}
                    className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                    style={{ width: col.w }}
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon k={col.key} />
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No active maintenance requests match your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((req) => (
                  <tr
                    key={req.id}
                    className={`table-row-hover ${selectedIds.has(req.id) ? 'bg-primary/5' : ''} ${
                      (req.status as string) === 'Conflict' ? 'bg-negative-tint/20' : ''
                    } ${(req.status as string) === 'Split' ? 'bg-accent/5' : ''}`}
                  >
                    <td className="px-3 py-2.5">
                      <button onClick={() => toggleRow(req.id)} className="text-muted-foreground hover:text-foreground">
                        {selectedIds.has(req.id) ? (
                          <CheckSquare size={14} className="text-primary" />
                        ) : (
                          <Square size={14} />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono-data text-xs text-foreground font-semibold">
                        {req.requestId}
                      </span>
                      {req.conflictsWith && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <AlertTriangle size={10} className="text-negative" />
                          <span className="text-2xs text-negative">vs {req.conflictsWith}</span>
                        </div>
                      )}
                      {(req.status as string) === 'Split' && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <SplitIcon size={10} className="text-accent" />
                          <span className="text-2xs text-accent">multi-window</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-semibold text-foreground">{req.segment}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <DeptBadge dept={req.dept} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          req.lineType === 'UP'
                            ? 'bg-accent/15 text-accent'
                            : req.lineType === 'DOWN'
                            ? 'bg-primary/15 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {req.lineType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono-data text-xs text-foreground">{req.durationMins} min</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <PriorityBadge priority={req.priority} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-foreground font-mono-data">
                        {req.preferredStart} – {req.preferredEnd}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-foreground">{req.requestedBy}</span>
                      <div className="text-2xs text-muted-foreground">{req.submittedAt}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      {canChangeStatus ? (
                        <select
                          value={req.status as string}
                          onChange={(e) => updateStatus(req.id, e.target.value as Status)}
                          className="select-field text-xs"
                          style={{ width: 130 }}
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s as string} value={s as string}>
                              {s as string}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge status={req.status as any} />
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {req.assignedBlock ? (
                        <span className="font-mono-data text-xs text-accent">{req.assignedBlock}</span>
                      ) : (
                        <span className="text-2xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="View details"
                          className="btn-ghost p-1.5"
                          onClick={() => setDrawerRequest(req)}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          title="Edit request"
                          className="btn-ghost p-1.5"
                          onClick={() => toast.info(`Editing ${req.requestId}`)}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          title="Run optimization for this segment"
                          className="btn-ghost p-1.5 text-primary"
                          onClick={() => toast.success(`Optimization triggered for ${req.segment}`)}
                        >
                          <Play size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="select-field text-xs"
              style={{ width: 60 }}
            >
              {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                <option key={`ipp-${n}`} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>of {sorted.length} active requests</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="btn-ghost p-1.5"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={`page-${p}`}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded text-xs font-semibold transition-all ${
                    page === p ? 'bg-primary text-primary-foreground' : 'btn-ghost'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            {totalPages > 5 && <span className="text-muted-foreground text-xs px-1">…</span>}
            <button
              className="btn-ghost p-1.5"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ================= SECONDARY BLOCK: REQUEST HISTORY ================= */}
      <div className="card-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Request History</h2>
          </div>
          <span className="status-badge bg-muted text-muted-foreground font-semibold">
            {historyRequests.length} Archived
          </span>
        </div>

        {historyRequests.length === 0 ? (
          <div className="px-6 py-8 text-center text-muted-foreground text-sm">
            No archived requests yet. Mark any active request as Completed or Cancelled to store it here.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm" style={{ minWidth: 900 }}>
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Request ID
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Segment
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Dept
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Duration
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Requested By
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-muted-foreground">
                {historyRequests.map((req) => {
                  const isCompleted = (req.status as string)?.toUpperCase() === 'COMPLETED';
                  return (
                    <tr key={req.id} className="hover:bg-muted/10 transition-colors opacity-80 hover:opacity-100">
                      <td className="px-3 py-2.5 font-mono-data text-xs text-foreground/80 font-semibold line-through">
                        {req.requestId}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{req.segment}</td>
                      <td className="px-3 py-2.5">
                        <DeptBadge dept={req.dept} />
                      </td>
                      <td className="px-3 py-2.5 font-mono-data text-xs">{req.durationMins} min</td>
                      <td className="px-3 py-2.5 text-xs">{req.requestedBy}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`status-badge font-semibold text-2xs ${
                            isCompleted
                              ? 'bg-positive-tint text-positive'
                              : 'bg-negative/15 text-negative'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {canChangeStatus ? (
                          <button
                            onClick={() => updateStatus(req.id, 'Pending')}
                            className="inline-flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground hover:underline transition"
                            title="Reopen request into active pipeline"
                          >
                            <RotateCcw size={11} /> Reopen
                          </button>
                        ) : (
                          <span className="text-2xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 card-surface-elevated border border-border shadow-xl rounded-xl slide-up">
          <span className="text-sm font-semibold text-foreground">
            {selectedIds.size} selected
          </span>
          <div className="w-px h-5 bg-border" />
          <button className="btn-primary text-xs gap-1.5" onClick={handleBulkApprove}>
            <CheckCircle size={13} />
            Approve All
          </button>
          <button className="btn-secondary text-xs gap-1.5" onClick={handleBulkReject}>
            <XCircle size={13} />
            Reject All
          </button>
          <button
            className="btn-ghost text-xs text-muted-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      {/* Drawers and Modals */}
      {drawerRequest && (
        <RequestDetailDrawer
          request={drawerRequest}
          onClose={() => setDrawerRequest(null)}
          canChangeStatus={canChangeStatus}
          onStatusChange={canChangeStatus ? (status) => updateStatus(drawerRequest.id, status as Status) : undefined}
          onApplyWindow={canChangeStatus ? applyWindow : undefined}
          onBumpRequest={canChangeStatus ? bumpRequest : undefined}
          onDeferToAnotherDay={canChangeStatus ? deferToAnotherDay : undefined}
        />
      )}

      {showNewModal && (
        <NewRequestModal
          open={showNewModal}
          onClose={() => setShowNewModal(false)}
          onCreate={(newReq) => {
            addRequest(newReq);
            setShowNewModal(false);
          }}
        />
      )}
    </div>
  );
}