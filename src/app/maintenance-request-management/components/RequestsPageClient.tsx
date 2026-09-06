'use client';

import React, { useState, useMemo } from 'react';
import { Search, Download, Plus, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown, CheckSquare, Square, CheckCircle, XCircle, Play, Eye, Edit3, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/statusbadge';
import PriorityBadge from '@/components/ui/prioritybadge';
import DeptBadge from '@/components/ui/deptbadge';
import RequestDetailDrawer from './RequestDetailDrawer';
import NewRequestModal from './NewRequestModal';

// ... baaki poora code bilkul same rahega, sirf upar ke 3 import lines change hui hain

// Backend integration: GET /api/maintenance-requests?zone=NR
type Dept = 'Civil' | 'OHE' | 'S&T';
type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
type Status = 'Pending' | 'Scheduled' | 'Active' | 'Completed' | 'Cancelled' | 'Conflict';
type LineType = 'UP' | 'DOWN' | 'BOTH';

interface MaintenanceRequest {
  id: string;
  requestId: string;
  segment: string;
  fromStation: string;
  toStation: string;
  lineType: LineType;
  dept: Dept;
  durationMins: number;
  preferredStart: string;
  preferredEnd: string;
  priority: Priority;
  requestedBy: string;
  submittedAt: string;
  status: Status;
  assignedBlock?: string;
  conflictsWith?: string;
}

const REQUESTS: MaintenanceRequest[] = [
  { id: 'req-001', requestId: 'MR-2026-0841', segment: 'NDLS–GZB', fromStation: 'NDLS', toStation: 'GZB', lineType: 'UP', dept: 'Civil', durationMins: 180, preferredStart: '01:00', preferredEnd: '04:00', priority: 'High', requestedBy: 'A.K. Sharma', submittedAt: '04 Sep 2026', status: 'Scheduled', assignedBlock: 'Civil-041' },
  { id: 'req-002', requestId: 'MR-2026-0842', segment: 'NDLS–GZB', fromStation: 'NDLS', toStation: 'GZB', lineType: 'DOWN', dept: 'OHE', durationMins: 150, preferredStart: '02:00', preferredEnd: '04:30', priority: 'Critical', requestedBy: 'P. Verma', submittedAt: '04 Sep 2026', status: 'Active', assignedBlock: 'OHE-017' },
  { id: 'req-003', requestId: 'MR-2026-0843', segment: 'GZB–ALD', fromStation: 'GZB', toStation: 'ALD', lineType: 'UP', dept: 'Civil', durationMins: 210, preferredStart: '03:00', preferredEnd: '06:30', priority: 'High', requestedBy: 'R. Singh', submittedAt: '04 Sep 2026', status: 'Conflict', assignedBlock: 'Civil-042', conflictsWith: 'Train 12559' },
  { id: 'req-004', requestId: 'MR-2026-0844', segment: 'GZB–ALD', fromStation: 'GZB', toStation: 'ALD', lineType: 'DOWN', dept: 'S&T', durationMins: 120, preferredStart: '12:00', preferredEnd: '14:00', priority: 'Medium', requestedBy: 'S. Gupta', submittedAt: '04 Sep 2026', status: 'Scheduled', assignedBlock: 'ST-008' },
  { id: 'req-005', requestId: 'MR-2026-0845', segment: 'ALD–CNB', fromStation: 'ALD', toStation: 'CNB', lineType: 'UP', dept: 'OHE', durationMins: 120, preferredStart: '01:00', preferredEnd: '03:00', priority: 'Critical', requestedBy: 'M. Tiwari', submittedAt: '04 Sep 2026', status: 'Active', assignedBlock: 'OHE-018' },
  { id: 'req-006', requestId: 'MR-2026-0846', segment: 'ALD–CNB', fromStation: 'ALD', toStation: 'CNB', lineType: 'DOWN', dept: 'Civil', durationMins: 180, preferredStart: '08:00', preferredEnd: '11:00', priority: 'High', requestedBy: 'D. Yadav', submittedAt: '04 Sep 2026', status: 'Scheduled', assignedBlock: 'Civil-043' },
  { id: 'req-007', requestId: 'MR-2026-0847', segment: 'CNB–LKO', fromStation: 'CNB', toStation: 'LKO', lineType: 'UP', dept: 'S&T', durationMins: 180, preferredStart: '01:00', preferredEnd: '04:00', priority: 'Medium', requestedBy: 'B. Mishra', submittedAt: '04 Sep 2026', status: 'Scheduled', assignedBlock: 'ST-009' },
  { id: 'req-008', requestId: 'MR-2026-0848', segment: 'CNB–LKO', fromStation: 'CNB', toStation: 'LKO', lineType: 'DOWN', dept: 'OHE', durationMins: 120, preferredStart: '18:00', preferredEnd: '20:00', priority: 'Low', requestedBy: 'V. Pandey', submittedAt: '04 Sep 2026', status: 'Scheduled', assignedBlock: 'OHE-019' },
  { id: 'req-009', requestId: 'MR-2026-0849', segment: 'NDLS–AGC', fromStation: 'NDLS', toStation: 'AGC', lineType: 'UP', dept: 'Civil', durationMins: 240, preferredStart: '04:00', preferredEnd: '08:00', priority: 'Critical', requestedBy: 'N. Kumar', submittedAt: '03 Sep 2026', status: 'Conflict', assignedBlock: 'Civil-044', conflictsWith: 'Train 12050 (Gatimaan)' },
  { id: 'req-010', requestId: 'MR-2026-0850', segment: 'MTJ–CNB', fromStation: 'MTJ', toStation: 'CNB', lineType: 'DOWN', dept: 'S&T', durationMins: 180, preferredStart: '08:00', preferredEnd: '11:00', priority: 'High', requestedBy: 'H. Saxena', submittedAt: '03 Sep 2026', status: 'Conflict', assignedBlock: 'ST-010', conflictsWith: 'Train 12216' },
  { id: 'req-011', requestId: 'MR-2026-0851', segment: 'LKO–GKP', fromStation: 'LKO', toStation: 'GKP', lineType: 'UP', dept: 'Civil', durationMins: 150, preferredStart: '02:00', preferredEnd: '04:30', priority: 'Medium', requestedBy: 'A. Srivastava', submittedAt: '03 Sep 2026', status: 'Pending' },
  { id: 'req-012', requestId: 'MR-2026-0852', segment: 'LKO–GKP', fromStation: 'LKO', toStation: 'GKP', lineType: 'DOWN', dept: 'OHE', durationMins: 90, preferredStart: '22:00', preferredEnd: '23:30', priority: 'Low', requestedBy: 'C. Tripathi', submittedAt: '05 Sep 2026', status: 'Pending' },
  { id: 'req-013', requestId: 'MR-2026-0853', segment: 'AGC–MTJ', fromStation: 'AGC', toStation: 'MTJ', lineType: 'BOTH', dept: 'Civil', durationMins: 300, preferredStart: '00:00', preferredEnd: '05:00', priority: 'Critical', requestedBy: 'P. Singh', submittedAt: '05 Sep 2026', status: 'Pending' },
  { id: 'req-014', requestId: 'MR-2026-0854', segment: 'GKP–VNS', fromStation: 'GKP', toStation: 'VNS', lineType: 'UP', dept: 'S&T', durationMins: 120, preferredStart: '03:00', preferredEnd: '05:00', priority: 'Medium', requestedBy: 'R. Joshi', submittedAt: '05 Sep 2026', status: 'Pending' },
  { id: 'req-015', requestId: 'MR-2026-0855', segment: 'DLI–PNP', fromStation: 'DLI', toStation: 'PNP', lineType: 'DOWN', dept: 'Civil', durationMins: 180, preferredStart: '01:30', preferredEnd: '04:30', priority: 'High', requestedBy: 'T. Chauhan', submittedAt: '05 Sep 2026', status: 'Completed', assignedBlock: 'Civil-040' },
];

type SortKey = keyof MaintenanceRequest;

const ITEMS_PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function RequestsPageClient() {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('submittedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [drawerRequest, setDrawerRequest] = useState<MaintenanceRequest | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    return REQUESTS.filter((r) => {
      const matchSearch =
        !search ||
        r.requestId.toLowerCase().includes(search.toLowerCase()) ||
        r.segment.toLowerCase().includes(search.toLowerCase()) ||
        r.requestedBy.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === 'All' || r.dept === deptFilter;
      const matchPriority = priorityFilter === 'All' || r.priority === priorityFilter;
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchSearch && matchDept && matchPriority && matchStatus;
    });
  }, [search, deptFilter, priorityFilter, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const paginated = sorted.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map((r) => r.id)));
  };

  const handleBulkApprove = () => {
    toast.success(`${selectedIds.size} requests approved and queued for block assignment`);
    setSelectedIds(new Set());
  };

  const handleBulkReject = () => {
    toast.error(`${selectedIds.size} requests rejected`);
    setSelectedIds(new Set());
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown size={11} className="text-muted-foreground/50" />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="text-primary" />
      : <ChevronDown size={11} className="text-primary" />;
  };

  const CONFLICTS = filtered.filter((r) => r.status === 'Conflict').length;

  return (
    <div className="space-y-5 fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maintenance Requests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {REQUESTS.length} total requests · NR Zone · {CONFLICTS > 0 && (
              <span className="text-negative font-medium">{CONFLICTS} conflicts require attention</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Conflict alert */}
      {CONFLICTS > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-negative-tint border border-negative/25">
          <AlertTriangle size={16} className="text-negative shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">{CONFLICTS} maintenance blocks</span> have train conflicts.
            Review and resolve before the next operating window.
          </p>
          <button className="btn-ghost text-xs text-negative ml-auto" onClick={() => setStatusFilter('Conflict')}>
            View Conflicts
          </button>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ID, segment, requester…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Dept */}
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
            className="select-field text-xs"
            style={{ width: 120 }}
          >
            <option value="All">All Depts</option>
            <option value="Civil">Civil</option>
            <option value="OHE">OHE</option>
            <option value="S&T">S&T</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="select-field text-xs"
            style={{ width: 130 }}
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="select-field text-xs"
            style={{ width: 130 }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Active">Active</option>
            <option value="Conflict">Conflict</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {(deptFilter !== 'All' || priorityFilter !== 'All' || statusFilter !== 'All' || search) && (
            <button
              className="btn-ghost text-xs text-negative"
              onClick={() => { setDeptFilter('All'); setPriorityFilter('All'); setStatusFilter('All'); setSearch(''); setPage(1); }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm" style={{ minWidth: 1100 }}>
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-10 px-3 py-3 text-left">
                  <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                    {selectedIds.size === paginated.length && paginated.length > 0
                      ? <CheckSquare size={15} className="text-primary" />
                      : <Square size={15} />}
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
                  { key: 'status' as SortKey, label: 'Status', w: 110 },
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
                    No maintenance requests match your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((req) => (
                  <tr
                    key={req.id}
                    className={`table-row-hover ${selectedIds.has(req.id) ? 'bg-primary/5' : ''} ${req.status === 'Conflict' ? 'bg-negative-tint/20' : ''}`}
                  >
                    <td className="px-3 py-2.5">
                      <button onClick={() => toggleRow(req.id)} className="text-muted-foreground hover:text-foreground">
                        {selectedIds.has(req.id)
                          ? <CheckSquare size={14} className="text-primary" />
                          : <Square size={14} />}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono-data text-xs text-foreground font-semibold">{req.requestId}</span>
                      {req.conflictsWith && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <AlertTriangle size={10} className="text-negative" />
                          <span className="text-2xs text-negative">vs {req.conflictsWith}</span>
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
                          req.lineType === 'UP' ?'bg-accent/15 text-accent'
                            : req.lineType === 'DOWN' ?'bg-primary/15 text-primary' :'bg-muted text-muted-foreground'
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
                      <StatusBadge status={req.status as any} />
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
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
              className="select-field text-xs"
              style={{ width: 60 }}
            >
              {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                <option key={`ipp-${n}`} value={n}>{n}</option>
              ))}
            </select>
            <span>of {sorted.length} requests</span>
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
                    page === p
                      ? 'bg-primary text-primary-foreground'
                      : 'btn-ghost'
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
          <button
            className="btn-secondary text-xs gap-1.5"
            onClick={() => toast.info('Triggering optimization for selected segments…')}
          >
            <Play size={13} />
            Run Optimization
          </button>
          <button
            className="btn-ghost text-xs text-negative gap-1.5"
            onClick={handleBulkReject}
          >
            <XCircle size={13} />
            Reject All
          </button>
          <button
            className="btn-ghost text-xs text-muted-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Detail drawer */}
      {drawerRequest && (
        <RequestDetailDrawer
          request={drawerRequest}
          onClose={() => setDrawerRequest(null)}
        />
      )}

      {/* New request modal */}
      <NewRequestModal open={showNewModal} onClose={() => setShowNewModal(false)} />
    </div>
  );
}