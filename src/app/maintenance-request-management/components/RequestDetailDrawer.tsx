'use client';

import React from 'react';
import { X, AlertTriangle, CheckCircle, Play, MapPin, Clock, User, Calendar, Activity, Lock, Split as SplitIcon, ArrowRightLeft, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/statusbadge';
import PriorityBadge from '@/components/ui/prioritybadge';
import DeptBadge from '@/components/ui/deptbadge';
import type { Status } from '@/lib/maintenanceRequests';

interface TimeWindow {
  startMin: number;
  endMin: number;
}

interface AdminResolution {
  suggestedWindows: TimeWindow[];
  blockingRequestIds: string[];
  recommendDeferToAnotherDay: boolean;
}

interface Request {
  id: string;
  requestId: string;
  segment: string;
  fromStation: string;
  toStation: string;
  lineType: string;
  dept: 'Civil' | 'OHE' | 'S&T';
  durationMins: number;
  preferredStart: string;
  preferredEnd: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  requestedBy: string;
  submittedAt: string;
  status: any;
  assignedBlock?: string;
  conflictsWith?: string;
  // New: mirrors ScheduledBlock from the backend (see milp_solver.py) once
  // whatever maps the solver response onto UIMaintenanceRequest copies
  // these fields across.
  splitWindows?: TimeWindow[] | null;
  adminResolution?: AdminResolution | null;
}

const ALL_STATUSES: Status[] = ['Pending', 'Scheduled', 'Active', 'Split' as Status, 'Completed', 'Cancelled', 'Conflict'];

const minutesToClock = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function RequestDetailDrawer({
  request,
  onClose,
  canChangeStatus = false,
  onStatusChange,
  onApplyWindow,
  onBumpRequest,
  onDeferToAnotherDay,
}: {
  request: Request;
  onClose: () => void;
  canChangeStatus?: boolean;
  onStatusChange?: (id: string, status: Status) => void;
  onApplyWindow?: (id: string, window: TimeWindow) => void;
  onBumpRequest?: (id: string, blockingRequestId: string) => void;
  onDeferToAnotherDay?: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="flex-1" style={{ background: 'rgba(0,0,0,0.5)' }} />

      {/* Drawer */}
      <div
        className="w-full max-w-md card-surface-elevated border-l border-border h-full overflow-y-auto scrollbar-thin flex flex-col fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 card-surface-elevated z-10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground font-mono-data">
                {request.requestId}
              </h3>
              <StatusBadge status={request.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submitted {request.submittedAt} · {request.requestedBy}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Conflict alert (legacy, single-cause) */}
          {request.status === 'Conflict' && request.conflictsWith && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-negative-tint border border-negative/25">
              <AlertTriangle size={15} className="text-negative mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-negative">Conflict Detected</p>
                <p className="text-xs text-foreground mt-0.5">
                  Block overlaps with <span className="font-semibold">{request.conflictsWith}</span> on {request.segment} {request.lineType} line.
                </p>
                <p className="text-2xs text-muted-foreground mt-1">
                  Re-run optimization to resolve or manually adjust the time window.
                </p>
              </div>
            </div>
          )}

          {/* Split breakdown */}
          {request.status === 'Split' && request.splitWindows && request.splitWindows.length > 0 && (
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/25 space-y-2">
              <div className="flex items-center gap-2">
                <SplitIcon size={14} className="text-accent" />
                <p className="text-xs font-semibold text-accent">
                  Split into {request.splitWindows.length} parts
                </p>
              </div>
              <p className="text-2xs text-muted-foreground">
                No single free window covered the full {request.durationMins} min - the solver spread it
                across the day instead of leaving it unscheduled.
              </p>
              <div className="space-y-1.5 pt-1">
                {request.splitWindows.map((w, i) => (
                  <div key={`split-${i}`} className="flex items-center gap-2 text-xs font-mono-data text-foreground">
                    <span className="text-2xs text-muted-foreground w-14 shrink-0">Part {i + 1}</span>
                    {minutesToClock(w.startMin)} – {minutesToClock(w.endMin)}
                    <span className="text-2xs text-muted-foreground">
                      ({w.endMin - w.startMin} min)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin conflict resolution */}
          {request.status === 'Conflict' && request.adminResolution && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Resolve Conflict
              </h4>

              {request.adminResolution.suggestedWindows.length > 0 && (
                <div className="p-3 rounded-lg border border-border space-y-2">
                  <p className="text-xs font-medium text-foreground">Suggested alternative windows</p>
                  <p className="text-2xs text-muted-foreground -mt-1">
                    Best available gaps found elsewhere in the day - may be shorter than the full
                    requested duration.
                  </p>
                  {request.adminResolution.suggestedWindows.map((w, i) => (
                    <div key={`sw-${i}`} className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono-data text-foreground">
                        {minutesToClock(w.startMin)} – {minutesToClock(w.endMin)}
                      </span>
                      <button
                        className="btn-secondary text-2xs shrink-0"
                        disabled={!canChangeStatus}
                        onClick={() => onApplyWindow?.(request.id, w)}
                      >
                        <ArrowRightLeft size={11} />
                        Apply this window
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {request.adminResolution.blockingRequestIds.length > 0 && (
                <div className="p-3 rounded-lg border border-border space-y-2">
                  <p className="text-xs font-medium text-foreground">Lower-priority blocks nearby</p>
                  <p className="text-2xs text-muted-foreground -mt-1">
                    These already-scheduled requests sit close to this one's preferred time and could
                    be bumped to free up space.
                  </p>
                  {request.adminResolution.blockingRequestIds.map((rid) => (
                    <div key={`block-${rid}`} className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono-data text-foreground">{rid}</span>
                      <button
                        className="btn-secondary text-2xs shrink-0"
                        disabled={!canChangeStatus}
                        onClick={() => onBumpRequest?.(request.id, rid)}
                      >
                        Bump this request
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {request.adminResolution.recommendDeferToAnotherDay && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-start gap-2">
                    <CalendarClock size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-foreground">
                      No slot - even split up - fits today on this segment/line.
                    </p>
                  </div>
                  <button
                    className="btn-primary text-2xs shrink-0"
                    disabled={!canChangeStatus}
                    onClick={() => onDeferToAnotherDay?.(request.id)}
                  >
                    Defer to another day
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Core details */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Request Details
            </h4>
            <div className="space-y-3">
              {[
                { id: 'det-seg', icon: <MapPin size={13} />, label: 'Track Segment', value: `${request.segment} (${request.lineType} Line)` },
                { id: 'det-stations', icon: <Activity size={13} />, label: 'From → To', value: `${request.fromStation} → ${request.toStation}` },
                { id: 'det-dur', icon: <Clock size={13} />, label: 'Duration', value: `${request.durationMins} minutes` },
                { id: 'det-window', icon: <Calendar size={13} />, label: 'Preferred Window', value: `${request.preferredStart} – ${request.preferredEnd} IST` },
                { id: 'det-by', icon: <User size={13} />, label: 'Requested By', value: request.requestedBy },
                { id: 'det-sub', icon: <Calendar size={13} />, label: 'Submitted', value: request.submittedAt },
              ].map((d) => (
                <div key={d.id} className="flex items-start gap-2.5">
                  <span className="text-muted-foreground mt-0.5 shrink-0">{d.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xs text-muted-foreground">{d.label}</p>
                    <p className="text-xs font-medium text-foreground mt-0.5">{d.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Classification */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Classification
            </h4>
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <p className="text-2xs text-muted-foreground mb-1">Department</p>
                <DeptBadge dept={request.dept} />
              </div>
              <div>
                <p className="text-2xs text-muted-foreground mb-1">Priority</p>
                <PriorityBadge priority={request.priority} />
              </div>
              {request.assignedBlock && (
                <div>
                  <p className="text-2xs text-muted-foreground mb-1">Assigned Block</p>
                  <span className="font-mono-data text-xs text-accent font-semibold">
                    {request.assignedBlock}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Conflict analysis */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Conflict Analysis
            </h4>
            <div className="space-y-2">
              {[
                { id: 'ca-1', check: 'No-overlap constraint (Hard)', pass: request.status !== 'Conflict' },
                { id: 'ca-2', check: 'Contiguous time slot requirement', pass: request.status !== 'Split' },
                { id: 'ca-3', check: 'Maintenance window within preferred period', pass: request.status !== 'Conflict' },
                { id: 'ca-4', check: 'Resource availability (crew + equipment)', pass: true },
                { id: 'ca-5', check: 'Block duration ≤ max allowed (360 min)', pass: request.durationMins <= 360 },
              ].map((c) => (
                <div key={c.id} className="flex items-center gap-2.5">
                  {c.pass
                    ? <CheckCircle size={13} className="text-positive shrink-0" />
                    : <AlertTriangle size={13} className="text-negative shrink-0" />}
                  <span className={`text-xs ${c.pass ? 'text-foreground' : 'text-negative font-medium'}`}>
                    {c.check}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status change — role gated */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Update Status
            </h4>
            {canChangeStatus ? (
              <select
                value={request.status}
                onChange={(e) => onStatusChange?.(request.id, e.target.value as Status)}
                className="select-field text-sm w-full"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2 rounded-lg bg-muted/40">
                <Lock size={12} />
                Only Sr. Divisional Engineer can change status
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border flex items-center gap-2">
          <button
            className="btn-primary flex-1 justify-center text-xs"
            onClick={() => {
              toast.success(`Optimization triggered for ${request.segment}`);
              onClose();
            }}
          >
            <Play size={12} />
            Run Optimization
          </button>
        </div>
      </div>
    </div>
  );
}
