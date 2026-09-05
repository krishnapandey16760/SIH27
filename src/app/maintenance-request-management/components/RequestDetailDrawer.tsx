'use client';

import React from 'react';
import { X, AlertTriangle, CheckCircle, Play, MapPin, Clock, User, Calendar, Activity,  } from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import DeptBadge from '@/components/ui/DeptBadge';

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
}

export default function RequestDetailDrawer({
  request,
  onClose,
}: {
  request: Request;
  onClose: () => void;
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
          {/* Conflict alert */}
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
                { id: 'ca-2', check: 'Contiguous time slot requirement', pass: true },
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
          {request.status === 'Pending' && (
            <button
              className="btn-secondary text-xs"
              onClick={() => {
                toast.success(`${request.requestId} approved`);
                onClose();
              }}
            >
              <CheckCircle size={12} />
              Approve
            </button>
          )}
        </div>
      </div>
    </div>
  );
}